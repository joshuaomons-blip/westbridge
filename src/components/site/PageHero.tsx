import Image from "next/image";
import { PHOTOS } from "@/lib/photos";

/** Inner-page banner: brand navy over a muted logistics photo. `eyebrow` is accepted for compatibility but not shown. */
export function PageHero({ title, subtitle, image }: { title: string; subtitle?: string; eyebrow?: string; image?: string }) {
  return (
    <section className="relative isolate overflow-hidden bg-brand-900 text-white">
      <Image src={image ?? PHOTOS.warehouse} alt="" fill priority sizes="100vw" className="object-cover opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-r from-brand-950 via-brand-900/90 to-brand-900/50" aria-hidden />
      <div className="container-page relative py-14 sm:py-20">
        <h1 className="font-display max-w-3xl text-4xl font-black tracking-[-0.02em] text-balance [font-stretch:110%] sm:text-5xl">
          {title}
        </h1>
        {subtitle && <p className="mt-4 max-w-2xl text-lg text-white/80">{subtitle}</p>}
      </div>
      <div className="relative h-1 bg-signal-600" aria-hidden />
    </section>
  );
}
