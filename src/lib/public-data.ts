import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/server";
import { getSiteContent } from "@/lib/content";

export const PREVIEW_COOKIE = "wb_preview";

/** Website content for the current request (draft preview only for verified admins). */
export async function getPageContent(locale: string) {
  const wantPreview = (await cookies()).get(PREVIEW_COOKIE)?.value === "1";
  return getSiteContent(locale, wantPreview);
}

export const getPublicSettings = cache(async (): Promise<{ demo_mode: boolean }> => {
  if (!isSupabaseConfigured()) return { demo_mode: false };
  try {
    const { data } = await createPublicClient().rpc("get_public_settings");
    return { demo_mode: Boolean((data as { demo_mode?: boolean } | null)?.demo_mode) };
  } catch {
    return { demo_mode: false };
  }
});

export type PublicService = {
  id: string;
  slug: string;
  icon: string;
  title: Record<string, string>;
  description: Record<string, string>;
  sort_order: number;
};

export const getPublishedServices = cache(async (): Promise<PublicService[]> => {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await createPublicClient()
      .from("services")
      .select("id, slug, icon, title, description, sort_order")
      .eq("is_published", true)
      .order("sort_order");
    return error || !data ? [] : (data as PublicService[]);
  } catch {
    return [];
  }
});

/** Picks the text for a language, falling back to English. */
export function localized(map: Record<string, string> | null | undefined, locale: string): string {
  if (!map) return "";
  return map[locale]?.trim() || map.en?.trim() || "";
}
