"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { adminAction, dbErrorMessage, str, type ActionResult } from "./_util";
import { serviceSchema, LOCALE_CODES, fieldErrors } from "@/lib/validation";
import { CONTENT_FIELDS, CONTENT_FIELD_MAP } from "@/lib/content-fields";
import { SERVICE_ICON_NAMES } from "@/lib/service-icons";
import { getAdmin } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { PREVIEW_COOKIE } from "@/lib/public-data";

const revalidatePublic = () => revalidatePath("/", "layout");

// ---------------------------------------------------------------- Services
export async function saveService(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return adminAction("services.write", async ({ db }) => {
    const parsed = serviceSchema.safeParse({
      id: str(fd, "id"),
      slug: str(fd, "slug"),
      icon: str(fd, "icon"),
      sort_order: str(fd, "sort_order") || "0",
      is_published: str(fd, "is_published"),
    });
    if (!parsed.success) return { fields: fieldErrors(parsed.error) };
    if (!SERVICE_ICON_NAMES.includes(parsed.data.icon)) return { fields: { icon: "Choose an icon from the list" } };

    const title: Record<string, string> = {};
    const description: Record<string, string> = {};
    for (const l of LOCALE_CODES) {
      const t = str(fd, `title_${l}`).trim().slice(0, 200);
      const d = str(fd, `description_${l}`).trim().slice(0, 2000);
      if (t) title[l] = t;
      if (d) description[l] = d;
    }
    if (!title.en) return { fields: { title_en: "An English title is required (used as a fallback)." } };

    const row = { slug: parsed.data.slug, icon: parsed.data.icon, sort_order: parsed.data.sort_order, is_published: parsed.data.is_published, title, description };
    const { error } = parsed.data.id
      ? await db.from("services").update(row).eq("id", parsed.data.id)
      : await db.from("services").insert(row);
    if (error) return { error: error.code === "23505" ? "Another service already uses this URL slug." : dbErrorMessage(error) };
    revalidatePath("/admin/services");
    revalidatePublic();
    return { ok: true, message: parsed.data.id ? "Service saved." : "Service created." };
  });
}

export async function setServicePublished(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return adminAction("services.write", async ({ db }) => {
    const id = z.string().uuid().safeParse(str(fd, "id"));
    if (!id.success) return { error: "Invalid service." };
    const publish = str(fd, "publish") === "true";
    const { error } = await db.from("services").update({ is_published: publish }).eq("id", id.data);
    if (error) return { error: dbErrorMessage(error) };
    revalidatePath("/admin/services");
    revalidatePublic();
    return { ok: true, message: publish ? "Service published." : "Service unpublished." };
  });
}

export async function deleteService(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return adminAction("services.write", async ({ db }) => {
    const id = z.string().uuid().safeParse(str(fd, "id"));
    if (!id.success) return { error: "Invalid service." };
    const { error } = await db.from("services").delete().eq("id", id.data);
    if (error) return { error: dbErrorMessage(error) };
    revalidatePath("/admin/services");
    revalidatePublic();
    return { ok: true, message: "Service deleted." };
  });
}

// ---------------------------------------------------------------- Website content
const contentLocale = z.enum(LOCALE_CODES);

/** Saves drafts for every field on the content page (does not publish). */
export async function saveContentDrafts(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return adminAction("content.write", async ({ db }) => {
    const locale = contentLocale.safeParse(str(fd, "locale"));
    if (!locale.success) return { error: "Invalid language." };
    const publishNow = str(fd, "intent") === "publish";

    const rows: { key: string; locale: string; draft_value: string | null; published_value?: string | null; published_at?: string }[] = [];
    for (const field of CONTENT_FIELDS) {
      if (field.type === "image") continue; // images are saved by the upload action
      const loc = field.localized ? locale.data : "all";
      let value: string | null;
      if (field.type === "toggle") value = fd.get(field.key) === "on" ? "true" : "false";
      else value = str(fd, field.key).trim() || null;
      if (value && value.length > 20000) return { fields: { [field.key]: "Too long" } };
      if (field.type === "email" && value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) return { fields: { [field.key]: "Enter a valid email address" } };
      const row: (typeof rows)[number] = { key: field.key, locale: loc, draft_value: value };
      if (publishNow) {
        row.published_value = value;
        row.published_at = new Date().toISOString();
      }
      rows.push(row);
    }
    const { error } = await db.from("website_content").upsert(rows, { onConflict: "key,locale" });
    if (error) return { error: dbErrorMessage(error) };
    if (publishNow) {
      // Publish image drafts too (they are uploaded separately).
      for (const field of CONTENT_FIELDS.filter((f) => f.type === "image")) {
        const { data: img } = await db.from("website_content").select("draft_value").eq("key", field.key).eq("locale", "all").maybeSingle();
        if (img) {
          const { error: imgErr } = await db
            .from("website_content")
            .update({ published_value: img.draft_value, published_at: new Date().toISOString() })
            .eq("key", field.key)
            .eq("locale", "all");
          if (imgErr) return { error: dbErrorMessage(imgErr) };
        }
      }
      await db.rpc("write_audit_event", { p_action: "content.published", p_table: "website_content", p_record: locale.data, p_summary: `Published website content (${locale.data.toUpperCase()} + shared fields)` });
      revalidatePublic();
    }
    revalidatePath("/admin/content");
    return { ok: true, message: publishNow ? "Published. Changes are now live on the website." : "Draft saved. Use Preview to check it, then Publish." };
  });
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Uploads an image to Supabase Storage after validating type, size and file signature. */
export async function uploadContentImage(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return adminAction("content.write", async ({ db }) => {
    const key = str(fd, "key");
    const field = CONTENT_FIELD_MAP.get(key);
    if (!field || field.type !== "image") return { error: "Unknown image field." };
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) return { error: "Choose an image to upload." };
    if (file.size > MAX_IMAGE_BYTES) return { error: "The image must be 5 MB or smaller." };
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return { error: "Use a JPG, PNG, WebP or AVIF image." };

    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = sniffImage(bytes);
    if (!kind || kind.mime !== file.type) return { error: "The file content does not match an allowed image type." };

    const path = `content/${key.replace(/[^a-z0-9]/g, "-")}-${Date.now()}.${kind.ext}`;
    const { error: upErr } = await db.storage.from("site-media").upload(path, bytes, { contentType: kind.mime, upsert: false, cacheControl: "31536000" });
    if (upErr) return { error: "Upload failed. Check that the storage bucket exists (see README)." };
    const { data } = db.storage.from("site-media").getPublicUrl(path);

    const { error } = await db.from("website_content").upsert({ key, locale: "all", draft_value: data.publicUrl }, { onConflict: "key,locale" });
    if (error) return { error: dbErrorMessage(error) };
    revalidatePath("/admin/content");
    return { ok: true, message: "Image uploaded as a draft. Publish to make it live." };
  });
}

export async function removeContentImage(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return adminAction("content.write", async ({ db }) => {
    const key = str(fd, "key");
    if (CONTENT_FIELD_MAP.get(key)?.type !== "image") return { error: "Unknown image field." };
    const { error } = await db.from("website_content").upsert({ key, locale: "all", draft_value: null }, { onConflict: "key,locale" });
    if (error) return { error: dbErrorMessage(error) };
    revalidatePath("/admin/content");
    return { ok: true, message: "Image removed from the draft. Publish to apply." };
  });
}

function sniffImage(b: Uint8Array): { mime: string; ext: string } | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { mime: "image/png", ext: "png" };
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { mime: "image/webp", ext: "webp" };
  if (ascii(4, 8) === "ftyp" && /avi[fs]/.test(ascii(8, 12))) return { mime: "image/avif", ext: "avif" };
  return null;
}

/** Turns on draft preview for this browser (admins only) and opens the public site. */
export async function startPreview(fd: FormData): Promise<void> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  const locale = contentLocale.safeParse(str(fd, "locale"));
  (await cookies()).set(PREVIEW_COOKIE, "1", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 });
  redirect(`/${locale.success ? locale.data : "en"}`);
}

export async function stopPreview(): Promise<void> {
  (await cookies()).delete(PREVIEW_COOKIE);
  redirect("/admin/content");
}

// ---------------------------------------------------------------- Translations
export async function saveTranslation(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return adminAction("translations.write", async ({ db }) => {
    const locale = contentLocale.safeParse(str(fd, "locale"));
    const key = z.string().regex(/^[A-Za-z0-9_.]{2,150}$/).safeParse(str(fd, "message_key"));
    if (!locale.success || !key.success) return { error: "Invalid translation key." };
    const value = str(fd, "value").trim();
    if (value.length > 5000) return { error: "Text is too long." };
    if (!value) {
      const { error } = await db.from("translation_content").delete().eq("locale", locale.data).eq("message_key", key.data);
      if (error) return { error: dbErrorMessage(error) };
    } else {
      const { error } = await db.from("translation_content").upsert({ locale: locale.data, message_key: key.data, value, is_published: true }, { onConflict: "locale,message_key" });
      if (error) return { error: dbErrorMessage(error) };
    }
    revalidatePublic();
    revalidatePath("/admin/translations");
    return { ok: true, message: value ? "Saved — live on the website." : "Reset to the default text." };
  });
}

// ---------------------------------------------------------------- Settings
export async function saveSettings(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return adminAction("settings.write", async ({ db }) => {
    const prefix = str(fd, "tracking_prefix").trim().toUpperCase();
    if (!/^[A-Z]{2,4}$/.test(prefix)) return { fields: { tracking_prefix: "Use 2–4 letters (A–Z)." } };
    const demo = fd.get("demo_mode") === "on";
    const { error: e1 } = await db.from("site_settings").update({ value: prefix }).eq("key", "tracking_prefix");
    const { error: e2 } = await db.from("site_settings").update({ value: demo }).eq("key", "demo_mode");
    const err = e1 ?? e2;
    if (err) return { error: dbErrorMessage(err) };
    revalidatePublic();
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Settings saved." };
  });
}

export async function updateMyName(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return { error: "You are signed out." };
  const name = str(fd, "full_name").trim().slice(0, 120);
  const db = await createSessionClient();
  const { error } = await db.rpc("update_my_profile", { p_full_name: name });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Name updated." };
}
