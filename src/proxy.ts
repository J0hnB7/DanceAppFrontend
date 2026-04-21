import { type NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/judge",           // /judge/[token] — public judge access
  "/checkin",         // /checkin/[token] — public entrance check-in
  "/competitions",    // public competition listing
  "/results",         // public results
  "/auth/callback",   // OAuth2 callback — must be public (no session yet)
  "/onboarding",      // dancer onboarding — auth handled inside page
  "/partner-invite",  // /partner-invite/[token] — public invite preview
];

const ORGANIZER_PATHS = ["/dashboard", "/competitions/new", "/competitions/[id]/edit"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Legacy email links: /auth/reset-password?token=... → /reset-password?token=...
  if (pathname === "/auth/reset-password") {
    const redirectUrl = new URL("/reset-password" + search, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Allow public paths and Next.js internals
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/monitoring") ||
    pathname === "/" ||
    pathname === "/mockServiceWorker.js"
  ) {
    return NextResponse.next();
  }

  // In mock mode there is no real HttpOnly cookie — let everything through
  if (process.env.NEXT_PUBLIC_MOCK_API === "true") {
    return NextResponse.next();
  }

  // Check auth cookie presence (full token validation happens server-side or via React Query)
  const hasSession = request.cookies.has("refreshToken");
  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png).*)"],
};
