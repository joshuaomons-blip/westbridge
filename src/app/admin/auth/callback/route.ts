import { NextResponse, type NextRequest } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

/** Handles links that carry a one-time "code" (PKCE flow, e.g. password reset in the same browser). */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  if (code) {
    const supabase = await createSessionClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL("/admin/login?reason=link_expired", url.origin));
}

function safeNext(next: string | null): string {
  return next && next.startsWith("/admin/") && !next.startsWith("//") ? next : "/admin/update-password";
}
