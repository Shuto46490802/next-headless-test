import type { Metadata } from "next";
import type { ReactNode } from "react";
import { draftMode } from "next/headers";
import { Header, Footer, PreviewBanner } from "@repo/ui";
import { brand } from "../lib/brand";
import { storefront } from "../lib/shopify";
import { contentful, contentfulEnabled } from "../lib/contentful";
import { getSession } from "../lib/session";
import { getCart } from "../lib/cart";
import { removeCartLineAction, updateCartLineAction } from "./cart-actions";
import "./globals.css";

export const metadata: Metadata = {
  title: brand.name,
  description: brand.tagline,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { isEnabled: isPreview } = await draftMode();
  // Announcement bar, header menu and footer come from this brand's Site Settings entry in Contentful.
  const siteSettings = contentfulEnabled
    ? await contentful.getSiteSettings({ preview: isPreview }).catch(() => null)
    : null;
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
          cart={cart}
          cartActions={{ updateQuantity: updateCartLineAction, remove: removeCartLineAction }}
          checkoutHref="/api/checkout"
          collections={collections.map((collection) => ({
            handle: collection.handle,
            title: collection.title,
          }))}
          navigation={siteSettings?.headerNavigation}
          announcement={siteSettings?.announcementBar}
        />
        <main className="flex-1">
          {isPreview ? <PreviewBanner exitHref="/api/preview/exit" /> : null}
          {children}
        </main>
        <Footer
          brand={brand}
          settings={
            siteSettings
              ? { columns: siteSettings.footerColumns, text: siteSettings.footerText, socialLinks: siteSettings.socialLinks }
              : null
          }
        />
      </body>
    </html>
  );
}
