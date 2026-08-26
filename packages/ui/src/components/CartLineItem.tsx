"use client";

import Image from "next/image";
import { useTransition } from "react";
import { formatMoney } from "../format";

export interface CartLineItemData {
  id: string;
  quantity: number;
  cost: { totalAmount: { amount: string; currencyCode: string } };
  merchandise: {
    title: string;
    image: { url: string; altText: string | null } | null;
    product: { handle: string; title: string };
    selectedOptions: { name: string; value: string }[];
  };
}

export interface CartLineItemProps {
  line: CartLineItemData;
  onUpdateQuantity: (lineId: string, quantity: number) => Promise<void>;
  onRemove: (lineId: string) => Promise<void>;
}

export function CartLineItem({ line, onUpdateQuantity, onRemove }: CartLineItemProps) {
  const [isPending, startTransition] = useTransition();
  const variantLabel = line.merchandise.selectedOptions
    .map((o) => o.value)
    .filter((v) => v && v !== "Default Title")
    .join(" / ");

  return (
    <div className="flex gap-4 border-b border-neutral-200 py-6">
      <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-neutral-100">
        {line.merchandise.image ? (
          <Image
            src={line.merchandise.image.url}
            alt={line.merchandise.image.altText ?? line.merchandise.product.title}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <span className="font-medium text-neutral-900">{line.merchandise.product.title}</span>
        {variantLabel ? <span className="text-sm text-neutral-500">{variantLabel}</span> : null}
        <div className="mt-auto flex items-center gap-3">
          <select
            value={line.quantity}
            disabled={isPending}
            onChange={(e) =>
              startTransition(() => onUpdateQuantity(line.id, Number(e.target.value)))
            }
            className="rounded-lg border border-neutral-300 px-2 py-1 text-sm"
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => onRemove(line.id))}
            className="text-sm text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline"
          >
            Remove
          </button>
        </div>
      </div>
      <span className="font-medium text-neutral-900">{formatMoney(line.cost.totalAmount)}</span>
    </div>
  );
}
