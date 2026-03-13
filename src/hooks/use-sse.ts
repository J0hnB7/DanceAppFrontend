"use client";

import { useEffect, useCallback } from "react";
import { sseClient } from "@/lib/sse-client";

export function useSSE<T>(
  competitionId: string | null | undefined,
  event: string,
  handler: (data: T) => void
) {
  const stableHandler = useCallback(handler, []);

  useEffect(() => {
    if (!competitionId) return;
    const sub = sseClient.subscribe(competitionId, event, stableHandler as (data: unknown) => void);
    return () => sub.unsubscribe();
  }, [competitionId, event, stableHandler]);
}
