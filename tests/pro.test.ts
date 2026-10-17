import { describe, expect, it } from "vitest";
import { safeSocialUrl, supportHref, whatsappHref } from "../src/lib/support";
import { pickupSchema } from "../src/lib/validation";

describe("contact links", () => {
  it("builds WhatsApp links from common phone formats", () => {
    expect(whatsappHref("+234 801 234 5678")).toBe("https://wa.me/2348012345678");
    expect(whatsappHref("123")).toBe(null);
    expect(whatsappHref(undefined)).toBe(null);
  });
  it("only accepts https links to the right social network", () => {
    expect(safeSocialUrl("instagram", "https://www.instagram.com/norvaneexpress")).toBe("https://www.instagram.com/norvaneexpress");
    expect(safeSocialUrl("instagram", "https://evil.example/instagram.com")).toBe(null);
    expect(safeSocialUrl("facebook", "javascript:alert(1)")).toBe(null);
    expect(safeSocialUrl("x", "http://x.com/a")).toBe(null);
  });
  it("makes mailto links only for valid emails", () => {
    expect(supportHref("a@b.co", "Hi there")).toBe("mailto:a@b.co?subject=Hi%20there");
    expect(supportHref("not-an-email")).toBe(null);
  });
});

describe("pickup request validation", () => {
  const ok = {
    name: "Ada", email: "ada@example.com", phone: "+234 801 234 5678", pickup_city: "Lagos",
    dest_country: "Poland", dest_city: "Warsaw", shipment_type: "parcel", packages: "2", weight: "3.5",
  };
  it("accepts a complete request", () => {
    const r = pickupSchema.safeParse(ok);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.weight).toBe(3.5);
  });
  it("reports translation codes for bad fields", () => {
    const r = pickupSchema.safeParse({ ...ok, email: "x", phone: "abc", packages: "0", pickup_date: "2000-01-01" });
    const codes = r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message]));
    expect(codes).toEqual({ email: "emailInvalid", phone: "phoneInvalid", packages: "numberInvalid", pickup_date: "dateInvalid" });
  });
});
