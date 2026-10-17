import "server-only";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/server";

export type TranslationOverride = { message_key: string; value: string };

/** Published interface-text overrides for a language (empty if unavailable). */
export const getTranslationOverrides = cache(async (locale: string): Promise<TranslationOverride[]> => {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await createPublicClient().rpc("get_translation_overrides", { p_locale: locale });
    if (error || !data) return [];
    return data as TranslationOverride[];
  } catch {
    return [];
  }
});
