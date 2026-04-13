import { NextResponse } from "next/server";

export async function GET() {
  const errors: string[] = [];

  // Test Sentry server config
  try {
    const Sentry = await import("@sentry/nextjs");
    errors.push(`Sentry loaded OK, captureException: ${typeof Sentry.captureException}`);
  } catch (e) {
    errors.push(`Sentry import FAILED: ${e}`);
  }

  // Test sentry.server.config
  try {
    await import("../../../sentry.server.config");
    errors.push("sentry.server.config: OK");
  } catch (e) {
    errors.push(`sentry.server.config FAILED: ${e}`);
  }

  return NextResponse.json({
    runtime: process.env.NEXT_RUNTIME,
    node: process.version,
    env: {
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      NEXT_PUBLIC_MOCK_API: process.env.NEXT_PUBLIC_MOCK_API,
      NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN ? "SET" : "UNSET",
      SENTRY_DSN: process.env.SENTRY_DSN ? "SET" : "UNSET",
    },
    errors,
  });
}
