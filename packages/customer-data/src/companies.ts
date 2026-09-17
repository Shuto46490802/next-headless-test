import { adminRequest, setMetafield, SITE_MEMBERSHIP_METAFIELD, type AdminApiConfig } from "./admin";
import { isSiteMembership, type CompanyRole, type LocationUser, type LocationUsersResult, type SiteMembership } from "./types";

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

const LOCATION_USERS_QUERY = /* GraphQL */ `
  query LocationUsers($locationId: ID!) {
    companyLocation(id: $locationId) {
      id
      name
      company {
        id
        name
        contactRoles(first: 10) {
          nodes {
            id
            name
          }
        }
      }
      roleAssignments(first: 100) {
        nodes {
          id
          role {
            id
            name
          }
          companyContact {
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

const REMOVE_FROM_COMPANY_MUTATION = /* GraphQL */ `
  mutation CompanyContactRemoveFromCompany($contactId: ID!) {
    companyContactRemoveFromCompany(companyContactId: $contactId) {
      removedCompanyContactId
      userErrors {
        field
        message
        code
      }
    }
  }
`;

interface RawRoleAssignment {
  id: string;
  role: CompanyRole;
  companyContact: {
    id: string;
    isMainContact: boolean;
    customer: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      defaultEmailAddress: { emailAddress: string | null } | null;
      state: "DECLINED" | "DISABLED" | "ENABLED" | "INVITED";
    };
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

  return {
    async getLocationUsers(locationId: string): Promise<LocationUsersResult | null> {
      const data = await adminRequest<{
        companyLocation: {
          id: string;
          name: string;
          company: { id: string; name: string; contactRoles: { nodes: CompanyRole[] } };
          roleAssignments: { nodes: RawRoleAssignment[] };
        } | null;
      }>(config, LOCATION_USERS_QUERY, { locationId });
      const loc = data.companyLocation;
      if (!loc) return null;

      const users: LocationUser[] = loc.roleAssignments.nodes.map((ra) => ({
        contactId: ra.companyContact.id,
        customerId: ra.companyContact.customer.id,
        firstName: ra.companyContact.customer.firstName,
        lastName: ra.companyContact.customer.lastName,
        email: ra.companyContact.customer.defaultEmailAddress?.emailAddress ?? null,
        roleName: ra.role.name,
        roleAssignmentId: ra.id,
        isMainContact: ra.companyContact.isMainContact,
        status: ra.companyContact.customer.state === "ENABLED" ? "active" : "pending",
      }));
      users.sort((a, b) => (a.lastName ?? "").localeCompare(b.lastName ?? "") || (a.email ?? "").localeCompare(b.email ?? ""));

      return {
        locationId: loc.id,
        locationName: loc.name,
        companyId: loc.company.id,
        companyName: loc.company.name,
        roles: loc.company.contactRoles.nodes,
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
      const existing = found.customers.nodes.find((c) => c.defaultEmailAddress?.emailAddress?.toLowerCase() === email) ?? null;

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
            companyAssignCustomerAsContact: { companyContact: { id: string } | null; userErrors: BusinessUserError[] };
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

      // 2. Exactly one role at this location: drop any existing assignment there, then assign.
      const contact = await contactRoleAssignments(contactId);
      const atLocation = contact.roleAssignments.nodes
        .filter((ra) => ra.companyLocation.id === input.locationId)
        .map((ra) => ra.id);
      await revokeRoles(contactId, atLocation);

      const assigned = await adminRequest<{
        companyContactAssignRole: { userErrors: BusinessUserError[] };
      }>(config, ASSIGN_ROLE_MUTATION, {
        contactId,
        roleId: input.roleId,
        locationId: input.locationId,
      });
      assertNoErrors(assigned.companyContactAssignRole.userErrors, "Couldn't assign the role");
    },

    /**
     * Removes a contact's access to one location. If that was their only location and they
     * aren't the company's main contact, the contact is removed from the company too. The
     * underlying customer (and their order history) is never deleted.
     */
    async removeUserFromLocation(locationId: string, contactId: string): Promise<void> {
      const contact = await contactRoleAssignments(contactId);
      const atLocation = contact.roleAssignments.nodes.filter((ra) => ra.companyLocation.id === locationId);
      const elsewhere = contact.roleAssignments.nodes.length - atLocation.length;

      await revokeRoles(contactId, atLocation.map((ra) => ra.id));

      if (elsewhere === 0 && !contact.isMainContact) {
        const data = await adminRequest<{
          companyContactRemoveFromCompany: { userErrors: BusinessUserError[] };
        }>(config, REMOVE_FROM_COMPANY_MUTATION, { contactId });
        assertNoErrors(data.companyContactRemoveFromCompany.userErrors, "Couldn't remove the user");
      }
    },
  };
}

export type CompanyAdmin = ReturnType<typeof createCompanyAdmin>;
