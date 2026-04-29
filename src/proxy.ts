import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

// Paths that use next-intl URL-prefixed locale routing. Everything else
// (dashboard, judge, auth flows) runs on the custom cookie-based i18n.
const LOCALIZED_PREFIXES = ["/competitions", "/scoreboard", "/privacy"];

function isLocalizedPublic(pathname: string): boolean {
  // Root landing + English-prefixed variants of any localized prefix.
  if (pathname === "/" || pathname === "/en" || pathname === "/cs") return true;
  if (pathname.startsWith("/en/") || pathname.startsWith("/cs/")) {
    const stripped = pathname.replace(/^\/(en|cs)/, "") || "/";
    return stripped === "/" || LOCALIZED_PREFIXES.some((p) => stripped.startsWith(p));
  }
  return LOCALIZED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/judge",           // /judge/[token] — public judge access
  "/checkin",         // /checkin/[token] — public entrance check-in
  "/results",         // public results
  "/auth/callback",   // OAuth2 callback — must be public (no session yet)
  "/onboarding",      // dancer onboarding — auth handled inside page
  "/partner-invite",  // /partner-invite/[token] — public invite preview
];

/**
 * Per-request nonce for CSP script-src (CRIT-8 sub-fix D + HIGH-19).
 * Replaces the static {@code 'unsafe-inline'} in next.config.ts so any
 * reflected XSS no longer auto-executes — attacker-injected {@code <script>}
 * tags lack the per-request nonce and get blocked by the browser.
 *
 * 16 bytes of {@link crypto.getRandomValues} entropy → base64 (≈22 chars).
 * Edge runtime exposes Web Crypto without a fallback.
 */
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str);
}

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();

  // strict-dynamic: scripts loaded by a nonce'd script inherit trust, so we
  // don't need to enumerate every chunk URL. Combined with 'self' for
  // browsers that don't support strict-dynamic.
  const scriptSrc = isDev
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval' https://accounts.google.com`
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://accounts.google.com`;

  return [
    "default-src 'self'",
    scriptSrc,
    // style-src keeps 'unsafe-inline' — Next.js / Tailwind inject critical
    // styles inline at build time and migrating CSS-in-JS to nonce'd is a
    // separate effort. Audit (HIGH-19) only flagged script-src.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    // No WebSocket transport in the app (SSE + REST only) — wss:/ws: were
    // historically allowed but are unused, so dropping them tightens the
    // attack surface (MED-13).
    `connect-src 'self' ${apiUrl} https://*.ingest.sentry.io https://sentry.io`,
    "font-src 'self' https://fonts.gstatic.com",
    "worker-src 'self' blob:",
    "frame-src https://accounts.google.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

/**
 * Wraps any NextResponse to inject the per-request nonce + dynamic CSP header.
 * The nonce is also exposed on the request as {@code x-nonce} so Server
 * Components can read it via {@code headers()} and apply it to inline scripts.
 */
function withCsp(request: NextRequest, baseResponse: NextResponse): NextResponse {
  const nonce = generateNonce();
  const csp = buildCsp(nonce);

  // Tell Next.js about the nonce so its hydration scripts get nonced automatically.
  baseResponse.headers.set("Content-Security-Policy", csp);
  baseResponse.headers.set("x-nonce", nonce);
  return baseResponse;
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Legacy email links: /auth/reset-password?token=... → /reset-password?token=...
  if (pathname === "/auth/reset-password") {
    const redirectUrl = new URL("/reset-password" + search, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Localized public content — delegate to next-intl (handles /cs, /en, locale detection)
  if (isLocalizedPublic(pathname)) {
    const response = intlMiddleware(request);
    response.headers.set("x-pathname", pathname);
    return withCsp(request, response as NextResponse);
  }

  // Allow remaining public paths and Next.js internals
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/monitoring") ||
    pathname === "/mockServiceWorker.js"
  ) {
    const response = NextResponse.next();
    response.headers.set("x-pathname", pathname);
    return withCsp(request, response);
  }

  // In mock mode there is no real HttpOnly cookie — let everything through
  if (process.env.NEXT_PUBLIC_MOCK_API === "true") {
    const response = NextResponse.next();
    response.headers.set("x-pathname", pathname);
    return withCsp(request, response);
  }

  // Check auth cookie presence (full token validation happens server-side or via React Query)
  const hasSession = request.cookies.has("refreshToken");
  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  response.headers.set("x-pathname", pathname);
  return withCsp(request, response);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png).*)"],
};
