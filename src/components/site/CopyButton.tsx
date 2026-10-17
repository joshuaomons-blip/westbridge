"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/format";

export function CopyButton({
  value,
  label,
  copiedLabel,
  className,
  showText = false,
}: {
  value: string;
  label: string;
  copiedLabel: string;
  className?: string;
  showText?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unavailable (e.g. insecure context); nothing else to do.
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? copiedLabel : label}
      title={label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md p-1.5 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-brand-800",
        className,
      )}
    >
      {copied ? <Check className="h-4 w-4 text-emerald-600" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      {showText && <span>{copied ? copiedLabel : label}</span>}
      <span className="sr-only" aria-live="polite">
        {copied ? copiedLabel : ""}
      </span>
    </button>
  );
}
