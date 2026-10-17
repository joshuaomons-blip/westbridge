"use client";

import { MapPin } from "lucide-react";

export type QuickChip = { label: string; status: string; location: string; description: string };

/**
 * One-tap shortcuts that fill the tracking-event form below with the next
 * place on the route. Nothing is saved until "Record event" is pressed.
 */
export function QuickUpdate({ chips }: { chips: QuickChip[] }) {
  if (!chips.length) return null;

  function fill(e: React.MouseEvent<HTMLButtonElement>, c: QuickChip) {
    const form = e.currentTarget.form;
    if (!form) return;
    const set = (name: string, value: string) => {
      const el = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
      if (el) el.value = value;
    };
    set("status_code", c.status);
    set("location", c.location);
    set("description", c.description);
    set("visibility", "public");
    (form.elements.namedItem("location") as HTMLInputElement | null)?.focus();
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
      <p className="mb-2 text-xs font-semibold text-slate-600">Quick fill — tap where the shipment is now, check the time, then press Record event:</p>
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={(e) => fill(e, c)}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-navy-800 transition hover:border-navy-400 hover:bg-navy-50"
          >
            <MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden />
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
