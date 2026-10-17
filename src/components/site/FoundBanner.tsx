/** Green "shipment found" confirmation with a tick that draws itself. */
export function FoundBanner({ title, text }: { title: string; text: string }) {
  return (
    <div className="trk-pop flex items-center gap-4 rounded-2xl bg-emerald-600 px-5 py-4 text-white shadow-[0_18px_40px_-20px_rgba(5,150,105,0.8)] print:hidden" role="status">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 ring-2 ring-white/40">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path className="trk-check" d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
      <div className="min-w-0">
        <p className="font-display text-lg leading-tight font-black [font-stretch:108%]">{title}</p>
        <p className="text-sm text-white/90">{text}</p>
      </div>
    </div>
  );
}
