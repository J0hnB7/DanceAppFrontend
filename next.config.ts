import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import webpack from "webpack";

const nextConfig: NextConfig = {
  transpilePackages: ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
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

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  authToken: process.env.SENTRY_AUTH_TOKEN,

  widenClientFileUpload: true,

  // Proxy tunnel route to bypass ad-blockers
  tunnelRoute: "/monitoring",

  silent: !process.env.CI,

  // Disable source map processing in dev — prevents continuous recompilation loop
  sourcemaps: {
    disable: process.env.NODE_ENV === "development",
  },
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
