"use client";

import { use, useState, useCallback, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Wifi,
  WifiOff,
  Bell,
  RefreshCw,
  GitMerge,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { CompetitionSidebar } from "@/components/layout/competition-sidebar";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSSE } from "@/hooks/use-sse";
import { useAlertsStore } from "@/store/alerts-store";
import apiClient from "@/lib/api-client";
import { scoringApi } from "@/lib/api/scoring";
import { formatTime, cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useLocale } from "@/contexts/locale-context";
import { OverrideModal, type MissingJudgeInfo } from "@/components/results/override-modal";
import axios from "axios";

// ── Types ─────────────────────────────────────────────────────────────────────

interface JudgeSubmissionStatus {
  judgeTokenId: string;
  judgeNumber: number;
  submitted: boolean;
  submittedAt?: string;
}

interface SubmissionStatusResponse {
  totalJudges: number;
  submitted: number;
  judges: JudgeSubmissionStatus[];
}

interface RoundDto {
  id: string;
  roundNumber: number;
  roundType: string;
  status: string;
  judgeCount?: number;
  version?: number;
}

interface SSEMarksProgress {
  roundId: string;
  submitted: number;
  total: number;
  allMarksIn?: boolean;
}

interface SSETieDetected {
  roundId: string;
  dance: string;
  tiedPairIds: string[];
}

interface SSEMarkConflict {
  roundId: string;
  judgeNumber: number;
  conflictId: string;
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function fetchSubmissionStatus(roundId: string): Promise<SubmissionStatusResponse> {
  const r = await apiClient.get<SubmissionStatusResponse>(`/rounds/${roundId}/submission-status`);
  return r.data;
}

async function fetchRound(roundId: string): Promise<RoundDto> {
  const r = await apiClient.get<RoundDto>(`/rounds/${roundId}`);
  return r.data;
}

async function fetchActiveRoundForCompetition(competitionId: string): Promise<{ roundId: string; sectionId: string } | null> {
  try {
    const r = await apiClient.get<{ roundId: string; sectionId: string }>(`/competitions/${competitionId}/active-round`);
    return r.data;
  } catch {
    return null;
  }
}

// ── JudgeStatusTable ──────────────────────────────────────────────────────────

// Memoised: parent (ScoringProgressPage) re-renders on every 5s submission-status
// poll AND on every SSE event (marks-progress, all-marks-in, tie-detected,
// mark-conflict) — ~30 renders/min during a busy round close. React Query
// returns referentially-stable `status` when the payload is unchanged, so
// shallow compare blocks the children-table re-render. Pair with a stable
// `onRemind` (useCallback in the parent) for the memo to actually fire (HIGH-31).
const JudgeStatusTable = memo(function JudgeStatusTable({
  status,
  onRemind,
}: {
  status: SubmissionStatusResponse;
  onRemind: (judgeNumber: number) => void;
}) {
  const { t } = useLocale();
  const pct = status.totalJudges > 0 ? Math.round((status.submitted / status.totalJudges) * 100) : 0;
  const allIn = status.submitted >= status.totalJudges;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-[var(--text-primary)]">{t("scoring.title")}</h3>
        <span className="text-sm text-[var(--text-secondary)]">
          {t("scoring.received")} {status.submitted}/{status.totalJudges}
        </span>
      </div>
      <Progress value={pct} className="mb-4 h-2" />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="py-3 pl-4 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  {t("judges.judge")}
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  {t("round.status")}
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  {t("scoring.submitted_at")}
                </th>
                <th className="pr-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {status.judges.map((judge) => (
                <tr
                  key={judge.judgeTokenId}
                  className={cn(
                    "border-b border-[var(--border)] last:border-0 transition-colors",
                    !judge.submitted && "bg-amber-50/50 dark:bg-amber-950/10"
                  )}
                >
                  <td className="py-3 pl-4">
                    <p className="font-medium text-[var(--text-primary)]">
                      {t("round.judgeLabel", { number: judge.judgeNumber })}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={judge.submitted ? "success" : "secondary"}>
                      {judge.submitted ? t("round.statusDone") : t("scoring.waiting")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-[var(--text-tertiary)]">
                    {judge.submittedAt ? formatTime(judge.submittedAt) : "—"}
                  </td>
                  <td className="pr-4 py-3 text-right">
                    {!judge.submitted && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => onRemind(judge.judgeNumber)}
                      >
                        <Bell className="h-3.5 w-3.5" />
                        {t("round.remind")}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {allIn && (
        <div className="mt-4 flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--success)]/30 bg-[var(--success)]/5 px-6 py-4">
          <CheckCircle2 className="h-6 w-6 text-[var(--success)]" />
          <p className="font-semibold text-[var(--text-primary)]">{t("scoring.allMarksIn")}</p>
        </div>
      )}
    </div>
  );
});

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ScoringProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: competitionId } = use(params);
  const { t } = useLocale();
  const router = useRouter();
  const qc = useQueryClient();
  const addAlert = useAlertsStore((s) => s.addAlert);

  const [tieDetected, setTieDetected] = useState<{ dance: string; count: number } | null>(null);
  const [activeConflict, setActiveConflict] = useState<{ id: string } | null>(null);
  const [overrideState, setOverrideState] = useState<{
    open: boolean;
    missingJudges: MissingJudgeInfo[];
    errorMessage: string | null;
  }>({ open: false, missingJudges: [], errorMessage: null });

  // Active round for this competition
  const { data: activeRound, isLoading: roundLoading } = useQuery({
    queryKey: ["competitions", competitionId, "active-round"],
    queryFn: () => fetchActiveRoundForCompetition(competitionId),
    refetchInterval: 5_000,
  });

  const roundId = activeRound?.roundId ?? null;

  // Submission status (replaces marks-progress)
  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ["rounds", roundId, "submission-status"],
    queryFn: () => fetchSubmissionStatus(roundId!),
    enabled: !!roundId,
    refetchInterval: 5_000,
  });

  // Round detail (for type/number info)
  const { data: roundDetail } = useQuery({
    queryKey: ["rounds", roundId],
    queryFn: () => fetchRound(roundId!),
    enabled: !!roundId,
  });

  // Resolve conflict mutation (kept for future use)
  const resolveMutation = useMutation({
    mutationFn: ({ conflictId, resolution }: { conflictId: string; resolution: "ONLINE" | "OFFLINE" }) =>
      apiClient.post(`/marks/conflicts/${conflictId}/resolve`, { resolution }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rounds", roundId, "submission-status"] });
      toast({ title: t("scoring.conflictResolved"), variant: "success" });
    },
    onError: () => {
      toast({ title: t("scoring.conflictResolveFailed"), variant: "destructive" });
    },
  });

  // Calculate results mutation
  const calculateMutation = useMutation({
    mutationFn: () => apiClient.post(`/rounds/${roundId}/calculate`),
    onSuccess: () => {
      // HIGH-25: invalidate caches the results page reads on mount.
      // Without this, the navigated-to results page hits stale cache for ~30s
      // (default staleTime), showing "calculating..." even though results are
      // already persisted. SSE results-corrected may also fire before the new
      // page subscribes; the cache eviction makes the eventual subscribe see
      // fresh data.
      qc.invalidateQueries({ queryKey: ["sections", competitionId] });
      qc.invalidateQueries({ queryKey: ["rounds", roundId] });
      qc.invalidateQueries({ queryKey: ["rounds", roundId, "submission-status"] });
      if (activeRound?.sectionId) {
        qc.invalidateQueries({ queryKey: ["section", activeRound.sectionId, "final-summary"] });
      }
      toast({ title: t("round.resultsCalculated"), variant: "success" });
      if (activeRound?.sectionId) {
        router.push(
          `/dashboard/competitions/${competitionId}/sections/${activeRound.sectionId}/rounds/${roundId}`
        );
      }
    },
    onError: (err) => {
      const isAxios = axios.isAxiosError(err);
      const httpStatus = isAxios ? err.response?.status : undefined;
      const data = isAxios ? err.response?.data : undefined;
      const message =
        typeof data === "object" && data !== null && "message" in data &&
        typeof (data as { message?: unknown }).message === "string"
          ? (data as { message: string }).message
          : "";
      // R11 incomplete-judges → 409 with parseable message → open override modal
      if (httpStatus === 409 && message.includes("incomplete judge data")) {
        const matches = Array.from(
          message.matchAll(/Judge (\d+) \(submitted (\d+)\/(\d+) dances?\)/g),
        );
        const enriched: MissingJudgeInfo[] = matches
          .map((m) => {
            const judgeNumber = Number(m[1]);
            const tokenId = status?.judges.find((j) => j.judgeNumber === judgeNumber)?.judgeTokenId;
            if (!tokenId) return null;
            return {
              judgeTokenId: tokenId,
              judgeNumber,
              submitted: Number(m[2]),
              expected: Number(m[3]),
            };
          })
          .filter((x): x is MissingJudgeInfo => x !== null);
        if (enriched.length > 0) {
          setOverrideState({ open: true, missingJudges: enriched, errorMessage: null });
          return;
        }
      }
      toast({ title: t("common.error"), variant: "destructive" });
    },
  });

  const overrideMutation = useMutation({
    mutationFn: (payload: { withdrawJudgeTokenIds: string[]; reason: string }) => {
      if (!roundId) return Promise.reject(new Error("No active round"));
      const expectedRoundVersion = roundDetail?.version ?? 0;
      return scoringApi.calculateWithOverride(roundId, {
        withdrawJudgeTokenIds: payload.withdrawJudgeTokenIds,
        reason: payload.reason,
        expectedRoundVersion,
      });
    },
    onSuccess: () => {
      setOverrideState({ open: false, missingJudges: [], errorMessage: null });
      toast({ title: t("round.resultsCalculated"), variant: "success" });
      if (activeRound?.sectionId) {
        router.push(
          `/dashboard/competitions/${competitionId}/sections/${activeRound.sectionId}/rounds/${roundId}`
        );
      }
    },
    onError: (err) => {
      const isAxios = axios.isAxiosError(err);
      const data = isAxios ? err.response?.data : undefined;
      const message =
        typeof data === "object" && data !== null && "message" in data &&
        typeof (data as { message?: unknown }).message === "string"
          ? (data as { message: string }).message
          : t("common.error");
      setOverrideState((prev) => ({ ...prev, errorMessage: message }));
    },
  });

  // SSE subscriptions
  useSSE<SSEMarksProgress>(competitionId, "marks-progress", useCallback((data) => {
    if (data.roundId === roundId) {
      qc.invalidateQueries({ queryKey: ["rounds", roundId, "marks-progress"] });
    }
  }, [roundId, qc]));

  useSSE<SSEMarksProgress>(competitionId, "all-marks-in", useCallback((data) => {
    if (data.roundId === roundId) {
      qc.invalidateQueries({ queryKey: ["rounds", roundId, "marks-progress"] });
      addAlert({ level: "success", title: t("scoring.calculate") });
    }
  }, [roundId, qc, addAlert, t]));

  useSSE<SSETieDetected>(competitionId, "tie-detected", useCallback((data) => {
    if (data.roundId === roundId) {
      setTieDetected({ dance: data.dance, count: data.tiedPairIds.length });
    }
  }, [roundId]));

  useSSE<SSEMarkConflict>(competitionId, "mark-conflict", useCallback((data) => {
    if (data.roundId === roundId) {
      qc.invalidateQueries({ queryKey: ["rounds", roundId, "mark-conflicts"] });
      setActiveConflict({ id: data.conflictId });
      addAlert({ level: "warning", title: `${t("scoring.conflict")} — ${t("judges.judge")} ${data.judgeNumber}` });
    }
  }, [roundId, qc, addAlert, t]));

  // Stable reference so JudgeStatusTable's React.memo can short-circuit
  // re-renders when only unrelated parent state changes.
  const handleRemind = useCallback((judgeNumber: number) => {
    toast({
      title: t("round.reminderSent", { number: judgeNumber }),
      variant: "success",
    });
  }, [t]);

  const handleResolveConflict = (resolution: "ONLINE" | "OFFLINE") => {
    if (!activeConflict) return;
    resolveMutation.mutate({ conflictId: activeConflict.id, resolution });
  };

  const isLoading = roundLoading || (!!roundId && statusLoading);

  if (isLoading) {
    return (
      <AppShell sidebar={<CompetitionSidebar competitionId={competitionId} />}>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-4 h-80 w-full" />
      </AppShell>
    );
  }

  const allMarksIn = !!status && status.submitted >= status.totalJudges;

  return (
    <AppShell sidebar={<CompetitionSidebar competitionId={competitionId} />}>
      <div className="mb-6 flex items-start justify-between">
        <PageHeader
          title={t("scoring.title")}
          description={
            roundDetail
              ? `${roundDetail.roundType} · ${t("round.label")} ${roundDetail.roundNumber}`
              : t("scoring.waitingForRound")
          }
          className="mb-0"
          backHref={`/dashboard/competitions/${competitionId}`}
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              qc.invalidateQueries({ queryKey: ["rounds", roundId, "submission-status"] });
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!roundId ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)]/10">
              <BarChart3 className="h-8 w-8 text-[var(--accent)]" />
            </div>
            <div>
              <p className="font-semibold text-[var(--text-primary)]">{t("scoring.waitingForRound")}</p>
              <p className="text-sm text-[var(--text-secondary)]">{t("scoring.organizerWillOpenRound")}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-ping rounded-full bg-[var(--accent)]" />
              <div className="h-2 w-2 animate-ping rounded-full bg-[var(--accent)] [animation-delay:0.2s]" />
              <div className="h-2 w-2 animate-ping rounded-full bg-[var(--accent)] [animation-delay:0.4s]" />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Tie detected banner */}
          {tieDetected && (
            <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--warning)]/30 bg-[var(--warning)]/5 px-4 py-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-[var(--warning)]" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {t("scoring.tieDetected", { dance: tieDetected.dance })}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {t("scoring.tiedPairs", { count: tieDetected.count })}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setTieDetected(null)}>
                OK
              </Button>
            </div>
          )}

          {/* Judge status table */}
          {status && (
            <JudgeStatusTable status={status} onRemind={handleRemind} />
          )}

          {/* Calculate results CTA */}
          {allMarksIn && (
            <div className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--success)]/30 bg-[var(--success)]/5 px-6 py-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-[var(--success)]" />
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">{t("scoring.allMarksIn")}</p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {t("scoring.calculate")}
                  </p>
                </div>
              </div>
              <Button
                size="lg"
                onClick={() => calculateMutation.mutate()}
                loading={calculateMutation.isPending}
                disabled={tieDetected !== null}
                title={tieDetected !== null ? t("scoring.resolveTieFirst") ?? "Resolve tie first" : undefined}
              >
                <BarChart3 className="h-4 w-4" />
                {t("scoring.calculate")}
              </Button>
            </div>
          )}

          {/* Waiting message */}
          {status && !allMarksIn && (
            <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-6 py-4 text-sm text-[var(--text-secondary)]">
              <Clock className="h-5 w-5 shrink-0" />
              {t("scoring.waiting")} — {status.judges.filter((j) => !j.submitted).length} {t("judges.judge").toLowerCase()} {t("scoring.pending")}
            </div>
          )}
        </div>
      )}

      <OverrideModal
        open={overrideState.open}
        missingJudges={overrideState.missingJudges}
        totalJudges={status?.totalJudges ?? roundDetail?.judgeCount ?? 0}
        submitting={overrideMutation.isPending}
        errorMessage={overrideState.errorMessage}
        onClose={() => setOverrideState({ open: false, missingJudges: [], errorMessage: null })}
        onSubmit={(payload) => overrideMutation.mutate(payload)}
      />
    </AppShell>
  );
}
