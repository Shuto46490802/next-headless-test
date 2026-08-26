export const MONEY_FRAGMENT = /* GraphQL */ `
  fragment MoneyFields on MoneyV2 {
    amount
    currencyCode
  }
`;

export const IMAGE_FRAGMENT = /* GraphQL */ `
  fragment ImageFields on Image {
    url
    altText
    width
    height
  }
`;

export const PRODUCT_SUMMARY_FRAGMENT = /* GraphQL */ `
  fragment ProductSummaryFields on Product {
    id
    handle
    title
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
  }
  ${IMAGE_FRAGMENT}
  ${MONEY_FRAGMENT}
`;

export const PRODUCT_DETAIL_QUERY = /* GraphQL */ `
  query ProductByHandle($handle: String!) {
    product(handle: $handle) {
      ...ProductSummaryFields
      descriptionHtml
      images(first: 10) {
        nodes {
          ...ImageFields
        }
      }
      options {
        name
        values
      }
      variants(first: 100) {
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
  ${PRODUCT_SUMMARY_FRAGMENT}
`;

export const PRODUCTS_QUERY = /* GraphQL */ `
  query Products($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      nodes {
        ...ProductSummaryFields
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
  ${PRODUCT_SUMMARY_FRAGMENT}
`;

export const PRODUCTS_BY_IDS_QUERY = /* GraphQL */ `
  query ProductsByIds($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        ...ProductSummaryFields
      }
    }
  }
  ${PRODUCT_SUMMARY_FRAGMENT}
`;

export const COLLECTION_QUERY = /* GraphQL */ `
  query CollectionByHandle($handle: String!, $first: Int!, $after: String) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      image {
        ...ImageFields
      }
      products(first: $first, after: $after) {
        nodes {
          ...ProductSummaryFields
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
  ${PRODUCT_SUMMARY_FRAGMENT}
  ${IMAGE_FRAGMENT}
`;

export const COLLECTIONS_QUERY = /* GraphQL */ `
  query Collections($first: Int!) {
    collections(first: $first) {
      nodes {
        id
        handle
        title
        description
        image {
          ...ImageFields
        }
      }
    }
  }
  ${IMAGE_FRAGMENT}
`;

export const CART_FRAGMENT = /* GraphQL */ `
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    cost {
      subtotalAmount {
        ...MoneyFields
      }
      totalAmount {
        ...MoneyFields
      }
    }
    lines(first: 100) {
      nodes {
        id
        quantity
        cost {
          totalAmount {
            ...MoneyFields
          }
        }
        merchandise {
          ... on ProductVariant {
            id
            title
            image {
              ...ImageFields
            }
            product {
              handle
              title
            }
            selectedOptions {
              name
              value
            }
          }
        }
      }
    }
  }
  ${MONEY_FRAGMENT}
  ${IMAGE_FRAGMENT}
`;

export const CART_QUERY = /* GraphQL */ `
  query Cart($cartId: ID!) {
    cart(id: $cartId) {
      ...CartFields
    }
  }
  ${CART_FRAGMENT}
`;

export const CART_CREATE_MUTATION = /* GraphQL */ `
  mutation CartCreate($lines: [CartLineInput!]) {
    cartCreate(input: { lines: $lines }) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
      }
    }
  }
  ${CART_FRAGMENT}
`;

export const CART_LINES_ADD_MUTATION = /* GraphQL */ `
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
      }
    }
  }
  ${CART_FRAGMENT}
`;

export const CART_LINES_UPDATE_MUTATION = /* GraphQL */ `
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
      }
    }
  }
  ${CART_FRAGMENT}
`;

export const CART_LINES_REMOVE_MUTATION = /* GraphQL */ `
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
      }
    }
  }
  ${CART_FRAGMENT}
`;
