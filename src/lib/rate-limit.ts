import "server-only";
import { createHash } from "crypto";
import { headers } from "next/headers";
import { createPublicClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export const LIMITS = {
  tracking: { max: 30, windowSeconds: 60 },
  contact: { max: 5, windowSeconds: 3600 },
  pickup: { max: 5, windowSeconds: 3600 },
  login: { max: 8, windowSeconds: 900 },
  passwordReset: { max: 3, windowSeconds: 3600 },
} as const;

export async function clientIp(): Promise<string> {
  const h = await headers();
  // On Vercel these headers are set by the platform (client values are overwritten).
  const forwarded = h.get("x-vercel-forwarded-for") ?? h.get("x-real-ip") ?? h.get("x-forwarded-for");
  return (forwarded?.split(",")[0] ?? "unknown").trim();
}

/**
 * Secret salt for hashing visitor identifiers. Uses RATE_LIMIT_SALT, or, when that
 * is not set, a value derived from another server-only secret, so the salt is
 * never public (a public salt would let anyone pre-compute or lock buckets).
 */
function salt(): string {
  const own = process.env.RATE_LIMIT_SALT;
  if (own) return own;
  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.RESEND_API_KEY || "";
  return createHash("sha256").update(`norvane-rate-limit:${fallback}`).digest("hex");
}

/** Salted hash so raw IP addresses are never stored. */
function bucketKey(action: string, identifier: string): string {
  const salt_ = salt();
  return `${action}:${createHash("sha256").update(`${salt_}:${identifier}`).digest("hex").slice(0, 40)}`;
}

/**
 * Returns true if the request may proceed. Fails closed (returns false) when
 * the database cannot be reached, so limits cannot be bypassed by an outage.
 */
export async function checkRateLimit(action: keyof typeof LIMITS, identifier?: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const id = identifier ?? (await clientIp());
  const { max, windowSeconds } = LIMITS[action];
  try {
    const { data, error } = await createPublicClient().rpc("hit_rate_limit", {
      p_key: bucketKey(action, id),
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}
