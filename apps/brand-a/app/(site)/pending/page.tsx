import type { Metadata } from "next";
import { SignupPending } from "@repo/ui";
import { requireSession } from "../../../lib/session";
import { getAccountOverview } from "../../../lib/account";
import { IS_CC, SIGNUP_CONTACT } from "../../../lib/signup";

export const metadata: Metadata = { title: "Account under review", robots: { index: false } };

/**
 * "We are reviewing your request": shown while the company's Account status is pending (or
 * rejected). The middleware re-checks the status every 30 seconds, so a reload after Asahi
 * approves takes the customer straight into the site.
 */
export default async function PendingPage() {
  const session = await requireSession();
  const account = await getAccountOverview();
  const org = IS_CC ? "club" : "business";
  const rejected = session.access?.state === "rejected";
  return (
    <SignupPending
      state={rejected ? "rejected" : "pending"}
      title={rejected ? "We couldn't approve your request" : "We are reviewing your request"}
      body={
        rejected ? (
          <p>We weren&apos;t able to approve this {org} account. If you think this is a mistake, please get in touch.</p>
        ) : (
          <p>
            Thanks for registering. Our team checks every {org} before the account goes live, usually within two business days. We&apos;ll email
            {session.email ? <> <strong>{session.email}</strong></> : " you"} as soon as it&apos;s approved.
          </p>
        )
      }
      details={account?.company ? [{ label: IS_CC ? "Club" : "Business", value: account.company.name }, ...(account.company.location ? [{ label: "Delivery site", value: account.company.location.name }] : [])] : undefined}
      contactHref={SIGNUP_CONTACT}
    />
  );
}
