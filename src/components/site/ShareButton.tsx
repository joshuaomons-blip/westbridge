"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { cn } from "@/lib/format";

/** Opens the device share sheet where available, otherwise copies the page link. */
export function ShareButton({ label, copiedLabel, title, className }: { label: string; copiedLabel: string; title: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Share sheet dismissed or clipboard unavailable; nothing else to do.
    }
  }
  return (
    <button type="button" onClick={share} className={cn("inline-flex items-center justify-center gap-2", className)}>
      {copied ? <Check className="h-4 w-4" aria-hidden /> : <Share2 className="h-4 w-4" aria-hidden />}
      <span>{copied ? copiedLabel : label}</span>
      <span className="sr-only" aria-live="polite">
        {copied ? copiedLabel : ""}
      </span>
    </button>
  );
}
