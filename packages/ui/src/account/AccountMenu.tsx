"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { formatMoney } from "../format";
import { LogoutButton } from "./AccountShell";
import { AccountIcon } from "./icons";
import type { AccountMoney, AccountNavGroup } from "./types";

export interface AccountMenuProps {
  firstName: string | null;
  groups: AccountNavGroup[];
  /** Club Connect / Partner Connect: credit panel. */
  credit?: { label: string; balance: AccountMoney | null; spendHref?: string; ledgerHref?: string } | null;
  /** Open orders count, fetched when the menu first opens. */
  loadOpenOrders?: () => Promise<number | null>;
}

/**
 * Figma "Account menu": the header Account button opens a right-hand panel with "Hi, Sam", the
 * navy credit panel (open orders, club credit, Spend credit / Full ledger), the account links
 * and Log out.
 */
export function AccountMenu({ firstName, groups, credit, loadOpenOrders }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [openOrders, setOpenOrders] = useState<number | null | undefined>(undefined);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    if (openOrders === undefined && loadOpenOrders) loadOpenOrders().then(setOpenOrders).catch(() => setOpenOrders(null));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, openOrders, loadOpenOrders]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} className="flex flex-col items-center gap-1 text-xs text-brand">
        <AccountIcon name="user" className="h-6 w-6" />
        Account
      </button>
      {open && mounted
        ? createPortal(
            <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Account menu">
              <button type="button" aria-label="Close account menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/40" />
              <aside className="absolute inset-y-0 right-0 flex w-[85%] max-w-[380px] flex-col bg-white shadow-2xl">
                <div className="flex items-center justify-between bg-brand-tint px-4 py-4">
                  <p className="text-xl text-brand">Hi{firstName ? `, ${firstName}` : ""}</p>
                  <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-2xl leading-none text-brand">×</button>
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-2">
                  {credit ? (
                    <div className="flex flex-col gap-4 rounded-3xl bg-brand p-4 text-white">
                      <div className="flex justify-between gap-4">
                        {loadOpenOrders ? (
                          <div>
                            <p className="font-heading text-sm font-bold uppercase text-accent">Open orders</p>
                            <p className="font-heading text-[32px] font-bold leading-tight">{openOrders == null ? "–" : openOrders}</p>
                          </div>
                        ) : null}
                        <div className="text-right">
                          <p className="font-heading text-sm font-bold uppercase text-accent">{credit.label}</p>
                          <p className="font-heading text-[32px] font-bold leading-tight">{credit.balance ? formatMoney(credit.balance) : "–"}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Link href={credit.spendHref ?? "/products"} onClick={() => setOpen(false)} className="rounded-full bg-accent px-4 py-2 font-heading text-sm font-bold uppercase tracking-[0.05em] text-brand">Spend credit</Link>
                        {credit.ledgerHref ? (
                          <Link href={credit.ledgerHref} onClick={() => setOpen(false)} className="rounded-full border border-white px-4 py-2 font-heading text-sm font-bold uppercase tracking-[0.05em] text-white">Full ledger</Link>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  <nav aria-label="Account" className="flex flex-col gap-4 px-2">
                    {groups.map((g) => (
                      <ul key={g.label} className="flex flex-col">
                        {g.items.map((it) => (
                          <li key={it.href}>
                            <Link href={it.href} onClick={() => setOpen(false)} className="flex items-center gap-2 py-2 text-sm text-brand hover:underline">
                              <AccountIcon name={it.icon} className="h-4 w-4" />
                              {it.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ))}
                  </nav>
                </div>
                <div className="p-4">
                  <LogoutButton className="h-11 w-full" />
                </div>
              </aside>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
