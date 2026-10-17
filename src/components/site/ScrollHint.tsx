"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/format";

/**
 * A quiet "scroll for details" cue shown shortly after a shipment is found.
 * Disappears as soon as the visitor scrolls; tapping it glides to `targetId`.
 */
export function ScrollHint({ label, targetId }: { label: string; targetId: string }) {
  const [show, setShow] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const start = window.scrollY;
    const timer = setTimeout(() => {
      // Only useful if there is more below the fold.
      if (document.documentElement.scrollHeight - window.innerHeight - window.scrollY > 200) setShow(true);
    }, 1400);
    const onScroll = () => {
      if (Math.abs(window.scrollY - start) > 80) setGone(true);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  if (gone) return null;
  return (
    <button
      type="button"
      onClick={() => {
        document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
        setGone(true);
      }}
      className={cn(
        "fixed bottom-6 left-1/2 z-30 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-brand-950/75 px-3.5 py-2 text-xs font-medium text-white/90 shadow-lg backdrop-blur transition-all duration-700 print:hidden",
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      {label}
      <ChevronDown className="trk-bob h-4 w-4" aria-hidden />
    </button>
  );
}
