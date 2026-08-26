import Image from "next/image";
import Link from "next/link";
import { formatMoney } from "../format";
import { FavoriteButton } from "./FavoriteButton";

export interface ProductCardData {
  id: string;
  handle: string;
  title: string;
  featuredImage: { url: string; altText: string | null } | null;
  priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
}

export interface ProductCardProps {
  product: ProductCardData;
  isLoggedIn: boolean;
  isFavourited: boolean;
}

export function ProductCard({ product, isLoggedIn, isFavourited }: ProductCardProps) {
  return (
    <div className="group relative flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-neutral-100">
        <Link href={`/products/${product.handle}`}>
          {product.featuredImage ? (
            <Image
              src={product.featuredImage.url}
              alt={product.featuredImage.altText ?? product.title}
              fill
              sizes="(min-width: 1024px) 25vw, 50vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-neutral-400">
              No image
            </div>
          )}
        </Link>
        <FavoriteButton
          productId={product.id}
          initiallyFavourited={isFavourited}
          isLoggedIn={isLoggedIn}
          className="absolute right-3 top-3"
        />
      </div>
      <Link href={`/products/${product.handle}`} className="flex flex-col gap-1">
        <span className="text-sm font-medium text-neutral-900">{product.title}</span>
        <span className="text-sm text-neutral-500">
          {formatMoney(product.priceRange.minVariantPrice)}
        </span>
      </Link>
    </div>
  );
}
