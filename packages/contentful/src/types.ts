export interface ContentfulImage {
  url: string;
  title: string | null;
  description: string | null;
  width: number | null;
  height: number | null;
}

export interface Brand {
  name: string;
  slug: string;
  primaryColor: string | null;
  domain: string | null;
  logo: ContentfulImage | null;
}

/* ---- Rich text (Contentful document JSON, only the node types the model enables) ---- */

export interface RichTextMark {
  type: "bold" | "italic" | "underline" | "code";
}

export interface RichTextTextNode {
  nodeType: "text";
  value: string;
  marks: RichTextMark[];
}

export interface RichTextBlockNode {
  nodeType:
    | "paragraph"
    | "heading-1"
    | "heading-2"
    | "heading-3"
    | "heading-4"
    | "heading-5"
    | "heading-6"
    | "unordered-list"
    | "ordered-list"
    | "list-item"
    | "blockquote"
    | "hr"
    | "hyperlink"
    | (string & {});
  data: { uri?: string } & Record<string, unknown>;
  content: RichTextNode[];
}

export type RichTextNode = RichTextTextNode | RichTextBlockNode;

export interface RichTextDocument {
  nodeType: "document";
  content: RichTextNode[];
}

/* ---- Page sections. `__typename` is the discriminator, matching the content type id. ---- */

export interface HeroSection {
  __typename: "Hero";
  sys: { id: string };
  headline: string;
  subheadline: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  backgroundColor: string | null;
  backgroundImage: ContentfulImage | null;
}

export interface RichTextBlockSection {
  __typename: "RichTextBlock";
  sys: { id: string };
  heading: string | null;
  body: { json: RichTextDocument } | null;
}

export interface ProductGridSection {
  __typename: "ProductGrid";
  sys: { id: string };
  heading: string | null;
  /** Blank means "the storefront's first collection". */
  shopifyCollectionHandle: string | null;
  limit: number | null;
}

export type PageSection = HeroSection | RichTextBlockSection | ProductGridSection;

/** A brand's page: sections render top to bottom in this order. */
export interface Page {
  sys: { id: string };
  title: string;
  slug: string;
  seoDescription: string | null;
  sections: PageSection[];
}

/** Kept for the Hero component's prop shape; identical to HeroSection minus the discriminator. */
export type HeroContent = Omit<HeroSection, "__typename" | "sys">;

/* ---- Site chrome: announcement bar, header navigation, footer. One Site Settings per brand. ---- */

export interface NavLink {
  label: string;
  url: string;
}

export interface NavigationColumn {
  heading: string;
  links: NavLink[];
}

export interface NavigationItem {
  label: string;
  /** Null when the item only opens a megamenu. */
  url: string | null;
  /** Empty for a plain link; one or more columns make this a megamenu. */
  columns: NavigationColumn[];
  promo: { heading: string | null; url: string | null; image: ContentfulImage | null } | null;
}

export interface SiteSettings {
  announcementBar: string | null;
  headerNavigation: NavigationItem[];
  footerColumns: NavigationColumn[];
  footerText: string | null;
  socialLinks: NavLink[];
}
