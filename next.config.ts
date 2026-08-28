import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ['mapbox-gl'],
  // hide the floating "N" dev-tools button (dev mode only; never shipped)
  devIndicators: false,
};

export default nextConfig;
