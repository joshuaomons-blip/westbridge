import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { STATUS_CODES, STATUS_ADMIN_LABEL } from "@/lib/statuses";
import { formatDateTime } from "@/lib/format";
import { PageHeader, Panel, StatusBadge, Badge, EmptyState, ErrorState, Pagination, th, td, parsePage, one } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Tracking events" };
const PAGE_SIZE = 30;

export default async function EventsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("shipments.read");
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const status = one(sp.status);
  const visibility = one(sp.visibility);
  const db = await createSessionClient();

  let q = db
    .from("shipment_events")
    .select("id, status_code, occurred_at, recorded_at, location, description, visibility, is_voided, updated_at, shipment_id, shipments(tracking_number, is_demo)", { count: "exact" })
    .order("recorded_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (status && (STATUS_CODES as readonly string[]).includes(status)) q = q.eq("status_code", status);
  if (visibility === "public" || visibility === "internal") q = q.eq("visibility", visibility);
  if (visibility === "voided") q = q.eq("is_voided", true);

  const { data, count, error } = await q;
  const params = { status, visibility };

  return (
    <>
      <PageHeader title="Tracking events" description="Latest recorded events across all shipments. Open a shipment to add or correct events." />
      <Panel bodyClassName="p-0">
        <form method="get" className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <select name="status" defaultValue={status ?? ""} className="input w-auto" aria-label="Status">
            <option value="">All statuses</option>
            {STATUS_CODES.map((s) => <option key={s} value={s}>{STATUS_ADMIN_LABEL[s]}</option>)}
          </select>
          <select name="visibility" defaultValue={visibility ?? ""} className="input w-auto" aria-label="Visibility">
            <option value="">Public & internal</option>
            <option value="public">Public only</option>
            <option value="internal">Internal only</option>
            <option value="voided">Voided</option>
          </select>
          <button className="btn-primary px-4" type="submit">Filter</button>
        </form>
        {error ? (
          <div className="p-5"><ErrorState /></div>
        ) : !data?.length ? (
          <EmptyState title="No events found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className={th}>Shipment</th>
                    <th className={th}>Status</th>
                    <th className={th}>Event time</th>
                    <th className={th}>Location / note</th>
                    <th className={th}>Recorded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((e) => {
                    const shipment = (Array.isArray(e.shipments) ? e.shipments[0] : e.shipments) as { tracking_number: string; is_demo: boolean } | null;
                    return (
                      <tr key={e.id} className={e.is_voided ? "bg-slate-50 opacity-60" : "hover:bg-slate-50"}>
                        <td className={td}>
                          <Link href={`/admin/shipments/${e.shipment_id}`} className="font-mono font-semibold text-navy-800 hover:underline">
                            {shipment?.tracking_number ?? "—"}
                          </Link>
                          {shipment?.is_demo && <span className="ml-1"><Badge tone="amber">DEMO</Badge></span>}
                        </td>
                        <td className={td}>
                          <div className="flex flex-wrap gap-1">
                            <StatusBadge code={e.status_code} />
                            {e.visibility === "internal" && <Badge tone="navy">Internal</Badge>}
                            {e.is_voided && <Badge tone="red">Voided</Badge>}
                            {e.updated_at && !e.is_voided && <Badge tone="amber">Corrected</Badge>}
                          </div>
                        </td>
                        <td className={`${td} whitespace-nowrap text-slate-600`}>{formatDateTime(e.occurred_at)}</td>
                        <td className={`${td} max-w-xs text-slate-600`}>
                          <div>{e.location ?? "—"}</div>
                          {e.description && <div className="truncate text-xs text-slate-500">{e.description}</div>}
                        </td>
                        <td className={`${td} whitespace-nowrap text-slate-500`}>{formatDateTime(e.recorded_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} basePath="/admin/events" params={params} />
          </>
        )}
      </Panel>
    </>
  );
}
