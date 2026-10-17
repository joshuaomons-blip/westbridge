export const STATUS_CODES = [
  "shipment_created",
  "shipment_registered",
  "awaiting_dispatch",
  "in_transit",
  "arrived_at_facility",
  "customs_processing",
  "customs_cleared",
  "out_for_delivery",
  "delivered",
  "delivery_exception",
  "delayed",
  "returned_to_sender",
  "cancelled",
] as const;

export type StatusCode = (typeof STATUS_CODES)[number];

export type StatusCategory = "pending" | "active" | "delivered" | "exception" | "closed";

export const STATUS_CATEGORY: Record<StatusCode, StatusCategory> = {
  shipment_created: "pending",
  shipment_registered: "pending",
  awaiting_dispatch: "pending",
  in_transit: "active",
  arrived_at_facility: "active",
  customs_processing: "active",
  customs_cleared: "active",
  out_for_delivery: "active",
  delivered: "delivered",
  delivery_exception: "exception",
  delayed: "exception",
  returned_to_sender: "closed",
  cancelled: "closed",
};

/** English labels for the (English-only) admin dashboard. */
export const STATUS_ADMIN_LABEL: Record<StatusCode, string> = {
  shipment_created: "Shipment created",
  shipment_registered: "Shipment registered",
  awaiting_dispatch: "Awaiting dispatch",
  in_transit: "In transit",
  arrived_at_facility: "Arrived at facility",
  customs_processing: "Customs processing",
  customs_cleared: "Customs cleared",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  delivery_exception: "Delivery exception",
  delayed: "Delayed",
  returned_to_sender: "Returned to sender",
  cancelled: "Cancelled",
};

export const CATEGORY_STYLE: Record<StatusCategory, string> = {
  pending: "bg-slate-100 text-slate-700 ring-slate-200",
  active: "bg-blue-50 text-navy-700 ring-blue-200",
  delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  exception: "bg-amber-50 text-amber-800 ring-amber-200",
  closed: "bg-zinc-100 text-zinc-600 ring-zinc-200",
};

export function isStatusCode(v: string): v is StatusCode {
  return (STATUS_CODES as readonly string[]).includes(v);
}

export function categoryOf(code: string): StatusCategory {
  return isStatusCode(code) ? STATUS_CATEGORY[code] : "pending";
}

/** Progress steps shown on the public tracking page. */
export const PROGRESS_STEPS: StatusCode[] = ["shipment_registered", "in_transit", "out_for_delivery", "delivered"];

export function progressIndex(code: string): number {
  switch (code) {
    case "shipment_created":
    case "shipment_registered":
    case "awaiting_dispatch":
      return 0;
    case "in_transit":
    case "arrived_at_facility":
    case "customs_processing":
    case "customs_cleared":
    case "delayed":
    case "delivery_exception":
      return 1;
    case "out_for_delivery":
      return 2;
    case "delivered":
      return 3;
    default:
      return -1;
  }
}

/** Statuses that pause a shipment: the public page shows it as on hold, with later steps pending. */
export const HOLD_STATUSES: StatusCode[] = ["customs_processing", "delayed", "delivery_exception"];

export function isOnHold(code: string): boolean {
  return (HOLD_STATUSES as string[]).includes(code);
}
