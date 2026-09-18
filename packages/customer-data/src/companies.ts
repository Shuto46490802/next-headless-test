import {
  adminRequest,
  setMetafield,
  LAST_LOGIN_METAFIELD,
  SITE_MEMBERSHIP_METAFIELD,
  type AdminApiConfig,
} from "./admin";
import {
  isSiteMembership,
  type CompanyRole,
  type LocationUser,
  type LocationUsersResult,
  type SiteMembership,
} from "./types";

/**
 * Company-owned metafields shown in the Users page header. Both are optional — the header
 * simply omits the ABN / LICENSED badge when they aren't set on the company.
 */
export const COMPANY_ABN_METAFIELD = { namespace: "mindarc_poc", key: "abn" } as const;
export const COMPANY_LICENCE_METAFIELD = { namespace: "mindarc_poc", key: "liquor_licence" } as const;

/**
 * A company-user operation was refused for a reason the admin can act on (duplicate email,
 * wrong-site customer, Shopify user error). `message` is safe to show in the UI.
 */
export class CompanyAdminError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CompanyAdminError";
  }
}

interface BusinessUserError {
  field: string[] | null;
  message: string;
  code: string | null;
}

function assertNoErrors(userErrors: BusinessUserError[], context: string) {
  if (userErrors.length > 0) {
    throw new CompanyAdminError(`${context}: ${userErrors.map((e) => e.message).join(", ")}`);
  }
}

/**
 * Every contact of the company, not just those holding a role at this location — a contact
 * with no role here is an archived user, and still has to render (greyed out, reactivatable).
 */
const LOCATION_USERS_QUERY = /* GraphQL */ `
  query LocationUsers($locationId: ID!) {
    companyLocation(id: $locationId) {
      id
      name
      company {
        id
        name
        externalId
        abn: metafield(namespace: "${COMPANY_ABN_METAFIELD.namespace}", key: "${COMPANY_ABN_METAFIELD.key}") {
          value
        }
        licence: metafield(
          namespace: "${COMPANY_LICENCE_METAFIELD.namespace}"
          key: "${COMPANY_LICENCE_METAFIELD.key}"
        ) {
          value
        }
        defaultRole {
          id
          name
        }
        contactRoles(first: 20) {
          nodes {
            id
            name
          }
        }
        contacts(first: 100) {
          nodes {
            id
            isMainContact
            customer {
              id
              firstName
              lastName
              defaultEmailAddress {
                emailAddress
              }
              state
              lastLogin: metafield(
                namespace: "${LAST_LOGIN_METAFIELD.namespace}"
                key: "${LAST_LOGIN_METAFIELD.key}"
              ) {
                value
              }
            }
            roleAssignments(first: 50) {
              nodes {
                id
                companyLocation {
                  id
                }
                role {
                  id
                  name
                }
              }
            }
          }
        }
      }
    }
  }
`;

const CUSTOMER_BY_EMAIL_QUERY = /* GraphQL */ `
  query CustomerByEmail($query: String!) {
    customers(first: 1, query: $query) {
      nodes {
        id
        defaultEmailAddress {
          emailAddress
        }
        siteMembership: metafield(
          namespace: "${SITE_MEMBERSHIP_METAFIELD.namespace}"
          key: "${SITE_MEMBERSHIP_METAFIELD.key}"
        ) {
          value
        }
        companyContactProfiles {
          id
          company {
            id
          }
        }
      }
    }
  }
`;

const CONTACT_ROLE_ASSIGNMENTS_QUERY = /* GraphQL */ `
  query ContactRoleAssignments($contactId: ID!) {
    companyContact(id: $contactId) {
      id
      isMainContact
      company {
        id
      }
      roleAssignments(first: 100) {
        nodes {
          id
          companyLocation {
            id
          }
        }
      }
    }
  }
`;

const CONTACT_CREATE_MUTATION = /* GraphQL */ `
  mutation CompanyContactCreate($companyId: ID!, $input: CompanyContactInput!) {
    companyContactCreate(companyId: $companyId, input: $input) {
      companyContact {
        id
        customer {
          id
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

const CONTACT_UPDATE_MUTATION = /* GraphQL */ `
  mutation CompanyContactUpdate($companyContactId: ID!, $input: CompanyContactInput!) {
    companyContactUpdate(companyContactId: $companyContactId, input: $input) {
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

const ASSIGN_CUSTOMER_AS_CONTACT_MUTATION = /* GraphQL */ `
  mutation CompanyAssignCustomerAsContact($companyId: ID!, $customerId: ID!) {
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

const ASSIGN_ROLE_MUTATION = /* GraphQL */ `
  mutation CompanyContactAssignRole($contactId: ID!, $roleId: ID!, $locationId: ID!) {
    companyContactAssignRole(
      companyContactId: $contactId
      companyContactRoleId: $roleId
      companyLocationId: $locationId
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

const REVOKE_ROLES_MUTATION = /* GraphQL */ `
  mutation CompanyContactRevokeRoles($contactId: ID!, $roleAssignmentIds: [ID!]!) {
    companyContactRevokeRoles(companyContactId: $contactId, roleAssignmentIds: $roleAssignmentIds) {
      revokedRoleAssignmentIds
      userErrors {
        field
        message
        code
      }
    }
  }
`;

interface RawContact {
  id: string;
  isMainContact: boolean;
  customer: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    defaultEmailAddress: { emailAddress: string | null } | null;
    state: "DECLINED" | "DISABLED" | "ENABLED" | "INVITED";
    lastLogin: { value: string } | null;
  };
  roleAssignments: {
    nodes: { id: string; companyLocation: { id: string }; role: CompanyRole }[];
  };
}

export interface AddUserInput {
  companyId: string;
  locationId: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  /** Site membership stamped on a brand-new customer so they can log in to this site. */
  siteMembership: SiteMembership;
}

export interface UpdateUserInput {
  locationId: string;
  contactId: string;
  firstName: string;
  lastName: string;
  /** Omit to leave the current role untouched. */
  roleId?: string;
}

/** Shopify returns role names like "admin" / "buyer"; the UI shows them title-cased. */
function titleCase(value: string): string {
  return value.replace(/\w\S*/g, (word) => word[0]!.toUpperCase() + word.slice(1).toLowerCase());
}

/**
 * Admin API operations behind the partner "Users" page. These run with the store-wide Admin
 * token, so callers MUST verify the signed-in customer is a location admin for `locationId`
 * (via the Customer Account API) before invoking anything that writes.
 */
export function createCompanyAdmin(config: AdminApiConfig) {
  async function contactRoleAssignments(contactId: string) {
    const data = await adminRequest<{
      companyContact: {
        id: string;
        isMainContact: boolean;
        company: { id: string };
        roleAssignments: { nodes: { id: string; companyLocation: { id: string } }[] };
      } | null;
    }>(config, CONTACT_ROLE_ASSIGNMENTS_QUERY, { contactId });
    if (!data.companyContact) throw new CompanyAdminError("That user no longer exists on this company.");
    return data.companyContact;
  }

  async function revokeRoles(contactId: string, roleAssignmentIds: string[]) {
    if (roleAssignmentIds.length === 0) return;
    const data = await adminRequest<{ companyContactRevokeRoles: { userErrors: BusinessUserError[] } }>(
      config,
      REVOKE_ROLES_MUTATION,
      { contactId, roleAssignmentIds },
    );
    assertNoErrors(data.companyContactRevokeRoles.userErrors, "Couldn't update the user's role");
  }

  async function assignRole(contactId: string, roleId: string, locationId: string) {
    const data = await adminRequest<{ companyContactAssignRole: { userErrors: BusinessUserError[] } }>(
      config,
      ASSIGN_ROLE_MUTATION,
      { contactId, roleId, locationId },
    );
    assertNoErrors(data.companyContactAssignRole.userErrors, "Couldn't assign the role");
  }

  /** Replaces whatever role the contact holds at this location with exactly `roleId`. */
  async function setRoleAtLocation(contactId: string, locationId: string, roleId: string) {
    const contact = await contactRoleAssignments(contactId);
    const here = contact.roleAssignments.nodes.filter((ra) => ra.companyLocation.id === locationId);
    await revokeRoles(contactId, here.map((ra) => ra.id));
    await assignRole(contactId, roleId, locationId);
  }

  return {
    async getLocationUsers(locationId: string): Promise<LocationUsersResult | null> {
      const data = await adminRequest<{
        companyLocation: {
          id: string;
          name: string;
          company: {
            id: string;
            name: string;
            externalId: string | null;
            abn: { value: string } | null;
            licence: { value: string } | null;
            defaultRole: CompanyRole | null;
            contactRoles: { nodes: CompanyRole[] };
            contacts: { nodes: RawContact[] };
          };
        } | null;
      }>(config, LOCATION_USERS_QUERY, { locationId });
      const loc = data.companyLocation;
      if (!loc) return null;
      const company = loc.company;

      const users: LocationUser[] = company.contacts.nodes.map((contact) => {
        const here = contact.roleAssignments.nodes.filter((ra) => ra.companyLocation.id === locationId);
        const signedIn =
          Boolean(contact.customer.lastLogin?.value) || contact.customer.state === "ENABLED";
        return {
          contactId: contact.id,
          customerId: contact.customer.id,
          firstName: contact.customer.firstName,
          lastName: contact.customer.lastName,
          email: contact.customer.defaultEmailAddress?.emailAddress ?? null,
          roleId: here[0]?.role.id ?? null,
          roleName: here[0] ? titleCase(here[0].role.name) : null,
          roleAssignmentIds: here.map((ra) => ra.id),
          isMainContact: contact.isMainContact,
          status: here.length === 0 ? "deactivated" : signedIn ? "active" : "invited",
        };
      });
      // Active/invited first, archived last; alphabetical within each group.
      const rank = { active: 0, invited: 1, deactivated: 2 } as const;
      users.sort(
        (a, b) =>
          rank[a.status] - rank[b.status] ||
          (a.lastName ?? "").localeCompare(b.lastName ?? "") ||
          (a.email ?? "").localeCompare(b.email ?? ""),
      );

      const licence = company.licence?.value?.trim().toLowerCase();
      return {
        locationId: loc.id,
        locationName: loc.name,
        company: {
          id: company.id,
          name: company.name,
          accountNumber: company.externalId?.trim() || null,
          abn: company.abn?.value?.trim() || null,
          licensed: Boolean(licence) && licence !== "false" && licence !== "0",
        },
        roles: company.contactRoles.nodes.map((r) => ({ ...r, name: titleCase(r.name) })),
        defaultRoleId: company.defaultRole?.id ?? null,
        users,
      };
    },

    /**
     * Adds a person to a location: reuses an existing customer/contact where one exists,
     * otherwise creates them, then grants exactly one role at the location. Re-runnable — a
     * partial earlier failure resumes from wherever it got to.
     */
    async addUserToLocation(input: AddUserInput): Promise<void> {
      const email = input.email.trim().toLowerCase();
      if (!email) throw new CompanyAdminError("Email address is required.");

      // 1. Existing customer?
      const found = await adminRequest<{
        customers: {
          nodes: {
            id: string;
            defaultEmailAddress: { emailAddress: string | null } | null;
            siteMembership: { value: string } | null;
            companyContactProfiles: { id: string; company: { id: string } }[];
          }[];
        };
      }>(config, CUSTOMER_BY_EMAIL_QUERY, { query: `email:${JSON.stringify(email)}` });
      const existing =
        found.customers.nodes.find((c) => c.defaultEmailAddress?.emailAddress?.toLowerCase() === email) ?? null;

      let customerId: string;
      let contactId: string;

      if (existing) {
        const membership = existing.siteMembership?.value?.trim().toUpperCase();
        if (isSiteMembership(membership) && membership !== input.siteMembership) {
          throw new CompanyAdminError(
            "That email address is already registered with a different site and can't be added here.",
          );
        }
        customerId = existing.id;
        const contact = existing.companyContactProfiles.find((c) => c.company.id === input.companyId);
        if (contact) {
          contactId = contact.id;
        } else {
          const data = await adminRequest<{
            companyAssignCustomerAsContact: {
              companyContact: { id: string } | null;
              userErrors: BusinessUserError[];
            };
          }>(config, ASSIGN_CUSTOMER_AS_CONTACT_MUTATION, { companyId: input.companyId, customerId });
          assertNoErrors(data.companyAssignCustomerAsContact.userErrors, "Couldn't add the user to the company");
          contactId = data.companyAssignCustomerAsContact.companyContact!.id;
        }
        if (!isSiteMembership(membership)) {
          await setMetafield(config, customerId, SITE_MEMBERSHIP_METAFIELD, input.siteMembership);
        }
      } else {
        const data = await adminRequest<{
          companyContactCreate: {
            companyContact: { id: string; customer: { id: string } } | null;
            userErrors: BusinessUserError[];
          };
        }>(config, CONTACT_CREATE_MUTATION, {
          companyId: input.companyId,
          input: { email, firstName: input.firstName.trim(), lastName: input.lastName.trim() },
        });
        assertNoErrors(data.companyContactCreate.userErrors, "Couldn't create the user");
        contactId = data.companyContactCreate.companyContact!.id;
        customerId = data.companyContactCreate.companyContact!.customer.id;
        await setMetafield(config, customerId, SITE_MEMBERSHIP_METAFIELD, input.siteMembership);
      }

      // 2. Exactly one role at this location.
      await setRoleAtLocation(contactId, input.locationId, input.roleId);
    },

    /** Renames a contact and, when `roleId` is given, replaces their role at this location. */
    async updateUser(input: UpdateUserInput): Promise<void> {
      const data = await adminRequest<{ companyContactUpdate: { userErrors: BusinessUserError[] } }>(
        config,
        CONTACT_UPDATE_MUTATION,
        {
          companyContactId: input.contactId,
          input: { firstName: input.firstName.trim(), lastName: input.lastName.trim() },
        },
      );
      assertNoErrors(data.companyContactUpdate.userErrors, "Couldn't update the user");
      if (input.roleId) await setRoleAtLocation(input.contactId, input.locationId, input.roleId);
    },

    /**
     * Archives a user: revokes their roles at this location so they can't order for it, while
     * leaving them a contact of the company so the row stays visible and reactivatable. The
     * customer record and their order history are untouched.
     */
    async archiveUser(locationId: string, contactId: string): Promise<void> {
      const contact = await contactRoleAssignments(contactId);
      const here = contact.roleAssignments.nodes.filter((ra) => ra.companyLocation.id === locationId);
      if (here.length === 0) return; // already archived
      await revokeRoles(contactId, here.map((ra) => ra.id));
    },

    /** Restores an archived user's access by granting them a role at this location again. */
    async reactivateUser(locationId: string, contactId: string, roleId: string): Promise<void> {
      await setRoleAtLocation(contactId, locationId, roleId);
    },
  };
}

export type CompanyAdmin = ReturnType<typeof createCompanyAdmin>;
