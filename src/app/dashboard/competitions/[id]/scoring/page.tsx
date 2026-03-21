"use client";

import { use, useState, useCallback } from "react";
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
import { formatTime, cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useLocale } from "@/contexts/locale-context";

// ── Types ─────────────────────────────────────────────────────────────────────

interface JudgeProgress {
  judgeTokenId: string;
  judgeNumber: number;
  dances: Record<string, "submitted" | "waiting" | "offline">;
  allSubmitted: boolean;
  lastSubmittedAt?: string;
  isOffline: boolean;
}

interface MarksProgressResponse {
  roundId: string;
  roundType: string;
  roundNumber: number;
  dances: string[];
  totalJudges: number;
  judges: JudgeProgress[];
  allMarksIn: boolean;
  pendingConflicts: number;
}

interface MarkConflict {
  id: string;
  judgeTokenId: string;
  judgeNumber: number;
  pairId: string;
  pairStartNumber: number;
  dance: string;
  onlineValue: unknown;
  offlineValue: unknown;
  createdAt: string;
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
  conflictId: string;
  roundId: string;
  judgeNumber: number;
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function fetchMarksProgress(roundId: string): Promise<MarksProgressResponse> {
  const r = await apiClient.get<MarksProgressResponse>(`/rounds/${roundId}/marks-progress`);
  return r.data;
}

async function fetchMarkConflicts(roundId: string): Promise<MarkConflict[]> {
  const r = await apiClient.get<MarkConflict[]>(`/rounds/${roundId}/mark-conflicts`);
  return r.data;
}

async function resolveConflict(conflictId: string, resolution: "ONLINE" | "OFFLINE"): Promise<void> {
  await apiClient.post(`/marks/conflicts/${conflictId}/resolve`, { resolution });
}

async function fetchActiveRoundForCompetition(competitionId: string): Promise<{ roundId: string; sectionId: string } | null> {
  try {
    const r = await apiClient.get<{ roundId: string; sectionId: string }>(`/competitions/${competitionId}/active-round`);
    return r.data;
  } catch {
    return null;
  }
}

// ── ConflictResolverDialog ────────────────────────────────────────────────────

function ConflictResolverDialog({
  conflict,
  onResolve,
  onClose,
}: {
  conflict: MarkConflict;
  onResolve: (resolution: "ONLINE" | "OFFLINE") => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-[var(--warning)]" />
            {t("scoring.conflict")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-[var(--text-secondary)]">
            {t("judges.judge")} {conflict.judgeNumber} · #{conflict.pairStartNumber} · {conflict.dance}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3">
              <p className="mb-1 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">
                Online
              </p>
              <p className="font-mono text-sm font-medium text-[var(--text-primary)]">
                {JSON.stringify(conflict.onlineValue)}
              </p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-[var(--warning)]/40 bg-[var(--warning)]/5 p-3">
              <p className="mb-1 text-xs font-semibold text-[var(--warning)] uppercase tracking-wide">
                Offline
              </p>
              <p className="font-mono text-sm font-medium text-[var(--text-primary)]">
                {JSON.stringify(conflict.offlineValue)}
              </p>
            </div>
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">
            {formatTime(conflict.createdAt)}
          </p>
        </div>
        <DialogFooter className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onResolve("ONLINE")}>
            {t("scoring.resolve_online")}
          </Button>
          <Button className="flex-1 bg-[var(--warning)] hover:bg-[var(--warning)]/90" onClick={() => onResolve("OFFLINE")}>
            {t("scoring.resolve_offline")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── JudgeProgressMatrix ───────────────────────────────────────────────────────

function JudgeProgressMatrix({
  progress,
  onRemind,
}: {
  progress: MarksProgressResponse;
  onRemind: (judgeNumber: number) => void;
}) {
  const { t } = useLocale();
  const submitted = progress.judges.filter((j) => j.allSubmitted).length;
  const pct = progress.totalJudges > 0 ? Math.round((submitted / progress.totalJudges) * 100) : 0;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-[var(--text-primary)]">{t("scoring.title")}</h3>
        <span className="text-sm text-[var(--text-secondary)]">
          {t("scoring.received")} {submitted}/{progress.totalJudges}
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
                {progress.dances.map((d) => (
                  <th
                    key={d}
                    className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]"
                  >
                    {d}
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  {t("round.status")}
                </th>
                <th className="pr-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {progress.judges.map((judge) => (
                <tr
                  key={judge.judgeTokenId}
                  className={cn(
                    "border-b border-[var(--border)] last:border-0 transition-colors",
                    !judge.allSubmitted && "bg-amber-50/50 dark:bg-amber-950/10"
                  )}
                >
                  <td className="py-3 pl-4">
                    <div className="flex items-center gap-2">
                      {judge.isOffline ? (
                        <WifiOff className="h-3.5 w-3.5 text-[var(--warning)]" />
                      ) : (
                        <Wifi className="h-3.5 w-3.5 text-[var(--success)]" />
                      )}
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">
                          {t("round.judgeLabel", { number: judge.judgeNumber })}
                        </p>
                        {judge.lastSubmittedAt && (
                          <p className="text-xs text-[var(--text-tertiary)]">
                            {t("scoring.submitted_at")} {formatTime(judge.lastSubmittedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  {progress.dances.map((d) => {
                    const status = judge.dances[d] ?? "waiting";
                    return (
                      <td key={d} className="px-3 py-3 text-center">
                        {status === "submitted" ? (
                          <CheckCircle2 className="mx-auto h-4 w-4 text-[var(--success)]" />
                        ) : status === "offline" ? (
                          <div
                            title={t("scoring.offline_badge")}
                            className="mx-auto h-4 w-4 rounded-full border-2 border-[var(--warning)] bg-[var(--warning)]/20"
                          />
                        ) : (
                          <Clock className="mx-auto h-4 w-4 text-[var(--text-tertiary)]" />
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center">
                    <Badge
                      variant={
                        judge.allSubmitted ? "success" : judge.isOffline ? "warning" : "secondary"
                      }
                    >
                      {judge.allSubmitted
                        ? t("round.statusDone")
                        : judge.isOffline
                        ? t("scoring.offline_badge")
                        : t("scoring.waiting")}
                    </Badge>
                  </td>
                  <td className="pr-4 py-3 text-right">
                    {!judge.allSubmitted && (
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
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ScoringProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: competitionId } = use(params);
  const { t } = useLocale();
  const router = useRouter();
  const qc = useQueryClient();
  const addAlert = useAlertsStore((s) => s.addAlert);

  const [activeConflict, setActiveConflict] = useState<MarkConflict | null>(null);
  const [tieDetected, setTieDetected] = useState<{ dance: string; count: number } | null>(null);

  // Active round for this competition
  const { data: activeRound, isLoading: roundLoading } = useQuery({
    queryKey: ["competitions", competitionId, "active-round"],
    queryFn: () => fetchActiveRoundForCompetition(competitionId),
    refetchInterval: 5_000,
  });

  const roundId = activeRound?.roundId ?? null;

  // Marks progress
  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ["rounds", roundId, "marks-progress"],
    queryFn: () => fetchMarksProgress(roundId!),
    enabled: !!roundId,
    refetchInterval: 5_000,
  });

  // Mark conflicts
  const { data: conflicts } = useQuery({
    queryKey: ["rounds", roundId, "mark-conflicts"],
    queryFn: () => fetchMarkConflicts(roundId!),
    enabled: !!roundId,
    refetchInterval: 10_000,
  });

  // Resolve conflict mutation
  const resolveMutation = useMutation({
    mutationFn: ({ conflictId, resolution }: { conflictId: string; resolution: "ONLINE" | "OFFLINE" }) =>
      resolveConflict(conflictId, resolution),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rounds", roundId, "mark-conflicts"] });
      qc.invalidateQueries({ queryKey: ["rounds", roundId, "marks-progress"] });
      setActiveConflict(null);
      toast({ title: "Konflikt vyřešen", variant: "success" } as Parameters<typeof toast>[0]);
    },
    onError: () => {
      toast({ title: "Chyba při řešení konfliktu", variant: "destructive" } as Parameters<typeof toast>[0]);
    },
  });

  // Calculate results mutation
  const calculateMutation = useMutation({
    mutationFn: () => apiClient.post(`/rounds/${roundId}/calculate`),
    onSuccess: () => {
      toast({ title: t("round.resultsCalculated"), variant: "success" } as Parameters<typeof toast>[0]);
      if (activeRound?.sectionId) {
        router.push(
          `/dashboard/competitions/${competitionId}/sections/${activeRound.sectionId}/rounds/${roundId}/results`
        );
      }
    },
    onError: () => {
      toast({ title: t("common.error"), variant: "destructive" } as Parameters<typeof toast>[0]);
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
      addAlert({ level: "warning", title: `${t("scoring.conflict")} — ${t("judges.judge")} ${data.judgeNumber}` });
    }
  }, [roundId, qc, addAlert, t]));

  const handleRemind = (judgeNumber: number) => {
    toast({
      title: t("round.reminderSent", { number: judgeNumber }),
      variant: "success",
    } as Parameters<typeof toast>[0]);
  };

  const handleResolveConflict = (resolution: "ONLINE" | "OFFLINE") => {
    if (!activeConflict) return;
    resolveMutation.mutate({ conflictId: activeConflict.id, resolution });
  };

  const isLoading = roundLoading || (!!roundId && progressLoading);

  if (isLoading) {
    return (
      <AppShell>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-4 h-80 w-full" />
      </AppShell>
    );
  }

  const pendingConflicts = conflicts?.filter((c) => c) ?? [];

  return (
    <AppShell>
      <div className="mb-6 flex items-start justify-between">
        <PageHeader
          title={t("scoring.title")}
          description={
            progress
              ? `${progress.roundType} · ${t("round.label")} ${progress.roundNumber}`
              : "Čekání na kolo"
          }
          className="mb-0"
          backHref={`/dashboard/competitions/${competitionId}`}
        />
        <div className="flex items-center gap-2">
          {progress?.pendingConflicts ? (
            <Badge variant="warning" className="gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              {progress.pendingConflicts} {t("scoring.conflict")}
            </Badge>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              qc.invalidateQueries({ queryKey: ["rounds", roundId, "marks-progress"] });
              qc.invalidateQueries({ queryKey: ["rounds", roundId, "mark-conflicts"] });
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
              <p className="font-semibold text-[var(--text-primary)]">{"Čekání na kolo"}</p>
              <p className="text-sm text-[var(--text-secondary)]">{"Organizátor brzy otevře kolo."}</p>
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
                  Remíza detekována — {tieDetected.dance}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {tieDetected.count} párů ve stejné pozici
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setTieDetected(null)}>
                OK
              </Button>
            </div>
          )}

          {/* Conflicts resolver */}
          {pendingConflicts.length > 0 && (
            <div>
              <h3 className="mb-3 font-semibold text-[var(--text-primary)]">{t("scoring.conflict")}</h3>
              <div className="flex flex-col gap-2">
                {pendingConflicts.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--warning)]/30 bg-[var(--warning)]/5 px-4 py-3"
                  >
                    <GitMerge className="h-4 w-4 shrink-0 text-[var(--warning)]" />
                    <div className="flex-1 text-sm">
                      <span className="font-medium text-[var(--text-primary)]">
                        {t("judges.judge")} {c.judgeNumber}
                      </span>
                      <span className="mx-2 text-[var(--text-tertiary)]">·</span>
                      <span className="text-[var(--text-secondary)]">
                        #{c.pairStartNumber} · {c.dance}
                      </span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setActiveConflict(c)}>
                      {t("scoring.conflict")} →
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress matrix */}
          {progress && (
            <JudgeProgressMatrix
              progress={progress}
              onRemind={handleRemind}
            />
          )}

          {/* Stats row */}
          {progress && (
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-[var(--text-secondary)]">
                    {t("scoring.received")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {progress.judges.filter((j) => j.allSubmitted).length}
                    <span className="text-base font-normal text-[var(--text-secondary)]">
                      /{progress.totalJudges}
                    </span>
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-[var(--text-secondary)]">
                    {t("scoring.offline_badge")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-[var(--warning)]">
                    {progress.judges.filter((j) => j.isOffline).length}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-[var(--text-secondary)]">Konflikty</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={cn("text-2xl font-bold", pendingConflicts.length > 0 && "text-[var(--warning)]")}>
                    {pendingConflicts.length}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Calculate results CTA */}
          {progress?.allMarksIn && pendingConflicts.length === 0 && (
            <div className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--success)]/30 bg-[var(--success)]/5 px-6 py-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-[var(--success)]" />
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">Všechna hodnocení přijata</p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {t("scoring.calculate")}
                  </p>
                </div>
              </div>
              <Button
                size="lg"
                onClick={() => calculateMutation.mutate()}
                loading={calculateMutation.isPending}
              >
                <BarChart3 className="h-4 w-4" />
                {t("scoring.calculate")}
              </Button>
            </div>
          )}

          {/* Waiting message when not all marks in */}
          {progress && !progress.allMarksIn && (
            <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-6 py-4 text-sm text-[var(--text-secondary)]">
              <Clock className="h-5 w-5 shrink-0" />
              {t("scoring.waiting")} — {progress.judges.filter((j) => !j.allSubmitted).length} {t("judges.judge").toLowerCase()} čeká
            </div>
          )}

          {/* Pending conflicts block calculate */}
          {progress?.allMarksIn && pendingConflicts.length > 0 && (
            <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--warning)]/30 bg-[var(--warning)]/5 px-6 py-4 text-sm">
              <AlertTriangle className="h-5 w-5 shrink-0 text-[var(--warning)]" />
              <p className="text-[var(--text-secondary)]">
                Vyřešte {pendingConflicts.length} konflikty před výpočtem výsledků.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Conflict resolver dialog */}
      {activeConflict && (
        <ConflictResolverDialog
          conflict={activeConflict}
          onResolve={handleResolveConflict}
          onClose={() => setActiveConflict(null)}
        />
      )}
    </AppShell>
  );
}
