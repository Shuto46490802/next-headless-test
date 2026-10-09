"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AU_STATE_OPTIONS } from "../signup/validation";

export interface LocationAddressData {
  address1: string | null;
  address2: string | null;
  city: string | null;
  zoneCode: string | null;
  zip: string | null;
  countryCode: string | null;
}

export interface LocationCardData {
  id: string;
  name: string;
  shippingAddress: LocationAddressData | null;
  billingAddress: LocationAddressData | null;
  /** The location the cart and prices currently use. */
  current: boolean;
  /** The signed-in person is a Location admin here. */
  canEdit: boolean;
}

export interface LocationInput {
  name: string;
  address1: string;
  address2: string;
  city: string;
  zoneCode: string;
  zip: string;
}

export type LocationResult = { ok: true; message?: string } | { ok: false; message: string };

function sameAddress(a: LocationAddressData | null, b: LocationAddressData | null) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function AddressLines({ a }: { a: LocationAddressData | null }) {
  if (!a) return <p className="text-sm text-neutral-500">No address yet</p>;
  return (
    <address className="text-sm not-italic leading-relaxed text-neutral-800">
      {a.address2 ? <>{a.address2}<br /></> : null}
      {a.address1}
      <br />
      {[a.city?.toUpperCase(), a.zoneCode, a.zip].filter(Boolean).join(" ")}
      <br />
      {a.countryCode === "AU" || !a.countryCode ? "Australia" : a.countryCode}
    </address>
  );
}

function LocationForm({ initial, submitLabel, onSubmit, onCancel }: { initial: LocationInput; submitLabel: string; onSubmit: (v: LocationInput) => Promise<LocationResult>; onCancel: () => void }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof LocationInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((s) => ({ ...s, [k]: e.target.value }));
  const field = "w-full rounded-sm border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand";
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await onSubmit(v);
          if (!r.ok) return setError(r.message);
          setError(null);
          onCancel();
          router.refresh();
        });
      }}
    >
      <label className="text-sm font-medium">
        Location name
        <input required value={v.name} onChange={set("name")} placeholder="e.g. Rosehill Racecourse – Members Bar" className={`mt-1 ${field}`} />
      </label>
      <label className="text-sm font-medium">
        Street address
        <input required value={v.address1} onChange={set("address1")} className={`mt-1 ${field}`} />
      </label>
      <label className="text-sm font-medium">
        Unit, suite or building (optional)
        <input value={v.address2} onChange={set("address2")} className={`mt-1 ${field}`} />
      </label>
      <div className="grid grid-cols-3 gap-2">
        <label className="col-span-3 text-sm font-medium sm:col-span-1">
          Suburb
          <input required value={v.city} onChange={set("city")} className={`mt-1 ${field}`} />
        </label>
        <label className="text-sm font-medium">
          State
          <select required value={v.zoneCode} onChange={set("zoneCode")} className={`mt-1 ${field}`}>
            <option value="">Select</option>
            {AU_STATE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">
          Postcode
          <input required inputMode="numeric" maxLength={4} value={v.zip} onChange={set("zip")} className={`mt-1 ${field}`} />
        </label>
      </div>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded-sm bg-brand px-5 py-2.5 font-heading text-sm font-bold uppercase tracking-[0.05em] text-white disabled:opacity-60">{pending ? "Saving…" : submitLabel}</button>
        <button type="button" onClick={onCancel} className="rounded-sm border border-brand px-5 py-2.5 font-heading text-sm font-bold uppercase tracking-[0.05em] text-brand">Cancel</button>
      </div>
    </form>
  );
}

const toInput = (l?: LocationCardData): LocationInput => ({
  name: l?.name ?? "",
  address1: l?.shippingAddress?.address1 ?? "",
  address2: l?.shippingAddress?.address2 ?? "",
  city: l?.shippingAddress?.city ?? "",
  zoneCode: l?.shippingAddress?.zoneCode ?? "",
  zip: l?.shippingAddress?.zip ?? "",
});

/**
 * Partner Connect "Address book", as locations: a company has no address book, so each card is
 * a company location (delivery site) and "Add location" creates a new one. Location admins can
 * rename a site or change its address; others see the list read-only.
 */
export function LocationsManager({
  title = "Locations",
  intro,
  locations,
  canAdd,
  actions,
}: {
  title?: string;
  intro?: string;
  locations: LocationCardData[];
  canAdd: boolean;
  actions: { create: (v: LocationInput) => Promise<LocationResult>; update: (locationId: string, v: LocationInput) => Promise<LocationResult> };
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const wrap = (fn: () => Promise<LocationResult>) => async () => {
    const r = await fn();
    if (r.ok && r.message) setMessage(r.message);
    return r;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-3xl font-bold text-brand">{title}</h2>
        {intro ? <p className="text-sm text-neutral-600">{intro}</p> : null}
      </div>
      {message ? <p role="status" className="rounded bg-brand-tint px-3 py-2 text-sm text-brand">{message}</p> : null}
      <div className="grid gap-5 md:grid-cols-2">
        {locations.map((l) => (
          <section key={l.id} className="flex flex-col gap-4 rounded-2xl bg-neutral-100 p-5">
            {editing === l.id ? (
              <LocationForm initial={toInput(l)} submitLabel="Save location" onSubmit={(v) => wrap(() => actions.update(l.id, v))()} onCancel={() => setEditing(null)} />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-neutral-900">{l.name}</h3>
                  {l.current ? <span className="rounded bg-brand px-2 py-0.5 text-xs font-medium uppercase text-white">Ordering for</span> : null}
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium uppercase text-neutral-500">Delivery address</p>
                  <AddressLines a={l.shippingAddress} />
                </div>
                {!sameAddress(l.shippingAddress, l.billingAddress) && l.billingAddress ? (
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium uppercase text-neutral-500">Billing address</p>
                    <AddressLines a={l.billingAddress} />
                  </div>
                ) : null}
                {l.canEdit ? (
                  <button type="button" onClick={() => setEditing(l.id)} className="self-start rounded-sm bg-brand px-5 py-2.5 font-heading text-sm font-bold uppercase tracking-[0.05em] text-white">Edit location</button>
                ) : null}
              </>
            )}
          </section>
        ))}
        {canAdd ? (
          <section className="flex flex-col rounded-2xl bg-neutral-100 p-5">
            {editing === "new" ? (
              <LocationForm initial={toInput()} submitLabel="Add location" onSubmit={(v) => wrap(() => actions.create(v))()} onCancel={() => setEditing(null)} />
            ) : (
              <button type="button" onClick={() => { setMessage(null); setEditing("new"); }} className="flex min-h-48 flex-1 flex-col items-center justify-center gap-3 text-brand">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-xl text-white">+</span>
                <span className="text-sm font-bold">Add location</span>
              </button>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
