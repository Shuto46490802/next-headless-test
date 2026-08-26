import type { BrandConfig } from "../types";

export function Footer({ brand }: { brand: BrandConfig }) {
  return (
    <footer className="border-t border-neutral-200 bg-neutral-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-10 text-sm text-neutral-500 sm:px-6">
        <span className="font-medium text-neutral-700">{brand.name}</span>
        <span>{brand.tagline}</span>
        <span>&copy; {new Date().getFullYear()} {brand.name}. All rights reserved.</span>
      </div>
    </footer>
  );
}
