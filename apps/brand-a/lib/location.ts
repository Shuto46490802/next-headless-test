import { cookies } from "next/headers";
import { stateFilter } from "@repo/shopify-storefront";
import type { DeliveryLocation, StateOption } from "@repo/ui";
import { siteMembership } from "./brand";

/** Partner Connect only: the delivery state hides products tagged `unavailable:<code>` (see availableInState). */
export const STATE_PICKER_ENABLED = siteMembership === "PC";

export const LOCATION_COOKIE = "delivery_location";

/** States in the picker, with the delivery note from the design. */
export const DELIVERY_STATES: StateOption[] = [
  { code: "VIC", name: "Victoria", note: "Next-day · order by 11am" },
  { code: "NSW", name: "New South Wales", note: "Next-day · order by 11am" },
  { code: "WA", name: "Western Australia", note: "2–3 business days" },
];

export function parseLocation(raw: string | undefined): DeliveryLocation | null {
  const m = raw?.match(/^([A-Z]{2,3}):(\d{4})$/);
  if (!m || !DELIVERY_STATES.some((s) => s.code === m[1])) return null;
  return { state: m[1]!, postcode: m[2]! };
}

/** The saved delivery location, or null (not chosen yet, or not Partner Connect). */
export async function getDeliveryLocation(): Promise<DeliveryLocation | null> {
  if (!STATE_PICKER_ENABLED) return null;
  return parseLocation((await cookies()).get(LOCATION_COOKIE)?.value);
}

/** The chosen state's code, for trimming lists that can't take a filter. */
export async function getDeliveryState(): Promise<string | null> {
  return (await getDeliveryLocation())?.state ?? null;
}

/** Listing filters plus the hidden state availability filter, when a state is chosen. */
export async function withStateFilter(filters: Record<string, unknown>[]): Promise<Record<string, unknown>[]> {
  const state = await getDeliveryState();
  return state ? [...filters, stateFilter(state)] : filters;
}

export const stateName = (code: string) => DELIVERY_STATES.find((s) => s.code === code)?.name ?? code;
