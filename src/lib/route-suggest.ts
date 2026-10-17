/**
 * Suggests planned route stops between two places, using each country's main
 * international cargo gateway and a common transit hub between regions.
 * It is only a starting point: staff edit it to match the real route, and a
 * stop is shown to customers as "upcoming" until a tracking update reaches it.
 */

type Region = "africa" | "europe" | "middle_east" | "asia" | "oceania" | "north_america" | "latin_america";

const GATEWAYS: Record<string, { city: string; region: Region }> = {
  // Africa
  Nigeria: { city: "Lagos", region: "africa" },
  Ghana: { city: "Accra", region: "africa" },
  Benin: { city: "Cotonou", region: "africa" },
  Togo: { city: "Lomé", region: "africa" },
  "Côte d'Ivoire": { city: "Abidjan", region: "africa" },
  Senegal: { city: "Dakar", region: "africa" },
  Cameroon: { city: "Douala", region: "africa" },
  Kenya: { city: "Nairobi", region: "africa" },
  Uganda: { city: "Entebbe", region: "africa" },
  Tanzania: { city: "Dar es Salaam", region: "africa" },
  Rwanda: { city: "Kigali", region: "africa" },
  Ethiopia: { city: "Addis Ababa", region: "africa" },
  "South Africa": { city: "Johannesburg", region: "africa" },
  Egypt: { city: "Cairo", region: "africa" },
  Morocco: { city: "Casablanca", region: "africa" },
  // Europe
  "United Kingdom": { city: "London", region: "europe" },
  Ireland: { city: "Dublin", region: "europe" },
  France: { city: "Paris", region: "europe" },
  Germany: { city: "Frankfurt", region: "europe" },
  Netherlands: { city: "Amsterdam", region: "europe" },
  Belgium: { city: "Brussels", region: "europe" },
  Luxembourg: { city: "Luxembourg", region: "europe" },
  Spain: { city: "Madrid", region: "europe" },
  Portugal: { city: "Lisbon", region: "europe" },
  Italy: { city: "Milan", region: "europe" },
  Switzerland: { city: "Zurich", region: "europe" },
  Austria: { city: "Vienna", region: "europe" },
  Poland: { city: "Warsaw", region: "europe" },
  "Czech Republic": { city: "Prague", region: "europe" },
  Slovakia: { city: "Bratislava", region: "europe" },
  Hungary: { city: "Budapest", region: "europe" },
  Romania: { city: "Bucharest", region: "europe" },
  Bulgaria: { city: "Sofia", region: "europe" },
  Croatia: { city: "Zagreb", region: "europe" },
  Greece: { city: "Athens", region: "europe" },
  Denmark: { city: "Copenhagen", region: "europe" },
  Sweden: { city: "Stockholm", region: "europe" },
  Norway: { city: "Oslo", region: "europe" },
  Finland: { city: "Helsinki", region: "europe" },
  Estonia: { city: "Tallinn", region: "europe" },
  Latvia: { city: "Riga", region: "europe" },
  Lithuania: { city: "Vilnius", region: "europe" },
  Ukraine: { city: "Kyiv", region: "europe" },
  Turkey: { city: "Istanbul", region: "europe" },
  // Middle East
  "United Arab Emirates": { city: "Dubai", region: "middle_east" },
  Qatar: { city: "Doha", region: "middle_east" },
  "Saudi Arabia": { city: "Riyadh", region: "middle_east" },
  Israel: { city: "Tel Aviv", region: "middle_east" },
  // Asia
  China: { city: "Shanghai", region: "asia" },
  "Hong Kong": { city: "Hong Kong", region: "asia" },
  Japan: { city: "Tokyo", region: "asia" },
  "South Korea": { city: "Seoul", region: "asia" },
  India: { city: "New Delhi", region: "asia" },
  Pakistan: { city: "Karachi", region: "asia" },
  Bangladesh: { city: "Dhaka", region: "asia" },
  Singapore: { city: "Singapore", region: "asia" },
  Malaysia: { city: "Kuala Lumpur", region: "asia" },
  Thailand: { city: "Bangkok", region: "asia" },
  Vietnam: { city: "Ho Chi Minh City", region: "asia" },
  Philippines: { city: "Manila", region: "asia" },
  Indonesia: { city: "Jakarta", region: "asia" },
  // Oceania
  Australia: { city: "Sydney", region: "oceania" },
  "New Zealand": { city: "Auckland", region: "oceania" },
  // Americas
  "United States": { city: "New York", region: "north_america" },
  Canada: { city: "Toronto", region: "north_america" },
  Mexico: { city: "Mexico City", region: "latin_america" },
  Brazil: { city: "São Paulo", region: "latin_america" },
  Argentina: { city: "Buenos Aires", region: "latin_america" },
  Chile: { city: "Santiago", region: "latin_america" },
  Colombia: { city: "Bogotá", region: "latin_america" },
  Peru: { city: "Lima", region: "latin_america" },
};

const ALIASES: Record<string, string> = {
  usa: "United States", us: "United States", "united states of america": "United States", america: "United States",
  uk: "United Kingdom", "great britain": "United Kingdom", britain: "United Kingdom", england: "United Kingdom",
  scotland: "United Kingdom", wales: "United Kingdom",
  uae: "United Arab Emirates", emirates: "United Arab Emirates", dubai: "United Arab Emirates",
  holland: "Netherlands", "the netherlands": "Netherlands",
  "ivory coast": "Côte d'Ivoire", "cote d'ivoire": "Côte d'Ivoire", "cote divoire": "Côte d'Ivoire",
  czechia: "Czech Republic", korea: "South Korea", "republic of korea": "South Korea",
  turkiye: "Turkey", "türkiye": "Turkey", deutschland: "Germany", polska: "Poland", espana: "Spain", "españa": "Spain",
  nippon: "Japan", ksa: "Saudi Arabia",
};

/** Countries the suggestion knows about (for the admin country list). */
export const KNOWN_COUNTRIES = Object.keys(GATEWAYS).sort((a, b) => a.localeCompare(b));

/** One transit hub commonly used between two regions (none when direct is typical). */
const TRANSIT: Partial<Record<string, { city: string; country: string }>> = {
  "africa|europe": { city: "Frankfurt", country: "Germany" },
  "africa|asia": { city: "Dubai", country: "United Arab Emirates" },
  "africa|oceania": { city: "Dubai", country: "United Arab Emirates" },
  "africa|north_america": { city: "London", country: "United Kingdom" },
  "africa|latin_america": { city: "Madrid", country: "Spain" },
  "asia|europe": { city: "Dubai", country: "United Arab Emirates" },
  "europe|oceania": { city: "Singapore", country: "Singapore" },
  "europe|latin_america": { city: "Madrid", country: "Spain" },
  "asia|oceania": { city: "Singapore", country: "Singapore" },
  "latin_america|north_america": { city: "Miami", country: "United States" },
  "middle_east|oceania": { city: "Singapore", country: "Singapore" },
  "latin_america|middle_east": { city: "Madrid", country: "Spain" },
};

const norm = (v: string) =>
  v
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Canonical country name, or null if unknown. */
export function resolveCountry(input: string | null | undefined): string | null {
  const n = norm(input ?? "");
  if (!n) return null;
  if (ALIASES[n]) return ALIASES[n];
  return Object.keys(GATEWAYS).find((c) => norm(c) === n) ?? null;
}

const sameCity = (a: string, b: string) => norm(a) === norm(b);

export type RouteSuggestion = { stops: string[]; unknown: string[] };

export function suggestRoute(p: {
  originCity: string;
  originCountry: string;
  destinationCity: string;
  destinationCountry: string;
}): RouteSuggestion {
  const oc = resolveCountry(p.originCountry);
  const dc = resolveCountry(p.destinationCountry);
  const unknown = [!oc && p.originCountry.trim(), !dc && p.destinationCountry.trim()].filter(Boolean) as string[];
  if (!oc || !dc) return { stops: [], unknown };

  const og = GATEWAYS[oc];
  const dg = GATEWAYS[dc];
  const stops: string[] = [];
  const add = (city: string, country: string) => {
    const label = `${city}, ${country}`;
    const isEndpoint =
      (sameCity(city, p.originCity) && country === oc) || (sameCity(city, p.destinationCity) && country === dc);
    if (!isEndpoint && !stops.some((s) => norm(s) === norm(label))) stops.push(label);
  };

  // Domestic: usually direct; staff add depots themselves.
  if (oc === dc) return { stops, unknown };

  add(og.city, oc); // export hub
  if (og.region !== dg.region) {
    const key = [og.region, dg.region].sort().join("|");
    const hub = TRANSIT[key];
    if (hub && hub.country !== oc && hub.country !== dc) add(hub.city, hub.country);
  }
  add(dg.city, dc); // import hub and customs
  return { stops, unknown };
}
