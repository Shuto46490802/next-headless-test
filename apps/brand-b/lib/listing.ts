import { PAGE_SIZE } from "@repo/ui";
import { SORT_OPTIONS, parseFilterParams, type SortValue } from "@repo/shopify-storefront";
import { siteMembership } from "./brand";

/** Club Connect shows the "Earns $X credit" lines; Partner Connect hides them. */
export const SHOW_CREDIT = siteMembership === "CC";

export type ListingSearchParams = Record<string, string | string[] | undefined>;

const all = (v: string | string[] | undefined) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const one = (v: string | string[] | undefined) => all(v)[0];

/** Reads the URL listing state written by the UI's useListingParams (filter, sort, count, q). */
export function readListingParams(sp: ListingSearchParams) {
  const rawSort = one(sp.sort);
  const sort: SortValue = SORT_OPTIONS.some((o) => o.value === rawSort) ? (rawSort as SortValue) : "recommended";
  const count = Number(one(sp.count));
  const first = Number.isFinite(count) && count > 0 ? Math.min(Math.ceil(count / PAGE_SIZE) * PAGE_SIZE, 240) : PAGE_SIZE;
  return { filters: parseFilterParams(all(sp.filter)), sort, first, q: (one(sp.q) ?? "").trim() };
}
