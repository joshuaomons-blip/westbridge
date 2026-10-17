import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PageHero } from "@/components/site/PageHero";
import { ServiceIcon } from "@/components/site/ServiceIcon";
import { getPublishedServices, localized } from "@/lib/public-data";
import { pageAlternates } from "@/lib/seo";

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
              {services.map((s) => (
                <li key={s.id} id={s.slug} className="card flex gap-5 p-7 sm:p-8">
                  <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-navy-800 text-white">
                    <ServiceIcon name={s.icon} className="h-7 w-7" />
                  </span>
                  <div>
                    <h2 className="text-xl font-semibold text-navy-900">{localized(s.title, locale)}</h2>
                    <p className="mt-2 leading-relaxed text-slate-600 whitespace-pre-line">{localized(s.description, locale)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-14 flex flex-col items-start justify-between gap-6 rounded-2xl bg-slate-50 p-8 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-semibold text-navy-900">{t("cta")}</h2>
              <p className="mt-1 text-slate-600">{t("ctaText")}</p>
            </div>
            <Link href="/contact" className="btn-primary px-6 py-3">
              {t("cta")}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
