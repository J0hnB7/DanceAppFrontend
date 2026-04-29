import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Defensive: Vercel env var with trailing newline (%0A) corrupts CSP header and
// rewrites destination → serverless crash. Always sanitize.
const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();

// CSP is set per-request in src/proxy.ts (middleware) so each response carries
// a fresh script-src nonce — closes HIGH-19 / CRIT-8 sub-fix D ('unsafe-inline'
// removed). The other security headers below remain static.
const securityHeaders = [
  // HSTS: tell the browser to only ever load this origin over HTTPS for 1 year.
  // includeSubDomains + preload required for browser HSTS preload list eligibility.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // CSP frame-ancestors 'none' covers clickjacking, but X-Frame-Options is the
  // legacy header that older bots/crawlers still respect.
  { key: "X-Frame-Options", value: "DENY" },
  // Refuse to interpret responses as a different MIME type than declared
  // (defeats <script src="/uploaded.txt"> attacks where attacker uploads JS as text).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't leak full URL (incl. ?authToken=, ?token=) to cross-origin destinations.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable powerful browser APIs we don't use.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  // Turbopack is default in Next.js 16 — empty config silences the webpack/turbopack conflict warning
  turbopack: {},
  transpilePackages: ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
});
