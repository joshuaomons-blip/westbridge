"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Headset, PackagePlus, PackageSearch, type LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { TrackingForm } from "./TrackingForm";
import { cn } from "@/lib/format";

type Tab = "track" | "ship" | "help";

/** White panel with Track / Ship / Get help tabs, overlapping the hero photo. */
export function HeroPanel() {
  const t = useTranslations("home");
  const [tab, setTab] = useState<Tab>("track");
  const tabs: { id: Tab; label: string; icon: LucideIcon }[] = [
    { id: "track", label: t("tabTrack"), icon: PackageSearch },
    { id: "ship", label: t("tabShip"), icon: PackagePlus },
    { id: "help", label: t("tabHelp"), icon: Headset },
  ];

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-[0_24px_60px_-20px_rgba(7,21,47,0.55)]">
      <div role="tablist" aria-label={t("tabTrack")} className="grid grid-cols-3 border-b border-slate-200">
        {tabs.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={active}
              aria-controls={`panel-${id}`}
              onClick={() => setTab(id)}
              className={cn(
                "relative flex items-center justify-center gap-2 px-3 py-4 text-sm font-bold transition-colors sm:text-[15px]",
                active ? "bg-white text-brand-900" : "bg-slate-50 text-slate-500 hover:text-brand-900",
              )}
            >
              <Icon className={cn("h-[18px] w-[18px]", active ? "text-signal-600" : "")} aria-hidden />
              {label}
              {active && <span className="absolute inset-x-0 top-0 h-[3px] bg-signal-600" aria-hidden />}
            </button>
          );
        })}
      </div>

      <div className="p-6 sm:p-8">
        {tab === "track" && (
          <div role="tabpanel" id="panel-track" aria-labelledby="tab-track">
            <h2 className="font-display mb-4 text-xl font-extrabold text-brand-900 [font-stretch:108%]">{t("trackTitle")}</h2>
            <TrackingForm />
          </div>
        )}
        {tab === "ship" && (
          <div role="tabpanel" id="panel-ship" aria-labelledby="tab-ship">
            <h2 className="font-display text-xl font-extrabold text-brand-900 [font-stretch:108%]">{t("shipTitle")}</h2>
            <p className="mt-3 max-w-prose text-slate-600">{t("shipText")}</p>
            <Link href="/contact" className="btn-accent mt-6 h-12 px-6 text-base">
              {t("shipCta")}
            </Link>
          </div>
        )}
        {tab === "help" && (
          <div role="tabpanel" id="panel-help" aria-labelledby="tab-help">
            <h2 className="font-display text-xl font-extrabold text-brand-900 [font-stretch:108%]">{t("helpTitle")}</h2>
            <p className="mt-3 max-w-prose text-slate-600">{t("helpText")}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/track" className="btn-primary h-12 px-6">
                {t("helpTrack")}
              </Link>
              <Link href="/contact" className="btn-outline h-12 px-6">
                {t("helpContact")}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
