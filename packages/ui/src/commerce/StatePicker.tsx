"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { stateForPostcode } from "./format";

export interface StateOption {
  /** Australian state code, e.g. "VIC". */
  code: string;
  name: string;
  /** Delivery note under the name, e.g. "Next-day · order by 11am". */
  note?: string;
}

export interface DeliveryLocation {
  state: string;
  postcode: string;
}

export interface StatePickerProps {
  states: StateOption[];
  current: DeliveryLocation | null;
  onSave: (location: DeliveryLocation) => Promise<{ ok: true } | { ok: false; message: string }>;
  className?: string;
}

function PinIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path d="M10 17.5s5.5-4.9 5.5-9.5a5.5 5.5 0 1 0-11 0c0 4.6 5.5 9.5 5.5 9.5Z" />
      <circle cx="10" cy="8" r="2" />
    </svg>
  );
}

/**
 * Figma "PC · Location popover": the header chip ("Victoria · 3056") opens a card listing the
 * delivery states with their cut-off notes, a postcode field that confirms the state, and Save.
 * Below `md` the card becomes a bottom sheet. Saving stores the location server-side (cookie) and
 * refreshes, so listings re-query with the chosen state's availability filter.
 */
export function StatePicker({ states, current, onSave, className = "" }: StatePickerProps) {
  const router = useRouter();
  const titleId = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(current?.state ?? states[0]?.code ?? "");
  const [postcode, setPostcode] = useState(current?.postcode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const currentName = states.find((s) => s.code === current?.state)?.name;
  const postcodeState = stateForPostcode(postcode);

  useEffect(() => {
    if (!open) return;
    setState(current?.state ?? states[0]?.code ?? "");
    setPostcode(current?.postcode ?? "");
    setError(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: MouseEvent) => wrap.current && !wrap.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open, current, states]);

  function onPostcode(value: string) {
    const v = value.replace(/\D/g, "").slice(0, 4);
    setPostcode(v);
    setError(null);
    // Typing a postcode picks its state when we deliver there.
    const s = stateForPostcode(v);
    if (s && states.some((o) => o.code === s)) setState(s);
  }

  function save() {
    if (!/^\d{4}$/.test(postcode)) return setError("Enter a 4-digit postcode.");
    if (postcodeState !== state) {
      const name = states.find((s) => s.code === postcodeState)?.name;
      return setError(name ? `${postcode} is in ${name}. Choose ${name} or check the postcode.` : `We don't deliver to ${postcodeState ?? "that postcode"} yet.`);
    }
    startTransition(async () => {
      const result = await onSave({ state, postcode });
      if (!result.ok) return setError(result.message);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div ref={wrap} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-full bg-brand-tint px-4 py-2.5 text-brand md:w-auto"
      >
        <PinIcon className="h-5 w-5 shrink-0" />
        <span className="flex-1 truncate text-left font-heading text-base font-bold">
          {current && currentName ? `${currentName} · ${current.postcode}` : "Choose delivery state"}
        </span>
        <svg viewBox="0 0 12 12" className={`h-3 w-3 shrink-0 transition ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
          <path d="M2 4.5 6 8l4-3.5" />
        </svg>
      </button>

      {open ? (
        <>
          <div aria-hidden className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="fixed inset-x-0 bottom-0 z-50 flex flex-col gap-2 rounded-t-2xl bg-white p-4 pb-6 text-brand shadow-2xl md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:top-full md:mt-2 md:w-[360px] md:rounded-2xl md:border md:border-neutral-200 md:pb-4"
          >
            <span aria-hidden className="mx-auto mb-2 h-1 w-10 rounded-full bg-neutral-300 md:hidden" />
            <p id={titleId} className="text-sm font-bold">Confirm Location</p>
            <p className="text-xs">Confirm your suburb or postcode to confirm delivery availability.</p>

            <div role="radiogroup" aria-label="Delivery state" className="flex flex-col">
              {states.map((s) => {
                const on = s.code === state;
                return (
                  <button
                    key={s.code}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => {
                      setState(s.code);
                      setError(null);
                    }}
                    className={`flex items-center gap-2 rounded p-2 text-left transition ${on ? "bg-brand-tint" : "hover:bg-neutral-50"}`}
                  >
                    <span aria-hidden className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] ${on ? "border-brand" : "border-neutral-400"}`}>
                      {on ? <span className="h-2.5 w-2.5 rounded-full bg-brand" /> : null}
                    </span>
                    <span className="flex flex-1 flex-col gap-0.5">
                      <span className="text-sm font-bold">{s.name}</span>
                      {s.note ? <span className="text-xs text-neutral-500">{s.note}</span> : null}
                    </span>
                  </button>
                );
              })}
            </div>

            <form
              className="flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
            >
              <label className="flex flex-col gap-0.5">
                <span className="text-xs font-bold uppercase">Postcode</span>
                <span className={`flex items-center gap-1 rounded-sm border bg-white px-4 py-3 ${error ? "border-red-600" : "border-neutral-300"}`}>
                  <input
                    inputMode="numeric"
                    autoComplete="postal-code"
                    value={postcode}
                    onChange={(e) => onPostcode(e.target.value)}
                    placeholder="e.g. 3056"
                    aria-invalid={Boolean(error)}
                    className="min-w-0 flex-1 bg-transparent text-sm text-neutral-900 outline-none"
                  />
                  {postcodeState ? <span className="whitespace-nowrap text-xs text-neutral-500">{postcodeState}</span> : null}
                </span>
              </label>
              {error ? <p role="alert" className="text-xs text-red-700">{error}</p> : null}
              <button type="submit" disabled={pending} className="flex h-12 items-center justify-center rounded-full bg-brand px-6 font-heading text-sm font-bold uppercase tracking-[0.05em] text-white hover:opacity-90 disabled:opacity-60">
                {pending ? "Saving…" : "Save"}
              </button>
            </form>
          </div>
        </>
      ) : null}
    </div>
  );
}
