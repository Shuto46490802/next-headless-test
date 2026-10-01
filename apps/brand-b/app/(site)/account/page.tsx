import type { Metadata } from "next";
import { AccountButton, AccountCard, CreditSummary, MetricTile, OrdersTable, ShoppingListCard, UserPreviewRows, orderStatus, shortDate } from "@repo/ui";
import { getValidAccessToken, requireSession } from "../../../lib/session";
import { companyAdmin, customerAccount, shoppingLists } from "../../../lib/shopify";
import { getListOwner } from "../../../lib/lists";
import { summariseLists } from "../../../lib/list-summaries";
import { SHOW_CREDIT } from "../../../lib/listing";
import { addListToCartAction } from "../../list-actions";
import { ACCOUNT_COPY, getAccountOverview } from "../../../lib/account";
import { reorderOrder } from "../../account-actions";

export const metadata: Metadata = { title: "My account" };

/** Figma "My Account — Dashboard": credit summary, open orders, recent orders and the users list. */
export default async function AccountDashboard() {
  const session = await requireSession();
  const token = await getValidAccessToken(session);
  const account = await getAccountOverview();
  const company = account?.company ?? null;

  const { ownerId } = await getListOwner();
  const [ordersResult, usersResult, lists] = await Promise.all([
    customerAccount.listAccountOrders(token, { scope: "company", locationId: company?.location?.id, first: 10 }).catch(() => null),
    company?.location && companyAdmin ? companyAdmin.getLocationUsers(company.location.id).catch(() => null) : null,
    shoppingLists.getLists(ownerId).then((l) => summariseLists(l.slice(0, 2))).catch(() => []),
  ]);
  const orders = ordersResult?.orders ?? [];
  const open = orders.filter((o) => {
    const s = orderStatus(o).step;
    return s >= 0 && s < 4;
  });

  return (
    <div className="flex flex-col gap-8">
      {company ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_1fr]">
          <CreditSummary
            label={ACCOUNT_COPY.creditLabel}
            balance={company.creditBalance}
            rows={[
              { label: "Pending from open orders", value: company.creditPending },
              { label: "Donated by partners", value: company.creditDonated },
            ]}
            ledgerHref="/account/credit"
          />
          <MetricTile label="Open orders" value={String(open.length)} note={open[0] ? `Latest placed ${shortDate(open[0].processedAt)}` : null} />
        </div>
      ) : null}

      <AccountCard title="Recent orders" action={<AccountButton href="/account/orders">All orders</AccountButton>}>
        <OrdersTable orders={orders.slice(0, 3)} onReorder={reorderOrder} />
      </AccountCard>

      <div className="grid gap-6 lg:grid-cols-2">
      <AccountCard title="Shopping lists" action={<AccountButton href="/account/lists">Manage lists</AccountButton>}>
        {lists.length ? lists.map((l) => <ShoppingListCard key={l.id} list={l} onAddAll={addListToCartAction} showCredit={SHOW_CREDIT} />) : <p className="text-sm text-neutral-500">No lists yet.</p>}
      </AccountCard>
      {usersResult ? (
        <AccountCard title={`${ACCOUNT_COPY.org} users`} action={<AccountButton href="/account/users">Manage users</AccountButton>}>
          <UserPreviewRows
            users={usersResult.users.slice(0, 4).map((u) => ({
              id: u.contactId,
              name: u.status === "invited" ? "Invite pending" : [u.firstName, u.lastName].filter(Boolean).join(" ") || (u.email ?? ""),
              email: u.email,
              role: u.roleName,
              muted: u.status !== "active",
            }))}
          />
        </AccountCard>
      ) : null}
      </div>
    </div>
  );
}
