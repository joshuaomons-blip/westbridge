import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/admin/AuthShell";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { signIn } from "@/actions/admin/auth";
import { getAdmin } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in" };

const REASONS: Record<string, string> = {
  unauthorized: "Please sign in with an administrator account.",
  link_expired: "That link is invalid or has expired. Please request a new one.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  if (await getAdmin()) redirect("/admin/dashboard");

  return (
    <AuthShell title="Administrator sign in" subtitle="Westbridge Global Express dashboard">
      {!isSupabaseConfigured() && (
        <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Supabase is not configured yet. Add your keys to <code>.env.local</code> (see README).
        </p>
      )}
      {sp.signed_out && <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">You have been signed out.</p>}
      {sp.reason && REASONS[sp.reason] && (
        <p className="mb-4 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">{REASONS[sp.reason]}</p>
      )}
      <ActionForm action={signIn} className="space-y-4">
        <input type="hidden" name="next" value={sp.next ?? ""} />
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input id="email" name="email" type="email" autoComplete="username" required className="input" />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Password
            </label>
            <Link href="/admin/forgot-password" className="text-xs font-medium text-navy-700 hover:underline">
              Forgot password?
            </Link>
          </div>
          <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
        </div>
        <SubmitButton className="btn-primary w-full py-3" pendingText="Signing in…">
          Sign in
        </SubmitButton>
      </ActionForm>
    </AuthShell>
  );
}
