import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";
import { ArrowRight, Clock, Mail, MapPin, PackageSearch, Phone } from "lucide-react";
import { Link } from "@/i18n/navigation";
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

  const email = content.get("contact.email");
  const others = details.filter((d) => d.label !== t("emailLabel"));

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} image={PHOTOS.support} />
      <section className="bg-slate-100 pb-20 lg:pb-24">
        <div className="container-page relative grid gap-6 pt-10 lg:grid-cols-12 lg:gap-8">
          <div className="rounded-2xl bg-white p-6 shadow-[0_24px_60px_-30px_rgba(7,21,47,0.45)] ring-1 ring-slate-200 sm:p-10 lg:col-span-7">
            <h2 className="font-display mb-7 text-2xl font-black text-brand-900 [font-stretch:108%]">{t("formTitle")}</h2>
            <ContactForm />
          </div>

          <aside className="space-y-6 lg:col-span-5">
            <div className="relative overflow-hidden rounded-2xl bg-brand-950 p-7 text-white sm:p-9">
              <div className="pointer-events-none absolute -top-20 -right-20 h-60 w-60 rounded-full bg-white/[0.06]" aria-hidden />
              <span className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-signal-600">
                <Mail className="h-6 w-6" aria-hidden />
              </span>
              <h2 className="font-display relative mt-5 text-2xl font-black [font-stretch:108%]">{email ? t("emailTitle") : t("detailsTitle")}</h2>
              {email ? (
                <>
                  <p className="relative mt-2 text-white/75">{t("emailText")}</p>
                  <a href={`mailto:${email}`} className="relative mt-5 block text-lg font-semibold break-all text-white underline decoration-white/30 underline-offset-4 hover:decoration-white">
                    {email}
                  </a>
                  <a href={`mailto:${email}`} className="btn-accent relative mt-6 h-12 w-full px-6 text-base sm:w-auto">
                    <Mail className="h-5 w-5" aria-hidden />
                    {t("emailCta")}
                  </a>
                </>
              ) : (
                <p className="relative mt-3 text-sm leading-relaxed text-white/75">{t("detailsPending")}</p>
              )}
              {others.length > 0 && (
                <ul className="relative mt-8 space-y-5 border-t border-white/10 pt-7">
                  {others.map((d) => (
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

            <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
              <div className="relative h-40">
                <Image src={PHOTOS.parcels} alt="" fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
              </div>
              <div className="p-7">
                <h2 className="text-lg font-bold text-brand-900">{t("trackTitle")}</h2>
                <p className="mt-1.5 text-slate-600">{t("trackText")}</p>
                <Link href="/track" className="mt-5 inline-flex items-center gap-2 font-bold text-signal-600 hover:text-signal-700">
                  <PackageSearch className="h-5 w-5" aria-hidden />
                  {t("trackCta")}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
