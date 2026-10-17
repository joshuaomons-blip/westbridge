"use server";

import { pickupSchema, type PickupInput } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";
import { createPublicClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { getSiteContent } from "@/lib/content";
import { sendEmail } from "@/lib/email/send";
import { escapeHtml } from "@/lib/email/shipment-template";

export type PickupState =
  | { status: "idle" }
  | { status: "success"; reference: string }
  | { status: "error"; error: "generic" | "rate_limited" | "invalid"; fields?: Record<string, string> };

const MIN_FILL_MS = 3000;
const FIELDS = [
  "name", "email", "phone", "pickup_city", "pickup_address", "pickup_date",
  "dest_country", "dest_city", "shipment_type", "packages", "weight", "service", "notes",
] as const;

/** Readable summary stored as the inquiry message and used in the notification email. */
function pickupSummary(p: PickupInput): [string, string][] {
  return [
    ["Name", p.name],
    ["Email", p.email],
    ["Phone / WhatsApp", p.phone],
    ["Pickup", [p.pickup_address, p.pickup_city].filter(Boolean).join(", ")],
    ["Preferred pickup date", p.pickup_date ?? "—"],
    ["Destination", `${p.dest_city}, ${p.dest_country}`],
    ["Shipment type", p.shipment_type],
    ["Packages", String(p.packages)],
    ["Approx. weight (kg)", p.weight !== undefined ? String(p.weight) : "—"],
    ["Service", p.service ?? "Not sure"],
    ["Notes", p.notes ?? "—"],
  ];
}

export async function submitPickup(_prev: PickupState, formData: FormData): Promise<PickupState> {
  // Spam protection: honeypot, minimum fill time, rate limit.
  if (String(formData.get("company_website") ?? "").length > 0) return { status: "success", reference: "—" };
  const started = Number(formData.get("started_at"));
  if (!Number.isFinite(started) || Date.now() - started < MIN_FILL_MS) return { status: "error", error: "generic" };

  const raw: Record<string, string> = {};
  for (const f of FIELDS) {
    const v = formData.get(f);
    if (typeof v === "string") raw[f] = v;
  }
  const parsed = pickupSchema.safeParse(raw);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[String(issue.path[0])] ??= issue.message;
    return { status: "error", error: "invalid", fields };
  }
  if (!isSupabaseConfigured()) return { status: "error", error: "generic" };
  if (!(await checkRateLimit("pickup"))) return { status: "error", error: "rate_limited" };

  const p = parsed.data;
  const locale = String(formData.get("locale") ?? "en");
  const rows = pickupSummary(p);
  const subject = `Pickup request: ${p.pickup_city} → ${p.dest_city}, ${p.dest_country}`.slice(0, 200);
  const message = rows.map(([k, v]) => `${k}: ${v}`).join("\n");

  const { data, error } = await createPublicClient().rpc("submit_pickup_request", {
    p_name: p.name,
    p_email: p.email,
    p_phone: p.phone,
    p_subject: subject,
    p_message: message,
    p_locale: locale,
  });
  if (error || typeof data !== "string") {
    console.error("pickup submission failed", error?.code);
    return { status: "error", error: "generic" };
  }

  // Notify the company inbox (skipped quietly if email sending isn't set up).
  try {
    const content = await getSiteContent("en", false);
    const to = content.get("contact.email");
    if (to) {
      const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#0F172A">
<h2 style="margin:0 0 4px;color:#0B1F44">New pickup request</h2>
<p style="margin:0 0 16px;color:#64748B">Reference ${escapeHtml(data)}</p>
<table cellpadding="6" style="border-collapse:collapse">${rows
        .map(([k, v]) => `<tr><td style="color:#64748B;vertical-align:top">${escapeHtml(k)}</td><td style="font-weight:600">${escapeHtml(v)}</td></tr>`)
        .join("")}</table>
<p style="margin-top:16px;color:#64748B">Reply to this email to answer the customer directly. It is also in Dashboard → Inquiries.</p></div>`;
      await sendEmail({
        to,
        subject: `[${data}] ${subject}`,
        html,
        text: `New pickup request ${data}\n\n${message}`,
        replyTo: p.email,
        idempotencyKey: `pickup:${data}`,
      });
    }
  } catch {
    // The request is saved either way; email is a convenience.
  }
  return { status: "success", reference: data };
}
