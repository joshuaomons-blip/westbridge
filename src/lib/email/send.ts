import "server-only";

/**
 * Sends email through Resend (https://resend.com) using its HTTP API.
 * Configure in Vercel → Settings → Environment Variables:
 *   RESEND_API_KEY  – secret API key from Resend
 *   EMAIL_FROM      – e.g. "Norvane Express <updates@norvaneexpress.com>" (a domain verified in Resend)
 * Without these, nothing is sent and callers get { skipped: true }.
 */
export type SendResult = { ok: true; id?: string } | { ok: false; skipped?: boolean; error: string };

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(msg: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string | null;
  idempotencyKey?: string;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return { ok: false, skipped: true, error: "not_configured" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(msg.idempotencyKey ? { "Idempotency-Key": msg.idempotencyKey.slice(0, 256) } : {}),
      },
      body: JSON.stringify({
        from,
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
        headers: { "X-Entity-Ref-ID": msg.idempotencyKey ?? crypto.randomUUID() },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string; name?: string };
      console.error("email send failed", res.status, body.name);
      return { ok: false, error: body.message?.slice(0, 200) || `HTTP ${res.status}` };
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: data.id };
  } catch (e) {
    console.error("email send error", e instanceof Error ? e.name : "unknown");
    return { ok: false, error: "network" };
  }
}
