"use client";

import { useActionState, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CircleCheck, LoaderCircle, Send } from "lucide-react";
import { submitContact, type ContactState } from "@/actions/contact";

const initial: ContactState = { status: "idle" };
const empty = { name: "", email: "", subject: "", message: "" };
type Values = typeof empty;

export function ContactForm() {
  const t = useTranslations("contact");
  const tv = useTranslations("contact.validation");
  const locale = useLocale();
  const [state, action, pending] = useActionState(submitContact, initial);
  const [values, setValues] = useState<Values>(empty);
  const [startedAt, setStartedAt] = useState("0");
  const [dismissed, setDismissed] = useState<ContactState | null>(null);

  useEffect(() => setStartedAt(String(Date.now())), [dismissed]);
  useEffect(() => {
    if (state.status === "success") setValues(empty);
  }, [state]);

  const set = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  if (state.status === "success" && state !== dismissed) {
    return (
      <div className="flex flex-col items-start gap-4 py-6" role="status">
        <CircleCheck className="h-10 w-10 text-emerald-600" aria-hidden />
        <h2 className="text-xl font-semibold text-navy-900">{t("successTitle")}</h2>
        <p className="text-slate-600">{t("success")}</p>
        {state.reference !== "—" && (
          <p className="rounded-md bg-slate-100 px-3 py-2 font-mono text-sm text-slate-700">
            {t("successRef", { reference: state.reference })}
          </p>
        )}
        <button type="button" className="btn-outline mt-2" onClick={() => setDismissed(state)}>
          {t("sendAnother")}
        </button>
      </div>
    );
  }

  const fields = state.status === "error" && state !== dismissed ? (state.fields ?? {}) : {};
  const known = ["nameRequired", "emailInvalid", "subjectRequired", "messageShort", "messageLong"] as const;
  const fieldError = (name: string) => {
    const k = known.find((x) => x === fields[name]);
    return k ? tv(k) : null;
  };
  const formError =
    state.status === "error" && state.error !== "invalid"
      ? state.error === "rate_limited"
        ? t("errorRateLimited")
        : t("errorGeneric")
      : null;

  return (
    <form action={action} noValidate className="relative space-y-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="started_at" value={startedAt} />
      {/* Honeypot: hidden from people, tempting for bots */}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label>
          Website
          <input type="text" name="company_website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="c-name" label={t("name")} error={fieldError("name")}>
          <input id="c-name" name="name" value={values.name} onChange={set("name")} required maxLength={120}
            autoComplete="name" className="input" aria-invalid={!!fieldError("name")}
            aria-describedby={fieldError("name") ? "c-name-err" : undefined} />
        </Field>
        <Field id="c-email" label={t("email")} error={fieldError("email")}>
          <input id="c-email" name="email" type="email" value={values.email} onChange={set("email")} required
            maxLength={254} autoComplete="email" className="input" aria-invalid={!!fieldError("email")}
            aria-describedby={fieldError("email") ? "c-email-err" : undefined} />
        </Field>
      </div>
      <Field id="c-subject" label={t("subject")} error={fieldError("subject")}>
        <input id="c-subject" name="subject" value={values.subject} onChange={set("subject")} required maxLength={200}
          className="input" aria-invalid={!!fieldError("subject")}
          aria-describedby={fieldError("subject") ? "c-subject-err" : undefined} />
      </Field>
      <Field id="c-message" label={t("message")} error={fieldError("message")} hint={t("trackingHint")}>
        <textarea id="c-message" name="message" value={values.message} onChange={set("message")} required rows={6}
          maxLength={5000} className="input resize-y" aria-invalid={!!fieldError("message")}
          aria-describedby={`c-message-hint${fieldError("message") ? " c-message-err" : ""}`} />
      </Field>

      <div aria-live="polite">
        {formError && state !== dismissed && (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</p>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">{t("privacyNote")}</p>
        <button type="submit" disabled={pending} className="btn-primary shrink-0 px-6 py-3">
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
          {pending ? t("sending") : t("submit")}
        </button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error: string | null;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
