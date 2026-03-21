"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Square, BarChart3, Clock, CheckCircle2, Users, AlertTriangle, Bell } from "lucide-react";
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
import { useRound, useRoundAction, useSubmissionStatus } from "@/hooks/queries/use-rounds";
import { useSection } from "@/hooks/queries/use-sections";
import { formatTime, cn, getRoundStatusBadgeVariant, getErrorMessage } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useLocale } from "@/contexts/locale-context";

// ── CollisionResolutionDialog ─────────────────────────────────────────────────
function CollisionResolutionDialog({
  open,
  onResolve,
  onClose,
}: {
  open: boolean;
  onResolve: (choice: "more" | "less") => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[var(--warning)]" />
            {t("round.collisionTitle")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">
            {t("round.collisionDesc")}
          </p>
          <div className="rounded-lg border border-[var(--warning)]/30 bg-amber-50 p-3 text-sm dark:bg-amber-950/20">
            <p className="font-semibold text-[var(--text-primary)]">
              {t("round.collisionTied")}
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              {t("round.collisionNote")}
            </p>
          </div>
        </div>
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onResolve("less")}>
            {t("round.advanceFewer")}
          </Button>
          <Button onClick={() => onResolve("more")}>
            {t("round.advanceMore")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── JudgesSubmissionMatrix ────────────────────────────────────────────────────
function JudgesSubmissionMatrix({
  submissionStatus,
  dances,
  onSendReminder,
}: {
  submissionStatus: { totalJudges: number; submitted: number; judges: Array<{ judgeTokenId: string; judgeNumber: number; submitted: boolean; submittedAt?: string }> };
  dances: string[];
  onSendReminder: (judgeNumber: number) => void;
}) {
  const { t } = useLocale();
  const progressPct =
    submissionStatus.totalJudges > 0
      ? Math.round((submissionStatus.submitted / submissionStatus.totalJudges) * 100)
      : 0;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-[var(--text-primary)]">{t("round.judgeSubmissions")}</h3>
        <span className="text-sm text-[var(--text-secondary)]">
          {t("round.submitted", { submitted: submissionStatus.submitted, total: submissionStatus.totalJudges })}
        </span>
      </div>

      <Progress value={progressPct} className="mb-4 h-2" />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="py-3 pl-4 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  {t("judges.judge")}
                </th>
                {dances.map((d) => (
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
              {submissionStatus.judges.map((j) => (
                <tr
                  key={j.judgeTokenId}
                  className={cn(
                    "border-b border-[var(--border)] last:border-0 transition-colors",
                    !j.submitted && "bg-amber-50/50 dark:bg-amber-950/10"
                  )}
                >
                  <td className="py-3 pl-4">
                    <p className="font-medium text-[var(--text-primary)]">{t("round.judgeLabel", { number: j.judgeNumber })}</p>
                    {j.submittedAt && (
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {formatTime(j.submittedAt)}
                      </p>
                    )}
                  </td>
                  {dances.map((d) => (
                    <td key={d} className="px-3 py-3 text-center">
                      {j.submitted ? (
                        <CheckCircle2 className="mx-auto h-4 w-4 text-[var(--success)]" />
                      ) : (
                        <div className="mx-auto h-4 w-4 rounded-full border-2 border-amber-400 bg-amber-100 dark:bg-amber-900/30" />
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center">
                    <Badge variant={j.submitted ? "success" : "warning"}>
                      {j.submitted ? t("round.statusDone") : t("round.statusPending")}
                    </Badge>
                  </td>
                  <td className="pr-4 py-3 text-right">
                    {!j.submitted && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => onSendReminder(j.judgeNumber)}
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
export default function RoundDetailPage({
  params,
}: {
  params: Promise<{ id: string; sectionId: string; roundId: string }>;
}) {
  const { id: competitionId, sectionId, roundId } = use(params);
  const { t } = useLocale();
  const { data: round, isLoading } = useRound(roundId);
  const { data: submissionStatus } = useSubmissionStatus(roundId);
  const { data: section } = useSection(competitionId, sectionId);
  const actions = useRoundAction(roundId);
  const router = useRouter();
  const [collisionOpen, setCollisionOpen] = useState(false);

  const dances = (section?.dances.map((d) => d.danceName).filter(Boolean) ?? []) as string[];

  const handleOpen = async () => {
    try {
      await actions.start.mutateAsync();
      toast({ title: t("round.roundOpened") } as Parameters<typeof toast>[0]);
    } catch (err: unknown) {
      const msg = getErrorMessage(err, t("common.error"));
      toast({ title: msg, variant: "destructive" } as Parameters<typeof toast>[0]);
    }
  };

  const handleClose = async () => {
    if (!confirm(t("round.closeRoundConfirm"))) return;
    try {
      await actions.close.mutateAsync();
      toast({ title: t("round.roundClosed") } as Parameters<typeof toast>[0]);
    } catch (err: unknown) {
      const msg = getErrorMessage(err, t("common.error"));
      toast({ title: msg, variant: "destructive" } as Parameters<typeof toast>[0]);
    }
  };

  const handleCalculate = async () => {
    try {
      await actions.calculate.mutateAsync();
      toast({ title: t("round.resultsCalculated"), variant: "success" } as Parameters<typeof toast>[0]);
      router.push(
        `/dashboard/competitions/${competitionId}/sections/${sectionId}/rounds/${roundId}/results`
      );
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setCollisionOpen(true);
      } else {
        const msg = getErrorMessage(err, t("common.error"));
        toast({ title: msg, variant: "destructive" } as Parameters<typeof toast>[0]);
      }
    }
  };

  const handleCollisionResolve = async (choice: "more" | "less") => {
    setCollisionOpen(false);
    try {
      await actions.resolveTie.mutateAsync(choice);
      toast({
        title: choice === "more" ? t("round.resolvedMore") : t("round.resolvedFewer"),
        variant: "success",
      } as Parameters<typeof toast>[0]);
      router.push(
        `/dashboard/competitions/${competitionId}/sections/${sectionId}/rounds/${roundId}/results`
      );
    } catch (err: unknown) {
      const msg = getErrorMessage(err, t("common.error"));
      toast({ title: msg, variant: "destructive" } as Parameters<typeof toast>[0]);
    }
  };

  const handleReminder = (judgeNumber: number) => {
    toast({
      title: t("round.reminderSent", { number: judgeNumber }),
      variant: "success",
    } as Parameters<typeof toast>[0]);
  };

  if (isLoading || !round) {
    return (
      <AppShell>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-4 h-64 w-full" />
      </AppShell>
    );
  }

  const allSubmitted =
    submissionStatus &&
    submissionStatus.submitted === submissionStatus.totalJudges &&
    submissionStatus.totalJudges > 0;

  const majority =
    submissionStatus?.totalJudges ? Math.floor(submissionStatus.totalJudges / 2) + 1 : null;

  return (
    <AppShell
      headerActions={
        <div className="flex items-center gap-2">
          {round.status === "PENDING" && (
            <Button size="sm" onClick={handleOpen} loading={actions.start.isPending}>
              <Play className="h-4 w-4" />
              {t("round.openRound")}
            </Button>
          )}
          {(round.status === "OPEN" || round.status === "IN_PROGRESS") && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleClose}
                loading={actions.close.isPending}
              >
                <Square className="h-4 w-4" />
                {t("round.closeRound")}
              </Button>
              {allSubmitted && (
                <Button size="sm" onClick={handleCalculate} loading={actions.calculate.isPending}>
                  <BarChart3 className="h-4 w-4" />
                  {t("round.calculateResults")}
                </Button>
              )}
            </>
          )}
          {round.status === "CLOSED" && (
            <Button size="sm" onClick={handleCalculate} loading={actions.calculate.isPending}>
              <BarChart3 className="h-4 w-4" />
              {t("round.calculateResults")}
            </Button>
          )}
          {round.status === "CALCULATED" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                router.push(
                  `/dashboard/competitions/${competitionId}/sections/${sectionId}/rounds/${roundId}/results`
                )
              }
            >
              <BarChart3 className="h-4 w-4" />
              {t("round.viewResults")}
            </Button>
          )}
        </div>
      }
    >
      <PageHeader
        title={`${round.roundType} — ${t("section.rounds")} ${round.roundNumber}`}
        description={`${round.judgeCount} ${t("judges.title")} · ${section?.name ?? ""}`}
        backHref={`/dashboard/competitions/${competitionId}/sections/${sectionId}`}
        actions={
          <Badge
            variant={getRoundStatusBadgeVariant(round.status)}
          >
            {round.status}
          </Badge>
        }
      />

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <Users className="h-4 w-4" /> {t("round.judgesSubmitted")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {submissionStatus?.submitted ?? 0} / {submissionStatus?.totalJudges ?? round.judgeCount}
            </p>
          </CardContent>
        </Card>

        {majority && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-[var(--text-secondary)]">{t("round.majorityNeeded")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{majority}</p>
              <p className="text-xs text-[var(--text-tertiary)]">{t("common.of")} {round.judgeCount}</p>
            </CardContent>
          </Card>
        )}

        {round.pairsToAdvance && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-[var(--text-secondary)]">{t("round.pairsToAdvance")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{round.pairsToAdvance}</p>
            </CardContent>
          </Card>
        )}

        {round.startedAt && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <Clock className="h-4 w-4" /> {t("round.startedAt")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{formatTime(round.startedAt)}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Judge submission matrix */}
      {submissionStatus && (
        <JudgesSubmissionMatrix
          submissionStatus={submissionStatus}
          dances={dances.length > 0 ? dances : ["Dance 1", "Dance 2", "Dance 3"]}
          onSendReminder={handleReminder}
        />
      )}

      {/* Collision dialog */}
      <CollisionResolutionDialog
        open={collisionOpen}
        onResolve={handleCollisionResolve}
        onClose={() => setCollisionOpen(false)}
      />
    </AppShell>
  );
}
