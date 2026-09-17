"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { formatMoney } from "../format";

export type CartLineActionResult = { ok: false; message: string } | void;

export interface CartLineItemData {
  id: string;
  quantity: number;
  cost: { totalAmount: { amount: string; currencyCode: string } };
  merchandise: {
    title: string;
    image: { url: string; altText: string | null } | null;
    product: { handle: string; title: string; pointsCost?: number | null };
    selectedOptions: { name: string; value: string }[];
  };
  /** True when the line carries `_use_points=true`. */
  usePoints?: boolean;
}

export interface CartLineItemProps {
  line: CartLineItemData;
  onUpdateQuantity: (lineId: string, quantity: number) => Promise<CartLineActionResult>;
  onRemove: (lineId: string) => Promise<CartLineActionResult>;
  /** When provided and the product has a points cost, renders a points/cash toggle. */
  onTogglePoints?: (lineId: string, usePoints: boolean) => Promise<CartLineActionResult>;
  /** Whether the customer may pay with points at all (DC members, signed in). */
  pointsEnabled?: boolean;
}

export function CartLineItem({
  line,
  onUpdateQuantity,
  onRemove,
  onTogglePoints,
  pointsEnabled = false,
}: CartLineItemProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const variantLabel = line.merchandise.selectedOptions
    .map((o) => o.value)
    .filter((v) => v && v !== "Default Title")
    .join(" / ");

  const pointsCost = line.merchandise.product.pointsCost ?? null;
  const usePoints = Boolean(line.usePoints);
  const linePoints = pointsCost != null ? pointsCost * line.quantity : null;
  const canToggle = pointsEnabled && pointsCost != null && Boolean(onTogglePoints);

  function run(action: () => Promise<CartLineActionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result && !result.ok) setError(result.message);
    });
  }

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
        {usePoints ? (
          <span className="inline-flex w-fit rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            Paid with points
          </span>
        ) : null}
        <div className="mt-auto flex flex-wrap items-center gap-3">
          <select
            value={line.quantity}
            disabled={isPending}
            onChange={(e) => {
              const quantity = Number(e.target.value);
              run(() => onUpdateQuantity(line.id, quantity));
            }}
            className="rounded-lg border border-neutral-300 px-2 py-1 text-sm"
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          {canToggle ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => onTogglePoints!(line.id, !usePoints))}
              className="text-sm text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline"
            >
              {usePoints ? "Pay with cash instead" : `Pay with ${linePoints!.toLocaleString()} points instead`}
            </button>
          ) : null}
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => onRemove(line.id))}
            className="text-sm text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline"
          >
            Remove
          </button>
        </div>
        {error ? (
          <span role="alert" className="text-xs text-red-600">
            {error}
          </span>
        ) : null}
      </div>
      <span className="font-medium text-neutral-900">
        {usePoints && linePoints != null ? `${linePoints.toLocaleString()} pts` : formatMoney(line.cost.totalAmount)}
      </span>
    </div>
  );
}
