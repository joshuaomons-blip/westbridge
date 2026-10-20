import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArchiveRestore, Eye, EyeOff, ExternalLink, History, Lock, Earth, Printer, ReceiptText } from "lucide-react";
import { requirePermission, can } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { getServiceOptions } from "@/lib/admin-data";
import { STATUS_CODES, STATUS_ADMIN_LABEL } from "@/lib/statuses";
import { formatDate, formatDateTime, toDateTimeLocal, cn } from "@/lib/format";
import { PageHeader, Panel, StatusBadge, Badge, EmptyState } from "@/components/admin/ui";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { ConfirmForm } from "@/components/admin/ConfirmForm";
import { CopyText } from "@/components/admin/CopyText";
import { ShipmentFields } from "@/components/admin/ShipmentFields";
import { TextField, SelectField, CheckboxField, TextAreaField } from "@/components/admin/fields";
import { AuditList } from "@/components/admin/AuditList";
import { RouteTracker } from "@/components/admin/RouteTracker";
import { routeProgress, stepMessage } from "@/lib/route-progress";
import { suggestRoute } from "@/lib/route-suggest";
import {
  addShipmentEvent,
  advanceRoute,
  applyAutoRoute,
  correctShipmentEvent,
  setShipmentArchived,
  setShipmentPublished,
  updateShipment,
} from "@/actions/admin/shipments";

export const metadata: Metadata = { title: "Shipment" };

const statusOptions = STATUS_CODES.map((s) => ({ value: s, label: STATUS_ADMIN_LABEL[s] }));

export default async function ShipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission("shipments.read");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const db = await createSessionClient();
  const { data: s } = await db.from("shipments").select("*").eq("id", id).maybeSingle();
  if (!s) notFound();

  const [{ data: events }, { data: admins }, services, customer] = await Promise.all([
    db.from("shipment_events").select("*").eq("shipment_id", id).order("occurred_at", { ascending: false }).order("recorded_at", { ascending: false }),
    db.from("administrator_profiles").select("id, email, full_name"),
    getServiceOptions(),
    s.customer_id ? db.from("customers").select("id, full_name").eq("id", s.customer_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const who = (uid: string | null) => {
    const a = admins?.find((x) => x.id === uid);
    return a ? a.full_name || a.email : uid ? "Former administrator" : "System";
  };

  const eventIds = (events ?? []).map((e) => e.id as string);
  const { data: audit } = can(admin, "logs.read")
    ? await db
        .from("audit_logs")
        .select("id, occurred_at, actor_email, action, table_name, record_id, summary, old_data, new_data")
        .or(`and(table_name.eq.shipments,record_id.eq.${id})${eventIds.length ? `,and(table_name.eq.shipment_events,record_id.in.(${eventIds.join(",")}))` : ""}`)
        .order("occurred_at", { ascending: false })
        .limit(50)
    : { data: null };

  const archived = !!s.archived_at;
  const canWrite = can(admin, "shipments.write") && !archived;
  const canEvents = can(admin, "events.write") && !archived;
  const publicUrl = `/en/track?n=${encodeURIComponent(s.tracking_number)}`;

  // Route with one-click updates (planned stops + what was already recorded).
  const publicEvents = (events ?? [])
    .filter((e) => e.visibility === "public" && !e.is_voided)
    .map((e) => ({ status: e.status_code as string, occurred_at: e.occurred_at as string, location: e.location as string | null }));
  const route = routeProgress(s, publicEvents);
  const auto = suggestRoute({ originCity: s.origin_city, originCountry: s.origin_country, destinationCity: s.destination_city, destinationCountry: s.destination_country });
  const currentStops: string[] = s.route_stops ?? [];
  const autoDiffers = !auto.unknown.length && auto.stops.join("|") !== currentStops.join("|");
  const previews = Object.fromEntries(route.steps.map((st) => [st.key, stepMessage(st, s.notify_locale)]));

  return (
    <>
      <PageHeader
        back={{ href: "/admin/shipments", label: "Shipments" }}
        title={s.tracking_number}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>{s.internal_ref}</span>
            <StatusBadge code={s.current_status} />
            {s.is_demo && <Badge tone="amber">DEMO / SAMPLE</Badge>}
            {!s.is_published && <Badge>Hidden from public</Badge>}
            {archived && <Badge tone="red">Archived {formatDate(s.archived_at)}</Badge>}
          </span>
        }
        actions={
          <>
            <CopyText value={s.tracking_number} label="Copy tracking no." />
            <a href={publicUrl} target="_blank" rel="noopener" className="btn-outline px-3 py-2">
              <ExternalLink className="h-4 w-4" aria-hidden /> Public page
            </a>
            <a href={`/admin/label/${s.id}`} target="_blank" rel="noopener" className="btn-outline px-3 py-2">
              <Printer className="h-4 w-4" aria-hidden /> Print label
            </a>
            <a href={`/admin/receipt/${s.id}`} target="_blank" rel="noopener" className="btn-outline px-3 py-2">
              <ReceiptText className="h-4 w-4" aria-hidden /> Print receipt
            </a>
            {can(admin, "shipments.write") && !archived && (
              <ConfirmForm
                action={setShipmentPublished}
                hidden={{ id: s.id, publish: String(!s.is_published) }}
                label={s.is_published ? "Hide" : "Publish"}
                icon={s.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                buttonClassName="btn-outline px-3 py-2"
                tone="primary"
                title={s.is_published ? "Hide tracking page?" : "Publish tracking page?"}
                description={
                  s.is_published
                    ? "Customers entering this tracking number will see “not found” until you publish it again."
                    : "Customers will be able to look up this shipment with its tracking number."
                }
                confirmLabel={s.is_published ? "Hide" : "Publish"}
              />
            )}
            {can(admin, "shipments.archive") && (
              <ConfirmForm
                action={setShipmentArchived}
                hidden={{ id: s.id, archive: String(!archived) }}
                label={archived ? "Restore" : "Archive"}
                icon={archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                buttonClassName="btn-outline px-3 py-2"
                tone={archived ? "primary" : "danger"}
                title={archived ? "Restore this shipment?" : "Archive this shipment?"}
                description={
                  archived
                    ? "The shipment becomes active again and its public tracking page is available if published."
                    : "Archived shipments are kept with their full history but hidden from public tracking and active lists. You can restore it later."
                }
                confirmLabel={archived ? "Restore" : "Archive"}
              />
            )}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {canEvents && (
            <Panel
              title="Route & one-click updates"
              description={
                s.route_stops?.length
                  ? "Click where the shipment is now. The tracking page updates straight away and the sender and recipient get an email."
                  : "No planned stops yet. Use the automatic route below, or add stops by hand under Shipment details → Route stops."
              }
            >
              {canWrite && autoDiffers && (
                <ActionForm action={applyAutoRoute} className="mb-5 rounded-lg border border-navy-100 bg-navy-50/60 p-4">
                  <input type="hidden" name="shipment_id" value={s.id} />
                  <p className="text-sm font-bold text-navy-900">Automatic route (real hubs on the way)</p>
                  <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-slate-700">
                    {[`${s.origin_city}, ${s.origin_country}`, ...(auto.stops.length ? auto.stops : ["direct"]), `${s.destination_city}, ${s.destination_country}`].map((p, i, arr) => (
                      <span key={`${p}-${i}`} className="inline-flex items-center gap-1.5">
                        <span className={i === 0 || i === arr.length - 1 ? "font-semibold text-navy-900" : p === "direct" ? "italic text-slate-500" : "rounded bg-white px-1.5 py-0.5 ring-1 ring-navy-100"}>{p}</span>
                        {i < arr.length - 1 && <span className="text-slate-400">→</span>}
                      </span>
                    ))}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <SubmitButton pendingText="Saving…">{currentStops.length ? "Replace with automatic route" : "Use automatic route"}</SubmitButton>
                    {currentStops.length > 0 && <span className="text-xs text-slate-500">Your current stops will be replaced.</span>}
                  </div>
                </ActionForm>
              )}
              <ActionForm action={advanceRoute}>
                <input type="hidden" name="shipment_id" value={s.id} />
                <RouteTracker journey={route.journey} steps={route.steps} previews={previews} emailDefault={s.notify_emails !== false} />
              </ActionForm>
            </Panel>
          )}

          {canEvents && (
            <Panel title="Other update (customs, delays…)" description="Record where the shipment is now. Public updates appear on the customer tracking page and journey; internal ones are staff-only.">
              <ActionForm action={addShipmentEvent} resetOnSuccess className="grid gap-4 sm:grid-cols-2">
                <input type="hidden" name="shipment_id" value={s.id} />
                <SelectField name="status_code" label="Status" required defaultValue={s.current_status} options={statusOptions} />
                <TextField name="occurred_at" label="Date & time (UTC)" type="datetime-local" required defaultValue={toDateTimeLocal()} hint="When it happened. Cannot be in the future." />
                <TextField name="location" label="Location" placeholder="e.g. Berlin, DE" maxLength={200} />
                <SelectField
                  name="visibility"
                  label="Visibility"
                  defaultValue="public"
                  options={[
                    { value: "public", label: "Public — shown to customers" },
                    { value: "internal", label: "Internal — staff only" },
                  ]}
                />
                <TextField name="description" label="Description" placeholder="Short note (customer-facing if public)" maxLength={1000} className="sm:col-span-2" />
                <TextField name="received_by" label="Received by (proof of delivery)" placeholder="e.g. A. Kowalska" maxLength={80} hint="Only used when the status is Delivered. Shown to customers on the tracking page — a first initial and surname is enough." className="sm:col-span-2" />
                <CheckboxField
                  name="send_email"
                  label="Email this update to the sender and recipient"
                  defaultChecked={s.notify_emails !== false}
                  hint={s.notify_emails === false ? "Customer emails are switched off for this shipment (see Customer emails below)." : "Only for public events. Sent in the shipment's email language."}
                  className="sm:col-span-2"
                />
                <div className="sm:col-span-2 flex justify-end">
                  <SubmitButton pendingText="Saving…">Record event</SubmitButton>
                </div>
              </ActionForm>
            </Panel>
          )}

          <Panel title="Tracking history" description="Events are never deleted. Corrections and voided events are kept in the audit history." bodyClassName="p-0">
            {!events?.length ? (
              <EmptyState title="No events yet" />
            ) : (
              <ol className="divide-y divide-slate-100">
                {events.map((e) => (
                  <li key={e.id} className={cn("px-5 py-4", e.is_voided && "bg-slate-50")}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className={cn("min-w-0", e.is_voided && "opacity-60")}>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge code={e.status_code} />
                          {e.visibility === "internal" ? (
                            <Badge tone="navy"><Lock className="mr-1 h-3 w-3" aria-hidden />Internal</Badge>
                          ) : (
                            <Badge tone="green"><Earth className="mr-1 h-3 w-3" aria-hidden />Public</Badge>
                          )}
                          {e.is_voided && <Badge tone="red">Voided</Badge>}
                          {e.updated_at && !e.is_voided && <Badge tone="amber">Corrected</Badge>}
                        </div>
                        <p className={cn("mt-1.5 text-sm text-slate-900", e.is_voided && "line-through")}>
                          {formatDateTime(e.occurred_at)}
                          {e.location && <> · {e.location}</>}
                        </p>
                        {e.description && <p className="mt-1 text-sm text-slate-600">{e.description}</p>}
                        <p className="mt-1.5 text-xs text-slate-400">
                          Recorded {formatDateTime(e.recorded_at)} by {who(e.created_by)}
                          {e.updated_at && <> · changed {formatDateTime(e.updated_at)} by {who(e.updated_by)}</>}
                        </p>
                        {e.correction_reason && <p className="mt-1 text-xs text-amber-700">Reason: {e.correction_reason}</p>}
                      </div>
                    </div>
                    {canEvents && !e.is_voided && (
                      <details className="group mt-3">
                        <summary className="cursor-pointer text-xs font-semibold text-navy-700 hover:underline">Correct or void this event</summary>
                        <ActionForm action={correctShipmentEvent} className="mt-3 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                          <input type="hidden" name="event_id" value={e.id} />
                          <input type="hidden" name="shipment_id" value={s.id} />
                          <SelectField idPrefix={`e${e.id.slice(0, 8)}-`} name="status_code" label="Status" defaultValue={e.status_code} options={statusOptions} />
                          <TextField idPrefix={`e${e.id.slice(0, 8)}-`} name="occurred_at" label="Date & time (UTC)" type="datetime-local" defaultValue={toDateTimeLocal(e.occurred_at)} />
                          <TextField idPrefix={`e${e.id.slice(0, 8)}-`} name="location" label="Location" defaultValue={e.location} maxLength={200} />
                          <SelectField idPrefix={`e${e.id.slice(0, 8)}-`} name="visibility" label="Visibility" defaultValue={e.visibility} options={[{ value: "public", label: "Public" }, { value: "internal", label: "Internal" }]} />
                          <TextField idPrefix={`e${e.id.slice(0, 8)}-`} name="description" label="Description" defaultValue={e.description} maxLength={1000} className="sm:col-span-2" />
                          <TextAreaField idPrefix={`e${e.id.slice(0, 8)}-`} name="correction_reason" label="Reason for correction" required rows={2} maxLength={1000} className="sm:col-span-2" hint="Required. Stored permanently in the audit history." />
                          <CheckboxField idPrefix={`e${e.id.slice(0, 8)}-`} name="void_event" label="Void this event (hide it everywhere; cannot be undone)" className="sm:col-span-2" />
                          <div className="sm:col-span-2 flex justify-end">
                            <SubmitButton className="btn-primary" pendingText="Saving…">Save correction</SubmitButton>
                          </div>
                        </ActionForm>
                      </details>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel title="Shipment details" description={canWrite ? "Edit and save. Every change is recorded in the audit history." : undefined}>
            {canWrite ? (
              <ActionForm action={updateShipment} className="space-y-6">
                <input type="hidden" name="id" value={s.id} />
                <ShipmentFields d={s} services={services} />
                <div className="flex justify-end">
                  <SubmitButton pendingText="Saving…">Save changes</SubmitButton>
                </div>
              </ActionForm>
            ) : (
              <ReadOnlyDetails s={s} />
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Summary">
            <dl className="space-y-3 text-sm">
              <Row label="Customer">
                {customer?.data ? (
                  <Link href={`/admin/customers/${customer.data.id}`} className="font-medium text-navy-700 hover:underline">{customer.data.full_name}</Link>
                ) : (
                  "—"
                )}
              </Row>
              <Row label="Route">{s.origin_city}, {s.origin_country} → {s.destination_city}, {s.destination_country}</Row>
              <Row label="Shipment date">{formatDate(s.shipment_date)}</Row>
              <Row label="Estimated delivery">{formatDate(s.estimated_delivery)}</Row>
              <Row label="Created">{formatDateTime(s.created_at)} by {who(s.created_by)}</Row>
              <Row label="Last change">{formatDateTime(s.updated_at)}</Row>
            </dl>
          </Panel>
          {s.internal_notes && (
            <Panel title="Internal notes">
              <p className="text-sm whitespace-pre-line text-slate-700">{s.internal_notes}</p>
            </Panel>
          )}
          {audit && (
            <Panel title="Audit history" actions={<History className="h-4 w-4 text-slate-400" aria-hidden />} bodyClassName="p-0">
              <AuditList rows={audit} compact />
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-slate-900">{children}</dd>
    </div>
  );
}

function ReadOnlyDetails({ s }: { s: Record<string, unknown> }) {
  const fields: [string, string][] = [
    ["Sender", `${s.sender_name ?? ""}${s.sender_email ? ` · ${s.sender_email}` : ""}${s.sender_phone ? ` · ${s.sender_phone}` : ""}`],
    ["Origin address", String(s.origin_address ?? "—")],
    ["Recipient", `${s.recipient_name ?? ""}${s.recipient_email ? ` · ${s.recipient_email}` : ""}${s.recipient_phone ? ` · ${s.recipient_phone}` : ""}`],
    ["Destination address", String(s.destination_address ?? "—")],
    ["Package", `${s.package_description ?? "—"} · ${s.package_quantity} pcs${s.weight_kg ? ` · ${s.weight_kg} kg` : ""}`],
  ];
  return (
    <dl className="grid gap-4 text-sm sm:grid-cols-2">
      {fields.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs font-medium text-slate-500">{k}</dt>
          <dd className="mt-0.5 whitespace-pre-line text-slate-900">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
