#!/usr/bin/env node
// One-time setup: creates the customer.custom.brand and customer.custom.favourites
// metafield definitions used by @repo/customer-data's admin driver.
//
// Usage:
//   SHOPIFY_STORE_DOMAIN=shuto-development-store.myshopify.com \
//   SHOPIFY_ADMIN_API_ACCESS_TOKEN=shpat_xxx \
//   SHOPIFY_ADMIN_API_VERSION=2026-07 \
//   node scripts/setup-metafield-definitions.mjs

const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
const accessToken = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;
const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION ?? "2026-07";

if (!storeDomain || !accessToken) {
  console.error(
    "Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_API_ACCESS_TOKEN environment variables.",
  );
  process.exit(1);
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
    name: "Brand",
    namespace: "custom",
    key: "brand",
    type: "single_line_text_field",
    ownerType: "CUSTOMER",
    description: "The single storefront brand this customer's account is locked to.",
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
      console.log(`✓ custom.${definition.key} already exists, skipping.`);
    } else if (result?.userErrors?.length) {
      console.error(`✗ custom.${definition.key} failed:`, result.userErrors);
    } else if (result?.createdDefinition) {
      console.log(`✓ Created custom.${definition.key} (${result.createdDefinition.id})`);
    } else {
      console.error(`✗ custom.${definition.key} unexpected response:`, JSON.stringify(json));
    }
  }
}

main();
