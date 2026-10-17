import { getTranslations } from "next-intl/server";
import { TriangleAlert, CalendarClock, CircleCheck, CircleDot, FlaskConical, MapPin, Package, Truck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { PublicTracking } from "@/lib/tracking";
import { categoryOf, isStatusCode, progressIndex, CATEGORY_STYLE } from "@/lib/statuses";
import { formatDate, formatDateTime, formatTime, cn } from "@/lib/format";
import { CopyButton } from "./CopyButton";
import { localized } from "@/lib/public-data";

export async function TrackingResult({ data, locale, supportText }: { data: PublicTracking; locale: string; supportText?: string }) {
  const t = await getTranslations("tracking");
  const ts = await getTranslations("status");
  const td = await getTranslations("statusDescription");
  const tt = await getTranslations("shipmentType");

  const statusLabel = (code: string) => (isStatusCode(code) ? ts(code) : code);
  const category = categoryOf(data.status);
  const step = progressIndex(data.status);
  const steps = [t("stepRegistered"), t("stepTransit"), t("stepOut"), t("stepDelivered")];
  const isProblem = category === "exception";
  const isClosed = category === "closed";
  const typeKey = (["parcel", "document", "freight", "pallet", "other"] as const).find((k) => k === data.shipment_type);

  return (
    <div className="space-y-6">
      {data.is_demo && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <FlaskConical className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <p>{t("demoNotice")}</p>
        </div>
      )}

      {/* Summary */}
      <section className="card overflow-hidden" aria-labelledby="status-heading">
        <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-4 sm:px-8">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{t("trackingNumber")}</p>
          <div className="mt-1 flex items-center gap-2">
            <p className="font-mono text-xl font-semibold tracking-wider text-navy-900">{data.tracking_number}</p>
            <CopyButton value={data.tracking_number} label={t("copy")} copiedLabel={t("copied")} />
          </div>
        </div>
        <div className="px-6 py-6 sm:px-8">
          <p className="text-sm font-medium text-slate-500">{t("status")}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset",
                CATEGORY_STYLE[category],
              )}
            >
              {category === "delivered" ? (
                <CircleCheck className="h-4 w-4" aria-hidden />
              ) : isProblem ? (
                <TriangleAlert className="h-4 w-4" aria-hidden />
              ) : (
                <Truck className="h-4 w-4" aria-hidden />
              )}
              <span id="status-heading">{statusLabel(data.status)}</span>
            </span>
          </div>
          {isStatusCode(data.status) && <p className="mt-3 text-slate-600">{td(data.status)}</p>}

          {/* Progress */}
          {!isClosed && step >= 0 && (
            <div className="mt-8" role="group" aria-label={t("progress")}>
              <ol className="grid grid-cols-4 gap-2">
                {steps.map((label, i) => {
                  const done = i <= step;
                  const current = i === step;
                  return (
                    <li key={label} className="flex flex-col gap-2" aria-current={current ? "step" : undefined}>
                      <span
                        className={cn(
                          "h-1.5 rounded-full",
                          done ? (isProblem && current ? "bg-amber-500" : "bg-navy-700") : "bg-slate-200",
                        )}
                      />
                      <span className={cn("text-xs font-medium sm:text-sm", done ? "text-navy-900" : "text-slate-400")}>
                        {label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>

        {/* Details */}
        <dl className="grid border-t border-slate-100 bg-white sm:grid-cols-2 lg:grid-cols-3">
          <Detail icon={MapPin} label={t("origin")} value={`${data.origin.city}, ${data.origin.country}`} />
          <Detail icon={MapPin} label={t("destination")} value={`${data.destination.city}, ${data.destination.country}`} />
          <Detail
            icon={CalendarClock}
            label={t("estimatedDelivery")}
            value={data.estimated_delivery ? formatDate(data.estimated_delivery, locale) : t("notProvided")}
          />
          <Detail icon={CalendarClock} label={t("created")} value={formatDate(data.created_at, locale)} />
          <Detail icon={CalendarClock} label={t("lastUpdate")} value={formatDateTime(data.last_update, locale)} />
          <Detail
            icon={Package}
            label={t("type")}
            value={`${typeKey ? tt(typeKey) : data.shipment_type} · ${t("packages")}: ${data.package_quantity}`}
          />
          {data.service && <Detail icon={Truck} label={t("service")} value={localized(data.service.title, locale)} />}
        </dl>
      </section>

      {/* Timeline */}
      <section className="card px-6 py-6 sm:px-8" aria-labelledby="history-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="history-heading" className="text-lg font-semibold text-navy-900">
            {t("history")}
          </h2>
          <p className="text-xs text-slate-500">{t("timesUtc")}</p>
        </div>
        {data.events.length === 0 ? (
          <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">{t("noEvents")}</p>
        ) : (
          <ol className="relative mt-6">
            {data.events.map((e, i) => {
              const first = i === 0;
              const last = i === data.events.length - 1;
              return (
                <li key={`${e.occurred_at}-${i}`} className="relative flex gap-4 pb-7 last:pb-0">
                  {!last && <span className="absolute top-6 bottom-0 left-[11px] w-px bg-slate-200" aria-hidden />}
                  <span
                    className={cn(
                      "relative mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                      first ? "bg-navy-800 text-white" : "bg-white text-slate-400 ring-2 ring-slate-200",
                    )}
                  >
                    <CircleDot className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    {first && <p className="mb-1 text-xs font-semibold tracking-wide text-signal-600 uppercase">{t("currentMilestone")}</p>}
                    <p className={cn("font-semibold", first ? "text-navy-900" : "text-slate-800")}>{statusLabel(e.status)}</p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      <time dateTime={e.occurred_at}>
                        {formatDate(e.occurred_at, locale)} · {formatTime(e.occurred_at, locale)}
                      </time>
                      {e.location && <> · {e.location}</>}
                    </p>
                    {e.description && <p className="mt-1.5 text-sm text-slate-600">{e.description}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Support */}
      <section className="flex flex-col gap-4 rounded-xl border border-navy-100 bg-navy-50 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-navy-900">{t("supportTitle")}</h2>
          <p className="mt-1 text-sm text-slate-600 whitespace-pre-line">{supportText ?? t("supportText")}</p>
        </div>
        <Link href="/contact" className="btn-primary shrink-0">
          {t("contactSupport")}
        </Link>
      </section>
    </div>
  );
}

function Detail({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex gap-3 border-b border-slate-100 bg-white px-6 py-4 sm:px-8">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      <div className="min-w-0">
        <dt className="text-xs font-medium text-slate-500">{label}</dt>
        <dd className="mt-0.5 font-medium break-words text-slate-900">{value}</dd>
      </div>
    </div>
  );
}
