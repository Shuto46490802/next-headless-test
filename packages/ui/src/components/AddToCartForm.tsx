"use client";

import { useMemo, useState, useTransition } from "react";
import { formatMoney } from "../format";
import { Button } from "./Button";

export interface AddToCartVariant {
  id: string;
  availableForSale: boolean;
  price: { amount: string; currencyCode: string };
  selectedOptions: { name: string; value: string }[];
}

export type AddToCartResult = { ok: true } | { ok: false; message: string };

export type PaymentMethod = "cash" | "points";

export interface PointsOption {
  /** Points per unit (`mindarc_poc.points_cost`). */
  costPerUnit: number;
  /** Customer's `mindarc_poc.points_balance`; null when unknown. */
  balance: number | null;
  /** Which button is styled as the primary action. */
  defaultMethod: PaymentMethod;
}

export interface AddToCartFormProps {
  options: { name: string; values: string[] }[];
  variants: AddToCartVariant[];
  /**
   * Return `{ ok: false, message }` to show a rejection (e.g. a cart validation rule) under the
   * button. `usePoints` is true when the customer chose the points action.
   */
  onAddToCart: (variantId: string, quantity: number, usePoints: boolean) => Promise<AddToCartResult | void>;
  /** When set, a second "pay with points" action is offered alongside cash. */
  points?: PointsOption | null;
}

export function AddToCartForm({ options, variants, onAddToCart, points = null }: AddToCartFormProps) {
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      options.map((option) => [option.name, option.values[0] ?? ""]),
    ),
  );
  const [quantity, setQuantity] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matchedVariant = useMemo(
    () =>
      variants.find((variant) =>
        variant.selectedOptions.every((opt) => selected[opt.name] === opt.value),
      ) ?? null,
    [variants, selected],
  );

  const [lastMethod, setLastMethod] = useState<PaymentMethod>("cash");

  function addToCart(usePoints: boolean) {
    if (!matchedVariant) return;
    setAdded(false);
    setError(null);
    setLastMethod(usePoints ? "points" : "cash");
    startTransition(async () => {
      const result = await onAddToCart(matchedVariant.id, quantity, usePoints);
      if (result && !result.ok) {
        setError(result.message);
        return;
      }
      setAdded(true);
    });
  }

  const soldOut = !matchedVariant || !matchedVariant.availableForSale;
  const pointsTotal = points ? points.costPerUnit * quantity : 0;
  const exceedsBalance = points?.balance != null && pointsTotal > points.balance;

  function label(method: PaymentMethod) {
    if (soldOut) return "Sold out";
    if (isPending && lastMethod === method) return "Adding…";
    if (added && lastMethod === method) return "Added ✓";
    if (method === "points") return `Add to cart · ${pointsTotal.toLocaleString()} points`;
    return `Add to cart${matchedVariant ? ` · ${formatMoney(matchedVariant.price)}` : ""}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <span className="text-2xl font-semibold text-neutral-900">
        {matchedVariant ? formatMoney(matchedVariant.price) : ""}
      </span>

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
        {points ? (
          <div className="flex flex-1 flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant={points.defaultMethod === "cash" ? "primary" : "secondary"}
              onClick={() => addToCart(false)}
              disabled={soldOut || isPending}
              className="flex-1"
            >
              {label("cash")}
            </Button>
            <Button
              type="button"
              variant={points.defaultMethod === "points" ? "primary" : "secondary"}
              onClick={() => addToCart(true)}
              disabled={soldOut || isPending}
              className="flex-1"
            >
              {label("points")}
            </Button>
          </div>
        ) : (
          <Button type="button" onClick={() => addToCart(false)} disabled={soldOut || isPending} className="flex-1">
            {label("cash")}
          </Button>
        )}
      </div>

      {points ? (
        <p className={`text-sm ${exceedsBalance ? "text-amber-700" : "text-neutral-500"}`}>
          {points.balance == null
            ? `${points.costPerUnit.toLocaleString()} points per unit.`
            : exceedsBalance
              ? `${pointsTotal.toLocaleString()} points needed, you have ${points.balance.toLocaleString()}. Points lines over your balance are charged at cash price at checkout.`
              : `${points.costPerUnit.toLocaleString()} points per unit · balance ${points.balance.toLocaleString()} points.`}
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
