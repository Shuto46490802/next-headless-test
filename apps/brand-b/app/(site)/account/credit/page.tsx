import type { Metadata } from "next";
import { CreditSummary, EmptyState } from "@repo/ui";
import { ACCOUNT_COPY, getAccountOverview } from "../../../../lib/account";

export const metadata: Metadata = { title: "Credit history" };

/**
 * Credit history. The balance comes from the company's credit metafields; the list of movements
 * needs the backend's credit-history endpoint, which isn't connected yet.
 */
export default async function CreditHistoryPage() {
  const company = (await getAccountOverview())?.company;
  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-heading text-3xl font-bold text-brand">Credit history</h2>
      {company ? (
        <div className="lg:max-w-xl">
          <CreditSummary
            label={ACCOUNT_COPY.creditLabel}
            balance={company.creditBalance}
            rows={[
              { label: "Pending from open orders", value: company.creditPending },
              { label: "Donated by partners", value: company.creditDonated },
            ]}
          />
        </div>
      ) : null}
      <EmptyState title="No credit activity to show" description="Credit earned and redeemed on your orders will be listed here." />
    </div>
  );
}
