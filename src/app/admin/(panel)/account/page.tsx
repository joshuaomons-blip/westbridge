import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Panel, Badge } from "@/components/admin/ui";
import { ActionForm, FieldError, SubmitButton } from "@/components/admin/ActionForm";
import { TextField } from "@/components/admin/fields";
import { updateMyName } from "@/actions/admin/site";
import { updatePassword } from "@/actions/admin/auth";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const admin = await requireAdmin();
  return (
    <>
      <PageHeader title="My account" description={<span className="flex items-center gap-2">{admin.email} <Badge tone="navy">{admin.role_name}</Badge></span>} />
      <div className="grid max-w-4xl gap-6 md:grid-cols-2">
        <Panel title="Profile">
          <ActionForm action={updateMyName} className="space-y-4">
            <TextField name="full_name" label="Display name" defaultValue={admin.full_name} maxLength={120} />
            <SubmitButton pendingText="Saving…">Save</SubmitButton>
          </ActionForm>
        </Panel>
        <Panel title="Change password">
          <ActionForm action={updatePassword} resetOnSuccess className="space-y-4">
            <div>
              <label htmlFor="password" className="label">New password</label>
              <input id="password" name="password" type="password" autoComplete="new-password" className="input" />
              <p className="mt-1 text-xs text-slate-500">At least 12 characters, with letters and numbers.</p>
              <FieldError name="password" />
            </div>
            <div>
              <label htmlFor="confirm" className="label">Confirm new password</label>
              <input id="confirm" name="confirm" type="password" autoComplete="new-password" className="input" />
              <FieldError name="confirm" />
            </div>
            <SubmitButton pendingText="Saving…">Update password</SubmitButton>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}
