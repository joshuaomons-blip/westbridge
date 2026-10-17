import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/site/LegalPage";
import { getPageContent } from "@/lib/public-data";
import { pageAlternates } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("privacyTitle"), alternates: pageAlternates(locale, "/privacy") };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("legal");
  const meta = await getTranslations("meta");
  const custom = (await getPageContent(locale)).get("privacy.body");
  return <LegalPage title={meta("privacyTitle")} body={custom ?? t("privacyPlaceholder")} isPlaceholder={!custom} />;
}
