import type { Metadata } from "next";
import { SignupPending } from "@repo/ui";
import { requireSession } from "../../../lib/session";
import { SIGNUP_CONTACT } from "../../../lib/signup";

export const metadata: Metadata = { title: "Checking your details", robots: { index: false } };

/** "We are checking your details": Account status pending (staff not yet confirmed) or rejected. */
export default async function PendingPage() {
  const session = await requireSession();
  const rejected = session.access?.state === "rejected";
  return (
    <SignupPending
      state={rejected ? "rejected" : "pending"}
      title={rejected ? "We couldn't approve your account" : "We are checking your details"}
      body={
        rejected ? (
          <p>We weren&apos;t able to approve this Drinks Cart account. If you think this is a mistake, please get in touch.</p>
        ) : (
          <p>
            Thanks for signing up. We&apos;re confirming you against the Asahi employee list. We&apos;ll email
            {session.email ? <> <strong>{session.email}</strong></> : " you"} as soon as you can start shopping.
          </p>
        )
      }
      contactHref={SIGNUP_CONTACT}
    />
  );
}
