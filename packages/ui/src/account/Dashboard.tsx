import Link from "next/link";
import { formatMoney } from "../format";
import type { AccountMoney } from "./types";

/** Figma "Credit Summary Panel": balance with pending / donated movements and the two actions. */
export function CreditSummary({
  label = "Club credit",
  balance,
  rows,
  spendHref = "/products",
  ledgerHref,
}: {
  label?: string;
  balance: AccountMoney | null;
  rows: { label: string; value: AccountMoney | null }[];
  spendHref?: string;
  ledgerHref?: string;
}) {
  const shown = rows.filter((r) => r.value);
  return (
    <section className="flex flex-col gap-2.5 rounded-3xl bg-brand p-5 text-white">
      <p className="font-heading text-sm font-bold uppercase text-accent">{label}</p>
      <p className="font-heading text-[40px] font-bold leading-tight">{balance ? formatMoney(balance) : "–"}</p>
      {shown.length ? (
        <dl className="flex flex-col gap-1.5">
          {shown.map((r) => (
            <div key={r.label} className="flex items-baseline justify-between">
              <dt className="text-xs text-white/75">{r.label}</dt>
              <dd className="text-sm">{formatMoney(r.value!)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <div className="mt-1 flex flex-wrap gap-2.5">
        <Link href={spendHref} className="rounded-full bg-accent px-4 py-2 font-heading text-sm font-bold uppercase tracking-[0.05em] text-brand">Spend credit</Link>
        {ledgerHref ? <Link href={ledgerHref} className="rounded-full border border-white px-4 py-2 font-heading text-sm font-bold uppercase tracking-[0.05em]">Full ledger</Link> : null}
      </div>
    </section>
  );
}

export function MetricTile({ label, value, note }: { label: string; value: string; note?: string | null }) {
  return (
    <div className="flex flex-col gap-1.5 border-t border-neutral-200 py-5">
      <p className="text-xs font-medium uppercase text-neutral-500">{label}</p>
      <p className="font-heading text-2xl font-bold text-brand">{value}</p>
      {note ? <p className="text-xs text-neutral-500">{note}</p> : null}
    </div>
  );
}

export function UserPreviewRows({ users }: { users: { id: string; name: string; email: string | null; role: string | null; muted?: boolean }[] }) {
  return (
    <ul className="flex flex-col">
      {users.map((u) => (
        <li key={u.id} className={`grid grid-cols-[1fr_1.3fr_auto] items-center gap-3 border-b border-neutral-200 py-2.5 ${u.muted ? "text-neutral-500" : ""}`}>
          <span className="truncate text-sm">{u.name}</span>
          <span className="truncate text-xs text-neutral-500">{u.email ?? ""}</span>
          <span className="text-right text-sm">{u.role ?? ""}</span>
        </li>
      ))}
    </ul>
  );
}
