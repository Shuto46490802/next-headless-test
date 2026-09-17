import Link from "next/link";
import { AddUserForm, EmptyState, RemoveUserButton, StatusBadge } from "@repo/ui";
import { getPartnerLocations, pickLocation } from "../../../lib/partner";
import { companyAdmin } from "../../../lib/shopify";
import { addUserAction, removeUserAction } from "./actions";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string }>;
}) {
  const { location: requested } = await searchParams;
  const locations = await getPartnerLocations();
  const current = pickLocation(locations, requested);

  if (!current) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Users</h1>
        <EmptyState
          title="No company access"
          description="Your account isn't linked to a company location, so there are no users to show."
        />
      </div>
    );
  }

  if (!companyAdmin) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Users</h1>
        <EmptyState
          title="User management unavailable"
          description="This site isn't configured with Admin API access yet. Contact your account manager to manage users."
        />
      </div>
    );
  }

  const data = await companyAdmin.getLocationUsers(current.locationId);
  const users = data?.users ?? [];
  const roles = data?.roles ?? [];
  const active = users.filter((u) => u.status === "active").length;
  const pending = users.length - active;
  const defaultRole = roles.find((r) => !r.name.toLowerCase().includes("admin")) ?? roles[0];

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4 rounded-2xl bg-neutral-100 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-neutral-500">{current.companyName}</span>
          <h1 className="text-2xl font-semibold text-neutral-900">{data?.locationName ?? current.locationName}</h1>
          <span className="text-sm text-neutral-500">
            You are {current.isAdmin ? "a location admin" : `signed in with ${current.roleName ?? "ordering"} access`}
          </span>
        </div>
        {locations.length > 1 ? (
          <div className="flex flex-wrap gap-2">
            {locations.map((loc) => (
              <Link
                key={loc.locationId}
                href={`/account/users?location=${encodeURIComponent(loc.locationId)}`}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  loc.locationId === current.locationId
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 text-neutral-700 hover:border-neutral-500"
                }`}
              >
                {loc.locationName}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      <div>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-lg font-medium text-neutral-900">Users</h2>
          <span className="text-xs uppercase tracking-wide text-neutral-500">
            {active} active · {pending} pending
          </span>
        </div>

        {users.length === 0 ? (
          <EmptyState title="No users yet" description="People added to this location will appear here." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-neutral-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  {current.isAdmin ? <th className="px-4 py-3 text-right font-medium">Action</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {users.map((user) => {
                  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "—";
                  const isSelf = user.contactId === current.contactId;
                  return (
                    <tr key={user.roleAssignmentId} className="align-middle">
                      <td className="px-4 py-3 font-medium text-neutral-900">
                        {name}
                        {isSelf ? <span className="ml-2 text-xs font-normal text-neutral-500">(you)</span> : null}
                        {user.isMainContact ? (
                          <span className="ml-2 text-xs font-normal text-neutral-500">Main contact</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-neutral-700">{user.email ?? "—"}</td>
                      <td className="px-4 py-3">
                        {user.status === "active" ? (
                          <StatusBadge tone="success">Registered</StatusBadge>
                        ) : (
                          <StatusBadge tone="warning">Pending</StatusBadge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-700">{user.roleName}</td>
                      {current.isAdmin ? (
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            {isSelf ? null : (
                              <RemoveUserButton
                                action={removeUserAction}
                                locationId={current.locationId}
                                contactId={user.contactId}
                                userLabel={name === "—" ? (user.email ?? "this user") : name}
                              />
                            )}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-neutral-500">
          Removed users keep their order history. Their past orders stay visible under Orders, attributed to their name.
        </p>
      </div>

      {current.isAdmin ? (
        <div>
          <h2 className="mb-1 text-lg font-medium text-neutral-900">Add new user</h2>
          <p className="mb-4 text-sm text-neutral-500">
            They&apos;ll be able to sign in with their email address and order for {data?.locationName ?? current.locationName}.
          </p>
          {roles.length === 0 ? (
            <EmptyState title="No roles available" description="This company has no contact roles configured in Shopify." />
          ) : (
            <AddUserForm
              action={addUserAction}
              locationId={current.locationId}
              roles={roles}
              defaultRoleId={defaultRole?.id}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
