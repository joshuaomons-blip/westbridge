"use client";

import { useActionState, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CircleCheck, LoaderCircle, Send } from "lucide-react";
import { submitPickup, type PickupState } from "@/actions/pickup";

const initial: PickupState = { status: "idle" };
const ERROR_KEYS = ["required", "emailInvalid", "phoneInvalid", "dateInvalid", "numberInvalid"] as const;
const TYPES = ["parcel", "document", "freight", "pallet", "other"] as const;
const start = { shipment_type: "parcel", packages: "1" } as Record<string, string>;

export function PickupForm({ services }: { services: string[] }) {
  const t = useTranslations("pickup");
  const tt = useTranslations("shipmentType");
  const locale = useLocale();
  const [state, action, pending] = useActionState(submitPickup, initial);
  const [values, setValues] = useState<Record<string, string>>(start);
  const [startedAt, setStartedAt] = useState("0");
  const [dismissed, setDismissed] = useState<PickupState | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => setStartedAt(String(Date.now())), [dismissed]);
  useEffect(() => {
    if (state.status === "success") setValues(start);
  }, [state]);

  if (state.status === "success" && state !== dismissed) {
    return (
      <div className="flex flex-col items-start gap-4 py-6" role="status">
        <CircleCheck className="h-12 w-12 text-emerald-600" aria-hidden />
        <h2 className="font-display text-2xl font-black text-brand-900 [font-stretch:108%]">{t("successTitle")}</h2>
        <p className="max-w-lg text-slate-600">{t("success")}</p>
        {state.reference !== "—" && (
          <p className="rounded-md bg-slate-100 px-3 py-2 font-mono text-sm text-slate-700">{t("successRef", { reference: state.reference })}</p>
        )}
        <button type="button" className="btn-outline mt-2" onClick={() => setDismissed(state)}>
          {t("another")}
        </button>
      </div>
    );
  }

  const fields = state.status === "error" && state !== dismissed ? (state.fields ?? {}) : {};
  const err = (name: string) => {
    const k = ERROR_KEYS.find((x) => x === fields[name]);
    return k ? t(k) : null;
  };
  const formError =
    state.status === "error" && state.error !== "invalid" && state !== dismissed
      ? state.error === "rate_limited"
        ? t("errorRateLimited")
        : t("errorGeneric")
      : null;

  /** Props for a controlled field, so values survive a failed submission. */
  const bind = (name: string) => ({
    id: `p-${name}`,
    name,
    value: values[name] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValues((v) => ({ ...v, [name]: e.target.value })),
    "aria-invalid": !!err(name),
    "aria-describedby": err(name) ? `p-${name}-err` : undefined,
  });

  return (
    <form action={action} noValidate className="relative space-y-8">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="started_at" value={startedAt} />
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label>
          Website
          <input type="text" name="company_website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <Section title={t("sectionYou")}>
        <Field label={t("name")} name="name" error={err("name")} className="sm:col-span-2">
          <input {...bind("name")} required maxLength={120} autoComplete="name" className="input" />
        </Field>
        <Field label={t("email")} name="email" error={err("email")}>
          <input {...bind("email")} type="email" required maxLength={254} autoComplete="email" className="input" />
        </Field>
        <Field label={t("phone")} name="phone" error={err("phone")}>
          <input {...bind("phone")} type="tel" required maxLength={40} autoComplete="tel" inputMode="tel" className="input" />
        </Field>
      </Section>

      <Section title={t("sectionRoute")}>
        <Field label={t("pickupCity")} name="pickup_city" error={err("pickup_city")}>
          <input {...bind("pickup_city")} required maxLength={100} autoComplete="address-level2" className="input" />
        </Field>
        <Field label={t("pickupDate")} optional={t("optional")} name="pickup_date" error={err("pickup_date")}>
          <input {...bind("pickup_date")} type="date" min={today} className="input" />
        </Field>
        <Field label={t("pickupAddress")} optional={t("optional")} name="pickup_address" error={err("pickup_address")} className="sm:col-span-2">
          <input {...bind("pickup_address")} maxLength={300} autoComplete="street-address" className="input" />
        </Field>
        <Field label={t("destCountry")} name="dest_country" error={err("dest_country")}>
          <input {...bind("dest_country")} required maxLength={100} autoComplete="off" className="input" />
        </Field>
        <Field label={t("destCity")} name="dest_city" error={err("dest_city")}>
          <input {...bind("dest_city")} required maxLength={100} autoComplete="off" className="input" />
        </Field>
      </Section>

      <Section title={t("sectionShipment")}>
        <Field label={t("type")} name="shipment_type" error={null}>
          <select {...bind("shipment_type")} className="input">
            {TYPES.map((k) => (
              <option key={k} value={k}>
                {tt(k)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("service")} optional={t("optional")} name="service" error={null}>
          <select {...bind("service")} className="input">
            <option value="">{t("serviceAny")}</option>
            {services.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("packages")} name="packages" error={err("packages")}>
          <input {...bind("packages")} type="number" min={1} max={10000} step={1} required inputMode="numeric" className="input" />
        </Field>
        <Field label={t("weight")} optional={t("optional")} name="weight" error={err("weight")}>
          <input {...bind("weight")} type="number" min={0} step="0.1" inputMode="decimal" className="input" />
        </Field>
        <Field label={t("notes")} optional={t("optional")} hint={t("notesHint")} name="notes" error={err("notes")} className="sm:col-span-2">
          <textarea {...bind("notes")} rows={4} maxLength={2000} className="input resize-y" />
        </Field>
      </Section>

      <div aria-live="polite">
        {formError && <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</p>}
      </div>

      <div className="flex flex-col gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">{t("privacy")}</p>
        <button type="submit" disabled={pending} className="btn-accent h-13 shrink-0 px-8 text-base">
          {pending ? <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden /> : <Send className="h-5 w-5" aria-hidden />}
          {pending ? t("sending") : t("submit")}
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-4 text-xs font-bold tracking-[0.14em] text-slate-500 uppercase">{title}</legend>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Field({
  label,
  name,
  error,
  hint,
  optional,
  className,
  children,
}: {
  label: string;
  name: string;
  error: string | null;
  hint?: string;
  optional?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={`p-${name}`} className="label">
        {label}
        {optional && <span className="ml-1 font-normal text-slate-400">({optional})</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
      {error && (
        <p id={`p-${name}-err`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
