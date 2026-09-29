import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/ui", "@repo/contentful", "@repo/shopify-storefront", "@repo/shopify-customer", "@repo/customer-data"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.shopify.com" },
      { protocol: "https", hostname: "images.ctfassets.net" },
    ],
  },
};

export default nextConfig;
