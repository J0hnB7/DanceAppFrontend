import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  sendDefaultPii: true,

  // Performance tracing — 100% in dev, 20% in prod (adjust after seeing volume)
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.2,

  // Session Replay — capture 10% of sessions, 100% of sessions with errors
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  enableLogs: true,

  integrations: (integrations) => [
    ...integrations.filter((i) => i.name !== "DevToolbar" && i.name !== "Spotlight"),
    Sentry.replayIntegration({
      // Mask text inputs (passwords, personal data) but show structure
      maskAllText: false,
      maskAllInputs: true,
      blockAllMedia: false,
    }),
  ],
});
