import Link from "next/link";
import type { BrandConfig } from "../types";
import { Button } from "./Button";

export function Hero({ brand, collectionHandle }: { brand: BrandConfig; collectionHandle?: string }) {
  return (
    <section className="border-b border-neutral-200 bg-neutral-50">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-24 sm:px-6">
        <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl">
          {brand.name}
        </h1>
        <p className="max-w-md text-lg text-neutral-600">{brand.tagline}</p>
        <Link href={collectionHandle ? `/collections/${collectionHandle}` : "/products"}>
          <Button variant="primary">Shop now</Button>
        </Link>
      </div>
    </section>
  );
}
