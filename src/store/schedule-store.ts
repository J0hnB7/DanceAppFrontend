import { create } from "zustand";
import { scheduleApi, type ScheduleSlot, type ScheduleStatus } from "@/lib/api/schedule";
import { useAlertsStore } from "@/store/alerts-store";

interface ScheduleStore {
  slots: ScheduleSlot[];
  scheduleStatus: ScheduleStatus | null;
  isGenerating: boolean;
  isLoading: boolean;
  isDirty: boolean;
  error: string | null;
  slotsHash: string | null; // SHA-256 hash from SSE — for dedup

  loadSchedule: (competitionId: string) => Promise<void>;
  generateSchedule: (competitionId: string, startTime?: string) => Promise<void>;
  moveSlot: (competitionId: string, slotId: string, newPosition: number) => void;
  addBreak: (competitionId: string, afterSlotId: string, durationMinutes: number) => Promise<void>;
  removeSlot: (competitionId: string, slotId: string) => Promise<void>;
  publishSchedule: (competitionId: string) => Promise<void>;
  recalculateTimesLocally: () => void;
  setSlots: (slots: ScheduleSlot[]) => void;
  setSlotsHash: (hash: string) => void;
  setScheduleStatus: (status: ScheduleStatus) => void;
  clearError: () => void;
}

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  slots: [],
  scheduleStatus: null,
  isGenerating: false,
  isLoading: false,
  isDirty: false,
  error: null,
  slotsHash: null,

  loadSchedule: async (competitionId) => {
    set({ isLoading: true, error: null });
    try {
      const slots = await scheduleApi.list(competitionId);
      set({ slots, isLoading: false, isDirty: false });
      try {
        const status = await scheduleApi.getStatus(competitionId);
        set({ scheduleStatus: status.status });
      } catch {
        // no schedule header yet — DRAFT
        set({ scheduleStatus: "DRAFT" });
      }
    } catch (e: unknown) {
      const msg = (e as Error).message ?? "Chyba při načítání harmonogramu";
      set({ isLoading: false, error: msg });
      useAlertsStore.getState().addAlert({ level: "error", title: msg });
    }
  },

  generateSchedule: async (competitionId, startTime) => {
    set({ isGenerating: true, error: null });
    try {
      const slots = await scheduleApi.generate(competitionId, startTime);
      set({ slots, isGenerating: false, isDirty: false, scheduleStatus: "DRAFT" });
    } catch (e: unknown) {
      const msg = (e as Error).message ?? "Chyba při generování harmonogramu";
      set({ isGenerating: false, error: msg });
      useAlertsStore.getState().addAlert({ level: "error", title: msg });
    }
  },

  moveSlot: (competitionId, slotId, newPosition) => {
    const prevSlots = get().slots;
    // Optimistic update
    const current = [...prevSlots];
    const fromIndex = current.findIndex((s) => s.id === slotId);
    if (fromIndex < 0) return;
    const [moved] = current.splice(fromIndex, 1);
    current.splice(newPosition, 0, { ...moved, manuallyMoved: true });
    const reindexed = current.map((s, i) => ({ ...s, orderIndex: i }));
    set({ slots: reindexed, isDirty: true });

    scheduleApi.reorderSlot(competitionId, slotId, newPosition).then((updated) => {
      set({ slots: updated, isDirty: false });
    }).catch((e: unknown) => {
      // Rollback
      set({ slots: prevSlots });
      const msg = (e as Error).message ?? "Chyba při přeřazení bloku";
      set({ error: msg });
      useAlertsStore.getState().addAlert({ level: "error", title: msg });
    });
  },

  addBreak: async (competitionId, afterSlotId, durationMinutes) => {
    try {
      const slots = await scheduleApi.insertBreak(competitionId, afterSlotId, durationMinutes);
      set({ slots, isDirty: true });
    } catch (e: unknown) {
      const msg = (e as Error).message ?? "Chyba při vkládání pauzy";
      set({ error: msg });
      useAlertsStore.getState().addAlert({ level: "error", title: msg });
    }
  },

  removeSlot: async (competitionId, slotId) => {
    const prevSlots = get().slots;
    // Optimistic remove
    set({ slots: prevSlots.filter((s) => s.id !== slotId), isDirty: true });
    try {
      await scheduleApi.remove(competitionId, slotId);
    } catch (e: unknown) {
      set({ slots: prevSlots });
      const msg = (e as Error).message ?? "Chyba při mazání bloku";
      set({ error: msg });
      useAlertsStore.getState().addAlert({ level: "error", title: msg });
    }
  },

  publishSchedule: async (competitionId) => {
    try {
      const schedule = await scheduleApi.publish(competitionId);
      set({ scheduleStatus: schedule.status });
    } catch (e: unknown) {
      const msg = (e as Error).message ?? "Chyba při publikování harmonogramu";
      set({ error: msg });
      useAlertsStore.getState().addAlert({ level: "error", title: msg });
    }
  },

  recalculateTimesLocally: () => {
    // Local time recalculation — used for immediate feedback
    // Simplified: just sets isDirty
    set({ isDirty: true });
  },

  setSlots: (slots) => set({ slots }),
  setSlotsHash: (hash) => set({ slotsHash: hash }),
  setScheduleStatus: (status) => set({ scheduleStatus: status }),
  clearError: () => set({ error: null }),
}));
