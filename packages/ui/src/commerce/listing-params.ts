"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

/**
 * Listing state lives in the URL so filtered views are shareable and server-rendered:
 * `filter` (repeatable, each a Search & Discovery ProductFilter input as JSON), `sort`, `count`.
 * Any filter or sort change resets `count` back to the first page.
 */
export function useListingParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const active = params.getAll("filter");

  const push = useCallback(
    (mutate: (p: URLSearchParams) => void, opts: { keepCount?: boolean } = {}) => {
      const next = new URLSearchParams(params.toString());
      mutate(next);
      if (!opts.keepCount) next.delete("count");
      const qs = next.toString();
      startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    },
    [params, pathname, router],
  );

  const setFilters = useCallback(
    (inputs: string[]) =>
      push((p) => {
        p.delete("filter");
        for (const i of inputs) p.append("filter", i);
      }),
    [push],
  );

  const toggle = useCallback(
    (input: string) => setFilters(active.includes(input) ? active.filter((a) => a !== input) : [...active, input]),
    [active, setFilters],
  );

  /** Replaces any price filter with a new range (either bound optional). Pass null to clear. */
  const setPrice = useCallback(
    (range: { min?: number; max?: number } | null) => {
      const rest = active.filter((a) => !isPriceInput(a));
      setFilters(range ? [...rest, JSON.stringify({ price: range })] : rest);
    },
    [active, setFilters],
  );

  const setSort = useCallback((sort: string) => push((p) => (sort === "recommended" ? p.delete("sort") : p.set("sort", sort))), [push]);

  const loadMore = useCallback(
    (count: number) => push((p) => p.set("count", String(count)), { keepCount: true }),
    [push],
  );

  return { active, toggle, setFilters, setPrice, setSort, loadMore, pending, clear: () => setFilters([]) };
}

export function isPriceInput(input: string) {
  return input.includes('"price"');
}

export function parsePrice(input: string): { min?: number; max?: number } | null {
  try {
    const v = JSON.parse(input) as { price?: { min?: number; max?: number } };
    return v.price ?? null;
  } catch {
    return null;
  }
}

/** Two inputs are the same filter even if key order differs. */
export function sameInput(a: string, b: string) {
  if (a === b) return true;
  try {
    return JSON.stringify(sortKeys(JSON.parse(a))) === JSON.stringify(sortKeys(JSON.parse(b)));
  } catch {
    return false;
  }
}

function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, sortKeys(x)]));
  return v;
}
