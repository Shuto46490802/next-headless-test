import Link from "next/link";
import type { BrandConfig } from "../types";

export interface HeaderProps {
  brand: BrandConfig;
  isLoggedIn: boolean;
  cartQuantity: number;
  collections: { handle: string; title: string }[];
}

export function Header({ brand, isLoggedIn, cartQuantity, collections }: HeaderProps) {
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
          <Link
            href={isLoggedIn ? "/account" : "/api/auth/login"}
            className="text-sm font-medium text-neutral-700 hover:text-neutral-900"
          >
            {isLoggedIn ? "Account" : "Sign in"}
          </Link>
          <Link href="/cart" className="relative text-sm font-medium text-neutral-700 hover:text-neutral-900">
            Cart
            {cartQuantity > 0 ? (
              <span className="absolute -right-3 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[10px] text-brand-fg">
                {cartQuantity}
              </span>
            ) : null}
          </Link>
        </div>
      </div>
    </header>
  );
}
