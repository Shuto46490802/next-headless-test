import { NextResponse, type NextRequest } from "next/server";
import { storefront } from "../../../../lib/shopify";

/**
 * Header search overlay data: Storefront predictiveSearch (suggestions, collections, products)
 * plus the full match count from `search`, so the overlay can say "N matches".
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) return NextResponse.json({ queries: [], collections: [], products: [], total: 0 });
  try {
    const [results, total] = await Promise.all([storefront.predictiveSearch(q), storefront.countSearchResults(q).catch(() => null)]);
    return NextResponse.json({ ...results, total }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch (err) {
    console.error("predictive search failed", err);
    return NextResponse.json({ queries: [], collections: [], products: [], total: null }, { status: 502 });
  }
}
