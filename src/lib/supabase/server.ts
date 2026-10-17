import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { requireSupabaseEnv } from "@/lib/env";

/**
 * Supabase client bound to the signed-in user's session (cookies).
 * Every query runs with that user's rights, so Row Level Security applies.
 */
export async function createSessionClient() {
  const { url, anonKey } = requireSupabaseEnv();
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: cookies are refreshed by the middleware instead.
        }
      },
    },
  });
}

/** Anonymous client with no session — used for public, read-only lookups. */
export function createPublicClient() {
  const { url, anonKey } = requireSupabaseEnv();
  return createPlainClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
