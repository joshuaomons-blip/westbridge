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

function parseDay(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + "T00:00:00Z") : new Date(value);
}

/** "Friday, 16 October 2026" in the page language (UTC). */
export function formatDayHeading(value: string, locale = "en"): string {
  const d = parseDay(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(intlLocale[locale] ?? locale, { dateStyle: "full", timeZone: "UTC" }).format(d);
}

/** Weekday and date as separate parts, for the large delivery-date block. */
export function formatDateParts(value: string, locale = "en"): { weekday: string; date: string } {
  const d = parseDay(value);
  const loc = intlLocale[locale] ?? locale;
  return {
    weekday: new Intl.DateTimeFormat(loc, { weekday: "long", timeZone: "UTC" }).format(d),
    date: new Intl.DateTimeFormat(loc, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d),
  };
}

/** UTC calendar day key (YYYY-MM-DD) used to group timeline events. */
export function dayKey(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
}

/** "3 hours ago" style text in the page language, relative to `now`. */
export function formatRelative(value: string, locale = "en", now: Date = new Date()): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const seconds = Math.round((d.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(seconds);
  const rtf = new Intl.RelativeTimeFormat(intlLocale[locale] ?? locale, { numeric: "auto" });
  if (abs < 60) return rtf.format(0, "second");
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(seconds / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(Math.round(seconds / (86400 * 30)), "month");
  return rtf.format(Math.round(seconds / (86400 * 365)), "year");
}
