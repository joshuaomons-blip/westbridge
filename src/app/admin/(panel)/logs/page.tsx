import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { PageHeader, Panel, ErrorState, Pagination, parsePage, one, searchTerm } from "@/components/admin/ui";
import { AuditList } from "@/components/admin/AuditList";

export const metadata: Metadata = { title: "Activity logs" };
const PAGE_SIZE = 40;
const TABLES = [
  ["shipments", "Shipments"],
  ["shipment_events", "Tracking events"],
  ["customers", "Customers"],
  ["contact_inquiries", "Inquiries"],
  ["services", "Services"],
  ["website_content", "Website content"],
  ["translation_content", "Translations"],
  ["administrator_profiles", "Administrators"],
  ["site_settings", "Settings"],
] as const;

export default async function LogsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("logs.read");
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const table = one(sp.table);
  const action = one(sp.action);
  const actor = one(sp.actor);
  const db = await createSessionClient();

  let q = db
    .from("audit_logs")
    .select("id, occurred_at, actor_email, action, table_name, record_id, summary, old_data, new_data", { count: "exact" })
    .order("occurred_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (table && TABLES.some(([t]) => t === table)) q = q.eq("table_name", table);
  if (action) q = action === "app" ? q.like("action", "%.%") : q.eq("action", action);
  if (actor) q = q.ilike("actor_email", `%${searchTerm(actor)}%`);
  const { data, count, error } = await q;

  return (
    <>
      <PageHeader title="Activity logs" description="Append-only record of every change and sign-in. Entries cannot be edited or deleted." />
      <Panel bodyClassName="p-0">
        <form method="get" className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <select name="table" defaultValue={table ?? ""} className="input w-auto" aria-label="Area">
            <option value="">All areas</option>
            {TABLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select name="action" defaultValue={action ?? ""} className="input w-auto" aria-label="Action">
            <option value="">All actions</option>
            <option value="insert">Created</option>
            <option value="update">Changed</option>
            <option value="delete">Deleted</option>
            <option value="app">Sign-ins & app events</option>
          </select>
          <input name="actor" defaultValue={actor} placeholder="Administrator email" className="input w-auto" aria-label="Administrator" />
          <button className="btn-primary px-4" type="submit">Filter</button>
        </form>
        {error ? <div className="p-5"><ErrorState /></div> : <AuditList rows={data ?? []} />}
        <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} basePath="/admin/logs" params={{ table, action, actor }} />
      </Panel>
    </>
  );
}
