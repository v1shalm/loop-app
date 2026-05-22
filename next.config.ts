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

  // Tree-shake heavy icon library by transforming barrel imports into
  // per-icon imports at build time. Cuts ~hundreds of KB of unused icons.
  experimental: {
    optimizePackageImports: [
      "@phosphor-icons/react",
      "date-fns",
      "motion",
    ],
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
