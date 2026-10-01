import type { ReactNode } from "react";
import { draftMode } from "next/headers";
import { PreviewBanner, SiteFooter, SiteHeader } from "@repo/ui";
import { brand } from "../../lib/brand";
import { storefront } from "../../lib/shopify";
import { getSession } from "../../lib/session";
import { getCart } from "../../lib/cart";
import { getPointsContext } from "../../lib/points";
import { removeCartLineAction, toggleLinePaymentAction, updateCartLineAction } from "../cart-actions";
import { toCta, toFooter, toLoggedOutNav, toNavigation } from "../sections";
import { getSiteSettings } from "../site-settings";

/** Storefront chrome: announcement bar, header, megamenu and footer from this site's Site Settings entry. */
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const { isEnabled: isPreview } = await draftMode();
  const settings = await getSiteSettings(isPreview);
  const [collections, session, cart, points] = await Promise.all([storefront.listCollections(8).catch(() => []), getSession(), getCart(), getPointsContext()]);

  const isLoggedIn = Boolean(session);

  return (
    <>
      <SiteHeader
        brand={brand}
        logo={settings?.logo ?? null}
        isLoggedIn={isLoggedIn}
        announcementMessages={settings?.announcementMessages}
        navigation={toNavigation(settings?.headerNavigation)}
        loggedOutNavigation={toLoggedOutNav(settings)}
        loggedOutCtas={(settings?.loggedOutCtas ?? []).map(toCta).filter((c) => c !== null)}
        searchPlaceholder={settings?.searchPlaceholder}
        searchShowCredit={false}
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
    </>
  );
}
