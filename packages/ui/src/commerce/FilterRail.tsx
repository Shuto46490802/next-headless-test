"use client";

import { useState } from "react";
import { formatMoney } from "../format";
import { isPriceInput, parsePrice, sameInput, useListingParams } from "./listing-params";
import type { FilterValueData, ListingFilterData } from "./types";

const PRICE_BANDS: { label: string; min?: number; max?: number }[] = [
  { label: "Under $30", max: 30 },
  { label: "$30 to $50", min: 30, max: 50 },
  { label: "$50 to $70", min: 50, max: 70 },
  { label: "$70 to $100", min: 70, max: 100 },
  { label: "$100 & above", min: 100 },
];

const QUICK_SALE = "badge:quick-sale";
const isBadgeValue = (v: FilterValueData) => v.input.includes('"badge:') || v.label.startsWith("badge:");
const CHIP_LABELS = /pack|size/i;

/** Human label for an applied filter input, for the toolbar chips. */
export function appliedLabel(input: string, filters: ListingFilterData[]): string {
  if (isPriceInput(input)) {
    const p = parsePrice(input);
    const band = PRICE_BANDS.find((b) => b.min === p?.min && b.max === p?.max);
    if (band) return band.label;
    const fmt = (n: number) => formatMoney({ amount: String(n), currencyCode: "AUD" }).replace(/\.00$/, "");
    if (p?.min != null && p?.max != null) return `${fmt(p.min)} to ${fmt(p.max)}`;
    return p?.min != null ? `${fmt(p.min)} & above` : `Under ${fmt(p?.max ?? 0)}`;
  }
  if (input.includes(QUICK_SALE)) return "Quick Sale";
  for (const f of filters) for (const v of f.values) if (sameInput(v.input, input)) return f.id === "filter.v.availability" ? "In stock only" : v.label;
  return "Filter";
}

/**
 * Figma "Filter/Rail": count header with Clear all, the Quick Sale toggle, price bands with a
 * min/max range, checkbox facets (Category, Brand) with counts, chip facets (Pack size) and the
 * In stock only toggle. Facets are whatever Search & Discovery returns for this listing, so the
 * merchant controls which appear and in what order from the app.
 */
export function FilterRail({ filters, total, onDone }: { filters: ListingFilterData[]; total: number | null; onDone?: () => void }) {
  const { active, toggle, setPrice, clear, pending } = useListingParams();
  const isActive = (input: string) => active.some((a) => sameInput(a, input));

  const quickSale = filters.flatMap((f) => f.values).find((v) => v.input.includes(QUICK_SALE));
  const availability = filters.find((f) => f.id === "filter.v.availability");
  const inStock = availability?.values.find((v) => v.input.includes('"available":true'));
  const facets = filters.filter((f) => f !== availability);

  return (
    <aside className={`flex flex-col border-r border-neutral-200 bg-white ${pending ? "opacity-70" : ""}`} aria-label="Filters">
      <div className="flex flex-col gap-2 border-b border-neutral-900 px-[18px] pb-3.5 pt-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-heading text-xl font-bold text-brand">Filter</h2>
          {active.length > 0 ? (
            <button type="button" onClick={clear} className="text-xs text-neutral-500 underline">Clear all ({active.length})</button>
          ) : null}
        </div>
        {total != null ? <p className="text-xs font-medium uppercase text-neutral-500">{total} products</p> : null}
      </div>

      {quickSale ? (
        <ToggleRow label="Quick Sale only" hint="Shorter dates, sharper prices" checked={isActive(quickSale.input)} onChange={() => toggle(quickSale.input)} />
      ) : null}

      {facets.map((f) => {
        if (f.type === "PRICE_RANGE") return <PriceSection key={f.id} label={f.label} active={active.find(isPriceInput) ?? null} onSet={setPrice} />;
        const values = f.values.filter((v) => !isBadgeValue(v));
        if (values.length === 0) return null;
        if (f.type === "BOOLEAN") {
          const yes = values.find((v) => v.input.includes("true")) ?? values[0]!;
          return <ToggleRow key={f.id} label={f.label} checked={isActive(yes.input)} onChange={() => toggle(yes.input)} />;
        }
        return (
          <Section key={f.id} label={f.label}>
            {CHIP_LABELS.test(f.label) ? (
              <div className="flex flex-wrap gap-2">
                {values.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => toggle(v.input)}
                    disabled={v.count === 0 && !isActive(v.input)}
                    aria-pressed={isActive(v.input)}
                    className={`rounded-full px-3.5 py-1.5 text-xs transition disabled:opacity-40 ${isActive(v.input) ? "border-[1.5px] border-neutral-900 text-neutral-900" : "border border-neutral-300 text-neutral-500 hover:border-neutral-500"}`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            ) : (
              <CheckboxList values={values} isActive={isActive} onToggle={toggle} />
            )}
          </Section>
        );
      })}

      {inStock ? <ToggleRow label="In Stock Only" checked={isActive(inStock.input)} onChange={() => toggle(inStock.input)} /> : null}

      {onDone ? (
        <div className="sticky bottom-0 mt-auto border-t border-neutral-200 bg-white p-4 lg:hidden">
          <button type="button" onClick={onDone} className="h-12 w-full rounded-full bg-brand font-heading text-sm font-bold uppercase tracking-wide text-white">
            Show {total ?? ""} products
          </button>
        </div>
      ) : null}
    </aside>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <details open className="group border-b border-dashed border-neutral-200 px-5 py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-neutral-900 [&::-webkit-details-marker]:hidden">
        {label}
        <svg viewBox="0 0 12 12" className="h-3 w-3 transition group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden><path d="M2 4.5 6 8l4-3.5" /></svg>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 border-b border-dashed border-neutral-200 px-[18px] py-4">
      <span className="flex flex-1 flex-col text-xs">
        <span className="text-neutral-900">{label}</span>
        {hint ? <span className="text-neutral-500">{hint}</span> : null}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={onChange} className="peer sr-only" />
      <span aria-hidden className="relative h-[22px] w-10 rounded-full bg-neutral-200 transition peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand after:absolute after:left-0.5 after:top-0.5 after:h-[18px] after:w-[18px] after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-[18px]" />
    </label>
  );
}

function CheckboxList({ values, isActive, onToggle }: { values: FilterValueData[]; isActive: (i: string) => boolean; onToggle: (i: string) => void }) {
  const [all, setAll] = useState(false);
  const shown = all ? values : values.slice(0, 5);
  return (
    <div className="flex flex-col gap-2.5">
      {shown.map((v) => {
        const on = isActive(v.input);
        const empty = v.count === 0 && !on;
        return (
          <label key={v.id} className={`flex cursor-pointer items-center gap-2.5 text-xs ${empty ? "opacity-45" : ""}`}>
            <input type="checkbox" checked={on} disabled={empty} onChange={() => onToggle(v.input)} className="h-5 w-5 shrink-0 rounded border-neutral-400 accent-[var(--brand-color)]" />
            <span className="flex-1 text-neutral-900">{v.label}</span>
            <span className="text-neutral-500">({v.count})</span>
          </label>
        );
      })}
      {values.length > 5 ? (
        <button type="button" onClick={() => setAll(!all)} className="self-start text-xs text-neutral-500 underline">
          {all ? "Show fewer" : `Show all ${values.length}`}
        </button>
      ) : null}
    </div>
  );
}

function PriceSection({ label, active, onSet }: { label: string; active: string | null; onSet: (r: { min?: number; max?: number } | null) => void }) {
  const current = active ? parsePrice(active) : null;
  const [min, setMin] = useState(current?.min != null ? String(current.min) : "");
  const [max, setMax] = useState(current?.max != null ? String(current.max) : "");

  function apply() {
    const lo = min === "" ? undefined : Number(min);
    const hi = max === "" ? undefined : Number(max);
    if (lo === current?.min && hi === current?.max) return;
    if (lo == null && hi == null) return onSet(null);
    onSet({ ...(lo != null && Number.isFinite(lo) ? { min: lo } : {}), ...(hi != null && Number.isFinite(hi) ? { max: hi } : {}) });
  }

  return (
    <Section label={label}>
      <div className="grid grid-cols-2 gap-[7px]">
        {PRICE_BANDS.map((b, i) => {
          const on = current?.min === b.min && current?.max === b.max;
          return (
            <button
              key={b.label}
              type="button"
              aria-pressed={on}
              onClick={() => {
                if (on) return onSet(null);
                setMin(b.min != null ? String(b.min) : "");
                setMax(b.max != null ? String(b.max) : "");
                onSet({ ...(b.min != null ? { min: b.min } : {}), ...(b.max != null ? { max: b.max } : {}) });
              }}
              className={`rounded px-2 py-2 text-center text-xs transition ${i === PRICE_BANDS.length - 1 ? "col-span-2" : ""} ${on ? "border-[1.5px] border-neutral-900 text-neutral-900" : "border border-neutral-300 text-neutral-500 hover:border-neutral-500"}`}
            >
              {b.label}
            </button>
          );
        })}
      </div>
      <form
        className="mt-3 flex items-center gap-[7px] text-xs"
        onSubmit={(e) => {
          e.preventDefault();
          apply();
        }}
      >
        <PriceInput value={min} onChange={setMin} label="Minimum price" onBlur={apply} />
        <span className="text-neutral-500">to</span>
        <PriceInput value={max} onChange={setMax} label="Maximum price" onBlur={apply} />
      </form>
    </Section>
  );
}

function PriceInput({ value, onChange, label, onBlur }: { value: string; onChange: (v: string) => void; label: string; onBlur: () => void }) {
  return (
    <label className="flex h-8 flex-1 items-center gap-1 rounded-full border border-neutral-300 px-3">
      <span className="text-neutral-400">$</span>
      <input inputMode="numeric" aria-label={label} value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ""))} onBlur={onBlur} className="w-full bg-transparent outline-none" />
    </label>
  );
}
