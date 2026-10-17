"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const KEY = "wb_cookie_notice_v1";

/** Informational notice: the site sets only essential cookies (language, admin session). */
export function CookieNotice() {
  const t = useTranslations("cookie");
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      // storage blocked: don't nag
    }
  }, []);

  if (!show) return null;
  return (
    <div
      role="region"
      aria-label="Cookies"
      className="animate-fade-up fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl sm:inset-x-6 sm:bottom-6 sm:flex sm:items-center sm:gap-4"
    >
      <p className="text-sm text-slate-600">
        {t("text")}{" "}
        <Link href="/privacy" className="font-medium text-navy-700 underline underline-offset-2">
          {t("learnMore")}
        </Link>
      </p>
      <button
        type="button"
        className="btn-primary mt-3 w-full shrink-0 sm:mt-0 sm:w-auto"
        onClick={() => {
          try {
            localStorage.setItem(KEY, "1");
          } catch {}
          setShow(false);
        }}
      >
        {t("accept")}
      </button>
    </div>
  );
}
