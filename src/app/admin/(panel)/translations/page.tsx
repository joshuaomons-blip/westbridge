import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { PageHeader, Panel, Badge, one } from "@/components/admin/ui";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { saveTranslation } from "@/actions/admin/site";
import { cn } from "@/lib/format";
import en from "../../../../../messages/en.json";
import pl from "../../../../../messages/pl.json";
import ja from "../../../../../messages/ja.json";
import es from "../../../../../messages/es.json";
import de from "../../../../../messages/de.json";

export const metadata: Metadata = { title: "Languages & translations" };

const FILES = { en, pl, ja, es, de } as const;
type Code = keyof typeof FILES;
const LANGS: { code: Code; label: string }[] = [
  { code: "en", label: "English" },
  { code: "pl", label: "Polski" },
  { code: "ja", label: "日本語" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
];

const SECTION_LABEL: Record<string, string> = {
  meta: "Page titles (SEO)",
  nav: "Navigation",
  home: "Homepage",
  tracking: "Tracking",
  status: "Shipment status names",
  statusDescription: "Shipment status descriptions",
  shipmentType: "Shipment types",
  services: "Services page",
  about: "About page",
  contact: "Contact page & form",
  legal: "Legal pages",
  footer: "Footer",
  cookie: "Cookie notice",
  notFound: "Page not found",
  demo: "Demo mode banner",
  preview: "Preview banner",
  common: "General",
};

function flatten(obj: unknown, prefix = ""): [string, string][] {
  if (typeof obj !== "object" || obj === null) return [];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    typeof v === "string" ? [[prefix + k, v] as [string, string]] : flatten(v, `${prefix}${k}.`),
  );
}

export default async function TranslationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("translations.write");
  const sp = await searchParams;
  const locale = (LANGS.find((l) => l.code === one(sp.locale))?.code ?? "en") as Code;
  const sections = Object.keys(en);
  const section = sections.includes(one(sp.section) ?? "") ? one(sp.section)! : "home";
  const q = one(sp.q)?.toLowerCase();

  const defaults = new Map(flatten(FILES[locale]));
  const english = new Map(flatten(en));
  const keys = flatten(en)
    .map(([k]) => k)
    .filter((k) => (q ? k.toLowerCase().includes(q) || (defaults.get(k) ?? "").toLowerCase().includes(q) : k.startsWith(section + ".")));

  const db = await createSessionClient();
  const { data } = await db.from("translation_content").select("message_key, value").eq("locale", locale);
  const overrides = new Map((data ?? []).map((r) => [r.message_key as string, r.value as string]));

  const link = (params: Record<string, string>) => `/admin/translations?${new URLSearchParams({ locale, section, ...params })}`;

  return (
    <>
      <PageHeader
        title="Languages & translations"
        description="Adjust any interface text in any of the five languages. Changes go live immediately; clear a field to restore the default."
      />
      <nav aria-label="Language" className="mb-4 flex flex-wrap gap-1 rounded-lg bg-white p-1 shadow-sm ring-1 ring-slate-200 sm:inline-flex">
        {LANGS.map((l) => (
          <Link key={l.code} href={`/admin/translations?locale=${l.code}&section=${section}`} aria-current={l.code === locale ? "page" : undefined}
            className={cn("rounded-md px-3.5 py-1.5 text-sm font-medium", l.code === locale ? "bg-navy-800 text-white" : "text-slate-600 hover:bg-slate-100")}>
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="grid gap-6 lg:grid-cols-4">
        <aside className="space-y-3">
          <form method="get" className="flex gap-2">
            <input type="hidden" name="locale" value={locale} />
            <input name="q" type="search" defaultValue={q} placeholder="Search text…" className="input" aria-label="Search translations" />
          </form>
          <nav aria-label="Sections" className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
            {sections.map((s) => {
              const count = flatten((en as Record<string, unknown>)[s], s + ".").filter(([k]) => overrides.has(k)).length;
              return (
                <Link key={s} href={link({ section: s })} aria-current={!q && s === section ? "page" : undefined}
                  className={cn("flex items-center justify-between rounded-md px-3 py-2 text-sm", !q && s === section ? "bg-navy-50 font-semibold text-navy-900" : "text-slate-600 hover:bg-slate-50")}>
                  {SECTION_LABEL[s] ?? s}
                  {count > 0 && <Badge tone="amber">{count}</Badge>}
                </Link>
              );
            })}
          </nav>
        </aside>

        <Panel className="lg:col-span-3" title={q ? `Search: “${q}”` : SECTION_LABEL[section] ?? section} description={`${keys.length} text${keys.length === 1 ? "" : "s"}`} bodyClassName="p-0">
          <ul className="divide-y divide-slate-100">
            {keys.map((key) => {
              const override = overrides.get(key);
              const def = defaults.get(key) ?? "";
              const long = def.length > 90;
              const id = `t-${key}`;
              return (
                <li key={key} className="px-5 py-4">
                  <ActionForm action={saveTranslation} className="space-y-2">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="message_key" value={key} />
                    <div className="flex flex-wrap items-center gap-2">
                      <label htmlFor={id} className="font-mono text-xs text-slate-500">{key}</label>
                      {override !== undefined && <Badge tone="amber">Customized</Badge>}
                    </div>
                    {locale !== "en" && <p className="text-xs text-slate-400">English: {english.get(key)}</p>}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                      {long ? (
                        <textarea id={id} name="value" defaultValue={override ?? ""} placeholder={def} rows={Math.min(8, Math.ceil(def.length / 90) + 1)} className="input flex-1 resize-y" lang={locale} />
                      ) : (
                        <input id={id} name="value" defaultValue={override ?? ""} placeholder={def} className="input flex-1" lang={locale} />
                      )}
                      <SubmitButton className="btn-outline shrink-0" pendingText="Saving…">Save</SubmitButton>
                    </div>
                    {key.includes("successRef") && <p className="text-xs text-slate-500">Keep the {"{reference}"} placeholder.</p>}
                  </ActionForm>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </>
  );
}
