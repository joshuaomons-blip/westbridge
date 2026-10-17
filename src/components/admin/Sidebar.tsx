"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  FileText,
  Inbox,
  Languages,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Menu,
  Package,
  PackagePlus,
  Settings,
  ShieldCheck,
  Truck,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { LogoMark } from "@/components/site/Logo";
import { cn } from "@/lib/format";

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; badge?: number };

const ICONS = {
  overview: LayoutDashboard,
  shipments: Package,
  create: PackagePlus,
  events: ListOrdered,
  customers: Users,
  inquiries: Inbox,
  services: Truck,
  content: FileText,
  languages: Languages,
  admins: ShieldCheck,
  logs: Activity,
  settings: Settings,
} satisfies Record<string, LucideIcon>;

export function Sidebar({
  items,
  admin,
  signOutAction,
}: {
  items: NavItem[];
  admin: { name: string; email: string; role: string };
  signOutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const active = (href: string) =>
    href === "/admin/shipments"
      ? pathname === href || (pathname.startsWith("/admin/shipments/") && !pathname.startsWith("/admin/shipments/new"))
      : pathname === href || pathname.startsWith(href + "/");

  const nav = (
    <nav aria-label="Admin navigation" className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const isActive = active(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
              isActive ? "bg-white/10 text-white" : "text-navy-200 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon className={cn("h-[18px] w-[18px]", isActive ? "text-signal-500" : "text-navy-400")} aria-hidden />
            <span className="flex-1">{item.label}</span>
            {!!item.badge && (
              <span className="rounded-full bg-signal-600 px-2 py-0.5 text-[11px] font-semibold text-white">{item.badge}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-white/10 p-4">
      <Link href="/admin/account" className="block rounded-md p-2 hover:bg-white/5">
        <p className="truncate text-sm font-semibold text-white">{admin.name}</p>
        <p className="truncate text-xs text-navy-300">{admin.email}</p>
        <p className="mt-1 inline-block rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-medium text-navy-100">{admin.role}</p>
      </Link>
      <form action={signOutAction} className="mt-2">
        <button type="submit" className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-navy-200 hover:bg-white/5 hover:text-white">
          <LogOut className="h-[18px] w-[18px] text-navy-400" aria-hidden />
          Sign out
        </button>
      </form>
    </div>
  );

  const brand = (
    <Link href="/admin/dashboard" className="flex items-center gap-2.5 px-5 py-5">
      <LogoMark className="h-8 w-8" />
      <span className="leading-tight">
        <span className="block text-sm font-extrabold tracking-tight text-white">WESTBRIDGE</span>
        <span className="block text-[10px] font-semibold tracking-[0.2em] text-navy-300">ADMIN</span>
      </span>
    </Link>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-navy-950 lg:flex">
        {brand}
        {nav}
        {footer}
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/10 bg-navy-950 px-4 lg:hidden">
        <Link href="/admin/dashboard" className="flex items-center gap-2">
          <LogoMark className="h-7 w-7" />
          <span className="text-sm font-extrabold text-white">WESTBRIDGE ADMIN</span>
        </Link>
        <button type="button" onClick={() => setOpen(true)} aria-label="Open navigation" aria-expanded={open} className="rounded-md p-2 text-white hover:bg-white/10">
          <Menu className="h-6 w-6" />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" className="absolute inset-0 bg-navy-950/60" aria-label="Close navigation" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-72 max-w-[85%] flex-col bg-navy-950 shadow-xl">
            <div className="flex items-center justify-between pr-3">
              {brand}
              <button type="button" onClick={() => setOpen(false)} aria-label="Close navigation" className="rounded-md p-2 text-white hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      )}
    </>
  );
}
