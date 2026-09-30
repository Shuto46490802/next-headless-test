import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Barlow_Condensed, DM_Sans } from "next/font/google";
import { brand } from "../lib/brand";
import { getSiteSettings } from "./site-settings";
import "./globals.css";

const heading = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-heading" });
const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings(false);
  return { title: s?.seoTitle ?? brand.name, description: s?.seoDescription ?? brand.tagline };
}

/** Document shell only. The storefront chrome lives in (site)/layout.tsx; (preview) renders its own. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${heading.variable} ${sans.variable}`}>
      <body className="flex min-h-screen flex-col font-sans antialiased">{children}</body>
    </html>
  );
}
