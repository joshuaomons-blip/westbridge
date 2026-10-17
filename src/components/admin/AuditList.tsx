import { formatDateTime } from "@/lib/format";
import { Badge } from "./ui";

type Row = {
  id: number;
  occurred_at: string;
  actor_email: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  summary: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
};

const HIDDEN = new Set(["updated_at", "updated_by"]);

/** Fields that changed between the old and new versions of a row. */
function diff(oldData: Row["old_data"], newData: Row["new_data"]) {
  const keys = new Set([...Object.keys(oldData ?? {}), ...Object.keys(newData ?? {})]);
  const out: { key: string; from: unknown; to: unknown }[] = [];
  for (const k of keys) {
    if (HIDDEN.has(k)) continue;
    const a = oldData?.[k];
    const b = newData?.[k];
    if (JSON.stringify(a) !== JSON.stringify(b)) out.push({ key: k, from: a, to: b });
  }
  return out;
}

function show(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "object") return JSON.stringify(v);
  const s = String(v);
  return s.length > 160 ? s.slice(0, 160) + "…" : s;
}

const LABEL: Record<string, string> = {
  shipments: "Shipment",
  shipment_events: "Tracking event",
  customers: "Customer",
  contact_inquiries: "Inquiry",
  services: "Service",
  website_content: "Website content",
  translation_content: "Translation",
  administrator_profiles: "Administrator",
  site_settings: "Setting",
  shipment_statuses: "Status",
};

export function AuditList({ rows, compact = false }: { rows: Row[]; compact?: boolean }) {
  if (!rows.length) return <p className="px-5 py-6 text-sm text-slate-500">No activity recorded yet.</p>;
  return (
    <ol className="divide-y divide-slate-100">
      {rows.map((r) => {
        const changes = r.action === "update" ? diff(r.old_data, r.new_data) : [];
        const tone = r.action === "insert" ? "green" : r.action === "delete" ? "red" : r.action === "update" ? "amber" : "navy";
        return (
          <li key={r.id} className="px-5 py-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={tone}>{r.action.toUpperCase()}</Badge>
              {r.table_name && <span className="font-medium text-slate-800">{LABEL[r.table_name] ?? r.table_name}</span>}
              {!compact && r.record_id && <span className="truncate font-mono text-xs text-slate-400">{r.record_id.slice(0, 36)}</span>}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {formatDateTime(r.occurred_at)} · {r.actor_email ?? "system / database"}
            </p>
            {r.summary && <p className="mt-1 text-slate-700">{r.summary}</p>}
            {changes.length > 0 && (
              <details className="mt-1.5">
                <summary className="cursor-pointer text-xs font-semibold text-navy-700">
                  {changes.length} field{changes.length > 1 ? "s" : ""} changed
                </summary>
                <dl className="mt-2 space-y-1.5 rounded-md bg-slate-50 p-3 text-xs">
                  {changes.map((c) => (
                    <div key={c.key} className="grid gap-1 sm:grid-cols-[140px_1fr]">
                      <dt className="font-mono text-slate-500">{c.key}</dt>
                      <dd className="break-words text-slate-700">
                        <span className="text-red-700 line-through">{show(c.from)}</span> → <span className="text-emerald-700">{show(c.to)}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </details>
            )}
          </li>
        );
      })}
    </ol>
  );
}
