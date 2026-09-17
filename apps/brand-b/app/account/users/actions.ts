"use server";

import { revalidatePath } from "next/cache";
import { CompanyAdminError } from "@repo/customer-data";
import type { UserActionState } from "@repo/ui";
import { requireLocationAdmin } from "../../../lib/partner";
import { SITE_MEMBERSHIP, companyAdmin } from "../../../lib/shopify";

function failure(err: unknown, fallback: string): UserActionState {
  if (err instanceof CompanyAdminError) return { ok: false, message: err.message };
  console.error(fallback, err);
  return { ok: false, message: fallback };
}

export async function addUserAction(_prev: UserActionState, formData: FormData): Promise<UserActionState> {
  if (!companyAdmin) return { ok: false, message: "User management isn't configured on this site." };

  const locationId = String(formData.get("locationId") ?? "");
  const email = String(formData.get("email") ?? "").trim();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const roleId = String(formData.get("roleId") ?? "");
  if (!locationId || !email || !firstName || !lastName || !roleId) {
    return { ok: false, message: "All fields are required." };
  }

  try {
    const access = await requireLocationAdmin(locationId);
    const location = await companyAdmin.getLocationUsers(locationId);
    if (!location || !location.roles.some((r) => r.id === roleId)) {
      return { ok: false, message: "That role isn't available for this location." };
    }
    await companyAdmin.addUserToLocation({
      companyId: access.companyId,
      locationId,
      email,
      firstName,
      lastName,
      roleId,
      siteMembership: SITE_MEMBERSHIP,
    });
  } catch (err) {
    return failure(err, "Couldn't add the user. Please try again.");
  }

  revalidatePath("/account/users");
  return { ok: true, message: `${firstName} ${lastName} has been added. They can sign in with ${email}.` };
}

export async function removeUserAction(_prev: UserActionState, formData: FormData): Promise<UserActionState> {
  if (!companyAdmin) return { ok: false, message: "User management isn't configured on this site." };

  const locationId = String(formData.get("locationId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  if (!locationId || !contactId) return { ok: false, message: "Missing user details." };

  try {
    const access = await requireLocationAdmin(locationId);
    if (access.contactId === contactId) {
      return { ok: false, message: "You can't remove your own access." };
    }
    await companyAdmin.removeUserFromLocation(locationId, contactId);
  } catch (err) {
    return failure(err, "Couldn't remove the user. Please try again.");
  }

  revalidatePath("/account/users");
  return { ok: true };
}
