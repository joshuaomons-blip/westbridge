import Image from "next/image";
import { PHOTOS } from "@/lib/photos";

/** Inner-page banner: a full-colour logistics photo with the title over a navy fade. `eyebrow` is accepted for compatibility but not shown. */
export function PageHero({ title, subtitle, image }: { title: string; subtitle?: string; eyebrow?: string; image?: string }) {
  return (
    <section className="relative isolate overflow-hidden bg-brand-950 text-white">
      <Image src={image ?? PHOTOS.warehouse} alt="" fill priority sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-brand-950/95 via-brand-950/75 to-brand-950/15" aria-hidden />
      <div className="container-page relative py-20 sm:py-28">
        <h1 className="font-display max-w-3xl text-4xl font-black tracking-[-0.02em] text-balance [font-stretch:110%] sm:text-6xl">
          {title}
        </h1>
        {subtitle && <p className="mt-5 max-w-xl text-lg text-white/85">{subtitle}</p>}
      </div>
      <div className="relative h-1 bg-signal-600" aria-hidden />
    </section>
  );
}
