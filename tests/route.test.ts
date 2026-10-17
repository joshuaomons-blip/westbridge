import { describe, expect, it } from "vitest";
import { resolveCountry, suggestRoute } from "../src/lib/route-suggest";

describe("route suggestions", () => {
  it("resolves common spellings", () => {
    expect(resolveCountry("usa")).toBe("United States");
    expect(resolveCountry(" nigeria ")).toBe("Nigeria");
    expect(resolveCountry("Ivory Coast")).toBe("Côte d'Ivoire");
    expect(resolveCountry("Atlantis")).toBe(null);
  });
  it("goes through export hub, transit hub and import hub", () => {
    expect(suggestRoute({ originCity: "Ibadan", originCountry: "Nigeria", destinationCity: "Kraków", destinationCountry: "Poland" }).stops)
      .toEqual(["Lagos, Nigeria", "Frankfurt, Germany", "Warsaw, Poland"]);
  });
  it("skips hubs that are already the start or end city", () => {
    expect(suggestRoute({ originCity: "Lagos", originCountry: "Nigeria", destinationCity: "Warsaw", destinationCountry: "Poland" }).stops)
      .toEqual(["Frankfurt, Germany"]);
    expect(suggestRoute({ originCity: "Lagos", originCountry: "Nigeria", destinationCity: "Berlin", destinationCountry: "Germany" }).stops)
      .toEqual(["Frankfurt, Germany"]);
  });
  it("uses a regional hub between continents", () => {
    expect(suggestRoute({ originCity: "Abuja", originCountry: "Nigeria", destinationCity: "Osaka", destinationCountry: "Japan" }).stops)
      .toEqual(["Lagos, Nigeria", "Dubai, United Arab Emirates", "Tokyo, Japan"]);
  });
  it("handles domestic routes and unknown countries", () => {
    expect(suggestRoute({ originCity: "Abuja", originCountry: "Nigeria", destinationCity: "Kano", destinationCountry: "Nigeria" }).stops).toEqual([]);
    expect(suggestRoute({ originCity: "X", originCountry: "Atlantis", destinationCity: "Y", destinationCountry: "Poland" }).unknown).toEqual(["Atlantis"]);
  });
});
