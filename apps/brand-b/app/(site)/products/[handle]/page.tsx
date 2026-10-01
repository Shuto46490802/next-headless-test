import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb, ProductAbout, ProductDetail, ProductRailSection, SpecGrid } from "@repo/ui";
import { storefront } from "../../../../lib/shopify";
import { getSession } from "../../../../lib/session";
import { getFavouriteIds } from "../../../../lib/favorites";
import { SHOW_CREDIT, getBuyer } from "../../../../lib/listing";
import { addToCartAction } from "../../../product-actions";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const product = await storefront.getProductPage(handle).catch(() => null);
  return product ? { title: product.title, openGraph: product.featuredImage ? { images: [product.featuredImage.url] } : undefined } : {};
}

const withUnit = (v: string | undefined, unit: string) => (v ? `${v}${unit}` : undefined);

/**
 * Figma "CC / PDP": gallery and buy panel (sticky buy bar once it scrolls away), About this
 * product, the specification grid from `custom.*` metafields, and "Clubs also ordered" from
 * Shopify's related-product recommendations.
 */
export default async function ProductPage({ params }: Props) {
  const { handle } = await params;
  const buyer = await getBuyer();
  const product = await storefront.getProductPage(handle, buyer);
  if (!product) notFound();

  const [session, favouriteIds, related] = await Promise.all([
    getSession(),
    getFavouriteIds(),
    storefront.getProductRecommendations(product.id, 4, buyer).catch(() => []),
  ]);
  const isLoggedIn = Boolean(session);
  const s = product.specs;
  const collection = product.collections[0];

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          ...(collection ? [{ label: collection.title, href: `/collections/${collection.handle}` }] : [{ label: "Shop", href: "/products" }]),
          { label: product.title },
        ]}
      />
      <ProductDetail
        product={{
          id: product.id,
          handle: product.handle,
          title: product.title,
          brand: product.brand,
          eyebrowDetail: product.productType || null,
          availableForSale: product.availableForSale,
          images: product.images,
          options: product.options,
          variants: product.allVariants,
          creditEarned: product.creditEarned,
          caseQuantity: product.caseQuantity,
          container: product.container,
          maxQuantity: s.max_qty_per_order ? Number(s.max_qty_per_order) : null,
        }}
        onAddToCart={addToCartAction}
        isLoggedIn={isLoggedIn}
        isFavourited={favouriteIds.has(product.id)}
        showCredit={SHOW_CREDIT}
      />
      <ProductAbout html={product.descriptionHtml} />
      <SpecGrid
        rows={[
          { label: "ABV", value: withUnit(s.abv, "%") },
          { label: "Standard drinks", value: s.standard_drinks },
          { label: "Unit size", value: s.unit_size },
          { label: "Units per case", value: s.case_quantity },
          { label: "Container", value: s.container },
          { label: "Serve", value: s.serve },
          { label: "Case dimensions", value: s.case_dimensions },
        ]}
      />
      <ProductRailSection heading={SHOW_CREDIT ? "Clubs also ordered" : "You may also like"} products={related} onAddToCart={addToCartAction} isLoggedIn={isLoggedIn} favouriteIds={[...favouriteIds]} showCredit={SHOW_CREDIT} />
    </>
  );
}
