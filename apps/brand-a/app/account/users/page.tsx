import { EmptyState, PartnerUsers } from "@repo/ui";
import { getPartnerLocation } from "../../../lib/partner";
import { companyAdmin } from "../../../lib/shopify";
import { addUserAction, archiveUserAction, reactivateUserAction, updateUserAction } from "./actions";

function Unavailable({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-neutral-900">Users</h1>
      <EmptyState title={title} description={description} />
    </div>
  );
}

export default async function UsersPage() {
  const location = await getPartnerLocation();
  if (!location) {
    return (
      <Unavailable
        title="No company access"
        description="Your account isn't linked to a company, so there are no users to show."
      />
    );
  }

  if (!companyAdmin) {
    return (
      <Unavailable
        title="User management unavailable"
        description="This site isn't configured with Admin API access yet. Contact your account manager to manage users."
      />
    );
  }

  const data = await companyAdmin.getLocationUsers(location.locationId);
  if (!data) {
    return (
      <Unavailable
        title="Company not found"
        description="We couldn't load this company from Shopify. Please try again shortly."
      />
    );
  }

  return (
    <PartnerUsers
      company={data.company}
      locationId={data.locationId}
      users={data.users}
      roles={data.roles}
      defaultRoleId={data.defaultRoleId}
      selfContactId={location.contactId}
      canManage={location.isAdmin}
      actions={{
        add: addUserAction,
        update: updateUserAction,
        archive: archiveUserAction,
        reactivate: reactivateUserAction,
      }}
    />
  );
}
