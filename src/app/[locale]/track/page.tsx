import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CircleAlert, SearchX, WifiOff } from "lucide-react";
import { TrackingForm } from "@/components/site/TrackingForm";
import { TrackingResult } from "@/components/site/TrackingResult";
import { lookupTracking, type TrackingResult as Result } from "@/lib/tracking";
import { checkRateLimit } from "@/lib/rate-limit";
import { normalizeTrackingNumber } from "@/lib/tracking-format";
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

export default async function TrackPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("tracking");
  const raw = (await searchParams).n;
  const input = typeof raw === "string" ? raw.slice(0, 60) : "";
  const number = normalizeTrackingNumber(input);

  let result: Result | { kind: "rate_limited" } | null = null;
  if (number) {
    result = (await checkRateLimit("tracking")) ? await lookupTracking(number) : { kind: "rate_limited" };
  }
  const content = result?.kind === "found" ? await getPageContent(locale) : null;

  return (
    <div className="bg-slate-50 pb-20">
      <section className="bg-navy-950 pt-14 pb-24 text-white">
        <div className="container-page max-w-4xl">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h1>
          <p className="mt-3 text-navy-200">{t("subtitle")}</p>
        </div>
      </section>
      <div className="container-page -mt-14 max-w-4xl space-y-6">
        <div className="card p-6 sm:p-8">
          <TrackingForm defaultValue={number} autoFocus={!number} />
        </div>

        {result?.kind === "found" && (
          <TrackingResult data={result.data} locale={locale} supportText={content?.get("support.text")} />
        )}
        {result && result.kind !== "found" && (
          <ResultMessage
            kind={result.kind}
            text={{
              invalidTitle: t("invalidTitle"),
              notFoundTitle: t("notFoundTitle"),
              unavailableTitle: t("unavailableTitle"),
              errorFormat: t("errorFormat"),
              errorNotFound: t("errorNotFound"),
              errorUnavailable: t("errorUnavailable"),
              errorRateLimited: t("errorRateLimited"),
              contactSupport: t("contactSupport"),
            }}
          />
        )}
      </div>
    </div>
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
}: {
  kind: "invalid" | "not_found" | "unavailable" | "rate_limited";
  text: MessageText;
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
        <h2 className="text-lg font-semibold text-navy-900">{map.title}</h2>
        <p className="mt-1 text-slate-600">{map.text}</p>
        <Link href="/contact" className="mt-4 inline-block text-sm font-semibold text-navy-700 underline underline-offset-2 hover:text-navy-900">
          {t.contactSupport}
        </Link>
      </div>
    </div>
  );
}
