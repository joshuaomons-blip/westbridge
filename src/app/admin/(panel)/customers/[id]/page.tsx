import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArchiveRestore, PackagePlus } from "lucide-react";
import { requirePermission, can } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { PageHeader, Panel, StatusBadge, Badge, EmptyState, th, td } from "@/components/admin/ui";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { ConfirmForm } from "@/components/admin/ConfirmForm";
import { CustomerFields } from "@/components/admin/CustomerFields";
import { setCustomerArchived, updateCustomer } from "@/actions/admin/customers";

export const metadata: Metadata = { title: "Customer" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission("customers.read");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await createSessionClient();
  const { data: c } = await db.from("customers").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();

  const [{ data: shipments }, { data: inquiries }] = await Promise.all([
    db.from("shipments").select("id, tracking_number, destination_city, destination_country, current_status, created_at, archived_at").eq("customer_id", id).order("created_at", { ascending: false }).limit(100),
    can(admin, "inquiries.read")
      ? db.from("contact_inquiries").select("id, subject, status, created_at").or(`customer_id.eq.${id}${c.email ? `,email.eq."${c.email.replace(/"/g, "")}"` : ""}`).order("created_at", { ascending: false }).limit(50)
      : Promise.resolve({ data: null }),
  ]);
  const archived = !!c.archived_at;
  const canWrite = can(admin, "customers.write");

  return (
    <>
      <PageHeader
        back={{ href: "/admin/customers", label: "Customers" }}
        title={c.full_name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {c.email ?? "No email"} {c.is_demo && <Badge tone="amber">DEMO</Badge>} {archived && <Badge tone="red">Archived</Badge>}
          </span>
        }
        actions={
          <>
            {can(admin, "shipments.write") && !archived && (
              <Link href={`/admin/shipments/new?customer=${c.id}`} className="btn-primary px-3 py-2">
                <PackagePlus className="h-4 w-4" aria-hidden /> New shipment
              </Link>
            )}
            {canWrite && (
              <ConfirmForm
                action={setCustomerArchived}
                hidden={{ id: c.id, archive: String(!archived) }}
                label={archived ? "Restore" : "Archive"}
                icon={archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                buttonClassName="btn-outline px-3 py-2"
                tone={archived ? "primary" : "danger"}
                title={archived ? "Restore customer?" : "Archive customer?"}
                description={archived ? "The customer will appear in active lists again." : "The record and its history are kept, but hidden from active lists."}
                confirmLabel={archived ? "Restore" : "Archive"}
              />
            )}
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title={`Shipments (${shipments?.length ?? 0})`} bodyClassName="p-0">
            {!shipments?.length ? (
              <EmptyState title="No shipments linked to this customer" />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className={th}>Tracking no.</th>
                      <th className={th}>Destination</th>
                      <th className={th}>Status</th>
                      <th className={th}>Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {shipments.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className={td}>
                          <Link href={`/admin/shipments/${s.id}`} className="font-mono font-semibold text-navy-800 hover:underline">{s.tracking_number}</Link>
                          {s.archived_at && <span className="ml-1"><Badge>Archived</Badge></span>}
                        </td>
                        <td className={`${td} text-slate-600`}>{s.destination_city}, {s.destination_country}</td>
                        <td className={td}><StatusBadge code={s.current_status} /></td>
                        <td className={`${td} text-slate-600`}>{formatDate(s.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
          {inquiries && (
            <Panel title="Inquiry history" bodyClassName="p-0">
              {!inquiries.length ? (
                <p className="px-5 py-6 text-sm text-slate-500">No inquiries from this customer.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {inquiries.map((i) => (
                    <li key={i.id}>
                      <Link href={`/admin/inquiries/${i.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-slate-50">
                        <span className="truncate text-slate-900">{i.subject}</span>
                        <span className="shrink-0 text-xs text-slate-500">{i.status.replace("_", " ")} · {formatDate(i.created_at)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}
        </div>
        <Panel title="Customer details">
          {canWrite ? (
            <ActionForm action={updateCustomer} className="space-y-4">
              <input type="hidden" name="id" value={c.id} />
              <CustomerFields d={c} />
              <div className="flex justify-end">
                <SubmitButton pendingText="Saving…">Save</SubmitButton>
              </div>
            </ActionForm>
          ) : (
            <dl className="space-y-3 text-sm">
              {[["Phone", c.phone], ["Company", c.company], ["Location", [c.city, c.country].filter(Boolean).join(", ")], ["Address", c.address]].map(([k, v]) => (
                <div key={k as string}>
                  <dt className="text-xs text-slate-500">{k}</dt>
                  <dd className="whitespace-pre-line text-slate-900">{(v as string) || "—"}</dd>
                </div>
              ))}
            </dl>
          )}
        </Panel>
      </div>
    </>
  );
}
