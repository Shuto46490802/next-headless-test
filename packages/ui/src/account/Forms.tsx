"use client";

import { useActionState, useMemo, useState } from "react";
import type { AccountFormState } from "./types";

const field = "w-full rounded border border-neutral-300 bg-white px-3 py-2.5 text-base text-neutral-900 outline-none focus:border-brand";
const readOnly = "w-full rounded border border-neutral-200 bg-neutral-100 px-3 py-2.5 text-base text-neutral-500";

function Label({ text, required, htmlFor }: { text: string; required?: boolean; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline justify-between text-sm font-bold text-neutral-900">
      {text}
      {required ? <span className="text-xs font-normal text-neutral-500">Required</span> : null}
    </label>
  );
}

/**
 * Figma "Account Details": first and last name are editable (Customer Account API
 * customerUpdate). Club, phone, email and role are shown read-only: email and phone are the
 * login identity, and the club and role come from the company record.
 */
export function AccountDetailsForm({
  values,
  action,
  clubLabel = "Club",
}: {
  values: { firstName: string; lastName: string; club: string | null; phone: string | null; email: string | null; role: string | null };
  action: (prev: AccountFormState, formData: FormData) => Promise<AccountFormState>;
  clubLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-col gap-6">
      <h2 className="font-heading text-3xl font-bold text-brand">Account details</h2>
      <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
        <div>
          <Label text="First name" required htmlFor="firstName" />
          <input id="firstName" name="firstName" required defaultValue={values.firstName} className={field} autoComplete="given-name" />
        </div>
        <div>
          <Label text="Last name" required htmlFor="lastName" />
          <input id="lastName" name="lastName" required defaultValue={values.lastName} className={field} autoComplete="family-name" />
        </div>
        <div>
          <Label text={clubLabel} htmlFor="club" />
          <input id="club" value={values.club ?? ""} readOnly className={readOnly} />
        </div>
        <div>
          <Label text="Phone number" htmlFor="phone" />
          <input id="phone" value={values.phone ?? ""} readOnly className={readOnly} />
        </div>
        <div>
          <Label text="Email address" htmlFor="email" />
          <input id="email" value={values.email ?? ""} readOnly className={readOnly} />
        </div>
        <div>
          <Label text="Role" htmlFor="role" />
          <input id="role" value={values.role ?? ""} readOnly className={readOnly} />
        </div>
      </div>
      {state ? <p role="status" className={`text-sm ${state.ok ? "text-[#1b6b3d]" : "text-red-700"}`}>{state.ok ? (state.message ?? "Saved.") : state.message}</p> : null}
      <button type="submit" disabled={pending} className="self-center rounded-full border border-brand px-10 py-3 font-heading text-lg font-bold uppercase tracking-[0.05em] text-brand hover:bg-brand hover:text-white disabled:opacity-60">
        {pending ? "Updating…" : "Update"}
      </button>
    </form>
  );
}

/**
 * Figma "Invite a club": pitch card, email field + Send invite, and the invite preview with the
 * club's own code (`custom.referral_code`). Until the backend's send-invitation endpoint exists,
 * Send invite opens the user's email app with the preview filled in. The invitations table shows
 * only when the backend supplies rows.
 */
export function InviteClub({
  siteName,
  inviterName,
  code,
  rewardLabel = "$100 in club credit",
  previewTemplate,
  invitations,
  heroImage,
}: {
  siteName: string;
  inviterName: string;
  code: string | null;
  rewardLabel?: string;
  /** `{code}` and `{inviter}` are replaced. */
  previewTemplate: string;
  invitations?: { club: string; email: string; sent: string; status: string; reward: string | null }[] | null;
  heroImage?: { url: string; altText: string | null } | null;
}) {
  const [emails, setEmails] = useState("");
  const [sent, setSent] = useState<string[] | null>(null);
  const preview = useMemo(() => previewTemplate.replaceAll("{code}", code ?? "—").replaceAll("{inviter}", inviterName), [previewTemplate, code, inviterName]);
  const list = emails.split(/[,;\s]+/).map((e) => e.trim()).filter((e) => /.+@.+\..+/.test(e));

  function send() {
    if (list.length === 0) return;
    const href = `mailto:${list.join(",")}?subject=${encodeURIComponent(`You're invited to ${siteName}`)}&body=${encodeURIComponent(preview)}`;
    window.location.href = href;
    setSent(list);
    setEmails("");
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr]">
        <div className="flex flex-col overflow-hidden rounded-2xl border border-neutral-200">
          <div className="flex flex-col gap-2 bg-brand-tint p-4 text-brand">
            <h2 className="font-heading text-2xl font-bold leading-tight">Know a club that should be here?</h2>
            <p className="text-sm">Invite another club to {siteName}. When they&apos;re approved and place their first order, you both get {rewardLabel}.</p>
          </div>
          {heroImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroImage.url} alt={heroImage.altText ?? ""} className="aspect-[4/5] w-full object-cover" />
          ) : null}
        </div>
        <div className="flex flex-col gap-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="Enter email addresses separated by commas." aria-label="Email addresses" className="h-12 flex-1 rounded border border-neutral-300 px-3 text-base outline-none focus:border-brand" />
            <button type="submit" disabled={!code || list.length === 0} className="h-12 rounded-full bg-brand px-6 font-heading text-lg font-bold uppercase tracking-[0.05em] text-white disabled:opacity-50">Send invite</button>
          </form>
          {!code ? <p className="text-sm text-amber-800">Your club&apos;s invite code isn&apos;t set up yet. Contact us to get one.</p> : null}
          <div className="flex flex-col gap-3 rounded-2xl bg-neutral-100 p-4">
            <p className="text-sm font-medium">Invite preview</p>
            <p className="whitespace-pre-line rounded bg-white p-4 text-sm text-neutral-800">{preview}</p>
          </div>
        </div>
      </div>

      {invitations && invitations.length ? (
        <section className="flex flex-col gap-4">
          <h2 className="font-heading text-3xl font-bold text-brand">Club invitations</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 font-heading text-lg text-brand">
                  <th className="py-2 pr-3">Club name</th>
                  <th className="py-2 pr-3">Email address</th>
                  <th className="py-2 pr-3">Date sent</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2">Reward</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((i, n) => (
                  <tr key={n} className="border-b border-neutral-200">
                    <td className="py-2 pr-3 font-bold">{i.club}</td>
                    <td className="py-2 pr-3">{i.email}</td>
                    <td className="py-2 pr-3">{i.sent}</td>
                    <td className="py-2 pr-3"><span className="rounded bg-neutral-100 px-2 py-1 text-xs uppercase">{i.status}</span></td>
                    <td className="py-2 font-bold">{i.reward ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {sent ? (
        <div role="status" className="rounded-2xl bg-[#e7f5ec] p-4 text-[#1b6b3d]">
          <p className="font-heading text-lg font-bold">Invite ready for {sent.join(", ")}</p>
          <p className="text-sm">Send the email from your mail app. Your reward lands after their first order ships.</p>
        </div>
      ) : null}
    </div>
  );
}
