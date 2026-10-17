const intlLocale: Record<string, string> = {
  en: "en-GB",
  pl: "pl-PL",
  ja: "ja-JP",
  es: "es-ES",
  de: "de-DE",
};

export function formatDate(value: string | null | undefined, locale = "en"): string {
  if (!value) return "—";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + "T00:00:00Z") : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(intlLocale[locale] ?? locale, { dateStyle: "medium", timeZone: "UTC" }).format(d);
}

export function formatDateTime(value: string | null | undefined, locale = "en"): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(intlLocale[locale] ?? locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(d) + " UTC";
}

export function formatTime(value: string, locale = "en"): string {
  const d = new Date(value);
  return new Intl.DateTimeFormat(intlLocale[locale] ?? locale, { timeStyle: "short", timeZone: "UTC" }).format(d);
}

/** Value for <input type="datetime-local"> in UTC. */
export function toDateTimeLocal(value: string | Date = new Date()): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toISOString().slice(0, 16);
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
