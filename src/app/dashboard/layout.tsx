"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { AuthGuard } from "@/components/shared/auth-guard";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { SessionExpiryWarning } from "@/components/shared/session-expiry-warning";
import { useAuthStore } from "@/store/auth-store";

const DANCER_ALLOWED_PATHS = [
  "/dashboard/my-registrations",
  "/dashboard/settings",
  "/dashboard/results",
];

function DancerGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (user?.role === "DANCER") {
      const allowed = DANCER_ALLOWED_PATHS.some((p) => pathname.startsWith(p));
      if (!allowed) {
        router.replace("/dashboard/my-registrations");
      }
    }
  }, [user, pathname, router]);

  return <>{children}</>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [errorKey, setErrorKey] = useState(0);

  return (
    <AuthGuard allowedRoles={["ADMIN", "ORGANIZER", "DANCER"]}>
      <DancerGuard>
        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary
              errorKey={errorKey}
              onReset={() => { reset(); setErrorKey(k => k + 1); }}
            >
              {children}
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
        <SessionExpiryWarning />
      </DancerGuard>
    </AuthGuard>
  );
}
