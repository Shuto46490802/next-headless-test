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

/**
 * The signed-in customer's B2B standing: every company they're a contact of, the locations
 * they can act for, and the role they hold at each. Drives the partner Users page's
 * permission check (view = any role at the location, manage = a role named "*admin*").
 */
export const COMPANY_ACCESS_QUERY = /* GraphQL */ `
  query CompanyAccess {
    customer {
      id
      companyContacts(first: 10) {
        nodes {
          id
          company {
            id
            name
          }
          locations(first: 25) {
            nodes {
              id
              name
              roleAssignments(first: 50) {
                nodes {
                  id
                  role {
                    id
                    name
                  }
                  contact {
                    id
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

/** The customer's default company location: first location of their first company contact. */
export const DEFAULT_COMPANY_LOCATION_QUERY = /* GraphQL */ `
  query DefaultCompanyLocation {
    customer {
      companyContacts(first: 1) {
        nodes {
          company {
            id
            name
          }
          locations(first: 10) {
            nodes {
              id
              name
            }
          }
        }
      }
    }
  }
`;

/* ---------------------------------------------------------------- account pages */

/** Header, dashboard and account menu: who is signed in, their club and its credit metafields. */
export const ACCOUNT_OVERVIEW_QUERY = /* GraphQL */ `
  query AccountOverview {
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
      companyContacts(first: 1) {
        nodes {
          id
          title
          company {
            id
            name
            externalId
            metafields(
              identifiers: [
                { namespace: "custom", key: "credit_balance" }
                { namespace: "custom", key: "credit_pending" }
                { namespace: "custom", key: "credit_donated" }
                { namespace: "custom", key: "referral_code" }
                { namespace: "custom", key: "account_status" }
              ]
            ) {
              key
              value
            }
          }
          locations(first: 1) {
            nodes {
              id
              name
              externalId
            }
          }
        }
      }
    }
  }
`;

export const ACCOUNT_ORDER_ROW_FRAGMENT = /* GraphQL */ `
  fragment AccountOrderRow on Order {
    id
    name
    number
    processedAt
    financialStatus
    fulfillmentStatus
    totalPrice {
      amount
      currencyCode
    }
    purchasingEntity {
      ... on PurchasingCompany {
        contact {
          customer {
            firstName
            lastName
          }
        }
      }
      ... on Customer {
        firstName
        lastName
      }
    }
    fulfillments(first: 5) {
      nodes {
        status
        latestShipmentStatus
        updatedAt
        trackingInformation {
          number
          url
          company
        }
      }
    }
  }
`;

/** Orders & invoices, "All users": every order placed for the company location. */
export const LOCATION_ORDERS_QUERY = /* GraphQL */ `
  query LocationOrders($locationId: ID!, $first: Int!, $after: String, $query: String) {
    companyLocation(id: $locationId) {
      orders(first: $first, after: $after, reverse: true, sortKey: PROCESSED_AT, query: $query) {
        nodes {
          ...AccountOrderRow
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
  ${ACCOUNT_ORDER_ROW_FRAGMENT}
`;

/** Orders & invoices, "Only mine". */
export const MY_ORDERS_QUERY = /* GraphQL */ `
  query MyOrders($first: Int!, $after: String, $query: String) {
    customer {
      orders(first: $first, after: $after, reverse: true, sortKey: PROCESSED_AT, query: $query) {
        nodes {
          ...AccountOrderRow
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
  ${ACCOUNT_ORDER_ROW_FRAGMENT}
`;

/** Order detail: contents, payment summary, addresses and one timeline per fulfilment. */
export const ACCOUNT_ORDER_DETAIL_QUERY = /* GraphQL */ `
  fragment OrderAddress on CustomerAddress {
    firstName
    lastName
    company
    address1
    address2
    city
    zoneCode
    zip
    territoryCode
  }

  query AccountOrderDetail($id: ID!) {
    order(id: $id) {
      id
      name
      processedAt
      updatedAt
      financialStatus
      fulfillmentStatus
      note
      subtotal {
        amount
        currencyCode
      }
      totalTax {
        amount
        currencyCode
      }
      totalShipping {
        amount
        currencyCode
      }
      totalPrice {
        amount
        currencyCode
      }
      discountApplications(first: 5) {
        nodes {
          ... on DiscountCodeApplication {
            code
          }
          value {
            ... on MoneyV2 {
              amount
              currencyCode
            }
            ... on PricingPercentageValue {
              percentage
            }
          }
        }
      }
      transactions {
        kind
        status
        type
        paymentDetails {
          ... on CardPaymentDetails {
            cardBrand
            last4
          }
        }
      }
      purchasingEntity {
        ... on PurchasingCompany {
          contact {
            customer {
              firstName
              lastName
            }
          }
        }
        ... on Customer {
          firstName
          lastName
        }
      }
      shippingAddress {
        ...OrderAddress
      }
      billingAddress {
        ...OrderAddress
      }
      shippingLine {
        title
      }
      fulfillments(first: 10) {
        nodes {
          status
          latestShipmentStatus
          createdAt
          updatedAt
          trackingInformation {
            number
            url
            company
          }
          events(first: 10) {
            nodes {
              status
              happenedAt
            }
          }
        }
      }
      lineItems(first: 100) {
        nodes {
          id
          title
          variantTitle
          quantity
          productId
          variantId
          totalPrice {
            amount
            currencyCode
          }
          image {
            url
            altText
          }
        }
      }
    }
  }
`;

/** Sign-up gate: the customer's own status (Drinks Cart) and their company's status and location (CC/PC). */
export const ACCESS_STATUS_QUERY = /* GraphQL */ `
  query AccessStatus {
    customer {
      accountStatus: metafield(namespace: "custom", key: "account_status") {
        value
      }
      companyContacts(first: 1) {
        nodes {
          company {
            id
            accountStatus: metafield(namespace: "custom", key: "account_status") {
              value
            }
          }
          locations(first: 1) {
            nodes {
              id
            }
          }
        }
      }
    }
  }
`;

/** Partner locations page: every location of the customer's company with its addresses. */
export const COMPANY_LOCATIONS_QUERY = /* GraphQL */ `
  query CompanyLocations {
    customer {
      companyContacts(first: 1) {
        nodes {
          id
          company {
            id
            name
          }
          locations(first: 50) {
            nodes {
              id
              name
              shippingAddress {
                address1
                address2
                city
                zoneCode
                zip
                countryCode
                recipient
              }
              billingAddress {
                address1
                address2
                city
                zoneCode
                zip
                countryCode
              }
            }
          }
        }
      }
    }
  }
`;
