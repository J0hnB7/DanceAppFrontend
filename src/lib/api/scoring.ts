import apiClient from "@/lib/api-client";

export interface SubmitCallbacksRequest {
  selectedPairIds: string[];
}

export interface SubmitPlacementsRequest {
  pairPlacements: Record<string, number>;
}

export interface PairPlacementResponse {
  pairId: string;
  startNumber: number;
  dancer1Name: string;
  placement: number;
  ruleApplied: string;
  detail: string;
}

export interface DanceResultResponse {
  danceId: string;
  danceName: string;
  rankings: PairPlacementResponse[];
}

export interface RoundResultsResponse {
  roundId: string;
  roundType: string;
  dances: DanceResultResponse[];
}

export interface PairCallbackResult {
  pairId: string;
  startNumber: number;
  dancer1Name: string;
  voteCount: number;
  advances: boolean;
}

export interface PreliminaryResultResponse {
  pairsToAdvance: number;
  pairs: PairCallbackResult[];
}

export interface PairFinalResultRow {
  pairId: string;
  startNumber: number;
  totalSum: number;
  finalPlacement: number;
  tieResolution: string;
  perDance: Record<string, number>;
}

export interface SectionFinalSummaryResponse {
  sectionId: string;
  rankings: PairFinalResultRow[];
}

export const scoringApi = {
  submitCallbacks: (roundId: string, data: SubmitCallbacksRequest) =>
    apiClient.post(`/rounds/${roundId}/callbacks`, data).then((r) => r.data),

  getCallbacks: (roundId: string) =>
    apiClient.get(`/rounds/${roundId}/callbacks`).then((r) => r.data),

  submitPlacements: (roundId: string, danceId: string, data: SubmitPlacementsRequest) =>
    apiClient.post(`/rounds/${roundId}/placements/${danceId}`, data).then((r) => r.data),

  getPlacements: (roundId: string, danceId: string) =>
    apiClient.get(`/rounds/${roundId}/placements/${danceId}`).then((r) => r.data),

  getSectionSummary: (sectionId: string) =>
    apiClient.get<SectionFinalSummaryResponse>(`/sections/${sectionId}/final-summary`).then((r) => r.data),

  calculateSectionSummary: (sectionId: string) =>
    apiClient
      .post<SectionFinalSummaryResponse>(`/sections/${sectionId}/final-summary/calculate`)
      .then((r) => r.data),

  approveResults: (sectionId: string) =>
    apiClient.post(`/sections/${sectionId}/results/approve`).then((r) => r.data),
};
