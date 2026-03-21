"use client";

import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";
import { getAccessToken } from "@/lib/api-client";
import { toast } from "@/hooks/use-toast";
import { useLocale } from "@/contexts/locale-context";

const WARN_BEFORE_MS = 5 * 60 * 1000; // warn 5 minutes before expiry

/** Decode JWT exp claim → ms timestamp, or null if token absent/malformed */
function getTokenExpiryMs(): number | null {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as { exp?: number };
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function SessionExpiryWarning() {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const { t } = useLocale();
  const [showWarning, setShowWarning] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await checkAuth();
      setExpiresAt(getTokenExpiryMs());
      setShowWarning(false);
      toast({ title: t("sessionExpiry.refreshed"), variant: "success" } as Parameters<typeof toast>[0]);
    } catch {
      // Will redirect to login via auth guard
    } finally {
      setRefreshing(false);
    }
  }, [checkAuth, t]);

  // Sync expiresAt from the real JWT exp claim whenever auth state changes
  useEffect(() => {
    if (!isAuthenticated) {
      setExpiresAt(null);
      setShowWarning(false);
      return;
    }
    setExpiresAt(getTokenExpiryMs());
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || expiresAt === null) return;

    const checkExpiry = () => {
      const remaining = expiresAt - Date.now();
      if (remaining <= WARN_BEFORE_MS && remaining > 0) {
        setShowWarning(true);
      } else if (remaining <= 0) {
        setShowWarning(false);
      }
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 30_000); // check every 30s
    return () => clearInterval(interval);
  }, [isAuthenticated, expiresAt]);

  if (!showWarning || !isAuthenticated) return null;

  const minutesLeft = expiresAt
    ? Math.max(0, Math.ceil((expiresAt - Date.now()) / (1000 * 60)))
    : 0;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-sm items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-lg dark:border-amber-800 dark:bg-amber-950/80">
      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          {t("sessionExpiry.title")}
        </p>
        <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
          {t("sessionExpiry.description", { count: String(minutesLeft), plural: minutesLeft !== 1 ? "s" : "" })}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-2 border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300"
          onClick={handleRefresh}
          loading={refreshing}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t("sessionExpiry.extend")}
        </Button>
      </div>
    </div>
  );
}
