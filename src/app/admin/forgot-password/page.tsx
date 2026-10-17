import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/admin/AuthShell";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { requestPasswordReset } from "@/actions/admin/auth";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset your password" subtitle="We'll email you a secure link to choose a new password.">
      <ActionForm action={requestPasswordReset} className="space-y-4">
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        </div>
        <SubmitButton className="btn-primary w-full py-3" pendingText="Sending…">
          Send reset link
        </SubmitButton>
      </ActionForm>
      <p className="mt-5 text-center text-sm">
        <Link href="/admin/login" className="font-medium text-navy-700 hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
