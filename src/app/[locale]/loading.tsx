import { getTranslations } from "next-intl/server";

export default async function Loading() {
  const t = await getTranslations("common");
  return (
    <div className="container-page flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-navy-200 border-t-brand-800" />
      <span className="sr-only">{t("loading")}</span>
    </div>
  );
}
