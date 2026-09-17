import type { ReactNode } from "react";
import { AccountNav } from "@repo/ui";
import { getValidAccessToken, requireSession } from "../../lib/session";
import { customerAccount } from "../../lib/shopify";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();

  // Partner-only nav entries appear only for customers who belong to a company location.
  let isPartner = false;
  try {
    const accessToken = await getValidAccessToken(session);
    isPartner = (await customerAccount.getCompanyAccess(accessToken)).length > 0;
  } catch {
    // Non-fatal: the nav just omits the partner links.
  }

  return (
    <section className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-12 sm:px-6 md:grid-cols-[200px_1fr]">
      <AccountNav links={isPartner ? [{ href: "/account/users", label: "Users" }] : []} />
      <div>{children}</div>
    </section>
  );
}
