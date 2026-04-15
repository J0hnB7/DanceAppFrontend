import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const isDev = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  `connect-src 'self' ${(process.env.NEXT_PUBLIC_API_URL ?? "").trim()} wss: ws: https://*.ingest.sentry.io https://sentry.io`,
  "font-src 'self' https://fonts.gstatic.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  // Turbopack is default in Next.js 16 — empty config silences the webpack/turbopack conflict warning
  turbopack: {},
  transpilePackages: ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: "/landing.html" },
      ],
      afterFiles: [
        {
          source: "/api/:path*",
          destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
        },
      ],
      fallback: [],
    };
  },
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
});
