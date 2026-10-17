import { getTranslations } from "next-intl/server";
import { Eye, FlaskConical, Info } from "lucide-react";
import { stopPreview } from "@/actions/admin/site";

export async function DemoBanner() {
  const t = await getTranslations("demo");
  return (
    <div className="bg-amber-100 text-amber-900">
      <p className="container-page flex items-center gap-2 py-2 text-xs font-medium sm:text-sm">
        <FlaskConical className="h-4 w-4 shrink-0" aria-hidden />
        {t("banner")}
      </p>
    </div>
  );
}

export async function PreviewBanner() {
  const t = await getTranslations("preview");
  return (
    <div className="bg-brand-900 text-white">
      <div className="container-page flex flex-wrap items-center gap-x-4 gap-y-1 py-2 text-xs font-medium sm:text-sm">
        <p className="flex items-center gap-2">
          <Eye className="h-4 w-4 shrink-0" aria-hidden />
          {t("banner")}
        </p>
        <form action={stopPreview} className="ml-auto">
          <button type="submit" className="rounded bg-white/15 px-2.5 py-1 font-semibold hover:bg-white/25">
            {t("exit")}
          </button>
        </form>
      </div>
    </div>
  );
}

/** Site-wide notice written by an administrator (Website Content → Notice bar). */
export function NoticeBar({ text }: { text: string }) {
  return (
    <div className="bg-signal-600 text-white" role="note">
      <p className="container-page flex items-center gap-2 py-2 text-sm font-medium">
        <Info className="h-4 w-4 shrink-0" aria-hidden />
        {text}
      </p>
    </div>
  );
}
