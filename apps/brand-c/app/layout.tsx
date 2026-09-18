import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Header, Footer } from "@repo/ui";
import { brand } from "../lib/brand";
import { storefront } from "../lib/shopify";
import { getSession } from "../lib/session";
import { getCart } from "../lib/cart";
import { getPointsContext } from "../lib/points";
import { removeCartLineAction, toggleLinePaymentAction, updateCartLineAction } from "./cart-actions";
import "./globals.css";

export const metadata: Metadata = {
  title: brand.name,
  description: brand.tagline,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [collections, session, cart, points] = await Promise.all([
    storefront.listCollections(6).catch(() => []),
    getSession(),
    getCart(),
    getPointsContext(),
  ]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col antialiased">
        <Header
          brand={brand}
          isLoggedIn={Boolean(session)}
          cart={cart}
          cartActions={{
            updateQuantity: updateCartLineAction,
            remove: removeCartLineAction,
            togglePoints: toggleLinePaymentAction,
          }}
          points={{ enabled: points.enabled, balance: points.balance }}
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
