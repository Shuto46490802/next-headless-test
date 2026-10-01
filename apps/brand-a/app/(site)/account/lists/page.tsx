import type { Metadata } from "next";
import { NewListForm, ShoppingListCard } from "@repo/ui";
import { shoppingLists } from "../../../../lib/shopify";
import { getListOwner } from "../../../../lib/lists";
import { summariseLists } from "../../../../lib/list-summaries";
import { SHOW_CREDIT } from "../../../../lib/listing";
import { ACCOUNT_COPY } from "../../../../lib/account";
import { addListToCartAction, createListAction } from "../../../list-actions";

export const metadata: Metadata = { title: "Shopping lists" };

/** Data mapping: Company → Shopping lists (shared by every contact; display order = stored order). */
export default async function ShoppingListsPage() {
  const { ownerId, shared } = await getListOwner();
  const lists = await summariseLists(await shoppingLists.getLists(ownerId));
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-3xl font-bold text-brand">Shopping lists</h2>
        {shared ? <p className="text-sm text-neutral-600">Lists are shared with everyone at your {ACCOUNT_COPY.org.toLowerCase()}.</p> : null}
      </div>
      <NewListForm onCreate={createListAction} />
      {lists.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">No lists yet. Create one above, or use “Add to list” on a product or a past order.</p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {lists.map((l) => (
            <ShoppingListCard key={l.id} list={l} onAddAll={addListToCartAction} showCredit={SHOW_CREDIT} />
          ))}
        </div>
      )}
    </div>
  );
}
