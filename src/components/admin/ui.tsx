import Link from "next/link";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { CATEGORY_STYLE, STATUS_ADMIN_LABEL, categoryOf, isStatusCode } from "@/lib/statuses";
import { cn } from "@/lib/format";

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-navy-800">
            <ChevronLeft className="h-4 w-4" aria-hidden />
            {back.label}
          </Link>
        )}
        <h1 className="font-display text-2xl font-bold tracking-tight text-navy-950">{title}</h1>
        {description && <div className="mt-1 text-sm text-slate-600">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            {title && <h2 className="text-base font-semibold text-navy-950">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={bodyClassName ?? "p-5"}>{children}</div>
    </section>
  );
}

export function StatusBadge({ code }: { code: string }) {
  const cat = categoryOf(code);
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset", CATEGORY_STYLE[cat])}>
      {isStatusCode(code) ? STATUS_ADMIN_LABEL[code] : code}
    </span>
  );
}

export function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "amber" | "green" | "red" | "navy" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    amber: "bg-amber-100 text-amber-800",
    green: "bg-emerald-100 text-emerald-800",
    red: "bg-red-100 text-red-700",
    navy: "bg-navy-100 text-navy-800",
  };
  return <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap", tones[tone])}>{children}</span>;
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Inbox className="h-6 w-6" aria-hidden />
      </span>
      <p className="mt-4 font-semibold text-slate-800">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ text = "This data could not be loaded. Please refresh the page." }: { text?: string }) {
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {text}
    </div>
  );
}

/** Builds pagination links that keep the current filters. */
export function Pagination({
  page,
  pageSize,
  total,
  basePath,
  params,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    if (p > 1) q.set("page", String(p));
    else q.delete("page");
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex items-center justify-between gap-4 border-t border-slate-100 px-5 py-3 text-sm text-slate-600">
      <p>
        {from}–{to} of {total}
      </p>
      <div className="flex gap-1">
        {page > 1 ? (
          <Link href={href(page - 1)} className="btn-outline px-2.5 py-1.5" aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        ) : (
          <span className="btn-outline px-2.5 py-1.5 opacity-40" aria-hidden>
            <ChevronLeft className="h-4 w-4" />
          </span>
        )}
        <span className="px-2 py-1.5 tabular-nums">
          {page} / {pages}
        </span>
        {page < pages ? (
          <Link href={href(page + 1)} className="btn-outline px-2.5 py-1.5" aria-label="Next page">
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className="btn-outline px-2.5 py-1.5 opacity-40" aria-hidden>
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </div>
    </div>
  );
}

/** Sortable column header link. */
export function SortHeader({
  label,
  column,
  current,
  dir,
  basePath,
  params,
}: {
  label: string;
  column: string;
  current: string;
  dir: "asc" | "desc";
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v && k !== "page") q.set(k, v);
  const nextDir = current === column && dir === "desc" ? "asc" : "desc";
  q.set("sort", column);
  q.set("dir", nextDir);
  return (
    <Link href={`${basePath}?${q}`} className="inline-flex items-center gap-1 hover:text-navy-900">
      {label}
      {current === column && <span aria-hidden>{dir === "asc" ? "↑" : "↓"}</span>}
      {current === column && <span className="sr-only">sorted {dir === "asc" ? "ascending" : "descending"}</span>}
    </Link>
  );
}

export const th = "px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase whitespace-nowrap";
export const td = "px-4 py-3 align-top";

export function parsePage(v: string | string[] | undefined): number {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isInteger(n) && n > 0 && n < 100000 ? n : 1;
}

export function one(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s.trim().slice(0, 200) : undefined;
}

/** Escapes characters that have special meaning in PostgREST filter strings / LIKE patterns. */
export function searchTerm(q: string): string {
  return q.replace(/[%_\\,()*"]/g, " ").trim();
}
