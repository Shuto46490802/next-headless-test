import type { ReactNode } from "react";
import { AccountShell, Breadcrumb } from "@repo/ui";
import { requireSession } from "../../../lib/session";
import { ACCOUNT_GROUPS, fullName, getAccountOverview } from "../../../lib/account";

/** Figma "My Account" chrome around every account page. */
export default async function AccountLayout({ children }: { children: ReactNode }) {
  await requireSession();
  const account = await getAccountOverview();
  const eyebrow = [account?.company?.name, account?.title].filter(Boolean).join(" · ") || null;
  return (
    <>
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "My account", href: "/account" }]} />
      <AccountShell eyebrow={eyebrow} signedInAs={fullName(account)} groups={ACCOUNT_GROUPS}>
        {children}
      </AccountShell>
    </>
  );
}
