import type { Metadata } from "next";
import { AccountDetailsForm } from "@repo/ui";
import { ACCOUNT_COPY, getAccountOverview } from "../../../../lib/account";
import { updateAccountDetails } from "../../../account-actions";

export const metadata: Metadata = { title: "Account details" };

export default async function AccountDetailsPage() {
  const account = await getAccountOverview();
  return (
    <AccountDetailsForm
      clubLabel={ACCOUNT_COPY.org}
      values={{
        firstName: account?.firstName ?? "",
        lastName: account?.lastName ?? "",
        club: account?.company?.name ?? null,
        phone: account?.phone ?? null,
        email: account?.email ?? null,
        role: account?.title ?? null,
      }}
      action={updateAccountDetails}
    />
  );
}
