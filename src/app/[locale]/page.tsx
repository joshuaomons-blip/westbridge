import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  ArrowRight,
  Briefcase,
  ClipboardCheck,
  Earth,
  Hash,
  Headset,
  MapPinned,
  PackageCheck,
  PackagePlus,
  PackageSearch,
  UserCheck,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { HeroPanel } from "@/components/site/HeroPanel";
import { getPageContent, getPublishedServices, localized } from "@/lib/public-data";
import { PHOTOS, servicePhoto } from "@/lib/photos";
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
  const heroImage = content.get("home.hero_image") ?? PHOTOS.hero;

  const quick = [
    { href: "/track", icon: PackageSearch, title: t("quickTrack"), text: t("quickTrackText") },
    { href: "/contact", icon: PackagePlus, title: t("quickShip"), text: t("quickShipText") },
    { href: "/services", icon: Briefcase, title: t("quickBusiness"), text: t("quickBusinessText") },
    { href: "/contact", icon: Headset, title: t("quickSupport"), text: t("quickSupportText") },
  ];
  const steps = [
    { icon: ClipboardCheck, title: t("step1Title"), text: t("step1Text") },
    { icon: Hash, title: t("step2Title"), text: t("step2Text") },
    { icon: MapPinned, title: t("step3Title"), text: t("step3Text") },
    { icon: PackageCheck, title: t("step4Title"), text: t("step4Text") },
  ];
  const why = [
    { icon: Hash, title: t("why1Title"), text: t("why1Text") },
    { icon: Earth, title: t("why2Title"), text: t("why2Text") },
    { icon: UserCheck, title: t("why3Title"), text: t("why3Text") },
  ];

  return (
    <>
      {/* Hero: full-bleed photo, headline, tracking panel */}
      <section className="relative isolate bg-brand-950">
        <Image src={heroImage} alt={t("imageAlt")} fill priority sizes="100vw" className="object-cover object-[60%_50%]" />
        <div
          className="absolute inset-0 bg-gradient-to-b from-brand-950/40 via-brand-950/75 to-brand-950/95 lg:bg-gradient-to-r lg:from-brand-950/90 lg:via-brand-950/55 lg:to-brand-950/0"
          aria-hidden
        />
        <div className="container-page relative grid gap-10 pt-16 pb-24 sm:pt-20 lg:grid-cols-12 lg:items-center lg:pt-24 lg:pb-32">
          <div className="lg:col-span-6">
            <h1 className="font-display text-[40px] leading-[1.02] font-black tracking-[-0.02em] text-balance text-white [font-stretch:110%] sm:text-6xl lg:text-[68px]">
              {content.get("home.hero_title") ?? t("heroTitle")}
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/85 whitespace-pre-line">
              {content.get("home.hero_subtitle") ?? t("heroSubtitle")}
            </p>
          </div>
          <div className="lg:col-span-6 lg:col-start-7 xl:col-span-5 xl:col-start-8">
            <HeroPanel />
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section aria-labelledby="quick-heading" className="relative z-10 -mt-10 sm:-mt-12">
        <div className="container-page">
          <h2 id="quick-heading" className="sr-only">
            {t("quickTitle")}
          </h2>
          <ul className="grid overflow-hidden rounded-lg bg-white shadow-[0_12px_40px_-16px_rgba(11,31,68,0.35)] sm:grid-cols-2 lg:grid-cols-4">
            {quick.map((q, i) => (
              <li key={q.title} className={i > 0 ? "border-t border-slate-100 sm:border-t-0 sm:border-l" : ""}>
                <Link href={q.href} className="group flex h-full gap-4 p-6 transition-colors hover:bg-slate-50">
                  <q.icon className="h-7 w-7 shrink-0 text-signal-600" aria-hidden />
                  <span>
                    <span className="flex items-center gap-1.5 font-bold text-brand-900">
                      {q.title}
                      <ArrowRight className="h-4 w-4 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden />
                    </span>
                    <span className="mt-1 block text-sm leading-snug text-slate-600">{q.text}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Services with photography */}
      {content.isVisible("section.services.visible") && (
        <section className="py-20 lg:py-24" aria-labelledby="services-heading">
          <div className="container-page">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div className="max-w-2xl">
                <h2 id="services-heading" className="font-display text-3xl font-black tracking-[-0.01em] text-brand-900 [font-stretch:108%] sm:text-4xl">
                  {t("servicesTitle")}
                </h2>
                <p className="mt-3 text-lg text-slate-600">{t("servicesSubtitle")}</p>
              </div>
              {services.length > 0 && (
                <Link href="/services" className="inline-flex items-center gap-2 font-bold text-signal-600 hover:text-signal-700">
                  {t("viewAllServices")}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              )}
            </div>
            {services.length > 0 ? (
              <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {services.slice(0, 6).map((s, i) => (
                  <li key={s.id}>
                    <Link href={`/services#${s.slug}`} className="group block h-full overflow-hidden rounded-lg bg-white ring-1 ring-slate-200 transition hover:ring-brand-900/30">
                      <div className="relative aspect-[16/10] overflow-hidden bg-slate-200">
                        <Image
                          src={servicePhoto(s.slug, i)}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                      </div>
                      <div className="p-6">
                        <h3 className="text-lg font-bold text-brand-900">{localized(s.title, locale)}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">{localized(s.description, locale)}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-10 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600">
                {t("servicesEmpty")}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Why Westbridge */}
      <section className="bg-slate-50 py-20 lg:py-24" aria-labelledby="why-heading">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
            <Image src={PHOTOS.warehouse} alt="" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
          </div>
          <div>
            <h2 id="why-heading" className="font-display text-3xl font-black tracking-[-0.01em] text-brand-900 [font-stretch:108%] sm:text-4xl">
              {t("whyTitle")}
            </h2>
            <p className="mt-4 max-w-xl text-lg text-slate-600">{t("whyText")}</p>
            <ul className="mt-8 space-y-6">
              {why.map((w) => (
                <li key={w.title} className="flex gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-brand-900 text-white">
                    <w.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span>
                    <span className="block font-bold text-brand-900">{w.title}</span>
                    <span className="mt-0.5 block text-slate-600">{w.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* How it works (a real sequence, so the steps are numbered) */}
      {content.isVisible("section.how_it_works.visible") && (
        <section className="py-20 lg:py-24" aria-labelledby="how-heading">
          <div className="container-page">
            <h2 id="how-heading" className="font-display text-3xl font-black tracking-[-0.01em] text-brand-900 [font-stretch:108%] sm:text-4xl">
              {t("howTitle")}
            </h2>
            <p className="mt-3 text-lg text-slate-600">{t("howSubtitle")}</p>
            <ol className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              {steps.map((step, i) => (
                <li key={step.title} className="relative border-t-[3px] border-brand-900 pt-6">
                  <span className="font-display text-sm font-black text-signal-600">{i + 1}</span>
                  <step.icon className="mt-3 h-8 w-8 text-brand-900" aria-hidden />
                  <h3 className="mt-4 text-lg font-bold text-brand-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* Customer support band with photo */}
      {content.isVisible("section.support.visible") && (
        <section className="relative isolate overflow-hidden bg-brand-900" aria-labelledby="support-heading">
          <Image src={PHOTOS.courier} alt="" fill sizes="100vw" className="object-cover object-center opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-900 via-brand-900/90 to-brand-900/30" aria-hidden />
          <div className="container-page relative flex flex-col items-start gap-8 py-20 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <h2 id="support-heading" className="font-display text-3xl font-black text-white [font-stretch:108%] sm:text-4xl">
                {t("supportTitle")}
              </h2>
              <p className="mt-4 text-lg text-white/85 whitespace-pre-line">{content.get("support.text") ?? t("supportText")}</p>
            </div>
            <Link href="/contact" className="btn-accent h-13 shrink-0 px-8 text-base">
              {t("supportCta")}
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
