import { create } from 'zustand'
import apiClient from '@/lib/api-client'
import { useAlertsStore } from '@/store/alerts-store'

export type JudgeStatus = 'pending' | 'scoring' | 'submitted' | 'offline'

export interface HeatResult {
  pairId: string
  pairNumber: number
  votes: number
  totalJudges: number
  advances: boolean
}

export interface Incident {
  id: string
  type: 'withdrawal' | 'penalty'
  pairNumber?: number
  note: string
  timestamp: string
  roundId?: string
  heatId?: string
}

/** Per-dance confirmation status: danceId → { submitted, total } */
export type DanceConfirmation = Record<string, { submitted: number; total: number }>

interface LiveState {
  selectedRoundId: string | null
  selectedDanceId: string | null
  selectedHeatId: string | null
  judgeStatuses: Record<string, JudgeStatus>
  judgeOnline: Record<string, boolean>
  activePairs: string[]
  heatResults: HeatResult[] | null
  incidents: Incident[]
  presMode: boolean
  lastSentAt: string | null
  isHydrating: boolean
  /** Tracks judge confirmation per dance — all dances confirmed = can close round */
  danceConfirmations: DanceConfirmation
  /** Whether the current round has been closed/calculated */
  roundClosed: boolean

  selectRound: (id: string) => void
  selectDance: (id: string) => void
  selectHeat: (id: string) => void
  updateJudgeStatus: (judgeId: string, status: JudgeStatus) => void
  updateJudgeOnline: (judgeId: string, online: boolean) => void
  setHeatResults: (results: HeatResult[]) => void
  addIncident: (incident: Incident) => void
  withdrawPair: (pairId: string) => void
  setLastSentAt: (ts: string) => void
  togglePresMode: () => void
  setDanceConfirmation: (danceId: string, submitted: number, total: number) => void
  setRoundClosed: (closed: boolean) => void
  reset: () => void
  hydrateFromServer: (competitionId: string, heatId: string, dance?: string | null) => Promise<void>
}

const initialState = {
  selectedRoundId: null,
  selectedDanceId: null,
  selectedHeatId: null,
  judgeStatuses: {} as Record<string, JudgeStatus>,
  judgeOnline: {} as Record<string, boolean>,
  activePairs: [] as string[],
  heatResults: null,
  incidents: [] as Incident[],
  presMode: false,
  lastSentAt: null,
  isHydrating: false,
  danceConfirmations: {} as DanceConfirmation,
  roundClosed: false,
}

export const useLiveStore = create<LiveState>((set) => ({
  ...initialState,

  selectRound: (id) =>
    set({ selectedRoundId: id, selectedDanceId: null, selectedHeatId: null, heatResults: null, danceConfirmations: {}, roundClosed: false }),

  selectDance: (id) =>
    set({ selectedDanceId: id, selectedHeatId: null, heatResults: null }),

  selectHeat: (id) =>
    set({ selectedHeatId: id, heatResults: null, judgeStatuses: {}, judgeOnline: {} }),

  updateJudgeStatus: (judgeId, status) =>
    set((s) => ({ judgeStatuses: { ...s.judgeStatuses, [judgeId]: status } })),

  updateJudgeOnline: (judgeId, online) =>
    set((s) => ({ judgeOnline: { ...s.judgeOnline, [judgeId]: online } })),

  setHeatResults: (results) => set({ heatResults: results }),

  addIncident: (incident) =>
    set((s) => ({ incidents: [incident, ...s.incidents] })),

  withdrawPair: (pairId) =>
    set((s) => ({ activePairs: s.activePairs.filter((id) => id !== pairId) })),

  setLastSentAt: (ts) => set({ lastSentAt: ts }),

  togglePresMode: () => set((s) => ({ presMode: !s.presMode })),

  setDanceConfirmation: (danceId, submitted, total) =>
    set((s) => ({
      danceConfirmations: { ...s.danceConfirmations, [danceId]: { submitted, total } },
    })),

  setRoundClosed: (closed) => set({ roundClosed: closed }),

  reset: () => set(initialState),

  hydrateFromServer: async (competitionId, heatId, dance) => {
    if (!heatId) {
      console.error('[LiveStore] hydrateFromServer called with undefined heatId')
      useAlertsStore.getState().addAlert({ level: 'error', title: 'Nepodařilo se načíst data skupiny — zkuste skupinu vybrat znovu.' })
      return
    }
    set({ isHydrating: true })
    const [statusRes, resultsRes, incidentsRes] = await Promise.allSettled([
      apiClient.get(`/heats/${heatId}/judge-statuses`, { params: { ...(dance ? { dance } : {}), competitionId } }),
      apiClient.get(`/heats/${heatId}/results`),
      apiClient.get(`/competitions/${competitionId}/incidents`),
    ])

    if (statusRes.status === 'fulfilled') {
      // Merge — never downgrade a judge who was already marked submitted (e.g. via SSE)
      set((s) => {
        const merged: Record<string, JudgeStatus> = { ...s.judgeStatuses }
        const mergedOnline: Record<string, boolean> = { ...s.judgeOnline }
        for (const j of statusRes.value.data as Array<{ judgeId: string; status: JudgeStatus; online?: boolean }>) {
          if (merged[j.judgeId] !== 'submitted' || j.status === 'submitted') {
            merged[j.judgeId] = j.status
          }
          if (j.online !== undefined) {
            mergedOnline[j.judgeId] = j.online
          }
        }
        return { judgeStatuses: merged, judgeOnline: mergedOnline }
      })
    }

    if (resultsRes.status === 'fulfilled' && resultsRes.value.status !== 204) {
      set({ heatResults: resultsRes.value.data as HeatResult[] })
    }

    if (incidentsRes.status === 'fulfilled') {
      set({ incidents: incidentsRes.value.data as Incident[] })
    }
    set({ isHydrating: false })
  },
}))
