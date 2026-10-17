"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CircleCheck, ShieldAlert, X } from "lucide-react";

const MESSAGES: Record<string, string> = {
  created: "Shipment created. Its tracking number is ready to share.",
  saved: "Changes saved.",
  denied: "Your role does not have access to that page.",
};

/** Shows one-off notices passed in the URL (?notice=created, ?denied=1) and then removes them. */
export function Notice() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const key = params.get("denied") ? "denied" : params.get("notice");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (key && MESSAGES[key]) {
      setMsg(MESSAGES[key]);
      const next = new URLSearchParams(params.toString());
      next.delete("notice");
      next.delete("denied");
      router.replace(pathname + (next.size ? `?${next}` : ""), { scroll: false });
      const timer = setTimeout(() => setMsg(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [key, params, pathname, router]);

  if (!msg) return null;
  const denied = msg === MESSAGES.denied;
  return (
    <div
      role="status"
      className={`animate-fade-up fixed top-4 right-4 left-4 z-50 mx-auto flex max-w-md items-start gap-3 rounded-lg border p-4 shadow-lg sm:left-auto ${
        denied ? "border-amber-300 bg-amber-50 text-amber-900" : "border-emerald-200 bg-white text-slate-800"
      }`}
    >
      {denied ? <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" /> : <CircleCheck className="h-5 w-5 shrink-0 text-emerald-600" />}
      <p className="flex-1 text-sm">{msg}</p>
      <button type="button" onClick={() => setMsg(null)} aria-label="Dismiss" className="text-slate-400 hover:text-slate-600">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
