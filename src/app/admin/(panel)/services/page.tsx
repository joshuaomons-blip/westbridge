import type { Metadata } from "next";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { PageHeader, Panel, Badge, EmptyState, ErrorState } from "@/components/admin/ui";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { ConfirmForm } from "@/components/admin/ConfirmForm";
import { TextField, SelectField, CheckboxField, TextAreaField } from "@/components/admin/fields";
import { ServiceIcon } from "@/components/site/ServiceIcon";
import { SERVICE_ICON_NAMES } from "@/lib/service-icons";
import { deleteService, saveService, setServicePublished } from "@/actions/admin/site";

export const metadata: Metadata = { title: "Services" };

const LANGS = [
  { code: "en", label: "English" },
  { code: "pl", label: "Polski" },
  { code: "ja", label: "日本語" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
] as const;

type Service = {
  id: string;
  slug: string;
  icon: string;
  title: Record<string, string>;
  description: Record<string, string>;
  sort_order: number;
  is_published: boolean;
};

export default async function ServicesAdminPage() {
  await requirePermission("services.write");
  const db = await createSessionClient();
  const { data, error } = await db.from("services").select("*").order("sort_order");
  const services = (data ?? []) as Service[];

  return (
    <>
      <PageHeader
        title="Services"
        description="Only publish services the company actually provides. Unpublished services are hidden from the website."
      />
      {error && <ErrorState />}
      <div className="space-y-4">
        {!error && services.length === 0 && (
          <Panel>
            <EmptyState title="No services yet" text="Add your first service below." />
          </Panel>
        )}
        {services.map((s) => (
          <details key={s.id} className="group rounded-xl border border-slate-200 bg-white shadow-sm">
            <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
                <ServiceIcon name={s.icon} className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">{s.title.en || s.slug}</p>
                <p className="truncate text-sm text-slate-500">{s.description.en}</p>
              </div>
              {s.is_published ? <Badge tone="green">Published</Badge> : <Badge>Draft</Badge>}
              <span className="text-xs font-semibold text-navy-700 group-open:hidden">Edit</span>
            </summary>
            <div className="border-t border-slate-100 px-5 py-5">
              <ServiceForm s={s} />
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <ConfirmForm
                  action={setServicePublished}
                  hidden={{ id: s.id, publish: String(!s.is_published) }}
                  label={s.is_published ? "Unpublish" : "Publish"}
                  icon={s.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  tone="primary"
                  title={s.is_published ? "Unpublish this service?" : "Publish this service?"}
                  description={s.is_published ? "It will be removed from the public website." : "It will appear on the homepage and Services page in all languages."}
                  confirmLabel={s.is_published ? "Unpublish" : "Publish"}
                />
                <ConfirmForm
                  action={deleteService}
                  hidden={{ id: s.id }}
                  label="Delete"
                  icon={<Trash2 className="h-4 w-4" />}
                  buttonClassName="btn-ghost text-red-600 hover:bg-red-50"
                  title="Delete this service?"
                  description="This removes the listing permanently. Shipments that used it keep their records but show no service name. Consider unpublishing instead."
                  confirmLabel="Delete"
                />
              </div>
            </div>
          </details>
        ))}

        <Panel title="Add a service" actions={<Plus className="h-4 w-4 text-slate-400" aria-hidden />}>
          <ServiceForm />
        </Panel>
      </div>
    </>
  );
}

function ServiceForm({ s }: { s?: Service }) {
  const px = s ? `${s.id.slice(0, 8)}-` : "new-";
  return (
    <ActionForm action={saveService} resetOnSuccess={!s} className="space-y-5">
      {s && <input type="hidden" name="id" value={s.id} />}
      <div className="grid gap-4 sm:grid-cols-4">
        <TextField idPrefix={px} name="slug" label="URL slug" required defaultValue={s?.slug} hint="e.g. express-delivery" className="sm:col-span-2" />
        <SelectField idPrefix={px} name="icon" label="Icon" defaultValue={s?.icon ?? "package"} options={SERVICE_ICON_NAMES.map((n) => ({ value: n, label: n }))} />
        <TextField idPrefix={px} name="sort_order" label="Order" type="number" min="0" defaultValue={s?.sort_order ?? 100} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {LANGS.map((l) => (
          <div key={l.code} className="rounded-lg border border-slate-200 p-4" lang={l.code}>
            <p className="mb-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">{l.label}</p>
            <div className="space-y-3">
              <TextField idPrefix={px} name={`title_${l.code}`} label="Title" required={l.code === "en"} maxLength={200} defaultValue={s?.title[l.code]} />
              <TextAreaField idPrefix={px} name={`description_${l.code}`} label="Description" rows={3} maxLength={2000} defaultValue={s?.description[l.code]} />
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500">Empty languages fall back to English on the website.</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CheckboxField idPrefix={px} name="is_published" label="Published" defaultChecked={s?.is_published ?? false} />
        <SubmitButton pendingText="Saving…">{s ? "Save service" : "Create service"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
