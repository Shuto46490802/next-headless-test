"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/account", label: "Profile" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/favorites", label: "Favorites" },
];

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 text-sm">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-3 py-2 transition-colors ${
              active ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
      <form action="/api/auth/logout" method="POST" className="mt-2">
        <button
          type="submit"
          className="w-full rounded-lg px-3 py-2 text-left text-neutral-600 hover:bg-neutral-100"
        >
          Sign out
        </button>
      </form>
    </nav>
  );
}
