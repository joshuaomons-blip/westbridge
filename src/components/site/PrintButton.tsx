"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white print:hidden"
    >
      <Printer className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}
