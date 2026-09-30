import type { ContentfulImage, Resolved } from "./resolve";
export type { ContentfulImage, Resolved };

/* ---- Rich text (Contentful document JSON) ---- */
export interface RichTextTextNode { nodeType: "text"; value: string; marks: { type: string }[] }
export interface RichTextBlockNode { nodeType: string; data: { uri?: string; target?: unknown } & Record<string, unknown>; content: RichTextNode[] }
export type RichTextNode = RichTextTextNode | RichTextBlockNode;
export interface RichTextDocument { nodeType: "document"; content: RichTextNode[] }

/* ---- Shared ---- */
export type SiteCode = "CC" | "DC" | "PC";
export type HeadingLevel = "h1" | "h2" | "h3" | "h4";
export type Audience = "all" | "loggedOut" | "signedIn";
export type Hue = "none" | "orange" | "purple" | "orchid" | "pink" | "yellow" | "lime" | "sky";

export interface Link extends Resolved {
  contentType: "link";
  internalName: string;
  label?: string;
  linkType: "page" | "collection" | "product" | "account" | "external" | "anchor";
  page?: Pick<Page, "id" | "slug" | "title"> | null;
  shopifyHandle?: string;
  accountRoute?: "dashboard" | "orders" | "credit" | "points" | "lists" | "favourites" | "users" | "details" | "addresses" | "invite";
  url?: string;
  newTab?: boolean;
}
export interface Cta extends Resolved {
  contentType: "cta";
  label: string;
  link: Link | null;
  variant: "primary" | "secondary" | "ghost" | "tertiary" | "action" | "danger";
  size?: "small" | "medium" | "large";
  icon?: "none" | "arrowRight" | "play" | "cart" | "plus";
  iconPosition?: "left" | "right";
}
export interface HeadingGroup { eyebrow?: string; heading?: string; headingLevel?: HeadingLevel; body?: string | RichTextDocument }
export interface ImageGroup { image?: ContentfulImage | null; imageMobile?: ContentfulImage | null; altText?: string; imageDecorative?: boolean }
export interface Visibility { audience?: Audience; userBases?: string[]; states?: string[]; startAt?: string; endAt?: string }

/* ---- Reusable entries ---- */
export interface Brand extends Resolved { contentType: "brand"; name: string; logo: ContentfulImage | null; type?: string; description?: string; link?: Link | null; productCountLabel?: string }
export interface Faq extends Resolved, Visibility { contentType: "faq"; question: string; answer: RichTextDocument; cta?: Cta | null; defaultOpen?: boolean }
export interface Testimonial extends Resolved { contentType: "testimonial"; quote: string; attribution: string }
export interface Article extends Resolved {
  contentType: "article"; title: string; slug: string; category: string; location?: string; standfirst?: string;
  readTimeMinutes?: number; heroImage?: ContentfulImage | null; body?: RichTextDocument; featured?: boolean; badge?: string;
}
export interface Jurisdiction extends Resolved { contentType: "jurisdiction"; name: string; regulator?: string; body?: RichTextDocument; licenceNumber?: string }
export interface HeroSlide extends Resolved, Visibility {
  contentType: "heroSlide"; eyebrow?: string; heading: string; headingLevel?: "h1" | "h2"; bodyMobile?: string;
  image: ContentfulImage | null; imageMobile?: ContentfulImage | null; altText?: string; type: "brandLed" | "dcLed"; hue: Hue; ctas: Cta[]; slideLabel?: string;
}
export interface PromoTile extends Resolved, HeadingGroup, ImageGroup, Visibility { contentType: "promoTile"; cta: Cta | null; style?: "inverted" | "poster" | "collage" | "statement"; hue?: Hue }

/**
 * One item inside a list section. The free Starter space caps content types, so the spec's small
 * item types (stepItem, iconFeature, featureColumn, categoryTile, milestone, statItem, railTab,
 * shortcut, brandGroup) share this one type; `type` says which fields the component reads.
 * Content type id is `navLink` (reused from the earlier draft).
 */
export interface ListItem extends Resolved, ImageGroup {
  contentType: "navLink";
  type: "step" | "iconFeature" | "featureColumn" | "categoryTile" | "milestone" | "stat" | "railTab" | "shortcut" | "brandGroup";
  title: string; eyebrow?: string; body?: string; value?: string; icon?: string;
  link?: Link | null; cta?: Cta | null; brands?: Brand[]; shopifyHandle?: string; variant?: "default" | "viewAll";
}

/* ---- Sections ---- */
export type BandStyle = "white" | "tint" | "navy" | "grey";
export interface HeroCarouselSection extends Resolved { contentType: "heroCarousel"; internalName: string; slides: HeroSlide[]; evergreenTiles?: Cta[] }
/** Content type id `hero` (reused). */
export interface EditorialHeroSection extends Resolved, HeadingGroup, ImageGroup { contentType: "hero"; layout?: "split" | "textOnly" | "fullBleed"; searchPlaceholder?: string; version?: string }
export interface CtaBandSection extends Resolved, HeadingGroup, Visibility { contentType: "ctaBand"; bodyLines?: string[]; ctas: Cta[]; style?: "grey" | "black" | "light" | "navy" | "sky"; layout?: "centred" | "split" }
export interface MediaTextSection extends Resolved, HeadingGroup, ImageGroup, Visibility {
  contentType: "mediaText"; variant: "mediaText" | "logoGroupText" | "referralHero"; mediaType?: "video" | "image" | "brandCollage"; video?: string; videoCaption?: string;
  brands?: Brand[]; features?: ListItem[]; cta?: Cta | null; mediaPosition?: "left" | "right"; style?: "white" | "tint" | "navy";
}
export type ItemListLayout = "numberedSteps" | "arrowList" | "iconFeatureRow" | "featureColumns" | "categoryTiles" | "timeline" | "statsFeature" | "shortcutTiles" | "logoStrip" | "brandDirectory" | "jurisdictionList" | "testimonialCarousel";
export interface ItemListSection extends Resolved, HeadingGroup, Visibility {
  contentType: "itemList"; internalName: string; layout: ItemListLayout; style?: BandStyle;
  items: (ListItem | Testimonial | Jurisdiction | Brand)[]; cta?: Cta | null; link?: Link | null;
  featuredLabel?: string; featuredArticle?: Article | null; disclaimer?: string; settings?: Record<string, unknown>;
}
/** Content type id `productGrid` (reused). */
export interface ProductRailSection extends Resolved {
  contentType: "productGrid"; heading: string; link?: Link | null; source: "collection" | "buyAgain" | "related" | "complementary";
  tabs?: ListItem[]; shopifyHandle?: string; promoTile?: PromoTile | null; promoPosition?: number; limit?: number;
}
export interface FaqAccordionSection extends Resolved, HeadingGroup { contentType: "faqAccordion"; faqs: Faq[]; link?: Link | null; style?: "white" | "tint" | "grey" }
/** Content type id `richTextBlock` (reused). */
export interface RichTextRuledSection extends Resolved { contentType: "richTextBlock"; sideLabel?: string; body: RichTextDocument }
export interface ArticleGridSection extends Resolved { contentType: "articleGrid"; internalName: string; categories?: string[]; pageSize?: number }
export interface DataTableSection extends Resolved { contentType: "dataTable"; heading: string; columns: string[]; rows: string[][]; footnote?: string }

export type PageSection =
  | HeroCarouselSection | EditorialHeroSection | CtaBandSection | MediaTextSection | ItemListSection
  | ProductRailSection | PromoTile | FaqAccordionSection | RichTextRuledSection | ArticleGridSection | DataTableSection;

export interface Page extends Resolved {
  contentType: "page"; internalName: string; sites: SiteCode[]; slug: string; audience: Audience; title: string;
  parent?: Pick<Page, "id" | "slug" | "title"> | null; sections: PageSection[];
  seoTitle?: string; seoDescription?: string; seoImage?: ContentfulImage | null; noIndex?: boolean;
}

/* ---- Site chrome ---- */
export interface NavigationColumn extends Resolved { contentType: "navigationColumn"; heading: string; links: Link[] }
export interface NavigationItem extends Resolved { contentType: "navigationItem"; label: string; link?: Link | null; columns?: NavigationColumn[]; brands?: Brand[]; promoTile?: PromoTile | null; footerLink?: Link | null }
export interface SiteSettings extends Resolved {
  contentType: "siteSettings"; internalName: string; sites: SiteCode[]; logo?: ContentfulImage | null; announcementMessages?: string[];
  headerNavigation?: NavigationItem[]; loggedOutNavigation?: Link[]; loggedOutCtas?: Cta[];
  footerColumns?: NavigationColumn[]; footerText?: string; socialLinks?: Link[]; bottomBarLeft?: string; bottomBarRight?: string;
  searchPlaceholder?: string; seoTitle?: string; seoDescription?: string;
}
