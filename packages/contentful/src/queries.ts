const IMAGE_FIELDS = /* GraphQL */ `
  fragment ImageFields on Asset {
    url
    title
    description
    width
    height
  }
`;

/**
 * Sections are a polymorphic reference list, so each section type gets an inline fragment.
 * Adding a section type = add a fragment here, a case in the app's section renderer, and the
 * content type id to the Page.sections validation in Contentful.
 */
const SECTION_FIELDS = /* GraphQL */ `
  fragment SectionFields on Entry {
    __typename
    sys { id }
    ... on Hero {
      headline
      subheadline
      ctaLabel
      ctaUrl
      backgroundColor
      backgroundImage { ...ImageFields }
    }
    ... on RichTextBlock {
      heading
      body { json }
    }
    ... on ProductGrid {
      heading
      shopifyCollectionHandle
      limit
    }
  }
`;

/**
 * Every query takes `$brand` and filters on the Brand reference's slug. The brand slug comes
 * from the app's own config, never from the request, so the filter cannot be bypassed.
 */
export const PAGE_QUERY = /* GraphQL */ `
  ${IMAGE_FIELDS}
  ${SECTION_FIELDS}
  query Page($brand: String!, $slug: String!, $preview: Boolean = false) {
    pageCollection(
      where: { brand: { slug: $brand }, slug: $slug }
      order: sys_publishedAt_DESC
      limit: 1
      preview: $preview
    ) {
      items {
        sys { id }
        title
        slug
        seoDescription
        sectionsCollection(limit: 20) {
          items { ...SectionFields }
        }
      }
    }
  }
`;

export const BRAND_QUERY = /* GraphQL */ `
  ${IMAGE_FIELDS}
  query Brand($brand: String!, $preview: Boolean = false) {
    brandCollection(where: { slug: $brand }, limit: 1, preview: $preview) {
      items {
        name
        slug
        primaryColor
        domain
        logo { ...ImageFields }
      }
    }
  }
`;

const NAV_LINK_FIELDS = /* GraphQL */ `
  fragment NavLinkFields on NavLink {
    label
    url
  }
`;

const NAV_COLUMN_FIELDS = /* GraphQL */ `
  ${NAV_LINK_FIELDS}
  fragment NavColumnFields on NavigationColumn {
    heading
    linksCollection(limit: 10) {
      items { ...NavLinkFields }
    }
  }
`;

export const SITE_SETTINGS_QUERY = /* GraphQL */ `
  ${IMAGE_FIELDS}
  ${NAV_COLUMN_FIELDS}
  query SiteSettings($brand: String!, $preview: Boolean = false) {
    siteSettingsCollection(where: { brand: { slug: $brand } }, limit: 1, preview: $preview) {
      items {
        announcementBar
        footerText
        headerNavigationCollection(limit: 8) {
          items {
            label
            url
            promoHeading
            promoUrl
            promoImage { ...ImageFields }
            columnsCollection(limit: 4) {
              items { ...NavColumnFields }
            }
          }
        }
        footerColumnsCollection(limit: 4) {
          items { ...NavColumnFields }
        }
        socialLinksCollection(limit: 6) {
          items { ...NavLinkFields }
        }
      }
    }
  }
`;
