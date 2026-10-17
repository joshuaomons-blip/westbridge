import type { Metadata } from "next";
import Link from "next/link";
import { PackagePlus } from "lucide-react";
import { requirePermission, can } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { STATUS_CODES, STATUS_ADMIN_LABEL } from "@/lib/statuses";
import { formatDate } from "@/lib/format";
import {
  PageHeader,
  Panel,
  StatusBadge,
  Badge,
  EmptyState,
  ErrorState,
  Pagination,
  SortHeader,
  th,
  td,
  parsePage,
  one,
  searchTerm,
} from "@/components/admin/ui";

export const metadata: Metadata = { title: "Shipments" };

const PAGE_SIZE = 25;
const SORTABLE = ["created_at", "tracking_number", "current_status", "estimated_delivery", "destination_country"] as const;

type SP = Record<string, string | string[] | undefined>;

export default async function ShipmentsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const admin = await requirePermission("shipments.read");
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const q = one(sp.q);
  const status = one(sp.status);
  const origin = one(sp.origin);
  const destination = one(sp.destination);
  const view = one(sp.view) === "archived" ? "archived" : "active";
  const sortParam = one(sp.sort);
  const sort = (SORTABLE as readonly string[]).includes(sortParam ?? "") ? (sortParam as string) : "created_at";
  const dir = one(sp.dir) === "asc" ? "asc" : "desc";

  const db = await createSessionClient();
  let query = db
    .from("shipments")
    .select(
      "id, tracking_number, internal_ref, sender_name, recipient_name, origin_city, origin_country, destination_city, destination_country, current_status, estimated_delivery, created_at, is_demo, is_published",
      { count: "exact" },
    );
  query = view === "archived" ? query.not("archived_at", "is", null) : query.is("archived_at", null);
  if (q) {
    const term = searchTerm(q);
    const normalized = term.replace(/[\s-]/g, "").toUpperCase();
    query = query.or(
      [
        `tracking_number.ilike.%${normalized}%`,
        `internal_ref.ilike.%${term}%`,
        `sender_name.ilike.%${term}%`,
        `recipient_name.ilike.%${term}%`,
        `sender_email.ilike.%${term}%`,
      ].join(","),
    );
  }
  if (status && (STATUS_CODES as readonly string[]).includes(status)) query = query.eq("current_status", status);
  if (origin) query = query.ilike("origin_country", `%${searchTerm(origin)}%`);
  if (destination) query = query.ilike("destination_country", `%${searchTerm(destination)}%`);
  query = query.order(sort, { ascending: dir === "asc", nullsFirst: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const { data: rows, count, error } = await query;
  const params = { q, status, origin, destination, view: view === "archived" ? "archived" : undefined, sort: sortParam, dir: one(sp.dir) };

  return (
    <>
      <PageHeader
        title="Shipments"
        description="Search, filter and manage shipment records."
        actions={
          can(admin, "shipments.write") && (
            <Link href="/admin/shipments/new" className="btn-primary">
              <PackagePlus className="h-4 w-4" aria-hidden /> Create shipment
            </Link>
          )
        }
      />

      <Panel bodyClassName="p-0">
        <form method="get" className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <label htmlFor="q" className="sr-only">Search</label>
            <input id="q" name="q" type="search" defaultValue={q} placeholder="Tracking no., reference, name or email" className="input" />
          </div>
          <div>
            <label htmlFor="status" className="sr-only">Status</label>
            <select id="status" name="status" defaultValue={status ?? ""} className="input">
              <option value="">All statuses</option>
              {STATUS_CODES.map((s) => (
                <option key={s} value={s}>{STATUS_ADMIN_LABEL[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="origin" className="sr-only">Origin country</label>
            <input id="origin" name="origin" defaultValue={origin} placeholder="Origin country" className="input" />
          </div>
          <div>
            <label htmlFor="destination" className="sr-only">Destination country</label>
            <input id="destination" name="destination" defaultValue={destination} placeholder="Destination country" className="input" />
          </div>
          <div className="flex gap-2">
            <select name="view" defaultValue={view} className="input" aria-label="Active or archived">
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
            <button type="submit" className="btn-primary px-4">Filter</button>
          </div>
        </form>

        {error ? (
          <div className="p-5"><ErrorState /></div>
        ) : !rows?.length ? (
          <EmptyState
            title={q || status || origin || destination ? "No shipments match these filters" : view === "archived" ? "No archived shipments" : "No shipments yet"}
            text={q || status ? "Try a different search or clear the filters." : "Create your first shipment to generate a tracking number."}
            action={
              q || status || origin || destination ? (
                <Link href="/admin/shipments" className="btn-outline">Clear filters</Link>
              ) : can(admin, "shipments.write") && view === "active" ? (
                <Link href="/admin/shipments/new" className="btn-primary">Create shipment</Link>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className={th}><SortHeader label="Tracking no." column="tracking_number" current={sort} dir={dir} basePath="/admin/shipments" params={params} /></th>
                    <th className={th}>Sender → Recipient</th>
                    <th className={th}><SortHeader label="Route" column="destination_country" current={sort} dir={dir} basePath="/admin/shipments" params={params} /></th>
                    <th className={th}><SortHeader label="Status" column="current_status" current={sort} dir={dir} basePath="/admin/shipments" params={params} /></th>
                    <th className={th}><SortHeader label="Est. delivery" column="estimated_delivery" current={sort} dir={dir} basePath="/admin/shipments" params={params} /></th>
                    <th className={th}><SortHeader label="Created" column="created_at" current={sort} dir={dir} basePath="/admin/shipments" params={params} /></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className={td}>
                        <Link href={`/admin/shipments/${s.id}`} className="font-mono font-semibold text-navy-800 hover:underline">
                          {s.tracking_number}
                        </Link>
                        <div className="mt-0.5 flex gap-1 text-xs text-slate-500">
                          {s.internal_ref}
                          {s.is_demo && <Badge tone="amber">DEMO</Badge>}
                          {!s.is_published && <Badge>Hidden</Badge>}
                        </div>
                      </td>
                      <td className={td}>
                        <div className="max-w-[220px] truncate text-slate-900">{s.sender_name}</div>
                        <div className="max-w-[220px] truncate text-slate-500">→ {s.recipient_name}</div>
                      </td>
                      <td className={`${td} text-slate-600`}>
                        <div>{s.origin_city}, {s.origin_country}</div>
                        <div>→ {s.destination_city}, {s.destination_country}</div>
                      </td>
                      <td className={td}><StatusBadge code={s.current_status} /></td>
                      <td className={`${td} whitespace-nowrap text-slate-600`}>{formatDate(s.estimated_delivery)}</td>
                      <td className={`${td} whitespace-nowrap text-slate-600`}>{formatDate(s.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} basePath="/admin/shipments" params={params} />
          </>
        )}
      </Panel>
    </>
  );
}
