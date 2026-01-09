import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "export",
  images: {
    unoptimized: true,
  },
  // Ensure we don't have trailing slashes issues with Cloudflare
  trailingSlash: true,
};

export default nextConfig;
