import { code128Bars } from "@/lib/barcode128";

/** Code 128 barcode as crisp SVG bars (scannable when printed). */
export function Barcode({ value, height = 64 }: { value: string; height?: number }) {
  const bars = code128Bars(value);
  const total = bars.total ?? 0;
  return (
    <svg viewBox={`0 0 ${total} ${height}`} preserveAspectRatio="none" className="h-full w-full" role="img" aria-label={`Barcode ${value}`}>
      <rect width={total} height={height} fill="#fff" />
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.w} height={height} fill="#000" />
      ))}
    </svg>
  );
}
