export function PageHero({ title, subtitle, eyebrow }: { title: string; subtitle?: string; eyebrow?: string }) {
  return (
    <section className="relative overflow-hidden bg-navy-950 py-16 text-white sm:py-20">
      <div
        className="absolute inset-0 opacity-[0.15] [background-image:radial-gradient(#8ea6cc_1px,transparent_1px)] [background-size:22px_22px]"
        aria-hidden
      />
      <div className="absolute right-0 bottom-0 h-1 w-1/3 bg-signal-600" aria-hidden />
      <div className="container-page relative">
        {eyebrow && <p className="eyebrow text-signal-500">{eyebrow}</p>}
        <h1 className="font-display mt-3 max-w-3xl text-3xl font-bold tracking-tight text-balance sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-4 max-w-2xl text-lg text-navy-200">{subtitle}</p>}
      </div>
    </section>
  );
}
