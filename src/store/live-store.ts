import { create } from 'zustand'
import apiClient from '@/lib/api-client'

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

interface LiveState {
  selectedRoundId: string | null
  selectedDanceId: string | null
  selectedHeatId: string | null
  judgeStatuses: Record<string, JudgeStatus>
  activePairs: string[]
  heatResults: HeatResult[] | null
  incidents: Incident[]
  presMode: boolean
  lastSentAt: string | null

  selectRound: (id: string) => void
  selectDance: (id: string) => void
  selectHeat: (id: string) => void
  updateJudgeStatus: (judgeId: string, status: JudgeStatus) => void
  setHeatResults: (results: HeatResult[]) => void
  addIncident: (incident: Incident) => void
  withdrawPair: (pairId: string) => void
  setLastSentAt: (ts: string) => void
  togglePresMode: () => void
  reset: () => void
  hydrateFromServer: (competitionId: string, heatId: string) => Promise<void>
}

const initialState = {
  selectedRoundId: null,
  selectedDanceId: null,
  selectedHeatId: null,
  judgeStatuses: {} as Record<string, JudgeStatus>,
  activePairs: [] as string[],
  heatResults: null,
  incidents: [] as Incident[],
  presMode: false,
  lastSentAt: null,
}

export const useLiveStore = create<LiveState>((set) => ({
  ...initialState,

  selectRound: (id) =>
    set({ selectedRoundId: id, selectedDanceId: null, selectedHeatId: null, heatResults: null }),

  selectDance: (id) =>
    set({ selectedDanceId: id, selectedHeatId: null, heatResults: null }),

  selectHeat: (id) =>
    set({ selectedHeatId: id, heatResults: null, judgeStatuses: {} }),

  updateJudgeStatus: (judgeId, status) =>
    set((s) => ({ judgeStatuses: { ...s.judgeStatuses, [judgeId]: status } })),

  setHeatResults: (results) => set({ heatResults: results }),

  addIncident: (incident) =>
    set((s) => ({ incidents: [incident, ...s.incidents] })),

  withdrawPair: (pairId) =>
    set((s) => ({ activePairs: s.activePairs.filter((id) => id !== pairId) })),

  setLastSentAt: (ts) => set({ lastSentAt: ts }),

  togglePresMode: () => set((s) => ({ presMode: !s.presMode })),

  reset: () => set(initialState),

  hydrateFromServer: async (competitionId, heatId) => {
    const [statusRes, resultsRes, incidentsRes] = await Promise.allSettled([
      apiClient.get(`/heats/${heatId}/judge-statuses`),
      apiClient.get(`/heats/${heatId}/results`),
      apiClient.get(`/competitions/${competitionId}/incidents`),
    ])

    if (statusRes.status === 'fulfilled') {
      const statuses: Record<string, JudgeStatus> = {}
      for (const j of statusRes.value.data as Array<{ judgeId: string; status: JudgeStatus }>) {
        statuses[j.judgeId] = j.status
      }
      set({ judgeStatuses: statuses })
    }

    if (resultsRes.status === 'fulfilled' && resultsRes.value.status !== 204) {
      set({ heatResults: resultsRes.value.data as HeatResult[] })
    }

    if (incidentsRes.status === 'fulfilled') {
      set({ incidents: incidentsRes.value.data as Incident[] })
    }
  },
}))
