import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission, can } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { PageHeader, Panel, Badge, EmptyState, ErrorState, Pagination, SortHeader, th, td, parsePage, one, searchTerm } from "@/components/admin/ui";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { CustomerFields } from "@/components/admin/CustomerFields";
import { createCustomer } from "@/actions/admin/customers";

export const metadata: Metadata = { title: "Customers" };
const PAGE_SIZE = 25;
const SORTABLE = ["full_name", "created_at", "country"];

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requirePermission("customers.read");
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const q = one(sp.q);
  const view = one(sp.view) === "archived" ? "archived" : "active";
  const sortParam = one(sp.sort);
  const sort = SORTABLE.includes(sortParam ?? "") ? sortParam! : "created_at";
  const dir = one(sp.dir) === "asc" ? "asc" : "desc";
  const db = await createSessionClient();

  let query = db.from("customers").select("id, full_name, email, phone, company, country, city, created_at, is_demo", { count: "exact" });
  query = view === "archived" ? query.not("archived_at", "is", null) : query.is("archived_at", null);
  if (q) {
    const t = searchTerm(q);
    query = query.or(`full_name.ilike.%${t}%,email.ilike.%${t}%,phone.ilike.%${t}%,company.ilike.%${t}%`);
  }
  const { data, count, error } = await query.order(sort, { ascending: dir === "asc" }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const params = { q, view: view === "archived" ? "archived" : undefined, sort: sortParam, dir: one(sp.dir) };

  return (
    <>
      <PageHeader title="Customers" description="People and companies who send shipments. Only collect what you need." />
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel bodyClassName="p-0" className="xl:col-span-2">
          <form method="get" className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
            <input name="q" type="search" defaultValue={q} placeholder="Search name, email, phone or company" className="input min-w-[220px] flex-1" aria-label="Search customers" />
            <select name="view" defaultValue={view} className="input w-auto" aria-label="Active or archived">
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
            <button className="btn-primary px-4" type="submit">Search</button>
          </form>
          {error ? (
            <div className="p-5"><ErrorState /></div>
          ) : !data?.length ? (
            <EmptyState title={q ? "No customers match your search" : "No customers yet"} text="Customers are created when you add one here or save a shipment sender as a customer." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className={th}><SortHeader label="Name" column="full_name" current={sort} dir={dir} basePath="/admin/customers" params={params} /></th>
                      <th className={th}>Contact</th>
                      <th className={th}><SortHeader label="Location" column="country" current={sort} dir={dir} basePath="/admin/customers" params={params} /></th>
                      <th className={th}><SortHeader label="Added" column="created_at" current={sort} dir={dir} basePath="/admin/customers" params={params} /></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className={td}>
                          <Link href={`/admin/customers/${c.id}`} className="font-semibold text-navy-800 hover:underline">{c.full_name}</Link>
                          {c.company && <div className="text-xs text-slate-500">{c.company}</div>}
                          {c.is_demo && <Badge tone="amber">DEMO</Badge>}
                        </td>
                        <td className={`${td} text-slate-600`}>
                          <div>{c.email ?? "—"}</div>
                          <div className="text-xs">{c.phone}</div>
                        </td>
                        <td className={`${td} text-slate-600`}>{[c.city, c.country].filter(Boolean).join(", ") || "—"}</td>
                        <td className={`${td} whitespace-nowrap text-slate-600`}>{formatDate(c.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} basePath="/admin/customers" params={params} />
            </>
          )}
        </Panel>
        {can(admin, "customers.write") && (
          <Panel title="Add customer">
            <ActionForm action={createCustomer} className="space-y-4">
              <CustomerFields />
              <div className="flex justify-end">
                <SubmitButton pendingText="Saving…">Add customer</SubmitButton>
              </div>
            </ActionForm>
          </Panel>
        )}
      </div>
    </>
  );
}
