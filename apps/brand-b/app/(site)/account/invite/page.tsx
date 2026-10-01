import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InviteClub } from "@repo/ui";
import { brand, siteMembership } from "../../../../lib/brand";
import { fullName, getAccountOverview } from "../../../../lib/account";

export const metadata: Metadata = { title: "Invite a club" };

const PREVIEW = `You have been referred to register a ${"{site}"} account by {inviter}.

{site} is where community sporting clubs can:
· Buy beverages from the Asahi Beverages portfolio (beer, cider, RTD, soft drink, sports drink) in one place, at a great price.
· Have it delivered free, directly to the club, on the day and time window you choose.
· Earn credit on every case purchased, to use on your next order.

There are no sign-up fees, contracts, exclusivity or volume commitments.

When registering, use the invite code below and you'll both receive a bonus once your first order ships.

Invite code: {code}`;

/** Figma "Invite a club" (Club Connect only). */
export default async function InvitePage() {
  if (siteMembership !== "CC") notFound();
  const account = await getAccountOverview();
  const inviter = account?.company?.name ?? fullName(account) ?? "a fellow club";
  return (
    <InviteClub
      siteName={brand.name}
      inviterName={inviter}
      code={account?.company?.referralCode ?? null}
      previewTemplate={PREVIEW.replaceAll("{site}", brand.name)}
      invitations={null}
    />
  );
}
