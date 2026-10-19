"use server";

import { contactSchema } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";
import { createPublicClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { isLocale } from "@/i18n/routing";

export type ContactState =
  | { status: "idle" }
  | { status: "success"; reference: string }
  | { status: "error"; error: "generic" | "rate_limited" | "invalid"; fields?: Record<string, string> };

const MIN_FILL_MS = 2500;

export async function submitContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  // Spam protection 1: hidden honeypot field must stay empty.
  if (String(formData.get("company_website") ?? "").length > 0) {
    return { status: "success", reference: "—" }; // silently accept bots
  }
  // Spam protection 2: humans take a moment to fill the form.
  const started = Number(formData.get("started_at"));
  if (!Number.isFinite(started) || Date.now() - started < MIN_FILL_MS) {
    return { status: "error", error: "generic" };
  }

  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[String(issue.path[0])] ??= issue.message;
    return { status: "error", error: "invalid", fields };
  }

  if (!isSupabaseConfigured()) return { status: "error", error: "generic" };

  // Spam protection 3: rate limit per visitor.
  if (!(await checkRateLimit("contact"))) return { status: "error", error: "rate_limited" };

  const rawLocale = String(formData.get("locale") ?? "en");
  const locale = isLocale(rawLocale) ? rawLocale : "en";
  const { data, error } = await createPublicClient().rpc("submit_contact_inquiry", {
    p_name: parsed.data.name,
    p_email: parsed.data.email,
    p_subject: parsed.data.subject,
    p_message: parsed.data.message,
    p_locale: locale,
  });
  if (error || typeof data !== "string") {
    console.error("contact submission failed", error?.code);
    return { status: "error", error: "generic" };
  }
  return { status: "success", reference: data };
}
