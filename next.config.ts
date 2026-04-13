import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import webpack from "webpack";

const isDev = process.env.NODE_ENV === "development";

// Content-Security-Policy
// - script-src: 'unsafe-inline' needed for Next.js inline scripts (no nonce in pages router)
// - connect-src: allows API calls, WebSocket, Sentry tunnel, Sentry ingest
// - img-src: data: for base64 QR codes, blob: for generated files
const csp = [
  "default-src 'self'",
  isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL ?? ""} wss: ws: https://*.ingest.sentry.io https://sentry.io`,
  "font-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  webpack(config) {
    if (process.env.NEXT_PUBLIC_MOCK_API !== "true") {
      config.plugins.push(
        new webpack.IgnorePlugin({ resourceRegExp: /src\/mocks/ })
      );
    }
    return config;
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
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

export default nextConfig;
