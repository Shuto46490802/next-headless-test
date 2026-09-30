# Shuto Headless

Three Shopify headless storefronts built with Next.js — **Club Connect** (`apps/brand-a`, membership code `CC`), **Partner Connect** (`apps/brand-b`, `PC`) and **Drinks Cart** (`apps/brand-c`, `DC`) —, sharing one Shopify instance (`shuto-development-store`), one Storefront API token, and one Customer Account API OAuth client. Not built on Hydrogen/Oxygen — deployable to Vercel now, portable to Azure later.

## Repo layout

```
apps/
  brand-a/  brand-b/  brand-c/     Club Connect / Partner Connect / Drinks Cart — Next.js 15 App Router apps (ports 3001/3002/3003 in dev)
packages/
  shopify-storefront/              Storefront API client (catalog, cart)
  shopify-customer/                Customer Account API OAuth (PKCE) + GraphQL client
  customer-data/                   mindarc_poc.site_membership / custom.favourites: admin driver + cookie-backed mock driver
  ui/                              shared React components
scripts/
  setup-metafield-definitions.mjs  one-time Admin API setup for the two customer metafields
```

## Getting started

```bash
pnpm install
pnpm dev   # runs all 3 apps: http://localhost:3001 / :3002 / :3003
```

Each app needs its own `.env.local` (copy `example.env` → `.env.local` in each `apps/*` folder). The Shopify values (Storefront token, Customer Account client ID/endpoints, store domain, Admin token) are the same across all 3 apps — only `SESSION_SECRET` should differ per app.

## Auth flow

- `GET /api/auth/login` — starts the PKCE authorization-code flow, redirects to Shopify's hosted login.
- `GET /api/auth/callback` — exchanges the code, checks/sets the `mindarc_poc.site_membership` metafield (`CC` / `PC` / `DC`; first login on any site claims it, a mismatched membership is redirected to `/access-denied?reason=wrong_membership`), then redirects back to `returnTo` on the **same site** the customer started from.
- `POST /api/auth/logout` — redirects through Shopify's logout endpoint and back.

Because customer accounts are shared across the whole Shopify instance, a customer already signed in on Club Connect will silently SSO into Partner Connect's login — the membership gate in the callback route is what actually blocks that, not the login screen itself.

## ⚠️ Local dev callback URLs won't work over plain HTTP

Shopify's Customer Account API **rejects `localhost`/`http://` redirect URIs** — callback URLs must be HTTPS. To test the login flow locally, tunnel each port with a tool like [ngrok](https://ngrok.com/):

```bash
ngrok http 3001   # repeat for 3002, 3003 (or use ngrok's multi-tunnel config)
```

Then register the resulting HTTPS URLs (see below) in the Customer Account API app settings.

## What I need from you to finish wiring this up

1. **Vercel** — I don't have access to your Vercel account. Recommended setup: 3 separate Vercel projects, each pointed at this repo with **Root Directory** set to `apps/brand-a`, `apps/brand-b`, `apps/brand-c` respectively. Let me know if you'd rather walk through `vercel link`/`vercel deploy` together, or if you want a single project with multiple output targets instead.
2. **Callback / Logout / JS-origin URIs** — register these in the Customer Account API (Headless channel) app settings:
   - Callback URIs: `https://<ngrok-a>/api/auth/callback`, `https://<ngrok-b>/api/auth/callback`, `https://<ngrok-c>/api/auth/callback` for local dev, plus `https://<brand-a-vercel-url>/api/auth/callback` (and b/c) once deployed.
   - Logout URIs: same origins as above (root path is fine, e.g. `https://<brand-a-vercel-url>/`).
   - JavaScript origins: the same origins, without a path.
3. **Domains / accent colours** — the folder and package names are still `brand-a` / `brand-b` / `brand-c` (Club Connect / Partner Connect / Drinks Cart respectively); page titles and taglines use the real names. Accent colours in each `app/globals.css` are still placeholders.

## Admin API / metafields

`mindarc_poc.site_membership` (single line text, one of `CC` / `PC` / `DC`) and `custom.favourites` (list of product references) exist as metafield definitions on `shuto-development-store` — created via `scripts/setup-metafield-definitions.mjs`, safe to re-run (it no-ops if they already exist). `packages/customer-data` uses the real Admin API driver whenever `SHOPIFY_ADMIN_API_ACCESS_TOKEN` is set, and falls back to a cookie-backed mock driver otherwise — so the app runs end-to-end either way.

## Content (Contentful)

Every customer-facing word and image on the three storefronts comes from one Contentful space
(`btqvjyd8l8lu`, "Asahi Multi-brand Test"); Shopify owns products, customers and companies. The
model follows the Confluence pages *Contentful overview*, *Homepage and landing sections*,
*Content page sections* and *Page types and reusable entries* in the Asahi space, consolidated to
the free plan's 25-content-type limit (see below).

### How a page renders

1. Each app is one **site**: `CC` (brand-a), `PC` (brand-b), `DC` (brand-c). The code comes from
   `siteMembership` in `lib/brand.ts`. Every Contentful query adds `fields.sites[in]=<site>`, so an
   app can never render another site's content.
2. `packages/contentful` reads the REST Content Delivery API with `include=6` and resolves links
   into plain objects (`resolve.ts`). REST is used instead of GraphQL because a page with a dozen
   polymorphic section types exceeds GraphQL's complexity limit.
3. A **Page** entry has a `slug`, an `audience` (`loggedOut` / `signedIn` / `all`) and an ordered
   `sections` list. `/` with audience `loggedOut` renders on `/gate` (the landing page);
   `/` with `signedIn` is the homepage; any other slug renders through `app/[slug]/page.tsx`.
4. `app/sections.tsx` is the **section registry**: one case per section content type, like a
   theme's sections folder. It maps Contentful entries to the structural props of the components in
   `packages/ui/src/cms` and fetches Shopify products for product rails.
5. Header, megamenu, announcement bar and footer come from the site's **Site Settings** entry
   (`app/layout.tsx`).

Adding a section type = a content type in Contentful + a type in `packages/contentful/src/types.ts`
+ a component in `packages/ui/src/cms` + a case in `app/sections.tsx` + the id in
`Page.sections` validation.

### Content types (24 of 25)

| Kind | Types |
| --- | --- |
| Page & chrome | `page`, `siteSettings`, `navigationItem`, `navigationColumn` |
| Small shared | `link`, `cta` |
| Sections | `heroCarousel`, `hero` (editorial hero), `ctaBand`, `mediaText` (video band / "Who backs it" / referral hero), `itemList` (12 layouts: steps, arrow list, icon row, feature columns, category tiles, timeline, stats, shortcuts, logo strip, brand directory, jurisdictions, testimonials), `productGrid` (product rail), `promoTile`, `faqAccordion`, `richTextBlock` (ruled rich text), `articleGrid`, `dataTable` |
| Items & reusable | `heroSlide`, `navLink` (**List item**: step, iconFeature, featureColumn, categoryTile, milestone, stat, railTab, shortcut, brandGroup), `brand`, `faq`, `testimonial`, `article`, `jurisdiction` |

The spec's separate item types were folded into **List item** and its list sections into
**itemList** to fit the plan. Four ids (`hero`, `richTextBlock`, `productGrid`, `navLink`) are
reused from an earlier draft model; their display names in Contentful are the spec names.

### Environment

```
CONTENTFUL_SPACE_ID=btqvjyd8l8lu
CONTENTFUL_ENVIRONMENT=master
CONTENTFUL_DELIVERY_TOKEN=   # Settings > API keys
CONTENTFUL_PREVIEW_TOKEN=    # same key, preview token
```

Same values in all three apps. Without them the pages render a static fallback.

### Preview

`/api/preview?slug=<slug>` turns on Next.js draft mode (requires a storefront login) and the pages
read drafts through the Preview API; an amber banner shows with an exit link. Contentful has one
preview environment per site (Settings > Content preview) pointing at the local ports.

### Cache

Fetches revalidate every 60s and are tagged `contentful`. For production, add a Contentful webhook
to a route that calls `revalidateTag("contentful")` and raise the revalidate window.
