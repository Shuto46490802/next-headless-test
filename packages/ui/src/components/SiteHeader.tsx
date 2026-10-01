import Image from "next/image";
import Link from "next/link";
import type { BrandConfig } from "../types";
import type { CartActionResult, MiniCartData } from "../cart-events";
import { MiniCart } from "./MiniCart";
import { CtaButton, Icon, SmartLink, type CmsCta, type CmsImage } from "../cms/primitives";
import { PromoTile, type PromoTileProps } from "../cms/misc";
import { HeaderSearch } from "../commerce/HeaderSearch";

export interface NavLinkData { label: string; href: string }
export interface NavColumnData { id: string; heading: string; links: NavLinkData[] }
export interface NavItemData {
  id: string;
  label: string;
  href: string | null;
  columns: NavColumnData[];
  brands?: { id: string; name: string; logo: CmsImage | null; href?: string }[];
  promo?: PromoTileProps | null;
  footerLink?: NavLinkData | null;
}
export interface SiteHeaderCartActions {
  updateQuantity: (lineId: string, quantity: number) => Promise<CartActionResult>;
  remove: (lineId: string) => Promise<CartActionResult>;
  togglePoints?: (lineId: string, usePoints: boolean) => Promise<CartActionResult>;
}
export interface SiteHeaderProps {
  brand: BrandConfig;
  logo?: CmsImage | null;
  isLoggedIn: boolean;
  announcementMessages?: string[];
  navigation?: NavItemData[];
  loggedOutNavigation?: NavLinkData[];
  loggedOutCtas?: CmsCta[];
  searchPlaceholder?: string;
  /** Show "Earns $X" on search overlay rows (Club Connect only). */
  searchShowCredit?: boolean;
  /** Header chip: "Club Credit $1,284.00" (CC/PC) or points (DC). Data, not CMS. */
  balance?: { label: string; value: string } | null;
  cart: MiniCartData | null;
  cartActions: SiteHeaderCartActions;
  checkoutHref?: string;
  points?: { enabled: boolean; balance: number | null } | null;
  /** Fallback nav when no CMS navigation exists. */
  collections?: { handle: string; title: string }[];
}

function Logo({ brand, logo }: { brand: BrandConfig; logo?: CmsImage | null }) {
  return (
    <Link href="/" className="flex items-center gap-3" aria-label={`${brand.name} home`}>
      {logo ? <Image src={logo.url} alt={brand.name} width={160} height={56} className="h-12 w-auto object-contain" priority /> : <span className="font-heading text-2xl font-bold text-brand">{brand.name}</span>}
    </Link>
  );
}

/**
 * Figma "Header block": yellow announcement bar, white utility row (logo, search, balance chip,
 * favourites / account / cart) and a navy category bar whose items open a megamenu. Logged out,
 * it collapses to the marketing header (anchor links + Log in / Create account).
 */
export function SiteHeader(p: SiteHeaderProps) {
  const cmsNav = p.navigation && p.navigation.length > 0 ? p.navigation : null;

  if (!p.isLoggedIn) {
    return (
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur">
        {p.announcementMessages?.length ? <AnnouncementBar messages={p.announcementMessages} /> : null}
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-6 px-4 py-3 sm:px-8">
          <div className="flex items-center gap-10">
            <Logo brand={p.brand} logo={p.logo} />
            <nav className="hidden items-center gap-8 text-sm text-neutral-800 md:flex">
              {(p.loggedOutNavigation ?? []).map((l) => <SmartLink key={l.label} href={l.href} className="hover:text-brand">{l.label}</SmartLink>)}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {(p.loggedOutCtas ?? [{ label: "Log in", href: "/api/auth/login", variant: "primary" as const }]).map((c) => <CtaButton key={c.label} cta={{ ...c, size: "small" }} className="text-brand" />)}
          </div>
        </div>
        <div className="border-b border-neutral-200" />
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm">
      {p.announcementMessages?.length ? <AnnouncementBar messages={p.announcementMessages} /> : null}
      <div className="mx-auto flex max-w-[1440px] items-center gap-6 px-4 py-3 sm:px-8">
        <Logo brand={p.brand} logo={p.logo} />
        <HeaderSearch placeholder={p.searchPlaceholder} showCredit={p.searchShowCredit} className="hidden flex-1 md:block" />
        {p.balance ? (
          <span className="hidden items-center gap-2 rounded-full bg-brand-tint px-3 py-2 text-sm text-brand lg:inline-flex">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">$</span>
            {p.balance.label} <strong className="font-heading text-lg">{p.balance.value}</strong>
          </span>
        ) : null}
        <nav className="ml-auto flex items-center gap-6 text-xs text-brand">
          <Link href="/account/favorites" className="flex flex-col items-center gap-1"><Icon name="heart" className="h-6 w-6" />Favourites</Link>
          <Link href="/account" className="flex flex-col items-center gap-1"><Icon name="user" className="h-6 w-6" />Account</Link>
          <div className="flex flex-col items-center gap-1">
            <MiniCart initialCart={p.cart} checkoutHref={p.checkoutHref} onUpdateQuantity={p.cartActions.updateQuantity} onRemove={p.cartActions.remove} onTogglePoints={p.cartActions.togglePoints} points={p.points} />
          </div>
        </nav>
      </div>
      <div className="px-4 pb-3 md:hidden">
        <HeaderSearch placeholder={p.searchPlaceholder} showCredit={p.searchShowCredit} />
      </div>
      <nav className="bg-brand text-white" aria-label="Categories">
        <ul className="mx-auto flex max-w-[1440px] items-center gap-2 overflow-x-auto px-4 sm:px-8">
          {cmsNav
            ? cmsNav.map((item, i) => <li key={item.id}><MegaNavItem item={item} first={i === 0} /></li>)
            : [{ handle: "", title: "All products" }, ...(p.collections ?? [])].map((c, i) => (
                <li key={c.handle || "all"}>
                  <Link href={c.handle ? `/collections/${c.handle}` : "/products"} className={`block whitespace-nowrap px-4 py-3.5 text-sm hover:bg-white/10 ${i === 0 ? "border-b-2 border-accent" : ""}`}>{c.title}</Link>
                </li>
              ))}
        </ul>
      </nav>
    </header>
  );
}

function AnnouncementBar({ messages }: { messages: string[] }) {
  return (
    <div className="bg-accent text-accent-fg">
      <ul className="mx-auto flex max-w-[1440px] items-center justify-center divide-x divide-black/20 px-4 text-xs font-medium sm:justify-between sm:px-8">
        {messages.map((m) => <li key={m} className="flex-1 truncate px-4 py-1.5 text-center">{m}</li>)}
      </ul>
    </div>
  );
}

function MegaNavItem({ item, first }: { item: NavItemData; first: boolean }) {
  const trigger = `block whitespace-nowrap px-4 py-3.5 text-sm hover:bg-white/10 ${first ? "border-b-2 border-accent" : ""}`;
  if (item.columns.length === 0) {
    return <SmartLink href={item.href ?? "#"} className={trigger}>{item.label}</SmartLink>;
  }
  return (
    <div className="group static">
      {item.href ? <SmartLink href={item.href} className={trigger}>{item.label}</SmartLink> : <button type="button" className={trigger} aria-haspopup="true">{item.label}</button>}
      <div className="invisible absolute inset-x-0 top-full z-50 opacity-0 transition duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="mx-auto grid max-w-[1440px] gap-8 bg-white px-4 py-8 text-neutral-900 shadow-2xl sm:px-8 lg:grid-cols-[1fr_280px]">
          <div className="flex flex-col gap-8">
            <div className="grid gap-8 sm:grid-cols-3 lg:grid-cols-6">
              {item.columns.map((col, ci) => (
                <div key={col.id} className={ci === 0 && item.columns.length === 6 ? "border-r border-neutral-200 pr-4" : ""}>
                  <span className="mb-3 block font-heading text-sm font-bold uppercase text-neutral-900">{col.heading}</span>
                  <ul className="flex flex-col gap-2.5">
                    {col.links.map((l) => <li key={`${l.label}-${l.href}`}><SmartLink href={l.href} className="text-sm text-brand hover:underline">{l.label}</SmartLink></li>)}
                  </ul>
                </div>
              ))}
            </div>
            {item.brands?.length ? (
              <div>
                <span className="mb-3 block text-xs font-semibold uppercase tracking-wide text-neutral-600">Most popular brands</span>
                <ul className="flex flex-wrap gap-3">
                  {item.brands.map((b) => (
                    <li key={b.id}>
                      <SmartLink href={b.href ?? "#"} className="flex h-20 w-28 items-center justify-center rounded-xl border border-neutral-200 bg-white hover:border-brand" aria-label={b.name}>
                        {b.logo ? <Image src={b.logo.url} alt="" width={96} height={64} className="h-14 w-24 object-contain" /> : <span className="text-xs">{b.name}</span>}
                      </SmartLink>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {item.footerLink ? <SmartLink href={item.footerLink.href} className="text-sm font-medium text-brand underline underline-offset-4">{item.footerLink.label} →</SmartLink> : null}
          </div>
          {item.promo ? <PromoTile {...item.promo} style="poster" className="min-h-[300px]" /> : null}
        </div>
      </div>
    </div>
  );
}
