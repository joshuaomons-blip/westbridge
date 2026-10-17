import { FieldError } from "./ActionForm";
import { cn } from "@/lib/format";

/** Labelled input with server-side error display. */
export function TextField({
  name,
  label,
  defaultValue,
  required,
  type = "text",
  placeholder,
  hint,
  maxLength,
  className,
  list,
  autoComplete,
  min,
  step,
  idPrefix = "",
}: {
  name: string;
  label: string;
  defaultValue?: string | number | null;
  required?: boolean;
  type?: string;
  placeholder?: string;
  hint?: string;
  maxLength?: number;
  className?: string;
  list?: string;
  autoComplete?: string;
  min?: string;
  step?: string;
  idPrefix?: string;
}) {
  const id = `f-${idPrefix}${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        list={list}
        autoComplete={autoComplete ?? "off"}
        min={min}
        step={step}
        className="input"
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      )}
      <FieldError name={name} />
    </div>
  );
}

export function TextAreaField({
  name,
  label,
  defaultValue,
  rows = 3,
  hint,
  maxLength,
  className,
  required,
  idPrefix = "",
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  rows?: number;
  hint?: string;
  maxLength?: number;
  className?: string;
  required?: boolean;
  idPrefix?: string;
}) {
  const id = `f-${idPrefix}${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      <textarea id={id} name={name} rows={rows} defaultValue={defaultValue ?? ""} maxLength={maxLength} required={required} className="input resize-y" />
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      <FieldError name={name} />
    </div>
  );
}

export function SelectField({
  name,
  label,
  defaultValue,
  options,
  required,
  className,
  hint,
  idPrefix = "",
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  options: { value: string; label: string }[];
  required?: boolean;
  className?: string;
  hint?: string;
  idPrefix?: string;
}) {
  const id = `f-${idPrefix}${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      <select id={id} name={name} defaultValue={defaultValue ?? ""} className="input">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      <FieldError name={name} />
    </div>
  );
}

export function CheckboxField({
  name,
  label,
  defaultChecked,
  hint,
  className,
  idPrefix = "",
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
  hint?: string;
  className?: string;
  idPrefix?: string;
}) {
  const id = `f-${idPrefix}${name}`;
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <input id={id} name={name} type="checkbox" defaultChecked={defaultChecked} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-navy-700 focus:ring-navy-500" />
      <div>
        <label htmlFor={id} className="text-sm font-medium text-slate-800">
          {label}
        </label>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
    </div>
  );
}

export function Fieldset({ legend, description, children }: { legend: string; description?: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <legend className="sr-only">{legend}</legend>
      <h2 className="text-base font-semibold text-navy-950" aria-hidden>
        {legend}
      </h2>
      {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export const COUNTRIES = [
  "Argentina", "Australia", "Austria", "Belgium", "Brazil", "Canada", "China", "Czech Republic", "Denmark",
  "Egypt", "Finland", "France", "Germany", "Ghana", "Greece", "Hungary", "India", "Indonesia", "Ireland",
  "Israel", "Italy", "Japan", "Kenya", "Lithuania", "Mexico", "Netherlands", "New Zealand", "Nigeria",
  "Norway", "Poland", "Portugal", "Romania", "Saudi Arabia", "Singapore", "Slovakia", "South Africa",
  "South Korea", "Spain", "Sweden", "Switzerland", "Turkey", "Ukraine", "United Arab Emirates",
  "United Kingdom", "United States",
];

export function CountryList() {
  return (
    <datalist id="countries">
      {COUNTRIES.map((c) => (
        <option key={c} value={c} />
      ))}
    </datalist>
  );
}
