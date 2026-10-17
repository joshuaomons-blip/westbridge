import { describe, expect, it } from "vitest";
import { KNOWN_COUNTRIES, resolveCountry, suggestRoute } from "../src/lib/route-suggest";

const route = (oc: string, o: string, dc: string, d: string) =>
  suggestRoute({ originCity: oc, originCountry: o, destinationCity: dc, destinationCountry: d }).stops;

describe("route suggestions", () => {
  it("covers at least 70 countries and connects every pair", () => {
    expect(KNOWN_COUNTRIES.length).toBeGreaterThan(69);
    for (const a of KNOWN_COUNTRIES) for (const b of KNOWN_COUNTRIES) {
      if (a !== b) expect(route("X", a, "Y", b).length).toBeGreaterThan(0);
    }
  });
  it("resolves common spellings", () => {
    expect(resolveCountry("usa")).toBe("United States");
    expect(resolveCountry(" nigeria ")).toBe("Nigeria");
    expect(resolveCountry("Ivory Coast")).toBe("Côte d'Ivoire");
    expect(resolveCountry("Atlantis")).toBe(null);
  });
  it("follows realistic air and road legs", () => {
    expect(route("Ibadan", "Nigeria", "Kraków", "Poland")).toEqual(["Lagos, Nigeria", "Frankfurt, Germany", "Berlin, Germany", "Warsaw, Poland"]);
    expect(route("Lagos", "Nigeria", "Accra", "Ghana")).toEqual(["Cotonou, Benin", "Lomé, Togo"]);
    expect(route("Lagos", "Nigeria", "Los Angeles", "United States")).toEqual(["Frankfurt, Germany", "New York, United States"]);
    expect(route("Abuja", "Nigeria", "Osaka", "Japan")).toEqual(["Lagos, Nigeria", "Frankfurt, Germany", "Tokyo, Japan"]);
  });
  it("does not repeat the start or end city", () => {
    expect(route("Lagos", "Nigeria", "Berlin", "Germany")).toEqual(["Frankfurt, Germany"]);
  });
  it("handles domestic routes and unknown countries", () => {
    expect(route("Abuja", "Nigeria", "Kano", "Nigeria")).toEqual([]);
    expect(suggestRoute({ originCity: "X", originCountry: "Atlantis", destinationCity: "Y", destinationCountry: "Poland" }).unknown).toEqual(["Atlantis"]);
  });
});
