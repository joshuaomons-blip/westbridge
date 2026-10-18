/**
 * One-click route updates for the admin dashboard: works out which updates make
 * sense next from the shipment's journey, and writes a realistic, customer-facing
 * description in the shipment's email language.
 */
import { buildJourney, samePlace, type JourneyStop } from "./journey";
import { CUSTOMS_KIND_LABEL, customsPointsFor } from "./customs-points";

export type StepKind = "depart" | "arrive" | "arrive_final" | "arrive_dest" | "out" | "delivered" | "hold" | "cleared";

export type RouteStep = {
  /** Stable key sent by the button; recomputed on the server, never trusted as text. */
  key: string;
  kind: StepKind;
  status: "in_transit" | "arrived_at_facility" | "out_for_delivery" | "delivered" | "customs_processing" | "customs_cleared";
  /** Location saved on the tracking event. */
  location: string;
  /** Short button label for staff. */
  label: string;
  /** The step that normally comes next. */
  next: boolean;
  /** Shown as a red "problem" button (customs hold). */
  danger?: boolean;
  /** For customs holds: the place name and what kind of customs point it is. */
  customs?: { city: string; kind: string };
  vars: { place: string; next: string; dest: string };
};

export type RouteShipment = {
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  route_stops: string[] | null;
  current_status: string;
};

export type RouteEvent = { status: string; occurred_at: string; location: string | null };

const STATUS: Record<StepKind, RouteStep["status"]> = {
  depart: "in_transit",
  arrive: "arrived_at_facility",
  arrive_final: "arrived_at_facility",
  arrive_dest: "arrived_at_facility",
  out: "out_for_delivery",
  delivered: "delivered",
  hold: "customs_processing",
  cleared: "customs_cleared",
};

/** Builds the route with each place's state, plus the one-click updates available now. */
export function routeProgress(s: RouteShipment, events: RouteEvent[]): { journey: JourneyStop[]; steps: RouteStep[] } {
  const delivered = s.current_status === "delivered";
  const journey = buildJourney({
    origin: { city: s.origin_city, country: s.origin_country },
    destination: { city: s.destination_city, country: s.destination_country },
    routeStops: s.route_stops,
    events,
    delivered,
  });
  if (delivered || s.current_status === "cancelled" || s.current_status === "returned_to_sender") return { journey, steps: [] };

  const dest = `${s.destination_city}, ${s.destination_country}`;
  const full = (j: JourneyStop) => (j.kind === "origin" ? `${s.origin_city}, ${s.origin_country}` : j.kind === "destination" ? dest : j.name);
  const steps: Omit<RouteStep, "next">[] = [];
  const latest = events.find((e) => e.location?.trim());

  const current = journey.find((j) => j.state === "current");
  const destStop = journey.find((j) => j.kind === "destination")!;
  // Once the shipment is in the destination city, earlier stops are no longer offered.
  const upcoming = destStop.state === "current" ? [] : journey.filter((j) => j.state === "upcoming" && j.kind === "stop");

  // Leaving the current place (skipped if that was already recorded).
  if (current && current.kind !== "destination") {
    const nextPlace = upcoming[0] ? upcoming[0].name : dest;
    const alreadyLeft = latest?.status === "in_transit" && samePlace(latest.location ?? "", current.name);
    if (!alreadyLeft) {
      steps.push({
        key: `depart:${current.name}`,
        kind: "depart",
        status: STATUS.depart,
        location: full(current),
        label: `Departed ${current.name}`,
        vars: { place: full(current), next: nextPlace, dest },
      });
    }
  }

  upcoming.forEach((j, i) => {
    const kind: StepKind = i === upcoming.length - 1 ? "arrive_final" : "arrive";
    steps.push({ key: `arrive:${j.name}`, kind, status: STATUS[kind], location: j.name, label: `Arrived at ${j.name}`, vars: { place: j.name, next: "", dest } });
  });

  if (destStop.state !== "current") {
    steps.push({ key: "arrive_dest", kind: "arrive_dest", status: STATUS.arrive_dest, location: dest, label: `Arrived in ${s.destination_city}`, vars: { place: dest, next: "", dest } });
  }
  if (s.current_status !== "out_for_delivery") {
    steps.push({ key: "out", kind: "out", status: STATUS.out, location: dest, label: `Out for delivery in ${s.destination_city}`, vars: { place: dest, next: "", dest } });
  }
  steps.push({ key: "delivered", kind: "delivered", status: STATUS.delivered, location: dest, label: `Delivered in ${s.destination_city}`, vars: { place: dest, next: "", dest } });

  // Customs: choose one of the destination country's customs points (airport, seaport,
  // border crossing); while held, releasing it at that same place comes first.
  if (s.current_status === "customs_processing") {
    const heldAt = events.find((e) => e.status === "customs_processing" && e.location?.trim())?.location?.trim() ?? dest;
    const heldCity = heldAt.split(",")[0].trim();
    steps.unshift({ key: "cleared", kind: "cleared", status: STATUS.cleared, location: heldAt, label: `Released from customs in ${heldCity}`, vars: { place: heldAt, next: "", dest } });
  } else {
    const { country, points } = customsPointsFor(s.destination_city, s.destination_country);
    for (const p of points) {
      const place = `${p.city}, ${country}`;
      steps.push({
        key: `hold:${p.city}`,
        kind: "hold",
        status: STATUS.hold,
        location: place,
        label: `Customs hold in ${p.city}`,
        vars: { place, next: "", dest },
        danger: true,
        customs: { city: p.city, kind: CUSTOMS_KIND_LABEL[p.kind as keyof typeof CUSTOMS_KIND_LABEL] },
      });
    }
  }

  const firstNormal = steps.findIndex((st) => !st.danger);
  return { journey, steps: steps.map((st, i) => ({ ...st, next: i === firstNormal })) };
}

type Templates = Record<StepKind, string>;

const MESSAGES: Record<string, Templates> = {
  en: {
    depart: "Your shipment has departed our {place} facility and is on its way to {next}.",
    arrive: "Your shipment has arrived at our sorting hub in {place} and is being processed for the next leg of its journey.",
    arrive_final: "Your shipment has arrived at our {place} hub, the closest facility to {dest}. It is being prepared for final delivery.",
    arrive_dest: "Your shipment has arrived at our local delivery centre in {dest} and will be out for delivery soon.",
    out: "Your shipment is with our courier in {dest} and out for delivery to the recipient's address today.",
    delivered: "Your shipment has been delivered in {dest}. Thank you for shipping with Norvane Express.",
    hold: "Your shipment is being held at customs in {place} for routine clearance checks. It will continue its journey as soon as customs releases it.",
    cleared: "Your shipment has been cleared by customs in {place} and is continuing its journey.",
  },
  pl: {
    depart: "Twoja przesyłka opuściła nasz oddział: {place}. Następny przystanek: {next}.",
    arrive: "Twoja przesyłka dotarła do naszego centrum sortowania: {place}. Trwa przygotowanie do kolejnego etapu podróży.",
    arrive_final: "Twoja przesyłka dotarła do naszego centrum: {place} – najbliższego oddziału dla lokalizacji {dest}. Trwa przygotowanie do doręczenia.",
    arrive_dest: "Twoja przesyłka dotarła do lokalnego centrum doręczeń: {dest}. Wkrótce zostanie przekazana kurierowi.",
    out: "Twoja przesyłka jest u kuriera ({dest}) i zostanie dziś doręczona na adres odbiorcy.",
    delivered: "Twoja przesyłka została doręczona ({dest}). Dziękujemy za wybór Norvane Express.",
    hold: "Twoja przesyłka jest wstrzymana w odprawie celnej ({place}) w celu rutynowej kontroli. Podróż będzie kontynuowana po zwolnieniu przez urząd celny.",
    cleared: "Twoja przesyłka została odprawiona przez urząd celny ({place}) i kontynuuje podróż.",
  },
  ja: {
    depart: "お荷物は{place}の施設を出発し、{next}へ向かっています。",
    arrive: "お荷物は{place}の仕分けハブに到着し、次の区間への準備を進めています。",
    arrive_final: "お荷物は{dest}に最も近い拠点である{place}のハブに到着しました。最終配達の準備を進めています。",
    arrive_dest: "お荷物は{dest}の配達センターに到着しました。まもなく配達に出発します。",
    out: "お荷物は{dest}の配達員のもとにあり、本日お届け先へ配達予定です。",
    delivered: "お荷物は{dest}にてお届けが完了しました。Norvane Expressをご利用いただきありがとうございます。",
    hold: "お荷物は{place}の税関で通常の通関審査のため保留されています。税関から許可が下り次第、輸送を再開します。",
    cleared: "お荷物は{place}の税関で通関が完了し、輸送を再開しました。",
  },
  es: {
    depart: "Su envío ha salido de nuestras instalaciones en {place} y se dirige a {next}.",
    arrive: "Su envío ha llegado a nuestro centro de clasificación en {place} y se está procesando para la siguiente etapa del trayecto.",
    arrive_final: "Su envío ha llegado a nuestro centro de {place}, el más cercano a {dest}. Se está preparando para la entrega final.",
    arrive_dest: "Su envío ha llegado a nuestro centro de reparto local en {dest} y saldrá a reparto en breve.",
    out: "Su envío está con nuestro mensajero en {dest} y en reparto hoy a la dirección del destinatario.",
    delivered: "Su envío ha sido entregado en {dest}. Gracias por confiar en Norvane Express.",
    hold: "Su envío está retenido en la aduana de {place} para los controles habituales de despacho. Continuará su trayecto en cuanto la aduana lo libere.",
    cleared: "Su envío ha sido despachado por la aduana de {place} y continúa su trayecto.",
  },
  de: {
    depart: "Ihre Sendung hat unser Zentrum in {place} verlassen und ist auf dem Weg nach {next}.",
    arrive: "Ihre Sendung ist in unserem Sortierzentrum in {place} eingetroffen und wird für den nächsten Abschnitt vorbereitet.",
    arrive_final: "Ihre Sendung ist in unserem Zentrum in {place} eingetroffen, dem nächstgelegenen Standort zu {dest}. Sie wird für die Zustellung vorbereitet.",
    arrive_dest: "Ihre Sendung ist in unserem Zustellzentrum in {dest} eingetroffen und geht in Kürze in die Zustellung.",
    out: "Ihre Sendung ist bei unserem Zusteller in {dest} und wird heute an die Empfängeradresse zugestellt.",
    delivered: "Ihre Sendung wurde in {dest} zugestellt. Vielen Dank, dass Sie Norvane Express gewählt haben.",
    hold: "Ihre Sendung wird beim Zoll in {place} für die übliche Zollabfertigung zurückgehalten. Sie wird weiterbefördert, sobald der Zoll sie freigibt.",
    cleared: "Ihre Sendung wurde in {place} vom Zoll freigegeben und wird weiterbefördert.",
  },
};

/** Customer-facing description for a step, in the given language (English fallback). */
export function stepMessage(step: Pick<RouteStep, "kind" | "vars">, locale: string | null | undefined): string {
  const t = (MESSAGES[locale ?? ""] ?? MESSAGES.en)[step.kind];
  return t.replace(/\{(place|next|dest)\}/g, (_, k: "place" | "next" | "dest") => step.vars[k]);
}
