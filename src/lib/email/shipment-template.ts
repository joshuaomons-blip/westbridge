/**
 * Shipment notification email (HTML + plain text). Pure function: all wording
 * comes from the `t` translator so every language uses the same layout.
 *
 * Deliverability choices: table layout with inline styles (what email clients
 * render reliably), a small logo from our own domain, one stock photo, no tracking pixels, a plain-text alternative,
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
  /** Absolute URL of a wide photo for the shipment's current stage (600×220 display). */
  photoUrl?: string | null;
  /** Progress tracker: step reached (0 registered … 3 delivered; -1 hides it) and its four labels. */
  progress?: { step: number; onHold: boolean; labels: [string, string, string, string] } | null;
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
  // The support address is a tap-to-write link (subject pre-filled with the tracking number).
  const supportAddress = i.supportEmail || "support@norvaneexpress.com";
  const mailto = `mailto:${supportAddress}?subject=${encodeURIComponent(`${i.trackingNumber}`)}`;
  const linkEmail = (escaped: string) =>
    escaped.split(e(supportAddress)).join(`<a href="${e(mailto)}" style="color:#163B7A;font-weight:700;text-decoration:underline;">${e(supportAddress)}</a>`);
  const font = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";
  const accent = i.progress?.onHold ? "#B45309" : color;

  // Step-by-step tracker (circles joined by lines), the way big online shops show order progress.
  const tracker = (() => {
    const p = i.progress;
    if (!p || p.step < 0) return "";
    const cells: string[] = [];
    const labels: string[] = [];
    p.labels.forEach((label, n) => {
      const done = n < p.step || (n === p.step && !p.onHold) || (n === 3 && p.step === 3);
      const current = n === p.step;
      const bg = current && p.onHold ? "#B45309" : done ? accent : "#FFFFFF";
      const border = current && p.onHold ? "#B45309" : done ? accent : "#CBD5E1";
      const mark = current && p.onHold ? "!" : done ? "&#10003;" : String(n + 1);
      const fg = done || (current && p.onHold) ? "#FFFFFF" : "#94A3B8";
      cells.push(`<td width="34" align="center" style="padding:0;"><div style="width:30px;height:30px;line-height:30px;border-radius:15px;background:${bg};border:2px solid ${border};color:${fg};${font}font-size:14px;font-weight:800;text-align:center;">${mark}</div></td>`);
      if (n < 3) {
        const lineDone = n < p.step;
        cells.push(`<td style="padding:0 4px;"><div style="height:4px;line-height:4px;font-size:0;border-radius:2px;background:${lineDone ? accent : "#E2E8F0"};">&nbsp;</div></td>`);
      }
      const strong = n <= p.step;
      labels.push(`<td width="25%" align="center" valign="top" style="padding:8px 2px 0;${font}font-size:12px;line-height:1.3;font-weight:${current ? 800 : 600};color:${current ? accent : strong ? "#0F172A" : "#94A3B8"};">${e(label)}</td>`);
    });
    return `<tr><td style="padding:8px 28px 4px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${cells.join("")}</tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:2px;"><tr>${labels.join("")}</tr></table>
</td></tr>`;
  })();

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
<tr><td align="center" style="padding:24px 10px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border-radius:14px;overflow:hidden;">

<tr><td style="background:#0B1F44;padding:18px 28px;${font}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td valign="middle">${
    i.logoUrl
      ? `<img src="${e(i.logoUrl)}" width="172" height="56" alt="Norvane Express" style="display:block;border:0;outline:none;height:56px;width:172px;color:#FFFFFF;font-size:20px;font-weight:800;">`
      : `<span style="font-size:20px;font-weight:800;color:#FFFFFF;letter-spacing:3px;">NORVANE</span> <span style="font-size:10px;font-weight:600;color:#CBD5E1;letter-spacing:5px;">EXPRESS</span>`
  }</td>
<td valign="middle" align="right"><a href="${e(i.trackUrl)}" style="${font}font-size:13px;font-weight:700;color:#FFFFFF;text-decoration:none;border:1px solid rgba(255,255,255,0.35);border-radius:6px;padding:8px 12px;display:inline-block;">${e(t("cta"))}</a></td>
</tr></table>
</td></tr>
<tr><td style="height:4px;background:#D62D20;line-height:4px;font-size:0;">&nbsp;</td></tr>
${i.photoUrl ? `<tr><td style="padding:0;line-height:0;font-size:0;"><img src="${e(i.photoUrl)}" width="600" height="220" alt="" style="display:block;border:0;outline:none;width:100%;max-width:600px;height:auto;"></td></tr>` : ""}

<tr><td style="padding:28px 28px 6px;${font}color:#0F172A;">
<p style="margin:0 0 6px;font-size:15px;color:#475569;">${e(greeting)}</p>
<h1 style="margin:0;font-size:28px;line-height:1.2;font-weight:800;color:${accent};">${e(i.statusLabel)}</h1>
${i.statusDescription ? `<p style="margin:8px 0 0;font-size:16px;line-height:1.5;color:#334155;">${e(i.statusDescription)}</p>` : ""}
<p style="margin:12px 0 0;font-size:15px;line-height:1.55;color:#475569;">${e(intro)}</p>
</td></tr>

${tracker}

<tr><td style="padding:18px 28px 4px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;${font}font-size:14px;">
${rows
  .map(
    ([k, v], n) => `<tr>
<td style="padding:12px 16px;${n ? "border-top:1px solid #E2E8F0;" : ""}color:#64748B;width:40%;vertical-align:top;">${e(k)}</td>
<td style="padding:12px 16px;${n ? "border-top:1px solid #E2E8F0;" : ""}color:#0F172A;font-weight:700;vertical-align:top;">${e(v)}</td>
</tr>`,
  )
  .join("\n")}
</table>
<p style="margin:8px 0 0;${font}font-size:12px;color:#94A3B8;">${e(t("timesUtc"))}</p>
</td></tr>

<tr><td align="center" style="padding:22px 28px 6px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td align="center" style="background:#D62D20;border-radius:8px;">
<a href="${e(i.trackUrl)}" style="display:block;padding:15px 20px;${font}font-size:16px;font-weight:800;color:#FFFFFF;text-decoration:none;">${e(t("cta"))} &rarr;</a>
</td></tr></table>
</td></tr>

<tr><td style="padding:18px 28px 24px;${font}font-size:14px;line-height:1.55;color:#334155;">
<p style="margin:0 0 14px;">${linkEmail(e(help))}</p>
<p style="margin:0;padding:10px 12px;border-left:3px solid #CBD5E1;background:#F8FAFC;color:#64748B;font-size:12px;line-height:1.5;">${linkEmail(e(t("safety", { email: supportAddress })))}</p>
</td></tr>

<tr><td style="background:#0B1F44;padding:20px 28px;${font}font-size:12px;line-height:1.5;color:#CBD5E1;">
${e(t("footer"))}<br><br><span style="color:#FFFFFF;font-weight:700;">© ${new Date().getUTCFullYear()} Norvane Express</span>
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
    t("safety", { email: i.supportEmail || "support@norvaneexpress.com" }),
    "",
    "—",
    t("footer"),
  ].join("\n");

  return { subject, html, text };
}
