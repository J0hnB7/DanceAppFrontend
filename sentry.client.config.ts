import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // sendDefaultPii: true would send IPs, full request URLs, and Authorization/
  // Cookie headers verbatim. We need IP/email for support context but must
  // strip credentials out of URLs and headers — see beforeSend below.
  sendDefaultPii: true,

  // Performance tracing — 100% in dev, 20% in prod (adjust after seeing volume)
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.2,

  // Session Replay — capture 10% of sessions, 100% of sessions with errors
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  enableLogs: true,

  /**
   * Scrub credentials before any event leaves the client.
   * Targets:
   * - SSE URLs that pass JWT as ?authToken=... (sse-client.ts) — leaks to referrer + Sentry
   * - Authorization / Cookie / X-Judge-Token request headers
   * - Breadcrumb URLs containing the same query params
   * Still ships email/IP per sendDefaultPii, but redacts auth credentials.
   */
  beforeSend(event) {
    return scrubCredentials(event);
  },

  beforeBreadcrumb(crumb) {
    if (crumb.data && typeof crumb.data === "object") {
      const data = crumb.data as Record<string, unknown>;
      if (typeof data.url === "string") data.url = redactUrl(data.url);
      if (typeof data.to === "string") data.to = redactUrl(data.to);
      if (typeof data.from === "string") data.from = redactUrl(data.from);
    }
    if (typeof crumb.message === "string") {
      crumb.message = redactUrl(crumb.message);
    }
    return crumb;
  },

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

const SENSITIVE_QUERY_PARAMS = ["authToken", "token", "access_token", "refresh_token", "pin"];
const SENSITIVE_HEADER_KEYS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-judge-token",
  "x-judge-pin",
  "x-csrf-token",
]);

function redactUrl(url: string): string {
  if (!url) return url;
  try {
    // Allow relative URLs by anchoring against a dummy origin.
    const u = new URL(url, "http://x");
    let changed = false;
    for (const key of SENSITIVE_QUERY_PARAMS) {
      if (u.searchParams.has(key)) {
        u.searchParams.set(key, "[REDACTED]");
        changed = true;
      }
    }
    if (!changed) return url;
    return u.origin === "http://x" ? `${u.pathname}${u.search}${u.hash}` : u.toString();
  } catch {
    return url;
  }
}

function scrubHeaders(headers?: Record<string, string>): Record<string, string> | undefined {
  if (!headers) return headers;
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    cleaned[k] = SENSITIVE_HEADER_KEYS.has(k.toLowerCase()) ? "[REDACTED]" : v;
  }
  return cleaned;
}

function scrubCredentials(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  if (event.request) {
    if (event.request.url) event.request.url = redactUrl(event.request.url);
    event.request.headers = scrubHeaders(event.request.headers as Record<string, string>);
    if (event.request.query_string && typeof event.request.query_string === "string") {
      event.request.query_string = redactUrl(`?${event.request.query_string}`).replace(/^\?/, "");
    }
  }
  if (event.breadcrumbs) {
    for (const c of event.breadcrumbs) {
      if (c.data && typeof c.data === "object") {
        const data = c.data as Record<string, unknown>;
        if (typeof data.url === "string") data.url = redactUrl(data.url);
        if (typeof data.to === "string") data.to = redactUrl(data.to);
      }
      if (typeof c.message === "string") c.message = redactUrl(c.message);
    }
  }
  return event;
}
