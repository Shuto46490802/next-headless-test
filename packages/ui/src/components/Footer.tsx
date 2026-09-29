import type { BrandConfig } from "../types";
import { NavAnchor, type NavColumnData, type NavLinkData } from "./MegaMenu";

export interface FooterSettings {
  columns: NavColumnData[];
  text: string | null;
  socialLinks: NavLinkData[];
}

export function Footer({ brand, settings = null }: { brand: BrandConfig; settings?: FooterSettings | null }) {
  const columns = settings?.columns ?? [];
  return (
    <footer className="border-t border-neutral-200 bg-neutral-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 text-sm text-neutral-500 sm:px-6">
        {columns.length > 0 ? (
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            <div className="flex flex-col gap-2">
              <span className="text-base font-semibold text-neutral-900">{brand.name}</span>
              <span>{settings?.text ?? brand.tagline}</span>
            </div>
            {columns.map((column) => (
              <div key={column.heading} className="flex flex-col gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{column.heading}</span>
                <ul className="flex flex-col gap-2">
                  {column.links.map((link) => (
                    <li key={`${link.label}-${link.url}`}>
                      <NavAnchor href={link.url} className="text-neutral-700 hover:text-neutral-900">
                        {link.label}
                      </NavAnchor>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <span className="font-medium text-neutral-700">{brand.name}</span>
            <span>{settings?.text ?? brand.tagline}</span>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-neutral-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <span>&copy; {new Date().getFullYear()} {brand.name}. All rights reserved.</span>
          {settings && settings.socialLinks.length > 0 ? (
            <ul className="flex gap-4">
              {settings.socialLinks.map((link) => (
                <li key={`${link.label}-${link.url}`}>
                  <NavAnchor href={link.url} className="text-neutral-700 hover:text-neutral-900">
                    {link.label}
                  </NavAnchor>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
