/**
 * Real places where international shipments clear customs in each country the
 * route planner knows: main cargo airports, seaports and road border crossings.
 * The first entry is the usual main point. Used for the "Customs hold" choice.
 */
import { resolveCountry } from "./route-suggest";

export type CustomsKind = "airport" | "seaport" | "border" | "office";
export type CustomsPoint = { city: string; kind: CustomsKind };

const a = (city: string): CustomsPoint => ({ city, kind: "airport" });
const s = (city: string): CustomsPoint => ({ city, kind: "seaport" });
const b = (city: string): CustomsPoint => ({ city, kind: "border" });
const o = (city: string): CustomsPoint => ({ city, kind: "office" });

export const CUSTOMS_POINTS: Record<string, CustomsPoint[]> = {
  Nigeria: [a("Lagos"), a("Abuja"), s("Port Harcourt"), a("Kano"), b("Seme")],
  Ghana: [a("Accra"), s("Tema"), a("Kumasi"), b("Aflao")],
  Benin: [s("Cotonou"), b("Sèmè-Kpodji")],
  Togo: [s("Lomé"), b("Kodjoviakopé")],
  "Côte d'Ivoire": [a("Abidjan"), s("San-Pédro")],
  Senegal: [a("Dakar"), b("Rosso")],
  Cameroon: [s("Douala"), a("Yaoundé"), s("Kribi")],
  Kenya: [a("Nairobi"), s("Mombasa"), b("Busia"), b("Namanga")],
  Uganda: [a("Entebbe"), o("Kampala"), b("Malaba"), b("Busia")],
  Tanzania: [s("Dar es Salaam"), a("Kilimanjaro"), a("Zanzibar")],
  Rwanda: [a("Kigali"), b("Gatuna"), b("Rusumo")],
  Ethiopia: [a("Addis Ababa"), b("Moyale")],
  "South Africa": [a("Johannesburg"), a("Cape Town"), s("Durban"), b("Beitbridge")],
  Egypt: [a("Cairo"), s("Alexandria"), s("Port Said")],
  Morocco: [a("Casablanca"), s("Tangier"), a("Marrakesh")],
  "United Kingdom": [a("London"), a("Manchester"), a("East Midlands"), s("Felixstowe"), s("Southampton")],
  Ireland: [a("Dublin"), a("Shannon"), s("Cork")],
  France: [a("Paris"), a("Lyon"), s("Le Havre"), s("Marseille")],
  Germany: [a("Frankfurt"), a("Leipzig"), a("Cologne"), a("Munich"), s("Hamburg")],
  Netherlands: [a("Amsterdam"), s("Rotterdam")],
  Belgium: [a("Brussels"), a("Liège"), s("Antwerp")],
  Luxembourg: [a("Luxembourg")],
  Spain: [a("Madrid"), a("Barcelona"), s("Valencia"), s("Algeciras")],
  Portugal: [a("Lisbon"), a("Porto"), s("Sines")],
  Italy: [a("Milan"), a("Rome"), s("Genoa"), s("Naples")],
  Switzerland: [a("Zurich"), a("Geneva"), b("Basel")],
  Austria: [a("Vienna"), a("Linz"), a("Salzburg")],
  Poland: [a("Warsaw"), a("Kraków"), a("Katowice"), a("Poznań"), s("Gdańsk"), b("Terespol")],
  "Czech Republic": [a("Prague"), a("Brno"), a("Ostrava")],
  Slovakia: [a("Bratislava"), a("Košice")],
  Hungary: [a("Budapest"), b("Záhony")],
  Romania: [a("Bucharest"), a("Cluj-Napoca"), s("Constanța")],
  Bulgaria: [a("Sofia"), s("Varna"), s("Burgas"), b("Kapitan Andreevo")],
  Croatia: [a("Zagreb"), a("Split"), s("Rijeka")],
  Greece: [a("Athens"), a("Thessaloniki"), s("Piraeus")],
  Denmark: [a("Copenhagen"), a("Billund"), s("Aarhus")],
  Sweden: [a("Stockholm"), a("Malmö"), s("Gothenburg")],
  Norway: [a("Oslo"), a("Bergen"), b("Svinesund")],
  Finland: [a("Helsinki"), b("Vaalimaa")],
  Estonia: [a("Tallinn"), b("Narva")],
  Latvia: [a("Riga")],
  Lithuania: [a("Vilnius"), a("Kaunas"), s("Klaipėda")],
  Ukraine: [o("Kyiv"), o("Lviv"), s("Odesa"), b("Yahodyn"), b("Uzhhorod")],
  Turkey: [a("Istanbul"), a("Ankara"), s("İzmir"), s("Mersin")],
  "United Arab Emirates": [a("Dubai"), a("Abu Dhabi"), a("Sharjah"), s("Jebel Ali")],
  Qatar: [a("Doha"), s("Hamad Port")],
  "Saudi Arabia": [a("Riyadh"), s("Jeddah"), s("Dammam")],
  Israel: [a("Tel Aviv"), s("Haifa"), s("Ashdod")],
  China: [a("Shanghai"), a("Beijing"), a("Guangzhou"), s("Shenzhen"), s("Ningbo")],
  "Hong Kong": [a("Hong Kong")],
  Japan: [a("Tokyo"), a("Osaka"), a("Nagoya"), s("Yokohama")],
  "South Korea": [a("Seoul"), s("Busan")],
  India: [a("New Delhi"), a("Mumbai"), a("Bengaluru"), a("Kolkata"), s("Chennai")],
  Pakistan: [s("Karachi"), a("Lahore"), a("Islamabad"), b("Torkham")],
  Bangladesh: [a("Dhaka"), s("Chittagong"), b("Benapole")],
  Singapore: [a("Singapore")],
  Malaysia: [a("Kuala Lumpur"), a("Penang"), s("Port Klang"), b("Johor Bahru")],
  Thailand: [a("Bangkok"), a("Chiang Mai"), s("Laem Chabang")],
  Vietnam: [a("Ho Chi Minh City"), a("Hanoi"), a("Da Nang"), s("Hai Phong")],
  Philippines: [a("Manila"), a("Cebu"), a("Clark")],
  Indonesia: [a("Jakarta"), a("Denpasar"), s("Surabaya")],
  Australia: [a("Sydney"), a("Melbourne"), a("Brisbane"), a("Perth")],
  "New Zealand": [a("Auckland"), a("Christchurch"), s("Tauranga")],
  "United States": [
    a("New York"),
    a("Washington, D.C."),
    a("Los Angeles"),
    a("Chicago"),
    a("Miami"),
    a("Atlanta"),
    a("Memphis"),
    a("Louisville"),
    s("Houston"),
  ],
  Canada: [a("Toronto"), a("Vancouver"), a("Montreal"), b("Windsor")],
  Mexico: [a("Mexico City"), a("Guadalajara"), s("Manzanillo"), b("Tijuana"), b("Nuevo Laredo")],
  Brazil: [a("São Paulo"), a("Campinas"), a("Rio de Janeiro"), s("Santos")],
  Argentina: [a("Buenos Aires")],
  Chile: [a("Santiago"), s("Valparaíso"), s("San Antonio")],
  Colombia: [a("Bogotá"), a("Medellín"), s("Cartagena")],
  Peru: [a("Lima"), s("Callao")],
};

export const CUSTOMS_KIND_LABEL: Record<CustomsKind, string> = {
  airport: "airport",
  seaport: "seaport",
  border: "border crossing",
  office: "customs office",
};

/**
 * Customs points for a destination. The destination city comes first when it is
 * one of them; an unknown country falls back to the destination city alone.
 */
export function customsPointsFor(destinationCity: string, destinationCountry: string): { country: string; points: CustomsPoint[] } {
  const country = resolveCountry(destinationCountry) ?? destinationCountry.trim();
  const list = CUSTOMS_POINTS[country];
  if (!list?.length) return { country, points: [{ city: destinationCity.trim(), kind: "office" }] };
  const same = (x: string) => x.toLowerCase() === destinationCity.trim().toLowerCase();
  const own = list.find((p) => same(p.city));
  return { country, points: own ? [own, ...list.filter((p) => p !== own)] : list };
}
