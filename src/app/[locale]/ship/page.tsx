import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClipboardCheck, Mail, MessageCircle, PackageCheck, Truck } from "lucide-react";
import { PHOTOS } from "@/lib/photos";
import { PageHero } from "@/components/site/PageHero";
import { PickupForm } from "@/components/site/PickupForm";
import { getPageContent, getPublishedServices, localized } from "@/lib/public-data";
import { pageAlternates } from "@/lib/seo";
import { whatsappHref } from "@/lib/support";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("pickupTitle"), description: t("pickupDescription"), alternates: pageAlternates(locale, "/ship") };
}

export default async function ShipPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pickup");
  const [content, services] = await Promise.all([getPageContent(locale), getPublishedServices()]);
  const email = content.get("contact.email");
  const wa = whatsappHref(content.get("contact.whatsapp"));
  const steps = [
    { icon: ClipboardCheck, text: t("side1") },
    { icon: Truck, text: t("side2") },
    { icon: PackageCheck, text: t("side3") },
  ];

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} image={PHOTOS.handover} />
      <section className="bg-slate-100 pb-20 lg:pb-24">
        <div className="container-page grid gap-6 pt-10 lg:grid-cols-12 lg:gap-8">
          <div className="rounded-2xl bg-white p-6 shadow-[0_24px_60px_-30px_rgba(7,21,47,0.45)] ring-1 ring-slate-200 sm:p-10 lg:col-span-8">
            <h2 className="font-display mb-8 text-2xl font-black text-brand-900 [font-stretch:108%]">{t("formTitle")}</h2>
            <PickupForm services={services.map((s) => localized(s.title, locale)).filter(Boolean)} />
          </div>
          <aside className="space-y-6 lg:col-span-4">
            <div className="rounded-2xl bg-brand-950 p-7 text-white">
              <h2 className="font-display text-xl font-black [font-stretch:108%]">{t("sideTitle")}</h2>
              <ol className="mt-6 space-y-5">
                {steps.map(({ icon: Icon, text }, i) => (
                  <li key={text} className="flex gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <p className="pt-2 text-white/85">
                      <span className="mr-1 font-bold text-white">{i + 1}.</span>
                      {text}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
            {(wa || email) && (
              <div className="space-y-3 rounded-2xl bg-white p-7 ring-1 ring-slate-200">
                {wa && (
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#1DA851] px-5 font-semibold text-white transition hover:bg-[#178a43]">
                    <MessageCircle className="h-5 w-5" aria-hidden />
                    {t("whatsapp")}
                  </a>
                )}
                {email && (
                  <a href={`mailto:${email}`} className="btn-outline h-12 w-full">
                    <Mail className="h-5 w-5" aria-hidden />
                    {email}
                  </a>
                )}
              </div>
            )}
          </aside>
        </div>
      </section>
    </>
  );
}
