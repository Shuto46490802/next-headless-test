import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  transpilePackages: ["@repo/ui", "@repo/shopify-storefront", "@repo/shopify-customer", "@repo/customer-data"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.shopify.com" }],
  },
};

export default nextConfig;
