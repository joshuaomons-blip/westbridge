import type { Metadata } from "next";
import { UserPlus } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { isServiceRoleConfigured } from "@/lib/supabase/service";
import { formatDate } from "@/lib/format";
import { PageHeader, Panel, Badge, ErrorState } from "@/components/admin/ui";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { TextField, SelectField } from "@/components/admin/fields";
import { inviteAdmin, updateAdminAccess } from "@/actions/admin/admins";

export const metadata: Metadata = { title: "Administrator accounts" };

export default async function AdminsPage() {
  const me = await requirePermission("admins.manage");
  const db = await createSessionClient();
  const [{ data: admins, error }, { data: roles }] = await Promise.all([
    db.from("administrator_profiles").select("id, email, full_name, role_code, is_active, created_at").order("created_at"),
    db.from("administrator_roles").select("code, name, description, permissions, rank").order("rank", { ascending: false }),
  ]);
  const roleOptions = (roles ?? []).map((r) => ({ value: r.code as string, label: r.name as string }));

  return (
    <>
      <PageHeader title="Administrator accounts" description="Invite staff and control what each person can do. At least one active owner must always remain." />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Accounts" bodyClassName="p-0">
            {error ? (
              <div className="p-5"><ErrorState /></div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {(admins ?? []).map((a) => (
                  <li key={a.id} className="px-5 py-4">
                    <ActionForm action={updateAdminAccess} className="flex flex-col gap-3 md:flex-row md:items-end">
                      <input type="hidden" name="id" value={a.id} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-900">
                          {a.full_name || a.email} {a.id === me.id && <Badge tone="navy">You</Badge>} {!a.is_active && <Badge tone="red">Deactivated</Badge>}
                        </p>
                        <p className="truncate text-sm text-slate-500">{a.email} · added {formatDate(a.created_at)}</p>
                      </div>
                      <SelectField idPrefix={`${a.id.slice(0, 8)}-`} name="role_code" label="Role" defaultValue={a.role_code} options={roleOptions} />
                      <label className="flex items-center gap-2 pb-2.5 text-sm text-slate-700">
                        <input type="checkbox" name="is_active" defaultChecked={a.is_active} className="h-4 w-4 rounded border-slate-300" disabled={a.id === me.id} />
                        Active
                        {a.id === me.id && <input type="hidden" name="is_active" value="on" />}
                      </label>
                      <SubmitButton className="btn-outline" pendingText="Saving…">Save</SubmitButton>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Roles">
            <dl className="grid gap-4 sm:grid-cols-2">
              {(roles ?? []).map((r) => (
                <div key={r.code} className="rounded-lg border border-slate-200 p-4">
                  <dt className="font-semibold text-slate-900">{r.name}</dt>
                  <dd className="mt-1 text-sm text-slate-600">{r.description}</dd>
                  <dd className="mt-2 flex flex-wrap gap-1">
                    {(r.permissions as string[]).map((p) => (
                      <Badge key={p}>{p}</Badge>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
        <Panel title="Invite an administrator" actions={<UserPlus className="h-4 w-4 text-slate-400" aria-hidden />}>
          {!isServiceRoleConfigured() ? (
            <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Invitations need <code>SUPABASE_SERVICE_ROLE_KEY</code> set on the server. See README → “Environment variables”.
            </p>
          ) : (
            <ActionForm action={inviteAdmin} resetOnSuccess className="space-y-4">
              <TextField idPrefix="inv-" name="email" label="Email" type="email" required />
              <TextField idPrefix="inv-" name="full_name" label="Name" maxLength={120} />
              <SelectField idPrefix="inv-" name="role_code" label="Role" defaultValue="operator" options={roleOptions} />
              <p className="text-xs text-slate-500">They will receive an email to set their own password. No passwords are created or shared by you.</p>
              <SubmitButton pendingText="Sending…">Send invitation</SubmitButton>
            </ActionForm>
          )}
        </Panel>
      </div>
    </>
  );
}
