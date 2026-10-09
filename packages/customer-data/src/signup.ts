import { adminRequest, type AdminApiConfig } from "./admin";

/**
 * Sign-up writes (data mapping: Customer → Sign-up status, Company → Sign-up status).
 *
 * Club Connect / Partner Connect: the company is created the moment the form is submitted, the
 * person registering becomes its main contact and Location admin, and `custom.account_status` on
 * the company starts as `pending`. Asahi approves by changing it to `approved` in Shopify admin.
 *
 * Drinks Cart: personal accounts. The form updates the customer and sets `custom.account_status`
 * on the customer (`pending`, or `approved` when the backend validates the referral code).
 *
 * The Customer Account API can't create companies or write these metafields, so this runs on the
 * server with the Admin API. Callers pass the customer ID from the session, never from the form.
 */

export type MetafieldWrite = { key: string; value: string; type: string };

export interface SignupAddress {
  address1: string;
  address2?: string;
  city: string;
  zoneCode: string;
  zip: string;
  countryCode?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
}

export class SignupError extends Error {}

type UserErrors = { field: string[] | null; message: string; code?: string | null }[];

const COMPANY_CREATE = /* GraphQL */ `
  mutation SignupCompanyCreate($input: CompanyCreateInput!) {
    companyCreate(input: $input) {
      company {
        id
        contactRoles(first: 10) {
          nodes {
            id
            name
          }
        }
        locations(first: 1) {
          nodes {
            id
          }
        }
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

const ASSIGN_CONTACT = /* GraphQL */ `
  mutation SignupAssignContact($companyId: ID!, $customerId: ID!) {
    companyAssignCustomerAsContact(companyId: $companyId, customerId: $customerId) {
      companyContact {
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

const ASSIGN_MAIN_CONTACT = /* GraphQL */ `
  mutation SignupAssignMainContact($companyId: ID!, $companyContactId: ID!) {
    companyAssignMainContact(companyId: $companyId, companyContactId: $companyContactId) {
      company {
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

const ASSIGN_ROLE = /* GraphQL */ `
  mutation SignupAssignRole($companyContactId: ID!, $companyContactRoleId: ID!, $companyLocationId: ID!) {
    companyContactAssignRole(
      companyContactId: $companyContactId
      companyContactRoleId: $companyContactRoleId
      companyLocationId: $companyLocationId
    ) {
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

const COMPANY_DELETE = /* GraphQL */ `
  mutation SignupCompanyDelete($id: ID!) {
    companyDelete(id: $id) {
      deletedCompanyId
      userErrors {
        field
        message
        code
      }
    }
  }
`;

const CUSTOMER_UPDATE = /* GraphQL */ `
  mutation SignupCustomerUpdate($input: CustomerInput!) {
    customerUpdate(input: $input) {
      customer {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const CUSTOMER_ADDRESS_CREATE = /* GraphQL */ `
  mutation SignupCustomerAddress($customerId: ID!, $address: MailingAddressInput!) {
    customerAddressCreate(customerId: $customerId, address: $address, setAsDefault: true) {
      address {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const METAFIELDS_SET = /* GraphQL */ `
  mutation SignupMetafields($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      userErrors {
        field
        message
        code
      }
    }
  }
`;

export const SIGNUP_OPERATIONS = { COMPANY_CREATE, ASSIGN_CONTACT, ASSIGN_MAIN_CONTACT, ASSIGN_ROLE, COMPANY_DELETE, CUSTOMER_UPDATE, CUSTOMER_ADDRESS_CREATE, METAFIELDS_SET };

function assertOk(errors: UserErrors, step: string) {
  if (errors.length) throw new SignupError(`${step}: ${errors.map((e) => e.message).join(", ")}`);
}

/** Australian numbers to E.164 (+61…); Shopify rejects other formats. Null when it can't tell. */
export function toE164(phone: string | undefined | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits.length >= 10 ? digits : null;
  if (digits.startsWith("61")) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `+61${digits.slice(1)}`;
  return null;
}

export function createSignupAdmin(config: AdminApiConfig) {
  async function setMetafields(ownerId: string, fields: MetafieldWrite[]) {
    const metafields = fields.filter((f) => f.value !== "").map((f) => ({ ownerId, namespace: "custom", ...f }));
    if (!metafields.length) return;
    const d = await adminRequest<{ metafieldsSet: { userErrors: UserErrors } }>(config, METAFIELDS_SET, { metafields });
    assertOk(d.metafieldsSet.userErrors, "Saving details");
  }

  async function updateCustomer(customerId: string, input: { firstName: string; lastName: string; phone?: string | null }) {
    const phone = toE164(input.phone);
    const d = await adminRequest<{ customerUpdate: { userErrors: UserErrors } }>(config, CUSTOMER_UPDATE, {
      input: { id: customerId, firstName: input.firstName, lastName: input.lastName, ...(phone ? { phone } : {}) },
    });
    assertOk(d.customerUpdate.userErrors, "Saving your details");
  }

  return {
    setMetafields,
    updateCustomer,

    /**
     * Club Connect / Partner Connect: create the company with one location at the given address,
     * make the customer its main contact and Location admin, and write the company metafields
     * (always including `account_status: pending`). If any step after creation fails, the company
     * is deleted again so a retry starts clean.
     */
    async createCompanyForCustomer(input: {
      customerId: string;
      companyName: string;
      locationName?: string;
      address: SignupAddress;
      companyMetafields: MetafieldWrite[];
    }): Promise<{ companyId: string; locationId: string }> {
      const created = await adminRequest<{
        companyCreate: {
          company: { id: string; contactRoles: { nodes: { id: string; name: string }[] }; locations: { nodes: { id: string }[] } } | null;
          userErrors: UserErrors;
        };
      }>(config, COMPANY_CREATE, {
        input: {
          company: { name: input.companyName },
          companyLocation: {
            name: input.locationName ?? input.companyName,
            shippingAddress: {
              address1: input.address.address1,
              address2: input.address.address2 || null,
              city: input.address.city,
              zoneCode: input.address.zoneCode,
              zip: input.address.zip,
              countryCode: input.address.countryCode ?? "AU",
              recipient: input.companyName,
              phone: toE164(input.address.phone),
            },
            billingSameAsShipping: true,
          },
        },
      });
      assertOk(created.companyCreate.userErrors, "Creating your account");
      const company = created.companyCreate.company!;
      const locationId = company.locations.nodes[0]?.id;
      const adminRole = company.contactRoles.nodes.find((r) => /admin/i.test(r.name)) ?? company.contactRoles.nodes[0];

      try {
        if (!locationId || !adminRole) throw new SignupError("Creating your account: the company has no location or roles");
        const contact = await adminRequest<{ companyAssignCustomerAsContact: { companyContact: { id: string } | null; userErrors: UserErrors } }>(config, ASSIGN_CONTACT, {
          companyId: company.id,
          customerId: input.customerId,
        });
        assertOk(contact.companyAssignCustomerAsContact.userErrors, "Linking you to the account");
        const contactId = contact.companyAssignCustomerAsContact.companyContact!.id;

        const main = await adminRequest<{ companyAssignMainContact: { userErrors: UserErrors } }>(config, ASSIGN_MAIN_CONTACT, { companyId: company.id, companyContactId: contactId });
        assertOk(main.companyAssignMainContact.userErrors, "Making you the main contact");

        const role = await adminRequest<{ companyContactAssignRole: { userErrors: UserErrors } }>(config, ASSIGN_ROLE, {
          companyContactId: contactId,
          companyContactRoleId: adminRole.id,
          companyLocationId: locationId,
        });
        assertOk(role.companyContactAssignRole.userErrors, "Giving you admin access");

        await setMetafields(company.id, [{ key: "account_status", value: "pending", type: "single_line_text_field" }, ...input.companyMetafields]);
        return { companyId: company.id, locationId };
      } catch (err) {
        await adminRequest(config, COMPANY_DELETE, { id: company.id }).catch((e) => console.error("Rollback failed for", company.id, e));
        throw err;
      }
    },

    /** Drinks Cart: add the delivery address as the customer's default. */
    async addDefaultAddress(customerId: string, address: SignupAddress) {
      const d = await adminRequest<{ customerAddressCreate: { userErrors: UserErrors } }>(config, CUSTOMER_ADDRESS_CREATE, {
        customerId,
        address: {
          firstName: address.firstName,
          lastName: address.lastName,
          company: address.company || null,
          address1: address.address1,
          address2: address.address2 || null,
          city: address.city,
          provinceCode: address.zoneCode,
          zip: address.zip,
          countryCode: address.countryCode ?? "AU",
          phone: toE164(address.phone),
        },
      });
      assertOk(d.customerAddressCreate.userErrors, "Saving your address");
    },
  };
}

export type SignupAdmin = ReturnType<typeof createSignupAdmin>;
