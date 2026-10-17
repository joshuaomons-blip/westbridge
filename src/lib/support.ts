/** Link for support buttons: an email to the published support address, or the contact page if none is set. */
export function supportHref(email: string | null | undefined, subject?: string): string | null {
  if (!email || !/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(email)) return null;
  return `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
}
