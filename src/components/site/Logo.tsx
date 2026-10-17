import { cn } from "@/lib/format";

/**
 * Westbridge mark: a bold "W" drawn as two bridge spans meeting at a pier,
 * with a red road line running beneath. Original artwork.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={cn("h-10 w-10 shrink-0", className)}>
      <rect width="48" height="48" rx="6" fill="#0B1F44" />
      <path d="M8 13l7.5 21L24 17l8.5 17L40 13" fill="none" stroke="#fff" strokeWidth="5" strokeLinejoin="miter" strokeLinecap="square" />
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
            "font-display text-[21px] font-black tracking-[-0.01em] [font-stretch:112%]",
            inverted ? "text-white" : "text-brand-900",
          )}
        >
          Westbridge
        </span>
        <span
          className={cn(
            "mt-1 flex items-center gap-1.5 text-[10.5px] font-bold tracking-[0.2em]",
            inverted ? "text-white/70" : "text-signal-600",
          )}
        >
          GLOBAL EXPRESS
        </span>
      </span>
    </span>
  );
}
