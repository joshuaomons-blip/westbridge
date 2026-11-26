"use server";

import { checkRateLimit } from "@/lib/rate-limit";
import { createPublicClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export type CustomerReceipt = {
  tracking_number: string;
  internal_ref: string | null;
  shipment_type: string;
  shipment_date: string | null;
  estimated_delivery: string | null;
  service: Record<string, string> | null;
  sender: { name: string; city: string; country: string; address: string | null };
  recipient: { name: string; city: string; country: string; address: string | null };
  package_description: string | null;
  package_quantity: number;
  weight_kg: number | null;
  route_stops: string[];
  vehicle: { make: string | null; model: string | null; year: number | null; color: string | null; vin: string | null } | null;
  amount_paid_usdt: number | null;
};

export type ReceiptState =
  | { status: "idle" }
  | { status: "found"; receipt: CustomerReceipt }
  | { status: "error"; error: "not_found" | "rate_limited" | "invalid" | "generic" };

/** Looks up the customer copy of a receipt: tracking number + last 4 digits of the sender's or recipient's phone. */
export async function lookupReceipt(_prev: ReceiptState, formData: FormData): Promise<ReceiptState> {
  const number = String(formData.get("n") ?? "").trim();
  const last4 = String(formData.get("p") ?? "").replace(/\D/g, "");
  if (number.length < 6 || last4.length !== 4) return { status: "error", error: "invalid" };
  if (!isSupabaseConfigured()) return { status: "error", error: "generic" };
  if (!(await checkRateLimit("receipt"))) return { status: "error", error: "rate_limited" };
  const { data, error } = await createPublicClient().rpc("get_customer_receipt", {
    p_tracking_number: number,
    p_phone_last4: last4,
  });
  if (error) return { status: "error", error: "generic" };
  if (!data) return { status: "error", error: "not_found" };
  return { status: "found", receipt: data as CustomerReceipt };
}
