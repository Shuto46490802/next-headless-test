"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { formatMoney } from "../format";
import { Icon } from "../cms/primitives";
import { perUnitLabel } from "./format";
import type { TileProductData } from "./types";

export interface PredictiveData {
  queries: string[];
  collections: { handle: string; title: string }[];
  products: TileProductData[];
  /** Full match count for "See all N results"; null when unknown. */
  total: number | null;
}

const MIN_CHARS = 3;
const RECENT_KEY = "recent-searches";
const RECENT_MAX = 5;

function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

export function rememberSearch(q: string) {
  const term = q.trim();
  if (!term) return;
  try {
    const next = [term, ...readRecent().filter((r) => r.toLowerCase() !== term.toLowerCase())].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
}

/** Bolds the typed term inside a suggestion, as in the design ("asahi **lager**"). */
function Highlight({ text, term }: { text: string; term: string }) {
  const i = text.toLowerCase().indexOf(term.toLowerCase());
  if (!term || i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <strong className="font-semibold">{text.slice(i, i + term.length)}</strong>
      {text.slice(i + term.length)}
    </>
  );
}

/**
 * Figma "Search overlay": opens from the third character. Left panel (light blue) holds query
 * suggestions, matching categories and recent searches; the right holds product matches with
 * credit and per-unit pricing, and "See all N results" goes to the results page. Results come
 * from `endpoint` (Storefront predictiveSearch, proxied by the app so the token stays server-side).
 */
export function HeaderSearch({ placeholder = "Search products", endpoint = "/api/search/predictive", showCredit = true, className = "" }: { placeholder?: string; endpoint?: string; showCredit?: boolean; className?: string }) {
  const router = useRouter();
  const listId = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<PredictiveData | null>(null);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const term = q.trim();

  useEffect(() => {
    if (term.length < MIN_CHARS) {
      setData(null);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`${endpoint}?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? (r.json() as Promise<PredictiveData>) : null))
        .then((d) => setData(d))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [term, endpoint]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function go(value: string) {
    const v = value.trim();
    if (!v) return;
    rememberSearch(v);
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(v)}`);
  }

  const showPanel = open && term.length >= MIN_CHARS;
  const products = data?.products ?? [];
  const total = data?.total ?? products.length;

  return (
    <div ref={wrap} className={`relative ${className}`} onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go(q);
        }}
        className={`flex items-center gap-3 rounded-full border px-4 py-2.5 transition ${showPanel ? "border-brand" : "border-neutral-300"}`}
      >
        <Icon name="search" className="h-5 w-5 shrink-0 text-brand" />
        <input
          name="q"
          type="search"
          value={q}
          autoComplete="off"
          placeholder={placeholder}
          aria-label="Search products"
          aria-expanded={showPanel}
          aria-controls={listId}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setRecent(readRecent());
            setOpen(true);
          }}
          className="w-full bg-transparent text-sm outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {q ? (
          <button type="button" aria-label="Clear search" onClick={() => setQ("")} className="text-lg leading-none text-neutral-500">×</button>
        ) : null}
      </form>

      {showPanel ? (
        <div id={listId} className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 md:-right-40 lg:-right-64">
          <div className="grid md:grid-cols-[280px_1fr]">
            <div className="flex flex-col gap-6 bg-brand-tint p-6">
              <Group title="Suggestions">
                {(data?.queries.length ? data.queries : [term]).slice(0, 5).map((s) => (
                  <li key={s}>
                    <button type="button" onClick={() => go(s)} className="flex w-full items-center gap-2 text-left text-sm text-neutral-900 hover:text-brand">
                      <Icon name="search" className="h-4 w-4 text-brand" />
                      <Highlight text={s} term={term} />
                    </button>
                  </li>
                ))}
              </Group>
              {data?.collections.length ? (
                <Group title="In categories">
                  {data.collections.slice(0, 4).map((c) => (
                    <li key={c.handle}>
                      <Link href={`/collections/${c.handle}`} onClick={() => setOpen(false)} className="text-sm text-brand hover:underline">{c.title}</Link>
                    </li>
                  ))}
                </Group>
              ) : null}
              {recent.length ? (
                <Group title="Recent searches">
                  {recent.map((r) => (
                    <li key={r}>
                      <button type="button" onClick={() => go(r)} className="text-left text-sm text-neutral-600 hover:text-brand">{r}</button>
                    </li>
                  ))}
                </Group>
              ) : null}
            </div>

            <div className="flex flex-col p-6">
              <p className="mb-3 font-heading text-sm font-bold uppercase tracking-[0.05em] text-neutral-500">
                Products{products.length ? ` · ${total} ${total === 1 ? "match" : "matches"}` : ""}
              </p>
              {products.length === 0 ? (
                <p className="py-6 text-sm text-neutral-500">{loading ? "Searching…" : `No products match “${term}”.`}</p>
              ) : (
                <ul className="flex flex-col divide-y divide-neutral-100">
                  {products.slice(0, 4).map((p) => {
                    const unit = perUnitLabel(p.price, p.caseQuantity, p.container, "short");
                    const meta = [showCredit && p.creditEarned ? `Earns ${formatMoney(p.creditEarned)}` : null, unit].filter(Boolean).join(" · ");
                    return (
                      <li key={p.id}>
                        <Link href={`/products/${p.handle}`} onClick={() => rememberSearch(term)} className="flex items-center gap-4 py-3 hover:bg-neutral-50">
                          <span className="relative h-16 w-[52px] shrink-0 rounded bg-[#f7f7f6]">
                            {p.featuredImage ? <Image src={p.featuredImage.url} alt="" fill sizes="52px" className="object-contain p-1" /> : null}
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-sm font-medium text-neutral-900"><Highlight text={p.title} term={term} /></span>
                            {meta ? <span className="text-xs uppercase tracking-[0.05em] text-brand">{meta}</span> : null}
                          </span>
                          <span className="font-heading text-lg font-bold text-brand">{formatMoney(p.price)}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              <button type="button" onClick={() => go(term)} className="mt-4 h-12 rounded-full bg-brand font-heading text-sm font-bold uppercase tracking-wide text-white hover:opacity-90">
                See all {data?.total ?? ""} results
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 font-heading text-xs font-bold uppercase tracking-[0.05em] text-neutral-500">{title}</p>
      <ul className="flex flex-col gap-2.5">{children}</ul>
    </div>
  );
}
