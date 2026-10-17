import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, ClipboardCheck, Headset, MapPinned, PackageCheck, Hash } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { TrackingForm } from "@/components/site/TrackingForm";
import { HeroArt } from "@/components/site/HeroArt";
import { ServiceIcon } from "@/components/site/ServiceIcon";
import { getPageContent, getPublishedServices, localized } from "@/lib/public-data";
import { pageAlternates } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: { absolute: `${t("siteName")} — ${t("homeTitle")}` },
    description: t("homeDescription"),
    alternates: pageAlternates(locale, "/"),
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const [content, services] = await Promise.all([getPageContent(locale), getPublishedServices()]);
  const heroImage = content.get("home.hero_image");

  const steps = [
    { icon: ClipboardCheck, title: t("step1Title"), text: t("step1Text") },
    { icon: Hash, title: t("step2Title"), text: t("step2Text") },
    { icon: MapPinned, title: t("step3Title"), text: t("step3Text") },
    { icon: PackageCheck, title: t("step4Title"), text: t("step4Text") },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-navy-950">
        {heroImage ? (
          <>
            <Image src={heroImage} alt={t("imageAlt")} fill priority sizes="100vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-navy-950/95 via-navy-950/80 to-navy-950/40" aria-hidden />
          </>
        ) : (
          <HeroArt />
        )}
        <div className="container-page relative grid min-h-[620px] items-center gap-12 py-20 lg:grid-cols-12 lg:py-28">
          <div className="animate-fade-up lg:col-span-7">
            <p className="eyebrow text-signal-500">{t("eyebrow")}</p>
            <h1 className="font-display mt-5 text-4xl leading-[1.08] font-extrabold tracking-tight text-balance text-white sm:text-5xl lg:text-6xl">
              {content.get("home.hero_title") ?? t("heroTitle")}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-navy-100 whitespace-pre-line">
              {content.get("home.hero_subtitle") ?? t("heroSubtitle")}
            </p>
          </div>
          <div className="animate-fade-up [animation-delay:120ms] lg:col-span-5">
            <div className="rounded-2xl border border-white/10 bg-navy-950/75 p-6 shadow-2xl backdrop-blur-md sm:p-8">
              <TrackingForm variant="hero" />
            </div>
          </div>
        </div>
      </section>

      {/* Services overview */}
      {content.isVisible("section.services.visible") && (
        <section className="bg-white py-20 lg:py-24" aria-labelledby="services-heading">
          <div className="container-page">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div className="max-w-2xl">
                <h2 id="services-heading" className="font-display text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
                  {t("servicesTitle")}
                </h2>
                <p className="mt-4 text-lg text-slate-600">{t("servicesSubtitle")}</p>
              </div>
              {services.length > 0 && (
                <Link href="/services" className="group inline-flex items-center gap-2 text-sm font-semibold text-navy-700 hover:text-navy-900">
                  {t("viewAllServices")}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
                </Link>
              )}
            </div>
            {services.length > 0 ? (
              <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {services.slice(0, 6).map((s) => (
                  <li key={s.id} className="group card p-7 transition hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-md">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-navy-50 text-navy-700 transition group-hover:bg-navy-800 group-hover:text-white">
                      <ServiceIcon name={s.icon} className="h-6 w-6" />
                    </span>
                    <h3 className="mt-5 text-lg font-semibold text-navy-900">{localized(s.title, locale)}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{localized(s.description, locale)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-10 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600">
                {t("servicesEmpty")}
              </p>
            )}
          </div>
        </section>
      )}

      {/* How it works */}
      {content.isVisible("section.how_it_works.visible") && (
        <section className="border-y border-slate-200 bg-slate-50 py-20 lg:py-24" aria-labelledby="how-heading">
          <div className="container-page">
            <div className="mx-auto max-w-2xl text-center">
              <h2 id="how-heading" className="font-display text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
                {t("howTitle")}
              </h2>
              <p className="mt-4 text-lg text-slate-600">{t("howSubtitle")}</p>
            </div>
            <ol className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, i) => (
                <li key={i} className="relative">
                  {i < steps.length - 1 && (
                    <span className="absolute top-6 left-14 hidden h-px w-[calc(100%-3.5rem)] bg-gradient-to-r from-navy-200 to-transparent lg:block" aria-hidden />
                  )}
                  <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-full bg-navy-800 text-white shadow-sm">
                    <step.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <p className="mt-5 text-xs font-semibold tracking-[0.14em] text-signal-600">0{i + 1}</p>
                  <h3 className="mt-1 text-lg font-semibold text-navy-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* Customer support */}
      {content.isVisible("section.support.visible") && (
        <section className="py-20 lg:py-24" aria-labelledby="support-heading">
          <div className="container-page">
            <div className="relative overflow-hidden rounded-2xl bg-navy-900 px-6 py-12 sm:px-12 lg:flex lg:items-center lg:justify-between lg:gap-10">
              <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-navy-700/50 blur-3xl" aria-hidden />
              <div className="relative flex gap-5">
                <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white sm:inline-flex">
                  <Headset className="h-7 w-7" aria-hidden />
                </span>
                <div>
                  <h2 id="support-heading" className="font-display text-2xl font-bold text-white sm:text-3xl">
                    {t("supportTitle")}
                  </h2>
                  <p className="mt-3 max-w-xl text-navy-100 whitespace-pre-line">
                    {content.get("support.text") ?? t("supportText")}
                  </p>
                </div>
              </div>
              <Link href="/contact" className="btn-accent relative mt-8 shrink-0 px-6 py-3 lg:mt-0">
                {t("supportCta")}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
