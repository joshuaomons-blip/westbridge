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

// ---------------------------------------------------------------------------
// Network of cargo hubs: road corridors (cheap) and main air links (costly),
// so the cheapest path looks like a real courier routing plan.
// ---------------------------------------------------------------------------

type Node = { city: string; country: string };

/** Extra hubs that are not a country's main gateway. */
const EXTRA_NODES: Node[] = [
  { city: "Berlin", country: "Germany" },
  { city: "Los Angeles", country: "United States" },
  { city: "Miami", country: "United States" },
];

const ROAD = 1;
/** Longer road legs and ferries. */
const LONG_ROAD = 2;
/** Domestic trunk flights. */
const DOMESTIC_AIR = 2;
const AIR = 3;
/** Short regional flights that couriers usually replace with road. */
const SHORT_AIR = 4;

/** [cityA, cityB, cost] — cities refer to gateway or extra-node cities. */
const LINKS: [string, string, number][] = [
  // West Africa coastal corridor and air links
  ["Lagos", "Cotonou", ROAD], ["Cotonou", "Lomé", ROAD], ["Lomé", "Accra", ROAD], ["Accra", "Abidjan", ROAD],
  ["Abidjan", "Dakar", AIR], ["Lagos", "Douala", AIR], ["Lagos", "Accra", SHORT_AIR],
  // East and southern Africa
  ["Nairobi", "Entebbe", ROAD], ["Entebbe", "Kigali", ROAD], ["Nairobi", "Dar es Salaam", ROAD],
  ["Nairobi", "Addis Ababa", AIR], ["Addis Ababa", "Lagos", AIR], ["Nairobi", "Lagos", AIR],
  ["Johannesburg", "Lagos", AIR], ["Johannesburg", "Nairobi", AIR], ["Johannesburg", "Dar es Salaam", AIR],
  ["Addis Ababa", "Cairo", AIR], ["Cairo", "Casablanca", AIR], ["Casablanca", "Dakar", AIR],
  // Europe road network
  ["Lisbon", "Madrid", ROAD], ["Madrid", "Paris", ROAD], ["Paris", "Brussels", ROAD], ["Paris", "London", ROAD],
  ["London", "Dublin", ROAD], ["Brussels", "Amsterdam", ROAD], ["Brussels", "Luxembourg", ROAD],
  ["Brussels", "Frankfurt", ROAD], ["Amsterdam", "Frankfurt", ROAD], ["Luxembourg", "Frankfurt", ROAD],
  ["Paris", "Frankfurt", ROAD], ["Frankfurt", "Zurich", ROAD], ["Zurich", "Milan", ROAD],
  ["Frankfurt", "Berlin", ROAD], ["Frankfurt", "Prague", ROAD], ["Frankfurt", "Vienna", ROAD],
  ["Frankfurt", "Copenhagen", LONG_ROAD], ["Copenhagen", "Stockholm", ROAD], ["Copenhagen", "Oslo", ROAD],
  ["Stockholm", "Helsinki", LONG_ROAD], ["Helsinki", "Tallinn", ROAD], ["Tallinn", "Riga", ROAD], ["Riga", "Vilnius", ROAD],
  ["Vilnius", "Warsaw", ROAD], ["Berlin", "Warsaw", ROAD], ["Berlin", "Prague", ROAD], ["Prague", "Bratislava", ROAD],
  ["Vienna", "Bratislava", ROAD], ["Vienna", "Budapest", ROAD], ["Vienna", "Zagreb", ROAD], ["Budapest", "Zagreb", ROAD],
  ["Budapest", "Bucharest", ROAD], ["Bucharest", "Sofia", ROAD], ["Sofia", "Istanbul", ROAD], ["Sofia", "Athens", ROAD],
  ["Warsaw", "Kyiv", ROAD], ["Milan", "Vienna", ROAD],
  // Europe – Africa air
  ["Frankfurt", "Lagos", AIR], ["London", "Lagos", AIR], ["Paris", "Lagos", AIR], ["Istanbul", "Lagos", AIR],
  ["London", "Accra", AIR], ["Istanbul", "Accra", AIR], ["Paris", "Abidjan", AIR], ["Paris", "Dakar", AIR],
  ["Paris", "Douala", AIR], ["London", "Nairobi", AIR], ["Amsterdam", "Nairobi", AIR], ["Frankfurt", "Johannesburg", AIR],
  ["London", "Johannesburg", AIR], ["Paris", "Casablanca", AIR], ["Madrid", "Casablanca", AIR], ["Frankfurt", "Cairo", AIR],
  ["Frankfurt", "Addis Ababa", AIR],
  // Middle East
  ["Dubai", "Doha", AIR], ["Dubai", "Riyadh", AIR], ["Riyadh", "Doha", AIR], ["Dubai", "Tel Aviv", AIR],
  ["Frankfurt", "Tel Aviv", AIR], ["Dubai", "Frankfurt", AIR], ["Dubai", "London", AIR], ["Dubai", "Paris", AIR],
  ["Dubai", "Amsterdam", AIR], ["Dubai", "Istanbul", AIR], ["Dubai", "Cairo", AIR], ["Dubai", "Lagos", AIR],
  ["Dubai", "Accra", AIR], ["Dubai", "Nairobi", AIR], ["Dubai", "Addis Ababa", AIR], ["Dubai", "Johannesburg", AIR],
  ["Doha", "Lagos", AIR], ["Doha", "Nairobi", AIR],
  // Middle East – Asia – Oceania
  ["Dubai", "Karachi", AIR], ["Dubai", "New Delhi", AIR], ["Dubai", "Dhaka", AIR], ["Dubai", "Singapore", AIR],
  ["Dubai", "Hong Kong", AIR], ["Dubai", "Shanghai", AIR], ["Dubai", "Bangkok", AIR], ["Dubai", "Kuala Lumpur", AIR],
  ["Dubai", "Manila", AIR], ["Dubai", "Jakarta", AIR], ["Dubai", "Sydney", AIR], ["Addis Ababa", "Shanghai", AIR],
  // Asia
  ["Shanghai", "Hong Kong", AIR], ["Hong Kong", "Singapore", AIR], ["Singapore", "Kuala Lumpur", ROAD],
  ["Singapore", "Jakarta", AIR], ["Singapore", "Bangkok", AIR], ["Bangkok", "Ho Chi Minh City", AIR],
  ["Hong Kong", "Manila", AIR], ["Hong Kong", "Ho Chi Minh City", AIR], ["Shanghai", "Tokyo", AIR],
  ["Shanghai", "Seoul", AIR], ["Seoul", "Tokyo", AIR], ["Dhaka", "Singapore", AIR], ["New Delhi", "Singapore", AIR],
  ["Hong Kong", "Sydney", AIR], ["Singapore", "Sydney", AIR], ["Sydney", "Auckland", AIR],
  // Europe – Asia
  ["Frankfurt", "Shanghai", AIR], ["Frankfurt", "Tokyo", AIR], ["Frankfurt", "Seoul", AIR], ["Frankfurt", "Hong Kong", AIR],
  ["Frankfurt", "New Delhi", AIR], ["Frankfurt", "Singapore", AIR], ["London", "Hong Kong", AIR], ["London", "Singapore", AIR],
  ["London", "New Delhi", AIR], ["Amsterdam", "Shanghai", AIR], ["Istanbul", "Shanghai", AIR],
  // Transatlantic and Americas
  ["Frankfurt", "New York", AIR], ["London", "New York", AIR], ["Paris", "New York", AIR], ["Amsterdam", "New York", AIR],
  ["Frankfurt", "Toronto", AIR], ["London", "Toronto", AIR], ["Dubai", "New York", AIR], ["London", "Lagos", AIR],
  ["New York", "Toronto", ROAD], ["New York", "Miami", DOMESTIC_AIR], ["New York", "Los Angeles", DOMESTIC_AIR],
  ["Los Angeles", "Tokyo", AIR], ["Los Angeles", "Shanghai", AIR], ["Los Angeles", "Hong Kong", AIR],
  ["Los Angeles", "Seoul", AIR], ["Los Angeles", "Sydney", AIR], ["Los Angeles", "Auckland", AIR], ["Los Angeles", "Mexico City", AIR],
  ["Miami", "Mexico City", AIR], ["Miami", "Bogotá", AIR], ["Miami", "Lima", AIR], ["Miami", "São Paulo", AIR],
  ["Miami", "Santiago", AIR], ["Miami", "Buenos Aires", AIR], ["São Paulo", "Buenos Aires", AIR],
  ["Buenos Aires", "Santiago", AIR], ["Lima", "Santiago", AIR], ["Bogotá", "Lima", AIR],
  ["Madrid", "São Paulo", AIR], ["Madrid", "Buenos Aires", AIR], ["Madrid", "Bogotá", AIR], ["Madrid", "Lima", AIR],
  ["Madrid", "Santiago", AIR], ["Madrid", "Mexico City", AIR], ["Lisbon", "São Paulo", AIR],
];

function buildGraph() {
  const nodes = new Map<string, Node>();
  for (const [country, g] of Object.entries(GATEWAYS)) nodes.set(g.city, { city: g.city, country });
  for (const n of EXTRA_NODES) nodes.set(n.city, n);
  const adj = new Map<string, { to: string; cost: number }[]>();
  for (const [a, b, cost] of LINKS) {
    if (!nodes.has(a) || !nodes.has(b)) continue;
    adj.set(a, [...(adj.get(a) ?? []), { to: b, cost }]);
    adj.set(b, [...(adj.get(b) ?? []), { to: a, cost }]);
  }
  return { nodes, adj };
}
const GRAPH = buildGraph();

/** Cheapest path between two hub cities (Dijkstra; fewer hops break ties). */
function cheapestPath(from: string, to: string): string[] | null {
  if (from === to) return [from];
  const dist = new Map<string, [number, number]>([[from, [0, 0]]]);
  const prev = new Map<string, string>();
  const open = new Set<string>([from]);
  while (open.size) {
    let cur = "";
    let best: [number, number] = [Infinity, Infinity];
    for (const n of open) {
      const d = dist.get(n)!;
      if (d[0] < best[0] || (d[0] === best[0] && d[1] < best[1])) {
        best = d;
        cur = n;
      }
    }
    open.delete(cur);
    if (cur === to) break;
    for (const { to: nxt, cost } of GRAPH.adj.get(cur) ?? []) {
      const nd: [number, number] = [best[0] + cost, best[1] + 1];
      const old = dist.get(nxt);
      if (!old || nd[0] < old[0] || (nd[0] === old[0] && nd[1] < old[1])) {
        dist.set(nxt, nd);
        prev.set(nxt, cur);
        open.add(nxt);
      }
    }
  }
  if (!prev.has(to)) return null;
  const path = [to];
  while (path[0] !== from) path.unshift(prev.get(path[0])!);
  return path;
}

/** The hub to start or end at: the city itself if it is a hub in that country, else the country gateway. */
function hubFor(city: string, country: string): string {
  const n = norm(city);
  for (const node of GRAPH.nodes.values()) if (node.country === country && norm(node.city) === n) return node.city;
  return GATEWAYS[country].city;
}

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
  // Domestic: usually direct; staff add depots themselves.
  if (oc === dc) return { stops: [], unknown };

  const path = cheapestPath(hubFor(p.originCity, oc), hubFor(p.destinationCity, dc)) ?? [GATEWAYS[oc].city, GATEWAYS[dc].city];
  const stops: string[] = [];
  for (const city of path) {
    const node = GRAPH.nodes.get(city)!;
    const isEndpoint =
      (sameCity(city, p.originCity) && node.country === oc) || (sameCity(city, p.destinationCity) && node.country === dc);
    const label = `${node.city}, ${node.country}`;
    if (!isEndpoint && !stops.includes(label)) stops.push(label);
  }
  return { stops: stops.slice(0, 8), unknown };
}
