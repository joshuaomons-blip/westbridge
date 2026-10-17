import { getTranslations } from "next-intl/server";
import { TriangleAlert } from "lucide-react";
import { PageHero } from "./PageHero";
import { paragraphs } from "@/lib/content";

export async function LegalPage({ title, body, isPlaceholder }: { title: string; body: string; isPlaceholder: boolean }) {
  const t = await getTranslations("legal");
  return (
    <>
      <PageHero title={title} />
      <section className="py-14 lg:py-16">
        <div className="container-page max-w-3xl">
          {isPlaceholder && (
            <div className="mb-8 flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" role="note">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <p>{t("reviewNotice")}</p>
            </div>
          )}
          <div className="space-y-5 leading-relaxed text-slate-700">
            {paragraphs(body).map((p, i) => (
              <p key={i} className="whitespace-pre-line">
                {p}
              </p>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
