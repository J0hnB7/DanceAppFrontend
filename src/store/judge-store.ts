import { create } from "zustand";
import apiClient from "@/lib/api-client";
import { judgeOfflineStore } from "@/lib/judge-offline-store";
import { useAlertsStore } from "@/store/alerts-store";

interface Round {
  id: string;
  roundType: string;
  roundNumber: number;
  liveStatus: string;
  pairsToAdvance?: number | null;
  dances?: Array<{ id: string; name: string }>;
}

interface Heat {
  id: string;
  heatNumber: number;
  status: string;
  pairIds: string[];
}

interface Recall {
  pairId: string;
  recalled: boolean;
}

interface Placement {
  pairId: string;
  danceId: string;
  placement: number;
}

interface JudgeStore {
  adjudicatorId: string | null;
  competitionId: string | null;
  competitionName: string | null;
  deviceToken: string | null;
  currentRound: Round | null;
  currentDance: string | null;
  currentHeat: Heat | null;
  isOnline: boolean;
  pendingSyncCount: number;

  // Error states — shown inline in judge UI (not just notification center)
  loginError: string | null;
  submitError: string | null;
  syncError: string | null;

  login: (qrToken: string, pin: string) => Promise<void>;
  loadCurrentRound: () => Promise<void>;
  submitCallbacks: (recalls: Recall[], heatId: string | null, dance: string) => Promise<void>;
  submitPlacements: (placements: Placement[]) => Promise<void>;
  syncOfflineMarks: () => Promise<void>;
  setIsOnline: (v: boolean) => void;
  clearErrors: () => void;
  updatePendingCount: () => Promise<void>;
}

export const useJudgeStore = create<JudgeStore>((set, get) => ({
  adjudicatorId: null,
  competitionId: null,
  competitionName: null,
  deviceToken: null,
  currentRound: null,
  currentDance: null,
  currentHeat: null,
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  pendingSyncCount: 0,
  loginError: null,
  submitError: null,
  syncError: null,

  login: async (qrToken: string, pin: string) => {
    set({ loginError: null });
    try {
      const res = await apiClient.post("/judge-access/connect", { token: qrToken, pin });
      const { accessToken, adjudicatorId, competitionId, competitionName, deviceToken } = res.data;

      // Store JWT and device token
      localStorage.setItem("judge_access_token", accessToken);
      localStorage.setItem("judge_device_token", deviceToken);
      localStorage.setItem("judge_competition_id", competitionId);
      localStorage.setItem("judge_adjudicator_id", adjudicatorId);

      set({ adjudicatorId, competitionId, competitionName, deviceToken });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { message?: string } } })?.response?.status;
      const message = (err as { response?: { status?: number; data?: { message?: string } } })?.response?.data?.message;

      let loginError: string;
      if (status === 423) {
        loginError = message ?? "Přístup dočasně zablokován. Zkuste za 5 minut.";
      } else if (status === 401) {
        loginError = "Nesprávný PIN. Zkuste znovu.";
      } else {
        loginError = message ?? "Přihlášení selhalo. Zkuste znovu.";
      }

      set({ loginError });
      useAlertsStore.getState().addAlert({ level: "error", title: loginError });
      throw err;
    }
  },

  loadCurrentRound: async () => {
    const { competitionId } = get();
    if (!competitionId) return;
    try {
      const res = await apiClient.get("/judge/active-round", { params: { competitionId } });
      set({ currentRound: res.data.round });
    } catch {
      // 404 = no active round, that's fine
    }
  },

  submitCallbacks: async (recalls: Recall[], heatId: string | null, dance: string) => {
    const { currentRound, deviceToken, adjudicatorId } = get();
    if (!currentRound || !adjudicatorId) return;

    set({ submitError: null });

    // Save to IndexedDB first (offline-first)
    await Promise.all(
      recalls.map((r) =>
        judgeOfflineStore.saveMark({
          key: `${adjudicatorId}-${currentRound.id}-${dance}-${r.pairId}`,
          judgeTokenId: adjudicatorId,
          roundId: currentRound.id,
          dance,
          danceId: null,
          pairId: r.pairId,
          recalled: r.recalled,
          heatId,
          deviceToken: deviceToken ?? "",
          createdAt: new Date().toISOString(),
          synced: false,
        })
      )
    );

    if (!get().isOnline) {
      await get().updatePendingCount();
      return;
    }

    try {
      await apiClient.post(
        `/rounds/${currentRound.id}/callbacks`,
        {
          heatId,
          dance,
          recalls,
          deviceToken,
        },
        { headers: { 'X-Judge-Token': adjudicatorId } }
      );
      // Mark as synced
      await judgeOfflineStore.markAsSynced(
        recalls.map((r) => `${adjudicatorId}-${currentRound.id}-${dance}-${r.pairId}`)
      );
    } catch (err: unknown) {
      const msg = "Odeslání selhalo — hodnocení uloženo offline";
      set({ submitError: msg });
      useAlertsStore.getState().addAlert({ level: "warning", title: msg });
    }
    await get().updatePendingCount();
  },

  submitPlacements: async (placements: Placement[]) => {
    const { currentRound, deviceToken, adjudicatorId } = get();
    if (!currentRound || !adjudicatorId) return;

    set({ submitError: null });

    // Save to IndexedDB first
    await Promise.all(
      placements.map((p) =>
        judgeOfflineStore.saveMark({
          key: `${adjudicatorId}-${currentRound.id}-${p.danceId}-${p.pairId}`,
          judgeTokenId: adjudicatorId,
          roundId: currentRound.id,
          dance: null,
          danceId: p.danceId,
          pairId: p.pairId,
          placement: p.placement,
          deviceToken: deviceToken ?? "",
          createdAt: new Date().toISOString(),
          synced: false,
        })
      )
    );

    if (!get().isOnline) {
      await get().updatePendingCount();
      return;
    }

    // Group by danceId and submit
    const grouped: Record<string, Record<string, number>> = {};
    for (const p of placements) {
      if (!grouped[p.danceId]) grouped[p.danceId] = {};
      grouped[p.danceId][p.pairId] = p.placement;
    }

    try {
      await Promise.all(
        Object.entries(grouped).map(([danceId, pairPlacements]) =>
          apiClient.post(
            `/rounds/${currentRound.id}/placements/${danceId}`,
            { placements: Object.entries(pairPlacements).map(([pairId, placement]) => ({ pairId, placement })), deviceToken },
            { headers: { 'X-Judge-Token': adjudicatorId } }
          )
        )
      );
      await judgeOfflineStore.markAsSynced(
        placements.map((p) => `${adjudicatorId}-${currentRound.id}-${p.danceId}-${p.pairId}`)
      );
    } catch {
      const msg = "Odeslání selhalo — hodnocení uloženo offline";
      set({ submitError: msg });
      useAlertsStore.getState().addAlert({ level: "warning", title: msg });
    }
    await get().updatePendingCount();
  },

  syncOfflineMarks: async () => {
    const { adjudicatorId, deviceToken } = get();
    if (!adjudicatorId || !deviceToken) return;
    set({ syncError: null });
    try {
      await judgeOfflineStore.syncAll(adjudicatorId, deviceToken);
    } catch {
      const msg = "Synchronizace offline záznamů selhala";
      set({ syncError: msg });
      useAlertsStore.getState().addAlert({ level: "error", title: msg });
    }
    await get().updatePendingCount();
  },

  setIsOnline: (v: boolean) => {
    set({ isOnline: v });
    if (v) {
      // Auto-sync on reconnect
      get().syncOfflineMarks().catch(() => {});
    }
  },

  clearErrors: () => set({ loginError: null, submitError: null, syncError: null }),

  updatePendingCount: async () => {
    const count = await judgeOfflineStore.getPendingCount();
    set({ pendingSyncCount: count });
  },
}));
