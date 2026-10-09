"use server";

import { revalidatePath } from "next/cache";
import { LocationError } from "@repo/customer-data";
import { stateForPostcode, type LocationInput, type LocationResult } from "@repo/ui";
import { getValidAccessToken, requireSession } from "../lib/session";
import { customerAccount, locationAdmin } from "../lib/shopify";

function check(v: LocationInput): string | null {
  if (!v.name.trim() || !v.address1.trim() || !v.city.trim() || !v.zoneCode || !/^\d{4}$/.test(v.zip)) return "Fill in the name and full address.";
  if (stateForPostcode(v.zip) !== v.zoneCode) return `${v.zip} isn't a ${v.zoneCode} postcode.`;
  return null;
}

const address = (v: LocationInput) => ({ address1: v.address1.trim(), address2: v.address2.trim(), city: v.city.trim(), zoneCode: v.zoneCode, zip: v.zip });

/** Who may change what, from the person's own Customer Account API access (never from the form). */
async function access() {
  const token = await getValidAccessToken(await requireSession());
  const [company, roles] = await Promise.all([customerAccount.getCompanyLocations(token), customerAccount.getCompanyAccess(token)]);
  return { company, adminAt: new Set(roles.filter((r) => r.isAdmin).map((r) => r.locationId)) };
}

/** "Add location": a new company location. Only Location admins of the company can add one. */
export async function createLocationAction(v: LocationInput): Promise<LocationResult> {
  if (!locationAdmin) return { ok: false, message: "Location management isn't configured on this site." };
  const problem = check(v);
  if (problem) return { ok: false, message: problem };
  const { company, adminAt } = await access();
  if (!company || adminAt.size === 0) return { ok: false, message: "Only a location admin can add locations." };
  try {
    const source = company.locations.find((l) => adminAt.has(l.id))?.id ?? company.locations[0]?.id ?? null;
    const { warnings } = await locationAdmin.createLocation({ companyId: company.companyId, creatorContactId: company.contactId, sourceLocationId: source, name: v.name.trim(), address: address(v) });
    revalidatePath("/account/addresses");
    return { ok: true, message: ["Location added.", ...warnings].join(" ") };
  } catch (err) {
    console.error("createLocation failed", err);
    return { ok: false, message: err instanceof LocationError ? err.message : "Couldn't add the location." };
  }
}

/** "Edit location": rename and/or change the delivery address. Location admins of that site only. */
export async function updateLocationAction(locationId: string, v: LocationInput): Promise<LocationResult> {
  if (!locationAdmin) return { ok: false, message: "Location management isn't configured on this site." };
  const problem = check(v);
  if (problem) return { ok: false, message: problem };
  const { company, adminAt } = await access();
  const current = company?.locations.find((l) => l.id === locationId);
  if (!current || !adminAt.has(locationId)) return { ok: false, message: "Only a location admin can change this location." };
  try {
    await locationAdmin.updateLocation(locationId, { name: v.name.trim() !== current.name ? v.name.trim() : undefined, address: address(v) });
    revalidatePath("/account/addresses");
    return { ok: true, message: "Location updated." };
  } catch (err) {
    console.error("updateLocation failed", err);
    return { ok: false, message: err instanceof LocationError ? err.message : "Couldn't update the location." };
  }
}
