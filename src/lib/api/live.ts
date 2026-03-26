import apiClient from '@/lib/api-client'
import type { HeatResult, Incident, JudgeStatus } from '@/store/live-store'

export interface JudgeStatusDto {
  judgeId: string
  letter: string
  name: string
  status: JudgeStatus
  submittedAt?: string
  online: boolean
}

export const liveApi = {
  sendHeat: (heatId: string, dance?: string) =>
    apiClient
      .post<{ sentAt: string }>(`/heats/${heatId}/send`, null, {
        params: dance ? { dance } : {},
      })
      .then((r) => r.data),

  startRound: (roundId: string) =>
    apiClient.post(`/rounds/${roundId}/start`).then((r) => r.data),

  getJudgeStatuses: (heatId: string, dance?: string, competitionId?: string) =>
    apiClient.get<JudgeStatusDto[]>(`/heats/${heatId}/judge-statuses`, {
      params: { ...(dance ? { dance } : {}), ...(competitionId ? { competitionId } : {}) },
    }).then((r) => r.data),

  getHeatResults: (heatId: string) =>
    apiClient.get<HeatResult[]>(`/heats/${heatId}/results`).then((r) => r.data),

  pingJudge: (judgeId: string) =>
    apiClient.post<{ delivered: boolean }>(`/judges/${judgeId}/ping`).then((r) => r.data),

  createIncident: (
    competitionId: string,
    data: { type: string; pairNumber?: number; note: string; roundId?: string; heatId?: string }
  ) =>
    apiClient.post<Incident>(`/competitions/${competitionId}/incidents`, data).then((r) => r.data),

  getIncidents: (competitionId: string) =>
    apiClient.get<Incident[]>(`/competitions/${competitionId}/incidents`).then((r) => r.data),

  skipHeat: (heatId: string) =>
    apiClient.post(`/heats/${heatId}/skip`).then((r) => r.data),

  withdrawPair: (heatId: string, pairId: string) =>
    apiClient
      .put<{ pairId: string; status: string }>(`/heats/${heatId}/pairs/${pairId}/withdraw`)
      .then((r) => r.data),

  reorderRound: (roundId: string, heatOrder: string[], danceOrder: string[]) =>
    apiClient.post(`/rounds/${roundId}/reorder`, { heatOrder, danceOrder }).then((r) => r.data),

  unlockScoring: (judgeId: string, heatId: string) =>
    apiClient.post(`/judges/${judgeId}/heats/${heatId}/unlock`).then((r) => r.data),

  getJudgeCallbacks: (roundId: string, judgeTokenId: string) =>
    apiClient
      .get<string[]>(`/rounds/${roundId}/callbacks`, { params: { judgeTokenId } })
      .then((r) => r.data),
}
