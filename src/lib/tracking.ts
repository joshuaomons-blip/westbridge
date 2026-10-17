import "server-only";
import { createPublicClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { normalizeTrackingNumber, isValidTrackingFormat } from "@/lib/tracking-format";

export type PublicTrackingEvent = {
  status: string;
  occurred_at: string;
  location: string | null;
  description: string | null;
};

export type PublicTracking = {
  tracking_number: string;
  status: string;
  shipment_type: string;
  created_at: string;
  last_update: string;
  origin: { city: string; country: string };
  destination: { city: string; country: string };
  estimated_delivery: string | null;
  package_quantity: number;
  service: { slug: string; title: Record<string, string> } | null;
  route_stops?: string[] | null;
  is_demo: boolean;
  events: PublicTrackingEvent[];
};

export type TrackingResult =
  | { kind: "found"; data: PublicTracking }
  | { kind: "invalid" }
  | { kind: "not_found" }
  | { kind: "unavailable" };

/** Looks up a shipment. Never invents data: unknown numbers return "not_found". */
export async function lookupTracking(input: string): Promise<TrackingResult> {
  const number = normalizeTrackingNumber(input);
  if (!isValidTrackingFormat(number)) return { kind: "invalid" };
  if (!isSupabaseConfigured()) return { kind: "unavailable" };
  try {
    const { data, error } = await createPublicClient().rpc("get_public_tracking", { p_tracking_number: number });
    if (error) {
      console.error("tracking lookup failed", error.code);
      return { kind: "unavailable" };
    }
    if (!data) return { kind: "not_found" };
    return { kind: "found", data: data as PublicTracking };
  } catch (e) {
    console.error("tracking lookup error", e instanceof Error ? e.message : "unknown");
    return { kind: "unavailable" };
  }
}
