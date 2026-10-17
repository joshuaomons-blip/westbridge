import type { Metadata } from "next";
import Image from "next/image";
import { PHOTOS } from "@/lib/photos";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, ChevronRight, CircleAlert, Mail, ListChecks, ReceiptText, SearchX, ShieldAlert, WifiOff } from "lucide-react";
import { TrackingForm } from "@/components/site/TrackingForm";
import { BANNER, TrackingResult } from "@/components/site/TrackingResult";
import { lookupTracking, type TrackingResult as Result } from "@/lib/tracking";
import { checkRateLimit } from "@/lib/rate-limit";
import { MAX_TRACKING_NUMBERS, parseTrackingList } from "@/lib/tracking-format";
import { categoryOf, isStatusCode } from "@/lib/statuses";
import { cn, formatDate, formatRelative } from "@/lib/format";
import { supportHref } from "@/lib/support";
import { getPageContent } from "@/lib/public-data";
import { pageAlternates } from "@/lib/seo";
import { Link } from "@/i18n/navigation";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ n?: string | string[] }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const { n } = await searchParams;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    // Never put the tracking number in the title; don't index individual lookups.
    title: t("trackTitle"),
    description: t("trackDescription"),
    alternates: pageAlternates(locale, "/track"),
    robots: n ? { index: false, follow: false } : undefined,
  };
}

type Lookup = Result | { kind: "rate_limited" };

async function track(number: string): Promise<Lookup> {
  return (await checkRateLimit("tracking")) ? await lookupTracking(number) : { kind: "rate_limited" };
}

export default async function TrackPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("tracking");
  const raw = (await searchParams).n;
  const input = typeof raw === "string" ? raw.slice(0, 400) : "";
  const numbers = parseTrackingList(input).slice(0, MAX_TRACKING_NUMBERS);

  // One number: full detail view. Several: a summary list linking to each.
  const single = numbers.length === 1 ? await track(numbers[0]) : null;
  const many = numbers.length > 1 ? await Promise.all(numbers.map(async (n) => ({ number: n, result: await track(n) }))) : null;
  const content = await getPageContent(locale);
  const supportEmail = content.get("contact.email");
  const supportLink = supportHref(supportEmail, numbers.length === 1 ? t("emailSubject", { number: numbers[0] }) : undefined);

  const messages: MessageText = {
    invalidTitle: t("invalidTitle"),
    notFoundTitle: t("notFoundTitle"),
    unavailableTitle: t("unavailableTitle"),
    errorFormat: t("errorFormat"),
    errorNotFound: t("errorNotFound"),
    errorUnavailable: t("errorUnavailable"),
    errorRateLimited: t("errorRateLimited"),
    contactSupport: t("contactSupport"),
  };

  return (
    <div className="bg-slate-100 pb-24">
      <section className="relative isolate overflow-hidden bg-brand-950 pt-16 pb-32 text-white print:hidden">
        <Image src={PHOTOS.hero} alt="" fill priority sizes="100vw" className="object-cover object-[50%_60%]" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-950/95 via-brand-950/75 to-brand-950/25" aria-hidden />
        <div className="container-page relative">
          <h1 className="font-display animate-fade-up text-4xl font-black tracking-[-0.02em] [font-stretch:110%] sm:text-6xl">{t("title")}</h1>
          <p className="mt-4 max-w-xl text-lg text-white/85">{t("subtitle")}</p>
        </div>
      </section>
      <div className="container-page -mt-20 space-y-6">
        <div className="relative rounded-2xl bg-white p-6 shadow-[0_24px_60px_-30px_rgba(7,21,47,0.55)] ring-1 ring-slate-200 sm:p-8 print:hidden">
          <TrackingForm defaultValue={numbers.join(", ")} autoFocus={numbers.length === 0} />
        </div>

        {numbers.length === 0 && <Landing locale={locale} supportLink={supportLink} />}

        {single?.kind === "found" && <TrackingResult data={single.data} locale={locale} supportText={content.get("support.text")} supportEmail={supportEmail} />}
        {single && single.kind !== "found" && <ResultMessage kind={single.kind} text={messages} supportLink={supportLink} />}

        {many && (
          <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200" aria-labelledby="multi-heading">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 px-6 py-5 sm:px-8">
              <h2 id="multi-heading" className="font-display text-2xl font-black text-brand-900 [font-stretch:108%]">
                {t("multiTitle", { count: many.length })}
              </h2>
              <p className="text-sm text-slate-500">{t("multiText")}</p>
            </div>
            <ul className="divide-y divide-slate-100">
              {many.map(({ number, result }) => (
                <li key={number}>
                  <SummaryRow number={number} result={result} locale={locale} messages={messages} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

async function SummaryRow({ number, result, locale, messages }: { number: string; result: Lookup; locale: string; messages: MessageText }) {
  const t = await getTranslations("tracking");
  const ts = await getTranslations("status");

  if (result.kind !== "found") {
    const title = {
      invalid: messages.invalidTitle,
      not_found: messages.notFoundTitle,
      unavailable: messages.unavailableTitle,
      rate_limited: messages.unavailableTitle,
    }[result.kind];
    return (
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-6 py-5 sm:px-8">
        <span className="font-mono font-semibold tracking-wider break-all text-slate-500">{number}</span>
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
          <CircleAlert className="h-4 w-4 text-slate-400" aria-hidden />
          {title}
        </span>
      </div>
    );
  }

  const d = result.data;
  const category = categoryOf(d.status);
  const { icon: Icon, bg } = BANNER[category];
  const date = d.estimated_delivery ? formatDate(d.estimated_delivery, locale) : null;
  return (
    <Link
      href={`/track?n=${encodeURIComponent(d.tracking_number)}`}
      className="group grid items-center gap-x-6 gap-y-3 px-6 py-5 transition hover:bg-slate-50 sm:px-8 md:grid-cols-[auto_minmax(0,1.2fr)_minmax(0,1fr)_auto]"
    >
      <span className={cn("hidden h-11 w-11 items-center justify-center rounded-full text-white md:flex", bg)}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="font-mono font-semibold tracking-wider text-brand-900">{d.tracking_number}</p>
        <p className="mt-0.5 flex items-center gap-2 font-bold text-slate-900">
          <span className={cn("h-2 w-2 rounded-full md:hidden", bg)} aria-hidden />
          {isStatusCode(d.status) ? ts(d.status) : d.status}
        </p>
        <p className="text-xs text-slate-500">{t("updated", { time: formatRelative(d.last_update, locale) })}</p>
      </div>
      <div className="min-w-0 text-sm">
        <p className="flex items-center gap-2 font-semibold text-slate-800">
          <span className="truncate">{d.origin.city}</span>
          <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <span className="truncate">{d.destination.city}</span>
        </p>
        {date && (
          <p className="text-slate-500">
            {t("estimatedDelivery")}: <span className="font-semibold text-slate-700">{date}</span>
          </p>
        )}
      </div>
      <span className="inline-flex items-center gap-1 text-sm font-bold text-signal-600 group-hover:text-signal-700">
        {t("viewDetails")}
        <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  );
}

async function Landing({ locale, supportLink }: { locale: string; supportLink: string | null }) {
  const t = await getTranslations("tracking");
  const th = await getTranslations("home");
  const cards = [
    { icon: ReceiptText, title: t("findTitle"), text: t("findText"), href: null, cta: null },
    { icon: ListChecks, title: t("statusTitle"), text: t("statusText"), href: `/${locale}#status-guide`, cta: t("statusCta") },
    { icon: ShieldAlert, title: t("safetyTitle"), text: t("safetyText"), href: `/${locale}#safety`, cta: t("safetyCta") },
  ];
  return (
    <section aria-labelledby="landing-heading" className="pt-6">
      <h2 id="landing-heading" className="font-display text-2xl font-black text-brand-900 [font-stretch:108%]">
        {t("landingTitle")}
      </h2>
      <ul className="mt-5 grid gap-5 md:grid-cols-3">
        {cards.map(({ icon: Icon, title, text, href, cta }) => (
          <li key={title} className="flex flex-col rounded-2xl bg-white p-6 ring-1 ring-slate-200">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-900 text-white">
              <Icon className="h-6 w-6" aria-hidden />
            </span>
            <h3 className="mt-5 text-lg font-bold text-brand-900">{title}</h3>
            <p className="mt-2 flex-1 text-slate-600">{text}</p>
            {href && cta && (
              <a href={href} className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-signal-600 hover:text-signal-700">
                {cta}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
            )}
          </li>
        ))}
      </ul>
      <div className="relative mt-6 grid overflow-hidden rounded-2xl bg-brand-900 text-white sm:grid-cols-[2fr_3fr]">
        <div className="relative h-44 sm:h-auto sm:min-h-56">
          <Image src={PHOTOS.support} alt="" fill sizes="(min-width: 640px) 40vw, 100vw" className="object-cover object-[50%_35%]" />
        </div>
        <div className="flex flex-col justify-center p-7 sm:p-10">
          <h3 className="font-display text-2xl font-black [font-stretch:108%]">{th("supportTitle")}</h3>
          <p className="mt-2 text-white/80">{t("supportText")}</p>
          <a href={supportLink ?? `/${locale}/contact`} className="btn-accent mt-6 h-12 self-start px-6">
            <Mail className="h-5 w-5" aria-hidden />
            {supportLink ? t("emailSupport") : t("contactSupport")}
          </a>
        </div>
      </div>
    </section>
  );
}

type MessageText = Record<
  | "invalidTitle"
  | "notFoundTitle"
  | "unavailableTitle"
  | "errorFormat"
  | "errorNotFound"
  | "errorUnavailable"
  | "errorRateLimited"
  | "contactSupport",
  string
>;

function ResultMessage({
  kind,
  text: t,
  supportLink,
}: {
  kind: "invalid" | "not_found" | "unavailable" | "rate_limited";
  text: MessageText;
  supportLink: string | null;
}) {
  const map = {
    invalid: { icon: CircleAlert, title: t.invalidTitle, text: t.errorFormat },
    not_found: { icon: SearchX, title: t.notFoundTitle, text: t.errorNotFound },
    unavailable: { icon: WifiOff, title: t.unavailableTitle, text: t.errorUnavailable },
    rate_limited: { icon: WifiOff, title: t.unavailableTitle, text: t.errorRateLimited },
  }[kind];
  const Icon = map.icon;
  return (
    <div role="alert" className="card flex flex-col items-start gap-4 p-6 sm:flex-row sm:p-8">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div>
        <h2 className="text-lg font-semibold text-brand-900">{map.title}</h2>
        <p className="mt-1 text-slate-600">{map.text}</p>
        <a href={supportLink ?? "/contact"} className="mt-4 inline-block text-sm font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-900">
          {t.contactSupport}
        </a>
      </div>
    </div>
  );
}
