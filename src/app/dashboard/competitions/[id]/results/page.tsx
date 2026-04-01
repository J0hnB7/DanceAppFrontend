"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Trophy, ChevronRight, BarChart3, Clock, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { CompetitionSidebar } from "@/components/layout/competition-sidebar";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSections } from "@/hooks/queries/use-sections";
import { useLocale } from "@/contexts/locale-context";
import { cn } from "@/lib/utils";
import type { SectionDto } from "@/lib/api/sections";

const ACTIVE_ROUND_STATUSES = ["OPEN", "IN_PROGRESS", "CLOSED", "COMPLETED", "CALCULATED", "PENDING"];

type TFn = (key: string, vars?: Record<string, string | number>) => string;

function sectionResultStatus(section: SectionDto, t: TFn): {
  label: string;
  variant: "success" | "secondary" | "warning";
  icon: React.ReactNode;
} {
  const roundStatus = section.currentRound?.status;
  if (section.status === "COMPLETED" || roundStatus === "COMPLETED") {
    return { label: t("results.statusAvailable"), variant: "success", icon: <CheckCircle2 className="h-4 w-4" /> };
  }
  if (section.status === "ACTIVE" || (roundStatus && ACTIVE_ROUND_STATUSES.includes(roundStatus))) {
    return { label: t("results.statusInProgress"), variant: "warning", icon: <Clock className="h-4 w-4" /> };
  }
  return { label: t("results.statusWaiting"), variant: "secondary", icon: <BarChart3 className="h-4 w-4" /> };
}

export default function ResultsHubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: competitionId } = use(params);
  const { t } = useLocale();
  const router = useRouter();
  const { data: sections, isLoading } = useSections(competitionId);

  const completedSections = sections?.filter((s) => s.status === "COMPLETED") ?? [];
  const activeSections = sections?.filter((s) => s.status === "ACTIVE") ?? [];
  const pendingSections = sections?.filter((s) => s.status !== "COMPLETED" && s.status !== "ACTIVE") ?? [];

  const ordered = [...completedSections, ...activeSections, ...pendingSections];

  return (
    <AppShell sidebar={<CompetitionSidebar competitionId={competitionId} />}>
      <PageHeader
        title={t("results.hubTitle")}
        description={t("results.categoriesCompleted", { done: completedSections.length, total: sections?.length ?? 0 })}
        backHref={`/dashboard/competitions/${competitionId}`}
      />

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      )}

      {!isLoading && ordered.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <Trophy className="h-12 w-12 text-[var(--text-tertiary)]" />
            <div>
              <p className="font-medium text-[var(--text-primary)]">{t("results.noCategories")}</p>
              <p className="text-sm text-[var(--text-secondary)]">{t("results.noCategoriesDesc")}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && ordered.length > 0 && (
        <div className="space-y-2">
          {ordered.map((section) => {
            const status = sectionResultStatus(section, t);
            const canViewResults = section.status === "COMPLETED" || section.status === "ACTIVE" ||
              (section.currentRound?.status != null && ACTIVE_ROUND_STATUSES.includes(section.currentRound.status));
            return (
              <button
                key={section.id}
                type="button"
                disabled={!canViewResults}
                onClick={() =>
                  router.push(
                    `/dashboard/competitions/${competitionId}/sections/${section.id}/results`
                  )
                }
                className={cn(
                  "flex w-full items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-5 py-4 text-left transition-colors",
                  canViewResults
                    ? "cursor-pointer hover:bg-[var(--surface-hover)]"
                    : "cursor-default opacity-50"
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[var(--text-primary)] truncate">{section.name}</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                    {[section.ageCategory, section.level, section.danceStyle]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant={status.variant} className="flex items-center gap-1.5">
                    {status.icon}
                    {status.label}
                  </Badge>
                  {canViewResults && (
                    <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
