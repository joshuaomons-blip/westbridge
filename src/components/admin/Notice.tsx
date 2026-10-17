"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CircleCheck, ShieldAlert, X } from "lucide-react";

const MESSAGES: Record<string, string> = {
  created: "Shipment created. Its tracking number is ready to share.",
  saved: "Changes saved.",
  denied: "Your role does not have access to that page.",
};

/** Turns an ?email= outcome code into a sentence (mirrors describeOutcome on the server). */
function emailText(code: string | null): string | null {
  if (!code) return null;
  if (code === "disabled") return "Customer emails are switched off for this shipment.";
  if (code === "not_published") return "No email sent (tracking page is not published).";
  if (code === "no_addresses") return "No email sent: add a sender or recipient email to notify them.";
  if (code === "not_configured") return "Email not sent: the email service is not set up yet (see Settings).";
  const m = /^(sent|failed)-(\d+)(?:-(\d+))?$/.exec(code);
  if (!m) return null;
  if (m[1] === "failed") return "The email could not be sent. Please try again later.";
  const n = Number(m[2]);
  return `Email sent to ${n} recipient${n === 1 ? "" : "s"}.` + (m[3] ? ` ${m[3]} could not be sent.` : "");
}

/** Shows one-off notices passed in the URL (?notice=created, ?denied=1) and then removes them. */
export function Notice() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const key = params.get("denied") ? "denied" : params.get("notice");
  const email = params.get("email");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (key && MESSAGES[key]) {
      setMsg([MESSAGES[key], emailText(email)].filter(Boolean).join(" "));
      const next = new URLSearchParams(params.toString());
      next.delete("notice");
      next.delete("denied");
      next.delete("email");
      router.replace(pathname + (next.size ? `?${next}` : ""), { scroll: false });
      const timer = setTimeout(() => setMsg(null), 9000);
      return () => clearTimeout(timer);
    }
  }, [key, email, params, pathname, router]);

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
