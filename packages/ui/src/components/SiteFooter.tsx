import Image from "next/image";
import type { BrandConfig } from "../types";
import { SmartLink, type CmsImage } from "../cms/primitives";
import type { NavColumnData, NavLinkData } from "./SiteHeader";

export interface SiteFooterProps {
  brand: BrandConfig;
  logo?: CmsImage | null;
  columns?: NavColumnData[];
  text?: string | null;
  socialLinks?: NavLinkData[];
  bottomBarLeft?: string | null;
  bottomBarRight?: string | null;
}

/** Figma "Navigation/Footer": navy, logo lockup on white, DrinkWise blurb, three link columns, dark bottom bar. */
export function SiteFooter(p: SiteFooterProps) {
  return (
    <footer className="bg-brand text-white">
      <div className="mx-auto grid max-w-[1440px] gap-12 px-4 py-14 sm:px-8 lg:grid-cols-[1fr_2fr]">
        <div className="flex flex-col gap-4">
          <div className="inline-flex w-fit items-center rounded-2xl bg-white px-6 py-4">
            {p.logo ? <Image src={p.logo.url} alt={p.brand.name} width={260} height={120} className="h-24 w-auto object-contain" /> : <span className="font-heading text-2xl font-bold text-brand">{p.brand.name}</span>}
          </div>
          {p.text ? (
            <p className="max-w-sm text-sm text-white/85">
              <span className="block font-heading text-2xl font-bold text-white">{p.text.split(".")[0]}.</span>
              {p.text.split(".").slice(1).join(".").trim()}
            </p>
          ) : null}
          <p className="text-sm text-accent">© {new Date().getFullYear()} {p.brand.name} · Proudly part of Asahi Group</p>
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          {(p.columns ?? []).map((col) => (
            <div key={col.id}>
              <span className="mb-4 block font-heading text-xl font-bold text-accent">{col.heading}</span>
              <ul className="flex flex-col gap-2.5 text-sm">
                {col.links.map((l) => <li key={`${l.label}-${l.href}`}><SmartLink href={l.href} className="hover:underline">{l.label}</SmartLink></li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-brand-dark">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>{p.bottomBarLeft}</span>
          <span className="flex items-center gap-4">
            {(p.socialLinks ?? []).map((l) => <SmartLink key={l.label} href={l.href} className="hover:underline">{l.label}</SmartLink>)}
            {p.bottomBarRight ? <span>{p.bottomBarRight}</span> : null}
          </span>
        </div>
      </div>
    </footer>
  );
}
