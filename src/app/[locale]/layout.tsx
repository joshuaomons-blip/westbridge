import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Inter, Manrope, Noto_Sans_JP } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing, locales } from "@/i18n/routing";
import { env } from "@/lib/env";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { CookieNotice } from "@/components/site/CookieNotice";
import { DemoBanner, PreviewBanner } from "@/components/site/Banners";
import { getPageContent, getPublicSettings } from "@/lib/public-data";
import "../globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });
const manrope = Manrope({ subsets: ["latin", "latin-ext"], variable: "--font-display-face", display: "swap" });
const notoJp = Noto_Sans_JP({
  weight: ["400", "500", "700"],
  variable: "--font-noto-jp",
  display: "swap",
  preload: false,
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: "#172850",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(env.siteUrl),
    title: { default: `${t("siteName")} — ${t("homeTitle")}`, template: `%s | ${t("siteName")}` },
    description: t("homeDescription"),
    applicationName: t("siteName"),
    openGraph: { siteName: t("siteName"), type: "website", locale },
    icons: { icon: "/icon.svg" },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const [content, settings] = await Promise.all([getPageContent(locale), getPublicSettings()]);

  return (
    <html lang={locale} className={`${inter.variable} ${manrope.variable} ${notoJp.variable}`}>
      <body className="flex min-h-screen flex-col">
        <NextIntlClientProvider>
          {content.preview && <PreviewBanner />}
          {settings.demo_mode && <DemoBanner />}
          <Header />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer content={content} />
          <CookieNotice />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
