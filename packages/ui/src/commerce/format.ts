import { formatMoney } from "../format";
import type { MoneyData, TileProductData } from "./types";

/** Products per "Load more" step. */
export const PAGE_SIZE = 24;

/** "$2.54 per bottle": price ÷ units per case, using the container as the unit name. */
export function perUnitLabel(price: MoneyData, caseQuantity: number | null, container: string | null, style: "long" | "short" = "long"): string | null {
  if (!caseQuantity || caseQuantity <= 1) return null;
  const unit = (container ?? "unit").toLowerCase();
  const each = formatMoney({ amount: (Number(price.amount) / caseQuantity).toFixed(2), currencyCode: price.currencyCode });
  return style === "long" ? `${each} per ${unit}` : `${each} / ${unit}`;
}

export function savingLabel(price: MoneyData, compareAt: MoneyData | null): string | null {
  if (!compareAt) return null;
  const diff = Number(compareAt.amount) - Number(price.amount);
  return diff > 0 ? formatMoney({ amount: diff.toFixed(2), currencyCode: price.currencyCode }) : null;
}

/** Corner badge, in the design's priority order: Quick Sale (tag) beats Sale (compare-at), then any other badge tag. */
export function tileBadge(p: Pick<TileProductData, "badges" | "compareAtPrice">): string | null {
  if (p.badges.includes("quick-sale")) return "Quick sale";
  if (p.compareAtPrice || p.badges.includes("sale")) return "Sale";
  const other = p.badges[0];
  return other ? other.replace(/-/g, " ") : null;
}

/** Australia Post postcode ranges → state, so the postcode field can confirm the state choice. */
export function stateForPostcode(postcode: string): string | null {
  if (!/^\d{4}$/.test(postcode)) return null;
  const n = Number(postcode);
  const inRange = (ranges: [number, number][]) => ranges.some(([a, b]) => n >= a && n <= b);
  if (inRange([[2600, 2618], [2900, 2920], [200, 299]])) return "ACT";
  if (inRange([[1000, 2599], [2619, 2899], [2921, 2999]])) return "NSW";
  if (inRange([[3000, 3999], [8000, 8999]])) return "VIC";
  if (inRange([[4000, 4999], [9000, 9999]])) return "QLD";
  if (inRange([[5000, 5999]])) return "SA";
  if (inRange([[6000, 6999]])) return "WA";
  if (inRange([[7000, 7999]])) return "TAS";
  if (inRange([[800, 999]])) return "NT";
  return null;
}
