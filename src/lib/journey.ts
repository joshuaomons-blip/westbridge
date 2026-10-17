/**
 * Builds the stop-by-stop journey shown on the tracking page from what staff
 * actually recorded: the origin, every location named in a public tracking
 * update (in the order reached), any planned stops not reached yet, and the
 * destination. Nothing is invented: a stop is only "done" when an update names it.
 */

export type JourneyState = "done" | "current" | "upcoming";

export type JourneyStop = {
  name: string;
  country?: string;
  kind: "origin" | "stop" | "destination";
  state: JourneyState;
  /** Time of the first update recorded at this place. */
  at?: string;
};

type Place = { city: string; country: string };
type Event = { status: string; occurred_at: string; location: string | null };

function norm(v: string): string {
  return v
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** True when two place names refer to the same place ("Frankfurt hub, DE" ~ "Frankfurt"). */
export function samePlace(a: string, b: string): boolean {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const words = (s: string) => s.split(" ");
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  // Whole-word containment, so "Rome" does not match "Romeo".
  const sw = words(short);
  const lw = words(long);
  for (let i = 0; i + sw.length <= lw.length; i++) {
    if (sw.every((w, j) => lw[i + j] === w)) return true;
  }
  return false;
}

export function buildJourney(input: {
  origin: Place;
  destination: Place;
  routeStops?: string[] | null;
  events: Event[]; // newest first, as returned by the tracking lookup
  delivered: boolean;
}): JourneyStop[] {
  const { origin, destination, delivered } = input;
  const planned = (input.routeStops ?? []).map((s) => s.trim()).filter(Boolean);
  const chronological = [...input.events].reverse();

  let originAt: string | undefined;
  let destinationAt: string | undefined;
  const visited: { name: string; at: string }[] = [];

  for (const e of chronological) {
    const loc = e.location?.trim();
    if (!loc) continue;
    if (samePlace(loc, origin.city)) {
      originAt ??= e.occurred_at;
    } else if (samePlace(loc, destination.city)) {
      destinationAt ??= e.occurred_at;
    } else if (!visited.some((v) => samePlace(v.name, loc))) {
      // Prefer the planned stop's wording when an update matches it.
      const plannedName = planned.find((p) => samePlace(p, loc));
      visited.push({ name: plannedName ?? loc, at: e.occurred_at });
    }
  }

  // Where the shipment is now: the place named by the most recent located update.
  const latest = input.events.find((e) => e.location?.trim())?.location?.trim();
  const currentIs = (name: string) => !!latest && samePlace(latest, name);

  const upcoming = delivered
    ? []
    : planned.filter(
        (p) => !visited.some((v) => samePlace(v.name, p)) && !samePlace(p, origin.city) && !samePlace(p, destination.city),
      );

  const stops: JourneyStop[] = [];
  const atDestination = delivered || (!!destinationAt && !!latest && samePlace(latest, destination.city));
  const anyCurrent = atDestination || visited.some((v) => currentIs(v.name));

  stops.push({
    name: origin.city,
    country: origin.country,
    kind: "origin",
    state: !anyCurrent && (!latest || currentIs(origin.city)) ? "current" : "done",
    at: originAt ?? chronological[0]?.occurred_at,
  });
  for (const v of visited) {
    stops.push({ name: v.name, kind: "stop", state: !atDestination && currentIs(v.name) ? "current" : "done", at: v.at });
  }
  for (const p of upcoming) stops.push({ name: p, kind: "stop", state: "upcoming" });
  stops.push({
    name: destination.city,
    country: destination.country,
    kind: "destination",
    state: atDestination ? (delivered ? "done" : "current") : "upcoming",
    at: destinationAt,
  });

  // If nothing was marked current (e.g. latest update named no known place), the
  // last reached stop is where the shipment was last seen.
  if (!delivered && !stops.some((s) => s.state === "current")) {
    const lastDone = [...stops].reverse().find((s) => s.state === "done");
    if (lastDone) lastDone.state = "current";
  }
  return stops;
}

/** Parses the admin "one stop per line" field. */
export function parseRouteStops(input: string | undefined | null): string[] {
  return (input ?? "")
    .split(/\r?\n/)
    .map((s) => s.replace(/[<>]/g, "").trim().slice(0, 100))
    .filter(Boolean)
    .slice(0, 15);
}
