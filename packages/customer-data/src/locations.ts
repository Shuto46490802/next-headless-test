import { adminRequest, type AdminApiConfig } from "./admin";
import { toE164, type SignupAddress } from "./signup";

/**
 * Partner locations page (data mapping: Company → Locations and addresses). Companies have no
 * address book: each delivery site is a company location with its own shipping (and billing)
 * address, catalog and user roles. Adding an address therefore creates a location.
 *
 * Writes need the Admin API. Callers must check, with the customer's own Customer Account API
 * access, that the person is a Location admin of this company before calling.
 */
type UserErrors = { field: string[] | null; message: string; code?: string | null }[];

export class LocationError extends Error {}

const LOCATION_CREATE = /* GraphQL */ `
  mutation LocationCreate($companyId: ID!, $input: CompanyLocationInput!) {
    companyLocationCreate(companyId: $companyId, input: $input) {
      companyLocation {
        id
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

const LOCATION_ASSIGN_ADDRESS = /* GraphQL */ `
  mutation LocationAssignAddress($locationId: ID!, $address: CompanyAddressInput!, $addressTypes: [CompanyAddressType!]!) {
    companyLocationAssignAddress(locationId: $locationId, address: $address, addressTypes: $addressTypes) {
      addresses {
        id
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

const LOCATION_UPDATE = /* GraphQL */ `
  mutation LocationUpdate($companyLocationId: ID!, $input: CompanyLocationUpdateInput!) {
    companyLocationUpdate(companyLocationId: $companyLocationId, input: $input) {
      companyLocation {
        id
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

const LOCATION_SETUP = /* GraphQL */ `
  query LocationSetup($companyId: ID!, $locationId: ID!) {
    company(id: $companyId) {
      contactRoles(first: 10) {
        nodes {
          id
          name
        }
      }
    }
    companyLocation(id: $locationId) {
      catalogs(first: 10) {
        nodes {
          id
        }
      }
    }
  }
`;

const ASSIGN_ROLE = /* GraphQL */ `
  mutation LocationAssignRole($companyContactId: ID!, $companyContactRoleId: ID!, $companyLocationId: ID!) {
    companyContactAssignRole(companyContactId: $companyContactId, companyContactRoleId: $companyContactRoleId, companyLocationId: $companyLocationId) {
      companyContactRoleAssignment {
        id
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

const CATALOG_ADD_LOCATION = /* GraphQL */ `
  mutation CatalogAddLocation($catalogId: ID!, $contextsToAdd: CatalogContextInput!) {
    catalogContextUpdate(catalogId: $catalogId, contextsToAdd: $contextsToAdd) {
      catalog {
        id
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

function assertOk(errors: UserErrors, step: string) {
  if (errors.length) throw new LocationError(`${step}: ${errors.map((e) => e.message).join(", ")}`);
}

function addressInput(a: SignupAddress, recipient?: string) {
  return {
    address1: a.address1,
    address2: a.address2 || null,
    city: a.city,
    zoneCode: a.zoneCode,
    zip: a.zip,
    countryCode: a.countryCode ?? "AU",
    recipient: recipient ?? a.company ?? null,
    phone: toE164(a.phone),
  };
}

export function createLocationAdmin(config: AdminApiConfig) {
  return {
    /**
     * New delivery site: creates the location, makes the person who added it its Location admin,
     * and puts it in the same catalogs as `sourceLocationId` so it gets the same prices and range.
     * The catalog step needs product access on the Admin app; when it can't run, `warnings`
     * says so and Asahi assigns the catalog in admin.
     */
    async createLocation(input: { companyId: string; creatorContactId: string; sourceLocationId: string | null; name: string; address: SignupAddress }) {
      const created = await adminRequest<{ companyLocationCreate: { companyLocation: { id: string } | null; userErrors: UserErrors } }>(config, LOCATION_CREATE, {
        companyId: input.companyId,
        input: { name: input.name, shippingAddress: addressInput(input.address, input.name), billingSameAsShipping: true },
      });
      assertOk(created.companyLocationCreate.userErrors, "Creating the location");
      const locationId = created.companyLocationCreate.companyLocation!.id;
      const warnings: string[] = [];

      const setup = await adminRequest<{ company: { contactRoles: { nodes: { id: string; name: string }[] } } | null; companyLocation: { catalogs: { nodes: { id: string }[] } } | null }>(
        config,
        LOCATION_SETUP,
        { companyId: input.companyId, locationId: input.sourceLocationId ?? locationId },
      ).catch((err) => {
        warnings.push(`Couldn't read roles or catalogs (${err instanceof Error ? err.message : err}).`);
        return null;
      });

      const admin = setup?.company?.contactRoles.nodes.find((r) => /admin/i.test(r.name));
      if (admin) {
        const role = await adminRequest<{ companyContactAssignRole: { userErrors: UserErrors } }>(config, ASSIGN_ROLE, {
          companyContactId: input.creatorContactId,
          companyContactRoleId: admin.id,
          companyLocationId: locationId,
        });
        if (role.companyContactAssignRole.userErrors.length) warnings.push("You weren't given access to the new location automatically.");
      }

      for (const c of input.sourceLocationId ? setup?.companyLocation?.catalogs.nodes ?? [] : []) {
        try {
          const r = await adminRequest<{ catalogContextUpdate: { userErrors: UserErrors } }>(config, CATALOG_ADD_LOCATION, {
            catalogId: c.id,
            contextsToAdd: { companyLocationIds: [locationId] },
          });
          if (r.catalogContextUpdate.userErrors.length) throw new Error(r.catalogContextUpdate.userErrors.map((e) => e.message).join(", "));
        } catch (err) {
          console.warn("Catalog copy failed for", locationId, err);
          warnings.push("Pricing for this location will be set up by our team.");
          break;
        }
      }
      return { locationId, warnings };
    },

    /** Rename a location and/or replace its delivery address (billing follows shipping). */
    async updateLocation(locationId: string, input: { name?: string; address?: SignupAddress }) {
      if (input.name) {
        const r = await adminRequest<{ companyLocationUpdate: { userErrors: UserErrors } }>(config, LOCATION_UPDATE, { companyLocationId: locationId, input: { name: input.name } });
        assertOk(r.companyLocationUpdate.userErrors, "Renaming the location");
      }
      if (input.address) {
        const r = await adminRequest<{ companyLocationAssignAddress: { userErrors: UserErrors } }>(config, LOCATION_ASSIGN_ADDRESS, {
          locationId,
          address: addressInput(input.address, input.name),
          addressTypes: ["SHIPPING", "BILLING"],
        });
        assertOk(r.companyLocationAssignAddress.userErrors, "Saving the address");
      }
    },
  };
}

export type LocationAdmin = ReturnType<typeof createLocationAdmin>;
