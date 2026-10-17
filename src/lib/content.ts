import "server-only";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { createPublicClient, createSessionClient } from "@/lib/supabase/server";
import { CONTENT_FIELD_MAP } from "@/lib/content-fields";
import { getAdmin } from "@/lib/auth";

export type SiteContent = {
  /** Returns the value for this page's language (or the shared value), or undefined to use the default text. */
  get(key: string): string | undefined;
  isVisible(sectionKey: string): boolean;
  preview: boolean;
};

type Row = { key: string; locale: string; value: string | null };

async function loadPublished(locale: string): Promise<Row[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await createPublicClient().rpc("get_published_content", { p_locale: locale });
    return error || !data ? [] : (data as Row[]);
  } catch {
    return [];
  }
}

/** Draft values (falling back to published) — only for signed-in administrators. */
async function loadPreview(locale: string): Promise<Row[] | null> {
  const admin = await getAdmin();
  if (!admin) return null;
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("website_content")
    .select("key, locale, draft_value, published_value")
    .in("locale", [locale, "all"]);
  if (error || !data) return null;
  return data.map((r) => ({ key: r.key, locale: r.locale, value: r.draft_value ?? r.published_value }));
}

export const getSiteContent = cache(async (locale: string, wantPreview = false): Promise<SiteContent> => {
  let rows: Row[] = [];
  let preview = false;
  if (wantPreview) {
    const p = await loadPreview(locale);
    if (p) {
      rows = p;
      preview = true;
    }
  }
  if (!preview) rows = await loadPublished(locale);

  const map = new Map<string, string>();
  for (const r of rows) {
    if (r.value == null || r.value.trim() === "") continue;
    const field = CONTENT_FIELD_MAP.get(r.key);
    const wanted = field ? (field.localized ? locale : "all") : r.locale;
    if (r.locale === wanted) map.set(r.key, r.value);
  }

  return {
    preview,
    get: (key) => map.get(key),
    isVisible: (key) => map.get(key) !== "false",
  };
});

/** Splits plain text into paragraphs (blank-line separated). Rendered as text, never as HTML. */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
