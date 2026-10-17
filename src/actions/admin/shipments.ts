"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { adminAction, dbErrorMessage, str, utcFromLocalInput, type ActionResult } from "./_util";
import { createShipmentSchema, shipmentSchema, eventSchema, correctEventSchema, fieldErrors } from "@/lib/validation";

function formObject(fd: FormData) {
  const o: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") o[k] = v;
  return o;
}

export async function createShipment(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const result = await adminAction("shipments.write", async ({ db }) => {
    const parsed = createShipmentSchema.safeParse(formObject(fd));
    if (!parsed.success) return { fields: fieldErrors(parsed.error) };
    const p = parsed.data;
    const { route_stops: _routeStops, ...rest } = p;
    const payload = {
      ...rest,
      package_quantity: String(p.package_quantity),
      weight_kg: p.weight_kg === undefined ? "" : String(p.weight_kg),
      is_published: String(p.is_published),
      link_sender_as_customer: String(p.link_sender_as_customer),
    };
    const { data, error } = await db.rpc("create_shipment", { p: payload });
    if (error) return { error: dbErrorMessage(error) };
    const id = (data as { id: string }).id;
    if (p.route_stops.length) {
      const { error: routeError } = await db.from("shipments").update({ route_stops: p.route_stops }).eq("id", id);
      if (routeError) console.error("route stops not saved", routeError.code);
    }
    return { ok: true, data: { id } };
  });
  if (result.ok && result.data?.id) {
    revalidatePath("/admin/shipments");
    redirect(`/admin/shipments/${result.data.id}?notice=created`);
  }
  return result;
}

export async function updateShipment(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return adminAction("shipments.write", async ({ db }) => {
    const id = z.string().uuid().safeParse(str(fd, "id"));
    if (!id.success) return { error: "Invalid shipment." };
    const parsed = shipmentSchema.safeParse(formObject(fd));
    if (!parsed.success) return { fields: fieldErrors(parsed.error) };
    const p = parsed.data;
    const { error } = await db
      .from("shipments")
      .update({
        shipment_type: p.shipment_type,
        service_id: p.service_id ?? null,
        shipment_date: p.shipment_date ?? undefined,
        sender_name: p.sender_name,
        sender_email: p.sender_email ?? null,
        sender_phone: p.sender_phone ?? null,
        origin_country: p.origin_country,
        origin_city: p.origin_city,
        origin_address: p.origin_address ?? null,
        recipient_name: p.recipient_name,
        recipient_email: p.recipient_email ?? null,
        recipient_phone: p.recipient_phone ?? null,
        destination_country: p.destination_country,
        destination_city: p.destination_city,
        destination_address: p.destination_address ?? null,
        package_description: p.package_description ?? null,
        package_quantity: p.package_quantity,
        weight_kg: p.weight_kg ?? null,
        estimated_delivery: p.estimated_delivery ?? null,
        internal_notes: p.internal_notes ?? null,
        route_stops: p.route_stops,
        is_published: p.is_published,
      })
      .eq("id", id.data);
    if (error) return { error: dbErrorMessage(error) };
    revalidatePath(`/admin/shipments/${id.data}`);
    return { ok: true, message: "Shipment details saved." };
  });
}

export async function addShipmentEvent(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return adminAction("events.write", async ({ db }) => {
    const parsed = eventSchema.safeParse(formObject(fd));
    if (!parsed.success) return { fields: fieldErrors(parsed.error) };
    const e = parsed.data;
    const { error } = await db.from("shipment_events").insert({
      shipment_id: e.shipment_id,
      status_code: e.status_code,
      occurred_at: utcFromLocalInput(e.occurred_at),
      location: e.location ?? null,
      description: e.description ?? null,
      visibility: e.visibility,
    });
    if (error) return { error: dbErrorMessage(error) };
    revalidatePath(`/admin/shipments/${e.shipment_id}`);
    revalidatePath("/admin/events");
    return {
      ok: true,
      message: e.visibility === "public" ? "Tracking event published." : "Internal event recorded (not visible to customers).",
    };
  });
}

export async function correctShipmentEvent(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return adminAction("events.write", async ({ db }) => {
    const parsed = correctEventSchema.safeParse(formObject(fd));
    if (!parsed.success) return { fields: fieldErrors(parsed.error) };
    const e = parsed.data;
    const { data, error } = await db
      .from("shipment_events")
      .update({
        status_code: e.status_code,
        occurred_at: utcFromLocalInput(e.occurred_at),
        location: e.location ?? null,
        description: e.description ?? null,
        visibility: e.visibility,
        is_voided: e.void_event,
        correction_reason: e.correction_reason,
      })
      .eq("id", e.event_id)
      .eq("shipment_id", e.shipment_id)
      .select("id");
    if (error) return { error: dbErrorMessage(error) };
    if (!data?.length) return { error: "Event not found or you cannot change it." };
    revalidatePath(`/admin/shipments/${e.shipment_id}`);
    return { ok: true, message: e.void_event ? "Event voided. The change is recorded in the audit history." : "Correction saved and recorded in the audit history." };
  });
}

export async function setShipmentArchived(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return adminAction("shipments.archive", async ({ db }) => {
    const id = z.string().uuid().safeParse(str(fd, "id"));
    if (!id.success) return { error: "Invalid shipment." };
    const archive = str(fd, "archive") === "true";
    const { error } = await db
      .from("shipments")
      .update({ archived_at: archive ? new Date().toISOString() : null })
      .eq("id", id.data);
    if (error) return { error: dbErrorMessage(error) };
    revalidatePath(`/admin/shipments/${id.data}`);
    revalidatePath("/admin/shipments");
    return { ok: true, message: archive ? "Shipment archived." : "Shipment restored." };
  });
}

export async function setShipmentPublished(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return adminAction("shipments.write", async ({ db }) => {
    const id = z.string().uuid().safeParse(str(fd, "id"));
    if (!id.success) return { error: "Invalid shipment." };
    const publish = str(fd, "publish") === "true";
    const { error } = await db.from("shipments").update({ is_published: publish }).eq("id", id.data);
    if (error) return { error: dbErrorMessage(error) };
    revalidatePath(`/admin/shipments/${id.data}`);
    return { ok: true, message: publish ? "Tracking page is now public." : "Tracking page hidden from the public." };
  });
}
