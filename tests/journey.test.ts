import { describe, expect, it } from "vitest";
import { buildJourney, parseRouteStops, samePlace } from "../src/lib/journey";

const origin = { city: "Warsaw", country: "Poland" };
const destination = { city: "Brussels", country: "Belgium" };
const ev = (status: string, at: string, location: string | null) => ({ status, occurred_at: at, location });
const summary = (j: ReturnType<typeof buildJourney>) => j.map((s) => `${s.name}:${s.state}`);

describe("place matching", () => {
  it("matches whole words, ignoring case and accents", () => {
    expect(samePlace("Frankfurt hub, DE", "frankfurt")).toBe(true);
    expect(samePlace("Kraków", "Krakow sorting centre")).toBe(true);
    expect(samePlace("Romeo", "Rome")).toBe(false);
  });
});

describe("journey", () => {
  it("shows only origin and destination before any movement", () => {
    const j = buildJourney({ origin, destination, events: [ev("shipment_registered", "2026-10-17T08:00:00Z", "Warsaw")], delivered: false });
    expect(summary(j)).toEqual(["Warsaw:current", "Brussels:upcoming"]);
  });

  it("lists recorded places in order, current place, then planned stops ahead", () => {
    const j = buildJourney({
      origin,
      destination,
      routeStops: ["Poznań hub", "Berlin", "Cologne"],
      events: [
        ev("arrived_at_facility", "2026-10-18T09:00:00Z", "Berlin, DE"),
        ev("in_transit", "2026-10-17T15:00:00Z", "Poznan hub"),
        ev("shipment_registered", "2026-10-17T08:00:00Z", "Warsaw"),
      ],
      delivered: false,
    });
    expect(summary(j)).toEqual(["Warsaw:done", "Poznań hub:done", "Berlin:current", "Cologne:upcoming", "Brussels:upcoming"]);
  });

  it("marks the destination when out for delivery there, and done when delivered", () => {
    const events = [
      ev("out_for_delivery", "2026-10-19T07:00:00Z", "Brussels"),
      ev("in_transit", "2026-10-18T09:00:00Z", "Berlin"),
      ev("shipment_registered", "2026-10-17T08:00:00Z", "Warsaw"),
    ];
    expect(summary(buildJourney({ origin, destination, routeStops: ["Cologne"], events, delivered: false }))).toEqual([
      "Warsaw:done",
      "Berlin:done",
      "Cologne:upcoming",
      "Brussels:current",
    ]);
    expect(summary(buildJourney({ origin, destination, routeStops: ["Cologne"], events, delivered: true }))).toEqual([
      "Warsaw:done",
      "Berlin:done",
      "Brussels:done",
    ]);
  });

  it("keeps the last known place current when the latest update has no location", () => {
    const j = buildJourney({
      origin,
      destination,
      events: [ev("delayed", "2026-10-18T12:00:00Z", null), ev("in_transit", "2026-10-18T09:00:00Z", "Berlin")],
      delivered: false,
    });
    expect(summary(j)).toEqual(["Warsaw:done", "Berlin:current", "Brussels:upcoming"]);
  });

  it("parses the admin stop list", () => {
    expect(parseRouteStops(" Berlin \n\n<b>Cologne</b>\r\nLiège")).toEqual(["Berlin", "bCologne/b", "Liège"]);
  });
});
