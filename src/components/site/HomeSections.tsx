import Image from "next/image";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  Check,
  Headset,
  ShieldAlert,
  Package,
  ClipboardCheck,
  Clock,
  FileText,
  MapPin,
  PackageCheck,
  Plus,
  TriangleAlert,
  Truck,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PHOTOS } from "@/lib/photos";
import { cn } from "@/lib/format";

/* -------------------------------------------------------------------------- */
/* Alternating photo + text rows                                              */
/* -------------------------------------------------------------------------- */

type Row = {
  id: string;
  photo: string;
  title: string;
  text: string;
  points: string[];
  cta: { href: string; label: string };
  ordered?: boolean;
};

export async function FeatureRows() {
  const t = await getTranslations("home");
  const rows: Row[] = [
    {
      id: "tracking-online",
      photo: PHOTOS.air,
      title: t("featTrackTitle"),
      text: t("featTrackText"),
      points: [t("featTrackPoint1"), t("featTrackPoint2"), t("featTrackPoint3")],
      cta: { href: "/track", label: t("featTrackCta") },
    },
    {
      id: "packing",
      photo: PHOTOS.parcels,
      title: t("featPackTitle"),
      text: t("featPackText"),
      points: [t("packTip1"), t("packTip2"), t("packTip3"), t("packTip4"), t("packTip5")],
      cta: { href: "/contact", label: t("featPackCta") },
      ordered: true,
    },
    {
      id: "business",
      photo: PHOTOS.forklift,
      title: t("featBizTitle"),
      text: t("featBizText"),
      points: [t("featBizPoint1"), t("featBizPoint2"), t("featBizPoint3")],
      cta: { href: "/contact", label: t("featBizCta") },
    },
  ];

  return (
    <section className="py-20 lg:py-28" aria-label={t("featTrackTitle")}>
      <div className="container-page space-y-20 lg:space-y-28">
        {rows.map((row, i) => {
          const List = row.ordered ? "ol" : "ul";
          return (
            <div key={row.title} id={row.id} className="grid scroll-mt-32 items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div className={cn("reveal relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-200", i % 2 === 1 && "lg:order-2")}>
                <Image src={row.photo} alt="" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
                <div className="absolute inset-x-0 bottom-0 h-1.5 bg-signal-600" aria-hidden />
              </div>
              <div>
                <h2 className="h-section text-brand-900">{row.title}</h2>
                <p className="mt-4 text-lg leading-relaxed text-slate-600">{row.text}</p>
                <List className="mt-7 space-y-3.5">
                  {row.points.map((p, n) => (
                    <li key={p} className="flex gap-3.5">
                      <span
                        className={cn(
                          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                          row.ordered ? "bg-brand-900 text-white" : "bg-signal-600/10 text-signal-600",
                        )}
                        aria-hidden
                      >
                        {row.ordered ? n + 1 : <Check className="h-4 w-4" />}
                      </span>
                      <span className="text-slate-700">{p}</span>
                    </li>
                  ))}
                </List>
                <Link href={row.cta.href} className="mt-8 inline-flex items-center gap-2 font-bold text-signal-600 hover:text-signal-700">
                  {row.cta.label}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* What each tracking status means (uses the same labels as the tracking page) */
/* -------------------------------------------------------------------------- */

const GUIDE: { code: string; icon: LucideIcon; tone: string }[] = [
  { code: "shipment_registered", icon: ClipboardCheck, tone: "bg-slate-100 text-brand-800" },
  { code: "awaiting_dispatch", icon: Clock, tone: "bg-slate-100 text-brand-800" },
  { code: "in_transit", icon: Truck, tone: "bg-brand-900 text-white" },
  { code: "arrived_at_facility", icon: Warehouse, tone: "bg-brand-900 text-white" },
  { code: "customs_processing", icon: FileText, tone: "bg-brand-900 text-white" },
  { code: "out_for_delivery", icon: MapPin, tone: "bg-signal-600 text-white" },
  { code: "delivered", icon: PackageCheck, tone: "bg-emerald-700 text-white" },
  { code: "delivery_exception", icon: TriangleAlert, tone: "bg-amber-700 text-white" },
];

export async function StatusGuide() {
  const t = await getTranslations("home");
  const ts = await getTranslations("status");
  const td = await getTranslations("statusDescription");
  return (
    <section id="status-guide" className="scroll-mt-28 bg-slate-50 py-20 lg:py-24" aria-labelledby="statusguide-heading">
      <div className="container-page">
        <div className="max-w-2xl">
          <h2 id="statusguide-heading" className="h-section text-brand-900">
            {t("statusGuideTitle")}
          </h2>
          <p className="mt-3 text-lg text-slate-600">{t("statusGuideText")}</p>
        </div>
        <ul className="reveal mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-slate-200 ring-1 ring-slate-200 lg:grid-cols-4">
          {GUIDE.map(({ code, icon: Icon, tone }) => (
            <li key={code} className="bg-white p-4 sm:p-6">
              <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", tone)}>
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-bold text-brand-900">{ts(code)}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{td(code)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Frequently asked questions                                                 */
/* -------------------------------------------------------------------------- */

export async function Faq() {
  const t = await getTranslations("home");
  const items = [1, 2, 3, 4, 5, 6].map((n) => ({ q: t(`faq${n}Q`), a: t(`faq${n}A`) }));
  return (
    <section id="faq" className="scroll-mt-28 py-20 lg:py-28" aria-labelledby="faq-heading">
      <div className="container-page grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h2 id="faq-heading" className="h-section text-brand-900">
            {t("faqTitle")}
          </h2>
          <p className="mt-3 text-lg text-slate-600">{t("faqText")}</p>
          <div className="relative mt-8 hidden aspect-[4/5] overflow-hidden rounded-2xl lg:block">
            <Image src={PHOTOS.handover} alt="" fill sizes="33vw" className="object-cover" />
          </div>
        </div>
        <div className="divide-y divide-slate-200 border-y border-slate-200 lg:col-span-8">
          {items.map((item) => (
            <details key={item.q} className="group py-1">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left text-lg font-bold text-brand-900 marker:hidden hover:text-brand-700 [&::-webkit-details-marker]:hidden">
                {item.q}
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-brand-900 transition group-open:rotate-45 group-open:bg-signal-600 group-open:text-white">
                  <Plus className="h-5 w-5" aria-hidden />
                </span>
              </summary>
              <p className="max-w-2xl pr-14 pb-6 leading-relaxed text-slate-600">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Full-width promo band                                                      */
/* -------------------------------------------------------------------------- */

export async function PromoBand() {
  const t = await getTranslations("home");
  const icons = [Package, ClipboardCheck, Headset];
  return (
    <section className="bg-brand-800 text-white" aria-labelledby="promo-heading">
      <div className="container-page flex flex-col items-center py-16 text-center lg:py-20">
        <div className="flex gap-3" aria-hidden>
          {icons.map((Icon, i) => (
            <span key={i} className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
              <Icon className="h-6 w-6" />
            </span>
          ))}
        </div>
        <h2 id="promo-heading" className="h-section mt-6 max-w-3xl text-balance">
          {t("promoTitle")}
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-white/80">{t("promoText")}</p>
        <Link href="/contact" className="btn-accent mt-8 h-13 px-8 text-base">
          {t("promoCta")}
        </Link>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Delivery scam awareness                                                    */
/* -------------------------------------------------------------------------- */

export async function SafetySection() {
  const t = await getTranslations("home");
  const tips = [t("safetyTip1"), t("safetyTip2"), t("safetyTip3"), t("safetyTip4")];
  return (
    <section id="safety" className="scroll-mt-28 bg-slate-50 py-20 lg:py-24" aria-labelledby="safety-heading">
      <div className="container-page grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="reveal relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-200 lg:order-2">
          <Image src={PHOTOS.support} alt="" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
        </div>
        <div>
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <ShieldAlert className="h-6 w-6" aria-hidden />
          </span>
          <h2 id="safety-heading" className="h-section mt-5 text-brand-900">
            {t("safetyTitle")}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">{t("safetyText")}</p>
          <ul className="mt-7 space-y-3.5">
            {tips.map((tip) => (
              <li key={tip} className="flex gap-3.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700" aria-hidden>
                  <Check className="h-4 w-4" />
                </span>
                <span className="text-slate-700">{tip}</span>
              </li>
            ))}
          </ul>
          <Link href="/contact" className="mt-8 inline-flex items-center gap-2 font-bold text-signal-600 hover:text-signal-700">
            {t("safetyCta")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
