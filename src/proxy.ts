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
    return response;
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
    return response;
  }

  // In mock mode there is no real HttpOnly cookie — let everything through
  if (process.env.NEXT_PUBLIC_MOCK_API === "true") {
    const response = NextResponse.next();
    response.headers.set("x-pathname", pathname);
    return response;
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
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png).*)"],
};
