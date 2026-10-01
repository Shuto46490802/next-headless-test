"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { formatMoney } from "../format";
import {
  CART_OPEN_EVENT,
  CART_UPDATED_EVENT,
  cartCredit,
  cartPoints,
  type CartActionResult,
  type MiniCartData,
  type MiniCartLine,
} from "../cart-events";
import type { AddToCartAction, TileProductData } from "../commerce/types";

export interface MiniCartUpsell {
  /** Suggestions for the "Have you forgotten" tray; receives the product IDs already in the cart. */
  load: (productIdsInCart: string[]) => Promise<TileProductData[]>;
  onAdd: AddToCartAction;
}

export interface MiniCartProps {
  initialCart: MiniCartData | null;
  /** Where the Checkout button goes. Defaults to the cart's own checkoutUrl. */
  checkoutHref?: string;
  onUpdateQuantity: (lineId: string, quantity: number) => Promise<CartActionResult>;
  onRemove: (lineId: string) => Promise<CartActionResult>;
  /** Drinks Cart: switch a line between points and cash. Omit on brands without points. */
  onTogglePoints?: (lineId: string, usePoints: boolean) => Promise<CartActionResult>;
  /** Drinks Cart: shows the points summary and per-line "Paying with" bar. */
  points?: { enabled: boolean; balance: number | null } | null;
  /** Club Connect: "Earns $4.00 credit" per line and "This order earns" in the summary. */
  showCredit?: boolean;
  /** Summary "Delivery" value, e.g. "Free". */
  deliveryLabel?: string;
  /** Empty-state line, e.g. "Add products to start your club's next order." */
  emptyMessage?: string;
  upsell?: MiniCartUpsell | null;
}

function PointsIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className={className} aria-hidden>
      <circle cx="10" cy="10" r="8.25" />
      <path d="M12.3 7.4c-.4-.8-1.2-1.2-2.2-1.2-1.3 0-2.2.7-2.2 1.7 0 2.4 4.6 1 4.6 3.7 0 1.1-1 1.9-2.4 1.9-1.1 0-2-.5-2.4-1.3M10 4.8v1.4M10 13.5v1.4" strokeLinecap="round" />
    </svg>
  );
}

function CartIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className} aria-hidden>
      <path d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 7H6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9.5" cy="19" r="1.3" />
      <circle cx="17" cy="19" r="1.3" />
    </svg>
  );
}

function Points({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 font-bold text-brand">
      <PointsIcon />
      {value.toLocaleString()} Points
    </span>
  );
}

/**
 * Figma "Cart Drawer" (FIN-04): navy header with the item count, line items with the credit chip,
 * the "Have you forgotten" upsell tray (quick add keeps the drawer open and drops anything already
 * in the cart), and the tinted summary with the order's credit and Checkout. Full-screen sheet on
 * mobile. Drinks Cart keeps its points summary and per-line points/cash switch.
 */
export function MiniCart({
  initialCart,
  checkoutHref,
  onUpdateQuantity,
  onRemove,
  onTogglePoints,
  points = null,
  showCredit = false,
  deliveryLabel = "Select at checkout",
  emptyMessage = "Add products to start your next order.",
  upsell = null,
}: MiniCartProps) {
  const [cart, setCart] = useState<MiniCartData | null>(initialCart);
  const [open, setOpen] = useState(false);
  // Portalled to <body>: the sticky header would otherwise become the containing block for `fixed`.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => setCart(initialCart), [initialCart]);

  useEffect(() => {
    const onUpdated = (e: Event) => setCart((e as CustomEvent<MiniCartData | null>).detail);
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
  const cashTotal = lines.reduce((sum, l) => (l.usePoints && pointsEnabled ? sum : sum + Number(l.cost.totalAmount.amount)), 0);
  const overBalance = pointsEnabled && points?.balance != null && pointsTotal > points.balance;
  const credit = showCredit ? cartCredit(cart) : null;
  const href = checkoutHref ?? cart?.checkoutUrl ?? "#";
  const money = (n: number) => formatMoney({ amount: n.toFixed(2), currencyCode: currency });

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="relative flex flex-col items-center gap-1 text-xs text-brand" aria-haspopup="dialog" aria-expanded={open} aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}`}>
        <CartIcon />
        Cart
        {count > 0 ? (
          <span className="absolute -right-2 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 font-heading text-xs font-bold text-accent-fg">{count}</span>
        ) : null}
      </button>

      {open && mounted
        ? createPortal(
            <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Cart">
              <button type="button" aria-label="Close cart" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/40" />
              <aside className="absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-2xl sm:max-w-[534px] sm:border-l sm:border-neutral-200">
                <header className="flex items-center gap-3 bg-brand p-3 text-white sm:p-4">
                  <h2 className="font-heading text-[28px] font-bold leading-tight sm:text-[32px]">Cart</h2>
                  {count > 0 ? <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-accent px-1.5 font-heading text-xl font-bold leading-none text-accent-fg">{count}</span> : null}
                  <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-white text-brand">
                    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                      <path d="m3 3 6 6M9 3l-6 6" />
                    </svg>
                  </button>
                </header>

                {error ? <p role="alert" className="mx-4 mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

                {lines.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-brand">
                    <CartIcon className="h-10 w-10" />
                    <p className="font-heading text-[28px] font-bold leading-tight">Your cart is empty</p>
                    <p className="text-sm">{emptyMessage}</p>
                    <Link href="/products" onClick={() => setOpen(false)} className="mt-2 flex h-12 w-full max-w-sm items-center justify-center rounded-full bg-accent font-heading text-base font-bold uppercase tracking-[0.05em] text-brand hover:opacity-90">
                      Start shopping
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className={`min-h-0 flex-1 overflow-y-auto ${isPending ? "opacity-60" : ""}`}>
                      <div className="flex flex-col gap-2 p-3 sm:p-4">
                        {lines.map((line) => (
                          <MiniCartRow
                            key={line.id}
                            line={line}
                            pointsEnabled={pointsEnabled}
                            showCredit={showCredit}
                            disabled={isPending}
                            onQuantity={(q) => run(() => onUpdateQuantity(line.id, q))}
                            onRemove={() => run(() => onRemove(line.id))}
                            onToggle={onTogglePoints ? () => run(() => onTogglePoints(line.id, !line.usePoints)) : undefined}
                          />
                        ))}
                      </div>
                      {upsell ? <UpsellTray upsell={upsell} cart={cart} showCredit={showCredit} onAdded={setCart} onError={setError} /> : null}
                    </div>

                    <footer className="flex flex-col gap-3 bg-brand-tint p-3 text-brand sm:p-4">
                      <p className="font-heading text-xl font-bold uppercase">Summary</p>
                      <dl className="flex flex-col gap-2">
                        {pointsEnabled ? (
                          <div className="flex items-center justify-between">
                            <dt className="text-base font-semibold sm:text-lg">Points total</dt>
                            <dd><Points value={pointsTotal} /></dd>
                          </div>
                        ) : null}
                        <div className="flex items-center justify-between">
                          <dt className="text-base font-semibold sm:text-lg">{pointsEnabled ? "Cash total" : "Subtotal"}</dt>
                          <dd className="font-bold">{money(cashTotal)}</dd>
                        </div>
                        <div className="flex items-center justify-between">
                          <dt className="text-base font-semibold sm:text-lg">Delivery</dt>
                          <dd className="font-bold">{deliveryLabel}</dd>
                        </div>
                      </dl>
                      <div className="h-px bg-neutral-300" />
                      <div className="flex items-center justify-between font-heading font-bold">
                        <span className="text-xl">Total due</span>
                        <span className="text-[32px] leading-tight sm:text-[40px]">{money(cashTotal)}</span>
                      </div>
                      {credit ? <p className="text-sm font-bold uppercase">This order earns {formatMoney(credit)} credit</p> : null}
                      {overBalance ? (
                        <p className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">
                          {pointsTotal.toLocaleString()} points selected but you have {points!.balance!.toLocaleString()}. Checkout won&apos;t apply any points until you switch a line to dollars.
                        </p>
                      ) : null}
                      <a href={href} className="flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-accent font-heading text-xl font-bold uppercase tracking-[0.05em] text-brand hover:opacity-90">
                        <CartIcon />
                        Checkout
                      </a>
                    </footer>
                  </>
                )}
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
  showCredit,
  disabled,
  onQuantity,
  onRemove,
  onToggle,
}: {
  line: MiniCartLine;
  pointsEnabled: boolean;
  showCredit: boolean;
  disabled: boolean;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
  onToggle?: () => void;
}) {
  const product = line.merchandise.product;
  const variantLabel = line.merchandise.selectedOptions
    .map((o) => o.value)
    .filter((v) => v && v !== "Default Title")
    .join(" · ");
  const subtitle = [product.packLabel, variantLabel].filter(Boolean).join(" · ");
  const pointsCost = product.pointsCost ?? null;
  const usePoints = pointsEnabled && Boolean(line.usePoints);
  const canToggle = pointsEnabled && pointsCost != null && Boolean(onToggle);
  const credit = showCredit && product.creditEarned ? { amount: (Number(product.creditEarned.amount) * line.quantity).toFixed(2), currencyCode: product.creditEarned.currencyCode } : null;

  return (
    <div className="flex flex-col gap-2 border-b border-neutral-200 pb-2">
      <div className="flex gap-3.5">
        <Link href={`/products/${product.handle}`} className="relative h-[110px] w-[74px] shrink-0 overflow-hidden rounded bg-[#f7f7f6]">
          {line.merchandise.image ? (
            <Image src={line.merchandise.image.url} alt={line.merchandise.image.altText ?? product.title} fill sizes="74px" className="object-contain p-1" />
          ) : null}
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-[7px]">
          <div className="flex items-start justify-between gap-3">
            <Link href={`/products/${product.handle}`} className="text-sm text-neutral-900 hover:underline">{product.title}</Link>
            {usePoints && pointsCost != null ? <Points value={pointsCost * line.quantity} /> : <span className="font-heading text-xl font-bold leading-snug text-brand">{formatMoney(line.cost.totalAmount)}</span>}
          </div>
          {subtitle ? <span className="text-xs font-medium uppercase text-neutral-500">{subtitle}</span> : null}
          {credit ? <span className="self-start bg-brand-tint px-1 text-xs font-medium uppercase text-brand">Earns {formatMoney(credit)} credit</span> : null}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-0.5 rounded-full bg-neutral-100 p-[3px] text-sm">
              <button type="button" disabled={disabled || line.quantity <= 1} onClick={() => onQuantity(line.quantity - 1)} className="flex h-[26px] w-[26px] items-center justify-center rounded-full text-neutral-700 disabled:opacity-40" aria-label="Decrease quantity">−</button>
              <span className="w-[26px] text-center text-neutral-900">{line.quantity}</span>
              <button type="button" disabled={disabled} onClick={() => onQuantity(line.quantity + 1)} className="flex h-[26px] w-[26px] items-center justify-center rounded-full text-neutral-700 disabled:opacity-40" aria-label="Increase quantity">+</button>
            </div>
            <button type="button" disabled={disabled} onClick={onRemove} aria-label={`Remove ${product.title}`} className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-tint text-brand hover:opacity-80 disabled:opacity-40">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-[18px] w-[18px]" aria-hidden>
                <path d="M4 5.5h12M8 5.5V4h4v1.5M6 5.5l.7 10h6.6l.7-10M8.5 8.5v5M11.5 8.5v5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      {canToggle ? (
        <div className="flex items-center justify-between rounded bg-brand-tint px-3 py-2 text-sm text-brand">
          <span className="text-xs uppercase tracking-wide">
            Paying with <span className="ml-1 text-sm font-semibold normal-case tracking-normal">{usePoints ? "Points" : "Dollars"}</span>
          </span>
          <button type="button" disabled={disabled} onClick={onToggle} className="font-semibold underline underline-offset-2 disabled:opacity-40">Switch</button>
        </div>
      ) : null}
    </div>
  );
}

/** "Have you forgotten": three suggestions, excluding products already in the cart. */
function UpsellTray({
  upsell,
  cart,
  showCredit,
  onAdded,
  onError,
}: {
  upsell: MiniCartUpsell;
  cart: MiniCartData | null;
  showCredit: boolean;
  onAdded: (cart: MiniCartData) => void;
  onError: (message: string) => void;
}) {
  const [items, setItems] = useState<TileProductData[] | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const inCart = (cart?.lines ?? []).map((l) => l.merchandise.product.id).filter((id): id is string => Boolean(id));
  const key = [...inCart].sort().join(",");

  useEffect(() => {
    let live = true;
    upsell
      .load(key ? key.split(",") : [])
      .then((r) => live && setItems(r))
      .catch(() => live && setItems([]));
    return () => {
      live = false;
    };
    // Reload only when the set of products in the cart changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const shown = (items ?? []).filter((p) => !inCart.includes(p.id) && p.availableForSale && p.variants.length === 1).slice(0, 3);
  if (shown.length === 0) return null;

  async function add(p: TileProductData) {
    const variant = p.variants[0];
    if (!variant) return;
    setAdding(p.id);
    const result = await upsell.onAdd(variant.id, 1);
    setAdding(null);
    if (result.ok) onAdded(result.cart);
    else onError(result.message);
  }

  return (
    <section aria-label="Have you forgotten" className="mt-2">
      <p className="rounded-t-xl bg-brand py-2 text-center font-heading text-sm font-bold uppercase tracking-[0.05em] text-accent">Have you forgotten</p>
      <ul className="flex flex-col px-3 pb-2 sm:px-4">
        {shown.map((p) => (
          <li key={p.id} className="flex items-center gap-2 border-b border-neutral-200 py-2">
            <Link href={`/products/${p.handle}`} className="relative h-[74px] w-16 shrink-0 border border-neutral-200 bg-white">
              {p.featuredImage ? <Image src={p.featuredImage.url} alt="" fill sizes="64px" className="object-contain p-1" /> : null}
            </Link>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-xs font-bold uppercase text-neutral-500">{p.brand}</span>
              <Link href={`/products/${p.handle}`} className="text-sm font-semibold text-brand hover:underline">{p.title}</Link>
              {showCredit && p.creditEarned ? <span className="text-xs font-medium uppercase text-neutral-900">Earns {formatMoney(p.creditEarned)} credit</span> : null}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="font-bold text-brand">{formatMoney(p.price)}</span>
              <button type="button" disabled={adding !== null} onClick={() => add(p)} className="rounded-full bg-accent px-4 py-2 font-heading text-sm font-bold uppercase tracking-[0.05em] text-brand hover:opacity-90 disabled:opacity-60">
                {adding === p.id ? "Adding…" : "Quick add"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
