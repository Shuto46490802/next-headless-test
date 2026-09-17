"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "./Button";
import { FieldGroup, FormField } from "./FormField";

/** Shape returned by the server actions behind the partner Users page. */
export type UserActionState = { ok: true; message?: string } | { ok: false; message: string } | null;

export type UserAction = (prev: UserActionState, formData: FormData) => Promise<UserActionState>;

export interface AddUserFormProps {
  action: UserAction;
  locationId: string;
  roles: { id: string; name: string }[];
  defaultRoleId?: string;
}

export function AddUserForm({ action, locationId, roles, defaultRoleId }: AddUserFormProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex max-w-lg flex-col gap-4">
      <input type="hidden" name="locationId" value={locationId} />
      <FieldGroup>
        <FormField name="firstName" label="First name" required autoComplete="off" />
        <FormField name="lastName" label="Last name" required autoComplete="off" />
      </FieldGroup>
      <FormField name="email" label="Email address" type="email" required autoComplete="off" />
      <label className="flex flex-col gap-1.5 text-sm" htmlFor="roleId">
        <span className="font-medium text-neutral-700">Role</span>
        <select
          id="roleId"
          name="roleId"
          defaultValue={defaultRoleId ?? roles[0]?.id}
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
      {state?.ok && state.message ? <p className="text-sm text-emerald-700">{state.message}</p> : null}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Adding…" : "Add user"}
      </Button>
    </form>
  );
}

export interface RemoveUserButtonProps {
  action: UserAction;
  locationId: string;
  contactId: string;
  userLabel: string;
}

export function RemoveUserButton({ action, locationId, contactId, userLabel }: RemoveUserButtonProps) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(`Remove ${userLabel} from this location? Their past orders will stay visible.`)) {
          e.preventDefault();
        }
      }}
      className="flex flex-col items-end gap-1"
    >
      <input type="hidden" name="locationId" value={locationId} />
      <input type="hidden" name="contactId" value={contactId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:border-red-300 hover:bg-red-50 disabled:opacity-50"
      >
        {pending ? "Removing…" : "Remove"}
      </button>
      {state && !state.ok ? (
        <span role="alert" className="max-w-[16rem] text-right text-xs text-red-600">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
