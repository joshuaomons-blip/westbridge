"use client";

import { useActionState, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CircleCheck, LoaderCircle, Send } from "lucide-react";
import { submitCarQuote, type CarQuoteState } from "@/actions/car-quote";

const initial: CarQuoteState = { status: "idle" };
const ERROR_KEYS = ["required", "emailInvalid", "phoneInvalid", "dateInvalid", "numberInvalid"] as const;
const start = { condition: "runs", method: "unsure" } as Record<string, string>;

export function CarQuoteForm() {
  const t = useTranslations("carQuote");
  const tp = useTranslations("pickup");
  const locale = useLocale();
  const [state, action, pending] = useActionState(submitCarQuote, initial);
  const [values, setValues] = useState<Record<string, string>>(start);
  const [startedAt, setStartedAt] = useState("0");
  const [dismissed, setDismissed] = useState<CarQuoteState | null>(null);
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
          <p className="rounded-md bg-slate-100 px-3 py-2 font-mono text-sm text-slate-700">{tp("successRef", { reference: state.reference })}</p>
        )}
        <button type="button" className="btn-outline mt-2" onClick={() => setDismissed(state)}>
          {tp("another")}
        </button>
      </div>
    );
  }

  const fields = state.status === "error" && state !== dismissed ? (state.fields ?? {}) : {};
  const err = (name: string) => {
    const k = ERROR_KEYS.find((x) => x === fields[name]);
    return k ? tp(k) : null;
  };
  const formError =
    state.status === "error" && state.error !== "invalid" && state !== dismissed
      ? state.error === "rate_limited"
        ? tp("errorRateLimited")
        : tp("errorGeneric")
      : null;

  const bind = (name: string) => ({
    id: `q-${name}`,
    name,
    value: values[name] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValues((v) => ({ ...v, [name]: e.target.value })),
    "aria-invalid": !!err(name),
    "aria-describedby": err(name) ? `q-${name}-err` : undefined,
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

      <Section title={t("sectionVehicle")}>
        <Field label={t("make")} name="make" error={err("make")}>
          <input {...bind("make")} required maxLength={60} placeholder="Toyota" className="input" />
        </Field>
        <Field label={t("model")} name="model" error={err("model")}>
          <input {...bind("model")} required maxLength={60} placeholder="Camry" className="input" />
        </Field>
        <Field label={t("year")} optional={tp("optional")} name="year" error={err("year")}>
          <input {...bind("year")} type="number" min={1900} max={2100} step={1} inputMode="numeric" className="input" />
        </Field>
        <Field label={t("condition")} name="condition" error={null}>
          <select {...bind("condition")} className="input">
            <option value="runs">{t("conditionRuns")}</option>
            <option value="not_running">{t("conditionNotRunning")}</option>
          </select>
        </Field>
      </Section>

      <Section title={t("sectionRoute")}>
        <Field label={t("pickupCountry")} name="pickup_country" error={err("pickup_country")}>
          <input {...bind("pickup_country")} required maxLength={100} autoComplete="country-name" className="input" />
        </Field>
        <Field label={t("pickupCity")} name="pickup_city" error={err("pickup_city")}>
          <input {...bind("pickup_city")} required maxLength={100} autoComplete="address-level2" className="input" />
        </Field>
        <Field label={tp("destCountry")} name="dest_country" error={err("dest_country")}>
          <input {...bind("dest_country")} required maxLength={100} autoComplete="off" className="input" />
        </Field>
        <Field label={tp("destCity")} name="dest_city" error={err("dest_city")}>
          <input {...bind("dest_city")} required maxLength={100} autoComplete="off" className="input" />
        </Field>
        <Field label={t("method")} name="method" error={null}>
          <select {...bind("method")} className="input">
            <option value="unsure">{t("methodUnsure")}</option>
            <option value="door_to_port">{t("methodDoor")}</option>
            <option value="port_to_port">{t("methodPort")}</option>
          </select>
        </Field>
        <Field label={t("readyDate")} optional={tp("optional")} name="ready_date" error={err("ready_date")}>
          <input {...bind("ready_date")} type="date" min={today} className="input" />
        </Field>
      </Section>

      <Section title={tp("sectionYou")}>
        <Field label={tp("name")} name="name" error={err("name")} className="sm:col-span-2">
          <input {...bind("name")} required maxLength={120} autoComplete="name" className="input" />
        </Field>
        <Field label={tp("email")} name="email" error={err("email")}>
          <input {...bind("email")} type="email" required maxLength={254} autoComplete="email" className="input" />
        </Field>
        <Field label={tp("phone")} name="phone" error={err("phone")}>
          <input {...bind("phone")} type="tel" required maxLength={40} autoComplete="tel" inputMode="tel" className="input" />
        </Field>
        <Field label={tp("notes")} optional={tp("optional")} hint={t("notesHint")} name="notes" error={err("notes")} className="sm:col-span-2">
          <textarea {...bind("notes")} rows={4} maxLength={2000} className="input resize-y" />
        </Field>
      </Section>

      <div aria-live="polite">
        {formError && <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</p>}
      </div>

      <div className="flex flex-col gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">{tp("privacy")}</p>
        <button type="submit" disabled={pending} className="btn-accent h-13 shrink-0 px-8 text-base">
          {pending ? <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden /> : <Send className="h-5 w-5" aria-hidden />}
          {pending ? tp("sending") : t("submit")}
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
      <label htmlFor={`q-${name}`} className="label">
        {label}
        {optional && <span className="ml-1 font-normal text-slate-400">({optional})</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
      {error && (
        <p id={`q-${name}-err`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
