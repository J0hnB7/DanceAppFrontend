"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { getAccessToken } from "@/lib/api-client";
import { Spinner } from "@/components/ui/spinner";
import type { UserDto } from "@/lib/api/auth";

type Role = UserDto["role"];

interface AuthGuardProps {
  children: React.ReactNode;
  /** Roles allowed to see this content. If omitted, any authenticated user is allowed. */
  allowedRoles?: Role[];
  /** Where to redirect on role mismatch (default: /dashboard) */
  redirectTo?: string;
}

export function AuthGuard({ children, allowedRoles, redirectTo = "/dashboard" }: AuthGuardProps) {
  const { isAuthenticated, isLoading, user, checkAuth, _hasHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!_hasHydrated) return;
    // Not authenticated at all → try refresh/me
    if (!isAuthenticated && !isLoading) {
      checkAuth();
      return;
    }
    // Authenticated (from localStorage) but access token lost after page refresh → re-hydrate silently
    if (isAuthenticated && !isLoading && !getAccessToken()) {
      checkAuth();
    }
  }, [_hasHydrated, isAuthenticated, isLoading, checkAuth]);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!isLoading && isAuthenticated && user) {
      // JUDGE has no dashboard — send to public judge info page
      if (user.role === "JUDGE" && !allowedRoles?.includes("JUDGE")) {
        router.push("/login");
        return;
      }
      // Role restriction check
      if (allowedRoles && !allowedRoles.includes(user.role)) {
        router.push(redirectTo);
      }
    }
  }, [_hasHydrated, isAuthenticated, isLoading, user, allowedRoles, redirectTo, router]);

  // Show spinner until: Zustand hydrated, loading done, AND access token is ready.
  // isAuthenticated can be true (from localStorage) while access token is still null
  // (in-memory, lost after page refresh). Without this check, child queries fire
  // immediately and get 401 before the refresh interceptor can restore the token.
  const tokenMissing = isAuthenticated && !getAccessToken();
  if (!_hasHydrated || isLoading || tokenMissing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (!user) return null;
  if (user.role === "JUDGE" && !allowedRoles?.includes("JUDGE")) return null;
  if (allowedRoles && !allowedRoles.includes(user.role)) return null;

  return <>{children}</>;
}
