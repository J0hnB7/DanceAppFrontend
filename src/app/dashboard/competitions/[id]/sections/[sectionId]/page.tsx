"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { PlayCircle, Plus, Trophy, BarChart3, Presentation, XCircle, ShieldAlert, Swords } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useSection } from "@/hooks/queries/use-sections";
import { useRounds, useCreateRound } from "@/hooks/queries/use-rounds";
import { usePairs } from "@/hooks/queries/use-pairs";
import { WithdrawalModal, PenaltyModal } from "@/components/competition/crisis-modals";
import { toast } from "@/hooks/use-toast";

export default function SectionDetailPage({
  params,
}: {
  params: Promise<{ id: string; sectionId: string }>;
}) {
  const { id: competitionId, sectionId } = use(params);
  const router = useRouter();
  const { data: section, isLoading } = useSection(competitionId, sectionId);
  const { data: rounds } = useRounds(sectionId);
  const { data: pairs } = usePairs(competitionId, sectionId);
  const createRound = useCreateRound(sectionId);

  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [penaltyOpen, setPenaltyOpen] = useState(false);

  const handleCreatePreliminary = async () => {
    await createRound.mutateAsync({ roundType: "PRELIMINARY", pairsToAdvance: 12 });
    toast({ title: "Preliminary round created", variant: "success" } as Parameters<typeof toast>[0]);
  };

  const handleCreateFinal = async () => {
    await createRound.mutateAsync({ roundType: "FINAL" });
    toast({ title: "Final round created", variant: "success" } as Parameters<typeof toast>[0]);
  };

  if (isLoading || !section) {
    return (
      <AppShell>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-4 h-64 w-full" />
      </AppShell>
    );
  }

  const hasResults = rounds?.some((r) => r.status === "CALCULATED");

  return (
    <AppShell
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
                Results
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
                Present
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
      />

      {/* Pairs summary */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-[var(--text-secondary)]">Registered pairs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pairs?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-[var(--text-secondary)]">Dances</CardTitle>
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
            <CardTitle className="text-xs text-[var(--text-secondary)]">Rounds</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{rounds?.length ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Rounds */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-[var(--text-primary)]">Rounds</h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCreatePreliminary}
            loading={createRound.isPending}
          >
            <Plus className="h-4 w-4" />
            Preliminary
          </Button>
          <Button
            size="sm"
            onClick={handleCreateFinal}
            loading={createRound.isPending}
          >
            <Trophy className="h-4 w-4" />
            Final
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {!rounds?.length && (
          <p className="py-8 text-center text-sm text-[var(--text-secondary)]">
            No rounds yet. Create a preliminary or final round to start the competition.
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
                  {round.roundType} — Round {round.roundNumber}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {round.judgeCount} judges
                  {round.pairsToAdvance && ` · ${round.pairsToAdvance} advance`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  variant={
                    round.status === "CALCULATED"
                      ? "success"
                      : round.status === "IN_PROGRESS" || round.status === "OPEN"
                      ? "warning"
                      : "secondary"
                  }
                >
                  {round.status}
                </Badge>
                {(round.status === "OPEN" || round.status === "IN_PROGRESS") && (
                  <Button size="sm" variant="ghost">
                    <PlayCircle className="h-4 w-4" />
                    Manage
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
                    Results
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
          Dance-offs
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
            Section results
          </Button>
        )}
      </div>

      {/* Crisis actions */}
      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold text-[var(--text-tertiary)]">CRISIS ACTIONS</p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-[var(--destructive)]/30 text-[var(--destructive)] hover:bg-red-50"
            onClick={() => setWithdrawalOpen(true)}
          >
            <XCircle className="h-4 w-4" />
            Withdrawal
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-[var(--warning)]/40 text-[var(--warning)] hover:bg-amber-50"
            onClick={() => setPenaltyOpen(true)}
          >
            <ShieldAlert className="h-4 w-4" />
            Penalty
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
