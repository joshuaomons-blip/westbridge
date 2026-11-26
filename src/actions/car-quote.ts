"use server";

import { carQuoteSchema, type CarQuoteInput } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";
import { createPublicClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { isLocale } from "@/i18n/routing";
import { getSiteContent } from "@/lib/content";
import { sendEmail } from "@/lib/email/send";
import { escapeHtml } from "@/lib/email/shipment-template";

export type CarQuoteState =
  | { status: "idle" }
  | { status: "success"; reference: string }
  | { status: "error"; error: "generic" | "rate_limited" | "invalid"; fields?: Record<string, string> };

const MIN_FILL_MS = 3000;
const FIELDS = [
  "name", "email", "phone", "make", "model", "year", "condition",
  "pickup_country", "pickup_city", "dest_country", "dest_city", "method", "ready_date", "notes",
] as const;

const METHOD: Record<CarQuoteInput["method"], string> = {
  door_to_port: "Door-to-port",
  port_to_port: "Port-to-port",
  unsure: "Not sure",
};

function summary(p: CarQuoteInput): [string, string][] {
  return [
    ["Name", p.name],
    ["Email", p.email],
    ["Phone / WhatsApp", p.phone],
    ["Vehicle", [p.year, p.make, p.model].filter(Boolean).join(" ")],
    ["Condition", p.condition === "runs" ? "Runs and drives" : "Does not run"],
    ["From", `${p.pickup_city}, ${p.pickup_country}`],
    ["To", `${p.dest_city}, ${p.dest_country}`],
    ["Shipping method", METHOD[p.method]],
    ["Vehicle ready from", p.ready_date ?? "—"],
    ["Notes", p.notes ?? "—"],
  ];
}

/** Car shipping quote requests land in Dashboard → Inquiries (as pickup requests) and the company inbox. */
export async function submitCarQuote(_prev: CarQuoteState, formData: FormData): Promise<CarQuoteState> {
  if (String(formData.get("company_website") ?? "").length > 0) return { status: "success", reference: "—" };
  const started = Number(formData.get("started_at"));
  if (!Number.isFinite(started) || Date.now() - started < MIN_FILL_MS) return { status: "error", error: "generic" };

  const raw: Record<string, string> = {};
  for (const f of FIELDS) {
    const v = formData.get(f);
    if (typeof v === "string") raw[f] = v;
  }
  const parsed = carQuoteSchema.safeParse(raw);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[String(issue.path[0])] ??= issue.message;
    return { status: "error", error: "invalid", fields };
  }
  if (!isSupabaseConfigured()) return { status: "error", error: "generic" };
  if (!(await checkRateLimit("carQuote"))) return { status: "error", error: "rate_limited" };

  const p = parsed.data;
  const rawLocale = String(formData.get("locale") ?? "en");
  const locale = isLocale(rawLocale) ? rawLocale : "en";
  const rows = summary(p);
  const vehicle = [p.year, p.make, p.model].filter(Boolean).join(" ");
  const subject = `Car shipping quote: ${vehicle}, ${p.pickup_city} → ${p.dest_city}, ${p.dest_country}`.replace(/[\r\n]+/g, " ").slice(0, 200);
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
    console.error("car quote submission failed", error?.code);
    return { status: "error", error: "generic" };
  }

  try {
    const content = await getSiteContent("en", false);
    const to = content.get("contact.email");
    if (to) {
      const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#0F172A">
<h2 style="margin:0 0 4px;color:#0B1F44">New car shipping quote request</h2>
<p style="margin:0 0 16px;color:#64748B">Reference ${escapeHtml(data)}</p>
<table cellpadding="6" style="border-collapse:collapse">${rows
        .map(([k, v]) => `<tr><td style="color:#64748B;vertical-align:top">${escapeHtml(k)}</td><td style="font-weight:600">${escapeHtml(v)}</td></tr>`)
        .join("")}</table>
<p style="margin-top:16px;color:#64748B">Reply to this email to answer the customer directly. It is also in Dashboard → Inquiries.</p></div>`;
      await sendEmail({
        to,
        subject: `[${data}] ${subject}`,
        html,
        text: `New car shipping quote request ${data}\n\n${message}`,
        replyTo: p.email,
        idempotencyKey: `carquote:${data}`,
      });
    }
  } catch {
    // Saved either way; the email is a convenience.
  }
  return { status: "success", reference: data };
}
