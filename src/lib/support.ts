/** Link for support buttons: an email to the published support address, or the contact page if none is set. */
export function supportHref(email: string | null | undefined, subject?: string): string | null {
  if (!email || !/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(email)) return null;
  return `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
}

/** wa.me link from a phone number in any common format ("+234 801 234 5678"), or null. */
export function whatsappHref(phone: string | null | undefined, text?: string): string | null {
  const digits = (phone ?? "").replace(/[^\d]/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

const SOCIAL_HOSTS: Record<string, RegExp> = {
  instagram: /(^|\.)instagram\.com$/,
  facebook: /(^|\.)(facebook\.com|fb\.com)$/,
  linkedin: /(^|\.)linkedin\.com$/,
  tiktok: /(^|\.)tiktok\.com$/,
  x: /(^|\.)(x\.com|twitter\.com)$/,
};

/** Only allows https links to the matching social network (protects against odd links being published). */
export function safeSocialUrl(network: keyof typeof SOCIAL_HOSTS, url: string | null | undefined): string | null {
  try {
    const u = new URL((url ?? "").trim());
    return u.protocol === "https:" && SOCIAL_HOSTS[network].test(u.hostname) ? u.toString() : null;
  } catch {
    return null;
  }
}
