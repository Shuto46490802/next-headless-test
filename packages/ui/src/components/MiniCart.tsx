"use client";

import Image from "next/image";
import { useCallback, useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { formatMoney } from "../format";
import {
  CART_OPEN_EVENT,
  CART_UPDATED_EVENT,
  cartPoints,
  type CartActionResult,
  type MiniCartData,
  type MiniCartLine,
} from "../cart-events";

export interface MiniCartProps {
  initialCart: MiniCartData | null;
  /** Where the Checkout button goes. Defaults to the cart's own checkoutUrl. */
  checkoutHref?: string;
  onUpdateQuantity: (
    lineId: string,
    quantity: number,
  ) => Promise<CartActionResult>;
  onRemove: (lineId: string) => Promise<CartActionResult>;
  /** Drinks Cart: switch a line between points and cash. Omit on brands without points. */
  onTogglePoints?: (
    lineId: string,
    usePoints: boolean,
  ) => Promise<CartActionResult>;
  /** Drinks Cart: shows the points summary and per-line "Paying with" bar. */
  points?: { enabled: boolean; balance: number | null } | null;
}

function PointsIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={className}
      aria-hidden
    >
      <circle cx="10" cy="10" r="8.25" />
      <path
        d="M12.3 7.4c-.4-.8-1.2-1.2-2.2-1.2-1.3 0-2.2.7-2.2 1.7 0 2.4 4.6 1 4.6 3.7 0 1.1-1 1.9-2.4 1.9-1.1 0-2-.5-2.4-1.3M10 4.8v1.4M10 13.5v1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Points({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 font-medium text-neutral-900">
      <PointsIcon />
      {value.toLocaleString()} Points
    </span>
  );
}

export function MiniCart({
  initialCart,
  checkoutHref,
  onUpdateQuantity,
  onRemove,
  onTogglePoints,
  points = null,
}: MiniCartProps) {
  const [cart, setCart] = useState<MiniCartData | null>(initialCart);
  const [open, setOpen] = useState(false);
  // The drawer is portalled to <body>: the sticky header's backdrop-filter would otherwise
  // become the containing block for `position: fixed` and clip the overlay to the header.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => setCart(initialCart), [initialCart]);

  useEffect(() => {
    const onUpdated = (e: Event) =>
      setCart((e as CustomEvent<MiniCartData | null>).detail);
    const onOpen = () => setOpen(true);
    window.addEventListener(CART_UPDATED_EVENT, onUpdated);
    window.addEventListener(CART_OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, onUpdated);
      window.removeEventListener(CART_OPEN_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const run = useCallback((action: () => Promise<CartActionResult>) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) setCart(result.cart);
      else setError(result.message);
    });
  }, []);

  const lines = cart?.lines ?? [];
  const count = cart?.totalQuantity ?? 0;
  const currency = cart?.cost.subtotalAmount.currencyCode ?? "AUD";
  const pointsEnabled = Boolean(points?.enabled);
  const pointsTotal = pointsEnabled ? cartPoints(cart) : 0;
  const cashTotal = lines.reduce(
    (sum, l) =>
      l.usePoints && pointsEnabled
        ? sum
        : sum + Number(l.cost.totalAmount.amount),
    0,
  );
  const overBalance =
    pointsEnabled && points?.balance != null && pointsTotal > points.balance;
  const href = checkoutHref ?? cart?.checkoutUrl ?? "#";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative text-sm font-medium text-neutral-700 hover:text-neutral-900"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        Cart
        {count > 0 ? (
          <span className="absolute -right-3 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[10px] text-brand-fg">
            {count}
          </span>
        ) : null}
      </button>

      {open && mounted
        ? createPortal(
            <div
              className="fixed inset-0 z-50"
              role="dialog"
              aria-modal="true"
              aria-label="Cart"
            >
              <button
                type="button"
                aria-label="Close cart"
                onClick={() => setOpen(false)}
                className="absolute inset-0 bg-black/40"
              />
              <aside className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-white shadow-2xl">
                <header className="flex items-center justify-between border-b border-neutral-200 px-6 py-5">
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Cart ({count} {count === 1 ? "item" : "items"})
                  </h2>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="text-xl leading-none text-neutral-700 hover:text-neutral-900"
                  >
                    ×
                  </button>
                </header>

                {error ? (
                  <p
                    role="alert"
                    className="mx-6 mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                  >
                    {error}
                  </p>
                ) : null}

                <div
                  className={`min-h-0 flex-1 overflow-y-auto px-6 ${isPending ? "opacity-60" : ""}`}
                >
                  {lines.length === 0 ? (
                    <p className="py-16 text-center text-sm text-neutral-500">
                      Your cart is empty.
                    </p>
                  ) : (
                    lines.map((line) => (
                      <MiniCartRow
                        key={line.id}
                        line={line}
                        pointsEnabled={pointsEnabled}
                        disabled={isPending}
                        onQuantity={(q) =>
                          run(() => onUpdateQuantity(line.id, q))
                        }
                        onRemove={() => run(() => onRemove(line.id))}
                        onToggle={
                          onTogglePoints
                            ? () =>
                                run(() =>
                                  onTogglePoints(line.id, !line.usePoints),
                                )
                            : undefined
                        }
                      />
                    ))
                  )}
                </div>

                {lines.length > 0 ? (
                  <footer className="border-t border-neutral-200 bg-neutral-100 px-6 pb-6 pt-4">
                    <p className="mb-3 text-xs uppercase tracking-wide text-neutral-500">
                      Summary
                    </p>
                    <dl className="flex flex-col gap-2 text-sm text-neutral-600">
                      {pointsEnabled ? (
                        <div className="flex items-center justify-between">
                          <dt>Points Total</dt>
                          <dd>
                            <Points value={pointsTotal} />
                          </dd>
                        </div>
                      ) : null}
                      <div className="flex items-center justify-between">
                        <dt>Cash Total</dt>
                        <dd className="font-medium text-neutral-900">
                          {formatMoney({
                            amount: String(cashTotal),
                            currencyCode: currency,
                          })}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt>Delivery</dt>
                        <dd className="text-neutral-900">Select at Checkout</dd>
                      </div>
                    </dl>
                    <div className="mt-4 flex items-center justify-between border-t border-neutral-300 pt-4">
                      <span className="text-sm text-neutral-600">
                        Total due
                      </span>
                      <span className="text-xl font-semibold text-neutral-900">
                        {formatMoney({
                          amount: String(cashTotal),
                          currencyCode: currency,
                        })}
                      </span>
                    </div>
                    {overBalance ? (
                      <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        {pointsTotal.toLocaleString()} points selected but you
                        have {points!.balance!.toLocaleString()}. Checkout
                        won&apos;t apply any points until you switch a line to
                        dollars.
                      </p>
                    ) : null}
                    <a
                      href={href}
                      className="mt-4 flex h-12 w-full items-center justify-center rounded-md bg-neutral-900 text-sm font-semibold uppercase tracking-wide text-white hover:bg-neutral-800"
                    >
                      Checkout
                    </a>
                  </footer>
                ) : null}
              </aside>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function MiniCartRow({
  line,
  pointsEnabled,
  disabled,
  onQuantity,
  onRemove,
  onToggle,
}: {
  line: MiniCartLine;
  pointsEnabled: boolean;
  disabled: boolean;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
  onToggle?: () => void;
}) {
  const variantLabel = line.merchandise.selectedOptions
    .map((o) => o.value)
    .filter((v) => v && v !== "Default Title")
    .join(" · ");
  const pointsCost = line.merchandise.product.pointsCost ?? null;
  const usePoints = pointsEnabled && Boolean(line.usePoints);
  const canToggle = pointsEnabled && pointsCost != null && Boolean(onToggle);

  return (
    <div className="border-b border-neutral-200 py-5 last:border-b-0">
      <div className="flex gap-4">
        <div className="relative h-24 w-20 flex-shrink-0 overflow-hidden rounded-md border border-neutral-200 bg-neutral-100">
          {line.merchandise.image ? (
            <Image
              src={line.merchandise.image.url}
              alt={
                line.merchandise.image.altText ?? line.merchandise.product.title
              }
              fill
              sizes="80px"
              className="object-cover"
            />
          ) : (
            <span className="flex h-full items-center justify-center text-xs uppercase tracking-wide text-neutral-400">
              Pack
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-start justify-between gap-4">
            <span className="font-medium text-neutral-900">
              {line.merchandise.product.title}
            </span>
            {usePoints && pointsCost != null ? (
              <Points value={pointsCost * line.quantity} />
            ) : (
              <span className="font-medium text-neutral-900">
                {formatMoney(line.cost.totalAmount)}
              </span>
            )}
          </div>
          {variantLabel ? (
            <span className="text-xs uppercase tracking-wide text-neutral-500">
              {variantLabel}
            </span>
          ) : null}
          <div className="mt-2 flex items-center justify-between">
            <div className="inline-flex items-center rounded-full bg-neutral-100 text-sm">
              <button
                type="button"
                disabled={disabled || line.quantity <= 1}
                onClick={() => onQuantity(line.quantity - 1)}
                className="px-3 py-1.5 text-neutral-700 disabled:opacity-40"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="min-w-[1.5rem] text-center text-neutral-900">
                {line.quantity}
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onQuantity(line.quantity + 1)}
                className="px-3 py-1.5 text-neutral-700 disabled:opacity-40"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={onRemove}
              aria-label="Remove"
              className="text-neutral-500 hover:text-neutral-900 disabled:opacity-40"
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-5 w-5"
                aria-hidden
              >
                <path
                  d="M4 5.5h12M8 5.5V4h4v1.5M6 5.5l.7 10h6.6l.7-10M8.5 8.5v5M11.5 8.5v5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
      {canToggle ? (
        <div className="mt-3 flex items-center justify-between rounded-md bg-neutral-100 px-3 py-2 text-sm">
          <span className="text-xs uppercase tracking-wide text-neutral-500">
            Paying with{" "}
            <span className="ml-1 text-sm font-semibold normal-case tracking-normal text-neutral-900">
              {usePoints ? "Points" : "Dollars"}
            </span>
          </span>
          <button
            type="button"
            disabled={disabled}
            onClick={onToggle}
            className="font-semibold text-neutral-900 underline underline-offset-2 disabled:opacity-40"
          >
            Switch
          </button>
        </div>
      ) : null}
    </div>
  );
}
