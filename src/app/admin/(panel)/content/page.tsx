import type { Metadata } from "next";
import Link from "next/link";
import { Eye, Upload } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { CONTENT_FIELDS, type ContentField } from "@/lib/content-fields";
import { PageHeader, Panel, Badge, ErrorState, one } from "@/components/admin/ui";
import { ActionForm, FieldError, SubmitButton } from "@/components/admin/ActionForm";
import { removeContentImage, saveContentDrafts, startPreview, uploadContentImage } from "@/actions/admin/site";
import { cn } from "@/lib/format";
import en from "../../../../../messages/en.json";

export const metadata: Metadata = { title: "Website content" };

const LANGS = [
  { code: "en", label: "English" },
  { code: "pl", label: "Polski" },
  { code: "ja", label: "日本語" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
] as const;

/** Default text shown as a placeholder (what visitors see when a field is empty). */
const DEFAULTS: Record<string, string> = {
  "home.hero_title": en.home.heroTitle,
  "home.hero_subtitle": en.home.heroSubtitle,
  "about.title": en.about.title,
  "about.body": en.about.placeholderBody,
  "footer.text": en.footer.description,
  "support.text": en.home.supportText,
  "privacy.body": "(placeholder privacy text with a review notice)",
  "terms.body": "(placeholder terms text with a review notice)",
};

type Row = { key: string; locale: string; draft_value: string | null; published_value: string | null };

export default async function ContentPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("content.write");
  const sp = await searchParams;
  const requested = one(sp.locale);
  const locale = LANGS.find((l) => l.code === requested)?.code ?? "en";
  const db = await createSessionClient();
  const { data, error } = await db.from("website_content").select("key, locale, draft_value, published_value").in("locale", [locale, "all"]);
  const rows = (data ?? []) as Row[];
  const rowFor = (f: ContentField) => rows.find((r) => r.key === f.key && r.locale === (f.localized ? locale : "all"));
  const pending = CONTENT_FIELDS.filter((f) => {
    const r = rowFor(f);
    return r && (r.draft_value ?? null) !== (r.published_value ?? null);
  }).length;

  const groups = Array.from(new Set(CONTENT_FIELDS.map((f) => f.group)));
  const imageFields = CONTENT_FIELDS.filter((f) => f.type === "image");

  return (
    <>
      <PageHeader
        title="Website content"
        description="Edit text and images without touching code. Save a draft, preview it, then publish."
        actions={
          <form action={startPreview}>
            <input type="hidden" name="locale" value={locale} />
            <button type="submit" className="btn-outline">
              <Eye className="h-4 w-4" aria-hidden /> Preview drafts
            </button>
          </form>
        }
      />

      <nav aria-label="Language" className="mb-5 flex flex-wrap gap-1 rounded-lg bg-white p-1 shadow-sm ring-1 ring-slate-200 sm:inline-flex">
        {LANGS.map((l) => (
          <Link
            key={l.code}
            href={`/admin/content?locale=${l.code}`}
            aria-current={l.code === locale ? "page" : undefined}
            className={cn("rounded-md px-3.5 py-1.5 text-sm font-medium", l.code === locale ? "bg-navy-800 text-white" : "text-slate-600 hover:bg-slate-100")}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      {error && <ErrorState />}
      {pending > 0 && (
        <p className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {pending} field{pending > 1 ? "s have" : " has"} unpublished changes for this language.
        </p>
      )}

      {imageFields.map((f) => {
        const r = rowFor(f);
        const draft = r?.draft_value;
        return (
          <Panel key={f.key} title={f.label} description={f.help} className="mb-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-start">
              <div className="flex aspect-[16/9] w-full max-w-sm items-center justify-center overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200">
                {draft ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draft} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm text-slate-400">No image — the illustrated background is used.</span>
                )}
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex gap-2">
                  {r && r.draft_value !== r.published_value && <Badge tone="amber">Unpublished change</Badge>}
                  {r?.published_value && <Badge tone="green">Live image set</Badge>}
                </div>
                <ActionForm action={uploadContentImage} encType="multipart/form-data" className="space-y-3">
                  <input type="hidden" name="key" value={f.key} />
                  <label htmlFor={`file-${f.key}`} className="label">Upload new image</label>
                  <input id={`file-${f.key}`} name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-navy-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-navy-800 hover:file:bg-navy-100" />
                  <SubmitButton className="btn-outline" pendingText="Uploading…">
                    <Upload className="h-4 w-4" aria-hidden /> Upload
                  </SubmitButton>
                </ActionForm>
                {draft && (
                  <ActionForm action={removeContentImage}>
                    <input type="hidden" name="key" value={f.key} />
                    <SubmitButton className="btn-ghost px-0 text-sm text-red-600 hover:bg-transparent hover:underline">Remove image</SubmitButton>
                  </ActionForm>
                )}
              </div>
            </div>
          </Panel>
        );
      })}

      <ActionForm action={saveContentDrafts} className="space-y-6">
        <input type="hidden" name="locale" value={locale} />
        {groups
          .filter((g) => CONTENT_FIELDS.some((f) => f.group === g && f.type !== "image"))
          .map((group) => (
            <Panel key={group} title={group}>
              <div className="grid gap-5 md:grid-cols-2">
                {CONTENT_FIELDS.filter((f) => f.group === group && f.type !== "image").map((f) => {
                  const r = rowFor(f);
                  const value = r?.draft_value ?? r?.published_value ?? "";
                  const changed = r && (r.draft_value ?? null) !== (r.published_value ?? null);
                  const id = `c-${f.key}`;
                  return (
                    <div key={f.key} className={f.type === "textarea" ? "md:col-span-2" : undefined}>
                      {f.type === "toggle" ? (
                        <label className="flex items-center gap-3 text-sm font-medium text-slate-800">
                          <input type="checkbox" name={f.key} defaultChecked={value !== "false"} className="h-4 w-4 rounded border-slate-300" />
                          {f.label}
                          {changed && <Badge tone="amber">Unpublished</Badge>}
                        </label>
                      ) : (
                        <>
                          <label htmlFor={id} className="label flex items-center gap-2">
                            {f.label}
                            <Badge tone={f.localized ? "navy" : "slate"}>{f.localized ? locale.toUpperCase() : "All languages"}</Badge>
                            {changed && <Badge tone="amber">Unpublished</Badge>}
                          </label>
                          {f.type === "textarea" ? (
                            <textarea id={id} name={f.key} defaultValue={value} rows={f.key.endsWith(".body") ? 10 : 3} placeholder={locale === "en" ? DEFAULTS[f.key] : "Leave empty to use the default translation"} className="input resize-y" lang={f.localized ? locale : undefined} />
                          ) : (
                            <input id={id} name={f.key} type={f.type === "email" ? "email" : f.type === "phone" ? "tel" : "text"} defaultValue={value} placeholder={locale === "en" ? DEFAULTS[f.key] : undefined} className="input" lang={f.localized ? locale : undefined} />
                          )}
                          {f.help && <p className="mt-1 text-xs text-slate-500">{f.help}</p>}
                          <FieldError name={f.key} />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </Panel>
          ))}
        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-100/95 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:bg-white">
          <p className="mr-auto text-xs text-slate-500">Empty fields show the default text in the selected language.</p>
          <SubmitButton name="intent" value="draft" className="btn-outline" pendingText="Saving…">Save draft</SubmitButton>
          <SubmitButton name="intent" value="publish" className="btn-accent" pendingText="Publishing…">Publish</SubmitButton>
        </div>
      </ActionForm>
    </>
  );
}
