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
  const selectedDanceId = useLiveStore((s) => s.selectedDanceId);
  const selectedHeatId = useLiveStore((s) => s.selectedHeatId);

  const [dances, setDances] = useState<DanceItem[]>([]);
  const [heats, setHeats] = useState<HeatItem[]>([]);
  // Per-heat submission counts — fetched when dance changes
  const [heatSubmissions, setHeatSubmissions] = useState<Record<string, { submitted: number; total: number }>>({});
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

  const { updateJudgeOnline, setDanceConfirmation, setRoundClosed, selectDance, selectHeat } = useLiveStore();
  // sectionId from the selected slot — needed for round close/complete API
  const [sectionId, setSectionId] = useState<string | null>(null);

  const markJudgeOnline = useCallback((judgeTokenId: string) => {
    setBaseJudges((prev) =>
      prev.map((j) => j.judgeId === judgeTokenId ? { ...j, online: true } : j)
    );
    updateJudgeOnline(judgeTokenId, true);
  }, [updateJudgeOnline]);

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
            online: false, // default offline — real status comes from connectivity poll + SSE
          }));
        setBaseJudges(mapped);
        setJudgeDetails(mapped);

        // Immediately fetch real connectivity status
        apiClient.get<{ judges: Array<{ judgeTokenId: string; status: string }> }>(
          `/competitions/${competitionId}/connectivity`
        ).then((res) => {
          setBaseJudges((prev) =>
            prev.map((j) => {
              const conn = res.data.judges?.find((c) => c.judgeTokenId === j.judgeId);
              if (!conn) return j;
              const isOnline = conn.status === 'ONLINE';
              updateJudgeOnline(j.judgeId, isOnline);
              return { ...j, online: isOnline };
            })
          );
        }).catch(() => {});
      })
      .catch(() => {});
  }, [competitionId]);

  // SSE — judge connected (online status)
  useSSE(competitionId, 'judge-connected', (data: { judgeTokenId: string }) => {
    if (data.judgeTokenId) markJudgeOnline(data.judgeTokenId);
  });

  // SSE — judge disconnected (offline status)
  useSSE(competitionId, 'judge-disconnected', (data: { judgeTokenId: string }) => {
    if (data.judgeTokenId) {
      setBaseJudges((prev) =>
        prev.map((j) => j.judgeId === data.judgeTokenId ? { ...j, online: false } : j)
      );
      updateJudgeOnline(data.judgeTokenId, false);
    }
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
            const isOnline = conn.status === 'ONLINE';
            updateJudgeOnline(j.judgeId, isOnline);
            return { ...j, online: isOnline };
          })
        );
      }).catch(() => {});
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [competitionId, updateJudgeOnline]);

  // When heat or dance changes: overlay statuses from heat endpoint (use real UUID)
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
    const danceName = dances.find((d) => d.id === selectedDanceId)?.name;
    liveApi.getJudgeStatuses(realHeatId, danceName, competitionId)
      .then((heatStatuses) => {
        setJudgeDetails(
          baseJudges.map((judge) => {
            const hs = heatStatuses.find((s) => s.judgeId === judge.judgeId);
            return hs ? { ...judge, status: hs.status, online: hs.online, submittedAt: hs.submittedAt } : judge;
          })
        );
      })
      .catch(() => setJudgeDetails(baseJudges));
  }, [selectedHeatId, selectedDanceId, dances, heatIdMap, baseJudges]);

  // Fetch dance-level submission counts — judge confirms once per dance (roundId:dance),
  // so all heats in the same dance share the same submission status.
  // Only need to query ONE heat — the result applies to all heats in the dance.
  useEffect(() => {
    if (heats.length === 0 || Object.keys(heatIdMap).length === 0) {
      setHeatSubmissions({});
      return;
    }
    const danceName = dances.find((d) => d.id === selectedDanceId)?.name;
    const firstRealId = heatIdMap[heats[0].id];
    if (!firstRealId) return;
    liveApi.getJudgeStatuses(firstRealId, danceName, competitionId).then((statuses) => {
      const submitted = statuses.filter((j) => j.status === 'submitted').length;
      const total = statuses.length;
      // Apply same counts to ALL heats — submission is per-dance, not per-group
      const map: Record<string, { submitted: number; total: number }> = {};
      for (const h of heats) {
        const realId = heatIdMap[h.id];
        if (realId) map[realId] = { submitted, total };
      }
      setHeatSubmissions(map);
    }).catch(() => {});
  }, [heats, heatIdMap, selectedDanceId, dances]);

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

    // Fetch real dances from backend section; fall back to hardcoded if fetch fails
    if (slot.sectionId) {
      apiClient
        .get<{ dances?: Array<{ id: string; danceName: string; danceOrder: number }> }>(
          `/competitions/${competitionId}/sections/${slot.sectionId}`
        )
        .then((res) => {
          const sectionDances = res.data.dances;
          if (sectionDances && sectionDances.length > 0) {
            const sorted = [...sectionDances].sort((a, b) => a.danceOrder - b.danceOrder);
            setDances(sorted.map((d) => ({ id: d.id, name: d.danceName })));
          } else {
            const names = getDanceNames(slot.label);
            setDances(names.map((name, i) => ({ id: `${selectedRoundId}-d${i}`, name })));
          }
        })
        .catch(() => {
          const names = getDanceNames(slot.label);
          setDances(names.map((name, i) => ({ id: `${selectedRoundId}-d${i}`, name })));
        });
    } else {
      const names = getDanceNames(slot.label);
      setDances(names.map((name, i) => ({ id: `${selectedRoundId}-d${i}`, name })));
    }

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

    // Store sectionId for round close/complete API
    setSectionId(slot.sectionId ?? null);

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

  // Fetch per-dance confirmation status for ALL dances in the round.
  // This determines whether the "Close round" button is enabled.
  useEffect(() => {
    if (dances.length === 0 || heats.length === 0 || Object.keys(heatIdMap).length === 0) return;
    const firstRealHeatId = heatIdMap[heats[0].id];
    if (!firstRealHeatId) return;

    for (const dance of dances) {
      liveApi.getJudgeStatuses(firstRealHeatId, dance.name, competitionId).then((statuses) => {
        const submitted = statuses.filter((j) => j.status === 'submitted').length;
        const total = statuses.length;
        setDanceConfirmation(dance.id, submitted, total);
      }).catch(() => {});
    }
  }, [dances, heats, heatIdMap, competitionId, setDanceConfirmation]);

  // Auto-advance: when current dance has all judges confirmed, switch to next unconfirmed dance + first heat
  const danceConfirmations = useLiveStore((s) => s.danceConfirmations);
  useEffect(() => {
    if (!selectedDanceId || dances.length === 0) return;
    const currentConf = danceConfirmations[selectedDanceId];
    if (!currentConf || currentConf.total === 0 || currentConf.submitted < currentConf.total) return;
    // Current dance is fully confirmed — find next unconfirmed dance
    const currentIdx = dances.findIndex((d) => d.id === selectedDanceId);
    for (let i = currentIdx + 1; i < dances.length; i++) {
      const conf = danceConfirmations[dances[i].id];
      if (!conf || conf.total === 0 || conf.submitted < conf.total) {
        selectDance(dances[i].id);
        // Auto-select first heat
        if (heats.length > 0) {
          setTimeout(() => selectHeat(heats[0].id), 100);
        }
        return;
      }
    }
    // All dances confirmed — don't auto-advance, stay on current
  }, [danceConfirmations, selectedDanceId, dances, heats, selectDance, selectHeat]);

  // Check if current round is already closed/calculated
  useEffect(() => {
    if (!activeRoundId) { setRoundClosed(false); return; }
    apiClient.get<{ id: string; status: string }>(`/rounds/${activeRoundId}`)
      .then((res) => {
        setRoundClosed(res.data.status === 'CLOSED' || res.data.status === 'CALCULATED' || res.data.status === 'COMPLETED');
      })
      .catch(() => setRoundClosed(false));
  }, [activeRoundId, setRoundClosed]);

  const rounds: RoundItem[] = slots.filter((s) => s.type === "ROUND").map(slotToRound);
  const totalPairs = competition?.registeredPairsCount ?? 0;
  const selectedDanceName = dances.find((d) => d.id === selectedDanceId)?.name ?? null;

  // Enrich heats with per-heat submission counts (X marks are per-dance, so status is per heat+dance)
  const enrichedHeats: HeatItem[] = heats.map((h) => {
    const realId = heatIdMap[h.id];
    const sub = realId ? heatSubmissions[realId] : undefined;
    return sub ? { ...h, submittedJudges: sub.submitted, totalJudges: sub.total } : h;
  });

  return (
    <LiveControlDashboard
      competitionId={competitionId}
      competitionName={competition?.name ?? ""}
      rounds={rounds}
      dances={dances}
      heats={enrichedHeats}
      judgeDetails={judgeDetails}
      activeRoundId={activeRoundId}
      totalPairs={totalPairs}
      heatIdMap={heatIdMap}
      selectedDanceName={selectedDanceName}
      sectionId={sectionId}
    />
  );
}
