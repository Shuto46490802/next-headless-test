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
