"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("common");
  useEffect(() => {
    console.error(error.digest ?? "page error");
  }, [error]);
  return (
    <section className="container-page flex min-h-[55vh] flex-col items-center justify-center py-20 text-center" role="alert">
      <h1 className="text-2xl font-bold text-navy-900">{t("error")}</h1>
      <p className="mt-3 max-w-md text-slate-600">{t("errorText")}</p>
      <div className="mt-8 flex gap-3">
        <button type="button" onClick={reset} className="btn-primary">
          {t("retry")}
        </button>
        <Link href="/" className="btn-outline">
          {t("backHome")}
        </Link>
      </div>
    </section>
  );
}
