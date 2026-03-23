"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useOnline } from "@/hooks/use-online";
import { Trophy, WifiOff, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import apiClient from "@/lib/api-client";
import { judgeOfflineStore } from "@/lib/judge-offline-store";
import { t, detectLocale, type Locale } from "@/lib/i18n/translations";
import { cn } from "@/lib/utils";
import { useJudgeSSERehydration } from "@/hooks/use-sse";

interface RoundInfo {
  id: string;
  roundType: string;
  roundNumber: number;
  status: string;
  pairsToAdvance?: number | null;
}

interface ActiveRoundResponse {
  round: RoundInfo;
  pairs: unknown[];
}

const POLL_INTERVAL = 3000;

export default function JudgeLobbyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [locale] = useState<Locale>(() => detectLocale());
  const isOnline = useOnline();

  const [competitionName, setCompetitionName] = useState<string | null>(null);
  const [judgeNumber, setJudgeNumber] = useState<number | null>(null);
  const [currentRound, setCurrentRound] = useState<RoundInfo | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const competitionId = typeof window !== "undefined"
    ? localStorage.getItem("judge_competition_id")
    : null;

  // SSE reconnect rehydration: on reconnect, check for active round and navigate if found
  const { pollingFallback } = useJudgeSSERehydration(
    competitionId ?? undefined,
    token,
    // Skip rehydration navigation if we're already watching a round (currentRound?.status === "IN_PROGRESS")
    currentRound?.status === "IN_PROGRESS"
  );

  const checkRound = useCallback(async () => {
    if (!competitionId) return;
    try {
      const res = await apiClient.get<ActiveRoundResponse>("/judge/active-round", {
        params: { competitionId },
      });
      const round = res.data.round;
      setCurrentRound(round);

      // Navigate automatically when round is IN_PROGRESS
      if (round.status === "IN_PROGRESS") {
        if (round.roundType === "FINAL") {
          router.push(`/judge/${token}/final`);
        } else {
          router.push(`/judge/${token}/round`);
        }
      }
    } catch {
      // 404 = no active round, keep waiting
      setCurrentRound(null);
    }
  }, [competitionId, token, router]);

  // Load session info
  useEffect(() => {
    if (!token) return;
    apiClient
      .post("/judge-tokens/validate", { token })
      .then((r) => {
        setCompetitionName(r.data.competitionName);
        setJudgeNumber(r.data.judgeNumber);
      })
      .catch(() => {
        router.push(`/judge/${token}`);
      })
      .finally(() => setLoading(false));
  }, [token, router]);

  // Load pending offline count
  useEffect(() => {
    judgeOfflineStore.getPendingCount().then(setPendingCount).catch(() => {});
  }, []);

  // Poll for active round
  useEffect(() => {
    checkRound();
    const interval = setInterval(checkRound, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [checkRound]);

  // Sync on reconnect
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      const deviceToken = localStorage.getItem("judge_device_token");
      const adjudicatorId = localStorage.getItem("judge_adjudicator_id");
      if (adjudicatorId && deviceToken) {
        judgeOfflineStore.syncAll(adjudicatorId, deviceToken).then(() => {
          judgeOfflineStore.getPendingCount().then(setPendingCount);
        });
      }
    }
  }, [isOnline, pendingCount]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      {/* Polling fallback banner */}
      {pollingFallback && isOnline && (
        <div className="flex items-center justify-center gap-2 border-b border-amber-200/30 bg-amber-50/20 px-4 py-2 text-xs font-medium text-amber-700 dark:text-amber-400">
          <Clock className="h-3.5 w-3.5" />
          Záložní režim — kontrola každých 10 s
        </div>
      )}

      {/* Offline banner */}
      {!isOnline && (
        <div className="flex items-center justify-center gap-2 border-b border-[var(--warning)]/20 bg-[var(--warning)]/10 px-4 py-2 text-xs font-medium text-[var(--warning)]">
          <WifiOff className="h-3.5 w-3.5" />
          Offline — marks se uloží lokálně
        </div>
      )}

      {/* Header */}
      <div className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-4">
        <div className="mx-auto max-w-md">
          <p className="text-xs text-[var(--text-tertiary)]">{competitionName}</p>
          <h1 className="text-base font-semibold text-[var(--text-primary)]">
            {t("judge.label", locale)} {judgeNumber}
          </h1>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12 text-center">
        {currentRound?.status === "IN_PROGRESS" ? (
          <>
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--success)]/10">
              <CheckCircle2 className="h-10 w-10 text-[var(--success)]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                {t("judge.lobby_round_ready", locale)}
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {t("judge.lobby_subtitle", locale)}
              </p>
            </div>
            <Button
              size="lg"
              className="min-w-48"
              onClick={() => {
                if (currentRound.roundType === "FINAL") {
                  router.push(`/judge/${token}/final`);
                } else {
                  router.push(`/judge/${token}/round`);
                }
              }}
            >
              {t("judge.lobby_go", locale)}
            </Button>
          </>
        ) : (
          <>
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--accent)]/10">
              <Trophy className="h-10 w-10 text-[var(--accent)]" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                {t("judge.lobby_waiting", locale)}
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {competitionName}
              </p>
            </div>

            {/* Pulsing animation */}
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-ping rounded-full bg-[var(--accent)]" />
              <div className="h-2 w-2 animate-ping rounded-full bg-[var(--accent)] [animation-delay:0.2s]" />
              <div className="h-2 w-2 animate-ping rounded-full bg-[var(--accent)] [animation-delay:0.4s]" />
            </div>

            {pendingCount > 0 && (
              <div className="flex items-center gap-2 rounded-full bg-[var(--warning)]/10 px-3 py-1.5 text-xs font-medium text-[var(--warning)]">
                <Clock className="h-3.5 w-3.5" />
                {pendingCount} {t("judge.offline_marks", locale)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
