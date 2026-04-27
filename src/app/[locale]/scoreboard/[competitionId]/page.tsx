"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebouncedCallback } from "use-debounce";
import { Maximize2, Minimize2, Trophy, RefreshCw, Filter, AlertTriangle } from "lucide-react";
import { useSSE } from "@/hooks/use-sse";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { sectionsApi } from "@/lib/api/sections";
import { scoringApi } from "@/lib/api/scoring";
import { useLocale } from "@/contexts/locale-context";

interface LiveResultRow {
  startNumber: number;
  dancer1Name: string;
  dancer2Name?: string;
  placement: number;
  sectionName: string;
  danceName?: string;
  totalSum?: number;
}

interface ScoreboardEvent {
  type: "RESULT_UPDATED" | "ROUND_STATUS" | "COMPETITION_STATUS";
  payload: {
    results?: LiveResultRow[];
    roundType?: string;
    status?: string;
  };
}

// Fetch final summary results for a section and map to LeaderboardRow
async function fetchSectionResults(competitionId: string, sectionId: string, sectionName: string): Promise<LiveResultRow[]> {
  try {
    const summary = await scoringApi.getSectionSummary(sectionId);
    return summary.rankings.map((r) => ({
      startNumber: r.startNumber,
      dancer1Name: `Pair #${r.startNumber}`,
      placement: r.finalPlacement,
      sectionName,
      totalSum: r.totalSum,
    }));
  } catch {
    return [];
  }
}

export default function ScoreboardPage({
  params,
}: {
  params: Promise<{ competitionId: string }>;
}) {
  const { competitionId } = use(params);
  const { t } = useLocale();
  const [sseResults, setSseResults] = useState<LiveResultRow[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [sectionResults, setSectionResults] = useState<LiveResultRow[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  // Load sections for filtering
  const { data: sections, isError: sectionsError } = useQuery({
    queryKey: ["sections", competitionId, "list"],
    queryFn: () => sectionsApi.list(competitionId),
    retry: 2,
  });

  const loadSectionResults = useCallback(async () => {
    if (!sections) return;
    const completedSections = sections.filter((s) => s.status === "COMPLETED");
    if (completedSections.length === 0) return;
    setLoadingResults(true);
    try {
      const allResults = await Promise.all(
        completedSections.map((s) => fetchSectionResults(competitionId, s.id, s.name))
      );
      setSectionResults(allResults.flat());
      setLastUpdate(new Date());
    } finally {
      setLoadingResults(false);
    }
  }, [sections, competitionId]);

  // Debounced version for SSE-triggered reloads (reconnect storms)
  const debouncedLoad = useDebouncedCallback(loadSectionResults, 500);

  // Load results for completed sections
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadSectionResults(); }, [loadSectionResults]);

  useSSE<ScoreboardEvent>(competitionId, "RESULT_UPDATED", (data) => {
    if (data.payload.results) {
      setSseResults(data.payload.results);
      setLastUpdate(new Date());
    } else {
      debouncedLoad();
    }
  });

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Prefer SSE results if available, otherwise use API-fetched
  const allResults = sseResults.length > 0 ? sseResults : sectionResults;

  // Filter by section
  const displayResults =
    selectedSection === "all"
      ? allResults
      : allResults.filter((r) => {
          const section = sections?.find((s) => s.name === r.sectionName);
          return section?.id === selectedSection;
        });

  // Section tabs
  const sectionOptions = [
    { id: "all", name: t("scoreboard.allSections") },
    ...(sections?.filter((s) => s.status === "COMPLETED").map((s) => ({ id: s.id, name: s.name })) ?? []),
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-3">
          <Trophy className="h-6 w-6 text-[#ffd60a]" />
          <h1 className="text-lg font-bold tracking-wide">{t("scoreboard.liveResults")}</h1>
          <div className="ml-2 flex h-2.5 w-2.5 animate-pulse rounded-full bg-[#30d158]" />
        </div>
        <div className="flex items-center gap-4">
          {lastUpdate && (
            <p className="text-xs text-white/40">
              {t("scoreboard.updatedAt", { time: lastUpdate.toLocaleTimeString("sk-SK") })}
            </p>
          )}
          {loadingResults && (
            <RefreshCw className="h-4 w-4 animate-spin text-white/40" />
          )}
          <button
            onClick={toggleFullscreen}
            className="rounded p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Section filter */}
      {sectionOptions.length > 2 && (
        <div className="flex items-center gap-2 overflow-x-auto border-b border-white/10 px-6 py-3">
          <Filter className="h-3.5 w-3.5 shrink-0 text-white/40" />
          {sectionOptions.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSection(s.id)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                selectedSection === s.id
                  ? "bg-[#ffd60a] text-black"
                  : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      <div className="p-6">
        {sectionsError ? (
          <div className="flex flex-col items-center gap-6 py-32 text-center">
            <AlertTriangle className="h-16 w-16 text-red-500/40" />
            <p className="text-xl font-semibold text-white/40">{t("scoreboard.loadError")}</p>
            <p className="text-sm text-white/20">{t("scoreboard.loadErrorBody")}</p>
          </div>
        ) : displayResults.length === 0 ? (
          <div className="flex flex-col items-center gap-6 py-32 text-center">
            <Trophy className="h-20 w-20 text-white/10" />
            <p className="text-xl font-semibold text-white/40">
              {loadingResults ? t("scoreboard.loadingResults") : t("scoreboard.waitingForResults")}
            </p>
            {!loadingResults && (
              <p className="text-sm text-white/20">
                {t("scoreboard.resultsWillAppear")}
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-6 py-4 text-left text-xs font-semibold tracking-widest text-white/40 uppercase">
                    {t("scoreboard.place")}
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold tracking-widest text-white/40 uppercase">
                    {t("scoreboard.number")}
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold tracking-widest text-white/40 uppercase">
                    {t("scoreboard.pair")}
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold tracking-widest text-white/40 uppercase">
                    {t("scoreboard.section")}
                  </th>
                  {displayResults.some((r) => r.totalSum !== undefined) && (
                    <th className="px-4 py-4 text-right text-xs font-semibold tracking-widest text-white/40 uppercase">
                      {t("scoreboard.score")}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {displayResults
                  .sort((a, b) => a.placement - b.placement)
                  .map((row, i) => (
                    <tr
                      key={`${row.startNumber}-${row.sectionName}-${i}`}
                      className={cn(
                        "border-b border-white/5 transition-colors",
                        i % 2 === 0 ? "bg-transparent" : "bg-white/[0.02]",
                        row.placement <= 3 && "bg-[#ffd60a]/5"
                      )}
                    >
                      <td className="px-6 py-5">
                        <span
                          className={cn(
                            "text-3xl font-black",
                            row.placement === 1
                              ? "text-[#ffd60a]"
                              : row.placement === 2
                              ? "text-slate-300"
                              : row.placement === 3
                              ? "text-amber-700"
                              : "text-white/60"
                          )}
                        >
                          {row.placement}
                        </span>
                      </td>
                      <td className="px-4 py-5">
                        <span className="rounded-lg bg-white/10 px-3 py-1.5 text-lg font-bold">
                          {String(row.startNumber).padStart(3, "0")}
                        </span>
                      </td>
                      <td className="px-4 py-5">
                        <p className="text-xl font-semibold">{row.dancer1Name}</p>
                        {row.dancer2Name && (
                          <p className="text-sm text-white/40">{row.dancer2Name}</p>
                        )}
                      </td>
                      <td className="px-4 py-5 text-sm text-white/50">{row.sectionName}</td>
                      {displayResults.some((r) => r.totalSum !== undefined) && (
                        <td className="px-4 py-5 text-right">
                          {row.totalSum !== undefined && (
                            <span className="text-sm font-mono text-white/60">{row.totalSum}</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
