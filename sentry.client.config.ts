import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  sendDefaultPii: true,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  enableLogs: true,

  // Disable the floating Dev Toolbar button
  integrations: (integrations) =>
    integrations.filter((i) => i.name !== "DevToolbar" && i.name !== "Spotlight"),
});
