"use client";

import { Suspense, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Menu, PackageSearch, X } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { cn } from "@/lib/format";

const NAV = [
  { href: "/services", key: "services" },
  { href: "/about", key: "about" },
  { href: "/contact", key: "contact" },
] as const;

export function Header() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-white/95 backdrop-blur transition-shadow",
        scrolled ? "border-slate-200 shadow-sm" : "border-transparent",
      )}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded focus:bg-navy-900 focus:px-3 focus:py-2 focus:text-white"
      >
        {t("skip")}
      </a>
      <div className="container-page flex h-[72px] items-center justify-between gap-4">
        <Link href="/" className="rounded-md" aria-label="Westbridge Global Express">
          <Logo />
        </Link>

        <nav aria-label={t("main")} className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "relative rounded-md px-3.5 py-2 text-[15px] font-medium transition-colors hover:text-navy-900",
                isActive(item.href) ? "text-navy-900" : "text-slate-600",
              )}
            >
              {t(item.key)}
              {isActive(item.href) && (
                <span className="absolute inset-x-3.5 -bottom-[17px] h-0.5 bg-signal-600" aria-hidden />
              )}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Suspense fallback={<div className="h-9 w-28" />}>
            <LanguageSwitcher />
          </Suspense>
          <Link href="/track" className="btn-accent">
            <PackageSearch className="h-4 w-4" aria-hidden />
            {t("trackShipment")}
          </Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <Suspense fallback={<div className="h-9 w-16" />}>
            <LanguageSwitcher compact />
          </Suspense>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? t("close") : t("menu")}
            className="rounded-md p-2 text-navy-900 hover:bg-navy-50"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-nav" className="fixed inset-x-0 top-[72px] bottom-0 z-40 overflow-y-auto bg-white lg:hidden">
          <nav aria-label={t("main")} className="container-page flex flex-col gap-1 py-6">
            <Link href="/" className="rounded-md px-3 py-3 text-lg font-medium text-navy-900 hover:bg-navy-50">
              {t("home")}
            </Link>
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-3 text-lg font-medium hover:bg-navy-50",
                  isActive(item.href) ? "bg-navy-50 text-navy-900" : "text-slate-700",
                )}
              >
                {t(item.key)}
              </Link>
            ))}
            <Link href="/track" className="btn-accent mt-4 py-3.5 text-base">
              <PackageSearch className="h-5 w-5" aria-hidden />
              {t("trackShipment")}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
