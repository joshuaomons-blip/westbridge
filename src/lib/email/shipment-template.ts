/**
 * Shipment notification email (HTML + plain text). Pure function: all wording
 * comes from the `t` translator so every language uses the same layout.
 *
 * Deliverability choices: table layout with inline styles (what email clients
 * render reliably), one small logo hosted on our own domain and no tracking pixels, a plain-text alternative,
 * one clear link to our own site, and only public shipment details.
 */

export type EmailKind = "created" | "update" | "delivered";
export type EmailRole = "sender" | "recipient";
export type Translate = (key: string, vars?: Record<string, string>) => string;

export type ShipmentEmailInput = {
  kind: EmailKind;
  role: EmailRole;
  name?: string | null;
  trackingNumber: string;
  statusLabel: string;
  statusDescription?: string | null;
  category: "pending" | "active" | "delivered" | "exception" | "closed";
  location?: string | null;
  note?: string | null;
  occurredAt: string; // already formatted for display
  origin: string;
  destination: string;
  estimatedDelivery?: string | null; // already formatted
  trackUrl: string;
  supportEmail?: string | null;
  lang: string;
  /** Absolute URL of the white logo image for the dark header (text is used if missing). */
  logoUrl?: string | null;
};

const COLORS: Record<ShipmentEmailInput["category"], string> = {
  pending: "#0F2A5C",
  active: "#163B7A",
  delivered: "#047857",
  exception: "#B45309",
  closed: "#475569",
};

export function escapeHtml(v: string): string {
  return v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Keeps names safe and short for a greeting line. */
function cleanName(name?: string | null): string | null {
  const n = (name ?? "").replace(/[\r\n<>]/g, " ").trim().slice(0, 80);
  return n || null;
}

export function shipmentEmailSubject(t: Translate, i: Pick<ShipmentEmailInput, "kind" | "trackingNumber" | "statusLabel">): string {
  const vars = { number: i.trackingNumber, status: i.statusLabel };
  return i.kind === "created" ? t("subjectCreated", vars) : i.kind === "delivered" ? t("subjectDelivered", vars) : t("subjectUpdate", vars);
}

export function renderShipmentEmail(t: Translate, i: ShipmentEmailInput): { subject: string; html: string; text: string } {
  const subject = shipmentEmailSubject(t, i);
  const name = cleanName(i.name);
  const greeting = name ? t("greeting", { name }) : t("greetingGeneric");
  const intro =
    i.kind === "delivered"
      ? t("introDelivered")
      : i.kind === "created"
        ? i.role === "sender"
          ? t("introCreatedSender")
          : t("introCreatedRecipient")
        : t("introUpdate");
  const help = i.supportEmail ? t("help", { email: i.supportEmail }) : t("helpNoEmail");
  const color = COLORS[i.category];

  const rows: [string, string][] = [
    [t("trackingNumber"), i.trackingNumber],
    ...(i.location ? ([[t("location"), i.location]] as [string, string][]) : []),
    [t("updatedAt"), i.occurredAt],
    [t("route"), `${i.origin} → ${i.destination}`],
    ...(i.estimatedDelivery && i.kind !== "delivered" ? ([[t("estimated"), i.estimatedDelivery]] as [string, string][]) : []),
    ...(i.note ? ([[t("note"), i.note]] as [string, string][]) : []),
  ];

  const e = escapeHtml;
  const font = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";

  const html = `<!doctype html>
<html lang="${e(i.lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${e(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#EEF2F7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${e(t("preheader", { status: i.statusLabel }))}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF2F7;">
<tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border-radius:12px;overflow:hidden;">

<tr><td style="background:#0B1F44;padding:20px 32px;${font}">
${
  i.logoUrl
    ? `<img src="${e(i.logoUrl)}" width="172" height="56" alt="Norvane Express" style="display:block;border:0;outline:none;height:56px;width:172px;color:#FFFFFF;font-size:20px;font-weight:800;">`
    : `<span style="font-size:22px;font-weight:800;color:#FFFFFF;letter-spacing:-0.2px;">Norvane</span>
<span style="font-size:11px;font-weight:700;color:#F87171;letter-spacing:4px;padding-left:8px;">EXPRESS</span>`
}
</td></tr>
<tr><td style="height:4px;background:#D62D20;line-height:4px;font-size:0;">&nbsp;</td></tr>

<tr><td style="padding:32px 32px 8px;${font}color:#0F172A;">
<p style="margin:0 0 12px;font-size:16px;">${e(greeting)}</p>
<p style="margin:0;font-size:16px;line-height:1.55;color:#334155;">${e(intro)}</p>
</td></tr>

<tr><td style="padding:20px 32px 4px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${color};border-radius:10px;">
<tr><td style="padding:20px 24px;${font}color:#FFFFFF;">
<div style="font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;opacity:.8;">${e(t("status"))}</div>
<div style="font-size:26px;font-weight:800;margin-top:4px;line-height:1.2;">${e(i.statusLabel)}</div>
${i.statusDescription ? `<div style="font-size:15px;margin-top:6px;opacity:.9;line-height:1.45;">${e(i.statusDescription)}</div>` : ""}
</td></tr>
</table>
</td></tr>

<tr><td style="padding:16px 32px 8px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${font}font-size:15px;">
${rows
  .map(
    ([k, v]) => `<tr>
<td style="padding:10px 0;border-bottom:1px solid #E2E8F0;color:#64748B;width:42%;vertical-align:top;">${e(k)}</td>
<td style="padding:10px 0;border-bottom:1px solid #E2E8F0;color:#0F172A;font-weight:600;vertical-align:top;">${e(v)}</td>
</tr>`,
  )
  .join("\n")}
</table>
<p style="margin:8px 0 0;${font}font-size:12px;color:#94A3B8;">${e(t("timesUtc"))}</p>
</td></tr>

<tr><td align="center" style="padding:24px 32px 8px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="background:#D62D20;border-radius:8px;">
<a href="${e(i.trackUrl)}" style="display:inline-block;padding:14px 28px;${font}font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;">${e(t("cta"))}</a>
</td></tr></table>
<p style="margin:12px 0 0;${font}font-size:13px;color:#64748B;word-break:break-all;">${e(i.trackUrl)}</p>
</td></tr>

<tr><td style="padding:20px 32px 28px;${font}font-size:14px;line-height:1.55;color:#334155;">
<p style="margin:0 0 14px;">${e(help)}</p>
<p style="margin:0;padding:12px 14px;background:#FEF3C7;border-radius:8px;color:#78350F;font-size:13px;">${e(t("safety"))}</p>
</td></tr>

<tr><td style="background:#F8FAFC;padding:20px 32px;${font}font-size:12px;line-height:1.5;color:#64748B;border-top:1px solid #E2E8F0;">
${e(t("footer"))}<br><br>© ${new Date().getUTCFullYear()} Norvane Express
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    "NORVANE EXPRESS",
    "",
    greeting,
    "",
    intro,
    "",
    `${t("status")}: ${i.statusLabel}`,
    ...(i.statusDescription ? [i.statusDescription] : []),
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    t("timesUtc"),
    "",
    `${t("cta")}: ${i.trackUrl}`,
    "",
    help,
    "",
    t("safety"),
    "",
    "—",
    t("footer"),
  ].join("\n");

  return { subject, html, text };
}
