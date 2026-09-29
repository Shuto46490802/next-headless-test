import { ProductCard, type ProductCardData } from "./ProductCard";

export interface ProductGridSectionProps {
  heading?: string | null;
  products: ProductCardData[];
  isLoggedIn: boolean;
  favouriteIds: ReadonlySet<string>;
  showPoints?: boolean;
}

/** Page section: a grid of products. The caller resolves the products from Shopify. */
export function ProductGridSection({ heading, products, isLoggedIn, favouriteIds, showPoints = false }: ProductGridSectionProps) {
  if (products.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      {heading ? <h2 className="mb-8 text-2xl font-semibold text-neutral-900">{heading}</h2> : null}
      <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            isLoggedIn={isLoggedIn}
            isFavourited={favouriteIds.has(product.id)}
            showPoints={showPoints}
          />
        ))}
      </div>
    </section>
  );
}
