"use client";

import { Suspense, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Headset, Menu, PackageSearch, X } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { cn } from "@/lib/format";

const NAV = [
  { href: "/track", key: "track" },
  { href: "/contact", key: "ship" },
  { href: "/services", key: "services" },
  { href: "/about", key: "about" },
  { href: "/contact", key: "contact" },
] as const;

export function Header() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string, key: string) =>
    key !== "ship" && (pathname === href || pathname.startsWith(href + "/"));

  return (
    <header className="sticky top-0 z-40 bg-white shadow-[0_1px_0_rgba(11,31,68,0.08)]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded focus:bg-brand-900 focus:px-3 focus:py-2 focus:text-white"
      >
        {t("skip")}
      </a>

      {/* Service bar */}
      <div className="hidden bg-brand-900 text-white lg:block">
        <div className="container-page flex h-9 items-center justify-end gap-6 text-[13px]">
          <Link href="/contact" className="inline-flex items-center gap-1.5 text-white/80 hover:text-white">
            <Headset className="h-3.5 w-3.5" aria-hidden />
            {t("customerService")}
          </Link>
          <Suspense fallback={<span className="w-24" />}>
            <LanguageSwitcher variant="bar" />
          </Suspense>
        </div>
      </div>

      {/* Main bar */}
      <div className="container-page flex h-[76px] items-center justify-between gap-6">
        <Link href="/" className="rounded-md" aria-label="Westbridge Global Express">
          <Logo />
        </Link>

        <nav aria-label={t("main")} className="hidden h-full items-stretch lg:flex">
          {NAV.map((item) => {
            const active = isActive(item.href, item.key);
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center px-4 text-[15px] font-semibold transition-colors",
                  active ? "text-brand-900" : "text-slate-600 hover:text-brand-900",
                )}
              >
                {t(item.key)}
                <span
                  className={cn(
                    "absolute inset-x-4 bottom-0 h-[3px] rounded-t bg-signal-600 transition-opacity",
                    active ? "opacity-100" : "opacity-0",
                  )}
                  aria-hidden
                />
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:block">
          <Link href="/track" className="btn-accent h-11 rounded-md px-5">
            <PackageSearch className="h-4 w-4" aria-hidden />
            {t("trackShipment")}
          </Link>
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <Suspense fallback={<div className="h-9 w-16" />}>
            <LanguageSwitcher compact />
          </Suspense>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? t("close") : t("menu")}
            className="rounded-md p-2 text-brand-900 hover:bg-slate-100"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-nav" className="fixed inset-x-0 top-[76px] bottom-0 z-40 overflow-y-auto bg-white lg:hidden">
          <nav aria-label={t("main")} className="container-page flex flex-col py-4">
            <Link href="/" className="border-b border-slate-100 py-4 text-lg font-semibold text-brand-900">
              {t("home")}
            </Link>
            {NAV.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="border-b border-slate-100 py-4 text-lg font-semibold text-brand-900"
              >
                {t(item.key)}
              </Link>
            ))}
            <Link href="/track" className="btn-accent mt-6 h-13 text-base">
              <PackageSearch className="h-5 w-5" aria-hidden />
              {t("trackShipment")}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
