import { NextResponse, type NextRequest } from "next/server";
import { storefront } from "../../../../lib/shopify";
import { getBuyer } from "../../../../lib/listing";

/**
 * Header search overlay data: Storefront predictiveSearch (suggestions, collections, products)
 * plus the full match count from `search`, so the overlay can say "N matches".
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) return NextResponse.json({ queries: [], collections: [], products: [], total: 0 });
  try {
    const buyer = await getBuyer();
    const [results, total] = await Promise.all([storefront.predictiveSearch(q, buyer), storefront.countSearchResults(q, buyer).catch(() => null)]);
    // Buyer-contextualised prices are personal: never let a shared cache serve them to someone else.
    const cache = buyer ? "private, no-store" : "public, max-age=60, stale-while-revalidate=300";
    return NextResponse.json({ ...results, total }, { headers: { "Cache-Control": cache } });
  } catch (err) {
    console.error("predictive search failed", err);
    return NextResponse.json({ queries: [], collections: [], products: [], total: null }, { status: 502 });
  }
}
