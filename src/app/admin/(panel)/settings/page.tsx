import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck, CircleX } from "lucide-react";
import { requireAdmin, can } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { isServiceRoleConfigured } from "@/lib/supabase/service";
import { emailFrom, isEmailConfigured } from "@/lib/email/send";
import { env } from "@/lib/env";
import { PageHeader, Panel } from "@/components/admin/ui";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { TextField, CheckboxField } from "@/components/admin/fields";
import { saveSettings } from "@/actions/admin/site";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const admin = await requireAdmin();
  const db = await createSessionClient();
  const { data } = await db.from("site_settings").select("key, value");
  const get = (k: string) => data?.find((r) => r.key === k)?.value;
  const demo = get("demo_mode") === true;
  const prefix = typeof get("tracking_prefix") === "string" ? (get("tracking_prefix") as string) : "NV";
  const { count: demoCount } = await db.from("shipments").select("id", { count: "exact", head: true }).eq("is_demo", true);
  const canEdit = can(admin, "settings.write");

  const checks = [
    { label: "Supabase connected", ok: true },
    { label: "Service-role key set (needed for inviting admins)", ok: isServiceRoleConfigured() },
    { label: "Rate-limit salt set", ok: !!process.env.RATE_LIMIT_SALT },
    { label: `Public site URL: ${env.siteUrl}`, ok: env.siteUrl.startsWith("https://") },
    {
      label: isEmailConfigured()
        ? `Customer emails: sending as ${emailFrom()}`
        : "Customer emails: not set up (add RESEND_API_KEY in Vercel)",
      ok: isEmailConfigured(),
    },
  ];

  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="General" description={canEdit ? undefined : "Only owners can change settings."}>
          <ActionForm action={saveSettings} className="space-y-5">
            <fieldset disabled={!canEdit} className="space-y-5">
              <TextField name="tracking_prefix" label="Tracking number prefix" defaultValue={prefix} maxLength={4} hint="2–4 letters. Applies to new shipments only, e.g. NV12345678901." />
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <CheckboxField
                  name="demo_mode"
                  label="Demonstration mode"
                  defaultChecked={demo}
                  hint="When on, records marked DEMO are visible on the public tracking page and a banner explains they are samples. Turn off before launch."
                />
                <p className="mt-3 text-xs text-amber-900">
                  Demo records in the database: <strong>{demoCount ?? 0}</strong>. To remove them, run <code>supabase/demo_remove.sql</code> in the Supabase SQL editor (see README).
                </p>
              </div>
            </fieldset>
            {canEdit && <SubmitButton pendingText="Saving…">Save settings</SubmitButton>}
          </ActionForm>
        </Panel>
        <Panel title="System check">
          <ul className="space-y-2.5 text-sm">
            {checks.map((c) => (
              <li key={c.label} className="flex items-center gap-2">
                {c.ok ? <CircleCheck className="h-4 w-4 text-emerald-600" aria-hidden /> : <CircleX className="h-4 w-4 text-amber-500" aria-hidden />}
                <span className="text-slate-700">{c.label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-500">
            Your account: <Link href="/admin/account" className="font-semibold text-navy-700 hover:underline">profile & password</Link>
          </p>
        </Panel>
      </div>
    </>
  );
}
