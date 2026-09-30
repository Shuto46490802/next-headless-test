import type { ProductCardData } from "../components/ProductCard";
import fixture from "@repo/contentful/fixtures/space.json";

/** Pack-shot stand-ins: brand logo assets from the exported space, so rails render offline. */
const logo = (id: string) => {
  const a = (fixture as { assets: { sys: { id: string }; fields: { file?: { url?: string } } }[] }).assets.find((x) => x.sys.id === id);
  const url = a?.fields.file?.url;
  return url ? { url: url.startsWith("//") ? `https:${url}` : url, altText: id } : null;
};

/** Shopify data is outside Contentful; rails in Storybook use these stand-ins. */
export const mockProducts: ProductCardData[] = [
  { id: "p1", handle: "woodstock-bourbon-cola-24", title: "Bourbon & Cola 4.8% 375mL Cans 24 Pack", featuredImage: logo("logo-woodstock"), priceRange: { minVariantPrice: { amount: "99.00", currencyCode: "AUD" } }, pointsCost: 990 },
  { id: "p2", handle: "asahi-zeitaku-shibori-peach-24", title: "Zeitaku Shibori Peach 4.0% 330mL Cans 24 Pack", featuredImage: logo("logo-asahi"), priceRange: { minVariantPrice: { amount: "105.00", currencyCode: "AUD" } }, pointsCost: 1050 },
  { id: "p3", handle: "hard-rated-orange-passionfruit-24", title: "Orange Passionfruit Zero Sugar 375mL 24 Pack", featuredImage: logo("logo-hard-rated"), priceRange: { minVariantPrice: { amount: "110.00", currencyCode: "AUD" } }, pointsCost: 1100 },
  { id: "p4", handle: "great-northern-original-24", title: "Original 4.2% 375mL Cans 24 Pack", featuredImage: logo("logo-great-northern"), priceRange: { minVariantPrice: { amount: "89.00", currencyCode: "AUD" } }, pointsCost: 890 },
];
export const noopCart = { updateQuantity: async () => ({ ok: true as const }), remove: async () => ({ ok: true as const }) };
