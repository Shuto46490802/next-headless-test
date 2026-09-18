"use client";

import { useActionState, useEffect, useState } from "react";

/** Shape returned by the server actions behind the partner Users page. */
export type UserActionState = { ok: true; message?: string } | { ok: false; message: string } | null;

export type UserAction = (prev: UserActionState, formData: FormData) => Promise<UserActionState>;

export interface PartnerUserRow {
  contactId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  roleId: string | null;
  roleName: string | null;
  isMainContact: boolean;
  status: "active" | "invited" | "deactivated";
}

export interface PartnerCompany {
  name: string;
  accountNumber: string | null;
  abn: string | null;
  licensed: boolean;
}

export interface PartnerUsersProps {
  company: PartnerCompany;
  locationId: string;
  users: PartnerUserRow[];
  roles: { id: string; name: string }[];
  /** Role pre-selected when adding, and granted on reactivate. */
  defaultRoleId: string | null;
  /** The signed-in customer's own contact id — they can't archive themselves. */
  selfContactId: string;
  /** Location admins get Add / Edit / Archive; everyone else sees the table read-only. */
  canManage: boolean;
  actions: {
    add: UserAction;
    update: UserAction;
    archive: UserAction;
    reactivate: UserAction;
  };
}

const STATUS_BADGE = {
  active: { label: "Registered", className: "bg-emerald-100 text-emerald-800" },
  invited: { label: "Pending", className: "bg-amber-100 text-amber-800" },
  deactivated: { label: "Deactive", className: "bg-neutral-200 text-neutral-600" },
} as const;

function displayName(user: PartnerUserRow): string {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || (user.email ?? "—");
}

export function PartnerUsers({
  company,
  locationId,
  users,
  roles,
  defaultRoleId,
  selfContactId,
  canManage,
  actions,
}: PartnerUsersProps) {
  const [dialog, setDialog] = useState<{ mode: "add" } | { mode: "edit"; user: PartnerUserRow } | null>(null);

  const counts = {
    active: users.filter((u) => u.status === "active").length,
    invited: users.filter((u) => u.status === "invited").length,
    deactivated: users.filter((u) => u.status === "deactivated").length,
  };

  return (
    <div className="flex flex-col">
      <header className="flex flex-col gap-4 bg-neutral-100 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">{company.name}</h1>
            {company.licensed ? (
              <span className="rounded-sm bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
                Licensed
              </span>
            ) : null}
          </div>
          {company.accountNumber || company.abn ? (
            <p className="text-[11px] uppercase tracking-wide text-neutral-500">
              {[company.accountNumber ? `Account ${company.accountNumber}` : null, company.abn ? `ABN ${company.abn}` : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
        </div>
        {canManage ? (
          <button
            type="button"
            onClick={() => setDialog({ mode: "add" })}
            className="self-start rounded-sm bg-neutral-900 px-6 py-3 text-xs font-bold uppercase tracking-wide text-white hover:bg-neutral-800 sm:self-auto"
          >
            Add New User
          </button>
        ) : null}
      </header>

      <h2 className="mt-10 text-2xl font-bold tracking-tight text-neutral-900">Users</h2>
      <p className="mt-2 text-[11px] uppercase tracking-wide text-neutral-500">
        {counts.active} Active · {counts.invited} Invited · {counts.deactivated} Deactivated
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-300">
              <th className="pb-3 pr-4 font-bold text-neutral-900">Name</th>
              <th className="pb-3 pr-4 font-bold text-neutral-900">Email Address</th>
              <th className="pb-3 pr-4 font-bold text-neutral-900">Status</th>
              <th className="pb-3 pr-4 font-bold text-neutral-900">Role</th>
              {canManage ? <th className="pb-3 font-bold text-neutral-900">Action</th> : null}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 5 : 4} className="py-10 text-center text-neutral-500">
                  No users yet. People you add will appear here.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <UserRow
                  key={user.contactId}
                  user={user}
                  locationId={locationId}
                  canManage={canManage}
                  isSelf={user.contactId === selfContactId}
                  defaultRoleId={defaultRoleId}
                  actions={actions}
                  onEdit={() => setDialog({ mode: "edit", user })}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm text-neutral-500">
        Deactivated users keep their order history. Their past orders stay visible under Orders, attributed to their name.
      </p>

      {dialog ? (
        <UserDialog
          key={dialog.mode === "edit" ? dialog.user.contactId : "add"}
          mode={dialog.mode}
          user={dialog.mode === "edit" ? dialog.user : null}
          locationId={locationId}
          roles={roles}
          defaultRoleId={defaultRoleId}
          action={dialog.mode === "add" ? actions.add : actions.update}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </div>
  );
}

function UserRow({
  user,
  locationId,
  canManage,
  isSelf,
  defaultRoleId,
  actions,
  onEdit,
}: {
  user: PartnerUserRow;
  locationId: string;
  canManage: boolean;
  isSelf: boolean;
  defaultRoleId: string | null;
  actions: PartnerUsersProps["actions"];
  onEdit: () => void;
}) {
  const archived = user.status === "deactivated";
  const [state, formAction, pending] = useActionState(archived ? actions.reactivate : actions.archive, null);
  const badge = STATUS_BADGE[user.status];
  const muted = archived ? "text-neutral-400" : "text-neutral-900";

  return (
    <tr className="border-b border-neutral-200 align-middle">
      <td className={`py-4 pr-4 ${muted}`}>
        {displayName(user)}
        {isSelf ? <span className="ml-2 text-xs text-neutral-500">(you)</span> : null}
        {user.isMainContact ? <span className="ml-2 text-xs text-neutral-500">Main contact</span> : null}
      </td>
      <td className={`py-4 pr-4 ${archived ? "text-neutral-400" : "text-neutral-700"}`}>{user.email ?? "—"}</td>
      <td className="py-4 pr-4">
        <span className={`inline-block min-w-[7rem] rounded-sm px-3 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide ${badge.className}`}>
          {badge.label}
        </span>
      </td>
      <td className={`py-4 pr-4 ${archived ? "text-neutral-400" : "text-neutral-700"}`}>{user.roleName ?? "—"}</td>
      {canManage ? (
        <td className="py-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-sm bg-neutral-100 px-4 py-2 text-xs font-medium text-neutral-900 hover:bg-neutral-200"
            >
              Edit User
            </button>
            {isSelf ? null : (
              <form action={formAction}>
                <input type="hidden" name="locationId" value={locationId} />
                <input type="hidden" name="contactId" value={user.contactId} />
                {archived ? <input type="hidden" name="roleId" value={user.roleId ?? defaultRoleId ?? ""} /> : null}
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-sm border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-900 hover:border-neutral-400 disabled:opacity-50"
                >
                  {pending ? "Saving…" : archived ? "Reactivate User" : "Archive User"}
                </button>
              </form>
            )}
          </div>
          {state && !state.ok ? (
            <p role="alert" className="mt-1 max-w-[18rem] text-xs text-red-600">
              {state.message}
            </p>
          ) : null}
        </td>
      ) : null}
    </tr>
  );
}

function UserDialog({
  mode,
  user,
  locationId,
  roles,
  defaultRoleId,
  action,
  onClose,
}: {
  mode: "add" | "edit";
  user: PartnerUserRow | null;
  locationId: string;
  roles: { id: string; name: string }[];
  defaultRoleId: string | null;
  action: UserAction;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-neutral-900">{mode === "add" ? "Add new user" : "Edit user"}</h3>
        <p className="mt-1 text-sm text-neutral-500">
          {mode === "add"
            ? "They'll be able to sign in with their email address and order for your company."
            : "Email addresses can't be changed here — archive the user and add them again instead."}
        </p>

        <form action={formAction} className="mt-5 flex flex-col gap-4">
          <input type="hidden" name="locationId" value={locationId} />
          {user ? <input type="hidden" name="contactId" value={user.contactId} /> : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field name="firstName" label="First name" defaultValue={user?.firstName ?? ""} required />
            <Field name="lastName" label="Last name" defaultValue={user?.lastName ?? ""} required />
          </div>

          {mode === "add" ? (
            <Field name="email" label="Email address" type="email" required />
          ) : (
            <Field name="emailDisplay" label="Email address" defaultValue={user?.email ?? ""} disabled />
          )}

          <label className="flex flex-col gap-1.5 text-sm" htmlFor="roleId">
            <span className="font-medium text-neutral-700">Role</span>
            <select
              id="roleId"
              name="roleId"
              defaultValue={user?.roleId ?? defaultRoleId ?? roles[0]?.id}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>

          {state && !state.ok ? (
            <p role="alert" className="text-sm text-red-600">
              {state.message}
            </p>
          ) : null}

          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-sm border border-neutral-300 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-neutral-700 hover:border-neutral-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-sm bg-neutral-900 px-6 py-2.5 text-xs font-bold uppercase tracking-wide text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {pending ? "Saving…" : mode === "add" ? "Add User" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
  type = "text",
  required = false,
  disabled = false,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm" htmlFor={name}>
      <span className="font-medium text-neutral-700">{label}</span>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        disabled={disabled}
        autoComplete="off"
        className="rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand disabled:bg-neutral-100 disabled:text-neutral-500"
      />
    </label>
  );
}
