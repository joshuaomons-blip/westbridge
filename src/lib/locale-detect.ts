import { locales, type Locale } from "@/i18n/routing";

/** Countries (ISO codes) whose main language is one the site supports. Everything else gets English. */
const COUNTRY_LOCALE: Record<string, Locale> = {
  PL: "pl",
  JP: "ja",
  DE: "de", AT: "de", CH: "de", LI: "de",
  ES: "es", MX: "es", AR: "es", CO: "es", CL: "es", PE: "es", VE: "es", EC: "es", GT: "es", CU: "es",
  BO: "es", DO: "es", HN: "es", PY: "es", SV: "es", NI: "es", CR: "es", PA: "es", UY: "es", PR: "es", GQ: "es",
};

/** Supported languages from an Accept-Language header, best first. */
export function browserLocales(header: string | null | undefined): Locale[] {
  return (header ?? "")
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { lang: tag.trim().toLowerCase().split("-")[0], q: q ? Number(q.split("=")[1]) || 0 : 1 };
    })
    .filter((x) => x.lang && x.q > 0)
    .sort((a, b) => b.q - a.q)
    .map((x) => x.lang)
    .filter((l, i, all): l is Locale => (locales as readonly string[]).includes(l) && all.indexOf(l) === i);
}

/**
 * Picks the language for a first visit:
 * 1. a non-English device language we support (a Polish phone gets Polish anywhere),
 * 2. otherwise the visitor's country (someone in Spain with an English phone gets Spanish),
 * 3. otherwise English.
 */
export function detectLocale(acceptLanguage: string | null | undefined, country: string | null | undefined): Locale {
  const fromBrowser = browserLocales(acceptLanguage);
  const nonEnglish = fromBrowser.find((l) => l !== "en");
  if (nonEnglish) return nonEnglish;
  const fromCountry = country ? COUNTRY_LOCALE[country.toUpperCase()] : undefined;
  return fromCountry ?? "en";
}
