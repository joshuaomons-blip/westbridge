import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/site/PageHero";
import { CustomerReceipt } from "@/components/site/CustomerReceipt";
import { PHOTOS } from "@/lib/photos";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ n?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "receipt" });
  return { title: t("pageTitle"), robots: { index: false } };
}

export default async function ReceiptPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { n } = await searchParams;
  const t = await getTranslations("receipt");
  const initialNumber = typeof n === "string" ? n.slice(0, 40).replace(/[^A-Za-z0-9-\s]/g, "") : undefined;

  return (
    <>
      <div className="print:hidden">
        <PageHero title={t("pageTitle")} subtitle={t("pageSubtitle")} image={PHOTOS.parcels} />
      </div>
      <section className="bg-slate-100 py-10 pb-20 lg:pb-24 print:bg-white print:p-0">
        <div className="container-page max-w-4xl">
          <CustomerReceipt initialNumber={initialNumber} />
        </div>
      </section>
    </>
  );
}
