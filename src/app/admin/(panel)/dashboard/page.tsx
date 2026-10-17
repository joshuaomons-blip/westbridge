import type { Metadata } from "next";
import Link from "next/link";
import { TriangleAlert, CircleCheck, Clock, Inbox, Package, PackageCheck, PackagePlus, Truck } from "lucide-react";
import { requireAdmin, can } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { STATUS_CODES, STATUS_ADMIN_LABEL, STATUS_CATEGORY } from "@/lib/statuses";
import { formatDate, cn } from "@/lib/format";
import { PageHeader, Panel, StatusBadge, ErrorState, EmptyState, th, td, one } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Overview" };

type Stats = {
  total: number;
  in_transit: number;
  delivered: number;
  awaiting_dispatch: number;
  delayed: number;
  exceptions: number;
  new_inquiries: number;
  by_status: Record<string, number>;
  by_day: { day: string; count: number }[];
  includes_demo: boolean;
};

const isDate = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const from = isDate(one(sp.from));
  const to = isDate(one(sp.to));
  const origin = one(sp.origin);
  const destination = one(sp.destination);
  const status = one(sp.status);
  const db = await createSessionClient();

  const canRead = can(admin, "shipments.read");
  const statsRes = canRead
    ? await db.rpc("dashboard_stats", { p_from: from ?? null, p_to: to ?? null, p_origin: origin ?? null, p_destination: destination ?? null })
    : null;
  const stats = (statsRes?.data ?? null) as Stats | null;

  let recentQ = db
    .from("shipments")
    .select("id, tracking_number, recipient_name, destination_city, destination_country, current_status, created_at, is_demo")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(8);
  if (status && (STATUS_CODES as readonly string[]).includes(status)) recentQ = recentQ.eq("current_status", status);
  if (from) recentQ = recentQ.gte("created_at", from);
  if (to) recentQ = recentQ.lte("created_at", `${to}T23:59:59Z`);
  if (origin) recentQ = recentQ.ilike("origin_country", origin);
  if (destination) recentQ = recentQ.ilike("destination_country", destination);

  const inquiriesQ = db
    .from("contact_inquiries")
    .select("id, name, subject, created_at, status")
    .eq("status", "new")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(5);
  const [recentRes, inquiriesRes, setup] = await Promise.all([
    canRead ? recentQ : null,
    can(admin, "inquiries.read") ? inquiriesQ : null,
    loadSetup(db),
  ]);
  const recentRows = recentRes?.data ?? [];
  const inquiryRows = inquiriesRes?.data ?? [];

  const cards = stats
    ? [
        { label: "Total shipments", value: stats.total, icon: Package, href: "/admin/shipments" },
        { label: "In transit", value: stats.in_transit, icon: Truck, href: "/admin/shipments?status=in_transit" },
        { label: "Delivered", value: stats.delivered, icon: PackageCheck, href: "/admin/shipments?status=delivered" },
        { label: "Awaiting dispatch", value: stats.awaiting_dispatch, icon: Clock, href: "/admin/shipments?status=awaiting_dispatch" },
        { label: "Delayed", value: stats.delayed, icon: TriangleAlert, href: "/admin/shipments?status=delayed", warn: stats.delayed > 0 },
        { label: "Delivery exceptions", value: stats.exceptions, icon: TriangleAlert, href: "/admin/shipments?status=delivery_exception", warn: stats.exceptions > 0 },
        { label: "New inquiries", value: stats.new_inquiries, icon: Inbox, href: "/admin/inquiries?status=new", warn: stats.new_inquiries > 0 },
      ]
    : [];

  const maxStatus = Math.max(1, ...Object.values(stats?.by_status ?? {}));
  const days = fillDays(stats?.by_day ?? [], from, to);
  const maxDay = Math.max(1, ...days.map((d) => d.count));
  const filtered = !!(from || to || origin || destination || status);

  return (
    <>
      <PageHeader
        title={`Welcome${admin.full_name ? `, ${admin.full_name.split(" ")[0]}` : ""}`}
        description="Figures below come directly from your shipment records."
        actions={
          can(admin, "shipments.write") && (
            <Link href="/admin/shipments/new" className="btn-primary">
              <PackagePlus className="h-4 w-4" aria-hidden /> Create shipment
            </Link>
          )
        }
      />

      {setup.length > 0 && (
        <Panel title="Before you launch" className="mb-6 border-amber-200 bg-amber-50/50">
          <ul className="space-y-2 text-sm">
            {setup.map((item) => (
              <li key={item.text} className="flex items-start gap-2">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                <span className="text-slate-700">
                  {item.text}{" "}
                  {item.href && (
                    <Link href={item.href} className="font-semibold text-navy-700 hover:underline">
                      {item.cta}
                    </Link>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {canRead && (
        <form method="get" className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <label htmlFor="from" className="label text-xs">From</label>
            <input id="from" name="from" type="date" defaultValue={from} className="input py-2" />
          </div>
          <div>
            <label htmlFor="to" className="label text-xs">To</label>
            <input id="to" name="to" type="date" defaultValue={to} className="input py-2" />
          </div>
          <div>
            <label htmlFor="status" className="label text-xs">Status (recent list)</label>
            <select id="status" name="status" defaultValue={status ?? ""} className="input py-2">
              <option value="">All</option>
              {STATUS_CODES.map((s) => (
                <option key={s} value={s}>{STATUS_ADMIN_LABEL[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="origin" className="label text-xs">Origin country</label>
            <input id="origin" name="origin" defaultValue={origin} className="input py-2" />
          </div>
          <div>
            <label htmlFor="destination" className="label text-xs">Destination country</label>
            <input id="destination" name="destination" defaultValue={destination} className="input py-2" />
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="btn-primary flex-1 py-2">Apply</button>
            {filtered && <Link href="/admin/dashboard" className="btn-outline py-2">Reset</Link>}
          </div>
        </form>
      )}

      {statsRes?.error && <ErrorState text="Statistics could not be loaded. Please refresh the page." />}
      {stats?.includes_demo && (
        <p className="mb-4 rounded-md bg-amber-100 px-3 py-2 text-sm font-medium text-amber-900">
          These figures include DEMO sample records because demo mode is on.
        </p>
      )}

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
          {cards.map((c) => (
            <Link key={c.label} href={c.href} className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-navy-200 hover:shadow">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-500">{c.label}</p>
                <c.icon className={cn("h-4 w-4", c.warn ? "text-amber-500" : "text-slate-300 group-hover:text-navy-500")} aria-hidden />
              </div>
              <p className={cn("mt-2 text-3xl font-bold tabular-nums", c.warn ? "text-amber-700" : "text-navy-950")}>{c.value}</p>
            </Link>
          ))}
        </div>
      )}

      {stats && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Panel title="Shipments created per day" description={from || to ? "Selected range" : "Last 30 days"}>
            {stats.total === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No shipments in this period.</p>
            ) : (
              <div className="flex h-44 items-end gap-[3px]" role="img" aria-label="Bar chart of shipments created per day">
                {days.map((d) => (
                  <div key={d.day} className="group relative flex h-full flex-1 items-end">
                    <div
                      className="w-full rounded-t bg-navy-700 transition group-hover:bg-signal-600"
                      style={{ height: `${Math.max(d.count ? 4 : 1, (d.count / maxDay) * 100)}%`, opacity: d.count ? 1 : 0.15 }}
                    />
                    <span className="pointer-events-none absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 rounded bg-navy-950 px-1.5 py-0.5 text-[10px] whitespace-nowrap text-white group-hover:block">
                      {formatDate(d.day)}: {d.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
          <Panel title="Shipments by status">
            {Object.keys(stats.by_status).length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No shipments yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {STATUS_CODES.filter((c) => stats.by_status[c]).map((c) => (
                  <li key={c} className="grid grid-cols-[150px_1fr_36px] items-center gap-3 text-sm">
                    <span className="truncate text-slate-600">{STATUS_ADMIN_LABEL[c]}</span>
                    <span className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <span
                        className={cn(
                          "block h-full rounded-full",
                          STATUS_CATEGORY[c] === "delivered" ? "bg-emerald-500" : STATUS_CATEGORY[c] === "exception" ? "bg-amber-500" : STATUS_CATEGORY[c] === "closed" ? "bg-slate-400" : "bg-navy-600",
                        )}
                        style={{ width: `${(stats.by_status[c] / maxStatus) * 100}%` }}
                      />
                    </span>
                    <span className="text-right font-semibold tabular-nums text-slate-800">{stats.by_status[c]}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {canRead && (
          <Panel title="Recent shipments" className="lg:col-span-2" bodyClassName="p-0" actions={<Link href="/admin/shipments" className="text-sm font-semibold text-navy-700 hover:underline">View all</Link>}>
            {!recentRows.length ? (
              <EmptyState title="No shipments to show" text={filtered ? "No shipments match these filters." : "Create a shipment to get started."} />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className={th}>Tracking no.</th>
                      <th className={th}>Recipient</th>
                      <th className={th}>Status</th>
                      <th className={th}>Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentRows.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className={td}>
                          <Link href={`/admin/shipments/${s.id}`} className="font-mono font-semibold text-navy-800 hover:underline">{s.tracking_number}</Link>
                        </td>
                        <td className={td}>
                          <div className="text-slate-900">{s.recipient_name}</div>
                          <div className="text-xs text-slate-500">{s.destination_city}, {s.destination_country}</div>
                        </td>
                        <td className={td}><StatusBadge code={s.current_status} /></td>
                        <td className={`${td} whitespace-nowrap text-slate-600`}>{formatDate(s.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}
        {can(admin, "inquiries.read") && (
          <Panel title="New inquiries" bodyClassName="p-0" actions={<Link href="/admin/inquiries" className="text-sm font-semibold text-navy-700 hover:underline">View all</Link>}>
            {!inquiryRows.length ? (
              <div className="flex items-center gap-2 px-5 py-6 text-sm text-slate-500">
                <CircleCheck className="h-4 w-4 text-emerald-500" aria-hidden /> No new inquiries.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {inquiryRows.map((i) => (
                  <li key={i.id}>
                    <Link href={`/admin/inquiries/${i.id}`} className="block px-5 py-3 hover:bg-slate-50">
                      <p className="truncate text-sm font-medium text-slate-900">{i.subject}</p>
                      <p className="text-xs text-slate-500">{i.name} · {formatDate(i.created_at)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}
      </div>
    </>
  );
}

async function loadSetup(db: Awaited<ReturnType<typeof createSessionClient>>) {
  const items: { text: string; href?: string; cta?: string }[] = [];
  const [{ count: published }, { data: contact }, { data: demo }] = await Promise.all([
    db.from("services").select("id", { count: "exact", head: true }).eq("is_published", true),
    db.from("website_content").select("key").in("key", ["contact.email", "contact.phone"]).not("published_value", "is", null),
    db.from("site_settings").select("value").eq("key", "demo_mode").maybeSingle(),
  ]);
  if (!published) items.push({ text: "No services are published yet. Review the starter services and publish the ones you offer.", href: "/admin/services", cta: "Review services" });
  if (!contact?.length) items.push({ text: "Your contact details (email, phone) are not published.", href: "/admin/content", cta: "Add contact details" });
  if (demo?.value === true) items.push({ text: "Demo mode is ON. Sample records are visible publicly. Remove demo data and switch it off before launch.", href: "/admin/settings", cta: "Open settings" });
  return items;
}

function fillDays(rows: { day: string; count: number }[], from?: string, to?: string) {
  const end = to ? new Date(to + "T00:00:00Z") : new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  const start = from ? new Date(from + "T00:00:00Z") : new Date(end.getTime() - 29 * 86400000);
  const span = Math.min(90, Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1));
  const map = new Map(rows.map((r) => [r.day, r.count]));
  return Array.from({ length: span }, (_, i) => {
    const day = new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10);
    return { day, count: map.get(day) ?? 0 };
  });
}
