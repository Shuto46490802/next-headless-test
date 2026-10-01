"use server";

import { cookies } from "next/headers";
import { stateForPostcode, type DeliveryLocation } from "@repo/ui";
import { DELIVERY_STATES, LOCATION_COOKIE, STATE_PICKER_ENABLED } from "../lib/location";

/** Saves the header state picker choice. Listings read it on the refresh that follows. */
export async function saveDeliveryLocation(location: DeliveryLocation): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!STATE_PICKER_ENABLED) return { ok: false, message: "Location isn't used on this site." };
  const { state, postcode } = location;
  if (!DELIVERY_STATES.some((s) => s.code === state)) return { ok: false, message: "We don't deliver to that state yet." };
  if (!/^\d{4}$/.test(postcode) || stateForPostcode(postcode) !== state) return { ok: false, message: "That postcode isn't in the selected state." };
  (await cookies()).set(LOCATION_COOKIE, `${state}:${postcode}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return { ok: true };
}
