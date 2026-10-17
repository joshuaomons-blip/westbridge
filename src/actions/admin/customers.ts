"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { adminAction, dbErrorMessage, str, type ActionResult } from "./_util";
import { customerSchema, inquiryUpdateSchema, fieldErrors } from "@/lib/validation";

function customerPayload(fd: FormData) {
  return customerSchema.safeParse({
    full_name: str(fd, "full_name"),
    email: str(fd, "email"),
    phone: str(fd, "phone"),
    company: str(fd, "company"),
    country: str(fd, "country"),
    city: str(fd, "city"),
    address: str(fd, "address"),
    notes: str(fd, "notes"),
  });
}

const nullify = <T extends Record<string, unknown>>(o: T) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === undefined ? null : v]));

export async function createCustomer(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const result = await adminAction("customers.write", async ({ db }) => {
    const parsed = customerPayload(fd);
    if (!parsed.success) return { fields: fieldErrors(parsed.error) };
    const { data, error } = await db.from("customers").insert(nullify(parsed.data)).select("id").single();
    if (error) return { error: error.code === "23505" ? "A customer with this email already exists." : dbErrorMessage(error) };
    return { ok: true, data: { id: data.id } };
  });
  if (result.ok && result.data?.id) {
    revalidatePath("/admin/customers");
    redirect(`/admin/customers/${result.data.id}?notice=saved`);
  }
  return result;
}

export async function updateCustomer(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return adminAction("customers.write", async ({ db }) => {
    const id = z.string().uuid().safeParse(str(fd, "id"));
    if (!id.success) return { error: "Invalid customer." };
    const parsed = customerPayload(fd);
    if (!parsed.success) return { fields: fieldErrors(parsed.error) };
    const { error } = await db.from("customers").update(nullify(parsed.data)).eq("id", id.data);
    if (error) return { error: error.code === "23505" ? "Another customer already uses this email." : dbErrorMessage(error) };
    revalidatePath(`/admin/customers/${id.data}`);
    return { ok: true, message: "Customer saved." };
  });
}

export async function setCustomerArchived(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return adminAction("customers.write", async ({ db }) => {
    const id = z.string().uuid().safeParse(str(fd, "id"));
    if (!id.success) return { error: "Invalid customer." };
    const archive = str(fd, "archive") === "true";
    const { error } = await db.from("customers").update({ archived_at: archive ? new Date().toISOString() : null }).eq("id", id.data);
    if (error) return { error: dbErrorMessage(error) };
    revalidatePath(`/admin/customers/${id.data}`);
    revalidatePath("/admin/customers");
    return { ok: true, message: archive ? "Customer archived." : "Customer restored." };
  });
}

export async function updateInquiry(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return adminAction("inquiries.write", async ({ db }) => {
    const parsed = inquiryUpdateSchema.safeParse({ id: str(fd, "id"), status: str(fd, "status"), internal_notes: str(fd, "internal_notes") });
    if (!parsed.success) return { fields: fieldErrors(parsed.error) };
    const { error } = await db
      .from("contact_inquiries")
      .update({ status: parsed.data.status, internal_notes: parsed.data.internal_notes ?? null })
      .eq("id", parsed.data.id);
    if (error) return { error: dbErrorMessage(error) };
    revalidatePath(`/admin/inquiries/${parsed.data.id}`);
    revalidatePath("/admin/inquiries");
    return { ok: true, message: "Inquiry updated." };
  });
}

export async function setInquiryArchived(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return adminAction("inquiries.write", async ({ db }) => {
    const id = z.string().uuid().safeParse(str(fd, "id"));
    if (!id.success) return { error: "Invalid inquiry." };
    const archive = str(fd, "archive") === "true";
    const { error } = await db.from("contact_inquiries").update({ archived_at: archive ? new Date().toISOString() : null }).eq("id", id.data);
    if (error) return { error: dbErrorMessage(error) };
    revalidatePath(`/admin/inquiries/${id.data}`);
    revalidatePath("/admin/inquiries");
    return { ok: true, message: archive ? "Inquiry archived." : "Inquiry restored." };
  });
}
