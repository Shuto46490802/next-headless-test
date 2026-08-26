import { NextRequest, NextResponse } from "next/server";
import { getSession } from "../../../lib/session";
import { customerData } from "../../../lib/shopify";

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

  const current = await customerData.getFavourites(session.customerId);
  const next =
    action === "add"
      ? Array.from(new Set([...current, productId]))
      : current.filter((id) => id !== productId);

  await customerData.setFavourites(session.customerId, next);
  return NextResponse.json({ favourites: next });
}
