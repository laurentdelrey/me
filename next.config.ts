import type { NextConfig } from "next";

// Content-Security-Policy tuned to what the site actually loads:
//  - three.js WebGL cloud + self-hosted fonts + Vercel Blob images
//  - the /work map (mapbox-gl: api/events.mapbox.com, blob: workers, tile imgs)
// script/style keep 'unsafe-inline' because Next injects inline bootstrap
// scripts and framer-motion/styled-jsx set inline styles; the site renders no
// user-supplied markup (no dangerouslySetInnerHTML anywhere), so the residual
// XSS surface that a strict script-src would guard is effectively nil.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://api.mapbox.com",
  "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://*.mapbox.com",
  "media-src 'self' blob: https://*.public.blob.vercel-storage.com",
  "font-src 'self'",
  "connect-src 'self' https://*.public.blob.vercel-storage.com https://api.mapbox.com https://events.mapbox.com",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  transpilePackages: ['mapbox-gl'],
  // hide the floating "N" dev-tools button (dev mode only; never shipped)
  devIndicators: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
