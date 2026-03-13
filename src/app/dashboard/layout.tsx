"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthGuard } from "@/components/shared/auth-guard";
import { SessionExpiryWarning } from "@/components/shared/session-expiry-warning";
import { useAuthStore } from "@/store/auth-store";

const DANCER_ALLOWED_PATHS = [
  "/dashboard/my-registrations",
  "/dashboard/settings",
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
  return (
    <AuthGuard allowedRoles={["ADMIN", "ORGANIZER", "DANCER"]}>
      <DancerGuard>
        {children}
        <SessionExpiryWarning />
      </DancerGuard>
    </AuthGuard>
  );
}
