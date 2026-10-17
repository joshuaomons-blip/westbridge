import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";
import { Eye, Headset, Mail, ShieldCheck } from "lucide-react";
import { PHOTOS } from "@/lib/photos";
import { PageHero } from "@/components/site/PageHero";
import { getPageContent } from "@/lib/public-data";
import { paragraphs } from "@/lib/content";
import { pageAlternates } from "@/lib/seo";
import { supportHref } from "@/lib/support";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("aboutTitle"), description: t("aboutDescription"), alternates: pageAlternates(locale, "/about") };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");
  const content = await getPageContent(locale);
  const body = content.get("about.body") ?? t("placeholderBody");

  const values = [
    { icon: ShieldCheck, title: t("value1Title"), text: t("value1Text") },
    { icon: Eye, title: t("value2Title"), text: t("value2Text") },
    { icon: Headset, title: t("value3Title"), text: t("value3Text") },
  ];

  const supportLink = supportHref(content.get("contact.email"));
  const strip = [PHOTOS.road, PHOTOS.air, PHOTOS.handover];

  return (
    <>
      <PageHero title={content.get("about.title") ?? t("title")} subtitle={t("subtitle")} image={PHOTOS.team} />

      <section className="py-20 lg:py-28">
        <div className="container-page grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <h2 className="h-section text-brand-900">{t("storyTitle")}</h2>
            <div className="mt-6 space-y-5 text-lg leading-relaxed text-slate-700">
              {paragraphs(body).map((p, i) => (
                <p key={i} className="whitespace-pre-line">
                  {p}
                </p>
              ))}
            </div>
          </div>
          <div className="reveal relative isolate lg:col-span-5">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-slate-200">
              <Image src={PHOTOS.warehouse} alt="" fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
            </div>
            <div className="absolute -bottom-4 -left-4 -z-10 h-full w-full rounded-2xl bg-signal-600/90" aria-hidden />
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-20 lg:py-24" aria-labelledby="values-heading">
        <div className="container-page">
          <h2 id="values-heading" className="h-section text-brand-900">
            {t("valuesTitle")}
          </h2>
          <ul className="mt-12 grid gap-6 md:grid-cols-3">
            {values.map((v) => (
              <li key={v.title} className="reveal rounded-2xl bg-white p-8 ring-1 ring-slate-200">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-900 text-white">
                  <v.icon className="h-7 w-7" aria-hidden />
                </span>
                <h3 className="mt-6 text-xl font-bold text-brand-900">{v.title}</h3>
                <p className="mt-2 leading-relaxed text-slate-600">{v.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-hidden className="grid grid-cols-3 gap-1 bg-white">
        {strip.map((src) => (
          <div key={src} className="relative aspect-[4/3] sm:aspect-[16/10]">
            <Image src={src} alt="" fill sizes="33vw" className="object-cover" />
          </div>
        ))}
      </section>

      <section className="bg-brand-900 text-white" aria-labelledby="about-cta">
        <div className="container-page flex flex-col items-start gap-8 py-16 lg:flex-row lg:items-center lg:justify-between lg:py-20">
          <div className="max-w-xl">
            <h2 id="about-cta" className="h-section text-white">
              {t("ctaTitle")}
            </h2>
            <p className="mt-4 text-lg text-white/80">{t("ctaText")}</p>
          </div>
          <a href={supportLink ?? `/${locale}/contact`} className="btn-accent h-13 shrink-0 px-8 text-base">
            <Mail className="h-5 w-5" aria-hidden />
            {t("ctaButton")}
          </a>
        </div>
      </section>
    </>
  );
}
