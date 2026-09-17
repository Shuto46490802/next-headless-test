#!/usr/bin/env node
// One-time setup: creates the customer.mindarc_poc.site_membership and
// customer.custom.favourites metafield definitions used by @repo/customer-data's admin
// driver. Safe to re-run — definitions that already exist are skipped.
//
// Usage (legacy static token):
//   SHOPIFY_STORE_DOMAIN=shuto-development-store.myshopify.com \
//   SHOPIFY_ADMIN_API_ACCESS_TOKEN=shpat_xxx \
//   node scripts/setup-metafield-definitions.mjs
//
// Usage (Dev Dashboard app — client credentials grant):
//   SHOPIFY_STORE_DOMAIN=new-store.myshopify.com \
//   SHOPIFY_ADMIN_CLIENT_ID=xxx SHOPIFY_ADMIN_CLIENT_SECRET=shpss_xxx \
//   node scripts/setup-metafield-definitions.mjs

const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION ?? "2026-07";
const clientId = process.env.SHOPIFY_ADMIN_CLIENT_ID;
const clientSecret = process.env.SHOPIFY_ADMIN_CLIENT_SECRET;
let accessToken = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;

if (!storeDomain || (!accessToken && !(clientId && clientSecret))) {
  console.error(
    "Set SHOPIFY_STORE_DOMAIN plus either SHOPIFY_ADMIN_API_ACCESS_TOKEN or SHOPIFY_ADMIN_CLIENT_ID + SHOPIFY_ADMIN_CLIENT_SECRET.",
  );
  process.exit(1);
}

if (!accessToken) {
  const res = await fetch(`https://${storeDomain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }).toString(),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    console.error(`Client credentials grant failed (${res.status}):`, json);
    process.exit(1);
  }
  accessToken = json.access_token;
}

const MUTATION = /* GraphQL */ `
  mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
    metafieldDefinitionCreate(definition: $definition) {
      createdDefinition {
        id
        name
        namespace
        key
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

const definitions = [
  {
    name: "Site membership",
    namespace: "mindarc_poc",
    key: "site_membership",
    type: "single_line_text_field",
    ownerType: "CUSTOMER",
    description:
      "The single headless site this customer's account is locked to: CC (Club Connect), PC (Partner Connect) or DC (Drinks Cart).",
    validations: [{ name: "choices", value: JSON.stringify(["CC", "PC", "DC"]) }],
  },
  {
    name: "Favourites",
    namespace: "custom",
    key: "favourites",
    type: "list.product_reference",
    ownerType: "CUSTOMER",
    description: "Products this customer has added to their favourites.",
  },
];

async function main() {
  for (const definition of definitions) {
    const res = await fetch(`https://${storeDomain}/admin/api/${apiVersion}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query: MUTATION, variables: { definition } }),
    });

    const json = await res.json();
    const result = json.data?.metafieldDefinitionCreate;
    const alreadyExists = result?.userErrors?.some((e) => e.code === "TAKEN");

    if (alreadyExists) {
      console.log(`✓ ${definition.namespace}.${definition.key} already exists, skipping.`);
    } else if (result?.userErrors?.length) {
      console.error(`✗ ${definition.namespace}.${definition.key} failed:`, result.userErrors);
    } else if (result?.createdDefinition) {
      console.log(`✓ Created ${definition.namespace}.${definition.key} (${result.createdDefinition.id})`);
    } else {
      console.error(`✗ ${definition.namespace}.${definition.key} unexpected response:`, JSON.stringify(json));
    }
  }
}

main();
