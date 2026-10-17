import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/admin/AuthShell";
import { ActionForm, FieldError, SubmitButton } from "@/components/admin/ActionForm";
import { updatePassword } from "@/actions/admin/auth";
import { createSessionClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Choose a password" };

export default async function UpdatePasswordPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login?reason=link_expired");
  const { welcome } = await searchParams;

  return (
    <AuthShell
      title={welcome === "invite" ? "Welcome — set your password" : "Choose a new password"}
      subtitle={`Signed in as ${user.email}`}
    >
      <ActionForm action={updatePassword} className="space-y-4">
        <div>
          <label htmlFor="password" className="label">
            New password
          </label>
          <input id="password" name="password" type="password" autoComplete="new-password" required minLength={12} className="input" />
          <p className="mt-1.5 text-xs text-slate-500">At least 12 characters, with letters and numbers.</p>
          <FieldError name="password" />
        </div>
        <div>
          <label htmlFor="confirm" className="label">
            Confirm password
          </label>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className="input" />
          <FieldError name="confirm" />
        </div>
        <SubmitButton className="btn-primary w-full py-3" pendingText="Saving…">
          Save password
        </SubmitButton>
      </ActionForm>
      <p className="mt-5 text-center text-sm">
        <Link href="/admin/dashboard" className="font-medium text-navy-700 hover:underline">
          Continue to dashboard
        </Link>
      </p>
    </AuthShell>
  );
}
