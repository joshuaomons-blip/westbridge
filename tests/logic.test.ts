import { describe, expect, it } from "vitest";
import { normalizeTrackingNumber, isValidTrackingFormat } from "../src/lib/tracking-format";
import { contactSchema, createShipmentSchema, eventSchema, passwordSchema } from "../src/lib/validation";
import { progressIndex, categoryOf, STATUS_CODES } from "../src/lib/statuses";

describe("tracking numbers", () => {
  it("normalises case, spaces and dashes", () => {
    expect(normalizeTrackingNumber(" wb-1234 5678 901 ")).toBe("WB12345678901");
  });
  it("accepts valid formats and rejects others", () => {
    expect(isValidTrackingFormat("WB12345678901")).toBe(true);
    expect(isValidTrackingFormat("DEMO00000001")).toBe(true);
    expect(isValidTrackingFormat("SHORT")).toBe(false);
    expect(isValidTrackingFormat("WB1234567890!")).toBe(false);
    expect(isValidTrackingFormat("A".repeat(25))).toBe(false);
    expect(isValidTrackingFormat(normalizeTrackingNumber("' or 1=1 --"))).toBe(false);
  });
});

describe("contact form validation", () => {
  const valid = { name: "Anna", email: "anna@example.com", subject: "Delivery", message: "Where is my parcel please?" };
  it("accepts a valid message", () => {
    expect(contactSchema.safeParse(valid).success).toBe(true);
  });
  it("returns translation codes for errors", () => {
    const r = contactSchema.safeParse({ ...valid, email: "nope", message: "short" });
    expect(r.success).toBe(false);
    const codes = r.success ? [] : r.error.issues.map((i) => i.message);
    expect(codes).toContain("emailInvalid");
    expect(codes).toContain("messageShort");
  });
  it("accepts Polish, Japanese, Spanish and German characters", () => {
    expect(contactSchema.safeParse({ ...valid, name: "Zażółć Gęślą", message: "配送について質問があります。ありがとう" }).success).toBe(true);
    expect(contactSchema.safeParse({ ...valid, name: "Jürgen Müßig", subject: "¿Dónde está mi envío?" }).success).toBe(true);
  });
});

describe("shipment validation", () => {
  const base = {
    shipment_type: "parcel",
    sender_name: "Jan Kowalski",
    origin_country: "Poland",
    origin_city: "Kraków",
    recipient_name: "Erika Muster",
    destination_country: "Germany",
    destination_city: "München",
    package_quantity: "2",
    current_status: "shipment_registered",
  };
  it("accepts a minimal shipment", () => {
    const r = createShipmentSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.package_quantity).toBe(2);
      expect(r.data.is_published).toBe(false); // unchecked checkbox
      expect(r.data.sender_email).toBeUndefined();
    }
  });
  it("requires names and places", () => {
    const r = createShipmentSchema.safeParse({ ...base, sender_name: " ", destination_city: "" });
    expect(r.success).toBe(false);
  });
  it("rejects unknown statuses and bad emails", () => {
    expect(createShipmentSchema.safeParse({ ...base, current_status: "teleported" }).success).toBe(false);
    expect(createShipmentSchema.safeParse({ ...base, sender_email: "bad" }).success).toBe(false);
  });
  it("lowercases emails and parses weight", () => {
    const r = createShipmentSchema.safeParse({ ...base, sender_email: "JAN@Example.COM", weight_kg: "3.5", is_published: "on" });
    expect(r.success && r.data.sender_email).toBe("jan@example.com");
    expect(r.success && r.data.weight_kg).toBe(3.5);
    expect(r.success && r.data.is_published).toBe(true);
  });
});

describe("tracking events", () => {
  it("requires a valid status, time and visibility", () => {
    const ok = eventSchema.safeParse({
      shipment_id: "00000000-0000-4000-8000-0000000000a1",
      status_code: "in_transit",
      occurred_at: "2026-10-17T10:00",
      visibility: "internal",
    });
    expect(ok.success).toBe(true);
    expect(eventSchema.safeParse({ shipment_id: "x", status_code: "in_transit", occurred_at: "", visibility: "public" }).success).toBe(false);
  });
});

describe("statuses", () => {
  it("maps every status to a category and progress step", () => {
    for (const s of STATUS_CODES) {
      expect(categoryOf(s)).toBeTruthy();
    }
    expect(progressIndex("shipment_registered")).toBe(0);
    expect(progressIndex("customs_processing")).toBe(1);
    expect(progressIndex("out_for_delivery")).toBe(2);
    expect(progressIndex("delivered")).toBe(3);
    expect(progressIndex("cancelled")).toBe(-1);
  });
});

describe("passwords", () => {
  it("requires length and mixed characters", () => {
    expect(passwordSchema.safeParse("short1").success).toBe(false);
    expect(passwordSchema.safeParse("onlyletterslong").success).toBe(false);
    expect(passwordSchema.safeParse("correct-horse-42-battery").success).toBe(true);
  });
});
