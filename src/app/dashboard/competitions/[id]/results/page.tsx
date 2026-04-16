"use client";

import { Fragment, use, useState } from "react";
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
  TableRow,
} from "@/components/ui/table";
import { useSections } from "@/hooks/queries/use-sections";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { scoringApi } from "@/lib/api/scoring";
import { roundsApi, type RoundDto, isPreliminaryDetail, isFinalDetail } from "@/lib/api/rounds";
import { PrelimRoundTable, type PreliminaryRoundDetail } from "@/components/results/prelim-round-table";
import { FinalRoundTable, type FinalRoundDetail } from "@/components/results/final-round-table";
import { PairDetailModal } from "@/components/results/pair-detail-modal";
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

  const isCompleted = round.status === "COMPLETED" || round.status === "CALCULATED";

  const { data: detailData, isLoading: detailLoading, isError: detailError } = useQuery({
    queryKey: ["round-detail", round.id],
    queryFn: () => roundsApi.getRoundDetail(round.id),
    enabled: isCompleted,
  });

  if (!isCompleted) {
    return <p className="text-sm text-[var(--text-secondary)]">{t("results.roundInProgress")}</p>;
  }

  if (detailLoading) return <Skeleton className="h-24 w-full" />;

  if (detailError) {
    return <p className="text-sm text-[var(--destructive)]">{t("common.error")}</p>;
  }

  if (detailData && detailData.pairs.length > 0) {
    if (isFinalDetail(detailData)) {
      return <FinalRoundTable data={detailData as FinalRoundDetail} />;
    }
    if (isPreliminaryDetail(detailData)) {
      return <PrelimRoundTable data={detailData as PreliminaryRoundDetail} />;
    }
  }

  return <p className="text-sm text-[var(--text-secondary)]">{t("results.noResults")}</p>;
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
  const [detailPairId, setDetailPairId] = useState<string | null>(null);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["section-summary", section.id],
    queryFn: () => scoringApi.getSectionSummary(section.id),
  });

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  const hasSummary = (summary?.rankings?.length ?? 0) > 0;

  // Group rankings by reachedRound, preserving finalPlacement order.
  // Rendered as sequential segments (Finále → Semifinále → Čtvrtfinále → Základní kolo),
  // each with its own header. "—" semantics differ per segment (placement vs crosses),
  // so we label the Součet column accordingly.
  const ROUND_ORDER: Record<string, number> = {
    FINAL: 0,
    SINGLE_ROUND: 0,
    SEMIFINAL: 1,
    QUARTER_FINAL: 2,
    PRELIMINARY: 3,
  };
  const ROUND_LABEL: Record<string, string> = {
    FINAL: t("results.roundFinal"),
    SINGLE_ROUND: t("results.roundFinal"),
    SEMIFINAL: t("results.roundSemifinal"),
    QUARTER_FINAL: t("results.roundQuarterFinal"),
    PRELIMINARY: t("results.sectionPrelim"),
  };
  const isPlacementRound = (r: string) =>
    r === "FINAL" || r === "SINGLE_ROUND";

  type Ranking = NonNullable<typeof summary>["rankings"][number];
  type RankingWithPlace = Ranking & { placeLabel: string; placeRank: number };
  // Skating System Rule 7: in a final round, each couple gets their specific finalPlacement
  // from the backend (tie-resolved). Range notation ("3.-5.") is only valid in preliminary rounds.
  const assignTiedPlaces = (rows: Ranking[], offset: number, isFinal: boolean): RankingWithPlace[] => {
    if (isFinal) {
      return rows.map(row => ({
        ...row,
        placeLabel: `${row.finalPlacement}.`,
        placeRank: row.finalPlacement,
      }));
    }
    // Non-final: group by totalSum → range notation ("3.-5.") is correct for prelims
    const out: RankingWithPlace[] = [];
    let i = 0;
    while (i < rows.length) {
      let j = i + 1;
      if (rows[i].totalSum > 0) {
        while (j < rows.length && rows[j].totalSum === rows[i].totalSum) j++;
      }
      const startRank = offset + i + 1;
      const endRank = offset + j;
      const label = j - i === 1 ? `${startRank}.` : `${startRank}.-${endRank}.`;
      for (let k = i; k < j; k++) {
        out.push({ ...rows[k], placeLabel: label, placeRank: startRank });
      }
      i = j;
    }
    return out;
  };
  const segments: { round: string; rows: RankingWithPlace[] }[] = [];
  if (hasSummary) {
    const sorted = [...summary!.rankings].sort((a, b) => {
      const ra = ROUND_ORDER[a.reachedRound ?? "PRELIMINARY"] ?? 99;
      const rb = ROUND_ORDER[b.reachedRound ?? "PRELIMINARY"] ?? 99;
      if (ra !== rb) return ra - rb;
      return a.finalPlacement - b.finalPlacement;
    });
    const rawSegments: { round: string; rows: Ranking[] }[] = [];
    for (const row of sorted) {
      const key = row.reachedRound ?? "PRELIMINARY";
      const last = rawSegments[rawSegments.length - 1];
      if (!last || last.round !== key) {
        rawSegments.push({ round: key, rows: [row] });
      } else {
        last.rows.push(row);
      }
    }
    let offset = 0;
    for (const s of rawSegments) {
      segments.push({ round: s.round, rows: assignTiedPlaces(s.rows, offset, isPlacementRound(s.round)) });
      offset += s.rows.length;
    }
  }

  return (
    <div className="space-y-3">
      {/* Summary table — segmented by reached round */}
      {hasSummary && (
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border)]">
          <Table>
            <TableBody>
              {segments.map((segment) => {
                const danceNames = Object.keys(segment.rows[0]?.perDance ?? {});
                const placement = isPlacementRound(segment.round);
                return (
                  <Fragment key={segment.round}>
                    {/* Segment header row */}
                    <TableRow className="bg-[var(--surface-secondary)]">
                      <TableCell colSpan={4 + danceNames.length} className="py-2">
                        <div className="flex items-baseline gap-3">
                          <span className="text-sm font-semibold text-[var(--text-primary)]">
                            {ROUND_LABEL[segment.round] ?? segment.round}
                          </span>
                          <span className="text-xs text-[var(--text-tertiary)]">
                            {placement
                              ? t("results.segmentPlacementHint")
                              : t("results.segmentCallbackHint")}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                    {/* Column headers per segment (semantics differ) */}
                    <TableRow>
                      <TableHead className="w-12 text-center">{t("results.place")}</TableHead>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>{t("results.dancers")}</TableHead>
                      <TableHead className="w-16 text-center">
                        {placement ? t("results.sum") : t("results.crossesTotal")}
                      </TableHead>
                      {danceNames.map((d) => (
                        <TableHead key={d} className="w-14 text-center text-xs">{d}</TableHead>
                      ))}
                    </TableRow>
                    {segment.rows.map((row) => (
                      <TableRow
                        key={row.pairId}
                        onClick={() => setDetailPairId(row.pairId)}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-[var(--surface-secondary)]",
                          placement && row.placeRank <= 3 && "bg-yellow-50/30",
                        )}
                      >
                        <TableCell className="text-center">
                          <span className="flex items-center justify-center gap-1">
                            {placement && <PlacementIcon placement={row.placeRank} />}
                            <span className={cn(
                              "font-bold",
                              placement && row.placeRank === 1 && "text-yellow-600",
                              placement && row.placeRank === 2 && "text-slate-500",
                              placement && row.placeRank === 3 && "text-amber-700",
                            )}>
                              {row.placeLabel}
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
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* All rounds — always shown */}
      <RoundFallbackView competitionId={competitionId} sectionId={section.id} />

      <PairDetailModal
        open={detailPairId !== null}
        sectionId={section.id}
        pairId={detailPairId}
        onClose={() => setDetailPairId(null)}
        useThemeVars
      />
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
