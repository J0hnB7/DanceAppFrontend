"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, Printer } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { competitionsApi } from "@/lib/api/competitions";
import { sectionsApi } from "@/lib/api/sections";
import { scoringApi } from "@/lib/api/scoring";
import { printDiploma, printAllDiplomas } from "@/lib/diploma";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/locale-context";

const MEDAL_COLORS: Record<number, string> = {
  1: "text-yellow-500",
  2: "text-gray-400",
  3: "text-amber-600",
};

const MEDAL_BG: Record<number, string> = {
  1: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800",
  2: "bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700",
  3: "bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800",
};

function PlacementBadge({ place }: { place: number }) {
  const medals: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
  return (
    <span className={cn("text-2xl font-bold", MEDAL_COLORS[place] ?? "text-[var(--text-primary)]")}>
      {medals[place] ?? `${place}.`}
    </span>
  );
}

interface SectionDiplomasProps {
  sectionId: string;
  sectionName: string;
  competitionName: string;
  competitionDate: string;
  competitionLocation: string;
}

function SectionDiplomas({ sectionId, sectionName, competitionName, competitionDate, competitionLocation }: SectionDiplomasProps) {
  const { t } = useLocale();
  const { data: summary, isLoading } = useQuery({
    queryKey: ["section-summary", sectionId],
    queryFn: () => scoringApi.getSectionSummary(sectionId),
  });

  if (isLoading) return <Skeleton className="h-40 rounded-xl" />;
  if (!summary || summary.rankings.length === 0) {
    return (
      <Card className="p-4 text-center text-sm text-[var(--text-secondary)]">
        {t("diplomas.noResultsYet", { section: sectionName })}
      </Card>
    );
  }

  const top3 = summary.rankings.filter((r) => r.finalPlacement <= 3);
  const rest = summary.rankings.filter((r) => r.finalPlacement > 3);

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[var(--text-primary)]">{sectionName}</h3>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => printAllDiplomas(summary.rankings, competitionName, competitionDate, competitionLocation, sectionName)}
        >
          <Printer className="h-3.5 w-3.5" />
          {t("diplomas.printTop3")}
        </Button>
      </div>

      {/* Podium */}
      <div className="grid grid-cols-3 gap-2">
        {top3.map((r) => (
          <div
            key={r.pairId}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border p-3 text-center",
              MEDAL_BG[r.finalPlacement] ?? "border-[var(--border)]"
            )}
          >
            <PlacementBadge place={r.finalPlacement} />
            <p className="text-sm font-medium text-[var(--text-primary)]">{t("diplomas.startNumber", { number: r.startNumber })}</p>
            <p className="text-xs text-[var(--text-secondary)]">{t("diplomas.sumLabel", { value: r.totalSum })}</p>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-xs"
              onClick={() =>
                printDiploma({
                  competitionName,
                  competitionDate,
                  competitionLocation,
                  sectionName,
                  placement: r.finalPlacement,
                  dancer1Name: `Start #${r.startNumber}`,
                })
              }
            >
              <Printer className="h-3 w-3" />
              {t("diplomas.print")}
            </Button>
          </div>
        ))}
      </div>

      {/* Remaining placements */}
      {rest.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">{t("diplomas.otherPlacements")}</p>
          {rest.map((r) => (
            <div
              key={r.pairId}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-[var(--surface-secondary)]"
            >
              <span className="w-6 text-center font-semibold text-[var(--text-secondary)]">{r.finalPlacement}.</span>
              <span className="flex-1 text-[var(--text-primary)]">{t("diplomas.startNumber", { number: r.startNumber })}</span>
              <span className="text-xs text-[var(--text-tertiary)]">{t("diplomas.sumLabel", { value: r.totalSum })}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-[var(--text-tertiary)]"
                onClick={() =>
                  printDiploma({
                    competitionName,
                    competitionDate,
                    competitionLocation,
                    sectionName,
                    placement: r.finalPlacement,
                    dancer1Name: `Start #${r.startNumber}`,
                  })
                }
              >
                <Printer className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function DiplomasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: competitionId } = use(params);
  const { t } = useLocale();

  const { data: competition, isLoading: loadingComp } = useQuery({
    queryKey: ["competition", competitionId],
    queryFn: () => competitionsApi.get(competitionId),
  });

  const { data: sections = [], isLoading: loadingSections } = useQuery({
    queryKey: ["sections", competitionId],
    queryFn: () => sectionsApi.list(competitionId),
  });

  const completedSections = sections.filter((s) => s.status === "COMPLETED");

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">{t("diplomas.title")}</h1>
            {competition && (
              <p className="text-sm text-[var(--text-secondary)]">
                {competition.name} · {formatDate(competition.eventDate)} · {competition.venue}
              </p>
            )}
          </div>
          <Badge variant="default">
            {t("diplomas.sectionsCompleted", { completed: completedSections.length, total: sections.length })}
          </Badge>
        </div>

        {loadingComp || loadingSections ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : completedSections.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 py-20 text-center">
            <Award className="h-12 w-12 text-[var(--text-tertiary)]" />
            <p className="text-sm text-[var(--text-secondary)]">
              {t("diplomas.noCompleted")}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {completedSections.map((section) => (
              <SectionDiplomas
                key={section.id}
                sectionId={section.id}
                sectionName={section.name}
                competitionName={competition?.name ?? ""}
                competitionDate={competition ? formatDate(competition.eventDate) : ""}
                competitionLocation={competition?.venue ?? ""}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
