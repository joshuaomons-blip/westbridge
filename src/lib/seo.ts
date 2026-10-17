import type { Metadata } from "next";
import { locales } from "@/i18n/routing";
import { env } from "@/lib/env";

/** Canonical + hreflang alternates for a public page path like "/services". */
export function pageAlternates(locale: string, path: string): Metadata["alternates"] {
  const clean = path === "/" ? "" : path;
  return {
    canonical: `${env.siteUrl}/${locale}${clean}`,
    languages: {
      ...Object.fromEntries(locales.map((l) => [l, `${env.siteUrl}/${l}${clean}`])),
      "x-default": `${env.siteUrl}/en${clean}`,
    },
  };
}
