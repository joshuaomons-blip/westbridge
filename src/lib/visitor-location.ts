import "server-only";
import { headers } from "next/headers";

export type VisitorLocation = { country?: string; city?: string };

/**
 * Approximate visitor location from the hosting platform's request headers
 * (Vercel sets these from the IP address). Used only to pre-fill form fields,
 * which the visitor can change; nothing is stored.
 */
export async function visitorLocation(locale: string): Promise<VisitorLocation> {
  const h = await headers();
  const code = h.get("x-vercel-ip-country")?.toUpperCase();
  const rawCity = h.get("x-vercel-ip-city");
  let country: string | undefined;
  if (code && /^[A-Z]{2}$/.test(code)) {
    try {
      country = new Intl.DisplayNames([locale, "en"], { type: "region" }).of(code) ?? undefined;
    } catch {
      country = undefined;
    }
  }
  let city: string | undefined;
  if (rawCity) {
    try {
      city = decodeURIComponent(rawCity).slice(0, 100);
    } catch {
      city = undefined;
    }
  }
  return { country, city };
}
