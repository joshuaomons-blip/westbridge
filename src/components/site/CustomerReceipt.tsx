"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { LoaderCircle, Printer, ReceiptText, Search } from "lucide-react";
import { lookupReceipt, type CustomerReceipt as Receipt, type ReceiptState } from "@/actions/receipt";
import { LogoMark } from "./Logo";

const initial: ReceiptState = { status: "idle" };

function fmtDate(d: string | null, locale: string) {
  if (!d) return "—";
  return new Date(`${d.slice(0, 10)}T12:00:00Z`).toLocaleDateString(locale, { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
}

export function CustomerReceipt({ initialNumber }: { initialNumber?: string }) {
  const t = useTranslations("receipt");
  const [state, action, pending] = useActionState(lookupReceipt, initial);

  return (
    <div>
      <form action={action} className="grid gap-4 rounded-2xl bg-white p-6 ring-1 ring-slate-200 sm:grid-cols-[1fr_200px_auto] sm:items-end sm:p-8 print:hidden">
        <div>
          <label htmlFor="r-n" className="label">
            {t("trackingLabel")}
          </label>
          <input
            id="r-n"
            name="n"
            required
            maxLength={40}
            defaultValue={initialNumber}
            autoComplete="off"
            spellCheck={false}
            className="input h-12 font-mono uppercase"
          />
        </div>
        <div>
          <label htmlFor="r-p" className="label">
            {t("phoneLabel")}
          </label>
          <input id="r-p" name="p" required inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="off" className="input h-12 font-mono tracking-[0.3em]" />
        </div>
        <button type="submit" disabled={pending} className="btn-accent h-12 px-6">
          {pending ? <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden /> : <Search className="h-5 w-5" aria-hidden />}
          {t("submit")}
        </button>
        <p className="text-xs text-slate-500 sm:col-span-3">{t("phoneHint")}</p>
        {state.status === "error" && (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:col-span-3" role="alert">
            {state.error === "not_found" ? t("notFound") : state.error === "rate_limited" ? t("rateLimited") : state.error === "invalid" ? t("invalid") : t("generic")}
          </p>
        )}
      </form>

      {state.status === "found" && <ReceiptView r={state.receipt} />}
    </div>
  );
}

function ReceiptView({ r }: { r: Receipt }) {
  const t = useTranslations("receipt");
  const ts = useTranslations("shipmentType");
  const locale = useLocale();
  const typeKey = (["parcel", "document", "freight", "pallet", "vehicle", "other"] as const).find((k) => k === r.shipment_type);
  const service = r.service ? (r.service[locale] || r.service.en || "—") : "—";
  const route = [r.sender.city, ...r.route_stops.map((x) => x.split(",")[0]), r.recipient.city].join(" → ");
  const v = r.vehicle;

  return (
    <div className="mt-8">
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body * { visibility: hidden !important; }
          .customer-receipt, .customer-receipt * { visibility: visible !important; }
          .customer-receipt { position: absolute; inset: 0 auto auto 0; width: 100%; box-shadow: none !important; border: 0 !important; }
        }
      `}</style>
      <div className="mb-4 flex justify-end print:hidden">
        <button type="button" onClick={() => window.print()} className="btn-primary h-11 px-5">
          <Printer className="h-4 w-4" aria-hidden />
          {t("print")}
        </button>
      </div>

      <article className="customer-receipt rounded-2xl bg-white p-6 text-slate-800 shadow-[0_24px_60px_-30px_rgba(7,21,47,0.45)] ring-1 ring-slate-200 sm:p-10">
        <header className="flex items-start justify-between gap-4 border-b-2 border-brand-900 pb-4">
          <div className="flex items-center gap-3">
            <LogoMark className="h-12 w-12" />
            <div className="leading-none">
              <p className="text-xl font-extrabold tracking-[0.16em] text-brand-900">NORVANE</p>
              <p className="mt-1 text-[10px] font-semibold tracking-[0.5em] text-slate-500">EXPRESS</p>
            </div>
          </div>
          <div className="text-right">
            <p className="flex items-center justify-end gap-2 text-lg font-extrabold text-brand-900">
              <ReceiptText className="h-5 w-5" aria-hidden />
              {t("title")}
            </p>
            <span className="mt-1 inline-block rounded bg-brand-900 px-2 py-0.5 text-[10px] font-bold tracking-[0.15em] text-white uppercase">{t("customerCopy")}</span>
          </div>
        </header>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
          <Item k={t("trackingNumber")} v={r.tracking_number} mono />
          <Item k={t("receiptNo")} v={r.internal_ref ?? "—"} />
          <Item k={t("date")} v={fmtDate(r.shipment_date, locale)} />
          <Item k={t("service")} v={service} />
          <Item k={t("type")} v={typeKey ? ts(typeKey) : r.shipment_type} />
          <Item k={t("estDelivery")} v={fmtDate(r.estimated_delivery, locale)} />
        </dl>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[
            [t("sender"), r.sender],
            [t("recipient"), r.recipient],
          ].map(([label, p]) => {
            const party = p as Receipt["sender"];
            return (
              <div key={label as string} className="rounded-xl border border-slate-200 p-4">
                <p className="text-[10px] font-bold tracking-[0.14em] text-slate-500 uppercase">{label as string}</p>
                <p className="mt-1 text-base font-bold text-brand-900">{party.name}</p>
                {party.address && <p className="text-sm leading-snug">{party.address}</p>}
                <p className="text-sm leading-snug">
                  {party.city}, {party.country}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-left text-[10px] tracking-[0.12em] text-slate-600 uppercase">
                <th className="px-3 py-2">{t("contents")}</th>
                <th className="px-3 py-2 text-center">{t("pieces")}</th>
                <th className="px-3 py-2 text-center">{t("weight")}</th>
                <th className="px-3 py-2">{t("route")}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="px-3 py-3 font-semibold">{r.package_description ?? "—"}</td>
                <td className="px-3 py-3 text-center">{r.package_quantity}</td>
                <td className="px-3 py-3 text-center">{r.weight_kg ? `${Number(r.weight_kg)} kg` : "—"}</td>
                <td className="px-3 py-3">{route}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {v && (
          <dl className="mt-6 grid grid-cols-2 gap-4 rounded-xl border border-slate-200 p-4 text-sm sm:grid-cols-5">
            <Item k={t("make")} v={v.make ?? "—"} />
            <Item k={t("model")} v={v.model ?? "—"} />
            <Item k={t("year")} v={v.year ? String(v.year) : "—"} />
            <Item k={t("colour")} v={v.color ?? "—"} />
            <Item k="VIN" v={v.vin ?? "—"} mono />
          </dl>
        )}

        {r.amount_paid_usdt != null && (
          <div className="mt-6 flex justify-end">
            <div className="flex items-center gap-4 rounded-xl border-2 border-brand-900 px-5 py-3">
              <p className="text-[11px] font-bold tracking-[0.12em] text-slate-600 uppercase">{t("amountPaid")}</p>
              <p className="font-mono text-xl font-extrabold text-brand-900">
                {Number(r.amount_paid_usdt).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
              </p>
            </div>
          </div>
        )}

        <p className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-500">{t("footer")}</p>
      </article>
    </div>
  );
}

function Item({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] font-bold tracking-[0.12em] text-slate-500 uppercase">{k}</dt>
      <dd className={mono ? "mt-0.5 font-mono font-bold break-all text-brand-900" : "mt-0.5 font-semibold text-slate-900"}>{v}</dd>
    </div>
  );
}
