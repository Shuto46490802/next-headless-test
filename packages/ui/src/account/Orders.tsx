"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { formatMoney } from "../format";
import { announceCart, type MiniCartData } from "../cart-events";
import { AccountButton } from "./AccountShell";
import { STATUS_TONE_CLASS, orderNumber, orderStatus, shortDate } from "./format";
import type { AccountOrderRowData } from "./types";

export type ReorderAction = (orderId: string) => Promise<{ ok: true; cart: MiniCartData; skipped: number } | { ok: false; message: string }>;

export function StatusBadge({ order }: { order: Pick<AccountOrderRowData, "fulfillments" | "fulfillmentStatus" | "financialStatus"> }) {
  const s = orderStatus(order);
  return <span className={`inline-flex min-w-[120px] justify-center rounded px-2 py-1 text-xs font-medium uppercase ${STATUS_TONE_CLASS[s.tone]}`}>{s.label}</span>;
}

/** Shared by the dashboard's Recent orders and the Orders & invoices page. */
export function OrdersTable({ orders, onReorder }: { orders: AccountOrderRowData[]; onReorder?: ReorderAction }) {
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function reorder(id: string) {
    if (!onReorder) return;
    setPending(id);
    setMessage(null);
    const r = await onReorder(id);
    setPending(null);
    if (!r.ok) return setMessage(r.message);
    announceCart(r.cart, true);
    if (r.skipped) setMessage(`${r.skipped} ${r.skipped === 1 ? "item is" : "items are"} no longer available and weren't added.`);
  }

  if (orders.length === 0) return <p className="py-8 text-center text-sm text-neutral-500">No orders yet.</p>;
  const tracking = (o: AccountOrderRowData) => o.fulfillments.flatMap((f) => f.tracking.map((t) => t.number)).filter(Boolean).join(", ");

  return (
    <div className="flex flex-col gap-2">
      {message ? <p role="status" className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">{message}</p> : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead>
            <tr className="border-b border-neutral-200 font-heading text-lg text-brand">
              <th className="py-2.5 pr-3 font-bold">Order number</th>
              <th className="py-2.5 pr-3 font-bold">Order placed</th>
              <th className="py-2.5 pr-3 font-bold">Ordered by</th>
              <th className="py-2.5 pr-3 font-bold">Tracking #</th>
              <th className="py-2.5 pr-3 font-bold">Order status</th>
              <th className="py-2.5 pr-3 font-bold">Total paid</th>
              <th className="py-2.5"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-neutral-200">
                <td className="py-2.5 pr-3 text-sm">
                  <Link href={`/account/orders/${encodeURIComponent(o.id)}`} className="font-medium text-brand hover:underline">#{orderNumber(o.name)}</Link>
                </td>
                <td className="py-2.5 pr-3 text-xs text-neutral-500">{shortDate(o.processedAt)}</td>
                <td className="py-2.5 pr-3 text-xs text-neutral-500">{o.orderedBy ?? "—"}</td>
                <td className="py-2.5 pr-3 text-xs text-neutral-500">{tracking(o) || "—"}</td>
                <td className="py-2.5 pr-3"><StatusBadge order={o} /></td>
                <td className="py-2.5 pr-3 text-sm">{formatMoney(o.totalPrice)}</td>
                <td className="py-2.5 text-right">
                  {onReorder ? (
                    <AccountButton variant="tertiary" onClick={() => reorder(o.id)} disabled={pending !== null}>
                      {pending === o.id ? "Adding…" : "Reorder"}
                    </AccountButton>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Orders & invoices toolbar: order-number search, All users / Only mine (company accounts),
 * and CSV export of the loaded rows. State lives in the URL (`q`, `scope`, `count`).
 */
export function OrdersToolbar({ orders, canSeeAll }: { orders: AccountOrderRowData[]; canSeeAll: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pendingNav, start] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const scope = params.get("scope") === "mine" || !canSeeAll ? "mine" : "all";

  function go(mutate: (p: URLSearchParams) => void) {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    next.delete("count");
    start(() => router.push(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false }));
  }

  function exportCsv() {
    const rows = [["Order number", "Order placed", "Ordered by", "Tracking", "Status", "Total paid"]];
    for (const o of orders) {
      rows.push([
        orderNumber(o.name),
        o.processedAt.slice(0, 10),
        o.orderedBy ?? "",
        o.fulfillments.flatMap((f) => f.tracking.map((t) => t.number ?? "")).join(" "),
        orderStatus(o).label,
        o.totalPrice.amount,
      ]);
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "orders.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={`flex flex-col gap-4 ${pendingNav ? "opacity-70" : ""}`}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go((p) => (q.trim() ? p.set("q", q.trim()) : p.delete("q")));
        }}
        className="flex w-full max-w-sm items-center gap-2 rounded border border-neutral-300 px-3 py-2.5"
      >
        <svg viewBox="0 0 20 20" className="h-5 w-5 text-brand" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden><circle cx="9" cy="9" r="5.5" /><path d="m13 13 4 4" /></svg>
        <input value={q} onChange={(e) => setQ(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" placeholder="Search by order number" aria-label="Search by order number" className="w-full bg-transparent text-base outline-none" />
      </form>
      <div className="flex items-center gap-4 border-b border-neutral-200 pb-2 text-sm">
        {canSeeAll ? (
          <div role="tablist" className="flex items-center gap-3">
            {(["all", "mine"] as const).map((s) => (
              <button
                key={s}
                role="tab"
                aria-selected={scope === s}
                onClick={() => go((p) => (s === "all" ? p.delete("scope") : p.set("scope", "mine")))}
                className={`pb-1 ${scope === s ? "border-b-2 border-brand text-brand" : "text-neutral-500 hover:text-brand"}`}
              >
                {s === "all" ? "All users" : "Only mine"}
              </button>
            ))}
          </div>
        ) : null}
        <button type="button" onClick={exportCsv} disabled={orders.length === 0} className="ml-auto text-sm uppercase text-brand hover:underline disabled:opacity-40">Export CSV</button>
      </div>
    </div>
  );
}

export function OrdersLoadMore({ shown, hasNextPage }: { shown: number; hasNextPage: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  if (!hasNextPage) return null;
  return (
    <div className="flex justify-center py-8">
      <AccountButton
        disabled={pending}
        onClick={() => {
          const next = new URLSearchParams(params.toString());
          next.set("count", String(shown + 20));
          start(() => router.push(`${pathname}?${next}`, { scroll: false }));
        }}
      >
        {pending ? "Loading…" : "Load more"}
      </AccountButton>
    </div>
  );
}
