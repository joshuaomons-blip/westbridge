import Image from "next/image";
import { getTranslations } from "next-intl/server";
import {
  Ban,
  Check,
  CircleCheck,
  Flag,
  ClipboardCheck,
  Clock,
  Earth,
  FlaskConical,
  Mail,
  MapPin,
  PackageCheck,
  Truck,
  TriangleAlert,
  UserCheck,
  Hourglass,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { PublicTracking } from "@/lib/tracking";
import { categoryOf, isOnHold, isStatusCode, progressIndex, type StatusCategory } from "@/lib/statuses";
import { cn, dayKey, formatDate, formatDateParts, formatDateTime, formatDayHeading, formatRelative, formatTime } from "@/lib/format";
import { PHOTOS } from "@/lib/photos";
import { buildJourney } from "@/lib/journey";
import { supportHref } from "@/lib/support";
import { localized } from "@/lib/public-data";
import { CopyButton } from "./CopyButton";
import { PrintButton } from "./PrintButton";
import { ShareButton } from "./ShareButton";
import { FoundBanner } from "./FoundBanner";

/** Banner colour and icon for each kind of status. White text passes contrast on all of them. */
export const BANNER: Record<StatusCategory, { bg: string; dot: string; icon: LucideIcon }> = {
  pending: { bg: "bg-brand-800", dot: "bg-brand-700", icon: ClipboardCheck },
  active: { bg: "bg-brand-700", dot: "bg-brand-700", icon: Truck },
  delivered: { bg: "bg-emerald-700", dot: "bg-emerald-600", icon: CircleCheck },
  exception: { bg: "bg-amber-700", dot: "bg-amber-600", icon: TriangleAlert },
  closed: { bg: "bg-slate-600", dot: "bg-slate-500", icon: Ban },
};

const actionBtn =
  "h-11 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-brand-900 transition hover:border-brand-700/40 hover:bg-slate-50";

export async function TrackingResult({
  data,
  locale,
  supportText,
  supportEmail,
}: {
  data: PublicTracking;
  locale: string;
  supportText?: string;
  supportEmail?: string;
}) {
  const t = await getTranslations("tracking");
  const ts = await getTranslations("status");
  const td = await getTranslations("statusDescription");
  const tt = await getTranslations("shipmentType");

  const mailto = supportHref(supportEmail, t("emailSubject", { number: data.tracking_number }));
  const statusLabel = (code: string) => (isStatusCode(code) ? ts(code) : code);
  const category = categoryOf(data.status);
  // Customs, delays and delivery problems pause the shipment: everything ahead shows as pending.
  const hold = isOnHold(data.status);
  const banner = hold ? { bg: "bg-amber-700", dot: "bg-amber-600", icon: Hourglass } : BANNER[category];
  const BannerIcon = banner.icon;
  const step = progressIndex(data.status);
  const steps = [
    { label: t("stepRegistered"), icon: ClipboardCheck },
    { label: t("stepTransit"), icon: Earth },
    { label: t("stepOut"), icon: Truck },
    { label: t("stepDelivered"), icon: PackageCheck },
  ];
  const isProblem = category === "exception" || hold;
  const typeKey = (["parcel", "document", "freight", "pallet", "other"] as const).find((k) => k === data.shipment_type);
  const showProgress = step >= 0 && category !== "closed";
  const journey = buildJourney({
    origin: data.origin,
    destination: data.destination,
    routeStops: data.route_stops,
    events: data.events,
    delivered: category === "delivered",
  });
  const currentIndex = journey.findIndex((j) => j.state === "current");
  const currentStop = currentIndex >= 0 ? journey[currentIndex] : null;
  // Route marker: how far along the recorded journey the shipment is.
  const pct =
    category === "delivered"
      ? 100
      : currentIndex > 0
        ? Math.round((currentIndex / (journey.length - 1)) * 100)
        : showProgress
          ? Math.round((step / 3) * 100)
          : 0;

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
      <FoundBanner title={t("found")} text={t("foundText")} />
      {data.is_demo && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <FlaskConical className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <p>{t("demoNotice")}</p>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* ------------------------------------------------------------ main */}
        <div className="trk-stage min-w-0 space-y-6">
          <section className="overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_-30px_rgba(7,21,47,0.5)] ring-1 ring-slate-200" aria-labelledby="status-heading">
            <div className={cn("relative overflow-hidden px-6 py-7 text-white sm:px-9 sm:py-9 print:bg-white print:text-black", banner.bg)}>
              <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/[0.07]" aria-hidden />
              <div className="pointer-events-none absolute -right-8 -bottom-32 h-64 w-64 rounded-full bg-white/[0.05]" aria-hidden />

              <div className="relative flex flex-wrap items-center gap-x-3 gap-y-1 [&_button]:text-white/85 [&_button:hover]:bg-white/10 [&_button:hover]:text-white">
                <span className="text-xs font-bold tracking-[0.16em] text-white/70 uppercase">{t("trackingNumber")}</span>
                <span className="font-mono text-lg font-semibold tracking-wider sm:text-xl">{data.tracking_number}</span>
                <CopyButton value={data.tracking_number} label={t("copy")} copiedLabel={t("copied")} />
              </div>

              <div className="relative mt-6 grid gap-7 md:grid-cols-[1fr_auto] md:items-end">
                <div>
                  <div className="flex items-center gap-4">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
                      <BannerIcon className="h-7 w-7" aria-hidden />
                    </span>
                    <h2 id="status-heading" className="font-display text-4xl leading-none font-black tracking-[-0.02em] [font-stretch:110%] sm:text-5xl">
                      {statusLabel(data.status)}
                    </h2>
                  </div>
                  {isStatusCode(data.status) && <p className="mt-4 max-w-xl text-lg text-white/85">{td(data.status)}</p>}
                  {hold && (
                    <p className="mt-4 mr-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-bold text-amber-800">
                      <span className="relative flex h-2 w-2" aria-hidden>
                        <span className="trk-ping absolute inset-0 rounded-full bg-amber-500" />
                        <span className="relative h-2 w-2 rounded-full bg-amber-600" />
                      </span>
                      {t("onHold")}
                    </p>
                  )}
                  <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-black/15 px-3 py-1 text-sm font-medium text-white/90">
                    <Clock className="h-4 w-4" aria-hidden />
                    <time dateTime={data.last_update} title={formatDateTime(data.last_update, locale)}>
                      {t("updated", { time: formatRelative(data.last_update, locale) })}
                    </time>
                  </p>
                </div>

                <div className="md:min-w-[220px] md:border-l md:border-white/20 md:pl-8">
                  <p className="text-sm font-semibold text-white/75">{deliveredEvent ? t("deliveredOn") : t("estimatedDelivery")}</p>
                  {hold && !deliveredEvent ? (
                    <>
                      <p className="font-display mt-1 text-3xl leading-tight font-black [font-stretch:108%]">{t("pending")}</p>
                      <p className="mt-1 max-w-[16rem] text-sm text-white/85">
                        {data.status === "customs_processing" ? t("holdCustoms") : t("holdOther")}
                      </p>
                    </>
                  ) : dateParts ? (
                    <>
                      <p className="mt-1 text-lg font-semibold capitalize">{dateParts.weekday}</p>
                      <p className="font-display text-3xl leading-tight font-black [font-stretch:108%]">{dateParts.date}</p>
                      {deliveredEvent?.received_by && <p className="mt-1 text-sm text-white/85">{t("receivedBy", { name: deliveredEvent.received_by })}</p>}
                    </>
                  ) : (
                    <p className="mt-1 text-xl font-semibold">{t("notProvided")}</p>
                  )}
                </div>
              </div>
            </div>

            {showProgress && (
              <div className="px-5 py-8 sm:px-9" role="group" aria-label={t("progress")}>
                <ol className="grid grid-cols-4">
                  {steps.map(({ label, icon: Icon }, i) => {
                    const done = i <= step;
                    const current = i === step;
                    const warn = isProblem && current;
                    return (
                      <li key={label} className="relative flex flex-col items-center text-center" aria-current={current ? "step" : undefined}>
                        {i > 0 && (
                          <span className="absolute top-6 right-1/2 h-1.5 w-full -translate-y-1/2 bg-slate-200" aria-hidden>
                            {done && <span className="trk-grow absolute inset-0 bg-brand-800" style={{ animationDelay: `${0.5 + i * 0.25}s` }} />}
                          </span>
                        )}
                        <span
                          className={cn(
                            "relative z-10 flex h-12 w-12 items-center justify-center rounded-full",
                            warn
                              ? "bg-amber-600 text-white ring-4 ring-amber-600/20"
                              : current
                                ? category === "delivered"
                                  ? "bg-emerald-600 text-white ring-4 ring-emerald-600/20"
                                  : "bg-signal-600 text-white ring-4 ring-signal-600/20"
                                : done
                                  ? "bg-brand-800 text-white"
                                  : "bg-white text-slate-400 ring-2 ring-slate-200",
                          )}
                        >
                          <Icon className="h-6 w-6" aria-hidden />
                        </span>
                        <span className={cn("mt-3 px-1 text-xs font-bold sm:text-sm", done ? "text-brand-900" : "text-slate-400")}>{label}</span>
                        {hold && i > step && <span className="mt-0.5 text-[11px] font-semibold text-amber-700">{t("pending")}</span>}
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </section>


          {/* Journey: every place the shipment has passed through, and the stops ahead */}
          <section className="rounded-2xl bg-white px-6 py-7 ring-1 ring-slate-200 sm:px-9" aria-labelledby="journey-heading">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-5">
              <h2 id="journey-heading" className="font-display text-2xl font-black text-brand-900 [font-stretch:108%]">
                {t("journey")}
              </h2>
              <p className="text-xs text-slate-500">{t("journeyText")}</p>
            </div>
            <ol className="mt-6">
              {journey.map((stop, i) => {
                const last = i === journey.length - 1;
                const reached = stop.state !== "upcoming";
                const nextReached = !last && journey[i + 1].state !== "upcoming";
                const isCurrent = stop.state === "current";
                const sub =
                  stop.kind === "origin" ? t("origin") : stop.kind === "destination" ? t("destination") : stop.state === "upcoming" ? (hold ? t("pending") : t("upcoming")) : null;
                return (
                  <li
                    key={`${stop.name}-${i}`}
                    aria-current={isCurrent ? "location" : undefined}
                    className="relative flex gap-4 pb-6 last:pb-0"
                    style={{ animation: "trk-rise 0.5s cubic-bezier(0.22,1,0.36,1) both", animationDelay: `${0.6 + i * 0.15}s` }}
                  >
                    {!last && (
                      <span
                        className={cn("absolute top-10 bottom-1 left-[19px] w-0", nextReached ? "border-l-[3px] border-brand-800" : "border-l-2 border-dashed border-slate-300")}
                        aria-hidden
                      />
                    )}
                    <span
                      className={cn(
                        "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                        isCurrent
                          ? cn("text-white ring-4", isProblem ? "bg-amber-600 ring-amber-600/20" : "bg-signal-600 ring-signal-600/20")
                          : reached
                            ? "bg-brand-800 text-white"
                            : "bg-white text-slate-400 ring-2 ring-slate-200",
                      )}
                      aria-hidden
                    >
                      {isCurrent && (
                        <span className={cn("trk-ping absolute inset-0 rounded-full", isProblem ? "bg-amber-500/40" : "bg-signal-500/40")} />
                      )}
                      {isCurrent ? (
                        <BannerIcon className="relative h-5 w-5" />
                      ) : stop.kind === "destination" ? (
                        <Flag className="h-4 w-4" />
                      ) : reached ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-slate-300" />
                      )}
                    </span>
                    <div
                      className={cn(
                        "flex min-w-0 flex-1 flex-col gap-x-6 gap-y-0.5 pt-1.5 sm:flex-row sm:items-baseline sm:justify-between",
                        isCurrent && "-mt-1 rounded-lg bg-slate-50 px-4 pt-2.5 pb-3 ring-1 ring-slate-100",
                      )}
                    >
                      <div className="min-w-0">
                        {isCurrent && <p className={cn("text-xs font-bold", isProblem ? "text-amber-700" : "text-signal-600")}>{hold ? t("holdAt") : t("currentLocation")}</p>}
                        <p className={cn("text-[17px] font-bold break-words", reached ? "text-brand-900" : "text-slate-500")}>{stop.name}</p>
                        {(stop.country || sub) && <p className="text-sm text-slate-500">{[stop.country, sub].filter(Boolean).join(" · ")}</p>}
                      </div>
                      {stop.at && reached && <p className="shrink-0 text-sm text-slate-500 tabular-nums">{formatDateTime(stop.at, locale)}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Timeline grouped by day */}
          <section className="rounded-2xl bg-white px-6 py-7 ring-1 ring-slate-200 sm:px-9" aria-labelledby="history-heading">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-5">
              <h2 id="history-heading" className="font-display text-2xl font-black text-brand-900 [font-stretch:108%]">
                {t("history")}
              </h2>
              <p className="text-xs text-slate-500">{t("timesUtc")}</p>
            </div>
            {data.events.length === 0 ? (
              <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">{t("noEvents")}</p>
            ) : (
              <div className="mt-6 space-y-7">
                {days.map((day, di) => (
                  <div key={day.key}>
                    <h3 className="text-xs font-bold tracking-[0.12em] text-slate-500 uppercase">{formatDayHeading(day.key, locale)}</h3>
                    <ol className="mt-4">
                      {day.events.map((e, i) => {
                        const latest = di === 0 && i === 0;
                        const lastInDay = i === day.events.length - 1;
                        return (
                          <li key={`${e.occurred_at}-${i}`} className="grid grid-cols-[4.25rem_1.5rem_1fr] gap-3 sm:grid-cols-[5rem_1.5rem_1fr]">
                            <time dateTime={e.occurred_at} className="pt-0.5 text-right text-sm font-semibold text-slate-500 tabular-nums">
                              {formatTime(e.occurred_at, locale)}
                            </time>
                            <span className="relative flex justify-center" aria-hidden>
                              {!lastInDay && <span className="absolute top-5 -bottom-1 w-0.5 bg-slate-200" />}
                              <span className={cn("relative mt-1 h-3.5 w-3.5 rounded-full", latest ? "bg-signal-600 ring-4 ring-signal-600/20" : "bg-brand-800")} />
                            </span>
                            <div className={cn("min-w-0 pb-6", latest && "-mt-2 mb-4 rounded-lg bg-slate-50 px-4 pt-2 pb-3 ring-1 ring-slate-100")}>
                              {latest && <p className="mb-0.5 text-xs font-bold text-signal-600">{t("currentMilestone")}</p>}
                              <p className={cn("font-bold", latest ? "text-brand-900" : "text-slate-800")}>{statusLabel(e.status)}</p>
                              {e.location && (
                                <p className="mt-0.5 flex items-center gap-1 text-sm font-medium text-slate-600">
                                  <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                                  {e.location}
                                </p>
                              )}
                              {e.description && <p className="mt-1 text-sm text-slate-600">{e.description}</p>}
                              {e.received_by && (
                                <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-sm font-semibold text-emerald-800">
                                  <UserCheck className="h-4 w-4" aria-hidden />
                                  {t("receivedBy", { name: e.received_by })}
                                </p>
                              )}
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
        </div>

        {/* ----------------------------------------------------------- aside */}
        <aside className="trk-stage space-y-6 lg:sticky lg:top-32">
          {/* Route card */}
          <section className="overflow-hidden rounded-2xl bg-brand-950 text-white ring-1 ring-brand-950" aria-labelledby="route-heading">
            <div className="px-6 pt-6 pb-7">
              <h2 id="route-heading" className="text-xs font-bold tracking-[0.16em] text-white/60 uppercase">
                {t("route")}
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white/60">{t("from")}</p>
                  <p className="font-display mt-1 truncate text-2xl font-black [font-stretch:108%]">{data.origin.city}</p>
                  <p className="truncate text-sm text-white/70">{data.origin.country}</p>
                </div>
                <div className="min-w-0 text-right">
                  <p className="text-xs font-semibold text-white/60">{t("to")}</p>
                  <p className="font-display mt-1 truncate text-2xl font-black [font-stretch:108%]">{data.destination.city}</p>
                  <p className="truncate text-sm text-white/70">{data.destination.country}</p>
                </div>
              </div>

              <div className="relative mt-7 h-10" aria-hidden>
                <span className="absolute top-1/2 left-0 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white bg-brand-950" />
                <span className="absolute top-1/2 right-0 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white/40 bg-brand-950" />
                <span className="absolute inset-x-3 top-1/2 h-0 -translate-y-1/2 border-t-2 border-dashed border-white/25" />
                <span
                  className={cn("trk-grow absolute top-1/2 left-3 h-1 -translate-y-1/2 rounded-full", isProblem ? "bg-amber-500" : category === "delivered" ? "bg-emerald-500" : "bg-signal-500")}
                  style={{ width: `calc((100% - 1.5rem) * ${pct / 100})` }}
                />
                <span
                  className={cn(
                    "trk-marker absolute top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-white shadow-lg ring-4 ring-brand-950",
                    isProblem ? "bg-amber-600" : category === "delivered" ? "bg-emerald-600" : "bg-signal-600",
                  )}
                  style={{ left: `calc(0.75rem + (100% - 1.5rem) * ${pct / 100})` }}
                >
                  <BannerIcon className="h-5 w-5" />
                </span>
              </div>
            </div>
            {currentStop && category !== "delivered" && (
              <div className="flex items-center gap-3 border-t border-white/10 bg-white/[0.04] px-6 py-4">
                <MapPin className="h-5 w-5 shrink-0 text-signal-500" aria-hidden />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white/60">{hold ? t("holdAt") : t("currentLocation")}</p>
                  <p className="truncate font-semibold">{currentStop.name}</p>
                </div>
              </div>
            )}
          </section>

          {/* Details */}
          <section className="rounded-2xl bg-white ring-1 ring-slate-200" aria-labelledby="details-heading">
            <h2 id="details-heading" className="px-6 pt-5 text-xs font-bold tracking-[0.16em] text-slate-500 uppercase">
              {t("details")}
            </h2>
            <dl className="mt-2 divide-y divide-slate-100 px-6 pb-2">
              {facts.map((f) => (
                <div key={f.label} className="flex items-baseline justify-between gap-4 py-3">
                  <dt className="text-sm text-slate-500">{f.label}</dt>
                  <dd className="text-right text-sm font-semibold break-words text-slate-900">{f.value}</dd>
                </div>
              ))}
            </dl>
            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-4 print:hidden">
              <ShareButton label={t("share")} copiedLabel={t("linkCopied")} title={t("title")} className={actionBtn} />
              <PrintButton label={t("print")} className={actionBtn} />
            </div>
          </section>

          {/* Help */}
          <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 print:hidden" aria-labelledby="help-heading">
            <div className="relative h-36">
              <Image src={PHOTOS.support} alt="" fill sizes="(min-width: 1024px) 360px, 100vw" className="object-cover object-[50%_35%]" />
            </div>
            <div className="p-6">
              <h2 id="help-heading" className="font-display text-xl font-black text-brand-900 [font-stretch:108%]">
                {t("supportTitle")}
              </h2>
              <p className="mt-2 text-sm whitespace-pre-line text-slate-600">{supportText ?? t("supportText")}</p>
              <div className="mt-5 flex flex-col gap-2">
                {mailto ? (
                  <a href={mailto} className="btn-accent h-11">
                    <Mail className="h-4 w-4" aria-hidden />
                    {t("emailSupport")}
                  </a>
                ) : (
                  <Link href="/contact" className="btn-accent h-11">
                    {t("contactSupport")}
                  </Link>
                )}
                {supportEmail && <p className="text-center text-xs break-all text-slate-500">{supportEmail}</p>}
                <Link href="/track" className="btn-ghost h-11">
                  {t("trackAnother")}
                </Link>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
