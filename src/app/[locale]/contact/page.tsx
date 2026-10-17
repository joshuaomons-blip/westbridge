import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { PHOTOS } from "@/lib/photos";
import { PageHero } from "@/components/site/PageHero";
import { ContactForm } from "@/components/site/ContactForm";
import { getPageContent } from "@/lib/public-data";
import { pageAlternates } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("contactTitle"), description: t("contactDescription"), alternates: pageAlternates(locale, "/contact") };
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contact");
  const content = await getPageContent(locale);

  // Only verified details entered by an administrator are shown — nothing is invented.
  const details = [
    { icon: Phone, label: t("phone"), value: content.get("contact.phone"), href: (v: string) => `tel:${v.replace(/[^\d+]/g, "")}` },
    { icon: Mail, label: t("emailLabel"), value: content.get("contact.email"), href: (v: string) => `mailto:${v}` },
    { icon: MapPin, label: t("address"), value: content.get("contact.address") },
    { icon: Clock, label: t("hours"), value: content.get("contact.hours") },
  ].filter((d) => d.value);

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} image={PHOTOS.support} />
      <section className="py-16 lg:py-20">
        <div className="container-page grid gap-10 lg:grid-cols-12">
          <div className="card p-6 sm:p-10 lg:col-span-8">
            <h2 className="mb-6 text-xl font-semibold text-brand-900">{t("formTitle")}</h2>
            <ContactForm />
          </div>
          <aside className="lg:col-span-4">
            <div className="rounded-xl bg-brand-900 p-7 text-white">
              <h2 className="text-lg font-semibold">{t("detailsTitle")}</h2>
              {details.length === 0 ? (
                <p className="mt-4 text-sm leading-relaxed text-navy-200">{t("detailsPending")}</p>
              ) : (
                <ul className="mt-6 space-y-5">
                  {details.map((d) => (
                    <li key={d.label} className="flex gap-3.5">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                        <d.icon className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white/60">{d.label}</p>
                        {d.href ? (
                          <a href={d.href(d.value!)} className="mt-0.5 block break-words text-white hover:underline">
                            {d.value}
                          </a>
                        ) : (
                          <p className="mt-0.5 break-words whitespace-pre-line text-white">{d.value}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
