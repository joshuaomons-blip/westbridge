import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <section className="container-page flex min-h-[55vh] flex-col items-center justify-center py-20 text-center">
      <p className="font-display text-7xl font-extrabold text-navy-100">404</p>
      <h1 className="mt-4 text-2xl font-bold text-brand-900">{t("title")}</h1>
      <p className="mt-3 max-w-md text-slate-600">{t("text")}</p>
      <Link href="/" className="btn-primary mt-8">
        {t("home")}
      </Link>
    </section>
  );
}
