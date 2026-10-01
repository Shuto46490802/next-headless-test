"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { formatMoney } from "../format";
import { announceCart } from "../cart-events";
import { FavoriteButton } from "../components/FavoriteButton";
import { QuantityStepper } from "./QuantityStepper";
import { perUnitLabel, savingLabel } from "./format";
import type { AddToCartAction, MoneyData, TileVariantData } from "./types";

export interface ProductDetailVariant extends TileVariantData {
  image: { url: string; altText: string | null } | null;
}

export interface ProductDetailData {
  id: string;
  handle: string;
  title: string;
  brand: string;
  /** Eyebrow after the brand, e.g. the product type ("ASAHI · BEER"). */
  eyebrowDetail?: string | null;
  availableForSale: boolean;
  images: { url: string; altText: string | null }[];
  options: { name: string; values: string[] }[];
  variants: ProductDetailVariant[];
  creditEarned: MoneyData | null;
  caseQuantity: number | null;
  container: string | null;
  maxQuantity: number | null;
}

export interface ProductDetailProps {
  product: ProductDetailData;
  onAddToCart: AddToCartAction;
  isLoggedIn: boolean;
  isFavourited: boolean;
  /** Club Connect: "Earns $4.00 for your club". Partner Connect hides it. */
  showCredit?: boolean;
  creditLabel?: string;
}

/** Shopify gives single-variant products a "Title: Default Title" option; it isn't a real choice. */
const realOptions = (options: ProductDetailData["options"]) => options.filter((o) => !(o.values.length === 1 && o.values[0] === "Default Title"));

/**
 * Figma PDP top section: thumbnail rail + hero frame on the left, the buy panel card on the right,
 * and a sticky buy bar that slides in once the panel's add button scrolls out of view.
 */
export function ProductDetail({ product, onAddToCart, isLoggedIn, isFavourited, showCredit = true, creditLabel = "for your club" }: ProductDetailProps) {
  const options = realOptions(product.options);
  const [selected, setSelected] = useState<Record<string, string>>(() => {
    const first = product.variants.find((v) => v.availableForSale) ?? product.variants[0];
    return Object.fromEntries((first?.selectedOptions ?? []).map((o) => [o.name, o.value]));
  });
  const variant = useMemo(
    () => product.variants.find((v) => v.selectedOptions.every((o) => selected[o.name] === o.value)) ?? product.variants[0],
    [product.variants, selected],
  );
  const [qty, setQty] = useState(1);
  const [state, setState] = useState<"idle" | "added">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [activeImage, setActiveImage] = useState(0);
  const addRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  const images = product.images.length ? product.images : variant?.image ? [variant.image] : [];
  useEffect(() => {
    if (!variant?.image) return;
    const i = product.images.findIndex((img) => img.url === variant.image?.url);
    if (i >= 0) setActiveImage(i);
  }, [variant, product.images]);

  useEffect(() => {
    const el = addRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setStuck(!e!.isIntersecting && e!.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const soldOut = !variant || !variant.availableForSale;
  const max = product.maxQuantity ?? 99;
  const saving = variant ? savingLabel(variant.price, variant.compareAtPrice) : null;
  const unit = variant ? perUnitLabel(variant.price, product.caseQuantity, product.container) : null;
  const lineTotal = variant ? formatMoney({ amount: (Number(variant.price.amount) * qty).toFixed(2), currencyCode: variant.price.currencyCode }) : "";

  function add() {
    if (!variant || soldOut) return;
    setMessage(null);
    startTransition(async () => {
      const result = await onAddToCart(variant.id, qty);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setState("added");
      announceCart(result.cart, true);
      setTimeout(() => setState("idle"), 2000);
    });
  }

  const addLabel = soldOut ? "Out of stock" : pending ? "Adding…" : state === "added" ? "Added to cart ✓" : `Add to cart · ${lineTotal}`;
  const addBtn = "flex h-14 flex-1 items-center justify-center rounded-full px-6 font-heading text-lg font-bold uppercase tracking-[0.05em] transition disabled:cursor-not-allowed";
  const addTone = soldOut ? "border border-neutral-300 text-neutral-400" : "bg-accent text-accent-fg hover:opacity-90 disabled:opacity-60";

  return (
    <>
      <section className="mx-auto grid max-w-[1440px] gap-8 px-4 py-8 sm:px-10 lg:grid-cols-[1fr_minmax(0,560px)] lg:gap-12 lg:py-12">
        {/* Gallery */}
        <div className="flex flex-col-reverse gap-3 lg:flex-row lg:gap-4">
          {images.length > 1 ? (
            <ul className="flex gap-2 overflow-x-auto lg:w-[66px] lg:flex-col" aria-label="Product images">
              {images.map((img, i) => (
                <li key={img.url}>
                  <button
                    type="button"
                    onClick={() => setActiveImage(i)}
                    aria-label={`Show image ${i + 1}`}
                    aria-current={i === activeImage}
                    className={`relative block h-[66px] w-[66px] shrink-0 overflow-hidden rounded-lg bg-[#f7f7f6] ${i === activeImage ? "ring-2 ring-brand" : "ring-1 ring-neutral-200"}`}
                  >
                    <Image src={img.url} alt="" fill sizes="66px" className="object-contain p-1" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="relative aspect-square flex-1 overflow-hidden rounded-3xl bg-[#f7f7f6] lg:aspect-auto lg:min-h-[640px]">
            {images[activeImage] ? (
              <Image src={images[activeImage]!.url} alt={images[activeImage]!.altText ?? product.title} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-contain p-10" />
            ) : null}
          </div>
        </div>

        {/* Buy panel */}
        <div className="flex flex-col gap-6 rounded-3xl border border-neutral-200 p-6 sm:p-12 lg:self-start">
          <div className="flex flex-col gap-2">
            <p className="font-heading text-sm font-bold uppercase tracking-[0.05em] text-neutral-500">
              {[product.brand, product.eyebrowDetail].filter(Boolean).join(" · ")}
            </p>
            <h1 className="font-heading text-3xl font-bold leading-tight text-brand sm:text-4xl">{product.title}</h1>
          </div>

          {variant ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-end gap-3">
                <span className="font-heading text-6xl font-bold leading-none text-brand sm:text-7xl">{formatMoney(variant.price)}</span>
                {saving ? <span className="mb-2 rounded-lg bg-[#8e2020] px-2.5 py-1 text-xs font-medium uppercase tracking-[0.05em] text-white">Save {saving}</span> : null}
              </div>
              <p className="text-sm text-neutral-500">
                {variant.compareAtPrice ? <s className="mr-2">{formatMoney(variant.compareAtPrice)}</s> : null}
                {[unit, "incl. GST"].filter(Boolean).join(" · ")}
              </p>
            </div>
          ) : null}

          {showCredit && product.creditEarned ? (
            <div className="flex items-center gap-3 rounded-2xl bg-brand-tint px-4 py-3 text-brand">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">$</span>
              <p className="text-base">
                Earns <strong className="font-heading text-lg">{formatMoney(product.creditEarned)}</strong> {creditLabel}
              </p>
            </div>
          ) : null}

          {options.map((o) => (
            <fieldset key={o.name} className="flex flex-col gap-2">
              <legend className="mb-2 font-heading text-sm font-bold uppercase tracking-[0.05em] text-neutral-500">{o.name}</legend>
              <div className="flex flex-wrap gap-2">
                {o.values.map((value) => {
                  const on = selected[o.name] === value;
                  const available = product.variants.some((v) => v.availableForSale && v.selectedOptions.some((so) => so.name === o.name && so.value === value));
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setSelected((s) => ({ ...s, [o.name]: value }))}
                      className={`min-w-12 rounded-full px-4 py-2 text-sm transition ${on ? "border-[1.5px] border-brand text-brand" : "border border-neutral-300 text-neutral-700 hover:border-neutral-500"} ${available ? "" : "line-through opacity-50"}`}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}

          <dl className="divide-y divide-neutral-200 border-y border-neutral-200 text-sm">
            <div className="flex items-center justify-between py-3">
              <dt className="font-heading font-bold uppercase tracking-[0.05em] text-neutral-500">Availability</dt>
              <dd className={`flex items-center gap-2 font-medium ${soldOut ? "text-neutral-500" : "text-green-700"}`}>
                <span aria-hidden className={`h-2 w-2 rounded-full ${soldOut ? "bg-neutral-400" : "bg-green-600"}`} />
                {soldOut ? "Out of stock" : "In stock"}
              </dd>
            </div>
            {product.maxQuantity ? (
              <div className="flex items-center justify-between py-3">
                <dt className="font-heading font-bold uppercase tracking-[0.05em] text-neutral-500">Order limit</dt>
                <dd className="text-neutral-900">Max {product.maxQuantity} per order</dd>
              </div>
            ) : null}
          </dl>

          <div ref={addRef} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <QuantityStepper value={qty} onChange={setQty} max={max} disabled={soldOut} className="h-14 w-full sm:w-[120px]" />
            <div className="flex flex-1 items-center gap-3">
              <button type="button" onClick={add} disabled={soldOut || pending} className={`${addBtn} ${addTone}`}>{addLabel}</button>
              <FavoriteButton productId={product.id} initiallyFavourited={isFavourited} isLoggedIn={isLoggedIn} className="h-14 w-14 shrink-0 border border-neutral-300 text-brand" />
            </div>
          </div>
          {message ? <p role="alert" className="text-sm text-red-700">{message}</p> : null}
        </div>
      </section>

      {/* Sticky buy bar (Figma "PDP / Sticky buy bar") */}
      <div
        aria-hidden={!stuck}
        className={`fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white shadow-[0_-8px_24px_rgba(0,0,0,0.08)] transition-transform duration-200 ${stuck ? "translate-y-0" : "pointer-events-none translate-y-full"}`}
      >
        <div className="mx-auto flex max-w-[1440px] items-center gap-4 px-4 py-3 sm:px-10">
          <div className="hidden min-w-0 flex-1 flex-col md:flex">
            <p className="truncate font-heading text-2xl font-bold text-brand lg:text-[36px] lg:leading-tight">{product.title}</p>
            {showCredit && product.creditEarned ? <p className="text-sm text-brand">Earns {formatMoney(product.creditEarned)} {creditLabel}</p> : null}
          </div>
          <QuantityStepper value={qty} onChange={setQty} max={max} disabled={soldOut} />
          <button type="button" tabIndex={stuck ? 0 : -1} onClick={add} disabled={soldOut || pending} className={`${addBtn} h-12 text-sm md:max-w-xs ${addTone}`}>{addLabel}</button>
          <FavoriteButton productId={product.id} initiallyFavourited={isFavourited} isLoggedIn={isLoggedIn} className="hidden h-12 w-12 shrink-0 border border-neutral-300 text-brand sm:flex" />
        </div>
      </div>
    </>
  );
}
