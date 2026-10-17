import { parseRouteStops } from "./journey";
import { z } from "zod";
import { STATUS_CODES } from "@/lib/statuses";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const optionalEmail = z
  .string()
  .trim()
  .max(254)
  .optional()
  .transform((v) => (v ? v.toLowerCase() : undefined))
  .refine((v) => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "Enter a valid email address");

const requiredText = (max: number, label: string) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);

const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
  .optional()
  .transform((v) => v === "on" || v === "true");

export const statusSchema = z.enum(STATUS_CODES);

// ---------------- Public forms ----------------
export const contactSchema = z.object({
  name: z.string().trim().min(1, "nameRequired").max(120, "nameRequired"),
  email: z
    .string()
    .trim()
    .max(254, "emailInvalid")
    .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "emailInvalid"),
  subject: z.string().trim().min(1, "subjectRequired").max(200, "subjectRequired"),
  message: z.string().trim().min(10, "messageShort").max(5000, "messageLong"),
});

// ---------------- Admin forms ----------------
export const shipmentSchema = z.object({
  shipment_type: z.enum(["parcel", "document", "freight", "pallet", "other"]),
  service_id: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => !v || z.string().uuid().safeParse(v).success, "Invalid service"),
  shipment_date: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Invalid date"),
  sender_name: requiredText(200, "Sender name"),
  sender_email: optionalEmail,
  sender_phone: optionalText(40),
  origin_country: requiredText(100, "Origin country"),
  origin_city: requiredText(100, "Origin city"),
  origin_address: optionalText(500),
  recipient_name: requiredText(200, "Recipient name"),
  recipient_email: optionalEmail,
  recipient_phone: optionalText(40),
  destination_country: requiredText(100, "Destination country"),
  destination_city: requiredText(100, "Destination city"),
  destination_address: optionalText(500),
  package_description: optionalText(1000),
  package_quantity: z.coerce.number().int("Whole number").min(1).max(10000),
  weight_kg: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .refine((v) => v === undefined || (Number.isFinite(v) && v > 0 && v < 1_000_000), "Enter a valid weight"),
  estimated_delivery: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Invalid date"),
  internal_notes: optionalText(10000),
  route_stops: z
    .string()
    .max(2000, "Too long")
    .optional()
    .transform((v) => parseRouteStops(v)),
  is_published: checkbox,
});

export const createShipmentSchema = shipmentSchema.extend({
  current_status: statusSchema,
  initial_location: optionalText(200),
  initial_description: optionalText(1000),
  link_sender_as_customer: checkbox,
  customer_id: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => !v || z.string().uuid().safeParse(v).success, "Invalid customer"),
});

export const eventSchema = z.object({
  shipment_id: z.string().uuid(),
  status_code: statusSchema,
  occurred_at: z
    .string()
    .min(1, "Date and time are required")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date and time"),
  location: optionalText(200),
  description: optionalText(1000),
  visibility: z.enum(["public", "internal"]),
});

export const correctEventSchema = z.object({
  event_id: z.string().uuid(),
  shipment_id: z.string().uuid(),
  status_code: statusSchema,
  occurred_at: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date and time"),
  location: optionalText(200),
  description: optionalText(1000),
  visibility: z.enum(["public", "internal"]),
  void_event: checkbox,
  correction_reason: requiredText(1000, "Correction reason"),
});

export const customerSchema = z.object({
  full_name: requiredText(200, "Name"),
  email: optionalEmail,
  phone: optionalText(40),
  company: optionalText(200),
  country: optionalText(100),
  city: optionalText(100),
  address: optionalText(500),
  notes: optionalText(5000),
});

export const inquiryUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "in_progress", "resolved"]),
  internal_notes: optionalText(10000),
});

export const LOCALE_CODES = ["en", "pl", "ja", "es", "de"] as const;

export const serviceSchema = z.object({
  id: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{2,60}$/, "Use 2–60 lowercase letters, numbers or dashes"),
  icon: z.string().regex(/^[a-z0-9-]{1,40}$/),
  sort_order: z.coerce.number().int().min(0).max(10000),
  is_published: checkbox,
});

export const adminInviteSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "Enter a valid email address"),
  full_name: optionalText(120),
  role_code: z.enum(["owner", "manager", "operator", "viewer"]),
});

export const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters")
  .max(128)
  .refine((v) => /[A-Za-z]/.test(v) && /[0-9]/.test(v), "Include letters and numbers");

/** Turns a zod error into { field: message } for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
