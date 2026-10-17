import { cn } from "@/lib/format";

/**
 * Norvane mark: a solid geometric "N" monogram on a deep navy tile with a fine
 * red baseline (the road). Original artwork.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={cn("h-10 w-10 shrink-0", className)}>
      <rect width="48" height="48" rx="3" fill="#0B1F44" />
      <rect x="0.5" y="0.5" width="47" height="47" rx="2.5" fill="none" stroke="#fff" strokeOpacity="0.12" />
      <path d="M13 33V11h5.4l11.4 13.9V11H35v22h-5.4L18.2 19.1V33z" fill="#fff" />
      <path d="M13 37.2h22v2.6H13z" fill="#D62D20" />
    </svg>
  );
}

export function Logo({ inverted = false, className }: { inverted?: boolean; className?: string }) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <LogoMark />
      <span className={cn("h-8 w-px", inverted ? "bg-white/25" : "bg-slate-300")} aria-hidden />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display text-[19px] font-extrabold tracking-[0.18em] uppercase",
            inverted ? "text-white" : "text-brand-900",
          )}
        >
          Norvane
        </span>
        <span
          className={cn(
            "mt-[5px] text-[9.5px] font-semibold tracking-[0.62em] uppercase",
            inverted ? "text-white/60" : "text-slate-500",
          )}
        >
          Express
        </span>
      </span>
    </span>
  );
}
