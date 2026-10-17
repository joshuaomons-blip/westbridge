import "server-only";
import { createHash } from "crypto";
import { headers } from "next/headers";
import { createPublicClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export const LIMITS = {
  tracking: { max: 30, windowSeconds: 60 },
  contact: { max: 5, windowSeconds: 3600 },
  login: { max: 8, windowSeconds: 900 },
  passwordReset: { max: 3, windowSeconds: 3600 },
} as const;

export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return (forwarded?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
}

/** Salted hash so raw IP addresses are never stored. */
function bucketKey(action: string, identifier: string): string {
  const salt = process.env.RATE_LIMIT_SALT || "wb-7f3c1e9a52d84b06a1c3e5f7092b4d6e";
  return `${action}:${createHash("sha256").update(`${salt}:${identifier}`).digest("hex").slice(0, 40)}`;
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
