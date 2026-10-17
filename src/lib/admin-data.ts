import "server-only";
import { createSessionClient } from "@/lib/supabase/server";

export async function getServiceOptions(): Promise<{ id: string; label: string }[]> {
  const db = await createSessionClient();
  const { data } = await db.from("services").select("id, slug, title, is_published").order("sort_order");
  return (data ?? []).map((s) => ({
    id: s.id as string,
    label: `${(s.title as Record<string, string>)?.en || s.slug}${s.is_published ? "" : " (unpublished)"}`,
  }));
}
