import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Header, Footer } from "@repo/ui";
import { brand } from "../lib/brand";
import { storefront } from "../lib/shopify";
import { getSession } from "../lib/session";
import { getCart } from "../lib/cart";
import "./globals.css";

export const metadata: Metadata = {
  title: brand.name,
  description: brand.tagline,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [collections, session, cart] = await Promise.all([
    storefront.listCollections(6).catch(() => []),
    getSession(),
    getCart(),
  ]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col antialiased">
        <Header
          brand={brand}
          isLoggedIn={Boolean(session)}
          cartQuantity={cart?.totalQuantity ?? 0}
          collections={collections.map((collection) => ({
            handle: collection.handle,
            title: collection.title,
          }))}
        />
        <main className="flex-1">{children}</main>
        <Footer brand={brand} />
      </body>
    </html>
  );
}
