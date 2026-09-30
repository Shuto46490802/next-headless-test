import { ProductCard, type ProductCardData } from "../components/ProductCard";
import { PromoTile, type PromoTileProps } from "./misc";
import { Band, Heading, SmartLink } from "./primitives";

export interface ProductRailProps {
  id: string;
  heading: string;
  link?: { label: string; href: string } | null;
  tabs?: { id: string; label: string; handle: string }[];
  activeHandle?: string;
  products: ProductCardData[];
  promoTile?: PromoTileProps | null;
  promoPosition?: number;
  isLoggedIn: boolean;
  favouriteIds: ReadonlySet<string>;
  showPoints?: boolean;
  /** Shown when the rail has no products, e.g. "buy again" for a customer with no orders. */
  emptyMessage?: string;
}

/** Figma "Deals rail" / "Buy again": heading, pill tabs, text link, 4 slots with an optional promo tile taking one. */
export function ProductRail(p: ProductRailProps) {
  const slots: ({ kind: "product"; product: ProductCardData } | { kind: "promo" })[] = p.products.map((product) => ({ kind: "product", product }));
  if (p.promoTile) {
    const pos = Math.min(Math.max((p.promoPosition ?? slots.length + 1) - 1, 0), slots.length);
    slots.splice(pos, 0, { kind: "promo" });
  }
  if (slots.length === 0 && !p.emptyMessage) return null;
  return (
    <Band tone="white" id={p.id} className="[&>div]:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div className="flex flex-wrap items-center gap-4">
          <Heading level="h2" size="md" className="text-brand">{p.heading}</Heading>
          {p.tabs?.length ? (
            <ul className="flex flex-wrap gap-2">
              {p.tabs.map((t) => (
                <li key={t.id}>
                  <SmartLink href={`?rail=${encodeURIComponent(t.handle)}#${p.id}`} className={`rounded-full border px-4 py-1.5 text-sm ${(p.activeHandle ?? p.tabs?.[0]?.handle) === t.handle ? "border-brand bg-brand text-white" : "border-neutral-300 text-neutral-700 hover:border-brand"}`}>{t.label}</SmartLink>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {p.link ? <SmartLink href={p.link.href} className="rounded-full border border-brand px-5 py-2 text-sm font-medium uppercase tracking-wide text-brand hover:bg-brand-tint">{p.link.label}</SmartLink> : null}
      </div>
      {slots.length === 0 ? (
        <p className="py-10 text-center text-neutral-500">{p.emptyMessage}</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {slots.map((slot, i) =>
            slot.kind === "promo" ? (
              <PromoTile key={`promo-${i}`} {...(p.promoTile as PromoTileProps)} className="col-span-2 lg:col-span-1" />
            ) : (
              <ProductCard key={slot.product.id} product={slot.product} isLoggedIn={p.isLoggedIn} isFavourited={p.favouriteIds.has(slot.product.id)} showPoints={p.showPoints} />
            ),
          )}
        </div>
      )}
    </Band>
  );
}
