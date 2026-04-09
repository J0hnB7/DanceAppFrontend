"use client";

import { use, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useOnline } from "@/hooks/use-online";
import { Trophy, WifiOff, Clock, CheckCircle2, Bell } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import apiClient from "@/lib/api-client";
import { judgeOfflineStore } from "@/lib/judge-offline-store";
import { t, detectLocale, type Locale } from "@/lib/i18n/translations";
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
  heatSent: boolean;
}

const POLL_INTERVAL = 3000;

export default function JudgeLobbyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [locale] = useState<Locale>(() => detectLocale());
  const isOnline = useOnline();

  const [competitionName, setCompetitionName] = useState<string | null>(null);
  const [judgeNumber, setJudgeNumber] = useState<number | null>(null);
  const [judgeName, setJudgeName] = useState<string | null>(null);
  const [currentRound, setCurrentRound] = useState<RoundInfo | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const competitionId = typeof window !== "undefined"
    ? localStorage.getItem(`judge_competition_id_${token}`)
    : null;
  const adjudicatorId = typeof window !== "undefined"
    ? localStorage.getItem(`judge_adjudicator_id_${token}`)
    : null;

  const [pingAlert, setPingAlert] = useState(false);

  const navigateToScoring = useCallback((round: RoundInfo) => {
    if (round.roundType === "FINAL") {
      router.push(`/judge/${token}/final`);
    } else {
      router.push(`/judge/${token}/round`);
    }
  }, [token, router]);

  const checkRound = useCallback(async () => {
    if (!competitionId) return;
    try {
      const res = await apiClient.get<ActiveRoundResponse>("/judge/active-round", {
        params: { competitionId },
      });
      const round = res.data.round;
      setCurrentRound(round);

      // Navigate only when admin has sent a heat to judges (not just round IN_PROGRESS)
      if (round.status === "IN_PROGRESS" && res.data.heatSent) {
        navigateToScoring(round);
      }
    } catch {
      // 404 = no active round, keep waiting
      setCurrentRound(null);
    }
  }, [competitionId, navigateToScoring]);

  // Refs for stable SSE handlers — same pattern as round/page.tsx
  const currentRoundRef = useRef(currentRound);
  useEffect(() => { currentRoundRef.current = currentRound; }, [currentRound]);
  const navigateToScoringRef = useRef(navigateToScoring);
  useEffect(() => { navigateToScoringRef.current = navigateToScoring; }, [navigateToScoring]);
  const checkRoundRef = useRef(checkRound);
  useEffect(() => { checkRoundRef.current = checkRound; }, [checkRound]);

  // SSE reconnect rehydration: on reconnect, re-check active round (with heatSent guard)
  const { pollingFallback } = useJudgeSSERehydration(
    competitionId ?? undefined,
    token,
    currentRound?.status === "IN_PROGRESS",
    checkRound
  );

  // Load session info
  useEffect(() => {
    if (!token) return;
    apiClient
      .post("/judge-tokens/validate", { token })
      .then((r) => {
        setCompetitionName(r.data.competitionName);
        setJudgeNumber(r.data.judgeNumber);
        setJudgeName(typeof window !== "undefined" ? localStorage.getItem(`judge_name_${token}`) : null);
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
      const deviceToken = localStorage.getItem(`judge_device_token_${token}`);
      if (adjudicatorId && deviceToken) {
        judgeOfflineStore.syncAll(adjudicatorId, deviceToken, token).then(() => {
          judgeOfflineStore.getPendingCount().then(setPendingCount);
        });
      }
    }
  }, [isOnline, pendingCount]);

  // Heartbeat every 20s — keeps admin dashboard online indicator accurate
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!adjudicatorId) return;
    const sendHeartbeat = () =>
      apiClient.put(`/judge-access/${adjudicatorId}/heartbeat`).catch(() => {});
    const startInterval = () => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      sendHeartbeat();
      heartbeatIntervalRef.current = setInterval(sendHeartbeat, 20_000);
    };
    startInterval();
    const onVisible = () => { if (document.visibilityState === 'visible') startInterval(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      if (heartbeatIntervalRef.current) { clearInterval(heartbeatIntervalRef.current); heartbeatIntervalRef.current = null; }
    };
  }, [adjudicatorId]);

  // Listen for judge-ping and heat-sent on public SSE channel.
  // Uses refs for currentRound/navigate/checkRound so the EventSource is never
  // recreated when round state changes — prevents the race where heat-sent arrives
  // during the brief close→reopen gap and is missed without Last-Event-ID replay.
  useEffect(() => {
    if (!competitionId || !adjudicatorId) return;
    const es = new EventSource(`/api/v1/sse/competitions/${competitionId}/public`);

    // Admin pinged this judge
    es.addEventListener("judge-ping", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { judgeTokenId: string };
        if (data.judgeTokenId === adjudicatorId) {
          setPingAlert(true);
          setTimeout(() => setPingAlert(false), 4000);
        }
      } catch { /* ignore */ }
    });

    // Admin sent a heat to judges — navigate to scoring
    es.addEventListener("heat-sent", () => {
      const round = currentRoundRef.current;
      if (round?.status === "IN_PROGRESS") {
        navigateToScoringRef.current(round);
      } else {
        checkRoundRef.current();
      }
    });

    return () => es.close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
            {judgeName && <span className="ml-1.5 font-normal text-[var(--text-secondary)]">— {judgeName}</span>}
          </h1>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12 text-center">
        {currentRound?.status === "IN_PROGRESS" ? (
          /* Round is active but admin hasn't sent heat yet — show "ready, waiting" */
          <>
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--accent)]/10">
              <CheckCircle2 className="h-10 w-10 text-[var(--accent)]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                {t("judge.lobby_round_ready", locale)}
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {t("judge.lobby_subtitle", locale)}
              </p>
            </div>

            {/* Pulsing animation — waiting for admin to send */}
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-ping rounded-full bg-[var(--accent)]" />
              <div className="h-2 w-2 animate-ping rounded-full bg-[var(--accent)] [animation-delay:0.2s]" />
              <div className="h-2 w-2 animate-ping rounded-full bg-[var(--accent)] [animation-delay:0.4s]" />
            </div>

            <div className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium" style={{ background: "rgba(48,209,88,0.1)", color: "#30d158" }}>
              <div className="h-2 w-2 rounded-full bg-[#30d158]" />
              {t("judge.waiting_for_admin", locale)}
            </div>
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
