import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Barlow_Condensed, DM_Sans } from "next/font/google";
import { draftMode } from "next/headers";
import { PreviewBanner, SiteFooter, SiteHeader } from "@repo/ui";
import { brand } from "../lib/brand";
import { storefront } from "../lib/shopify";
import { getSession } from "../lib/session";
import { getCart } from "../lib/cart";
import { getPointsContext } from "../lib/points";
import { removeCartLineAction, toggleLinePaymentAction, updateCartLineAction } from "./cart-actions";
import { toFooter, toNavigation, toCta } from "./sections";
import { getSiteSettings } from "./site-settings";
import "./globals.css";

const heading = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-heading" });
const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings(false);
  return { title: s?.seoTitle ?? brand.name, description: s?.seoDescription ?? brand.tagline };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { isEnabled: isPreview } = await draftMode();
  // Announcement bar, header navigation and footer come from this site's Site Settings entry in Contentful.
  const settings = await getSiteSettings(isPreview);
  const [collections, session, cart, points] = await Promise.all([storefront.listCollections(8).catch(() => []), getSession(), getCart(), getPointsContext()]);

  const isLoggedIn = Boolean(session);

  return (
    <html lang="en" className={`${heading.variable} ${sans.variable}`}>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <SiteHeader
          brand={brand}
          logo={settings?.logo ?? null}
          isLoggedIn={isLoggedIn}
          announcementMessages={settings?.announcementMessages}
          navigation={toNavigation(settings?.headerNavigation)}
          loggedOutNavigation={(settings?.loggedOutNavigation ?? []).map((l) => ({ label: l.label ?? l.internalName, href: l.linkType === "anchor" ? `/gate#${l.url ?? ""}` : l.url ?? "#" }))}
          loggedOutCtas={(settings?.loggedOutCtas ?? []).map(toCta).filter((c) => c !== null)}
          searchPlaceholder={settings?.searchPlaceholder}
          cart={cart}
          cartActions={{ updateQuantity: updateCartLineAction, remove: removeCartLineAction, togglePoints: toggleLinePaymentAction }}
          points={{ enabled: points.enabled, balance: points.balance }}
          balance={points.enabled && points.balance != null ? { label: "Points", value: points.balance.toLocaleString() } : null}
          collections={collections.map((c) => ({ handle: c.handle, title: c.title }))}
        />
        <main className="flex-1">
          {isPreview ? <PreviewBanner exitHref="/api/preview/exit" /> : null}
          {children}
        </main>
        <SiteFooter brand={brand} logo={settings?.logo ?? null} {...(toFooter(settings) ?? {})} />
      </body>
    </html>
  );
}
