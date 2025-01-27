import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: ["api.mapbox.com"],
  },
  experimental: {
    optimizePackageImports: ["mapbox-gl"],
  },
};

export default nextConfig;
