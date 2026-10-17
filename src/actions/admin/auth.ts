"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/server";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { env, isSupabaseConfigured } from "@/lib/env";
import { passwordSchema } from "@/lib/validation";
import type { ActionResult } from "./_util";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254),
  password: z.string().min(1, "Enter your password").max(128),
});

export async function signIn(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { error: "The website is not connected to Supabase yet (see README)." };
  const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return { error: "Enter your email address and password." };

  const ip = await clientIp();
  const allowed =
    (await checkRateLimit("login", `ip:${ip}`)) && (await checkRateLimit("login", `email:${parsed.data.email}`));
  if (!allowed) return { error: "Too many sign-in attempts. Please wait 15 minutes and try again." };

  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  // Same message for unknown email and wrong password.
  if (error) return { error: "Incorrect email or password." };

  const { data: ctx } = await supabase.rpc("my_admin_context");
  if (!ctx) {
    await supabase.auth.signOut();
    return { error: "This account does not have active administrator access." };
  }
  await supabase.rpc("write_audit_event", { p_action: "auth.sign_in", p_summary: "Signed in" });

  const next = String(fd.get("next") ?? "");
  redirect(next.startsWith("/admin/") && !next.startsWith("//") ? next : "/admin/dashboard");
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createSessionClient();
    await supabase.rpc("write_audit_event", { p_action: "auth.sign_out", p_summary: "Signed out" });
    await supabase.auth.signOut();
  }
  redirect("/admin/login?signed_out=1");
}

export async function requestPasswordReset(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const email = z.string().trim().toLowerCase().email().max(254).safeParse(fd.get("email"));
  if (!email.success) return { error: "Enter a valid email address." };
  if (!isSupabaseConfigured()) return { error: "The website is not connected to Supabase yet." };

  const ip = await clientIp();
  if (!(await checkRateLimit("passwordReset", `ip:${ip}`)) || !(await checkRateLimit("passwordReset", `email:${email.data}`))) {
    return { error: "Too many requests. Please try again later." };
  }
  const supabase = await createSessionClient();
  await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${env.siteUrl}/admin/auth/callback?next=/admin/update-password`,
  });
  // Always the same response, so the form can't be used to discover accounts.
  return { ok: true, message: "If an administrator account exists for this email, a reset link has been sent." };
}

export async function updatePassword(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return { fields: { password: parsed.error.issues[0].message } };
  if (password !== confirm) return { fields: { confirm: "The passwords do not match." } };

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your reset link has expired. Please request a new one." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message.includes("different") ? "Choose a password you haven't used before." : "The password could not be updated." };
  await supabase.rpc("write_audit_event", { p_action: "auth.password_changed", p_summary: "Password changed" });
  return { ok: true, message: "Your password has been updated." };
}
