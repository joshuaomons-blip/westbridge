import Image from "next/image";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  Ban,
  CircleCheck,
  ClipboardCheck,
  Earth,
  FlaskConical,
  PackageCheck,
  Truck,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { PublicTracking } from "@/lib/tracking";
import { categoryOf, isStatusCode, progressIndex, type StatusCategory } from "@/lib/statuses";
import { cn, dayKey, formatDate, formatDateParts, formatDateTime, formatDayHeading, formatTime } from "@/lib/format";
import { PHOTOS } from "@/lib/photos";
import { localized } from "@/lib/public-data";
import { CopyButton } from "./CopyButton";
import { PrintButton } from "./PrintButton";

/** Banner colour and icon for each kind of status. White text passes contrast on all of them. */
const BANNER: Record<StatusCategory, { bg: string; icon: LucideIcon }> = {
  pending: { bg: "bg-brand-800", icon: ClipboardCheck },
  active: { bg: "bg-brand-700", icon: Truck },
  delivered: { bg: "bg-emerald-700", icon: CircleCheck },
  exception: { bg: "bg-amber-700", icon: TriangleAlert },
  closed: { bg: "bg-slate-600", icon: Ban },
};

export async function TrackingResult({ data, locale, supportText }: { data: PublicTracking; locale: string; supportText?: string }) {
  const t = await getTranslations("tracking");
  const ts = await getTranslations("status");
  const td = await getTranslations("statusDescription");
  const tt = await getTranslations("shipmentType");

  const statusLabel = (code: string) => (isStatusCode(code) ? ts(code) : code);
  const category = categoryOf(data.status);
  const banner = BANNER[category];
  const BannerIcon = banner.icon;
  const step = progressIndex(data.status);
  const steps = [
    { label: t("stepRegistered"), icon: ClipboardCheck },
    { label: t("stepTransit"), icon: Earth },
    { label: t("stepOut"), icon: Truck },
    { label: t("stepDelivered"), icon: PackageCheck },
  ];
  const isProblem = category === "exception";
  const typeKey = (["parcel", "document", "freight", "pallet", "other"] as const).find((k) => k === data.shipment_type);

  // Delivered: show the recorded delivery date. Otherwise: the estimate, if one was entered.
  const deliveredEvent = category === "delivered" ? data.events.find((e) => e.status === "delivered") : undefined;
  const dateValue = deliveredEvent?.occurred_at ?? data.estimated_delivery;
  const dateParts = dateValue ? formatDateParts(dateValue, locale) : null;

  // Group the timeline by calendar day (events arrive newest first).
  const days: { key: string; events: PublicTracking["events"] }[] = [];
  for (const e of data.events) {
    const k = dayKey(e.occurred_at);
    const last = days[days.length - 1];
    if (last && last.key === k) last.events.push(e);
    else days.push({ key: k, events: [e] });
  }

  const facts = [
    data.service ? { label: t("service"), value: localized(data.service.title, locale) } : null,
    { label: t("type"), value: typeKey ? tt(typeKey) : data.shipment_type },
    { label: t("packages"), value: String(data.package_quantity) },
    { label: t("created"), value: formatDate(data.created_at, locale) },
    { label: t("lastUpdate"), value: formatDateTime(data.last_update, locale) },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="space-y-6">
      {data.is_demo && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <FlaskConical className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <p>{t("demoNotice")}</p>
        </div>
      )}

      <section className="overflow-hidden rounded-xl bg-white shadow-[0_18px_50px_-24px_rgba(7,21,47,0.45)] ring-1 ring-slate-200" aria-labelledby="status-heading">
        {/* Status banner */}
        <div className={cn("px-6 py-7 text-white sm:px-10 sm:py-9 print:bg-white print:text-black", banner.bg)}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/20 pb-5">
            <div className="flex items-center gap-2 [&_button]:text-white/85 [&_button:hover]:bg-white/10 [&_button:hover]:text-white">
              <span className="text-sm text-white/75">{t("trackingNumber")}</span>
              <span className="font-mono text-lg font-semibold tracking-wider sm:text-xl">{data.tracking_number}</span>
              <CopyButton value={data.tracking_number} label={t("copy")} copiedLabel={t("copied")} />
            </div>
            <PrintButton label={t("print")} />
          </div>

          <div className="mt-7 grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <BannerIcon className="h-7 w-7" aria-hidden />
                </span>
                <h2 id="status-heading" className="font-display text-4xl leading-none font-black tracking-[-0.02em] [font-stretch:110%] sm:text-5xl">
                  {statusLabel(data.status)}
                </h2>
              </div>
              {isStatusCode(data.status) && <p className="mt-4 max-w-xl text-lg text-white/85">{td(data.status)}</p>}
            </div>

            <div className="md:min-w-[240px] md:border-l md:border-white/20 md:pl-8">
              <p className="text-sm font-semibold text-white/75">{deliveredEvent ? t("deliveredOn") : t("estimatedDelivery")}</p>
              {dateParts ? (
                <>
                  <p className="mt-1 text-lg font-semibold capitalize">{dateParts.weekday}</p>
                  <p className="font-display text-3xl leading-tight font-black [font-stretch:108%]">{dateParts.date}</p>
                </>
              ) : (
                <p className="mt-1 text-xl font-semibold">{t("notProvided")}</p>
              )}
            </div>
          </div>
        </div>

        {/* Progress */}
        {step >= 0 && category !== "closed" && (
          <div className="border-b border-slate-100 px-6 py-8 sm:px-10" role="group" aria-label={t("progress")}>
            <ol className="grid grid-cols-4">
              {steps.map(({ label, icon: Icon }, i) => {
                const done = i <= step;
                const current = i === step;
                const warn = isProblem && current;
                return (
                  <li key={label} className="relative flex flex-col items-center text-center" aria-current={current ? "step" : undefined}>
                    {i > 0 && (
                      <span className={cn("absolute top-6 right-1/2 h-1.5 w-full -translate-y-1/2", done ? "bg-brand-800" : "bg-slate-200")} aria-hidden />
                    )}
                    <span
                      className={cn(
                        "relative z-10 flex h-12 w-12 items-center justify-center rounded-full",
                        warn
                          ? "bg-amber-600 text-white ring-4 ring-amber-600/20"
                          : current
                            ? "bg-signal-600 text-white ring-4 ring-signal-600/20"
                            : done
                              ? "bg-brand-800 text-white"
                              : "bg-white text-slate-400 ring-2 ring-slate-200",
                      )}
                    >
                      <Icon className="h-6 w-6" aria-hidden />
                    </span>
                    <span className={cn("mt-3 px-1 text-xs font-bold sm:text-sm", done ? "text-brand-900" : "text-slate-400")}>{label}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {/* Route */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 py-7 sm:px-10">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-500">{t("from")}</p>
            <p className="mt-1 truncate text-xl font-bold text-brand-900 sm:text-2xl">{data.origin.city}</p>
            <p className="truncate text-slate-600">{data.origin.country}</p>
          </div>
          <div className="flex items-center gap-2 text-brand-800" aria-hidden>
            <span className="hidden h-0 w-10 border-t-2 border-dashed border-slate-300 sm:block lg:w-24" />
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
              <ArrowRight className="h-5 w-5" />
            </span>
            <span className="hidden h-0 w-10 border-t-2 border-dashed border-slate-300 sm:block lg:w-24" />
          </div>
          <div className="min-w-0 text-right">
            <p className="text-sm font-semibold text-slate-500">{t("to")}</p>
            <p className="mt-1 truncate text-xl font-bold text-brand-900 sm:text-2xl">{data.destination.city}</p>
            <p className="truncate text-slate-600">{data.destination.country}</p>
          </div>
        </div>

        {/* Shipment facts */}
        <dl className="grid grid-cols-2 gap-px border-t border-slate-100 bg-slate-100 sm:grid-cols-3 lg:grid-cols-5">
          {facts.map((f) => (
            <div key={f.label} className="bg-slate-50 px-6 py-4 sm:px-6">
              <dt className="text-xs font-semibold text-slate-500">{f.label}</dt>
              <dd className="mt-1 font-semibold break-words text-slate-900">{f.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Timeline grouped by day */}
      <section className="rounded-xl bg-white px-6 py-7 ring-1 ring-slate-200 sm:px-10" aria-labelledby="history-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="history-heading" className="font-display text-2xl font-black text-brand-900 [font-stretch:108%]">
            {t("history")}
          </h2>
          <p className="text-xs text-slate-500">{t("timesUtc")}</p>
        </div>
        {data.events.length === 0 ? (
          <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">{t("noEvents")}</p>
        ) : (
          <div className="mt-6 space-y-7">
            {days.map((day, di) => (
              <div key={day.key}>
                <h3 className="rounded-md bg-slate-100 px-4 py-2 text-sm font-bold text-brand-900 capitalize">{formatDayHeading(day.key, locale)}</h3>
                <ol className="mt-4">
                  {day.events.map((e, i) => {
                    const latest = di === 0 && i === 0;
                    const lastInDay = i === day.events.length - 1;
                    return (
                      <li key={`${e.occurred_at}-${i}`} className="grid grid-cols-[4.5rem_1.5rem_1fr] gap-3 sm:grid-cols-[5.5rem_1.5rem_1fr]">
                        <time dateTime={e.occurred_at} className="pt-0.5 text-right text-sm font-semibold text-slate-500 tabular-nums">
                          {formatTime(e.occurred_at, locale)}
                        </time>
                        <span className="relative flex justify-center" aria-hidden>
                          {!lastInDay && <span className="absolute top-5 -bottom-1 w-0.5 bg-slate-200" />}
                          <span className={cn("relative mt-1 h-3.5 w-3.5 rounded-full", latest ? "bg-signal-600 ring-4 ring-signal-600/20" : "bg-brand-800")} />
                        </span>
                        <div className="min-w-0 pb-6">
                          {latest && <p className="mb-0.5 text-xs font-bold text-signal-600">{t("currentMilestone")}</p>}
                          <p className={cn("font-bold", latest ? "text-brand-900" : "text-slate-800")}>{statusLabel(e.status)}</p>
                          {e.location && <p className="text-sm font-medium text-slate-600">{e.location}</p>}
                          {e.description && <p className="mt-1 text-sm text-slate-600">{e.description}</p>}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Help, with photo */}
      <section className="grid overflow-hidden rounded-xl bg-brand-900 text-white sm:grid-cols-[2fr_3fr] print:hidden" aria-labelledby="help-heading">
        <div className="relative h-44 sm:h-auto sm:min-h-64">
          <Image src={PHOTOS.support} alt="" fill sizes="(min-width: 640px) 40vw, 100vw" className="object-cover object-[50%_35%]" />
        </div>
        <div className="flex flex-col justify-center p-7 sm:p-10">
          <h2 id="help-heading" className="font-display text-2xl font-black [font-stretch:108%]">{t("supportTitle")}</h2>
          <p className="mt-2 text-white/80 whitespace-pre-line">{supportText ?? t("supportText")}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/contact" className="btn-accent h-12 px-6">
              {t("contactSupport")}
            </Link>
            <Link href="/track" className="inline-flex h-12 items-center rounded-md px-4 text-sm font-semibold text-white/85 hover:bg-white/10 hover:text-white">
              {t("trackAnother")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
