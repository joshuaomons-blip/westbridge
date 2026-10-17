/** Uppercases and strips spaces/dashes, matching the database's normalize_tracking_number(). */
export function normalizeTrackingNumber(input: string): string {
  return (input ?? "").replace(/[\s-]/g, "").toUpperCase();
}

export function isValidTrackingFormat(normalized: string): boolean {
  return /^[A-Z0-9]{8,24}$/.test(normalized);
}
