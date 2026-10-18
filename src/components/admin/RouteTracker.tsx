"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { CircleCheck, LoaderCircle, MapPin, Navigation, PackageCheck, ShieldCheck, ShieldAlert, Truck } from "lucide-react";
import type { JourneyStop } from "@/lib/journey";
import type { RouteStep } from "@/lib/route-progress";
import { cn } from "@/lib/format";

/**
 * The shipment's route with one-click updates. Each button records the update
 * at the current time, writes the customer description, and (optionally) emails
 * the sender and recipient. Must be placed inside an ActionForm bound to advanceRoute.
 */
export function RouteTracker({ journey, steps, previews, emailDefault }: {
  journey: JourneyStop[];
  steps: RouteStep[];
  previews: Record<string, string>;
  emailDefault: boolean;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const holds = steps.filter((s) => s.kind === "hold");
  const normal = steps.filter((s) => s.kind !== "hold");
  const [holdKey, setHoldKey] = useState(holds[0]?.key ?? "");
  const shown = hover ?? normal.find((s) => s.next)?.key ?? normal[0]?.key ?? null;

  return (
    <div className="space-y-4">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
        {journey.map((j, i) => (
          <li key={`${j.name}-${i}`} className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium",
                j.state === "done" && "bg-emerald-50 text-emerald-800",
                j.state === "current" && "bg-navy-700 text-white",
                j.state === "upcoming" && "border border-dashed border-slate-300 text-slate-500",
              )}
            >
              {j.state === "done" ? <CircleCheck className="h-3.5 w-3.5" aria-hidden /> : <MapPin className="h-3.5 w-3.5" aria-hidden />}
              {j.name}
              {j.state === "current" && <span className="text-[11px] font-semibold uppercase tracking-wide opacity-80">now</span>}
            </span>
            {i < journey.length - 1 && <span className="text-slate-300" aria-hidden>→</span>}
          </li>
        ))}
      </ol>

      {steps.length === 0 ? (
        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">This shipment has finished its route. Use the form below for any other update.</p>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            {normal.map((s) => (
              <StepButton key={s.key} step={s} onHover={setHover} />
            ))}
          </div>
          {holds.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3" onMouseEnter={() => setHover(holdKey)} onMouseLeave={() => setHover(null)}>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-red-800">
                <ShieldAlert className="h-4 w-4" aria-hidden /> Customs hold
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  name="hold_point"
                  value={holdKey.replace(/^hold:/, "")}
                  onChange={(e) => {
                    setHoldKey(`hold:${e.target.value}`);
                    setHover(`hold:${e.target.value}`);
                  }}
                  onFocus={() => setHover(holdKey)}
                  className="min-w-0 flex-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-slate-800"
                  aria-label="Where customs holds the shipment"
                >
                  {holds.map((h) => (
                    <option key={h.key} value={h.customs?.city}>
                      {h.customs?.city} — {h.customs?.kind}
                    </option>
                  ))}
                </select>
                <HoldButton />
              </div>
            </div>
          )}
          {shown && previews[shown] && (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <span className="font-semibold text-slate-900">Customers will see: </span>
              {previews[shown]}
            </p>
          )}
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="send_email" defaultChecked={emailDefault} className="h-4 w-4 rounded border-slate-300" />
            Email the sender and recipient with each update
          </label>
        </>
      )}
    </div>
  );
}

function StepButton({ step, onHover }: { step: RouteStep; onHover: (k: string | null) => void }) {
  const { pending, data } = useFormStatus();
  const mine = pending && data?.get("step") === step.key;
  const Icon =
    step.kind === "depart" ? Navigation
    : step.kind === "out" ? Truck
    : step.kind === "delivered" ? PackageCheck
    : step.kind === "hold" ? ShieldAlert
    : step.kind === "cleared" ? ShieldCheck
    : MapPin;
  return (
    <button
      type="submit"
      name="step"
      value={step.key}
      disabled={pending}
      onMouseEnter={() => onHover(step.key)}
      onFocus={() => onHover(step.key)}
      onMouseLeave={() => onHover(null)}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition disabled:opacity-60",
        step.danger
          ? "border-red-300 bg-red-50 text-red-800 hover:border-red-400 hover:bg-red-100"
          : step.next
            ? "border-signal-600 bg-signal-600 text-white hover:bg-signal-700"
            : "border-slate-300 bg-white text-navy-800 hover:border-navy-400 hover:bg-navy-50",
      )}
    >
      {mine ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Icon className="h-4 w-4 shrink-0" aria-hidden />}
      <span className="min-w-0 flex-1">{step.label}</span>
      {step.next && <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">Next</span>}
    </button>
  );
}

function HoldButton() {
  const { pending, data } = useFormStatus();
  const mine = pending && data?.get("step") === "hold";
  return (
    <button
      type="submit"
      name="step"
      value="hold"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
    >
      {mine ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <ShieldAlert className="h-4 w-4" aria-hidden />}
      Put on customs hold
    </button>
  );
}
