"use client";

import { use, useState } from "react";
import { Trophy, ChevronRight, ChevronDown, BarChart3, Clock, CheckCircle2, Download, Medal } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { CompetitionSidebar } from "@/components/layout/competition-sidebar";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSections } from "@/hooks/queries/use-sections";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { scoringApi, type RoundResultsResponse } from "@/lib/api/scoring";
import { roundsApi, type RoundDto } from "@/lib/api/rounds";
import apiClient from "@/lib/api-client";
import axios from "axios";
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

function PlacementIcon({ placement }: { placement: number }) {
  if (placement === 1) return <Trophy className="h-4 w-4 text-yellow-500" aria-hidden="true" />;
  if (placement === 2) return <Medal className="h-4 w-4 text-slate-400" aria-hidden="true" />;
  if (placement === 3) return <Medal className="h-4 w-4 text-amber-700" aria-hidden="true" />;
  return null;
}

const FINAL_TYPES = new Set(["FINAL", "SINGLE_ROUND"]);

function roundTypeLabel(round: RoundDto, t: TFn): string {
  switch (round.roundType) {
    case "HEAT": return t("results.roundHeat");
    case "PRELIMINARY": return t("results.roundPrelim", { n: round.roundNumber });
    case "QUARTER_FINAL": return t("results.roundQuarterFinal");
    case "SEMIFINAL": return t("results.roundSemifinal");
    case "FINAL": return t("results.roundFinal");
    case "SINGLE_ROUND": return t("results.roundSingle");
    default: return round.roundType;
  }
}

function RoundContent({ round }: { round: RoundDto }) {
  const { t } = useLocale();
  const isFinal = FINAL_TYPES.has(round.roundType);

  const { data: finalData, isLoading: finalLoading } = useQuery({
    queryKey: ["round-results", round.id],
    queryFn: () => roundsApi.getResults(round.id) as Promise<RoundResultsResponse>,
    enabled: isFinal,
  });

  const { data: prelimData, isLoading: prelimLoading } = useQuery({
    queryKey: ["round-prelim", round.id],
    queryFn: () => roundsApi.getPreliminaryResults(round.id),
    enabled: !isFinal && round.status === "COMPLETED",
  });

  const { data: sectionSummary } = useQuery({
    queryKey: ["section-summary", round.sectionId],
    queryFn: () => scoringApi.getSectionSummary(round.sectionId!),
    enabled: !isFinal && round.status === "COMPLETED" && !!round.sectionId,
  });

  if (isFinal) {
    if (finalLoading) return <Skeleton className="h-24 w-full" />;
    if (!finalData?.dances?.length) return <p className="text-sm text-[var(--text-secondary)]">{t("results.noResults")}</p>;

    const allPairs = Array.from(
      new Map(finalData.dances.flatMap((d) => d.rankings).map((r) => [r.startNumber, r])).values()
    ).sort((a, b) => a.startNumber - b.startNumber);

    const placementMap = new Map<number, Map<string, number>>();
    for (const dance of finalData.dances) {
      for (const r of dance.rankings) {
        if (!placementMap.has(r.startNumber)) placementMap.set(r.startNumber, new Map());
        placementMap.get(r.startNumber)!.set(dance.danceId, r.placement);
      }
    }
    const rows = allPairs.map((p) => {
      const dancePlacements = finalData.dances.map((d) => placementMap.get(p.startNumber)?.get(d.danceId) ?? 0);
      const sum = dancePlacements.reduce((a, b) => a + b, 0);
      return { ...p, sum, dancePlacements };
    }).sort((a, b) => a.sum - b.sum);

    return (
      <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead className="w-10">#</TableHead>
              <TableHead>{t("results.dancers")}</TableHead>
              {finalData.dances.map((d) => (
                <TableHead key={d.danceId} className="w-14 text-center text-xs">{d.danceName}</TableHead>
              ))}
              <TableHead className="w-14 text-center">{t("results.sum")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow key={row.pairId ?? row.startNumber} className={cn(idx < 3 && "bg-yellow-50/30")}>
                <TableCell className="text-right font-bold text-[var(--text-secondary)]">{idx + 1}.</TableCell>
                <TableCell className="font-mono font-bold">{row.startNumber}</TableCell>
                <TableCell>{row.dancer1Name}</TableCell>
                {row.dancePlacements.map((pl, i) => (
                  <TableCell key={i} className="text-center font-mono text-sm">{pl || "—"}</TableCell>
                ))}
                <TableCell className="text-center font-bold">{row.sum}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // Callback round
  if (round.status !== "COMPLETED") {
    return <p className="text-sm text-[var(--text-secondary)]">{t("results.roundInProgress")}</p>;
  }
  if (prelimLoading) return <Skeleton className="h-24 w-full" />;
  if (!prelimData?.pairs?.length) return <p className="text-sm text-[var(--text-secondary)]">{t("results.noResults")}</p>;

  const finalPlacementMap = new Map<string, number>(
    (sectionSummary?.rankings ?? []).map((r) => [r.pairId, r.finalPlacement])
  );
  const sorted = [...prelimData.pairs].sort((a, b) => {
    const pA = finalPlacementMap.get(a.pairId) ?? 999;
    const pB = finalPlacementMap.get(b.pairId) ?? 999;
    return pA !== pB ? pA - pB : b.voteCount - a.voteCount;
  });
  return (
    <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border)]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8 text-center">{t("results.place")}</TableHead>
            <TableHead className="w-10">#</TableHead>
            <TableHead>{t("results.dancers")}</TableHead>
            <TableHead className="w-10 text-center">X</TableHead>
            <TableHead className="w-28 text-right">{t("results.statusAvailable")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((pair, idx) => {
            const place = finalPlacementMap.get(pair.pairId) ?? (idx + 1);
            return (
            <TableRow key={pair.pairId} className={pair.advances ? "bg-green-500/5" : ""}>
              <TableCell className="text-center font-bold text-[var(--text-secondary)]">{place}.</TableCell>
              <TableCell className="font-mono font-bold">{pair.startNumber}</TableCell>
              <TableCell>{pair.dancer1Name}</TableCell>
              <TableCell className="text-center font-semibold">{pair.voteCount}</TableCell>
              <TableCell className="text-right">
                <Badge variant={pair.advances ? "success" : "destructive"}>
                  {pair.advances ? "Postupuje" : "Nepostupuje"}
                </Badge>
              </TableCell>
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function RoundAccordion({ round, defaultOpen }: { round: RoundDto; defaultOpen: boolean }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
        aria-expanded={open}
      >
        <span className="flex-1 text-sm font-semibold text-[var(--text-primary)]">
          {roundTypeLabel(round, t)}
        </span>
        <Badge variant={round.status === "COMPLETED" ? "success" : "warning"} className="text-xs">
          {round.status === "COMPLETED" ? t("results.roundCompleted") : t("results.roundInProgress")}
        </Badge>
        {open
          ? <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden="true" />
          : <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden="true" />}
      </button>
      {open && (
        <div className="border-t border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3">
          <RoundContent round={round} />
        </div>
      )}
    </div>
  );
}

function RoundFallbackView({
  competitionId,
  sectionId,
}: {
  competitionId: string;
  sectionId: string;
}) {
  const { t } = useLocale();
  const { data: rounds, isLoading } = useQuery({
    queryKey: ["rounds", competitionId, sectionId],
    queryFn: () => roundsApi.list(competitionId, sectionId),
  });

  if (isLoading) return <Skeleton className="h-20 w-full" />;

  const visible = (rounds ?? []).filter((r) =>
    ["COMPLETED", "CALCULATED", "IN_PROGRESS", "OPEN", "CLOSED"].includes(r.status)
  );

  if (!visible.length) {
    return <p className="py-4 text-sm text-[var(--text-secondary)]">{t("results.noRoundsStarted")}</p>;
  }

  return (
    <div className="space-y-2">
      {visible.map((round, idx) => (
        <RoundAccordion key={round.id} round={round} defaultOpen={idx === visible.length - 1} />
      ))}
    </div>
  );
}

function SectionInlineResults({
  section,
  competitionId,
}: {
  section: SectionDto;
  competitionId: string;
}) {
  const { t } = useLocale();

  const { data: summary, isLoading } = useQuery({
    queryKey: ["section-summary", section.id],
    queryFn: () => scoringApi.getSectionSummary(section.id),
  });

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  const hasSummary = (summary?.rankings?.length ?? 0) > 0;

  return (
    <div className="space-y-3">
      {/* Summary table if available */}
      {hasSummary && (() => {
        const danceNames = Object.keys(summary!.rankings[0]?.perDance ?? {});
        return (
          <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">{t("results.place")}</TableHead>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>{t("results.dancers")}</TableHead>
                  <TableHead className="w-16 text-center">{t("results.sum")}</TableHead>
                  {danceNames.map((d) => (
                    <TableHead key={d} className="w-14 text-center text-xs">{d}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary!.rankings.map((row) => (
                  <TableRow key={row.pairId} className={cn(row.finalPlacement <= 3 && "bg-yellow-50/30")}>
                    <TableCell className="text-center">
                      <span className="flex items-center justify-center gap-1">
                        <PlacementIcon placement={row.finalPlacement} />
                        <span className={cn(
                          "font-bold",
                          row.finalPlacement === 1 && "text-yellow-600",
                          row.finalPlacement === 2 && "text-slate-500",
                          row.finalPlacement === 3 && "text-amber-700",
                        )}>
                          {row.finalPlacement}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="font-mono font-bold">{row.startNumber}</TableCell>
                    <TableCell>
                      <span className="font-medium text-[var(--text-primary)]">
                        {row.dancerName ?? `${t("results.pair")} #${row.startNumber}`}
                      </span>
                      {row.club && (
                        <span className="ml-1.5 text-xs text-[var(--text-tertiary)]">{row.club}</span>
                      )}
                      {row.tieResolution !== "NONE" && (
                        <Badge variant="warning" className="ml-2 text-xs">{t("results.tieResolved")}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {Object.keys(row.perDance).length > 0 ? row.totalSum : "—"}
                    </TableCell>
                    {danceNames.map((d) => (
                      <TableCell key={d} className="text-center font-mono text-sm text-[var(--text-secondary)]">
                        {row.perDance[d] ?? "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );
      })()}

      {/* All rounds — always shown */}
      <RoundFallbackView competitionId={competitionId} sectionId={section.id} />
    </div>
  );
}

function SectionAccordionItem({
  section,
  competitionId,
  defaultOpen,
}: {
  section: SectionDto;
  competitionId: string;
  defaultOpen: boolean;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(defaultOpen);
  const [exporting, setExporting] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const status = sectionResultStatus(section, t);
  const canExpand = section.status === "COMPLETED" || section.status === "ACTIVE" ||
    (section.currentRound?.status != null && ACTIVE_ROUND_STATUSES.includes(section.currentRound.status));

  const handleRecalculate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecalculating(true);
    try {
      await apiClient.post(`/sections/${section.id}/final-summary/calculate`);
      // Force refetch of summary
      window.location.reload();
    } catch {
      // silently fail
    } finally {
      setRecalculating(false);
    }
  };

  const handleExport = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setExporting(true);
    try {
      const res = await apiClient.get(`/sections/${section.id}/results/export`, {
        params: { format: "xlsx", withAudit: true },
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${section.name}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <div
        className={cn(
          "flex w-full items-center gap-4 px-5 py-4 transition-colors",
          canExpand ? "cursor-pointer hover:bg-[var(--surface-hover)]" : "opacity-60"
        )}
        onClick={() => canExpand && setOpen((o) => !o)}
        role="button"
        aria-expanded={open}
      >
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[var(--text-primary)] truncate">{section.name}</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
            {[section.ageCategory, section.level, section.danceStyle].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={status.variant} className="flex items-center gap-1.5">
            {status.icon}
            {status.label}
          </Badge>
          {(section.status === "COMPLETED" || section.currentRound?.status === "COMPLETED") && (
            <button
              type="button"
              onClick={handleRecalculate}
              disabled={recalculating}
              className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface)] transition-colors disabled:opacity-50 cursor-pointer"
              title="Přepočítat pořadí všech párů"
            >
              {recalculating ? (
                <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                  <path d="M8 16H3v5" />
                </svg>
              )}
              {recalculating ? "Přepočítávám…" : "Přepočítat"}
            </button>
          )}
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface)] transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Download className="h-3 w-3" aria-hidden="true" />
            {exporting ? t("results.exporting") : t("results.exportXlsx")}
          </button>
          {canExpand && (
            open
              ? <ChevronDown className="h-4 w-4 text-[var(--text-tertiary)]" aria-hidden="true" />
              : <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" aria-hidden="true" />
          )}
        </div>
      </div>

      {open && canExpand && (
        <div className="border-t border-[var(--border)] bg-[var(--surface-secondary)] px-5 py-4">
          <SectionInlineResults section={section} competitionId={competitionId} />
        </div>
      )}
    </div>
  );
}

export default function ResultsHubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: competitionId } = use(params);
  const { t } = useLocale();
  const { data: sections, isLoading } = useSections(competitionId);
  const queryClient = useQueryClient();
  const [calculatingAll, setCalculatingAll] = useState(false);
  const [calcProgress, setCalcProgress] = useState<{ done: number; total: number } | null>(null);

  const completedSections = sections?.filter((s) => s.status === "COMPLETED") ?? [];
  const activeSections = sections?.filter((s) => s.status === "ACTIVE") ?? [];
  const pendingSections = sections?.filter((s) => s.status !== "COMPLETED" && s.status !== "ACTIVE") ?? [];

  const ordered = [...completedSections, ...activeSections, ...pendingSections];

  const eligibleForCalc = ordered.filter(
    (s) => s.status === "COMPLETED" || s.currentRound?.status === "COMPLETED",
  );

  const handleCalculateAll = async () => {
    if (eligibleForCalc.length === 0 || calculatingAll) return;
    setCalculatingAll(true);
    setCalcProgress({ done: 0, total: eligibleForCalc.length });
    let done = 0;
    for (const section of eligibleForCalc) {
      try {
        await apiClient.post(`/sections/${section.id}/final-summary/calculate`);
      } catch (err) {
        const detail = axios.isAxiosError(err)
          ? { status: err.response?.status, data: err.response?.data, message: err.message }
          : err;
        console.error("[results] calculate section failed", section.id, detail);
      }
      done += 1;
      setCalcProgress({ done, total: eligibleForCalc.length });
    }
    await queryClient.invalidateQueries({ queryKey: ["section-summary"] });
    await queryClient.invalidateQueries({ queryKey: ["sections", competitionId] });
    setCalculatingAll(false);
    setCalcProgress(null);
  };

  return (
    <AppShell sidebar={<CompetitionSidebar competitionId={competitionId} />}>
      <PageHeader
        title={t("results.hubTitle")}
        description={t("results.categoriesCompleted", { done: completedSections.length, total: sections?.length ?? 0 })}
        backHref={`/dashboard/competitions/${competitionId}`}
      />

      {!isLoading && eligibleForCalc.length > 0 && (
        <div className="mb-4 flex items-center justify-end">
          <button
            type="button"
            onClick={handleCalculateAll}
            disabled={calculatingAll}
            className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-50 cursor-pointer min-h-[44px]"
            title="Přepočítat celkové pořadí pro všechny kategorie"
            aria-label="Vytvořit celkové pořadí pro všechny kategorie"
          >
            {calculatingAll ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <Trophy className="h-4 w-4" aria-hidden="true" />
            )}
            {calculatingAll && calcProgress
              ? `Přepočítávám… ${calcProgress.done}/${calcProgress.total}`
              : `Vytvořit celkové pořadí (${eligibleForCalc.length})`}
          </button>
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      )}

      {!isLoading && ordered.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Trophy className="h-12 w-12 text-[var(--text-tertiary)]" aria-hidden="true" />
          <div>
            <p className="font-medium text-[var(--text-primary)]">{t("results.noCategories")}</p>
            <p className="text-sm text-[var(--text-secondary)]">{t("results.noCategoriesDesc")}</p>
          </div>
        </div>
      )}

      {!isLoading && ordered.length > 0 && (
        <div className="space-y-2">
          {ordered.map((section, idx) => (
            <SectionAccordionItem
              key={section.id}
              section={section}
              competitionId={competitionId}
              defaultOpen={idx === 0 && (section.status === "COMPLETED" || section.status === "ACTIVE")}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
