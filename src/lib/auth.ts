import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export const PERMISSIONS = [
  "shipments.read",
  "shipments.write",
  "shipments.archive",
  "events.write",
  "customers.read",
  "customers.write",
  "inquiries.read",
  "inquiries.write",
  "services.write",
  "content.write",
  "translations.write",
  "logs.read",
  "admins.manage",
  "settings.write",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export type AdminContext = {
  id: string;
  email: string;
  full_name: string | null;
  role_code: string;
  role_name: string;
  permissions: Permission[];
};

/**
 * The signed-in, ACTIVE administrator — verified with Supabase Auth on the
 * server (getUser validates the token) and looked up in the database.
 */
export const getAdmin = cache(async (): Promise<AdminContext | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.rpc("my_admin_context");
  if (error || !data) return null;
  return data as AdminContext;
});

export function can(admin: AdminContext | null, permission: Permission): boolean {
  return !!admin && admin.permissions.includes(permission);
}

/** For pages: redirect to login if not an active administrator. */
export async function requireAdmin(): Promise<AdminContext> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login?reason=unauthorized");
  return admin;
}

/** For pages: require a specific permission. */
export async function requirePermission(permission: Permission): Promise<AdminContext> {
  const admin = await requireAdmin();
  if (!can(admin, permission)) redirect("/admin/dashboard?denied=1");
  return admin;
}

export class AuthorizationError extends Error {}

/** For server actions: throws instead of redirecting. */
export async function assertPermission(permission: Permission): Promise<AdminContext> {
  const admin = await getAdmin();
  if (!admin) throw new AuthorizationError("You are signed out. Please sign in again.");
  if (!can(admin, permission)) throw new AuthorizationError("Your role does not allow this action.");
  return admin;
}
