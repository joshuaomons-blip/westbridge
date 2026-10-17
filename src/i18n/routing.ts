import { defineRouting } from "next-intl/routing";

export const locales = ["en", "pl", "ja", "es", "de"] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, { label: string; short: string }> = {
  en: { label: "English", short: "EN" },
  pl: { label: "Polski", short: "PL" },
  ja: { label: "日本語", short: "JA" },
  es: { label: "Español", short: "ES" },
  de: { label: "Deutsch", short: "DE" },
};

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  localePrefix: "always",
});

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}
