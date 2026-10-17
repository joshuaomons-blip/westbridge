/**
 * Photography from Unsplash (free for commercial use under the Unsplash License,
 * https://unsplash.com/license). Served from Unsplash's CDN.
 * To use your own photos instead, upload them in Dashboard → Website Content
 * (hero image) or replace the IDs below.
 */
const u = (id: string) => `https://images.unsplash.com/photo-${id}`;

export const PHOTOS = {
  hero: u("1631744591853-998c4308bbb0"), // truck on a mountain highway — Bailey Alexander
  warehouse: u("1627309366653-2dedc084cdf1"), // warehouse shelving — Jacques Dillies
  courier: u("1543499459-d1460946bdc6"), // carrying parcels — Handy Wicaksono
};

/** Photo for each service listing; unknown services rotate through the pool. */
const SERVICE_PHOTOS: Record<string, string> = {
  "international-parcel": u("1741698148065-fed31f2e31f8"), // port with cranes — Wolfgang Weiser
  "domestic-delivery": u("1566576721346-d4a3b4eaeb55"), // parcel handover — RoseBox
  freight: u("1504846257989-a76209d9d2ac"), // freight truck at dawn — Taylor
  "business-shipping": u("1553413077-190dd305871c"), // large warehouse — Ruchindra Gunasekara
  "shipment-tracking": u("1587293852726-70cdb56c2866"), // boxes on racks — CHUTTERSNAP
  "logistics-support": u("1436491865332-7a61a109cc05"), // aircraft from above — Ross Parmly
};
const POOL = Object.values(SERVICE_PHOTOS);

export function servicePhoto(slug: string, index: number): string {
  return SERVICE_PHOTOS[slug] ?? POOL[index % POOL.length];
}
