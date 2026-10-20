import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { Barcode } from "@/components/admin/Barcode";
import { LogoMark } from "@/components/site/Logo";
import { PrintButton } from "@/components/site/PrintButton";

export const metadata: Metadata = { title: "Shipping label" };

const TYPE: Record<string, string> = { parcel: "Parcel", document: "Documents", freight: "Freight", pallet: "Pallet", other: "Other" };

function Party({ label, name, phone, address, city, country, big }: { label: string; name: string; phone?: string | null; address?: string | null; city: string; country: string; big?: boolean }) {
  return (
    <div>
      <p className="text-[8pt] font-bold tracking-[0.15em] uppercase">{label}</p>
      <p className={big ? "mt-0.5 text-[13pt] leading-tight font-extrabold" : "mt-0.5 text-[9.5pt] leading-tight font-bold"}>{name}</p>
      {address && <p className={big ? "text-[10.5pt] leading-snug" : "text-[8.5pt] leading-snug"}>{address}</p>}
      <p className={big ? "text-[12pt] leading-snug font-extrabold uppercase" : "text-[8.5pt] leading-snug font-semibold uppercase"}>
        {city}, {country}
      </p>
      {phone && <p className={big ? "text-[10pt]" : "text-[8pt]"}>Tel: {phone}</p>}
    </div>
  );
}

/**
 * Printable 4×6 in (100×150 mm) shipping label / waybill, one page per package.
 * Contains only what a courier label needs; no internal notes.
 */
export default async function LabelPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("shipments.read");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await createSessionClient();
  const { data: s } = await db
    .from("shipments")
    .select(
      "tracking_number, internal_ref, shipment_type, sender_name, sender_phone, origin_city, origin_country, origin_address, recipient_name, recipient_phone, destination_city, destination_country, destination_address, package_description, package_quantity, weight_kg, shipment_date, route_stops, services(title)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!s) notFound();

  const pieces = Math.max(1, Math.min(50, Number(s.package_quantity) || 1));
  const service = (s.services as { title?: Record<string, string> } | null)?.title?.en ?? "Standard";
  const stops: string[] = (s.route_stops as string[] | null) ?? [];
  const code = (city: string) => city.replace(/[^A-Za-zÀ-ž]/g, "").slice(0, 3).toUpperCase();
  const date = s.shipment_date ? new Date(`${s.shipment_date}T12:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";

  return (
    <div className="label-root">
      <style>{`
        @page { size: 100mm 150mm; margin: 0; }
        .label-root { background:#e2e8f0; min-height:100vh; padding:24px 12px; }
        .label { width:100mm; height:150mm; background:#fff; color:#000; margin:0 auto 16px; box-sizing:border-box; padding:4mm; display:flex; flex-direction:column; font-family: Arial, Helvetica, sans-serif; box-shadow:0 2px 10px rgba(0,0,0,.15); }
        .label .box { border:0.5mm solid #000; }
        @media print {
          .label-root { background:#fff; padding:0; }
          .no-print { display:none !important; }
          .label { margin:0; box-shadow:none; break-after:page; page-break-after:always; }
          .label:last-child { break-after:auto; page-break-after:auto; }
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex max-w-[100mm] flex-wrap items-center justify-between gap-3 text-sm text-slate-700">
        <span>
          {pieces} label{pieces > 1 ? "s" : ""} · 4×6 in (100×150 mm)
        </span>
        <PrintButton label="Print label" className="inline-flex items-center gap-2 rounded-md bg-navy-700 px-4 py-2 font-semibold text-white hover:bg-navy-800" />
      </div>

      {Array.from({ length: pieces }, (_, n) => (
        <section key={n} className="label" aria-label={`Label ${n + 1} of ${pieces}`}>
          {/* Header */}
          <div className="flex items-center justify-between border-b-[0.6mm] border-black pb-[2mm]">
            <div className="flex items-center gap-[2mm]">
              <LogoMark className="h-[10mm] w-[10mm]" />
              <div className="leading-none">
                <p className="text-[12pt] font-extrabold tracking-[0.14em]">NORVANE</p>
                <p className="mt-[1mm] text-[6.5pt] font-semibold tracking-[0.5em]">EXPRESS</p>
              </div>
            </div>
            <div className="text-right leading-tight">
              <p className="text-[9pt] font-extrabold uppercase">{service}</p>
              <p className="text-[7.5pt]">{TYPE[s.shipment_type as string] ?? s.shipment_type}</p>
            </div>
          </div>

          {/* Route */}
          <div className="mt-[2mm] flex items-center justify-between bg-black px-[3mm] py-[2mm] text-white">
            <span className="text-[20pt] leading-none font-extrabold tracking-wider">{code(s.origin_city)}</span>
            <span className="truncate px-[2mm] text-[7pt] tracking-wide">{stops.length ? `via ${stops.map((x) => x.split(",")[0]).join(" · ")}` : "direct"} ✈</span>
            <span className="text-[20pt] leading-none font-extrabold tracking-wider">{code(s.destination_city)}</span>
          </div>

          {/* From / To */}
          <div className="box mt-[2mm] px-[2.5mm] py-[1.5mm]">
            <Party label="From" name={s.sender_name} phone={s.sender_phone} address={s.origin_address} city={s.origin_city} country={s.origin_country} />
          </div>
          <div className="box mt-[1.5mm] flex-1 border-[0.8mm] px-[2.5mm] py-[2mm]">
            <Party label="Ship to" name={s.recipient_name} phone={s.recipient_phone} address={s.destination_address} city={s.destination_city} country={s.destination_country} big />
          </div>

          {/* Details */}
          <div className="box mt-[1.5mm] grid grid-cols-4 text-center text-[7pt]">
            {[
              ["Piece", `${n + 1} of ${pieces}`],
              ["Weight", s.weight_kg ? `${Number(s.weight_kg)} kg${pieces > 1 ? " total" : ""}` : "—"],
              ["Date", date],
              ["Ref", s.internal_ref ?? "—"],
            ].map(([k, v], i) => (
              <div key={k} className={i ? "border-l-[0.4mm] border-black px-[1mm] py-[1mm]" : "px-[1mm] py-[1mm]"}>
                <p className="font-bold uppercase">{k}</p>
                <p className="truncate text-[8.5pt] font-bold">{v}</p>
              </div>
            ))}
          </div>
          {s.package_description && <p className="mt-[1mm] truncate text-[7pt]">Contents: {s.package_description}</p>}

          {/* Barcode */}
          <div className="mt-[1.5mm] h-[20mm]">
            <Barcode value={s.tracking_number} />
          </div>
          <p className="mt-[0.8mm] text-center font-mono text-[13pt] font-bold tracking-[0.25em]">{s.tracking_number}</p>
          <p className="mt-[0.5mm] text-center text-[6.5pt]">Track at norvaneexpress.com/track</p>
        </section>
      ))}
    </div>
  );
}
