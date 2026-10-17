/** Uppercases and strips spaces/dashes, matching the database's normalize_tracking_number(). */
export function normalizeTrackingNumber(input: string): string {
  return (input ?? "").replace(/[\s-]/g, "").toUpperCase();
}

export function isValidTrackingFormat(normalized: string): boolean {
  return /^[A-Z0-9]{8,24}$/.test(normalized);
}

export const MAX_TRACKING_NUMBERS = 10;

/**
 * Splits input that may hold several tracking numbers (separated by commas,
 * semicolons or new lines), normalises each and drops blanks and duplicates.
 * Spaces inside one number are allowed, so they are not separators.
 */
export function parseTrackingList(input: string): string[] {
  const out: string[] = [];
  for (const part of (input ?? "").split(/[,;\n\r]+/)) {
    const n = normalizeTrackingNumber(part);
    if (n && !out.includes(n)) out.push(n);
  }
  return out;
}
