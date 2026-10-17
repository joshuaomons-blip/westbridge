"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminAction, dbErrorMessage, str, type ActionResult } from "./_util";
import { adminInviteSchema, fieldErrors } from "@/lib/validation";
import { createServiceClient, isServiceRoleConfigured } from "@/lib/supabase/service";
import { env } from "@/lib/env";

const ROLES = z.enum(["owner", "manager", "operator", "viewer"]);

/**
 * Invites a new administrator by email. The service-role key is used ONLY
 * here, after verifying on the server that the caller may manage admins.
 */
export async function inviteAdmin(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return adminAction("admins.manage", async ({ admin, db }) => {
    if (!isServiceRoleConfigured()) return { error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server (see README)." };
    const parsed = adminInviteSchema.safeParse({ email: str(fd, "email"), full_name: str(fd, "full_name"), role_code: str(fd, "role_code") });
    if (!parsed.success) return { fields: fieldErrors(parsed.error) };
    const { email, full_name, role_code } = parsed.data;

    const service = createServiceClient();
    const { data: invited, error: inviteErr } = await service.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${env.siteUrl}/admin/update-password?welcome=invite`,
      data: { full_name: full_name ?? null },
    });
    if (inviteErr || !invited?.user) {
      const exists = inviteErr?.message?.toLowerCase().includes("already");
      return { error: exists ? "A user with this email already exists. Change their role below instead, or ask them to reset their password." : "The invitation could not be sent. Check the email settings in Supabase." };
    }

    const { error } = await service.from("administrator_profiles").upsert(
      { id: invited.user.id, email, full_name: full_name ?? null, role_code, is_active: true, created_by: admin.id },
      { onConflict: "id" },
    );
    if (error) return { error: dbErrorMessage(error) };
    await db.rpc("write_audit_event", { p_action: "admin.invited", p_table: "administrator_profiles", p_record: invited.user.id, p_summary: `Invited ${email} as ${role_code}` });
    revalidatePath("/admin/admins");
    return { ok: true, message: `Invitation sent to ${email}.` };
  });
}

export async function updateAdminAccess(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return adminAction("admins.manage", async ({ admin, db }) => {
    const id = z.string().uuid().safeParse(str(fd, "id"));
    const role = ROLES.safeParse(str(fd, "role_code"));
    if (!id.success || !role.success) return { error: "Invalid request." };
    const active = fd.get("is_active") === "on";
    if (id.data === admin.id && (!active || role.data !== admin.role_code)) {
      return { error: "You can't change your own role or deactivate your own account. Ask another owner." };
    }
    const { data, error } = await db.from("administrator_profiles").update({ role_code: role.data, is_active: active }).eq("id", id.data).select("id");
    if (error) return { error: dbErrorMessage(error) };
    if (!data?.length) return { error: "Account not found." };
    revalidatePath("/admin/admins");
    return { ok: true, message: "Access updated." };
  });
}
