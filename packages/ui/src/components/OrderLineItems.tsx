"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { formatMoney } from "../format";
import { Button } from "./Button";

export interface OrderLineItemData {
  id: string;
  name: string;
  quantity: number;
  variantId: string | null;
  price: { amount: string; currencyCode: string } | null;
  image: { url: string; altText: string | null } | null;
}

export interface OrderLineItemsProps {
  lineItems: OrderLineItemData[];
  onBuyAgain: (variantIds: string[]) => Promise<void>;
}

export function OrderLineItems({ lineItems, onBuyAgain }: OrderLineItemsProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function buyAgain() {
    const variantIds = lineItems
      .filter((item) => selected.has(item.id) && item.variantId)
      .map((item) => item.variantId as string);
    if (variantIds.length === 0) return;

    startTransition(async () => {
      await onBuyAgain(variantIds);
      setFeedback("Added to cart.");
      setSelected(new Set());
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col divide-y divide-neutral-200 rounded-2xl border border-neutral-200">
        {lineItems.map((item) => (
          <label
            key={item.id}
            className="flex items-center gap-4 px-4 py-4 hover:bg-neutral-50"
          >
            <input
              type="checkbox"
              checked={selected.has(item.id)}
              onChange={() => toggle(item.id)}
              disabled={!item.variantId}
              className="h-4 w-4 rounded border-neutral-300"
            />
            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-100">
              {item.image ? (
                <Image
                  src={item.image.url}
                  alt={item.image.altText ?? item.name}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              ) : null}
            </div>
            <div className="flex flex-1 flex-col">
              <span className="text-sm font-medium text-neutral-900">{item.name}</span>
              <span className="text-sm text-neutral-500">Qty {item.quantity}</span>
            </div>
            {item.price ? (
              <span className="text-sm font-medium text-neutral-900">
                {formatMoney(item.price)}
              </span>
            ) : null}
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={selected.size === 0 || isPending}
          onClick={buyAgain}
        >
          {isPending ? "Adding…" : `Buy it again (${selected.size})`}
        </Button>
        {feedback ? <span className="text-sm text-neutral-500">{feedback}</span> : null}
      </div>
    </div>
  );
}
