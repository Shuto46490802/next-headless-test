import type { ReactNode } from "react";
import { draftMode } from "next/headers";
import { AgeGate, PreviewBanner, SiteFooter, SiteHeader } from "@repo/ui";
import { brand } from "../../lib/brand";
import { getSession } from "../../lib/session";
import { getCart } from "../../lib/cart";
import { getPointsContext } from "../../lib/points";
import { removeCartLineAction, toggleLinePaymentAction, updateCartLineAction } from "../cart-actions";
import { toCta, toFooter, toLoggedOutNav, toNavigation } from "../sections";
import { getSiteSettings } from "../site-settings";
import { AGE_GATE_CONTACT, AGE_GATE_IMAGE, getAgeGateState } from "../../lib/age-gate";
import { confirmAge, declineAge } from "../age-gate-actions";

/** Storefront chrome: announcement bar, header, megamenu and footer from this site's Site Settings entry. */
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const { isEnabled: isPreview } = await draftMode();
  const settings = await getSiteSettings(isPreview);
  const [session, cart, points] = await Promise.all([getSession(), getCart(), getPointsContext()]);

  const isLoggedIn = Boolean(session);
  // Signed in but not approved yet (on /signup or /pending): slim header, no shopping chrome.
  const awaitingApproval = Boolean(session?.access && session.access.state !== "approved");
  const ageGate = await getAgeGateState();
  const showAgeGate = ageGate !== "verified" && !isPreview;

  return (
    <>
      {showAgeGate ? (
        <AgeGate
          siteName={brand.name}
          logo={settings?.logo ?? null}
          backgroundUrl={AGE_GATE_IMAGE}
          declined={ageGate === "declined"}
          onConfirm={confirmAge}
          onDecline={declineAge}
          contactHref={AGE_GATE_CONTACT}
          contactLabel="Contact us"
          teamLabel="team"
        />
      ) : null}
      <div inert={showAgeGate || undefined} aria-hidden={showAgeGate || undefined} className="contents">
      <SiteHeader
        brand={brand}
        logo={settings?.logo ?? null}
        isLoggedIn={isLoggedIn}
        minimal={awaitingApproval}
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
      />
      <main className="flex-1">
        {isPreview ? <PreviewBanner exitHref="/api/preview/exit" /> : null}
        {children}
      </main>
      <SiteFooter brand={brand} logo={settings?.logo ?? null} {...(toFooter(settings) ?? {})} />
      </div>
    </>
  );
}
