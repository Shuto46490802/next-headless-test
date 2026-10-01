"use client";

import Image from "next/image";
import { useState } from "react";
import { formatMoney } from "../format";
import { announceCart, type MiniCartData } from "../cart-events";
import { AccountButton } from "./AccountShell";
import { StatusBadge } from "./Orders";
import { AddToListButton, type AddToListActions } from "./ShoppingLists";
import { STATUS_TONE_CLASS, TIMELINE_STEPS, dateTime, longDate, orderNumber, orderStatus, shipmentStep } from "./format";
import type { AccountFulfillmentData, AccountMoney, AccountOrderRowData } from "./types";

export interface AccountOrderAddressData {
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  zoneCode: string | null;
  zip: string | null;
  territoryCode: string | null;
}

export interface AccountOrderDetailData extends AccountOrderRowData {
  updatedAt: string;
  note: string | null;
  subtotal: AccountMoney | null;
  totalTax: AccountMoney | null;
  totalShipping: AccountMoney | null;
  discounts: { code: string | null; amount: AccountMoney | null; percentage: number | null }[];
  paymentMethod: string | null;
  shippingAddress: AccountOrderAddressData | null;
  billingAddress: AccountOrderAddressData | null;
  shippingMethod: string | null;
  lineItems: {
    id: string;
    title: string;
    variantTitle: string | null;
    quantity: number;
    productId: string | null;
    variantId: string | null;
    totalPrice: AccountMoney | null;
    image: { url: string; altText: string | null } | null;
    /** Per unit credit, when the product still exists. */
    creditEarned?: AccountMoney | null;
    packLabel?: string | null;
  }[];
}

export type ReorderLinesAction = (lines: { variantId: string; quantity: number }[]) => Promise<{ ok: true; cart: MiniCartData; skipped: number } | { ok: false; message: string }>;

function Address({ a }: { a: AccountOrderAddressData | null }) {
  if (!a) return <p className="text-xs text-neutral-500">—</p>;
  const name = [a.firstName, a.lastName].filter(Boolean).join(" ");
  return (
    <div className="flex flex-col text-xs text-neutral-600">
      {name ? <p className="text-sm font-bold text-neutral-900">{name}</p> : null}
      {a.company ? <p>{a.company}</p> : null}
      {a.address1 ? <p>{a.address1}</p> : null}
      {a.address2 ? <p>{a.address2}</p> : null}
      <p>{[a.city, a.zoneCode, a.zip].filter(Boolean).join(" ")}</p>
      {a.territoryCode ? <p>{a.territoryCode === "AU" ? "Australia" : a.territoryCode}</p> : null}
    </div>
  );
}

function Timeline({ f, index, total }: { f: AccountFulfillmentData; index: number; total: number }) {
  const step = shipmentStep(f);
  const at = (status: string) => f.events?.find((e) => e.status === status)?.happenedAt;
  const dates = [null, f.createdAt ?? null, at("IN_TRANSIT") ?? null, at("OUT_FOR_DELIVERY") ?? null, at("DELIVERED") ?? null];
  return (
    <div className="flex flex-col gap-2">
      {total > 1 ? <p className="text-xs font-medium uppercase text-neutral-500">Shipment {index + 1} of {total}</p> : null}
      <ol className="flex flex-col gap-1.5">
        {TIMELINE_STEPS.map((label, i) => {
          if (i === 2 && step !== 2 && !dates[2]) return null; // In transit only shows when a carrier reports it
          const done = i <= step;
          return (
            <li key={label} className="flex items-center gap-2 text-xs">
              <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${done ? "bg-brand" : "border border-neutral-300"}`} />
              <span className={done ? "font-medium text-brand" : "text-neutral-400"}>{label}</span>
              {dates[i] ? <span className="text-neutral-500">· {longDate(dates[i]!)}</span> : null}
            </li>
          );
        })}
      </ol>
      {f.tracking.map((t, ti) =>
        t.number ? (
          <p key={ti} className="text-xs text-neutral-600">
            {t.company ? `${t.company} · ` : ""}Tracking ID:{" "}
            {t.url ? <a href={t.url} target="_blank" rel="noreferrer" className="text-brand underline">{t.number}</a> : t.number}
          </p>
        ) : null,
      )}
    </div>
  );
}

/**
 * Figma "Order detail": order head with status and Print invoice, the five-cell info strip,
 * selectable order contents (Reorder / Add to favourites act on the ticked lines, or all when
 * none are ticked), Payment summary, Order comments, and Shipping & billing with one delivery
 * timeline per shipment.
 */
export function OrderDetailView({
  order,
  showCredit = false,
  onReorder,
  onAddToFavourites,
  listActions = null,
  reportHref,
}: {
  order: AccountOrderDetailData;
  showCredit?: boolean;
  onReorder?: ReorderLinesAction;
  onAddToFavourites?: (productIds: string[]) => Promise<void>;
  /** "Add to list" for the ticked lines (or all), replacing Add to favourites. */
  listActions?: AddToListActions | null;
  reportHref?: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<"reorder" | "fav" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const status = orderStatus(order);
  const items = order.lineItems.reduce((n, l) => n + l.quantity, 0);
  const creditTotal = showCredit ? order.lineItems.reduce((n, l) => n + (l.creditEarned ? Number(l.creditEarned.amount) * l.quantity : 0), 0) : 0;
  const currency = order.totalPrice.currencyCode;
  const chosen = order.lineItems.filter((l) => selected.size === 0 || selected.has(l.id));

  async function reorder() {
    if (!onReorder) return;
    setBusy("reorder");
    setMessage(null);
    const r = await onReorder(chosen.filter((l) => l.variantId).map((l) => ({ variantId: l.variantId!, quantity: l.quantity })));
    setBusy(null);
    if (!r.ok) return setMessage(r.message);
    announceCart(r.cart, true);
    if (r.skipped) setMessage(`${r.skipped} ${r.skipped === 1 ? "item is" : "items are"} no longer available and weren't added.`);
  }

  async function favourite() {
    if (!onAddToFavourites) return;
    setBusy("fav");
    await onAddToFavourites(chosen.map((l) => l.productId).filter((id): id is string => Boolean(id)));
    setBusy(null);
    setMessage("Added to your favourites.");
  }

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const cells: [string, string][] = [
    ["Order date", longDate(order.processedAt)],
    ["Last updated", longDate(order.updatedAt)],
    ["Order status", status.label],
    ["Created by", order.orderedBy ?? "—"],
    ["Payment method", order.paymentMethod ?? "—"],
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-heading text-3xl font-bold text-brand">Order # {orderNumber(order.name)}</h2>
            <StatusBadge order={order} />
          </div>
          <p className="text-sm text-neutral-600">
            Placed {dateTime(order.processedAt)}
            {order.orderedBy ? ` by ${order.orderedBy}` : ""} · {items} {items === 1 ? "item" : "items"}
            {creditTotal > 0 ? ` · earns ${formatMoney({ amount: creditTotal.toFixed(2), currencyCode: currency })} credit` : ""}
          </p>
        </div>
        <AccountButton onClick={() => window.print()}>Print invoice</AccountButton>
      </div>

      <dl className="grid grid-cols-2 divide-neutral-200 rounded-2xl border border-neutral-200 sm:grid-cols-3 lg:grid-cols-5 lg:divide-x">
        {cells.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-1 p-4">
            <dt className="text-xs font-medium uppercase text-neutral-500">{k}</dt>
            <dd className="text-sm text-neutral-900">{v}</dd>
          </div>
        ))}
      </dl>

      {message ? <p role="status" className="rounded bg-brand-tint px-3 py-2 text-sm text-brand">{message}</p> : null}

      <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,420px)]">
        <section className="flex flex-col gap-4">
          <h3 className="font-heading text-lg font-bold uppercase text-brand">Order contents</h3>
          <ul className="flex flex-col gap-3">
            {order.lineItems.map((l) => (
              <li key={l.id} className="flex items-center gap-3">
                <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggle(l.id)} aria-label={`Select ${l.title}`} className="h-[18px] w-[18px] shrink-0 accent-[var(--brand-color)]" />
                <span className="relative h-24 w-[74px] shrink-0 overflow-hidden rounded bg-[#f7f7f6]">
                  {l.image ? <Image src={l.image.url} alt={l.image.altText ?? l.title} fill sizes="74px" className="object-contain p-1" /> : null}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-neutral-900">
                      {l.quantity}x {l.title}
                    </p>
                    {l.totalPrice ? <p className="text-sm font-medium">{formatMoney(l.totalPrice)}</p> : null}
                  </div>
                  {l.packLabel || (l.variantTitle && l.variantTitle !== "Default Title") ? (
                    <p className="text-xs uppercase text-neutral-500">{[l.packLabel, l.variantTitle !== "Default Title" ? l.variantTitle : null].filter(Boolean).join(" · ")}</p>
                  ) : null}
                  {showCredit && l.creditEarned ? (
                    <p className="text-xs uppercase text-brand">Earned {formatMoney({ amount: (Number(l.creditEarned.amount) * l.quantity).toFixed(2), currencyCode: l.creditEarned.currencyCode })} credit</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3">
            {onReorder ? <AccountButton variant="primary" onClick={reorder} disabled={busy !== null}>{busy === "reorder" ? "Adding…" : selected.size ? `Reorder ${selected.size} selected` : "Reorder"}</AccountButton> : null}
            {listActions ? (
              <AddToListButton
                productIds={[...new Set(chosen.map((l) => l.productId).filter((id): id is string => Boolean(id)))]}
                actions={listActions}
                label={selected.size ? `Add ${selected.size} selected to list` : "Add to list"}
                className="self-center"
              />
            ) : onAddToFavourites ? (
              <AccountButton onClick={favourite} disabled={busy !== null}>{busy === "fav" ? "Saving…" : "Add to favourites"}</AccountButton>
            ) : null}
          </div>
        </section>

        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-2 rounded-2xl bg-brand-tint p-5 text-sm text-brand">
            <h3 className="font-heading text-lg font-bold uppercase">Payment summary</h3>
            {order.subtotal ? <Row k="Subtotal" v={formatMoney(order.subtotal)} /> : null}
            {order.totalShipping && Number(order.totalShipping.amount) > 0 ? <Row k="Delivery" v={formatMoney(order.totalShipping)} /> : null}
            {order.totalTax ? <Row k="Tax" v={formatMoney(order.totalTax)} /> : null}
            {order.discounts.map((d, i) => (
              <Row key={i} k={d.code ? `Coupon ${d.code}` : "Discount"} v={d.amount ? `-${formatMoney(d.amount)}` : d.percentage != null ? `-${d.percentage}%` : ""} />
            ))}
            <div className="my-1 h-px bg-brand/20" />
            <div className="flex items-baseline justify-between font-heading font-bold">
              <span className="text-base">Grand total</span>
              <span className="text-2xl">{formatMoney(order.totalPrice)}</span>
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="font-heading text-lg font-bold uppercase text-brand">Order comments</h3>
            <p className="min-h-24 whitespace-pre-line rounded-2xl border border-neutral-200 p-4 text-xs text-neutral-600">{order.note || "No comments on this order."}</p>
            {reportHref ? <a href={reportHref} className="self-end font-heading text-sm font-bold uppercase text-brand hover:underline">Report a problem</a> : null}
          </section>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h3 className="font-heading text-lg font-bold uppercase text-brand">Shipping &amp; billing</h3>
        <div className="grid divide-neutral-200 rounded-2xl border border-neutral-200 md:grid-cols-3 md:divide-x">
          <div className="flex flex-col gap-2 p-4">
            <p className="text-xs font-medium uppercase text-neutral-500">Billed to</p>
            <Address a={order.billingAddress} />
          </div>
          <div className="flex flex-col gap-2 p-4">
            <p className="text-xs font-medium uppercase text-neutral-500">Delivered to</p>
            <Address a={order.shippingAddress} />
          </div>
          <div className="flex flex-col gap-3 p-4">
            <p className="text-xs font-medium uppercase text-neutral-500">Shipping details</p>
            <span className={`self-start rounded px-2 py-1 text-xs font-medium uppercase ${STATUS_TONE_CLASS[status.tone]}`}>{status.label}</span>
            {order.shippingMethod ? <p className="text-sm font-bold text-neutral-900">{order.shippingMethod}</p> : null}
            {order.fulfillments.length === 0 ? <p className="text-xs text-neutral-500">Not shipped yet.</p> : order.fulfillments.map((f, i) => <Timeline key={i} f={f} index={i} total={order.fulfillments.length} />)}
          </div>
        </div>
      </section>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span>{k}</span>
      <span>{v}</span>
    </div>
  );
}
