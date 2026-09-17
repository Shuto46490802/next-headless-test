#!/usr/bin/env node
// One-time: obtain a permanent (offline) Admin API access token for a Dev Dashboard custom app
// installed on a store OUTSIDE your organisation (e.g. a client's store), where the client
// credentials grant is refused with "Client credentials cannot be performed on this shop".
//
// Runs the OAuth authorization code grant on localhost:
//   1. Prints an authorize URL — open it in a browser signed in to the store admin.
//   2. Shopify redirects back to http://localhost:3999/callback with a code.
//   3. The script verifies the HMAC, exchanges the code, and prints the token ONCE.
//   Paste the token into SHOPIFY_ADMIN_API_ACCESS_TOKEN (and leave the CLIENT_ID/SECRET vars empty).
//
// Before running: in the Dev Dashboard app → Versions → App URLs, add
//   http://localhost:3999/callback
// to the allowed redirect URLs and release the version.
//
// Usage:
//   SHOPIFY_STORE_DOMAIN=asahi.myshopify.com \
//   SHOPIFY_ADMIN_CLIENT_ID=xxx SHOPIFY_ADMIN_CLIENT_SECRET=xxx \
//   node scripts/get-admin-token.mjs
//
// Optional: SCOPES (comma-separated) to override the default set, PORT to change the port.

import { createServer } from "node:http";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const shop = process.env.SHOPIFY_STORE_DOMAIN;
const clientId = process.env.SHOPIFY_ADMIN_CLIENT_ID;
const clientSecret = process.env.SHOPIFY_ADMIN_CLIENT_SECRET;
const port = Number(process.env.PORT ?? 3999);
const scopes = process.env.SCOPES ?? "read_customers,write_customers,read_companies,write_companies";

if (!shop || !clientId || !clientSecret) {
  console.error("Set SHOPIFY_STORE_DOMAIN, SHOPIFY_ADMIN_CLIENT_ID and SHOPIFY_ADMIN_CLIENT_SECRET.");
  process.exit(1);
}

const redirectUri = `http://localhost:${port}/callback`;
const state = randomBytes(16).toString("hex");

function verifyHmac(params) {
  const { hmac, ...rest } = params;
  if (!hmac) return false;
  const message = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join("&");
  const digest = createHmac("sha256", clientSecret).update(message).digest("hex");
  const a = Buffer.from(digest, "utf8");
  const b = Buffer.from(hmac, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, redirectUri);
  if (url.pathname !== "/callback") {
    res.writeHead(404).end();
    return;
  }
  const params = Object.fromEntries(url.searchParams.entries());

  try {
    if (params.state !== state) throw new Error("state mismatch — start over");
    if (params.shop !== shop) throw new Error(`shop mismatch: got ${params.shop}`);
    if (!verifyHmac(params)) throw new Error("HMAC verification failed — check the client secret");

    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code: params.code }).toString(),
    });
    const text = await tokenRes.text();
    let json = {};
    try {
      json = JSON.parse(text);
    } catch {
      /* fallthrough */
    }
    if (!tokenRes.ok || !json.access_token) {
      throw new Error(`Token exchange failed (${tokenRes.status}): ${json.error_description ?? json.error ?? text.slice(0, 300)}`);
    }

    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Done — the token has been printed in your terminal. You can close this tab.");

    console.log("\n✓ Offline Admin API access token (store it as SHOPIFY_ADMIN_API_ACCESS_TOKEN):\n");
    console.log(`  ${json.access_token}\n`);
    console.log(`  granted scopes: ${json.scope}`);
    if (json.expires_in) console.log(`  ⚠ token expires in ${json.expires_in}s — this looks like an online token, not offline.`);
    console.log("\nThis token does not expire. Keep it secret; it is not shown again.");
  } catch (err) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end(`Failed: ${err.message}`);
    console.error(`\n✗ ${err.message}`);
  } finally {
    server.close();
  }
});

server.listen(port, () => {
  const authorize = new URL(`https://${shop}/admin/oauth/authorize`);
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("scope", scopes);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("state", state);
  // No grant_options[]=per-user → offline token (permanent).

  console.log(`Listening on ${redirectUri}`);
  console.log(`Requesting scopes: ${scopes}\n`);
  console.log("Open this URL in a browser that is signed in to the store admin:\n");
  console.log(`  ${authorize.toString()}\n`);
  console.log("Waiting for Shopify to redirect back…");
});
