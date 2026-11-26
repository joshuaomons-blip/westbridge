import Image from "next/image";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  Car,
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
  Ship,
  Truck,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PHOTOS } from "@/lib/photos";
import { cn } from "@/lib/format";

/* -------------------------------------------------------------------------- */
/* International car shipping (featured)                                      */
/* -------------------------------------------------------------------------- */

export async function CarShippingSection() {
  const t = await getTranslations("home");
  const points = [t("carPoint1"), t("carPoint2"), t("carPoint3"), t("carPoint4")];
  const steps = [
    { icon: FileText, title: t("carStep1Title"), text: t("carStep1Text") },
    { icon: Truck, title: t("carStep2Title"), text: t("carStep2Text") },
    { icon: Ship, title: t("carStep3Title"), text: t("carStep3Text") },
    { icon: MapPin, title: t("carStep4Title"), text: t("carStep4Text") },
  ];
  return (
    <section id="car-shipping" className="relative isolate scroll-mt-28 overflow-hidden bg-brand-950 text-white" aria-labelledby="car-heading">
      {/* soft glow accents */}
      <div className="pointer-events-none absolute -top-40 -left-40 -z-10 h-[520px] w-[520px] rounded-full bg-signal-600/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-40 bottom-0 -z-10 h-[480px] w-[480px] rounded-full bg-brand-700/40 blur-3xl" aria-hidden />

      <div className="container-page py-20 lg:py-28">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          {/* Copy */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-signal-600 px-3.5 py-1.5 text-xs font-bold tracking-[0.14em] uppercase shadow-lg shadow-signal-600/30">
              <Car className="h-4 w-4" aria-hidden />
              {t("carBadge")}
            </span>
            <p className="mt-6 text-xs font-semibold tracking-[0.22em] text-white/60 uppercase">{t("carEyebrow")}</p>
            <h2 id="car-heading" className="font-display mt-3 text-4xl leading-[1.02] font-black tracking-[-0.02em] text-balance [font-stretch:110%] sm:text-5xl lg:text-[64px]">
              {t("carTitle")}
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80">{t("carText")}</p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {points.map((p) => (
                <li key={p} className="flex gap-3 rounded-xl bg-white/[0.06] p-3.5 ring-1 ring-white/10 backdrop-blur">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-signal-600">
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span className="text-[15px] leading-snug text-white/90">{p}</span>
                </li>
              ))}
            </ul>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/car-quote" className="btn-accent h-13 px-8 text-base shadow-xl shadow-signal-600/30">
                {t("carCta")}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="/track" className="inline-flex h-13 items-center gap-2 rounded-md px-8 text-base font-semibold ring-1 ring-white/30 transition hover:bg-white/10">
                {t("carCta2")}
              </Link>
            </div>
          </div>

          {/* Photo collage */}
          <div className="reveal relative">
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl ring-1 ring-white/10 sm:aspect-[4/3] lg:aspect-[4/5]">
              <Image src={PHOTOS.carShip} alt="" fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
            </div>
            {/* floating tracking card */}
            <div className="absolute -bottom-6 left-4 flex items-center gap-3 rounded-2xl bg-white p-4 pr-6 text-brand-900 shadow-2xl shadow-black/40 sm:-left-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-signal-600 text-white">
                <Car className="h-5 w-5" aria-hidden />
              </span>
              <span>
                <span className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  {t("carFloatLabel")}
                </span>
                <span className="mt-0.5 block font-bold">{t("carFloatValue")}</span>
              </span>
            </div>
          </div>
        </div>

        {/* How car shipping works */}
        <div className="mt-24 lg:mt-28">
          <h3 className="font-display text-2xl font-black [font-stretch:108%] sm:text-3xl">{t("carStepsTitle")}</h3>
          <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <li key={step.title} className="reveal rounded-2xl bg-white/[0.04] p-6 ring-1 ring-white/10 transition hover:ring-white/25">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-signal-600">
                    <step.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="font-display text-sm font-black text-white/40">0{i + 1}</span>
                </div>
                <p className="mt-5 font-bold">{step.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-white/70">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

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
