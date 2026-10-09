import { revalidatePath } from "next/cache";
import { FormField, FieldGroup, Button, EmptyState, LocationsManager } from "@repo/ui";
import { getValidAccessToken, requireSession } from "../../../../lib/session";
import { customerAccount, locationAdmin } from "../../../../lib/shopify";
import { siteMembership } from "../../../../lib/brand";
import { createLocationAction, updateLocationAction } from "../../../location-actions-admin";

/**
 * Partner Connect: a company has no address book, so this page manages its locations (delivery
 * sites) instead, and adding an address creates a location. Club Connect keeps the personal
 * address book for now.
 */
export default async function AddressesPage() {
  return siteMembership === "PC" ? <LocationsPage /> : <AddressBookPage />;
}

async function LocationsPage() {
  const session = await requireSession();
  const token = await getValidAccessToken(session);
  const [company, roles] = await Promise.all([customerAccount.getCompanyLocations(token), customerAccount.getCompanyAccess(token)]);
  if (!company) return <EmptyState title="No business linked" description="Your account isn't linked to a business yet." />;
  const adminAt = new Set(roles.filter((r) => r.isAdmin).map((r) => r.locationId));
  return (
    <LocationsManager
      title="Locations"
      intro={`Each location is a delivery site for ${company.companyName}, with its own address and ordering access.`}
      locations={company.locations.map((l) => ({
        ...l,
        current: l.id === session.companyLocationId,
        canEdit: Boolean(locationAdmin) && adminAt.has(l.id),
      }))}
      canAdd={Boolean(locationAdmin) && adminAt.size > 0}
      actions={{ create: createLocationAction, update: updateLocationAction }}
    />
  );
}

async function AddressBookPage() {
  const session = await requireSession();
  const accessToken = await getValidAccessToken(session);
  const { addresses, defaultAddressId } = await customerAccount.listAddresses(accessToken);

  async function createAddress(formData: FormData) {
    "use server";
    const session = await requireSession();
    const accessToken = await getValidAccessToken(session);
    await customerAccount.createAddress(accessToken, {
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      address1: String(formData.get("address1") ?? ""),
      city: String(formData.get("city") ?? ""),
      zip: String(formData.get("zip") ?? ""),
      territoryCode: String(formData.get("territoryCode") ?? ""),
      zoneCode: String(formData.get("zoneCode") ?? "") || undefined,
      phoneNumber: String(formData.get("phoneNumber") ?? "") || undefined,
    });
    revalidatePath("/account/addresses");
  }

  async function deleteAddress(formData: FormData) {
    "use server";
    const session = await requireSession();
    const accessToken = await getValidAccessToken(session);
    await customerAccount.deleteAddress(accessToken, String(formData.get("addressId")));
    revalidatePath("/account/addresses");
  }

  async function makeDefault(formData: FormData) {
    "use server";
    const session = await requireSession();
    const accessToken = await getValidAccessToken(session);
    const addressId = String(formData.get("addressId"));
    const existing = addresses.find((a) => a.id === addressId);
    if (!existing) return;
    await customerAccount.updateAddress(accessToken, addressId, existing, true);
    revalidatePath("/account/addresses");
  }

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h2 className="mb-6 font-heading text-3xl font-bold text-brand">Addresses</h2>
        {addresses.length === 0 ? (
          <EmptyState title="No addresses yet" description="Add one below." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {addresses.map((address) => (
              <div
                key={address.id}
                className="flex flex-col gap-2 rounded-2xl border border-neutral-200 p-4 text-sm"
              >
                <span className="font-medium text-neutral-900">
                  {address.firstName} {address.lastName}
                  {address.id === defaultAddressId ? (
                    <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                      Default
                    </span>
                  ) : null}
                </span>
                <span className="text-neutral-600">{address.address1}</span>
                <span className="text-neutral-600">
                  {address.city}, {address.zoneCode} {address.zip}
                </span>
                <div className="mt-2 flex gap-3">
                  {address.id !== defaultAddressId ? (
                    <form action={makeDefault}>
                      <input type="hidden" name="addressId" value={address.id} />
                      <button className="text-xs text-neutral-500 underline">Set as default</button>
                    </form>
                  ) : null}
                  <form action={deleteAddress}>
                    <input type="hidden" name="addressId" value={address.id} />
                    <button className="text-xs text-red-600 underline">Delete</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-4 text-lg font-medium text-neutral-900">Add a new address</h2>
        <form action={createAddress} className="flex max-w-lg flex-col gap-4">
          <FieldGroup>
            <FormField name="firstName" label="First name" required />
            <FormField name="lastName" label="Last name" required />
          </FieldGroup>
          <FormField name="address1" label="Address" required />
          <FieldGroup>
            <FormField name="city" label="City" required />
            <FormField name="zip" label="Zip / postal code" required />
          </FieldGroup>
          <FieldGroup>
            <FormField name="territoryCode" label="Country code (e.g. US)" required />
            <FormField name="zoneCode" label="State / province code" />
          </FieldGroup>
          <FormField name="phoneNumber" label="Phone" />
          <Button type="submit" className="self-start">
            Add address
          </Button>
        </form>
      </div>
    </div>
  );
}
