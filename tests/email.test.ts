import { describe, expect, it } from "vitest";
import { readFileSync, writeFileSync } from "fs";
import { escapeHtml, renderShipmentEmail, type ShipmentEmailInput } from "../src/lib/email/shipment-template";

const langs = ["en", "pl", "ja", "es", "de"] as const;
const load = (l: string) => JSON.parse(readFileSync(new URL(`../messages/${l}.json`, import.meta.url), "utf8"));
const translator = (l: string) => {
  const m = load(l).email as Record<string, string>;
  return (key: string, vars: Record<string, string> = {}) => {
    const s = m[key];
    if (s === undefined) throw new Error(`missing email.${key} in ${l}`);
    return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
  };
};

const base: ShipmentEmailInput = {
  kind: "update",
  role: "recipient",
  name: "Anna Kowalska",
  trackingNumber: "NV09790764000",
  statusLabel: "In transit",
  statusDescription: "The shipment is on its way.",
  category: "active",
  location: "Berlin, DE",
  note: "Departed the sorting centre",
  occurredAt: "18 Oct 2026, 09:00 UTC",
  origin: "Warsaw, Poland",
  destination: "Brussels, Belgium",
  estimatedDelivery: "20 Oct 2026",
  trackUrl: "https://norvane-express.vercel.app/en/track?n=NV09790764000",
  supportEmail: "joshuaomons@gmail.com",
  lang: "en",
};

describe("shipment email", () => {
  it("renders every kind and role in all five languages", () => {
    for (const l of langs) {
      const t = translator(l);
      for (const kind of ["created", "update", "delivered"] as const) {
        for (const role of ["sender", "recipient"] as const) {
          const r = renderShipmentEmail(t, { ...base, kind, role, lang: l });
          expect(r.subject).toContain("NV09790764000");
          expect(r.html).toContain(base.trackUrl);
          expect(r.text).toContain(base.trackUrl);
          expect(r.html.includes("{")).toBe(false);
        }
      }
    }
  });

  it("escapes anything typed by staff or customers", () => {
    const r = renderShipmentEmail(translator("en"), { ...base, name: '<script>alert(1)</script>', note: 'a "quoted" <b>note</b>' });
    expect(r.html.includes("<script>")).toBe(false);
    expect(r.html).toContain("&lt;b&gt;note&lt;/b&gt;");
    expect(escapeHtml(`<&>"'`)).toBe("&lt;&amp;&gt;&quot;&#39;");
  });

  it("uses a generic greeting without a name and hides the estimate once delivered", () => {
    const r = renderShipmentEmail(translator("en"), { ...base, kind: "delivered", category: "delivered", name: null, statusLabel: "Delivered" });
    expect(r.text).toContain("Hello,");
    expect(r.text.includes("Estimated delivery")).toBe(false);
    expect(r.subject).toBe("Your shipment NV09790764000 has been delivered");
  });

  it("writes previews", () => {
    const out = process.env.EMAIL_PREVIEW_DIR;
    if (!out) return;
    writeFileSync(`${out}/en-created.html`, renderShipmentEmail(translator("en"), { ...base, kind: "created", role: "sender", category: "pending", statusLabel: "Shipment registered", statusDescription: "The shipment has been registered in our system.", location: "Warsaw, PL", note: null }).html);
    writeFileSync(`${out}/pl-update.html`, renderShipmentEmail(translator("pl"), { ...base, lang: "pl", statusLabel: "W transporcie", statusDescription: "Przesyłka jest w drodze." }).html);
  });
});
