import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArchiveRestore, Mail } from "lucide-react";
import { requirePermission, can } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { PageHeader, Panel, Badge } from "@/components/admin/ui";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { ConfirmForm } from "@/components/admin/ConfirmForm";
import { SelectField, TextAreaField } from "@/components/admin/fields";
import { setInquiryArchived, updateInquiry } from "@/actions/admin/customers";

export const metadata: Metadata = { title: "Inquiry" };

export default async function InquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission("inquiries.read");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await createSessionClient();
  const { data: i } = await db.from("contact_inquiries").select("*").eq("id", id).maybeSingle();
  if (!i) notFound();
  const archived = !!i.archived_at;
  const canWrite = can(admin, "inquiries.write");
  const replySubject = encodeURIComponent(`Re: ${i.subject} [${i.reference}]`);

  return (
    <>
      <PageHeader
        back={{ href: "/admin/inquiries", label: "Inquiries" }}
        title={i.subject}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {i.reference} · received {formatDateTime(i.created_at)}
            {i.locale && <Badge>{i.locale.toUpperCase()}</Badge>}
            {i.is_demo && <Badge tone="amber">DEMO</Badge>}
            {archived && <Badge tone="red">Archived</Badge>}
          </span>
        }
        actions={
          <>
            <a href={`mailto:${i.email}?subject=${replySubject}`} className="btn-primary px-3 py-2">
              <Mail className="h-4 w-4" aria-hidden /> Reply by email
            </a>
            {canWrite && (
              <ConfirmForm
                action={setInquiryArchived}
                hidden={{ id: i.id, archive: String(!archived) }}
                label={archived ? "Restore" : "Archive"}
                icon={archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                buttonClassName="btn-outline px-3 py-2"
                tone={archived ? "primary" : "danger"}
                title={archived ? "Restore inquiry?" : "Archive inquiry?"}
                description="The inquiry and its notes are kept either way."
                confirmLabel={archived ? "Restore" : "Archive"}
              />
            )}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Message" className="lg:col-span-2">
          <div className="mb-4 text-sm">
            <p className="font-semibold text-slate-900">{i.name}</p>
            <p className="text-slate-500">{i.email}</p>
            {i.customer_id && (
              <Link href={`/admin/customers/${i.customer_id}`} className="text-xs font-semibold text-navy-700 hover:underline">
                View customer record
              </Link>
            )}
          </div>
          <p className="rounded-lg bg-slate-50 p-4 text-sm leading-relaxed whitespace-pre-wrap text-slate-800">{i.message}</p>
        </Panel>
        <Panel title="Handling" description="Internal notes are never visible to the sender.">
          {canWrite ? (
            <ActionForm action={updateInquiry} className="space-y-4">
              <input type="hidden" name="id" value={i.id} />
              <SelectField
                name="status"
                label="Status"
                defaultValue={i.status}
                options={[
                  { value: "new", label: "New" },
                  { value: "in_progress", label: "In progress" },
                  { value: "resolved", label: "Resolved" },
                ]}
              />
              <TextAreaField name="internal_notes" label="Internal notes" rows={6} maxLength={10000} defaultValue={i.internal_notes} />
              <SubmitButton pendingText="Saving…">Save</SubmitButton>
            </ActionForm>
          ) : (
            <p className="text-sm text-slate-700">Status: {i.status}</p>
          )}
        </Panel>
      </div>
    </>
  );
}
