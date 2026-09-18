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

function isAdminRole(name: string): boolean {
  return name.toLowerCase().includes("admin");
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
      return { ok: false, message: "That role isn't available for this company." };
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
  return { ok: true, message: `${firstName} ${lastName} has been added.` };
}

export async function updateUserAction(_prev: UserActionState, formData: FormData): Promise<UserActionState> {
  if (!companyAdmin) return { ok: false, message: "User management isn't configured on this site." };

  const locationId = String(formData.get("locationId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const roleId = String(formData.get("roleId") ?? "");
  if (!locationId || !contactId || !firstName || !lastName) {
    return { ok: false, message: "Name fields are required." };
  }

  try {
    const access = await requireLocationAdmin(locationId);
    const location = await companyAdmin.getLocationUsers(locationId);
    const role = location?.roles.find((r) => r.id === roleId);
    if (roleId && !role) return { ok: false, message: "That role isn't available for this company." };
    // Don't let an admin demote themselves — they'd lose access to this page mid-edit.
    if (access.contactId === contactId && role && !isAdminRole(role.name)) {
      return { ok: false, message: "You can't change your own role. Ask another admin to do it." };
    }
    // Archived users keep their row but hold no role; editing one shouldn't silently restore access.
    const existing = location?.users.find((u) => u.contactId === contactId);
    const nextRoleId = existing?.status === "deactivated" ? undefined : roleId || undefined;
    await companyAdmin.updateUser({ locationId, contactId, firstName, lastName, roleId: nextRoleId });
  } catch (err) {
    return failure(err, "Couldn't update the user. Please try again.");
  }

  revalidatePath("/account/users");
  return { ok: true };
}

export async function archiveUserAction(_prev: UserActionState, formData: FormData): Promise<UserActionState> {
  if (!companyAdmin) return { ok: false, message: "User management isn't configured on this site." };

  const locationId = String(formData.get("locationId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  if (!locationId || !contactId) return { ok: false, message: "Missing user details." };

  try {
    const access = await requireLocationAdmin(locationId);
    if (access.contactId === contactId) return { ok: false, message: "You can't archive your own access." };
    await companyAdmin.archiveUser(locationId, contactId);
  } catch (err) {
    return failure(err, "Couldn't archive the user. Please try again.");
  }

  revalidatePath("/account/users");
  return { ok: true };
}

export async function reactivateUserAction(_prev: UserActionState, formData: FormData): Promise<UserActionState> {
  if (!companyAdmin) return { ok: false, message: "User management isn't configured on this site." };

  const locationId = String(formData.get("locationId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  if (!locationId || !contactId) return { ok: false, message: "Missing user details." };

  try {
    await requireLocationAdmin(locationId);
    const location = await companyAdmin.getLocationUsers(locationId);
    // Restore the role named on the form when it's still valid, else the company default.
    const requested = String(formData.get("roleId") ?? "");
    const roleId =
      location?.roles.find((r) => r.id === requested)?.id ?? location?.defaultRoleId ?? location?.roles[0]?.id;
    if (!roleId) return { ok: false, message: "This company has no contact roles configured in Shopify." };
    await companyAdmin.reactivateUser(locationId, contactId, roleId);
  } catch (err) {
    return failure(err, "Couldn't reactivate the user. Please try again.");
  }

  revalidatePath("/account/users");
  return { ok: true };
}
