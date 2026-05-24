import type { NextConfig } from "next";

/**
 * Security headers — applied to every response.
 * Vercel layers HSTS on top automatically for HTTPS deployments.
 */
const securityHeaders = [
  // Prevent clickjacking by disallowing the app being embedded in iframes.
  { key: "X-Frame-Options", value: "DENY" },
  // Stop browsers from sniffing content type — prevents MIME confusion attacks.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Only send referrer to same origin + the origin part for cross-site.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable features we don't use. Tightens the attack surface.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // Don't expose Next.js + the X-Powered-By header (also disabled via poweredByHeader below).
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,

  experimental: {
    // Tree-shake barrel imports for heavy libraries. Without this, an
    // `import { Tray } from "@phosphor-icons/react"` pulled the whole
    // 800kb icon set; with it Next only emits the requested glyphs.
    // Same shape of win for date-fns (per-function modules), motion
    // (per-component modules), and base-ui / dnd-kit (large barrels).
    optimizePackageImports: [
      "@phosphor-icons/react",
      "date-fns",
      "motion",
      "@base-ui/react",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/utilities",
    ],
    // Keep the prefetched page payload in the client cache long enough that
    // tab-switching between sidebar items doesn't re-trigger the server fetch
    // and the loading.tsx skeleton flash.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
