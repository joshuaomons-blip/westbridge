import { cn } from "@/lib/format";

/** Original Westbridge Global Express wordmark: a bridge arc over a meridian line. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={cn("h-9 w-9 shrink-0", className)}>
      <rect width="40" height="40" rx="8" className="fill-navy-800" />
      <path d="M7 27c4-9 9.5-13 13-13s9 4 13 13" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M12 27v-5.2M20 27v-9M28 27v-5.2" stroke="white" strokeWidth="2" strokeLinecap="round" opacity=".75" />
      <path d="M6 30.5h28" stroke="#d4302f" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ inverted = false, className }: { inverted?: boolean; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display text-[17px] font-extrabold tracking-tight",
            inverted ? "text-white" : "text-navy-900",
          )}
        >
          WESTBRIDGE
        </span>
        <span
          className={cn(
            "mt-1 text-[9.5px] font-semibold tracking-[0.28em]",
            inverted ? "text-navy-200" : "text-slate-500",
          )}
        >
          GLOBAL EXPRESS
        </span>
      </span>
    </span>
  );
}
