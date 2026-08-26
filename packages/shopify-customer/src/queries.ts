export const ADDRESS_FRAGMENT = /* GraphQL */ `
  fragment AddressFields on CustomerAddress {
    id
    firstName
    lastName
    company
    address1
    address2
    city
    zip
    zoneCode
    territoryCode
    phoneNumber
  }
`;

export const CUSTOMER_PROFILE_QUERY = /* GraphQL */ `
  query CustomerProfile {
    customer {
      id
      firstName
      lastName
      emailAddress {
        emailAddress
      }
      phoneNumber {
        phoneNumber
      }
      defaultAddress {
        ...AddressFields
      }
    }
  }
  ${ADDRESS_FRAGMENT}
`;

export const CUSTOMER_ADDRESSES_QUERY = /* GraphQL */ `
  query CustomerAddresses {
    customer {
      defaultAddress {
        id
      }
      addresses(first: 20) {
        nodes {
          ...AddressFields
        }
      }
    }
  }
  ${ADDRESS_FRAGMENT}
`;

export const CUSTOMER_UPDATE_MUTATION = /* GraphQL */ `
  mutation CustomerUpdate($input: CustomerUpdateInput!) {
    customerUpdate(input: $input) {
      customer {
        id
        firstName
        lastName
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const ADDRESS_CREATE_MUTATION = /* GraphQL */ `
  mutation AddressCreate($address: CustomerAddressInput!, $defaultAddress: Boolean) {
    customerAddressCreate(address: $address, defaultAddress: $defaultAddress) {
      customerAddress {
        ...AddressFields
      }
      userErrors {
        field
        message
      }
    }
  }
  ${ADDRESS_FRAGMENT}
`;

export const ADDRESS_UPDATE_MUTATION = /* GraphQL */ `
  mutation AddressUpdate($addressId: ID!, $address: CustomerAddressInput!, $defaultAddress: Boolean) {
    customerAddressUpdate(addressId: $addressId, address: $address, defaultAddress: $defaultAddress) {
      customerAddress {
        ...AddressFields
      }
      userErrors {
        field
        message
      }
    }
  }
  ${ADDRESS_FRAGMENT}
`;

export const ADDRESS_DELETE_MUTATION = /* GraphQL */ `
  mutation AddressDelete($addressId: ID!) {
    customerAddressDelete(addressId: $addressId) {
      deletedAddressId
      userErrors {
        field
        message
      }
    }
  }
`;

export const ORDERS_QUERY = /* GraphQL */ `
  query CustomerOrders($first: Int!, $after: String) {
    customer {
      orders(first: $first, after: $after, reverse: true) {
        nodes {
          id
          name
          processedAt
          financialStatus
          fulfillmentStatus
          statusPageUrl
          totalPrice {
            amount
            currencyCode
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

export const ORDER_DETAIL_QUERY = /* GraphQL */ `
  query OrderDetail($id: ID!) {
    order(id: $id) {
      id
      name
      processedAt
      financialStatus
      fulfillmentStatus
      statusPageUrl
      totalPrice {
        amount
        currencyCode
      }
      totalTax {
        amount
        currencyCode
      }
      subtotal {
        amount
        currencyCode
      }
      shippingAddress {
        ...AddressFields
      }
      lineItems(first: 50) {
        nodes {
          id
          name
          quantity
          productId
          variantId
          price {
            amount
            currencyCode
          }
          currentTotalPrice {
            amount
            currencyCode
          }
          image {
            url
            altText
            width
            height
          }
        }
      }
    }
  }
  ${ADDRESS_FRAGMENT}
`;
