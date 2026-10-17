import { Package, Truck } from "lucide-react";
import { cn } from "@/lib/format";

/** Animated "locating your shipment" card: a truck driving along a dashed road. */
export function TrackingLoader({ title, text, overlay = false }: { title: string; text: string; overlay?: boolean }) {
  const card = (
    <div className="trk-pop w-full max-w-md rounded-2xl bg-brand-950 p-7 text-white shadow-[0_30px_80px_-20px_rgba(7,21,47,0.7)] ring-1 ring-white/10" role="status" aria-live="polite">
      <div className="relative mx-2 h-12">
        <span className="trk-road absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2" aria-hidden />
        <span className="absolute top-1/2 left-0 h-3 w-3 -translate-y-1/2 rounded-full bg-white" aria-hidden />
        <span className="absolute top-1/2 right-0 flex h-8 w-8 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full bg-white/10" aria-hidden>
          <Package className="h-4 w-4" />
        </span>
        <span className="trk-drive absolute top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-signal-600 shadow-lg" aria-hidden>
          <Truck className="h-5 w-5" />
        </span>
      </div>
      <p className="font-display mt-6 text-xl font-black [font-stretch:108%]">{title}</p>
      <p className="mt-1 text-sm text-white/70">{text}</p>
    </div>
  );
  if (!overlay) return <div className="flex justify-center py-16">{card}</div>;
  return (
    <div className={cn("fixed inset-0 z-[60] flex items-center justify-center bg-brand-950/40 p-6 backdrop-blur-sm print:hidden")}>{card}</div>
  );
}
