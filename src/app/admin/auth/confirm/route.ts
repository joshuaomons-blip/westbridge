import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSessionClient } from "@/lib/supabase/server";

const ALLOWED: EmailOtpType[] = ["invite", "recovery", "email", "email_change", "signup", "magiclink"];

/**
 * Handles invitation and password-reset emails that use token_hash links
 * (see README → "Email templates"). Works even if the link is opened in a
 * different browser from the one that requested it.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type && ALLOWED.includes(type)) {
    const supabase = await createSessionClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      const dest = type === "invite" || type === "recovery" ? "/admin/update-password?welcome=" + type : "/admin/dashboard";
      return NextResponse.redirect(new URL(dest, url.origin));
    }
  }
  return NextResponse.redirect(new URL("/admin/login?reason=link_expired", url.origin));
}
