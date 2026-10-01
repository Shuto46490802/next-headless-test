"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { formatMoney } from "../format";
import { announceCart } from "../cart-events";
import { FavoriteButton } from "../components/FavoriteButton";
import { QuantityStepper } from "./QuantityStepper";
import { tileBadge } from "./format";
import type { AddToCartAction, TileProductData } from "./types";

export interface ProductTileProps {
  product: TileProductData;
  onAddToCart: AddToCartAction;
  isLoggedIn: boolean;
  isFavourited: boolean;
  /** Club Connect shows "Earns $4.00 credit"; Partner Connect hides it. */
  showCredit?: boolean;
  /** Drinks Cart members: "or N points" under the price. */
  showPoints?: boolean;
  /** "compact" is the narrow card used in rails and the mobile grid. */
  size?: "regular" | "compact";
  priority?: boolean;
}

/**
 * Figma "CC / ProductCard": pack shot on a grey ground with the corner badge and heart, brand
 * eyebrow, title and price, the credit line, then quantity + Add to cart. Fixed rhythm so action
 * rows align across a grid row. Multi-variant products (merchandise sizes) link to the PDP to
 * choose an option; sold-out products dim and show a disabled button.
 */
export function ProductTile({ product, onAddToCart, isLoggedIn, isFavourited, showCredit = true, showPoints = false, size = "regular", priority = false }: ProductTileProps) {
  const [qty, setQty] = useState(1);
  const [state, setState] = useState<"idle" | "added" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const href = `/products/${product.handle}`;
  const multiVariant = product.variants.length > 1;
  const variant = product.variants.find((v) => v.availableForSale) ?? product.variants[0];
  const soldOut = !product.availableForSale || !variant;
  const badge = tileBadge(product);
  const compact = size === "compact";

  function add() {
    if (!variant) return;
    setMessage(null);
    startTransition(async () => {
      const result = await onAddToCart(variant.id, qty);
      if (!result.ok) {
        setState("error");
        setMessage(result.message);
        return;
      }
      setState("added");
      announceCart(result.cart, true);
      setTimeout(() => setState("idle"), 2000);
    });
  }

  const cta = "flex h-12 flex-1 items-center justify-center rounded-full px-4 font-heading text-sm font-bold uppercase tracking-[0.05em] transition";

  return (
    <article className="flex h-full flex-col justify-between overflow-hidden rounded-3xl bg-white pb-2.5">
      <div className={`flex flex-col gap-3 border-b border-neutral-200 ${soldOut ? "opacity-45" : ""}`}>
        <div className={`relative ${compact ? "h-40" : "h-[280px]"} bg-[#f7f7f6]`}>
          <Link href={href} aria-label={product.title} className="absolute inset-0">
            {product.featuredImage ? (
              <Image
                src={product.featuredImage.url}
                alt={product.featuredImage.altText ?? product.title}
                fill
                priority={priority}
                sizes={compact ? "(min-width: 1024px) 200px, 45vw" : "(min-width: 1024px) 340px, 45vw"}
                className="object-contain p-4"
              />
            ) : null}
          </Link>
          <div className="pointer-events-none relative flex items-start justify-between p-2.5">
            {badge ? <span className="rounded-lg bg-[#8e2020] px-2 py-1 text-xs font-light uppercase tracking-[0.05em] text-white">{badge}</span> : <span />}
            <FavoriteButton productId={product.id} initiallyFavourited={isFavourited} isLoggedIn={isLoggedIn} className="pointer-events-auto border-0 bg-transparent text-brand" />
          </div>
        </div>
        <div className={`flex gap-3 px-2.5 pb-2.5 ${compact ? "flex-col gap-1" : ""}`}>
          <Link href={href} className="flex min-w-0 flex-1 flex-col text-base leading-normal">
            <span className="truncate font-semibold uppercase text-neutral-500">{product.brand}</span>
            <span className="font-medium text-neutral-900 hover:underline">{product.title}</span>
          </Link>
          <div className={`flex shrink-0 flex-col ${compact ? "items-start" : "items-end"}`}>
            <span className="font-heading text-2xl font-bold leading-[1.4] text-brand">{formatMoney(product.price)}</span>
            {showPoints && product.pointsCost ? <span className="text-xs text-neutral-500">or {product.pointsCost.toLocaleString()} points</span> : null}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-2.5 pt-3">
        <p className="min-h-7 text-sm font-light uppercase leading-7 tracking-[0.1em] text-brand">
          {soldOut ? "This item is out of stock" : showCredit && product.creditEarned ? `Earns ${formatMoney(product.creditEarned)} credit` : multiVariant ? `${product.variants.length} options` : ""}
        </p>
        {soldOut ? (
          <button type="button" disabled className={`${cta} border border-neutral-300 text-neutral-400`}>Out of stock</button>
        ) : multiVariant ? (
          <Link href={href} className={`${cta} bg-accent text-accent-fg hover:opacity-90`}>Choose options</Link>
        ) : (
          <div className={`flex gap-3 ${compact ? "flex-col gap-2" : "items-center"}`}>
            <QuantityStepper value={qty} onChange={setQty} className={compact ? "w-full" : ""} />
            <button type="button" onClick={add} disabled={pending} className={`${cta} bg-accent text-accent-fg hover:opacity-90 disabled:opacity-60 ${compact ? "w-full flex-none" : ""}`}>
              {pending ? "Adding…" : state === "added" ? "Added ✓" : "Add to cart"}
            </button>
          </div>
        )}
        {message ? <p role="alert" className="text-xs text-red-700">{message}</p> : null}
      </div>
    </article>
  );
}
