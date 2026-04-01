"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { sseClient } from "@/lib/sse-client";
import apiClient from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

export function useSSE<T>(
  competitionId: string | null | undefined,
  event: string,
  handler: (data: T) => void
) {
  const handlerRef = useRef(handler);
  useEffect(() => { handlerRef.current = handler; });

  const stableHandler = useCallback((data: T) => handlerRef.current(data), []);

  // Wait for auth store to be hydrated and user authenticated before subscribing.
  // This prevents SSE connecting without a token and getting 401 on first attempt.
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!competitionId || !isAuthenticated) return;
    const sub = sseClient.subscribe(competitionId, event, stableHandler as (data: unknown) => void);
    return () => sub.unsubscribe();
  }, [competitionId, event, stableHandler, isAuthenticated]);
}

/**
 * Judge SSE rehydration hook.
 *
 * On SSE reconnect: calls GET /competitions/{id}/active-round and if a round is active,
 * navigates to the scoring page immediately.
 *
 * After MAX failures: switches to polling every 10s as fallback.
 */
export function useJudgeSSERehydration(
  competitionId: string | null | undefined,
  judgeToken: string,
  skipRehydration = false,
  /** Optional custom rehydration callback — when provided, called instead of default navigation */
  onRehydrate?: () => void
) {
  const router = useRouter();
  const [pollingFallback, setPollingFallback] = useState(false);

  const rehydrate = useCallback(async () => {
    if (!competitionId || skipRehydration) return;
    if (onRehydrate) {
      onRehydrate();
      return;
    }
    try {
      const res = await apiClient.get<{ roundId: string; sectionId: string }>(
        `/competitions/${competitionId}/active-round`
      );
      if (res.data?.roundId) {
        router.push(`/judge/${judgeToken}/round`);
      }
    } catch {
      // 404 = no active round, stay on current page
    }
  }, [competitionId, judgeToken, router, skipRehydration, onRehydrate]);

  useEffect(() => {
    if (!competitionId) return;

    // Register SSE reconnect callback
    const unsubReconnect = sseClient.onReconnect(competitionId, rehydrate);

    // Register polling fallback callback (triggered after 3 SSE failures)
    const unsubPolling = sseClient.onPollingFallback(competitionId, () => {
      setPollingFallback(true);
    });

    return () => {
      unsubReconnect();
      unsubPolling();
    };
  }, [competitionId, rehydrate]);

  // Polling fallback: poll active-round every 10s when SSE is unavailable
  useEffect(() => {
    if (!pollingFallback || !competitionId) return;
    const id = setInterval(rehydrate, 10_000);
    return () => clearInterval(id);
  }, [pollingFallback, competitionId, rehydrate]);

  return { pollingFallback };
}
