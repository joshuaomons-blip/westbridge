import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import { AuthorizationError, assertPermission, type AdminContext, type Permission } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";

export type ActionResult = {
  ok?: boolean;
  message?: string;
  error?: string;
  fields?: Record<string, string>;
  /** optional payload, e.g. a new id */
  data?: Record<string, string>;
};

export const idle: ActionResult = {};

/** Friendly message for a database error (never leaks internals). */
export function dbErrorMessage(error: Pick<PostgrestError, "code" | "message">): string {
  switch (error.code) {
    case "23505":
      return "A record with this value already exists.";
    case "42501":
      return error.message?.includes("row-level security")
        ? "Your role does not allow this change."
        : safeRaise(error.message) ?? "Your role does not allow this change.";
    case "22023":
      return safeRaise(error.message) ?? "The submitted values are not valid.";
    case "23514":
      return "One of the values is not valid (too long or wrong format).";
    case "23503":
      return "This record is linked to another record that no longer exists.";
    case "PGRST116":
      return "Record not found.";
    default:
      console.error("database error", error.code);
      return "The change could not be saved. Please try again.";
  }
}

/** Messages raised by our own database functions are written for humans and safe to show. */
function safeRaise(message?: string): string | undefined {
  if (!message) return undefined;
  if (message.length > 200 || /relation|column|syntax|function|constraint/i.test(message)) return undefined;
  return message.charAt(0).toUpperCase() + message.slice(1) + (message.endsWith(".") ? "" : ".");
}

/**
 * Runs an admin action: verifies the permission on the server, provides a
 * session-bound Supabase client (so RLS applies too), and converts failures
 * into a user-facing result.
 */
export async function adminAction(
  permission: Permission,
  fn: (ctx: { admin: AdminContext; db: Awaited<ReturnType<typeof createSessionClient>> }) => Promise<ActionResult>,
): Promise<ActionResult> {
  try {
    const admin = await assertPermission(permission);
    const db = await createSessionClient();
    return await fn({ admin, db });
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: e.message };
    // Let Next.js redirects / notFound propagate.
    if (e && typeof e === "object" && "digest" in e) throw e;
    console.error("admin action failed", e instanceof Error ? e.message : "unknown");
    return { error: "Something went wrong. Please try again." };
  }
}

export function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}

/** Converts a datetime-local value (entered in UTC) to an ISO timestamp. */
export function utcFromLocalInput(value: string): string {
  const v = value.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return new Date(v + ":00Z").toISOString();
  return new Date(v).toISOString();
}
