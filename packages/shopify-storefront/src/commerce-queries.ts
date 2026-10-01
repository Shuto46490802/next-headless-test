import { IMAGE_FRAGMENT, MONEY_FRAGMENT } from "./queries";

/**
 * Listing, search and product-page queries for the Club Connect / Partner Connect design.
 * Filters come from Shopify Search & Discovery (collection.products.filters / search.productFilters);
 * product facts come from the `custom` metafields set up in the data mapping.
 */
export const PRODUCT_TILE_FRAGMENT = /* GraphQL */ `
  fragment ProductTileFields on Product {
    id
    handle
    title
    vendor
    productType
    tags
    availableForSale
    featuredImage {
      ...ImageFields
    }
    priceRange {
      minVariantPrice {
        ...MoneyFields
      }
      maxVariantPrice {
        ...MoneyFields
      }
    }
    compareAtPriceRange {
      maxVariantPrice {
        ...MoneyFields
      }
    }
    pointsCostMetafield: metafield(namespace: "mindarc_poc", key: "points_cost") {
      value
    }
    brand: metafield(namespace: "custom", key: "brand") {
      value
    }
    creditEarned: metafield(namespace: "custom", key: "credit_earned") {
      value
    }
    caseQuantity: metafield(namespace: "custom", key: "case_quantity") {
      value
    }
    container: metafield(namespace: "custom", key: "container") {
      value
    }
    variants(first: 10) {
      nodes {
        id
        title
        availableForSale
        price {
          ...MoneyFields
        }
        compareAtPrice {
          ...MoneyFields
        }
        selectedOptions {
          name
          value
        }
      }
    }
  }
  ${IMAGE_FRAGMENT}
  ${MONEY_FRAGMENT}
`;

const FILTER_FRAGMENT = /* GraphQL */ `
  fragment FilterFields on Filter {
    id
    label
    type
    values {
      id
      label
      count
      input
    }
  }
`;

export const COLLECTION_LISTING_QUERY = /* GraphQL */ `
  query CollectionListing(
    $handle: String!
    $first: Int!
    $after: String
    $filters: [ProductFilter!]
    $sortKey: ProductCollectionSortKeys
    $reverse: Boolean
    $buyer: BuyerInput
  ) @inContext(buyer: $buyer) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      image {
        ...ImageFields
      }
      products(first: $first, after: $after, filters: $filters, sortKey: $sortKey, reverse: $reverse) {
        filters {
          ...FilterFields
        }
        nodes {
          ...ProductTileFields
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
  ${PRODUCT_TILE_FRAGMENT}
  ${FILTER_FRAGMENT}
`;

export const SEARCH_PRODUCTS_QUERY = /* GraphQL */ `
  query SearchProducts(
    $query: String!
    $first: Int!
    $after: String
    $productFilters: [ProductFilter!]
    $sortKey: SearchSortKeys
    $reverse: Boolean
    $buyer: BuyerInput
  ) @inContext(buyer: $buyer) {
    search(
      query: $query
      first: $first
      after: $after
      types: [PRODUCT]
      productFilters: $productFilters
      sortKey: $sortKey
      reverse: $reverse
      unavailableProducts: LAST
    ) {
      totalCount
      productFilters {
        ...FilterFields
      }
      nodes {
        ... on Product {
          ...ProductTileFields
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
  ${PRODUCT_TILE_FRAGMENT}
  ${FILTER_FRAGMENT}
`;

export const PREDICTIVE_SEARCH_QUERY = /* GraphQL */ `
  query PredictiveSearch($query: String! $buyer: BuyerInput) @inContext(buyer: $buyer) {
    predictiveSearch(query: $query, limit: 6, limitScope: EACH, types: [QUERY, COLLECTION, PRODUCT], unavailableProducts: LAST) {
      queries {
        text
      }
      collections {
        handle
        title
      }
      products {
        ...ProductTileFields
      }
    }
  }
  ${PRODUCT_TILE_FRAGMENT}
`;

export const PRODUCT_RECOMMENDATIONS_QUERY = /* GraphQL */ `
  query ProductRecommendations($productId: ID! $buyer: BuyerInput) @inContext(buyer: $buyer) {
    productRecommendations(productId: $productId, intent: RELATED) {
      ...ProductTileFields
    }
  }
  ${PRODUCT_TILE_FRAGMENT}
`;

export const POPULAR_PRODUCTS_QUERY = /* GraphQL */ `
  query PopularProducts($first: Int! $buyer: BuyerInput) @inContext(buyer: $buyer) {
    products(first: $first, sortKey: BEST_SELLING) {
      nodes {
        ...ProductTileFields
      }
    }
  }
  ${PRODUCT_TILE_FRAGMENT}
`;

export const PRODUCT_PAGE_QUERY = /* GraphQL */ `
  query ProductPage($handle: String! $buyer: BuyerInput) @inContext(buyer: $buyer) {
    product(handle: $handle) {
      ...ProductTileFields
      descriptionHtml
      images(first: 10) {
        nodes {
          ...ImageFields
        }
      }
      options {
        name
        optionValues {
          name
        }
      }
      collections(first: 5) {
        nodes {
          handle
          title
        }
      }
      specs: metafields(
        identifiers: [
          { namespace: "custom", key: "abv" }
          { namespace: "custom", key: "standard_drinks" }
          { namespace: "custom", key: "unit_size" }
          { namespace: "custom", key: "case_quantity" }
          { namespace: "custom", key: "container" }
          { namespace: "custom", key: "serve" }
          { namespace: "custom", key: "case_dimensions" }
          { namespace: "custom", key: "max_qty_per_order" }
        ]
      ) {
        key
        value
      }
      allVariants: variants(first: 100) {
        nodes {
          id
          title
          availableForSale
          price {
            ...MoneyFields
          }
          compareAtPrice {
            ...MoneyFields
          }
          selectedOptions {
            name
            value
          }
          image {
            ...ImageFields
          }
        }
      }
    }
  }
  ${PRODUCT_TILE_FRAGMENT}
`;

/** Match count for the search overlay's "N matches" / "See all N results" (predictiveSearch has no count). */
export const SEARCH_COUNT_QUERY = /* GraphQL */ `
  query SearchCount($query: String!, $productFilters: [ProductFilter!], $buyer: BuyerInput) @inContext(buyer: $buyer) {
    search(query: $query, first: 1, types: [PRODUCT], prefix: LAST, unavailableProducts: LAST, productFilters: $productFilters) {
      totalCount
    }
  }
`;

/** Shopping list detail and "Add all to cart": tiles for a set of product IDs, in buyer context. */
export const TILES_BY_IDS_QUERY = /* GraphQL */ `
  query TilesByIds($ids: [ID!]!, $buyer: BuyerInput) @inContext(buyer: $buyer) {
    nodes(ids: $ids) {
      ... on Product {
        ...ProductTileFields
      }
    }
  }
  ${PRODUCT_TILE_FRAGMENT}
`;
