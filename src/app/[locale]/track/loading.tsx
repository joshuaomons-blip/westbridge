import { getTranslations } from "next-intl/server";
import { TrackingLoader } from "@/components/site/TrackingLoader";

export default async function Loading() {
  const t = await getTranslations("tracking");
  return (
    <div className="min-h-[70vh] bg-slate-100">
      <div className="container-page pt-24">
        <TrackingLoader title={t("locating")} text={t("locatingText")} />
      </div>
    </div>
  );
}
