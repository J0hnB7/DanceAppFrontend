"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { PlayCircle, Plus, Trophy, BarChart3, Presentation, XCircle, ShieldAlert, Swords, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { CompetitionSidebar } from "@/components/layout/competition-sidebar";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useSection } from "@/hooks/queries/use-sections";
import { useRounds, useOpenRound } from "@/hooks/queries/use-rounds";
import { usePairs } from "@/hooks/queries/use-pairs";
import { WithdrawalModal, PenaltyModal } from "@/components/competition/crisis-modals";
import { toast } from "@/hooks/use-toast";
import { useLocale } from "@/contexts/locale-context";
import { getRoundStatusBadgeVariant, getErrorMessage } from "@/lib/utils";
import apiClient from "@/lib/api-client";

export default function SectionDetailPage({
  params,
}: {
  params: Promise<{ id: string; sectionId: string }>;
}) {
  const { id: competitionId, sectionId } = use(params);
  const { t } = useLocale();
  const router = useRouter();
  const { data: section, isLoading } = useSection(competitionId, sectionId);
  const { data: rounds } = useRounds(competitionId, sectionId);
  const { data: pairs } = usePairs(competitionId, sectionId);
  const createRound = useOpenRound(competitionId, sectionId);

  // Presence data — only needed when creating first round
  const isFirstRound = !rounds?.length;
  const { data: presencePairs } = useQuery<{ id: string; sectionId: string; presenceStatus: string }[]>({
    queryKey: ["presence", competitionId],
    queryFn: () => apiClient.get(`/competitions/${competitionId}/presence`).then((r) => r.data),
    enabled: isFirstRound,
  });
  const sectionPresencePairs = presencePairs?.filter((p) => p.sectionId === sectionId) ?? [];
  const presentCount = sectionPresencePairs.filter(
    (p) => p.presenceStatus === "CHECKED_IN" || p.presenceStatus === "ON_FLOOR"
  ).length;
  const registeredCount = pairs?.length ?? 0;

  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [penaltyOpen, setPenaltyOpen] = useState(false);

  const handleCreateRound = async (type: "PRELIMINARY" | "FINAL") => {
    try {
      await createRound.mutateAsync();
      const key = type === "PRELIMINARY" ? "section.roundCreatedPreliminary" : "section.roundCreatedFinal";
      toast({ title: t(key), variant: "success" });
    } catch (err: unknown) {
      const msg = getErrorMessage(err, t("common.error"));
      toast({ title: msg, variant: "destructive" });
    }
  };

  if (isLoading || !section) {
    return (
      <AppShell sidebar={<CompetitionSidebar competitionId={competitionId} />}>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-4 h-64 w-full" />
      </AppShell>
    );
  }

  const hasResults = rounds?.some((r) => r.status === "CALCULATED");
  const hasActiveRound = rounds?.some((r) => r.status === "OPEN" || r.status === "IN_PROGRESS");

  return (
    <AppShell
      sidebar={<CompetitionSidebar competitionId={competitionId} />}
      headerActions={
        <div className="flex items-center gap-2">
          {hasResults && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  router.push(
                    `/dashboard/competitions/${competitionId}/sections/${sectionId}/results`
                  )
                }
              >
                <BarChart3 className="h-4 w-4" />
                {t("section.results")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  router.push(
                    `/dashboard/competitions/${competitionId}/sections/${sectionId}/presentation`
                  )
                }
              >
                <Presentation className="h-4 w-4" />
                {t("section.present")}
              </Button>
            </>
          )}
        </div>
      }
    >
      <PageHeader
        title={section.name}
        description={`${section.ageCategory} · ${section.level} · ${section.danceStyle}`}
        actions={<Badge variant="secondary">{section.status}</Badge>}
        backHref={`/dashboard/competitions/${competitionId}`}
      />

      {/* Pairs summary */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-[var(--text-secondary)]">{t("section.registeredPairs")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pairs?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-[var(--text-secondary)]">{t("section.danceCount")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{section.dances.length}</p>
            <p className="text-xs text-[var(--text-tertiary)]">
              {section.dances.map((d) => d.name).join(", ")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-[var(--text-secondary)]">{t("section.roundCount")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{rounds?.length ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Rounds */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-[var(--text-primary)]">{t("section.rounds")}</h3>
          {isFirstRound && presencePairs !== undefined && (
            <div className="mt-1 flex flex-col gap-1">
              <p className="text-sm text-[var(--text-secondary)]">
                {t("section.presentPairs", { present: presentCount, total: registeredCount })}
              </p>
              {!section?.presenceClosed && (
                <p className="flex items-center gap-1 text-xs text-[var(--warning)]">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {t("section.presenceNotClosed")}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleCreateRound("PRELIMINARY")}
            loading={createRound.isPending}
            disabled={hasActiveRound}
            title={hasActiveRound ? t("section.completeRoundFirst") : undefined}
          >
            <Plus className="h-4 w-4" />
            {t("section.addPreliminary")}
          </Button>
          <Button
            size="sm"
            onClick={() => handleCreateRound("FINAL")}
            loading={createRound.isPending}
            disabled={hasActiveRound}
            title={hasActiveRound ? t("section.completeRoundFirst") : undefined}
          >
            <Trophy className="h-4 w-4" />
            {t("section.addFinal")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {!rounds?.length && (
          <p className="py-8 text-center text-sm text-[var(--text-secondary)]">
            {t("section.noRounds")}
          </p>
        )}
        {rounds?.map((round) => (
          <Card
            key={round.id}
            className="cursor-pointer hover:shadow-sm"
            onClick={() =>
              router.push(
                `/dashboard/competitions/${competitionId}/sections/${sectionId}/rounds/${round.id}`
              )
            }
          >
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium text-sm">
                  {round.roundType} — {t("section.rounds")} {round.roundNumber}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {round.judgeCount} {t("judges.title")}
                  {round.pairsToAdvance && ` · ${round.pairsToAdvance} ${t("round.pairsToAdvance")}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={getRoundStatusBadgeVariant(round.status)}>
                  {round.status}
                </Badge>
                {(round.status === "OPEN" || round.status === "IN_PROGRESS") && (
                  <Button size="sm" variant="ghost">
                    <PlayCircle className="h-4 w-4" />
                    {t("section.manage")}
                  </Button>
                )}
                {round.status === "CALCULATED" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(
                        `/dashboard/competitions/${competitionId}/sections/${sectionId}/rounds/${round.id}/results`
                      );
                    }}
                  >
                    <BarChart3 className="h-4 w-4" />
                    {t("section.results")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick links to dance-offs */}
      <Separator className="my-6" />
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            router.push(
              `/dashboard/competitions/${competitionId}/sections/${sectionId}/dance-offs`
            )
          }
        >
          <Swords className="h-4 w-4" />
          {t("section.danceOffs")}
        </Button>
        {hasResults && (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              router.push(
                `/dashboard/competitions/${competitionId}/sections/${sectionId}/results`
              )
            }
          >
            <BarChart3 className="h-4 w-4" />
            {t("section.sectionResults")}
          </Button>
        )}
      </div>

      {/* Crisis actions */}
      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold text-[var(--text-tertiary)]">{t("section.crisisActions")}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-[var(--destructive)]/30 text-[var(--destructive)] hover:bg-red-50"
            onClick={() => setWithdrawalOpen(true)}
          >
            <XCircle className="h-4 w-4" />
            {t("section.withdrawal")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-[var(--warning)]/40 text-[var(--warning)] hover:bg-amber-50"
            onClick={() => setPenaltyOpen(true)}
          >
            <ShieldAlert className="h-4 w-4" />
            {t("section.penalty")}
          </Button>
        </div>
      </div>

      {/* Crisis modals */}
      <WithdrawalModal
        open={withdrawalOpen}
        onClose={() => setWithdrawalOpen(false)}
        competitionId={competitionId}
        pairs={pairs ?? []}
      />
      <PenaltyModal
        open={penaltyOpen}
        onClose={() => setPenaltyOpen(false)}
        competitionId={competitionId}
        pairs={pairs ?? []}
      />
    </AppShell>
  );
}
