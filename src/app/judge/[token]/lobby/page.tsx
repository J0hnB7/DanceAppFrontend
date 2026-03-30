"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useOnline } from "@/hooks/use-online";
import { Trophy, WifiOff, Clock, CheckCircle2, Bell } from "lucide-react";
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
  const adjudicatorId = typeof window !== "undefined"
    ? localStorage.getItem("judge_adjudicator_id")
    : null;

  const [pingAlert, setPingAlert] = useState(false);

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
      if (adjudicatorId && deviceToken) {
        judgeOfflineStore.syncAll(adjudicatorId, deviceToken).then(() => {
          judgeOfflineStore.getPendingCount().then(setPendingCount);
        });
      }
    }
  }, [isOnline, pendingCount]);

  // Heartbeat every 20s — keeps admin dashboard online indicator accurate
  useEffect(() => {
    if (!adjudicatorId || !isOnline) return;
    const sendHeartbeat = () =>
      apiClient.put(`/judge-access/${adjudicatorId}/heartbeat`).catch(() => {});
    sendHeartbeat();
    const id = setInterval(sendHeartbeat, 20_000);
    return () => clearInterval(id);
  }, [adjudicatorId, isOnline]);

  // Listen for judge-ping on public SSE channel
  useEffect(() => {
    if (!competitionId || !adjudicatorId) return;
    const es = new EventSource(`/api/v1/sse/competitions/${competitionId}/public`);
    es.addEventListener("judge-ping", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { judgeTokenId: string };
        if (data.judgeTokenId === adjudicatorId) {
          setPingAlert(true);
          setTimeout(() => setPingAlert(false), 4000);
        }
      } catch { /* ignore */ }
    });
    return () => es.close();
  }, [competitionId, adjudicatorId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      {/* Ping alert */}
      {pingAlert && (
        <div className="flex items-center justify-center gap-2 border-b border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-2.5 text-sm font-semibold text-[var(--accent)]">
          <Bell className="h-4 w-4" /> {t("judge.ping_alert_short", locale)}
        </div>
      )}

      {/* Polling fallback banner */}
      {pollingFallback && isOnline && (
        <div className="flex items-center justify-center gap-2 border-b border-amber-200/30 bg-amber-50/20 px-4 py-2 text-xs font-medium text-amber-700 dark:text-amber-400">
          <Clock className="h-3.5 w-3.5" />
          {t("judge.fallback_mode", locale)}
        </div>
      )}

      {/* Offline banner */}
      {!isOnline && (
        <div className="flex items-center justify-center gap-2 border-b border-[var(--warning)]/20 bg-[var(--warning)]/10 px-4 py-2 text-xs font-medium text-[var(--warning)]">
          <WifiOff className="h-3.5 w-3.5" />
          {t("judge.lobby_offline", locale)}
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

            <div className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium" style={{ background: "rgba(48,209,88,0.1)", color: "#30d158" }}>
              <div className="h-2 w-2 rounded-full bg-[#30d158]" />
              {t("judge.waiting_for_admin", locale)}
            </div>
            {!isOnline && pendingCount > 0 && (
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
