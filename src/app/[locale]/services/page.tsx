import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PageHero } from "@/components/site/PageHero";
import { ServiceIcon } from "@/components/site/ServiceIcon";
import { getPublishedServices, localized } from "@/lib/public-data";
import { pageAlternates } from "@/lib/seo";
import { servicePhoto } from "@/lib/photos";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("servicesTitle"), description: t("servicesDescription"), alternates: pageAlternates(locale, "/services") };
}

export default async function ServicesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("services");
  const services = await getPublishedServices();

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} />
      <section className="py-16 lg:py-20">
        <div className="container-page">
          {services.length === 0 ? (
            <p className="mx-auto max-w-2xl rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-600">
              {t("empty")}
            </p>
          ) : (
            <ul className="grid gap-6 md:grid-cols-2">
              {services.map((s, i) => (
                <li key={s.id} id={s.slug} className="scroll-mt-28 overflow-hidden rounded-lg bg-white ring-1 ring-slate-200 sm:grid sm:grid-cols-5">
                  <div className="relative aspect-[16/9] bg-slate-200 sm:col-span-2 sm:aspect-auto">
                    <Image src={servicePhoto(s.slug, i)} alt="" fill sizes="(min-width: 768px) 20vw, 100vw" className="object-cover" />
                  </div>
                  <div className="p-6 sm:col-span-3 sm:p-7">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-brand-900 text-white">
                      <ServiceIcon name={s.icon} className="h-5 w-5" />
                    </span>
                    <h2 className="mt-4 text-xl font-bold text-brand-900">{localized(s.title, locale)}</h2>
                    <p className="mt-2 leading-relaxed text-slate-600 whitespace-pre-line">{localized(s.description, locale)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-14 flex flex-col items-start justify-between gap-6 rounded-lg bg-brand-900 p-8 text-white sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold">{t("cta")}</h2>
              <p className="mt-1 text-white/75">{t("ctaText")}</p>
            </div>
            <Link href="/contact" className="btn-accent px-6 py-3">
              {t("cta")}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
