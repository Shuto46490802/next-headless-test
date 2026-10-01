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
