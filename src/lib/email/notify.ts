import "server-only";
import { getTranslations } from "next-intl/server";
import { env } from "@/lib/env";
import { getSiteContent } from "@/lib/content";
import { categoryOf, isOnHold, isStatusCode, progressIndex } from "@/lib/statuses";
import { formatDate, formatDateTime } from "@/lib/format";
import { locales } from "@/i18n/routing";
import { stagePhoto } from "@/lib/photos";
import { isEmailConfigured, sendEmail } from "./send";
import { renderShipmentEmail, type EmailKind, type EmailRole } from "./shipment-template";

type Db = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export type NotifyEvent = {
  status: string;
  occurred_at: string;
  location?: string | null;
  description?: string | null;
};

export type NotifyOutcome = {
  sent: number;
  failed: number;
  reason?: "disabled" | "not_published" | "no_addresses" | "not_configured";
};

const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

/**
 * Emails the sender and recipient about a new shipment or a public tracking
 * update. Only public information is included (status, place, route, link).
 */
export async function notifyShipmentParties(db: Db, shipmentId: string, event: NotifyEvent, created = false): Promise<NotifyOutcome> {
  const { data: s } = await db
    .from("shipments")
    .select(
      "tracking_number, sender_name, sender_email, recipient_name, recipient_email, origin_city, origin_country, destination_city, destination_country, estimated_delivery, notify_emails, notify_locale, is_published, archived_at, is_demo",
    )
    .eq("id", shipmentId)
    .maybeSingle();
  if (!s) return { sent: 0, failed: 0, reason: "not_published" };
  if (!s.notify_emails) return { sent: 0, failed: 0, reason: "disabled" };
  if (!s.is_published || s.archived_at || s.is_demo) return { sent: 0, failed: 0, reason: "not_published" };

  // One email per address; if sender and recipient share an address, they get the sender version.
  const people: { email: string; name: string | null; role: EmailRole }[] = [];
  for (const [email, name, role] of [
    [s.sender_email, s.sender_name, "sender"],
    [s.recipient_email, s.recipient_name, "recipient"],
  ] as [string | null, string | null, EmailRole][]) {
    const addr = (email ?? "").trim().toLowerCase();
    if (EMAIL_RE.test(addr) && !people.some((p) => p.email === addr)) people.push({ email: addr, name, role });
  }
  if (!people.length) return { sent: 0, failed: 0, reason: "no_addresses" };
  if (!isEmailConfigured()) return { sent: 0, failed: 0, reason: "not_configured" };

  const locale = (locales as readonly string[]).includes(s.notify_locale) ? s.notify_locale : "en";
  const [t, ts, td, content, tt] = await Promise.all([
    getTranslations({ locale, namespace: "email" }),
    getTranslations({ locale, namespace: "status" }),
    getTranslations({ locale, namespace: "statusDescription" }),
    getSiteContent(locale, false),
    getTranslations({ locale, namespace: "tracking" }),
  ]);
  const progressStatus = created ? "shipment_registered" : event.status;
  const progress = {
    step: progressIndex(progressStatus),
    onHold: isOnHold(progressStatus),
    labels: [tt("stepRegistered"), tt("stepTransit"), tt("stepOut"), tt("stepDelivered")] as [string, string, string, string],
  };
  const translate = (key: string, vars?: Record<string, string>) => t(key, vars);
  const known = isStatusCode(event.status);
  const kind: EmailKind = created ? "created" : event.status === "delivered" ? "delivered" : "update";
  const supportEmail = content.get("contact.email") ?? null;
  const trackUrl = `${env.siteUrl}/${locale}/track?n=${encodeURIComponent(s.tracking_number)}`;
  // Stage photo (plane, hub, port, handover…), cropped to a wide banner by the image CDN.
  const photoUrl = `${stagePhoto(created ? "shipment_registered" : event.status)}?w=1200&h=440&fit=crop&crop=entropy&auto=format&q=70`;

  let sent = 0;
  let failed = 0;
  for (const p of people) {
    const mail = renderShipmentEmail(translate, {
      kind,
      role: p.role,
      name: p.name,
      trackingNumber: s.tracking_number,
      statusLabel: known ? ts(event.status) : event.status,
      statusDescription: known ? td(event.status) : null,
      category: categoryOf(event.status),
      location: event.location,
      note: event.description,
      occurredAt: formatDateTime(event.occurred_at, locale),
      origin: `${s.origin_city}, ${s.origin_country}`,
      destination: `${s.destination_city}, ${s.destination_country}`,
      estimatedDelivery: s.estimated_delivery ? formatDate(s.estimated_delivery, locale) : null,
      trackUrl,
      supportEmail,
      lang: locale,
      logoUrl: `${env.siteUrl}/email-logo.png`,
      photoUrl,
      progress,
    });
    const r = await sendEmail({
      to: p.email,
      ...mail,
      replyTo: supportEmail,
      idempotencyKey: `${shipmentId}:${event.status}:${event.occurred_at}:${p.role}`,
    });
    if (r.ok) sent++;
    else failed++;
  }
  return { sent, failed };
}

/** Compact code for passing an outcome in a URL (?email=...). */
export function outcomeCode(o: NotifyOutcome): string {
  return o.reason ?? (o.sent ? `sent-${o.sent}${o.failed ? `-${o.failed}` : ""}` : `failed-${o.failed}`);
}

/** Short sentence for the admin after saving. */
export function describeOutcome(o: NotifyOutcome): string {
  if (o.reason === "disabled") return "Customer emails are switched off for this shipment.";
  if (o.reason === "not_published") return "No email sent (tracking page is not published).";
  if (o.reason === "no_addresses") return "No email sent: add a sender or recipient email to notify them.";
  if (o.reason === "not_configured") return "Email not sent: the email service is not set up yet (see Settings).";
  if (o.failed && !o.sent) return `Email could not be sent (${o.failed} recipient${o.failed > 1 ? "s" : ""}). Please try again later.`;
  const parts = [`Email sent to ${o.sent} recipient${o.sent === 1 ? "" : "s"}.`];
  if (o.failed) parts.push(`${o.failed} could not be sent.`);
  return parts.join(" ");
}
