"use client";

import { useMemo, useState, useTransition } from "react";
import { formatMoney } from "../format";
import { announceCart, type MiniCartData } from "../cart-events";
import { Button } from "./Button";

export interface AddToCartVariant {
  id: string;
  availableForSale: boolean;
  price: { amount: string; currencyCode: string };
  selectedOptions: { name: string; value: string }[];
}

export type AddToCartResult =
  | { ok: true; cart: MiniCartData; paidWithPoints?: boolean }
  | { ok: false; message: string };

export interface PointsOption {
  /** Points per unit (`mindarc_poc.points_cost`). */
  costPerUnit: number;
  /** Points the customer still has available after what's already in the cart. */
  available: number;
}

export interface AddToCartFormProps {
  options: { name: string; values: string[] }[];
  variants: AddToCartVariant[];
  /**
   * Adds the line and returns the fresh cart. The server decides whether the line is paid
   * with points (enough available points) or cash; the form only reports the outcome.
   */
  onAddToCart: (variantId: string, quantity: number) => Promise<AddToCartResult>;
  /** When set, shows the points price and whether this add will be covered by points. */
  points?: PointsOption | null;
}

export function AddToCartForm({ options, variants, onAddToCart, points = null }: AddToCartFormProps) {
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    Object.fromEntries(options.map((option) => [option.name, option.values[0] ?? ""])),
  );
  const [quantity, setQuantity] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [added, setAdded] = useState<"points" | "cash" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const matchedVariant = useMemo(
    () =>
      variants.find((variant) => variant.selectedOptions.every((opt) => selected[opt.name] === opt.value)) ?? null,
    [variants, selected],
  );

  const soldOut = !matchedVariant || !matchedVariant.availableForSale;
  const pointsNeeded = points ? points.costPerUnit * quantity : 0;
  const willUsePoints = Boolean(points) && pointsNeeded <= (points?.available ?? 0);

  function addToCart() {
    if (!matchedVariant) return;
    setAdded(null);
    setError(null);
    startTransition(async () => {
      const result = await onAddToCart(matchedVariant.id, quantity);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setAdded(result.paidWithPoints ? "points" : "cash");
      announceCart(result.cart, true);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="text-2xl font-semibold text-neutral-900">
          {matchedVariant ? formatMoney(matchedVariant.price) : ""}
        </span>
        {points ? (
          <span className="text-sm text-neutral-500">or {points.costPerUnit.toLocaleString()} points</span>
        ) : null}
      </div>

      {options
        .filter((option) => !(option.values.length === 1 && option.values[0] === "Default Title"))
        .map((option) => (
          <div key={option.name} className="flex flex-col gap-2">
            <span className="text-sm font-medium text-neutral-700">{option.name}</span>
            <div className="flex flex-wrap gap-2">
              {option.values.map((value) => {
                const active = selected[option.name] === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSelected((prev) => ({ ...prev, [option.name]: value }))}
                    className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                      active
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-300 text-neutral-700 hover:border-neutral-500"
                    }`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

      <div className="flex items-center gap-3">
        <select
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        >
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <Button type="button" onClick={addToCart} disabled={soldOut || isPending} className="flex-1">
          {soldOut
            ? "Sold out"
            : isPending
              ? "Adding…"
              : added
                ? added === "points"
                  ? "Added · paid with points ✓"
                  : "Added ✓"
                : "Add to cart"}
        </Button>
      </div>

      {points ? (
        <p className="text-sm text-neutral-500">
          {willUsePoints
            ? `This will be paid with ${pointsNeeded.toLocaleString()} points (${points.available.toLocaleString()} available). You can switch to dollars in the cart.`
            : `Needs ${pointsNeeded.toLocaleString()} points; you have ${points.available.toLocaleString()} available, so this will be charged in dollars.`}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
