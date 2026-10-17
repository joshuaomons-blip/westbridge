import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Eye, Headset, ShieldCheck } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { getPageContent } from "@/lib/public-data";
import { paragraphs } from "@/lib/content";
import { pageAlternates } from "@/lib/seo";

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

  return (
    <>
      <PageHero title={content.get("about.title") ?? t("title")} subtitle={t("subtitle")} />
      <section className="py-16 lg:py-20">
        <div className="container-page grid gap-14 lg:grid-cols-12">
          <div className="space-y-5 text-lg leading-relaxed text-slate-700 lg:col-span-7">
            {paragraphs(body).map((p, i) => (
              <p key={i} className="whitespace-pre-line">
                {p}
              </p>
            ))}
          </div>
          <aside className="lg:col-span-5">
            <h2 className="font-display text-2xl font-black text-brand-900 [font-stretch:108%]">{t("valuesTitle")}</h2>
            <ul className="mt-5 space-y-4">
              {values.map((v) => (
                <li key={v.title} className="card flex gap-4 p-5">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-brand-700">
                    <v.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="font-semibold text-brand-900">{v.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{v.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>
    </>
  );
}
