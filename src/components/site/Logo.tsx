import { cn } from "@/lib/format";

/**
 * Norvane mark: a bold "N" drawn as one continuous route (up, across, up),
 * with a red road line running beneath. Original artwork.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={cn("h-10 w-10 shrink-0", className)}>
      <rect width="48" height="48" rx="6" fill="#0B1F44" />
      <path d="M13.5 34V13.5L34.5 33.5V13" fill="none" stroke="#fff" strokeWidth="5.5" strokeLinejoin="miter" strokeLinecap="square" />
      <path d="M7 39.5h34" stroke="#D62D20" strokeWidth="3.5" />
    </svg>
  );
}

export function Logo({ inverted = false, className }: { inverted?: boolean; className?: string }) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display text-[22px] font-black tracking-[-0.01em] [font-stretch:112%]",
            inverted ? "text-white" : "text-brand-900",
          )}
        >
          Norvane
        </span>
        <span
          className={cn(
            "mt-1 flex items-center gap-1.5 text-[10.5px] font-bold tracking-[0.42em]",
            inverted ? "text-white/70" : "text-signal-600",
          )}
        >
          EXPRESS
        </span>
      </span>
    </span>
  );
}
