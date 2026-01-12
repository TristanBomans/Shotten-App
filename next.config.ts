import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Cloudflare Pages compatible configuration */
  images: {
    unoptimized: true,
  },
  // Cloudflare Pages handles this automatically
  // trailingSlash: true,
};

export default nextConfig;
