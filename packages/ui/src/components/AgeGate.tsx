"use client";

import Image from "next/image";
import { useState, useTransition } from "react";

export interface AgeGateProps {
  siteName: string;
  logo?: { url: string; altText?: string | null } | null;
  /** Club photography behind the card. */
  backgroundUrl?: string | null;
  declined: boolean;
  onConfirm: (remember: boolean) => Promise<void>;
  onDecline: () => Promise<void>;
  /** Declined screen's only route forward, e.g. a mailto or external contact page. */
  contactHref?: string | null;
  contactLabel?: string;
  teamLabel?: string;
  links?: { label: string; href: string }[];
}

/**
 * Figma "Feedback/Age Gate" (FIN-15): a blocking card over club photography on first visit. The
 * choice is held for the session (or 30 days with "Remember me"), so a refresh can't bypass it.
 * "No" leads to a dead end with only the contact route.
 */
export function AgeGate({
  siteName,
  logo,
  backgroundUrl,
  declined,
  onConfirm,
  onDecline,
  contactHref,
  contactLabel = "Contact the club team",
  teamLabel = "club team",
  links = [
    { label: "DrinkWise.org.au", href: "https://drinkwise.org.au" },
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
}: AgeGateProps) {
  const [remember, setRemember] = useState(false);
  const [pending, start] = useTransition();
  const lockup = logo ? <Image src={logo.url} alt={siteName} width={208} height={61} className="h-11 w-auto object-contain" priority /> : <span className="font-heading text-2xl font-bold">{siteName}</span>;

  if (declined) {
    return (
      <div role="alertdialog" aria-modal="true" aria-labelledby="age-gate-title" className="fixed inset-0 z-[100] flex items-center justify-center bg-brand px-4 text-white">
        <div className="flex w-full max-w-[520px] flex-col items-center gap-4 text-center">
          <span className="rounded bg-white p-2">{lockup}</span>
          <h1 id="age-gate-title" className="font-heading text-5xl font-bold leading-[0.96] sm:text-[64px]">Sorry — you can&apos;t enter</h1>
          <p className="text-base opacity-90">You must be 18 or over to use {siteName}. If your club is looking at merchandise or snacks only, contact our {teamLabel}.</p>
          {contactHref ? (
            <a href={contactHref} className="rounded-full bg-white/10 px-8 py-4 font-heading text-xl font-bold uppercase tracking-[0.05em] hover:bg-white/20">{contactLabel}</a>
          ) : null}
          <a href="https://drinkwise.org.au" className="font-heading text-sm font-bold uppercase tracking-[0.05em] text-accent">DrinkWise.org.au</a>
        </div>
      </div>
    );
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="age-gate-title" className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-brand px-4 py-8">
      {backgroundUrl ? <Image src={backgroundUrl} alt="" fill priority sizes="100vw" className="object-cover" /> : null}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-[rgba(29,66,148,0.42)] via-[rgba(29,66,148,0.58)] to-[rgba(29,66,148,0.8)]" />
      <div className="relative flex w-full max-w-[560px] flex-col items-center gap-4 rounded-3xl bg-white p-6 text-center shadow-[0_18px_48px_rgba(0,0,0,0.3)] sm:p-12">
        {lockup}
        <h1 id="age-gate-title" className="font-heading text-5xl font-bold leading-[0.96] text-brand sm:text-[64px]">Are you 18 or over?</h1>
        <p className="text-base text-neutral-600">You must be of legal drinking age to enter this site. It is against the law to sell or supply alcohol to, or to obtain alcohol on behalf of, a person under 18.</p>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:gap-5">
          <button type="button" disabled={pending} onClick={() => start(() => onConfirm(remember))} className="flex-1 rounded-full bg-brand px-8 py-4 font-heading text-xl font-bold uppercase tracking-[0.05em] text-white hover:opacity-90 disabled:opacity-60">
            Yes, I&apos;m 18 or over
          </button>
          <button type="button" disabled={pending} onClick={() => start(() => onDecline())} className="flex-1 rounded-full border border-brand px-8 py-4 font-heading text-xl font-bold uppercase tracking-[0.05em] text-brand hover:bg-brand-tint disabled:opacity-60">
            No
          </button>
        </div>
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-[18px] w-[18px] accent-[var(--brand-color)]" />
          Remember me on this device for 30 days
        </label>
        <div className="h-px w-full bg-neutral-200" />
        <p className="flex flex-wrap justify-center gap-x-2 font-heading text-sm font-bold uppercase tracking-[0.05em] text-[#001328]">
          {links.map((l, i) => (
            <span key={l.label} className="flex gap-2">
              {i > 0 ? <span aria-hidden>·</span> : null}
              <a href={l.href} className="hover:underline">{l.label}</a>
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
