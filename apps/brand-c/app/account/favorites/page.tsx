import { ProductCard, EmptyState } from "@repo/ui";
import { requireSession } from "../../../lib/session";
import { customerData, storefront } from "../../../lib/shopify";
import { getPointsContext } from "../../../lib/points";

export default async function FavoritesPage() {
  const session = await requireSession();
  const favouriteIds = await customerData.getFavourites(session.customerId);
  const [products, points] = await Promise.all([storefront.getProductsByIds(favouriteIds), getPointsContext()]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Favorites</h1>
      {products.length === 0 ? (
        <EmptyState
          title="No favorites yet"
          description="Tap the heart on any product to save it here."
        />
      ) : (
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} isLoggedIn isFavourited showPoints={points.enabled} />
          ))}
        </div>
      )}
    </div>
  );
}
