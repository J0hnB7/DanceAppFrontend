"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { competitionsApi } from "@/lib/api/competitions";
import { scheduleApi, type ScheduleSlot } from "@/lib/api/schedule";
import { liveApi, type JudgeStatusDto } from "@/lib/api/live";
import { judgeTokensApi } from "@/lib/api/judge-tokens";
import { useSSE } from "@/hooks/use-sse";
import apiClient from "@/lib/api-client";
import { useScheduleStore } from "@/store/schedule-store";
import { useLiveStore } from "@/store/live-store";
import { LiveControlDashboard } from "@/components/live/LiveControlDashboard";
import type { RoundItem } from "@/components/live/RoundSelector";
import type { DanceItem } from "@/components/live/DanceSelector";
import type { HeatItem } from "@/components/live/HeatSelector";

// ── Dance lists by discipline ─────────────────────────────────────────────────
const STANDARD_5: string[] = ["Waltz", "Tango", "Vídeňský valčík", "Slowfoxtrot", "Quickstep"];
const LATIN_5: string[] = ["Samba", "Cha-Cha-Cha", "Rumba", "Paso Doble", "Jive"];

function getDanceNames(label: string): string[] {
  const l = label.toLowerCase();
  if (l.includes("latin")) return LATIN_5;
  if (l.includes("standard") || l.includes("ten dance")) return STANDARD_5;
  if (l.includes("waltz") || l.includes("tango") || l.includes("foxtrot") || l.includes("quickstep")) return STANDARD_5;
  if (l.includes("samba") || l.includes("cha") || l.includes("rumba") || l.includes("jive")) return LATIN_5;
  return STANDARD_5;
}

function slotToRound(slot: ScheduleSlot): RoundItem {
  return {
    id: slot.id,
    label: slot.label.replace(/\s*\(\d+\s*párů?\)/i, ""),
    status: slot.liveStatus === "RUNNING" ? "active" : slot.liveStatus === "COMPLETED" ? "done" : "upcoming",
  };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LiveControlPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: competitionId } = use(params);
  const { loadSchedule, slots } = useScheduleStore();
  const selectedRoundId = useLiveStore((s) => s.selectedRoundId);
  const selectedHeatId = useLiveStore((s) => s.selectedHeatId);

  const [dances, setDances] = useState<DanceItem[]>([]);
  const [heats, setHeats] = useState<HeatItem[]>([]);
  const [baseJudges, setBaseJudges] = useState<JudgeStatusDto[]>([]);
  const [judgeDetails, setJudgeDetails] = useState<JudgeStatusDto[]>([]);
  // Real backend round UUID (needed to start round before scoring)
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);
  // Maps synthetic heat IDs (${slotId}-h${heatNumber}) → real backend UUID heat IDs
  const [heatIdMap, setHeatIdMap] = useState<Record<string, string>>({});

  const { data: competition } = useQuery({
    queryKey: ["competition", competitionId],
    queryFn: () => competitionsApi.get(competitionId),
  });

  // Load schedule on mount
  useEffect(() => {
    loadSchedule(competitionId);
  }, [competitionId, loadSchedule]);

  const markJudgeOnline = useCallback((judgeTokenId: string) => {
    setBaseJudges((prev) =>
      prev.map((j) => j.judgeId === judgeTokenId ? { ...j, online: true } : j)
    );
  }, []);

  // Load judges from Porota section on mount
  useEffect(() => {
    judgeTokensApi.list(competitionId)
      .then((tokens) => {
        const mapped: JudgeStatusDto[] = tokens
          .filter((t) => t.active !== false)
          .sort((a, b) => (a.judgeNumber ?? 99) - (b.judgeNumber ?? 99))
          .map((t, i) => ({
            judgeId: t.id,
            letter: String.fromCharCode(65 + i),
            name: t.name ?? `Porotce ${i + 1}`,
            status: "pending" as const,
            online: t.connectedAt != null || t.connected === true,
          }));
        setBaseJudges(mapped);
        setJudgeDetails(mapped);
      })
      .catch(() => {});
  }, [competitionId]);

  // SSE — judge connected (online status)
  useSSE(competitionId, 'judge-connected', (data: { judgeTokenId: string }) => {
    if (data.judgeTokenId) markJudgeOnline(data.judgeTokenId);
  });

  // Poll connectivity every 30s — refreshes online/offline based on heartbeats
  useEffect(() => {
    if (!competitionId) return;
    const refresh = () =>
      apiClient.get<{ judges: Array<{ judgeTokenId: string; status: string }> }>(
        `/competitions/${competitionId}/connectivity`
      ).then((res) => {
        setBaseJudges((prev) =>
          prev.map((j) => {
            const conn = res.data.judges?.find((c) => c.judgeTokenId === j.judgeId);
            if (!conn) return j;
            return { ...j, online: conn.status === 'ONLINE' };
          })
        );
      }).catch(() => {});
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [competitionId]);

  // When heat changes: overlay statuses from heat endpoint (use real UUID)
  useEffect(() => {
    if (!selectedHeatId || baseJudges.length === 0) {
      setJudgeDetails(baseJudges);
      return;
    }
    const realHeatId = heatIdMap[selectedHeatId];
    if (!realHeatId) {
      setJudgeDetails(baseJudges);
      return;
    }
    liveApi.getJudgeStatuses(realHeatId)
      .then((heatStatuses) => {
        setJudgeDetails(
          baseJudges.map((judge) => {
            const hs = heatStatuses.find((s) => s.judgeId === judge.judgeId);
            return hs ? { ...judge, status: hs.status, online: hs.online, submittedAt: hs.submittedAt } : judge;
          })
        );
      })
      .catch(() => setJudgeDetails(baseJudges));
  }, [selectedHeatId, heatIdMap, baseJudges]);

  // When round selected → derive dances + fetch heat assignments + find real roundId
  useEffect(() => {
    if (!selectedRoundId || slots.length === 0) {
      setDances([]);
      setHeats([]);
      setActiveRoundId(null);
      return;
    }
    const slot = slots.find((s) => s.id === selectedRoundId);
    if (!slot) return;

    const names = getDanceNames(slot.label);
    setDances(names.map((name, i) => ({ id: `${selectedRoundId}-d${i}`, name })));

    const mapGroups = (groups: { heatNumber: number; pairs: { startNumber: number }[] }[]) =>
      groups.map((g) => ({
        id: `${selectedRoundId}-h${g.heatNumber}`,
        number: g.heatNumber,
        pairNumbers: g.pairs.map((p) => p.startNumber),
        status: "pending" as const,
      }));

    scheduleApi
      .getHeatAssignments(competitionId, selectedRoundId)
      .then(async (groups) => {
        if (groups.length > 0) {
          setHeats(mapGroups(groups));
        } else {
          const drawn = await scheduleApi.drawHeats(competitionId, selectedRoundId);
          setHeats(mapGroups(drawn));
        }
      })
      .catch(() => setHeats([]));

    // Fetch the real backend Round entity UUID for this slot
    if (slot.sectionId && slot.roundNumber) {
      apiClient
        .get<{ id: string; roundNumber: number; status: string }[]>(
          `/competitions/${competitionId}/sections/${slot.sectionId}/rounds`
        )
        .then((res) => {
          const match = res.data.find((r) => r.roundNumber === slot.roundNumber);
          setActiveRoundId(match?.id ?? null);
        })
        .catch(() => setActiveRoundId(null));
    }
  }, [selectedRoundId, slots, competitionId]);

  // When activeRoundId resolves, fetch real heat UUIDs and build synthetic→real map
  useEffect(() => {
    if (!activeRoundId || !selectedRoundId) {
      setHeatIdMap({});
      return;
    }
    apiClient
      .get<{ id: string; heatNumber: number; status: string }[]>(`/rounds/${activeRoundId}/heats`)
      .then((res) => {
        const map: Record<string, string> = {};
        res.data.forEach((h) => {
          const syntheticId = `${selectedRoundId}-h${h.heatNumber}`;
          map[syntheticId] = h.id;
        });
        setHeatIdMap(map);
      })
      .catch(() => setHeatIdMap({}));
  }, [activeRoundId, selectedRoundId]);

  const rounds: RoundItem[] = slots.filter((s) => s.type === "ROUND").map(slotToRound);
  const totalPairs = competition?.registeredPairsCount ?? 0;

  return (
    <LiveControlDashboard
      competitionId={competitionId}
      competitionName={competition?.name ?? "—"}
      rounds={rounds}
      dances={dances}
      heats={heats}
      judgeDetails={judgeDetails}
      activeRoundId={activeRoundId}
      totalPairs={totalPairs}
      heatIdMap={heatIdMap}
    />
  );
}
