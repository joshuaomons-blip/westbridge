"use client";

import { useState } from "react";
import { Boxes, FileText, Package, Shirt, Smartphone, Truck, WandSparkles } from "lucide-react";
import { cn } from "@/lib/format";

type Template = {
  id: string;
  label: string;
  hint: string;
  icon: typeof Package;
  type: "parcel" | "document" | "freight" | "pallet" | "other";
  description: string;
  quantity: number;
  weight: number;
  /** Matched against the service names, first match wins. */
  service: RegExp;
  /** Delivery estimate in working days: [same country, international]. */
  days: [number, number];
};

const TEMPLATES: Template[] = [
  { id: "docs", label: "Documents", hint: "Envelope, up to 0.5 kg", icon: FileText, type: "document", description: "Business documents (A4 envelope)", quantity: 1, weight: 0.5, service: /express|international|parcel/i, days: [1, 3] },
  { id: "small", label: "Small parcel", hint: "1 box, about 2.5 kg", icon: Package, type: "parcel", description: "Personal effects – small parcel", quantity: 1, weight: 2.5, service: /international|parcel/i, days: [2, 5] },
  { id: "electronics", label: "Electronics", hint: "Boxed device, about 3 kg", icon: Smartphone, type: "parcel", description: "Consumer electronics (boxed, packed with protective padding)", quantity: 1, weight: 3, service: /international|parcel|express/i, days: [2, 5] },
  { id: "clothing", label: "Clothing", hint: "1 carton, about 5 kg", icon: Shirt, type: "parcel", description: "Clothing and textiles", quantity: 1, weight: 5, service: /international|parcel/i, days: [2, 6] },
  { id: "commercial", label: "Commercial goods", hint: "3 cartons, about 25 kg", icon: Boxes, type: "parcel", description: "Commercial goods – 3 cartons", quantity: 3, weight: 25, service: /business|international|parcel/i, days: [3, 7] },
  { id: "pallet", label: "Pallet freight", hint: "1 pallet, about 250 kg", icon: Truck, type: "pallet", description: "Palletised freight – 1 pallet, shrink-wrapped", quantity: 1, weight: 250, service: /freight/i, days: [3, 10] },
];

/** Adds working days (skips Saturday and Sunday). */
function addWorkingDays(from: Date, days: number): string {
  const d = new Date(from);
  let left = days;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  return d.toISOString().slice(0, 10);
}

/**
 * One-click templates for the "Create shipment" form: fill the package, service,
 * dates and first tracking note with consistent, professional wording. Only
 * empty sender/recipient fields are left for staff to complete.
 */
export function ShipmentTemplates() {
  const [picked, setPicked] = useState<string | null>(null);

  function apply(e: React.MouseEvent<HTMLButtonElement>, t: Template) {
    const form = e.currentTarget.form;
    if (!form) return;
    const el = (name: string) => form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
    const set = (name: string, value: string) => {
      const f = el(name);
      if (f) f.value = value;
    };
    const val = (name: string) => (el(name)?.value ?? "").trim();

    set("shipment_type", t.type);
    set("package_description", t.description);
    set("package_quantity", String(t.quantity));
    set("weight_kg", String(t.weight));

    const service = el("service_id") as HTMLSelectElement | null;
    if (service) {
      const match = Array.from(service.options).find((o) => o.value && t.service.test(o.text));
      if (match) service.value = match.value;
    }

    const shipDate = val("shipment_date") || new Date().toISOString().slice(0, 10);
    set("shipment_date", shipDate);
    const domestic = !!val("origin_country") && val("origin_country").toLowerCase() === val("destination_country").toLowerCase();
    set("estimated_delivery", addWorkingDays(new Date(`${shipDate}T12:00:00`), domestic ? t.days[0] : t.days[1]));

    const originCity = val("origin_city");
    const originCountry = val("origin_country");
    if (originCity) {
      if (!val("initial_location")) set("initial_location", originCountry ? `${originCity}, ${originCountry}` : originCity);
      if (!val("initial_description")) set("initial_description", `Shipment registered at our ${originCity} office and being prepared for dispatch.`);
    }
    setPicked(t.id);
  }

  return (
    <section className="rounded-xl border border-navy-100 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-700 text-white">
          <WandSparkles className="h-4.5 w-4.5" aria-hidden />
        </span>
        <div>
          <h2 className="font-bold text-navy-900">Start from a template</h2>
          <p className="mt-0.5 text-sm text-slate-600">
            Fill in the sender and recipient cities first, then pick what is being sent. The package details, service, delivery estimate and first tracking note are filled in for you, and the route is planned automatically when you save. You can still change anything.
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {TEMPLATES.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={(e) => apply(e, t)}
              className={cn(
                "flex items-start gap-2.5 rounded-lg border p-3 text-left transition",
                picked === t.id ? "border-signal-600 bg-red-50 ring-1 ring-signal-600" : "border-slate-200 hover:border-navy-300 hover:bg-navy-50",
              )}
            >
              <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", picked === t.id ? "text-signal-600" : "text-navy-600")} aria-hidden />
              <span>
                <span className="block text-sm font-semibold text-navy-900">{t.label}</span>
                <span className="block text-xs text-slate-500">{t.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
      {picked && <p className="mt-3 text-xs font-medium text-emerald-700">Template applied. Check the details below, add the sender and recipient, then save.</p>}
    </section>
  );
}
