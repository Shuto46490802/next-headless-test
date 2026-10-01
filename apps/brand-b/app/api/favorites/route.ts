import { NextRequest, NextResponse } from "next/server";
import { ShoppingListError } from "@repo/customer-data";
import { getSession } from "../../../lib/session";
import { setFavourite } from "../../../lib/favorites";

/** Heart button: adds to or removes from the club's "Favourites" shopping list. */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const productId = body?.productId;
  const action = body?.action;
  if (typeof productId !== "string" || (action !== "add" && action !== "remove")) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const favourites = await setFavourite([productId], action);
    return NextResponse.json({ favourites });
  } catch (err) {
    console.error("Favourite toggle failed", err);
    const message = err instanceof ShoppingListError ? err.message : "Couldn't update favourites";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
