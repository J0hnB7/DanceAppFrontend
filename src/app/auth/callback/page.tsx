"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

/**
 * OAuth2 callback page.
 *
 * The backend redirects here after Google OAuth2 with:
 *   ?onboarding=true|false
 *
 * The access token is NEVER in the URL. The backend already set the
 * HttpOnly refresh token cookie on the redirect response. We call
 * POST /auth/refresh to get the access token via JSON, then hydrate
 * the auth store before navigating.
 */
function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const onboarding = searchParams.get("onboarding") === "true";
  const loginWithTokens = useAuthStore((s) => s.loginWithTokens);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    async function handleCallback() {
      try {
        // Exchange the HttpOnly refresh cookie for an access token.
        const res = await fetch("/api/v1/auth/refresh", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          router.replace("/login");
          return;
        }

        const data = (await res.json()) as { accessToken: string };
        await loginWithTokens(data.accessToken);

        if (onboarding) {
          router.replace("/onboarding");
        } else {
          router.replace("/profile");
        }
      } catch {
        router.replace("/login");
      }
    }

    handleCallback();
  }, [onboarding, loginWithTokens, router]);

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", background: "#0A1628", gap: 20,
      fontFamily: "var(--font-inter, Inter, sans-serif)",
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: "50%",
        border: "3px solid rgba(255,255,255,.15)",
        borderTopColor: "#4F46E5",
        animation: "spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <p style={{ color: "rgba(255,255,255,.5)", fontSize: ".9rem" }}>Přihlašování…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <AuthCallbackInner />
    </Suspense>
  );
}
