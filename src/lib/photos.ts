/**
 * Photography from Unsplash (free for commercial use under the Unsplash License,
 * https://unsplash.com/license), served through Next.js image optimisation.
 * Each photo was checked for visible logos or branding of other carriers.
 * These are illustrative stock photos, not pictures of Westbridge's own fleet:
 * to use your own, upload a hero image in Dashboard → Website Content or
 * replace the IDs below.
 */
const u = (id: string) => `https://images.unsplash.com/photo-${id}`;

export const PHOTOS = {
  hero: u("1590497008432-598f04441de8"), // container terminal at dusk — Timelab
  port: u("1769837496184-32831581c55a"), // container ship and cranes, aerial — Albert Stoynov
  sea: u("1606185540834-d6e7483ee1a4"), // container ship with tugs, aerial — william william
  air: u("1570710891163-6d3b5c47248b"), // aircraft overhead — Kevin Woblick
  road: u("1766785368863-f2188a8c8b32"), // trucks on a highway — Bhargav Panchal
  handover: u("1566576721346-d4a3b4eaeb55"), // parcel handover — RoseBox
  warehouse: u("1586528116022-aeda1613c63d"), // warehouse aisle with staff — Adrian Sulyok
  team: u("1664382953403-fc1ac77073a0"), // warehouse team — Centre for Ageing Better
  forklift: u("1620388640785-892616248ec8"), // forklift and pallets — Pickawood
  support: u("1626863905121-3b0c0ed7b94c"), // support agents with headsets — Charanjeet Dhiman
  parcels: u("1766040923580-16ad32fae8b4"), // pile of taped parcels — Rohit Choudhari
};

/** Photo for each service listing; unknown services rotate through the pool. */
const SERVICE_PHOTOS: Record<string, string> = {
  "international-parcel": PHOTOS.air,
  "domestic-delivery": PHOTOS.handover,
  freight: PHOTOS.road,
  "business-shipping": PHOTOS.warehouse,
  "shipment-tracking": PHOTOS.parcels,
  "logistics-support": PHOTOS.support,
};
const POOL = [PHOTOS.sea, PHOTOS.forklift, PHOTOS.team, PHOTOS.port, ...Object.values(SERVICE_PHOTOS)];

export function servicePhoto(slug: string, index: number): string {
  return SERVICE_PHOTOS[slug] ?? POOL[index % POOL.length];
}
