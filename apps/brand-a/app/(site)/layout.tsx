import type { ReactNode } from "react";
import { draftMode } from "next/headers";
import { AgeGate, PreviewBanner, SiteFooter, SiteHeader, formatMoney } from "@repo/ui";
import { brand } from "../../lib/brand";
import { getSession } from "../../lib/session";
import { getCart } from "../../lib/cart";
import { removeCartLineAction, updateCartLineAction } from "../cart-actions";
import { toCta, toFooter, toLoggedOutNav, toNavigation } from "../sections";
import { getSiteSettings } from "../site-settings";
import { SHOW_CREDIT } from "../../lib/listing";
import { DELIVERY_STATES, STATE_PICKER_ENABLED, getDeliveryLocation } from "../../lib/location";
import { saveDeliveryLocation } from "../location-actions";
import { ACCOUNT_COPY, ACCOUNT_GROUPS, getAccountOverview } from "../../lib/account";
import { AGE_GATE_CONTACT, AGE_GATE_IMAGE, getAgeGateState } from "../../lib/age-gate";
import { loadOpenOrders } from "../account-actions";
import { confirmAge, declineAge } from "../age-gate-actions";
import { getCartUpsell } from "../cart-upsell-actions";
import { addToCartAction } from "../product-actions";

/** Storefront chrome: announcement bar, header, megamenu and footer from this site's Site Settings entry. */
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const { isEnabled: isPreview } = await draftMode();
  const settings = await getSiteSettings(isPreview);
  const [session, cart] = await Promise.all([getSession(), getCart()]);

  const isLoggedIn = Boolean(session);
  // Signed in but not approved yet (on /signup or /pending): slim header, no shopping chrome.
  const awaitingApproval = Boolean(session?.access && session.access.state !== "approved");
  const [location, account, ageGate] = await Promise.all([
    STATE_PICKER_ENABLED && isLoggedIn ? getDeliveryLocation() : null,
    isLoggedIn ? getAccountOverview() : null,
    getAgeGateState(),
  ]);
  const credit = account?.company?.creditBalance ?? null;
  // Contentful preview skips the gate so editors see the page they're editing.
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
          contactLabel={`Contact the ${ACCOUNT_COPY.team}`}
          teamLabel={ACCOUNT_COPY.team}
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
        searchShowCredit={SHOW_CREDIT}
        locationPicker={STATE_PICKER_ENABLED && isLoggedIn ? { states: DELIVERY_STATES, current: location, onSave: saveDeliveryLocation } : null}
        cart={cart}
        cartActions={{ updateQuantity: updateCartLineAction, remove: removeCartLineAction }}
        cartOptions={{
          showCredit: SHOW_CREDIT,
          deliveryLabel: SHOW_CREDIT ? "Free" : undefined,
          emptyMessage: ACCOUNT_COPY.emptyCart,
          upsell: { load: getCartUpsell, onAdd: addToCartAction },
        }}
        accountMenu={
          isLoggedIn
            ? {
                firstName: account?.firstName ?? null,
                groups: ACCOUNT_GROUPS,
                credit: account?.company ? { label: ACCOUNT_COPY.creditLabel, balance: credit, ledgerHref: "/account/credit" } : null,
                loadOpenOrders: account?.company ? loadOpenOrders : undefined,
              }
            : null
        }
        checkoutHref="/api/checkout"
        balance={credit ? { label: ACCOUNT_COPY.creditLabel, value: formatMoney(credit) } : null}
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
