"use client";

import { useState } from "react";
import { Route } from "lucide-react";
import { suggestRoute } from "@/lib/route-suggest";

/**
 * Fills the "Planned stops" box with a suggested route based on the origin
 * and destination typed in the same form. Staff can edit the result freely.
 */
export function SuggestRouteButton({ targetId }: { targetId: string }) {
  const [note, setNote] = useState<string | null>(null);

  function suggest(e: React.MouseEvent<HTMLButtonElement>) {
    const form = e.currentTarget.form;
    if (!form) return;
    const val = (name: string) => String((form.elements.namedItem(name) as HTMLInputElement | null)?.value ?? "");
    const originCity = val("origin_city");
    const originCountry = val("origin_country");
    const destinationCity = val("destination_city");
    const destinationCountry = val("destination_country");
    if (!originCountry || !destinationCountry) {
      setNote("Enter the origin and destination countries first.");
      return;
    }
    const { stops, unknown } = suggestRoute({ originCity, originCountry, destinationCity, destinationCountry });
    if (unknown.length) {
      setNote(`No hub data for ${unknown.join(" and ")} yet — type the stops yourself, one per line.`);
      return;
    }
    const box = document.getElementById(targetId) as HTMLTextAreaElement | null;
    if (!box) return;
    box.value = stops.join("\n");
    setNote(
      stops.length
        ? `Suggested ${stops.length} stop${stops.length > 1 ? "s" : ""}. Check and edit them to match your real route before saving.`
        : "Direct route — no stops in between. You can still add stops yourself.",
    );
  }

  return (
    <div className="sm:col-span-2">
      <button type="button" onClick={suggest} className="btn-outline px-3 py-2">
        <Route className="h-4 w-4" aria-hidden />
        Suggest route from the countries above
      </button>
      {note && (
        <p className="mt-2 text-xs text-slate-600" role="status">
          {note}
        </p>
      )}
    </div>
  );
}
