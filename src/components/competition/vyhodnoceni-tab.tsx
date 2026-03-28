"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { scoringApi, type PairFinalResultRow, type RoundResultsResponse } from "@/lib/api/scoring";
import { roundsApi, type RoundDto } from "@/lib/api/rounds";
import { type SectionDto } from "@/lib/api/sections";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { CheckCircle2, Download, Clock, Award, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api-client";

interface PairInfo {
  id: string;
  startNumber: number;
  dancer1FirstName?: string;
  dancer1LastName?: string;
  dancer2FirstName?: string;
  dancer2LastName?: string;
  club?: string;
}

interface Props {
  competitionId: string;
  sections: SectionDto[];
  pairs?: PairInfo[];
}

type ResultView = "vysledky" | string; // "vysledky" | roundId

const ROUND_TYPE_LABEL: Record<string, string> = {
  HEAT: "1. kolo",
  SEMIFINAL: "Semifinále",
  FINAL: "Finále",
  SINGLE_ROUND: "Kolo",
};

function roundLabel(r: { roundType: string; roundNumber: number }): string {
  if (r.roundType === "PRELIMINARY") return `Kolo ${r.roundNumber}`;
  return ROUND_TYPE_LABEL[r.roundType] ?? r.roundType;
}

function pairName(pair: PairInfo) {
  const n1 = [pair.dancer1FirstName, pair.dancer1LastName].filter(Boolean).join(" ");
  const n2 = [pair.dancer2FirstName, pair.dancer2LastName].filter(Boolean).join(" ");
  return n2 ? `${n1} & ${n2}` : n1 || `#${pair.startNumber}`;
}

function lookupPair(pairs: PairInfo[] | undefined, startNumber: number) {
  return pairs?.find((p) => p.startNumber === startNumber);
}

// ── Výsledková listina ─────────────────────────────────────────────────────────
function VysledkovaListina({
  summary,
  rounds,
  pairs,
}: {
  summary: { rankings: PairFinalResultRow[] } | undefined;
  rounds: RoundDto[];
  pairs?: PairInfo[];
}) {
  if (!summary || summary.rankings.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--text-tertiary)]">
        Výsledky nejsou k dispozici.
      </p>
    );
  }

  // Group by which round they eliminated in
  const finalRound = rounds.find((r) => r.roundType === "FINAL" || r.roundType === "SINGLE_ROUND");
  const semifinalRound = rounds.find((r) => r.roundType === "SEMIFINAL");
  const heatRounds = rounds.filter(
    (r) => r.roundType === "HEAT" || r.roundType === "PRELIMINARY"
  );

  const finalCount = finalRound ? (finalRound.pairsToAdvance ?? 0) : 0;
  const semifinalCount = semifinalRound ? (semifinalRound.pairsToAdvance ?? 0) : 0;

  const ranked = [...summary.rankings].sort((a, b) => a.finalPlacement - b.finalPlacement);

  const groups: { label: string; rows: PairFinalResultRow[] }[] = [];
  const finalists = ranked.filter((r) => r.finalPlacement <= (finalCount || ranked.length));
  const semiFinalists = ranked.filter(
    (r) => r.finalPlacement > (finalCount || 0) && r.finalPlacement <= (finalCount + semifinalCount || ranked.length)
  );
  const heatOnly = ranked.filter((r) => r.finalPlacement > (finalCount + semifinalCount || 0));

  if (finalists.length) groups.push({ label: "Finále", rows: finalists });
  if (semiFinalists.length) groups.push({ label: "Semifinále", rows: semiFinalists });
  if (heatRounds.length && heatOnly.length) groups.push({ label: "1. kolo", rows: heatOnly });
  if (!groups.length) groups.push({ label: "", rows: ranked });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <tbody>
          {groups.map((group) => (
            <>
              {group.label && (
                <tr key={`header-${group.label}`}>
                  <td
                    colSpan={4}
                    className="pt-4 pb-1 text-xs font-semibold text-[var(--accent)]"
                  >
                    {group.label}
                  </td>
                </tr>
              )}
              {group.rows.map((row) => {
                const pair = lookupPair(pairs, row.startNumber);
                return (
                  <tr
                    key={row.pairId}
                    className="border-b border-[var(--border)] hover:bg-[var(--surface-secondary)]"
                  >
                    <td className="py-2 pr-3 text-right font-medium text-[var(--text-secondary)] w-8">
                      {row.finalPlacement}.
                    </td>
                    <td className="py-2 pr-3 w-12 font-bold text-[var(--text-primary)]">
                      {row.startNumber}
                    </td>
                    <td className="py-2 pr-4 text-[var(--text-primary)]">
                      {pair ? pairName(pair) : `Pár #${row.startNumber}`}
                    </td>
                    <td className="py-2 text-sm text-[var(--text-secondary)]">
                      {pair?.club ?? ""}
                    </td>
                  </tr>
                );
              })}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface JudgeMark {
  letter: string;
  voted: boolean;
}

interface PrelimPair {
  pairId: string;
  startNumber: number;
  dancer1Name: string;
  voteCount: number;
  advances: boolean;
  judgeMarks?: JudgeMark[];
}

// ── Preliminary round (Skating callback format) ────────────────────────────────
function PreliminaryRoundView({
  roundId,
  pairs,
}: {
  roundId: string;
  pairs?: PairInfo[];
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["round-preliminary", roundId],
    queryFn: () =>
      fetch(`/api/v1/rounds/${roundId}/preliminary`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
  });

  if (isLoading) return <div className="py-8 flex justify-center"><Spinner /></div>;
  if (!data?.pairs?.length) return (
    <p className="py-8 text-center text-sm text-[var(--text-tertiary)]">Výsledky nejsou k dispozici.</p>
  );

  const sorted = [...(data.pairs as PrelimPair[])].sort((a, b) => a.startNumber - b.startNumber);

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((p) => {
        const pair = lookupPair(pairs, p.startNumber);
        const totalJudges = p.judgeMarks?.length ?? 0;
        return (
          <div
            key={p.pairId}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-4 py-3",
              p.advances
                ? "border-[var(--success)]/30 bg-[var(--success)]/5"
                : "border-[var(--border)] bg-[var(--surface)]"
            )}
          >
            {/* Start number */}
            <span
              className="w-10 shrink-0 text-sm font-bold tabular-nums"
              style={{ fontFamily: "var(--font-sora)", color: "var(--text-primary)" }}
            >
              {p.startNumber}
            </span>

            {/* Pair name */}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {pair ? pairName(pair) : p.dancer1Name}
              </div>
              {pair?.club && (
                <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>{pair.club}</div>
              )}
            </div>

            {/* Judge chips */}
            {p.judgeMarks && (
              <div className="flex gap-1">
                {p.judgeMarks.map((m) => (
                  <span
                    key={m.letter}
                    className="font-mono text-xs font-bold"
                    style={{ color: m.voted ? "var(--success)" : "var(--text-tertiary)" }}
                    title={`Porotce ${m.letter}: ${m.voted ? "hlasoval ✓" : "nehlasoval ✗"}`}
                  >
                    {m.letter}{m.voted ? "✓" : "✗"}
                  </span>
                ))}
              </div>
            )}

            {/* Vote count */}
            <span
              className="shrink-0 text-sm font-bold tabular-nums"
              style={{ fontFamily: "var(--font-sora)", color: "var(--text-primary)" }}
            >
              {p.voteCount}{totalJudges > 0 ? `/${totalJudges}` : ""}
            </span>

            {/* Result badge */}
            <span
              className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold"
              style={{
                background: p.advances ? "rgba(48,209,88,.12)" : "rgba(255,59,48,.1)",
                color: p.advances ? "var(--success)" : "var(--destructive)",
              }}
            >
              {p.advances ? "POSTUPUJE" : "VYŘAZEN"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Final round (placement table) ─────────────────────────────────────────────
function FinalRoundView({
  results,
  pairs,
}: {
  results: RoundResultsResponse;
  pairs?: PairInfo[];
}) {
  if (!results.dances?.length) return (
    <p className="py-8 text-center text-sm text-[var(--text-tertiary)]">Výsledky nejsou k dispozici.</p>
  );

  // All unique pairs sorted by start number
  const allPairs = Array.from(
    new Map(
      results.dances.flatMap((d) => d.rankings).map((r) => [r.startNumber, r])
    ).values()
  ).sort((a, b) => a.startNumber - b.startNumber);

  // Build placement map: startNumber → danceId → placement
  const placementMap = new Map<number, Map<string, number>>();
  for (const dance of results.dances) {
    for (const r of dance.rankings) {
      if (!placementMap.has(r.startNumber)) placementMap.set(r.startNumber, new Map());
      placementMap.get(r.startNumber)!.set(dance.danceId, r.placement);
    }
  }

  // Final placement = min placement across dances (or use skating sum)
  const finalPlacements = allPairs.map((p) => {
    const dancePlacements = results.dances.map((d) => placementMap.get(p.startNumber)?.get(d.danceId) ?? 0);
    const sum = dancePlacements.reduce((a, b) => a + b, 0);
    return { ...p, sum, dancePlacements };
  }).sort((a, b) => a.sum - b.sum);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="py-2 pr-2 text-left text-xs font-medium text-[var(--text-tertiary)] w-8"></th>
            <th className="py-2 pr-2 text-left text-xs font-medium text-[var(--text-tertiary)] w-10">#</th>
            <th className="py-2 pr-4 text-left text-xs font-medium text-[var(--text-tertiary)]">Tančící</th>
            {results.dances.map((d) => (
              <th key={d.danceId} className="py-2 px-2 text-center text-xs font-medium text-[var(--text-tertiary)] min-w-[70px]">
                {d.danceName}
              </th>
            ))}
            <th className="py-2 pl-3 text-center text-xs font-medium text-[var(--text-tertiary)] w-16">Součet</th>
          </tr>
        </thead>
        <tbody>
          {finalPlacements.map((p, idx) => {
            const pair = lookupPair(pairs, p.startNumber);
            return (
              <tr
                key={p.pairId ?? p.startNumber}
                className={cn(
                  "border-b border-[var(--border)]",
                  idx < 3 && "bg-[var(--accent)]/5"
                )}
              >
                <td className="py-2 pr-2 text-right text-[var(--text-secondary)] font-medium">{idx + 1}.</td>
                <td className="py-2 pr-2 font-bold text-[var(--text-primary)]">{p.startNumber}</td>
                <td className="py-2 pr-4 text-[var(--text-primary)]">
                  <div>{pair ? pairName(pair) : p.dancer1Name}</div>
                  {pair?.club && <div className="text-xs text-[var(--text-tertiary)]">{pair.club}</div>}
                </td>
                {p.dancePlacements.map((pl, i) => (
                  <td key={i} className="py-2 px-2 text-center font-mono text-[var(--text-primary)]">
                    {pl || "—"}
                  </td>
                ))}
                <td className="py-2 pl-3 text-center font-bold text-[var(--text-primary)]">{p.sum}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Round results fetcher ──────────────────────────────────────────────────────
function RoundResults({ round, pairs }: { round: RoundDto; pairs?: PairInfo[] }) {
  const isFinal = round.roundType === "FINAL" || round.roundType === "SINGLE_ROUND" || round.roundType === "SEMIFINAL";

  const { data, isLoading } = useQuery({
    queryKey: ["round-results", round.id],
    queryFn: () => roundsApi.getResults(round.id) as Promise<RoundResultsResponse>,
    enabled: isFinal,
  });

  if (!isFinal) return <PreliminaryRoundView roundId={round.id} pairs={pairs} />;
  if (isLoading) return <div className="py-8 flex justify-center"><Spinner /></div>;
  if (!data) return <p className="py-8 text-center text-sm text-[var(--text-tertiary)]">Výsledky nejsou k dispozici.</p>;

  return <FinalRoundView results={data} pairs={pairs} />;
}

// ── Section results ────────────────────────────────────────────────────────────
function SectionResults({
  section,
  competitionId,
  pairs,
}: {
  section: SectionDto;
  competitionId: string;
  pairs?: PairInfo[];
}) {
  const [view, setView] = useState<ResultView>("vysledky");
  const queryClient = useQueryClient();

  const { data: rounds = [], isLoading: roundsLoading } = useQuery({
    queryKey: ["rounds", competitionId, section.id],
    queryFn: () => roundsApi.list(competitionId, section.id),
  });

  const approveRoundMutation = useMutation({
    mutationFn: (roundId: string) => roundsApi.close(roundId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rounds", competitionId, section.id] }),
  });

  const VISIBLE_STATUSES = new Set(["COMPLETED", "CALCULATED", "IN_PROGRESS", "OPEN", "CLOSED"]);
  const visibleRounds = rounds
    .filter((r) => VISIBLE_STATUSES.has(r.status))
    .sort((a, b) => {
      const order = ["HEAT", "PRELIMINARY", "SEMIFINAL", "FINAL", "SINGLE_ROUND"];
      return order.indexOf(a.roundType) - order.indexOf(b.roundType);
    });
  const completedRounds = visibleRounds;

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["section-summary", section.id],
    queryFn: () => scoringApi.getSectionSummary(section.id),
    enabled: view === "vysledky",
  });

  if (roundsLoading) return <div className="py-8 flex justify-center"><Spinner /></div>;

  if (!visibleRounds.length && !summary?.rankings?.length) {
    return (
      <p className="py-12 text-center text-sm text-[var(--text-tertiary)]">
        Zatím nebyla zahájena žádná kola.
      </p>
    );
  }

  const IN_PROGRESS_STATUSES = new Set(["IN_PROGRESS", "OPEN", "CLOSED"]);
  const tabs: { id: ResultView; label: string; inProgress: boolean }[] = [
    { id: "vysledky", label: "Výsledková listina", inProgress: false },
    ...completedRounds.map((r) => ({
      id: r.id,
      label: roundLabel(r),
      inProgress: IN_PROGRESS_STATUSES.has(r.status),
    })),
  ];

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await apiClient.get(
        `/sections/${section.id}/results/export`,
        { params: { format: "xlsx", withAudit: true }, responseType: "blob" }
      );
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vysledky-${section.name}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      {/* Round tabs + export */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] mb-4">
        <div className="flex gap-1 overflow-x-auto flex-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={cn(
                "px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors flex items-center gap-1.5",
                view === tab.id
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              {tab.inProgress && <Clock className="h-3 w-3 text-[var(--warning)]" />}
              {tab.label}
              {tab.inProgress && (
                <span className="text-[10px] font-bold text-[var(--warning)]">PROBÍHÁ</span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50 shrink-0 mb-1"
          style={{ background: "var(--accent)" }}
        >
          <Download className="h-3.5 w-3.5" />
          {exporting ? "Exportuji…" : "Export XLSX"}
        </button>
      </div>

      {/* Approval button for CALCULATED rounds */}
      {view !== "vysledky" && (() => {
        const round = completedRounds.find((r) => r.id === view);
        if (!round || round.status !== "CALCULATED") return null;
        return (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning)]/5 px-4 py-3">
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Výsledky čekají na schválení
              </p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Po schválení bude kolo uzavřeno a nelze ho znovu otevřít.
              </p>
            </div>
            <button
              onClick={() => approveRoundMutation.mutate(round.id)}
              disabled={approveRoundMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-50"
              style={{ background: "var(--success)" }}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {approveRoundMutation.isPending ? "Schvaluji…" : "Schválit a uzavřít kolo"}
            </button>
          </div>
        );
      })()}

      {/* Content */}
      {view === "vysledky" ? (
        summaryLoading ? (
          <div className="py-8 flex justify-center"><Spinner /></div>
        ) : (
          <VysledkovaListina summary={summary} rounds={completedRounds} pairs={pairs} />
        )
      ) : (
        (() => {
          const round = completedRounds.find((r) => r.id === view);
          return round ? <RoundResults round={round} pairs={pairs} /> : null;
        })()
      )}
    </div>
  );
}

// ── Main tab component ─────────────────────────────────────────────────────────
export function VyhodnoceniTab({ competitionId, sections, pairs }: Props) {
  const [selectedSection, setSelectedSection] = useState<string>(sections[0]?.id ?? "");
  const router = useRouter();

  if (!sections.length) {
    return (
      <p className="py-12 text-center text-sm text-[var(--text-tertiary)]">
        Žádné kategorie k zobrazení.
      </p>
    );
  }

  const section = sections.find((s) => s.id === selectedSection) ?? sections[0];

  return (
    <div className="space-y-4">
      {/* Diplomy banner */}
      <button
        onClick={() => router.push(`/dashboard/competitions/${competitionId}/diplomas`)}
        className="group flex w-full items-center gap-4 rounded-2xl border border-[var(--accent)]/20 bg-gradient-to-r from-[var(--accent)]/10 via-[var(--accent)]/5 to-transparent p-4 transition-all hover:border-[var(--accent)]/40 hover:shadow-lg hover:shadow-[var(--accent)]/10"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] shadow-md shadow-[var(--accent)]/25">
          <Award className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-bold text-[var(--text-primary)]">Diplomy</p>
          <p className="text-xs text-[var(--text-secondary)]">Generování a tisk diplomů pro všechny kategorie</p>
        </div>
        <ChevronRight className="h-5 w-5 text-[var(--text-tertiary)] transition-transform group-hover:translate-x-1" />
      </button>

      {/* Section selector */}
      {sections.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSection(s.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                selectedSection === s.id
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {section && (
        <SectionResults
          key={section.id}
          section={section}
          competitionId={competitionId}
          pairs={pairs}
        />
      )}
    </div>
  );
}
