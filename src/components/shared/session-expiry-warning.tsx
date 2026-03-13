"use client";

import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "@/hooks/use-toast";

const WARN_BEFORE_MS = 5 * 60 * 1000; // 5 minutes
// In mock mode, set a very long session — 8 hours
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

export function SessionExpiryWarning() {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [showWarning, setShowWarning] = useState(false);
  const [sessionStart] = useState(() => Date.now());
  const [refreshing, setRefreshing] = useState(false);

  const expiresAt = sessionStart + SESSION_DURATION_MS;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await checkAuth();
      setShowWarning(false);
      toast({ title: "Session refreshed", variant: "success" } as Parameters<typeof toast>[0]);
    } catch {
      // Will redirect to login via auth guard
    } finally {
      setRefreshing(false);
    }
  }, [checkAuth]);

  useEffect(() => {
    if (!isAuthenticated) return;

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

  const minutesLeft = Math.max(
    0,
    Math.ceil((expiresAt - Date.now()) / (1000 * 60))
  );

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-sm items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-lg dark:border-amber-800 dark:bg-amber-950/80">
      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          Session expiring soon
        </p>
        <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
          Your session will expire in {minutesLeft} minute{minutesLeft !== 1 ? "s" : ""}. Save your work and extend your session.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-2 border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300"
          onClick={handleRefresh}
          loading={refreshing}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Extend session
        </Button>
      </div>
    </div>
  );
}
