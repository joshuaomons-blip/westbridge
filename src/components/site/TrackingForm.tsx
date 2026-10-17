"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { LoaderCircle, Search } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { normalizeTrackingNumber, isValidTrackingFormat } from "@/lib/tracking-format";
import { cn } from "@/lib/format";

export function TrackingForm({
  defaultValue = "",
  variant = "page",
  autoFocus = false,
}: {
  defaultValue?: string;
  variant?: "hero" | "page";
  autoFocus?: boolean;
}) {
  const t = useTranslations("tracking");
  const router = useRouter();
  const id = useId();
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => setValue(defaultValue), [defaultValue]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeTrackingNumber(value);
    if (!normalized) return setError(t("errorEmpty"));
    if (!isValidTrackingFormat(normalized)) return setError(t("errorFormat"));
    setError(null);
    startTransition(() => {
      router.push({ pathname: "/track", query: { n: normalized } });
    });
  }

  const hero = variant === "hero";

  return (
    <form onSubmit={onSubmit} noValidate role="search" aria-label={t("title")}>
      <label htmlFor={id} className={cn("mb-2 block text-sm font-semibold", hero ? "text-white" : "text-slate-700")}>
        {t("label")}
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            id={id}
            name="n"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            autoFocus={autoFocus}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            inputMode="text"
            maxLength={40}
            placeholder={t("placeholder")}
            aria-invalid={!!error}
            aria-describedby={`${id}-help${error ? ` ${id}-err` : ""}`}
            className={cn(
              "input h-13 pl-11 font-mono text-base tracking-wider uppercase placeholder:font-sans placeholder:tracking-normal placeholder:normal-case",
              hero && "border-white/0 shadow-lg",
            )}
          />
        </div>
        <button type="submit" disabled={pending} className="btn-accent h-13 px-7 text-base">
          {pending ? <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden /> : <Search className="h-5 w-5" aria-hidden />}
          {pending ? t("loading") : t("submit")}
        </button>
      </div>
      <div aria-live="polite">
        {error && (
          <p id={`${id}-err`} className={cn("mt-2 text-sm font-medium", hero ? "text-red-200" : "text-red-600")}>
            {error}
          </p>
        )}
      </div>
      <p id={`${id}-help`} className={cn("mt-2 text-xs", hero ? "text-navy-200" : "text-slate-500")}>
        {t("help")}
      </p>
    </form>
  );
}
