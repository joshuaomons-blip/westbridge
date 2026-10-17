import { Suspense } from "react";
import Link from "next/link";
import { ExternalLink, Search } from "lucide-react";
import { requireAdmin, can } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { Sidebar, type NavItem } from "@/components/admin/Sidebar";
import { Notice } from "@/components/admin/Notice";
import { signOut } from "@/actions/admin/auth";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  // Server-side check on every admin page: signed in AND an active administrator.
  const admin = await requireAdmin();
  const db = await createSessionClient();

  const [{ count: newInquiries }, { data: demo }] = await Promise.all([
    can(admin, "inquiries.read")
      ? db.from("contact_inquiries").select("id", { count: "exact", head: true }).eq("status", "new").is("archived_at", null)
      : Promise.resolve({ count: 0 }),
    db.from("site_settings").select("value").eq("key", "demo_mode").maybeSingle(),
  ]);
  const demoMode = demo?.value === true;

  const items: NavItem[] = [
    { href: "/admin/dashboard", label: "Overview", icon: "overview" },
    { href: "/admin/shipments", label: "Shipments", icon: "shipments" },
    ...(can(admin, "shipments.write") ? [{ href: "/admin/shipments/new", label: "Create Shipment", icon: "create" } as NavItem] : []),
    { href: "/admin/events", label: "Tracking Events", icon: "events" },
    ...(can(admin, "customers.read") ? [{ href: "/admin/customers", label: "Customers", icon: "customers" } as NavItem] : []),
    ...(can(admin, "inquiries.read")
      ? [{ href: "/admin/inquiries", label: "Inquiries & Pickups", icon: "inquiries", badge: newInquiries ?? 0 } as NavItem]
      : []),
    ...(can(admin, "services.write") ? [{ href: "/admin/services", label: "Services", icon: "services" } as NavItem] : []),
    ...(can(admin, "content.write") ? [{ href: "/admin/content", label: "Website Content", icon: "content" } as NavItem] : []),
    ...(can(admin, "translations.write")
      ? [{ href: "/admin/translations", label: "Languages & Translations", icon: "languages" } as NavItem]
      : []),
    ...(can(admin, "admins.manage") ? [{ href: "/admin/admins", label: "Administrator Accounts", icon: "admins" } as NavItem] : []),
    ...(can(admin, "logs.read") ? [{ href: "/admin/logs", label: "Activity Logs", icon: "logs" } as NavItem] : []),
    { href: "/admin/settings", label: "Settings", icon: "settings" },
  ];

  return (
    <div className="min-h-screen">
      <Sidebar
        items={items}
        admin={{ name: admin.full_name || admin.email.split("@")[0], email: admin.email, role: admin.role_name }}
        signOutAction={signOut}
      />
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 hidden h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-6 backdrop-blur lg:flex">
          <form action="/admin/shipments" method="get" role="search" className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <label htmlFor="global-search" className="sr-only">
              Search shipments
            </label>
            <input
              id="global-search"
              name="q"
              type="search"
              placeholder="Search tracking number, reference or name…"
              className="input py-2 pl-9"
            />
          </form>
          <div className="flex items-center gap-4">
            {demoMode && (
              <Link href="/admin/settings" className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                Demo mode ON
              </Link>
            )}
            <a href="/en" target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-navy-800">
              View website <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {demoMode && (
            <p className="mb-4 rounded-md bg-amber-100 px-3 py-2 text-xs font-medium text-amber-900 lg:hidden">
              Demo mode is ON — sample records are visible on the public site.
            </p>
          )}
          {children}
        </main>
      </div>
      <Suspense>
        <Notice />
      </Suspense>
    </div>
  );
}
