import type { Metadata } from "next";
import Link from "next/link";
import { AccountCard, EmptyState } from "@repo/ui";
import { ACCOUNT_COPY, getAccountOverview } from "../../../../lib/account";

export const metadata: Metadata = { title: `${ACCOUNT_COPY.org} details` };

const STATUS: Record<string, string> = { pending: "Under review", approved: "Approved", rejected: "Not approved" };

/** Club / business record from Shopify (company, location, account number, approval status). */
export default async function ClubDetailsPage() {
  const company = (await getAccountOverview())?.company;
  if (!company) return <EmptyState title={`No ${ACCOUNT_COPY.org.toLowerCase()} linked`} description="Your account isn't linked to a company yet." />;
  const rows: [string, string | null][] = [
    [`${ACCOUNT_COPY.org} name`, company.name],
    ["Account number", company.accountNumber],
    ["Location", company.location?.name ?? null],
    ["Account status", company.accountStatus ? (STATUS[company.accountStatus] ?? company.accountStatus) : null],
    ...(company.referralCode ? ([["Invite code", company.referralCode]] as [string, string][]) : []),
  ];
  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-heading text-3xl font-bold text-brand">{ACCOUNT_COPY.org} details</h2>
      <AccountCard>
        <dl className="grid gap-x-12 sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-6 border-b border-neutral-200 py-3">
              <dt className="text-sm uppercase text-neutral-500">{k}</dt>
              <dd className="text-right text-base font-medium text-neutral-900">{v ?? "—"}</dd>
            </div>
          ))}
        </dl>
      </AccountCard>
      <p className="text-sm text-neutral-600">
        To change these details, contact the {ACCOUNT_COPY.team}. Manage delivery addresses on the <Link href="/account/addresses" className="text-brand underline">Addresses</Link> page.
      </p>
    </div>
  );
}
