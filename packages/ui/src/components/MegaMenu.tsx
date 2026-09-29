import Image from "next/image";
import Link from "next/link";

/**
 * Structural navigation types. They match `SiteSettings` from `@repo/contentful` but are declared
 * here so the UI package stays independent of the CMS.
 */
export interface NavLinkData {
  label: string;
  url: string;
}
export interface NavColumnData {
  heading: string;
  links: NavLinkData[];
}
export interface NavItemData {
  label: string;
  url: string | null;
  columns: NavColumnData[];
  promo: { heading: string | null; url: string | null; image: { url: string; description?: string | null } | null } | null;
}

function isExternal(url: string) {
  return /^https?:\/\//.test(url);
}

export function NavAnchor({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return isExternal(href) ? (
    <a href={href} className={className} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

/**
 * One top-level header item. With columns it opens a megamenu panel on hover or keyboard focus
 * (CSS only, so it renders on the server); without, it is a plain link.
 */
export function MegaMenuItem({ item }: { item: NavItemData }) {
  const triggerClass = "inline-flex items-center gap-1 py-4 text-sm text-neutral-600 hover:text-neutral-900";

  if (item.columns.length === 0) {
    return (
      <NavAnchor href={item.url ?? "#"} className={triggerClass}>
        {item.label}
      </NavAnchor>
    );
  }

  const columnCount = item.columns.length + (item.promo ? 1 : 0);

  return (
    <div className="group relative">
      {item.url ? (
        <NavAnchor href={item.url} className={triggerClass}>
          {item.label}
          <Chevron />
        </NavAnchor>
      ) : (
        <button type="button" className={triggerClass} aria-haspopup="true">
          {item.label}
          <Chevron />
        </button>
      )}

      <div className="invisible absolute left-1/2 top-full z-50 -translate-x-1/2 pt-1 opacity-0 transition duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div
          className="grid gap-10 rounded-2xl border border-neutral-200 bg-white p-8 shadow-xl"
          style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(10rem, 1fr))` }}
        >
          {item.columns.map((column) => (
            <div key={column.heading} className="flex flex-col gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{column.heading}</span>
              <ul className="flex flex-col gap-2">
                {column.links.map((link) => (
                  <li key={`${link.label}-${link.url}`}>
                    <NavAnchor href={link.url} className="text-sm text-neutral-700 hover:text-neutral-900">
                      {link.label}
                    </NavAnchor>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {item.promo ? (
            <NavAnchor
              href={item.promo.url ?? item.url ?? "#"}
              className="flex flex-col justify-end gap-2 overflow-hidden rounded-xl bg-neutral-100 p-4 text-sm font-medium text-neutral-900 hover:bg-neutral-200"
            >
              {item.promo.image ? (
                <span className="relative block aspect-[4/3] w-full overflow-hidden rounded-lg">
                  <Image
                    src={item.promo.image.url}
                    alt={item.promo.image.description ?? item.promo.heading ?? ""}
                    fill
                    sizes="240px"
                    className="object-cover"
                  />
                </span>
              ) : null}
              {item.promo.heading ? <span>{item.promo.heading}</span> : null}
            </NavAnchor>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Chevron() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 opacity-60">
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}
