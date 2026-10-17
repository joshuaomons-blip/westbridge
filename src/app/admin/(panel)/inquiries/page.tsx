import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { PageHeader, Panel, Badge, EmptyState, ErrorState, Pagination, th, td, parsePage, one, searchTerm } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Contact inquiries" };
const PAGE_SIZE = 25;
const STATUS_TONE = { new: "red", in_progress: "amber", resolved: "green" } as const;
const isDate = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

export default async function InquiriesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("inquiries.read");
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const q = one(sp.q);
  const status = one(sp.status);
  const from = isDate(one(sp.from));
  const to = isDate(one(sp.to));
  const view = one(sp.view) === "archived" ? "archived" : "active";
  const db = await createSessionClient();

  let query = db.from("contact_inquiries").select("id, reference, name, email, subject, status, created_at, is_demo", { count: "exact" });
  query = view === "archived" ? query.not("archived_at", "is", null) : query.is("archived_at", null);
  if (status === "new" || status === "in_progress" || status === "resolved") query = query.eq("status", status);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", `${to}T23:59:59Z`);
  if (q) {
    const t = searchTerm(q);
    query = query.or(`name.ilike.%${t}%,email.ilike.%${t}%,subject.ilike.%${t}%,reference.ilike.%${t}%,message.ilike.%${t}%`);
  }
  const { data, count, error } = await query.order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const params = { q, status, from, to, view: view === "archived" ? "archived" : undefined };

  return (
    <>
      <PageHeader title="Contact inquiries" description="Messages submitted through the website contact form." />
      <Panel bodyClassName="p-0">
        <form method="get" className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-6">
          <input name="q" type="search" defaultValue={q} placeholder="Search name, email, subject, message" className="input lg:col-span-2" aria-label="Search" />
          <select name="status" defaultValue={status ?? ""} className="input" aria-label="Status">
            <option value="">All statuses</option>
            <option value="new">New</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
          </select>
          <input name="from" type="date" defaultValue={from} className="input" aria-label="From date" />
          <input name="to" type="date" defaultValue={to} className="input" aria-label="To date" />
          <div className="flex gap-2">
            <select name="view" defaultValue={view} className="input" aria-label="Active or archived">
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
            <button className="btn-primary px-4" type="submit">Filter</button>
          </div>
        </form>
        {error ? (
          <div className="p-5"><ErrorState /></div>
        ) : !data?.length ? (
          <EmptyState title="No inquiries found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className={th}>Subject</th>
                    <th className={th}>From</th>
                    <th className={th}>Status</th>
                    <th className={th}>Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((i) => (
                    <tr key={i.id} className="hover:bg-slate-50">
                      <td className={td}>
                        <Link href={`/admin/inquiries/${i.id}`} className={`hover:underline ${i.status === "new" ? "font-semibold text-navy-900" : "text-navy-800"}`}>
                          {i.subject}
                        </Link>
                        <div className="text-xs text-slate-400">{i.reference} {i.is_demo && <Badge tone="amber">DEMO</Badge>}</div>
                      </td>
                      <td className={`${td} text-slate-600`}>
                        <div>{i.name}</div>
                        <div className="text-xs">{i.email}</div>
                      </td>
                      <td className={td}>
                        <Badge tone={STATUS_TONE[i.status as keyof typeof STATUS_TONE] ?? "slate"}>{i.status.replace("_", " ").toUpperCase()}</Badge>
                      </td>
                      <td className={`${td} whitespace-nowrap text-slate-600`}>{formatDateTime(i.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} basePath="/admin/inquiries" params={params} />
          </>
        )}
      </Panel>
    </>
  );
}
