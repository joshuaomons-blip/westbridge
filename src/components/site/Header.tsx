"use client";

import { Suspense, useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, Headset, Mail, Menu, PackageSearch, Search, X } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { cn } from "@/lib/format";

type MenuLink = { label: string; href: string; text?: string };
type MenuGroup = { id: string; label: string; links: MenuLink[]; withTracking?: boolean };

export function Header({ email }: { email?: string }) {
  const t = useTranslations("nav");
  const tt = useTranslations("tracking");
  const locale = useLocale();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Links to sections of the homepage use plain anchors with the locale prefix.
  const home = (hash: string) => `/${locale}#${hash}`;

  const groups: MenuGroup[] = [
    {
      id: "shipping",
      label: t("shipping"),
      links: [
        { label: t("menuSend"), href: `/${locale}/contact`, text: t("menuSendText") },
        { label: t("menuPacking"), href: home("packing"), text: t("menuPackingText") },
        { label: t("menuBusiness"), href: home("business"), text: t("menuBusinessText") },
        { label: t("menuAllServices"), href: `/${locale}/services`, text: t("menuAllServicesText") },
      ],
    },
    {
      id: "tracking",
      label: t("tracking"),
      withTracking: true,
      links: [
        { label: t("menuStatusGuide"), href: home("status-guide") },
        { label: t("menuTrackPage"), href: `/${locale}/track` },
      ],
    },
    {
      id: "support",
      label: t("support"),
      links: [
        { label: t("menuFaq"), href: home("faq"), text: t("menuFaqText") },
        { label: t("menuSafety"), href: home("safety"), text: t("menuSafetyText") },
        { label: t("menuContact"), href: `/${locale}/contact`, text: t("menuContactText") },
        { label: t("menuAbout"), href: `/${locale}/about`, text: t("menuAboutText") },
      ],
    },
  ];

  useEffect(() => {
    setMobileOpen(false);
    setOpenMenu(null);
  }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

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
          {email && (
            <a href={`mailto:${email}`} className="inline-flex items-center gap-1.5 text-white/80 hover:text-white">
              <Mail className="h-3.5 w-3.5" aria-hidden />
              {email}
            </a>
          )}
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
      <div ref={navRef} className="relative">
        <div className="container-page flex h-[76px] items-center justify-between gap-6">
          <Link href="/" className="rounded-md" aria-label="Norvane Express">
            <Logo />
          </Link>

          <nav aria-label={t("main")} className="hidden h-full items-stretch lg:flex">
            {groups.map((g) => {
              const isOpen = openMenu === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`menu-${g.id}`}
                  onClick={() => setOpenMenu(isOpen ? null : g.id)}
                  onMouseEnter={() => setOpenMenu(g.id)}
                  className={cn(
                    "relative flex items-center gap-1 px-4 text-[15px] font-semibold transition-colors",
                    isOpen ? "text-brand-900" : "text-slate-600 hover:text-brand-900",
                  )}
                >
                  {g.label}
                  <ChevronDown className={cn("h-4 w-4 transition", isOpen && "rotate-180")} aria-hidden />
                  <span className={cn("absolute inset-x-4 bottom-0 h-[3px] rounded-t bg-signal-600 transition-opacity", isOpen ? "opacity-100" : "opacity-0")} aria-hidden />
                </button>
              );
            })}
            <Link href="/about" className="flex items-center px-4 text-[15px] font-semibold text-slate-600 hover:text-brand-900">
              {t("about")}
            </Link>
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
              onClick={() => setMobileOpen((o) => !o)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              aria-label={mobileOpen ? t("close") : t("menu")}
              className="rounded-md p-2 text-brand-900 hover:bg-slate-100"
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Desktop dropdown panels */}
        {groups.map((g) =>
          openMenu === g.id ? (
            <div
              key={g.id}
              id={`menu-${g.id}`}
              onMouseLeave={() => setOpenMenu(null)}
              className="absolute inset-x-0 top-full hidden border-t border-slate-100 bg-white shadow-[0_24px_40px_-24px_rgba(7,21,47,0.45)] lg:block"
            >
              <div className="container-page grid gap-10 py-8 lg:grid-cols-12">
                {g.withTracking && (
                  <div className="lg:col-span-5">
                    <p className="font-display text-xl font-black text-brand-900 [font-stretch:108%]">{tt("title")}</p>
                    <TrackBox label={tt("label")} placeholder={tt("placeholder")} submit={tt("submit")} locale={locale} />
                  </div>
                )}
                <ul className={cn("grid gap-x-8 gap-y-5 sm:grid-cols-2", g.withTracking ? "lg:col-span-7" : "lg:col-span-12 lg:grid-cols-4")}>
                  {g.links.map((l) => (
                    <li key={l.label}>
                      <a href={l.href} onClick={() => setOpenMenu(null)} className="group block rounded-md">
                        <span className="font-bold text-brand-900 group-hover:text-signal-600">{l.label}</span>
                        {l.text && <span className="mt-1 block text-sm leading-snug text-slate-600">{l.text}</span>}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null,
        )}
      </div>

      {mobileOpen && (
        <div id="mobile-nav" className="fixed inset-x-0 top-[76px] bottom-0 z-40 overflow-y-auto bg-white lg:hidden">
          <div className="container-page py-5">
            <TrackBox label={tt("label")} placeholder={tt("placeholder")} submit={tt("submit")} locale={locale} />
            <nav aria-label={t("main")} className="mt-6">
              {groups.map((g) => (
                <div key={g.id} className="border-t border-slate-100 py-4">
                  <p className="text-sm font-bold text-slate-500">{g.label}</p>
                  <ul className="mt-2">
                    {g.links.map((l) => (
                      <li key={l.label}>
                        <a href={l.href} onClick={() => setMobileOpen(false)} className="block py-2.5 text-lg font-semibold text-brand-900">
                          {l.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}

/** Compact tracking field used inside menus; submits to the tracking page. */
function TrackBox({ label, placeholder, submit, locale }: { label: string; placeholder: string; submit: string; locale: string }) {
  const id = useId();
  return (
    <form action={`/${locale}/track`} method="get" role="search" className="mt-3">
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input id={id} name="n" required maxLength={300} autoComplete="off" spellCheck={false} placeholder={placeholder} className="input h-11 pl-9 font-mono uppercase placeholder:font-sans placeholder:normal-case" />
        </div>
        <button type="submit" className="btn-accent h-11 shrink-0 px-4">
          {submit}
        </button>
      </div>
    </form>
  );
}
