"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AccountIcon } from "./icons";
import type { AccountNavGroup } from "./types";

/** Logout is a POST so a prefetch or crawler can't sign the customer out. */
export function LogoutButton({ className = "", label = "Log out" }: { className?: string; label?: string }) {
  return (
    <form action="/api/auth/logout" method="POST">
      <button type="submit" className={`inline-flex items-center justify-center gap-1.5 rounded-full bg-brand px-4 py-2 font-heading text-sm font-bold uppercase tracking-[0.05em] text-white hover:opacity-90 ${className}`}>
        <AccountIcon name="logout" className="h-4 w-4" />
        {label}
      </button>
    </form>
  );
}

/**
 * Figma "My Account" chrome: page head (club · role eyebrow, "My account", signed-in-as + Log
 * out), the account rail grouped Account / Club, and the content column. On mobile the rail
 * becomes a horizontal scroller above the content.
 */
export function AccountShell({ eyebrow, signedInAs, groups, children }: { eyebrow?: string | null; signedInAs?: string | null; groups: AccountNavGroup[]; children: ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/account" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));
  return (
    <div className="mx-auto max-w-[1440px]">
      <div className="flex flex-wrap items-start justify-between gap-4 px-4 pb-6 pt-8 sm:px-10">
        <div className="flex flex-col gap-1.5">
          {eyebrow ? <p className="text-xs font-medium uppercase text-neutral-500">{eyebrow}</p> : null}
          <h1 className="font-heading text-4xl font-bold leading-tight text-brand sm:text-[40px]">My account</h1>
        </div>
        <div className="flex flex-col items-end gap-1">
          {signedInAs ? <p className="text-xs font-medium uppercase text-neutral-500">Signed in as {signedInAs}</p> : null}
          <LogoutButton />
        </div>
      </div>
      <div className="flex flex-col lg:flex-row">
        <nav aria-label="Account" className="border-neutral-200 lg:w-[210px] lg:shrink-0 lg:border-r lg:px-[18px] lg:py-6">
          <div className="flex gap-1 overflow-x-auto px-4 pb-4 sm:px-10 lg:flex-col lg:overflow-visible lg:p-0">
            {groups.map((g, gi) => (
              <div key={g.label} className={`flex shrink-0 gap-1 lg:flex-col ${gi > 0 ? "lg:mt-2 lg:border-t lg:border-neutral-200 lg:pt-2" : ""}`}>
                <p className="hidden text-xs font-medium uppercase text-neutral-500 lg:block">{g.label}</p>
                {g.items.map((it) => {
                  const active = isActive(it.href);
                  return (
                    <Link
                      key={it.href}
                      href={it.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded px-3 py-2.5 text-sm transition ${active ? "bg-brand-tint font-medium text-brand" : "text-neutral-800 hover:bg-neutral-50"}`}
                    >
                      <AccountIcon name={it.icon} className="h-4 w-4 text-brand" />
                      {it.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </nav>
        <div className="min-w-0 flex-1 px-4 pb-14 pt-2 sm:px-10">{children}</div>
      </div>
    </div>
  );
}

/** Section card with the heading + optional action used across the dashboard. */
export function AccountCard({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`flex flex-col gap-3 rounded-2xl border border-neutral-200 p-5 ${className}`}>
      {title || action ? (
        <div className="flex items-center justify-between gap-4">
          {title ? <h2 className="font-heading text-2xl font-bold text-brand sm:text-[32px] sm:leading-tight">{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function AccountButton({ href, children, variant = "secondary", onClick, type = "button", disabled }: { href?: string; children: ReactNode; variant?: "primary" | "secondary" | "tertiary" | "accent"; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean }) {
  const cls = {
    primary: "bg-brand text-white hover:opacity-90",
    secondary: "border border-brand text-brand hover:bg-brand hover:text-white",
    tertiary: "bg-brand-tint text-brand hover:opacity-80",
    accent: "bg-accent text-accent-fg hover:opacity-90",
  }[variant];
  const base = `inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 font-heading text-sm font-bold uppercase tracking-[0.05em] transition disabled:opacity-50 ${cls}`;
  return href ? (
    <Link href={href} className={base}>{children}</Link>
  ) : (
    <button type={type} onClick={onClick} disabled={disabled} className={base}>{children}</button>
  );
}
