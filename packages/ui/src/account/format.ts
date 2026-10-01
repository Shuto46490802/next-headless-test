import type { AccountFulfillmentData, AccountOrderRowData } from "./types";

const tz = "Australia/Melbourne";

/** "24 Jul" */
export const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: tz });
/** "22 July 2026" */
export const longDate = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: tz });
/** "24 July, 9:12am" */
export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "long", hour: "numeric", minute: "2-digit", timeZone: tz }).replace(" am", "am").replace(" pm", "pm");

/** "#CC-10428" → "10428"; Shopify order names already carry the store prefix. */
export const orderNumber = (name: string) => name.replace(/^#/, "");

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";
export interface OrderStatus {
  label: string;
  tone: StatusTone;
  /** 0 Confirmed · 1 Packed · 2 In transit · 3 Out for delivery · 4 Delivered */
  step: number;
}

const SHIPMENT_STEP: Record<string, number> = {
  LABEL_PRINTED: 1,
  LABEL_PURCHASED: 1,
  READY_FOR_PICKUP: 1,
  CONFIRMED: 1,
  IN_TRANSIT: 2,
  CARRIER_PICKED_UP: 2,
  ATTEMPTED_DELIVERY: 3,
  OUT_FOR_DELIVERY: 3,
  DELIVERED: 4,
  PICKED_UP: 4,
};

const STEP_LABEL = ["Confirmed", "Packed", "In transit", "Out for delivery", "Delivered"];

/** One shipment's place on the timeline. A fulfilment with no carrier event yet counts as Packed. */
export function shipmentStep(f: AccountFulfillmentData): number {
  if (f.status === "CANCELLED" || f.status === "FAILURE" || f.status === "ERROR") return -1;
  return f.latestShipmentStatus ? (SHIPMENT_STEP[f.latestShipmentStatus] ?? 1) : 1;
}

/**
 * Order badge: the least-advanced shipment wins, so an order split across warehouses only reads
 * "Delivered" once every shipment is. Unfulfilled items keep it at Confirmed.
 */
export function orderStatus(order: Pick<AccountOrderRowData, "fulfillments" | "fulfillmentStatus" | "financialStatus">): OrderStatus {
  if (order.financialStatus === "REFUNDED" || order.financialStatus === "VOIDED") return { label: "Cancelled", tone: "danger", step: -1 };
  const steps = order.fulfillments.map(shipmentStep).filter((s) => s >= 0);
  const fullyFulfilled = order.fulfillmentStatus === "FULFILLED";
  const step = steps.length === 0 || !fullyFulfilled ? 0 : Math.min(...steps);
  const tone: StatusTone = step === 4 ? "success" : step === 0 ? "neutral" : "info";
  return { label: STEP_LABEL[step]!, tone, step };
}

export const STATUS_TONE_CLASS: Record<StatusTone, string> = {
  neutral: "bg-neutral-100 text-neutral-600",
  info: "bg-brand-tint text-brand",
  success: "bg-[#e7f5ec] text-[#1b6b3d]",
  warning: "bg-amber-50 text-amber-800",
  danger: "bg-red-50 text-red-700",
};

export const TIMELINE_STEPS = STEP_LABEL;
