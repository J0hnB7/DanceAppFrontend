import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      await import("./sentry.server.config");
    } catch (e) {
      console.error("[instrumentation] sentry.server.config failed:", e);
    }
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    try {
      await import("./sentry.edge.config");
    } catch (e) {
      console.error("[instrumentation] sentry.edge.config failed:", e);
    }
  }
}

export const onRequestError = Sentry.captureRequestError;
