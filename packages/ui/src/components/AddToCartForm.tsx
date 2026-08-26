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

export interface AddToCartFormProps {
  options: { name: string; values: string[] }[];
  variants: AddToCartVariant[];
  onAddToCart: (variantId: string, quantity: number) => Promise<void>;
}

export function AddToCartForm({ options, variants, onAddToCart }: AddToCartFormProps) {
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      options.map((option) => [option.name, option.values[0] ?? ""]),
    ),
  );
  const [quantity, setQuantity] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);

  const matchedVariant = useMemo(
    () =>
      variants.find((variant) =>
        variant.selectedOptions.every((opt) => selected[opt.name] === opt.value),
      ) ?? null,
    [variants, selected],
  );

  function addToCart() {
    if (!matchedVariant) return;
    setAdded(false);
    startTransition(async () => {
      await onAddToCart(matchedVariant.id, quantity);
      setAdded(true);
    });
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
        <Button
          type="button"
          onClick={addToCart}
          disabled={!matchedVariant || !matchedVariant.availableForSale || isPending}
          className="flex-1"
        >
          {!matchedVariant || !matchedVariant.availableForSale
            ? "Sold out"
            : isPending
              ? "Adding…"
              : added
                ? "Added ✓"
                : "Add to cart"}
        </Button>
      </div>
    </div>
  );
}
