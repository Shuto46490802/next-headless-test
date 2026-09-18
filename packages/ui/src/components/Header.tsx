import Link from "next/link";
import type { BrandConfig } from "../types";
import type { CartActionResult, MiniCartData } from "../cart-events";
import { MiniCart } from "./MiniCart";

export interface HeaderCartActions {
  updateQuantity: (lineId: string, quantity: number) => Promise<CartActionResult>;
  remove: (lineId: string) => Promise<CartActionResult>;
  togglePoints?: (lineId: string, usePoints: boolean) => Promise<CartActionResult>;
}

export interface HeaderProps {
  brand: BrandConfig;
  isLoggedIn: boolean;
  collections: { handle: string; title: string }[];
  cart: MiniCartData | null;
  cartActions: HeaderCartActions;
  /** Where the mini cart's Checkout button goes. Defaults to the cart's own checkoutUrl. */
  checkoutHref?: string;
  /** Drinks Cart: enables the points summary and per-line switch in the mini cart, and the header chip. */
  points?: { enabled: boolean; balance: number | null } | null;
}

export function Header({ brand, isLoggedIn, collections, cart, cartActions, checkoutHref, points = null }: HeaderProps) {
  const pointsBalance = points?.enabled ? points.balance : null;
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight text-neutral-900">
          {brand.name}
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-neutral-600 md:flex">
          <Link href="/products" className="hover:text-neutral-900">
            All products
          </Link>
          {collections.map((collection) => (
            <Link
              key={collection.handle}
              href={`/collections/${collection.handle}`}
              className="hover:text-neutral-900"
            >
              {collection.title}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          {isLoggedIn && pointsBalance != null ? (
            <span
              className="hidden rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 sm:inline-block"
              title="Your points balance"
            >
              {pointsBalance.toLocaleString()} pts
            </span>
          ) : null}
          {isLoggedIn ? (
            <Link href="/account" className="text-sm font-medium text-neutral-700 hover:text-neutral-900">
              Account
            </Link>
          ) : (
            // Plain <a>, not <Link>: this route redirects to Shopify's hosted login, and
            // Link's client-side fetch navigation would hit that redirect as a CORS request.
            <a href="/api/auth/login" className="text-sm font-medium text-neutral-700 hover:text-neutral-900">
              Sign in
            </a>
          )}
          <MiniCart
            initialCart={cart}
            checkoutHref={checkoutHref}
            onUpdateQuantity={cartActions.updateQuantity}
            onRemove={cartActions.remove}
            onTogglePoints={cartActions.togglePoints}
            points={points}
          />
        </div>
      </div>
    </header>
  );
}
