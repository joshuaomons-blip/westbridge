import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { getSiteContent } from "@/lib/content";
import { Barcode } from "@/components/admin/Barcode";
import { LogoMark } from "@/components/site/Logo";
import { PrintButton } from "@/components/site/PrintButton";

export const metadata: Metadata = { title: "Shipment receipt" };

const TYPE: Record<string, string> = { parcel: "Parcel", document: "Documents", freight: "Freight", pallet: "Pallet", other: "Other" };

function fmtDate(d?: string | null) {
  return d ? new Date(`${d.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : "—";
}

/**
 * Printable A4 shipment receipt handed to the sender at drop-off: two copies
 * (customer and office) with signature boxes for the sender and Norvane staff.
 */
export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("shipments.read");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await createSessionClient();
  const { data: s } = await db
    .from("shipments")
    .select(
      "tracking_number, internal_ref, shipment_type, sender_name, sender_email, sender_phone, origin_city, origin_country, origin_address, recipient_name, recipient_phone, destination_city, destination_country, destination_address, package_description, package_quantity, weight_kg, shipment_date, estimated_delivery, route_stops, services(title)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!s) notFound();
  const content = await getSiteContent("en", false);
  const company = {
    address: content.get("contact.address"),
    phone: content.get("contact.phone"),
    email: content.get("contact.email") ?? "support@norvaneexpress.com",
    reg: content.get("company.reg_number"),
  };
  const service = (s.services as { title?: Record<string, string> } | null)?.title?.en ?? "Standard";
  const stops: string[] = (s.route_stops as string[] | null) ?? [];
  const route = [`${s.origin_city}, ${s.origin_country}`, ...stops, `${s.destination_city}, ${s.destination_country}`].map((x) => x.split(",")[0]).join(" → ");

  const copy = (label: string) => (
    <section className="rc">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <LogoMark className="h-[13mm] w-[13mm]" />
          <div className="leading-none">
            <p className="text-[15pt] font-extrabold tracking-[0.16em] text-[#0B1F44]">NORVANE</p>
            <p className="mt-[1.2mm] text-[7pt] font-semibold tracking-[0.55em] text-slate-500">EXPRESS</p>
          </div>
        </div>
        <div className="text-right text-[7.5pt] leading-snug text-slate-600">
          {company.address && <p className="whitespace-pre-line">{company.address}</p>}
          {company.phone && <p>{company.phone}</p>}
          <p>{company.email} · norvaneexpress.com</p>
          {company.reg && <p>Reg. no. {company.reg}</p>}
        </div>
      </div>

      <div className="mt-[3mm] flex items-end justify-between border-b-[0.6mm] border-[#0B1F44] pb-[1.5mm]">
        <h1 className="text-[16pt] font-extrabold text-[#0B1F44]">Shipment Receipt</h1>
        <span className="rounded-sm bg-[#0B1F44] px-[2.5mm] py-[0.8mm] text-[7.5pt] font-bold tracking-[0.15em] text-white uppercase">{label}</span>
      </div>

      {/* Tracking */}
      <div className="mt-[3mm] grid grid-cols-[1fr_62mm] items-center gap-[4mm]">
        <div className="grid grid-cols-3 gap-[3mm] text-[8pt]">
          {[
            ["Tracking number", s.tracking_number],
            ["Receipt no.", s.internal_ref ?? "—"],
            ["Date", fmtDate(s.shipment_date)],
            ["Service", service],
            ["Type", TYPE[s.shipment_type as string] ?? s.shipment_type],
            ["Est. delivery", fmtDate(s.estimated_delivery)],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-[6.5pt] font-bold tracking-[0.12em] text-slate-500 uppercase">{k}</p>
              <p className={k === "Tracking number" ? "font-mono text-[10pt] font-bold" : "font-semibold"}>{v}</p>
            </div>
          ))}
        </div>
        <div>
          <div className="h-[13mm]">
            <Barcode value={s.tracking_number} />
          </div>
          <p className="mt-[0.5mm] text-center font-mono text-[8pt] tracking-[0.2em]">{s.tracking_number}</p>
        </div>
      </div>

      {/* Parties */}
      <div className="mt-[3mm] grid grid-cols-2 gap-[3mm] text-[8.5pt]">
        {[
          ["Sender", s.sender_name, [s.origin_address, `${s.origin_city}, ${s.origin_country}`], s.sender_phone, s.sender_email],
          ["Recipient", s.recipient_name, [s.destination_address, `${s.destination_city}, ${s.destination_country}`], s.recipient_phone, null],
        ].map(([k, name, lines, phone, email]) => (
          <div key={k as string} className="rounded-[1.5mm] border-[0.35mm] border-slate-300 p-[2.5mm]">
            <p className="text-[6.5pt] font-bold tracking-[0.12em] text-slate-500 uppercase">{k as string}</p>
            <p className="mt-[0.5mm] text-[10pt] font-bold">{name as string}</p>
            {(lines as (string | null)[]).filter(Boolean).map((l) => (
              <p key={l as string} className="leading-snug">{l}</p>
            ))}
            {phone && <p className="leading-snug">Tel: {phone as string}</p>}
            {email && <p className="leading-snug">{email as string}</p>}
          </div>
        ))}
      </div>

      {/* Package */}
      <table className="mt-[3mm] w-full border-collapse text-[8.5pt]">
        <thead>
          <tr className="bg-slate-100 text-left text-[6.5pt] tracking-[0.12em] text-slate-600 uppercase">
            <th className="px-[2mm] py-[1.2mm]">Description of contents</th>
            <th className="px-[2mm] py-[1.2mm] text-center">Pieces</th>
            <th className="px-[2mm] py-[1.2mm] text-center">Weight</th>
            <th className="px-[2mm] py-[1.2mm]">Route</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b-[0.35mm] border-slate-300">
            <td className="px-[2mm] py-[1.8mm] font-semibold">{s.package_description ?? "—"}</td>
            <td className="px-[2mm] py-[1.8mm] text-center">{s.package_quantity}</td>
            <td className="px-[2mm] py-[1.8mm] text-center">{s.weight_kg ? `${s.weight_kg} kg` : "—"}</td>
            <td className="px-[2mm] py-[1.8mm]">{route}</td>
          </tr>
        </tbody>
      </table>

      {/* Declaration + signatures */}
      <p className="mt-[2.5mm] text-[7pt] leading-snug text-slate-600">
        The sender confirms that the details above are correct and that the shipment contains no prohibited or dangerous items. Carriage is subject to the
        Norvane Express terms and conditions at norvaneexpress.com/terms. Track this shipment at any time at norvaneexpress.com/track.
      </p>
      <div className="mt-[3mm] grid grid-cols-2 gap-[6mm] text-[7.5pt]">
        {["Sender's signature", "Received by (Norvane Express)"].map((k) => (
          <div key={k}>
            <div className="h-[11mm] border-b-[0.35mm] border-black" />
            <div className="mt-[1mm] flex justify-between text-slate-600">
              <span className="font-semibold">{k}</span>
              <span>Date: ____ / ____ / ________</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <div className="receipt-root">
      <style>{`
        @page { size: A4; margin: 0; }
        .receipt-root { background:#e2e8f0; min-height:100vh; padding:24px 12px; }
        .sheet { width:210mm; height:297mm; background:#fff; color:#0f172a; margin:0 auto; box-sizing:border-box; padding:9mm 12mm; display:flex; flex-direction:column; justify-content:space-between; font-family: Arial, Helvetica, sans-serif; box-shadow:0 2px 12px rgba(0,0,0,.15); }
        .rc { height:132mm; overflow:hidden; }
        .cut { border-top:0.4mm dashed #94a3b8; position:relative; margin:0 -12mm; }
        .cut span { position:absolute; left:50%; top:-2.2mm; transform:translateX(-50%); background:#fff; padding:0 3mm; font-size:7pt; color:#94a3b8; }
        @media print {
          .receipt-root { background:#fff; padding:0; }
          .no-print { display:none !important; }
          .sheet { margin:0; box-shadow:none; }
        }
      `}</style>
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 text-sm text-slate-700">
        <span>A4 · two copies (customer and office) — cut along the dashed line, both parties sign.</span>
        <PrintButton label="Print receipt" className="inline-flex items-center gap-2 rounded-md bg-navy-700 px-4 py-2 font-semibold text-white hover:bg-navy-800" />
      </div>
      <div className="sheet">
        {copy("Customer copy")}
        <div className="cut">
          <span>✂ cut here</span>
        </div>
        {copy("Office copy")}
      </div>
    </div>
  );
}
