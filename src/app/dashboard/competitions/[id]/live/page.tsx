"use client";

import { use, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { competitionsApi } from "@/lib/api/competitions";
import { scheduleApi, type ScheduleSlot } from "@/lib/api/schedule";
import { liveApi } from "@/lib/api/live";
import { useScheduleStore } from "@/store/schedule-store";
import { useLiveStore } from "@/store/live-store";
import { useJudgeConnectivity } from "@/hooks/use-judge-connectivity";
import { LiveControlDashboard } from "@/components/live/LiveControlDashboard";
import { AppShell } from "@/components/layout/app-shell";
import { CompetitionSidebar } from "@/components/layout/competition-sidebar";
import type { RoundItem } from "@/components/live/RoundSelector";
import type { DanceItem } from "@/components/live/DanceSelector";
import type { HeatItem } from "@/components/live/HeatSelector";
import apiClient from "@/lib/api-client";

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
  const [heatSubmissions, setHeatSubmissions] = useState<Record<string, { submitted: number; total: number }>>({});
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);
  const [heatIdMap, setHeatIdMap] = useState<Record<string, string>>({});
  const [sectionId, setSectionId] = useState<string | null>(null);

  const { data: competition } = useQuery({
    queryKey: ["competition", competitionId],
    queryFn: () => competitionsApi.get(competitionId),
  });

  // Load schedule on mount
  useEffect(() => { loadSchedule(competitionId); }, [competitionId, loadSchedule]);

  const { setDanceConfirmation, setRoundClosed, selectDance, selectHeat } = useLiveStore();

  // Judge connectivity (load + SSE + 30s poll)
  const { judgeDetails, updateJudgeDetails } = useJudgeConnectivity(competitionId);

  // Overlay judge statuses when heat/dance selection changes
  useEffect(() => {
    updateJudgeDetails(selectedHeatId, selectedDanceId, heatIdMap, dances, competitionId);
  }, [selectedHeatId, selectedDanceId, dances, heatIdMap, updateJudgeDetails, competitionId]);

  // Fetch per-dance heat submission counts
  useEffect(() => {
    if (heats.length === 0 || Object.keys(heatIdMap).length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHeatSubmissions({}); return;
    }
    const danceName = dances.find((d) => d.id === selectedDanceId)?.name;
    const firstRealId = heatIdMap[heats[0].id];
    if (!firstRealId) return;
    liveApi.getJudgeStatuses(firstRealId, danceName, competitionId).then((statuses) => {
      const submitted = statuses.filter((j) => j.status === 'submitted').length;
      const total = statuses.length;
      const map: Record<string, { submitted: number; total: number }> = {};
      for (const h of heats) {
        const realId = heatIdMap[h.id];
        if (realId) map[realId] = { submitted, total };
      }
      setHeatSubmissions(map);
    }).catch(() => {});
  }, [heats, heatIdMap, selectedDanceId, dances, competitionId]);

  // When round selected → derive dances + fetch heat assignments + find real roundId
  useEffect(() => {
    if (!selectedRoundId || slots.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDances([]); setHeats([]); setActiveRoundId(null); return;
    }
    const slot = slots.find((s) => s.id === selectedRoundId);
    if (!slot) return;

    let cancelled = false;

    // Immediately set dances from danceStyle (no API call needed)
    const styleName = slot.danceStyle ?? slot.label;
    setDances(getDanceNames(styleName).map((name, i) => ({ id: `${selectedRoundId}-d${i}`, name })));

    // Then async-upgrade with real dance UUIDs from section (needed for final scoring)
    if (slot.sectionId) {
      apiClient.get<{ dances?: Array<{ id: string; danceName: string; danceOrder: number }> }>(
        `/competitions/${competitionId}/sections/${slot.sectionId}`
      ).then((res) => {
        if (cancelled) return;
        const sectionDances = res.data.dances;
        if (sectionDances && sectionDances.length > 0) {
          setDances([...sectionDances].sort((a, b) => a.danceOrder - b.danceOrder).map((d) => ({ id: d.id, name: d.danceName })));
        }
      }).catch(() => { /* already have dances from sync path */ });
    }

    const mapGroups = (groups: { heatNumber: number; pairs: { startNumber: number }[] }[]) =>
      groups.map((g) => ({
        id: `${selectedRoundId}-h${g.heatNumber}`,
        number: g.heatNumber,
        pairNumbers: g.pairs.map((p) => p.startNumber),
        status: "pending" as const,
      }));

    scheduleApi.getHeatAssignments(competitionId, selectedRoundId)
      .then(async (groups) => {
        setHeats(groups.length > 0 ? mapGroups(groups) : mapGroups(await scheduleApi.drawHeats(competitionId, selectedRoundId)));
      })
      .catch(() => setHeats([]));

    setSectionId(slot.sectionId ?? null);

    if (slot.sectionId && slot.roundNumber) {
      const sectionId = slot.sectionId;
      const roundNumber = slot.roundNumber;
      apiClient.get<{ id: string; roundNumber: number; status: string }[]>(
        `/competitions/${competitionId}/sections/${sectionId}/rounds`
      ).then(async (res) => {
        const found = res.data.find((r) => r.roundNumber === roundNumber);
        if (found) {
          setActiveRoundId(found.id);
        } else {
          // Round entity doesn't exist yet — auto-activate the slot to create it
          await scheduleApi.activateSlot(competitionId, selectedRoundId);
          const res2 = await apiClient.get<{ id: string; roundNumber: number; status: string }[]>(
            `/competitions/${competitionId}/sections/${sectionId}/rounds`
          );
          setActiveRoundId(res2.data.find((r) => r.roundNumber === roundNumber)?.id ?? null);
        }
      }).catch(() => { if (!cancelled) setActiveRoundId(null); });
    }

    return () => { cancelled = true; };
  }, [selectedRoundId, slots, competitionId]);

  // Auto-select first heat when there's only one (e.g. final rounds)
  useEffect(() => {
    if (heats.length === 1 && selectedHeatId !== heats[0].id) {
      selectHeat(heats[0].id);
    }
  }, [heats, selectedHeatId, selectHeat]);

  // Build synthetic→real heat UUID map
  useEffect(() => {
    if (!activeRoundId || !selectedRoundId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHeatIdMap({}); return;
    }
    apiClient.get<{ id: string; heatNumber: number; status: string }[]>(`/rounds/${activeRoundId}/heats`)
      .then((res) => {
        const map: Record<string, string> = {};
        res.data.forEach((h) => { map[`${selectedRoundId}-h${h.heatNumber}`] = h.id; });
        setHeatIdMap(map);
      })
      .catch(() => setHeatIdMap({}));
  }, [activeRoundId, selectedRoundId]);

  // Fetch per-dance confirmation status (determines "Close round" enabled state)
  useEffect(() => {
    if (dances.length === 0 || heats.length === 0 || Object.keys(heatIdMap).length === 0) return;
    const firstRealHeatId = heatIdMap[heats[0].id];
    if (!firstRealHeatId) return;
    for (const dance of dances) {
      liveApi.getJudgeStatuses(firstRealHeatId, dance.name, competitionId).then((statuses) => {
        setDanceConfirmation(dance.id, statuses.filter((j) => j.status === 'submitted').length, statuses.length);
      }).catch(() => {});
    }
  }, [dances, heats, heatIdMap, competitionId, setDanceConfirmation]);

  // Auto-advance to next unconfirmed dance when current dance fully confirmed
  const danceConfirmations = useLiveStore((s) => s.danceConfirmations);
  useEffect(() => {
    if (!selectedDanceId || dances.length === 0) return;
    const currentConf = danceConfirmations[selectedDanceId];
    if (!currentConf || currentConf.total === 0 || currentConf.submitted < currentConf.total) return;
    const currentIdx = dances.findIndex((d) => d.id === selectedDanceId);
    for (let i = currentIdx + 1; i < dances.length; i++) {
      const conf = danceConfirmations[dances[i].id];
      if (!conf || conf.total === 0 || conf.submitted < conf.total) {
        selectDance(dances[i].id);
        if (heats.length > 0) setTimeout(() => selectHeat(heats[0].id), 100);
        return;
      }
    }
  }, [danceConfirmations, selectedDanceId, dances, heats, selectDance, selectHeat]);

  // Check if current round is already closed/calculated
  useEffect(() => {
    if (!activeRoundId) { setRoundClosed(false); return; }
    apiClient.get<{ id: string; status: string }>(`/rounds/${activeRoundId}`)
      .then((res) => {
        setRoundClosed(['CLOSED', 'CALCULATED', 'COMPLETED'].includes(res.data.status));
      })
      .catch(() => setRoundClosed(false));
  }, [activeRoundId, setRoundClosed]);

  const rounds: RoundItem[] = slots.filter((s) => s.type === "ROUND").map(slotToRound);
  const totalPairs = competition?.registeredPairsCount ?? 0;
  const selectedDanceName = dances.find((d) => d.id === selectedDanceId)?.name ?? null;
  const enrichedHeats: HeatItem[] = heats.map((h) => {
    const realId = heatIdMap[h.id];
    const sub = realId ? heatSubmissions[realId] : undefined;
    return sub ? { ...h, submittedJudges: sub.submitted, totalJudges: sub.total } : h;
  });

  return (
    <AppShell noPadding sidebar={<CompetitionSidebar competitionId={competitionId} competitionName={competition?.name} />}>
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
    </AppShell>
  );
}
