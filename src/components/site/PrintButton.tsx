"use client";

import { Printer } from "lucide-react";
import { cn } from "@/lib/format";

export function PrintButton({ label, className }: { label: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-semibold transition print:hidden",
        className ?? "text-white/85 hover:bg-white/10 hover:text-white",
      )}
    >
      <Printer className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}
