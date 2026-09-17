#!/usr/bin/env node
// Diagnoses why the "Add to cart · N points" button isn't showing: compares what the Storefront
// API returns for mindarc_poc.points_cost (what the PDP sees) with the raw Admin API value and
// the metafield definition's storefront access.
//
// Usage (same env vars as the app; Admin creds optional):
//   SHOPIFY_STORE_DOMAIN=... NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN=... \
//   SHOPIFY_ADMIN_API_ACCESS_TOKEN=... node scripts/check-points-metafield.mjs
//
// Or, if you keep the vars in a file:  set -a; source .env.local; set +a; node scripts/check-points-metafield.mjs

const env = process.env;
const shop = env.SHOPIFY_STORE_DOMAIN;
const sfToken = env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN;
const sfVersion = env.SHOPIFY_STOREFRONT_API_VERSION ?? "2026-07";
const adminVersion = env.SHOPIFY_ADMIN_API_VERSION ?? "2026-07";
if (!shop || !sfToken) {
  console.error("Set SHOPIFY_STORE_DOMAIN and NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN.");
  process.exit(1);
}
console.log(`store: ${shop}`);

const sf = await fetch(`https://${shop}/api/${sfVersion}/graphql.json`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": sfToken },
  body: JSON.stringify({
    query: `{ products(first: 50) { nodes { handle pointsCost: metafield(namespace:"mindarc_poc", key:"points_cost") { value } } } }`,
  }),
}).then((r) => r.json());

console.log("\nStorefront API (what the PDP sees):");
if (sf.errors) console.log("  errors:", JSON.stringify(sf.errors));
const sfNodes = sf.data?.products?.nodes ?? [];
for (const p of sfNodes) console.log(`  ${p.handle.padEnd(32)} points_cost = ${p.pointsCost?.value ?? "null"}`);

let token = env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;
if (!token && env.SHOPIFY_ADMIN_CLIENT_ID && env.SHOPIFY_ADMIN_CLIENT_SECRET) {
  const t = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: env.SHOPIFY_ADMIN_CLIENT_ID, client_secret: env.SHOPIFY_ADMIN_CLIENT_SECRET }),
  }).then((r) => r.json());
  token = t.access_token;
}
if (!token) {
  console.log("\nNo Admin credentials set — skipping the Admin comparison.");
  console.log("If every points_cost above is null, the usual cause is the metafield definition lacking Storefront access:");
  console.log("  Shopify admin → Settings → Custom data → Products → Points cost → Access → enable Storefronts.");
  process.exit(0);
}

const admin = await fetch(`https://${shop}/admin/api/${adminVersion}/graphql.json`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
  body: JSON.stringify({
    query: `{
      metafieldDefinitions(first: 10, ownerType: PRODUCT, namespace: "mindarc_poc") {
        nodes { key name type { name } access { storefront admin } }
      }
      products(first: 50) { nodes { handle pointsCost: metafield(namespace:"mindarc_poc", key:"points_cost") { value type } } }
    }`,
  }),
}).then((r) => r.json());

console.log("\nAdmin API (source of truth):");
if (admin.errors) console.log("  errors:", JSON.stringify(admin.errors));
const defs = admin.data?.metafieldDefinitions?.nodes ?? [];
if (defs.length === 0) console.log("  ⚠ no PRODUCT metafield definitions in namespace mindarc_poc — values may be unstructured");
for (const d of defs) {
  const flag = d.key === "points_cost" && d.access?.storefront !== "PUBLIC_READ" ? "  ⚠ NOT readable by Storefront API" : "";
  console.log(`  definition ${d.key.padEnd(16)} type=${d.type.name.padEnd(16)} storefront access=${d.access?.storefront ?? "NONE"}${flag}`);
}
for (const p of admin.data?.products?.nodes ?? []) {
  if (p.pointsCost) console.log(`  ${p.handle.padEnd(32)} points_cost = ${p.pointsCost.value} (${p.pointsCost.type})`);
}

const sfHas = sfNodes.filter((p) => p.pointsCost?.value).length;
const adminHas = (admin.data?.products?.nodes ?? []).filter((p) => p.pointsCost?.value).length;
console.log(`\nSummary: Admin sees ${adminHas} product(s) with points_cost; Storefront sees ${sfHas}.`);
if (adminHas > 0 && sfHas === 0) console.log("→ Value exists but isn't exposed: enable Storefront access on the points_cost definition.");
if (adminHas === 0) console.log("→ No product has a points_cost value on this store yet.");
