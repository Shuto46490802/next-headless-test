"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { formatMoney } from "../format";
import { announceCart, type MiniCartData } from "../cart-events";
import { AccountButton } from "./AccountShell";
import { longDate } from "./format";
import type { AccountMoney } from "./types";

export type ListResult = { ok: true } | { ok: false; message: string };
export type ListCartResult = { ok: true; cart: MiniCartData; skipped: number } | { ok: false; message: string };

export interface ShoppingListSummary {
  id: string;
  /** URL segment for /account/lists/[slug]. */
  slug: string;
  name: string;
  createdBy: string | null;
  lastOrderedAt: string | null;
  lines: number;
  total: AccountMoney | null;
  credit: AccountMoney | null;
}

export interface ShoppingListItem {
  productId: string;
  handle: string;
  title: string;
  brand: string;
  image: { url: string; altText: string | null } | null;
  price: AccountMoney;
  credit: AccountMoney | null;
  available: boolean;
}

function useCartAction(onAdd: () => Promise<ListCartResult>) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const run = () =>
    start(async () => {
      setMessage(null);
      const r = await onAdd();
      if (!r.ok) return setMessage(r.message);
      announceCart(r.cart, true);
      if (r.skipped) setMessage(`${r.skipped} ${r.skipped === 1 ? "product is" : "products are"} unavailable and weren't added.`);
    });
  return { pending, message, run };
}

/** Figma "Shopping List Card": name, created by, lines · total · credit, Edit list / Add all to cart. */
export function ShoppingListCard({ list, onAddAll, showCredit = false }: { list: ShoppingListSummary; onAddAll: (listId: string) => Promise<ListCartResult>; showCredit?: boolean }) {
  const { pending, message, run } = useCartAction(() => onAddAll(list.id));
  const meta = [
    `${list.lines} ${list.lines === 1 ? "line" : "lines"}`,
    list.total ? formatMoney(list.total) : null,
    showCredit && list.credit ? `earns ${formatMoney(list.credit)} credit` : null,
  ].filter(Boolean);
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-heading text-xl font-bold text-brand">{list.name}</h3>
        <div className="flex flex-wrap gap-2">
          <AccountButton href={`/account/lists/${list.slug}`} variant="tertiary">Edit list</AccountButton>
          <AccountButton onClick={run} disabled={pending || list.lines === 0}>{pending ? "Adding…" : "Add all to cart"}</AccountButton>
        </div>
      </div>
      <div className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
        {list.createdBy ? <p className="uppercase">Created by: {list.createdBy}</p> : null}
        <p>{meta.join(" · ")}</p>
        {list.lastOrderedAt ? <p>Last ordered {longDate(list.lastOrderedAt)}</p> : null}
      </div>
      {message ? <p role="status" className="text-xs text-amber-800">{message}</p> : null}
    </article>
  );
}

export function NewListForm({ onCreate, placeholder = "New list name, e.g. Canteen weekly" }: { onCreate: (name: string) => Promise<ListResult>; placeholder?: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await onCreate(name);
          if (!r.ok) return setError(r.message);
          setName("");
          setError(null);
          router.refresh();
        });
      }}
      className="flex flex-col gap-2"
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={placeholder} aria-label="New list name" className="h-11 flex-1 rounded border border-neutral-300 px-3 outline-none focus:border-brand" />
        <AccountButton type="submit" variant="primary" disabled={pending || !name.trim()}>{pending ? "Creating…" : "Create list"}</AccountButton>
      </div>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
    </form>
  );
}

/** List detail: rename, product rows with remove, Add all to cart, delete. */
export function ShoppingListDetail({
  list,
  items,
  showCredit = false,
  actions,
}: {
  list: { id: string; name: string; createdBy: string | null; lastOrderedAt: string | null };
  items: ShoppingListItem[];
  showCredit?: boolean;
  actions: {
    rename: (listId: string, name: string) => Promise<ListResult>;
    remove: (listId: string, productId: string) => Promise<ListResult>;
    addAll: (listId: string) => Promise<ListCartResult>;
    remove_list: (listId: string) => Promise<ListResult>;
  };
}) {
  const router = useRouter();
  const [name, setName] = useState(list.name);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const cart = useCartAction(() => actions.addAll(list.id));
  const total = items.filter((i) => i.available).reduce((n, i) => n + Number(i.price.amount), 0);
  const currency = items[0]?.price.currencyCode ?? "AUD";

  const act = (fn: () => Promise<ListResult>, after?: () => void) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) return setError(r.message);
      after?.();
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-6">
      <Link href="/account/lists" className="text-sm text-brand hover:underline">← All shopping lists</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        {editing ? (
          <form
            className="flex flex-1 flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              act(() => actions.rename(list.id, name), () => setEditing(false));
            }}
          >
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} aria-label="List name" autoFocus className="h-11 min-w-0 flex-1 rounded border border-neutral-300 px-3 font-heading text-2xl font-bold text-brand outline-none focus:border-brand" />
            <AccountButton type="submit" variant="primary" disabled={pending}>Save</AccountButton>
            <AccountButton onClick={() => { setName(list.name); setEditing(false); }}>Cancel</AccountButton>
          </form>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h2 className="font-heading text-3xl font-bold text-brand">{list.name}</h2>
              <button type="button" onClick={() => setEditing(true)} className="text-sm text-brand underline">Rename</button>
            </div>
            <p className="text-xs uppercase text-neutral-500">
              {[list.createdBy ? `Created by ${list.createdBy}` : null, `${items.length} ${items.length === 1 ? "line" : "lines"}`, list.lastOrderedAt ? `last ordered ${longDate(list.lastOrderedAt)}` : null].filter(Boolean).join(" · ")}
            </p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <AccountButton variant="accent" onClick={cart.run} disabled={cart.pending || items.length === 0}>{cart.pending ? "Adding…" : `Add all to cart · ${formatMoney({ amount: total.toFixed(2), currencyCode: currency })}`}</AccountButton>
        </div>
      </div>
      {error || cart.message ? <p role="status" className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">{error ?? cart.message}</p> : null}

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
          This list is empty. Use “Add to list” on a product page or an order to add products.
        </p>
      ) : (
        <ul className={`flex flex-col ${pending ? "opacity-60" : ""}`}>
          {items.map((i) => (
            <li key={i.productId} className="flex items-center gap-3 border-b border-neutral-200 py-3">
              <Link href={`/products/${i.handle}`} className="relative h-20 w-16 shrink-0 rounded bg-[#f7f7f6]">
                {i.image ? <Image src={i.image.url} alt={i.image.altText ?? i.title} fill sizes="64px" className="object-contain p-1" /> : null}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-xs font-bold uppercase text-neutral-500">{i.brand}</span>
                <Link href={`/products/${i.handle}`} className="text-sm font-semibold text-brand hover:underline">{i.title}</Link>
                {!i.available ? <span className="text-xs uppercase text-neutral-500">Out of stock</span> : showCredit && i.credit ? <span className="text-xs uppercase text-neutral-700">Earns {formatMoney(i.credit)} credit</span> : null}
              </div>
              <span className="font-bold text-brand">{formatMoney(i.price)}</span>
              <button type="button" onClick={() => act(() => actions.remove(list.id, i.productId))} disabled={pending} aria-label={`Remove ${i.title} from list`} className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-tint text-brand disabled:opacity-40">
                <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden><path d="m3 3 6 6M9 3l-6 6" /></svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (window.confirm(`Delete “${list.name}” for everyone at your club?`)) act(() => actions.remove_list(list.id), () => router.push("/account/lists"));
        }}
        className="self-start text-sm text-red-700 underline disabled:opacity-40"
      >
        Delete list
      </button>
    </div>
  );
}

export interface AddToListActions {
  /** Lists for the picker; `has` = already contains every one of `productIds`. */
  load: (productIds: string[]) => Promise<{ id: string; name: string; has: boolean }[]>;
  add: (listId: string, productIds: string[]) => Promise<ListResult>;
  create: (name: string, productIds: string[]) => Promise<ListResult>;
}

/**
 * "Add to list" picker for the product page and order lines: shows the club's lists (ticked when
 * the products are already on them), adds with one tap, or creates a new list with them.
 */
export function AddToListButton({ productIds, actions, label = "Add to list", className = "" }: { productIds: string[]; actions: AddToListActions; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<{ id: string; name: string; has: boolean }[] | null>(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const wrap = useRef<HTMLDivElement>(null);
  const key = productIds.join(",");

  useEffect(() => {
    if (!open) return;
    setLists(null);
    actions.load(key ? key.split(",") : []).then(setLists).catch(() => setLists([]));
    const onDown = (e: MouseEvent) => wrap.current && !wrap.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key]);

  const done = (r: ListResult, text: string) => {
    if (!r.ok) return setMessage(r.message);
    setMessage(text);
    setTimeout(() => setOpen(false), 900);
  };

  return (
    <div ref={wrap} className={`relative ${className}`}>
      <button type="button" onClick={() => { setMessage(null); setOpen((o) => !o); }} disabled={productIds.length === 0} aria-haspopup="dialog" aria-expanded={open} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand underline-offset-4 hover:underline disabled:opacity-40">
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden><path d="M3 5h10M3 9h10M3 13h6M15 11v6M12 14h6" strokeLinecap="round" /></svg>
        {label}
      </button>
      {open ? (
        <div role="dialog" aria-label="Add to a shopping list" className="absolute left-0 z-40 mt-2 w-72 rounded-2xl border border-neutral-200 bg-white p-3 text-sm shadow-xl">
          <p className="mb-2 font-heading text-base font-bold text-brand">Add to a shopping list</p>
          {lists === null ? (
            <p className="py-2 text-neutral-500">Loading lists…</p>
          ) : lists.length === 0 ? (
            <p className="py-2 text-neutral-500">No lists yet. Create one below.</p>
          ) : (
            <ul className="mb-2 flex max-h-56 flex-col overflow-y-auto">
              {lists.map((l) => (
                <li key={l.id}>
                  <button type="button" disabled={pending || l.has} onClick={() => start(async () => done(await actions.add(l.id, productIds), `Added to ${l.name}`))} className="flex w-full items-center justify-between rounded px-2 py-2 text-left hover:bg-brand-tint disabled:cursor-default disabled:hover:bg-transparent">
                    <span className="truncate">{l.name}</span>
                    {l.has ? <span className="text-xs text-[#1b6b3d]">✓ On list</span> : <span className="text-xs text-brand">Add</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => done(await actions.create(name, productIds), `Created ${name.trim()}`));
            }}
            className="flex gap-2 border-t border-neutral-200 pt-2"
          >
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="New list name" aria-label="New list name" className="h-9 min-w-0 flex-1 rounded border border-neutral-300 px-2 outline-none focus:border-brand" />
            <button type="submit" disabled={pending || !name.trim()} className="rounded-full bg-brand px-3 text-xs font-bold uppercase text-white disabled:opacity-50">Create</button>
          </form>
          {message ? <p role="status" className="mt-2 text-xs text-brand">{message}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
