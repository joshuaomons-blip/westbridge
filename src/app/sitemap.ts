import type { MetadataRoute } from "next";
import { locales } from "@/i18n/routing";
import { env } from "@/lib/env";

const PAGES = ["", "/track", "/services", "/about", "/contact", "/privacy", "/terms"];

/** Public pages only — never admin pages or individual tracking lookups. */
export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.flatMap((page) =>
    locales.map((locale) => ({
      url: `${env.siteUrl}/${locale}${page}`,
      changeFrequency: page === "" ? "weekly" : "monthly",
      priority: page === "" ? 1 : 0.7,
      alternates: {
        languages: Object.fromEntries(locales.map((l) => [l, `${env.siteUrl}/${l}${page}`])),
      },
    })),
  );
}
