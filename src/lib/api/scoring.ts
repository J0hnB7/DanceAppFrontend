import apiClient from "@/lib/api-client";
import { SectionFinalSummarySchema } from "@/lib/api/schemas/results";
import { parseApiResponse } from "@/lib/api/schemas/parse";

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
  dancerName?: string;
  club?: string;
  reachedRound?: string;
}

export interface SectionFinalSummaryResponse {
  sectionId: string;
  rankings: PairFinalResultRow[];
}

export interface JudgePlacementsResponse {
  judgeLetters: string[];
  dances: {
    danceId: string;
    danceName: string;
    pairs: {
      pairId: string;
      startNumber: number;
      dancer1Name: string;
      placements: (number | null)[];
    }[];
  }[];
}

export const scoringApi = {
  /** judgeTokenId is sent as X-Judge-Token header (not query param — tokens must not appear in logs/URLs) */
  submitCallbacks: (roundId: string, judgeTokenId: string, data: SubmitCallbacksRequest) =>
    apiClient.post(`/rounds/${roundId}/callbacks`, data, { headers: { 'X-Judge-Token': judgeTokenId } }).then((r) => r.data),

  getCallbacks: (roundId: string, judgeTokenId: string) =>
    apiClient.get(`/rounds/${roundId}/callbacks`, { headers: { 'X-Judge-Token': judgeTokenId } }).then((r) => r.data),

  submitPlacements: (roundId: string, danceId: string, judgeTokenId: string, data: SubmitPlacementsRequest) =>
    apiClient.post(`/rounds/${roundId}/placements/${danceId}`, data, { headers: { 'X-Judge-Token': judgeTokenId } }).then((r) => r.data),

  getPlacements: (roundId: string, danceId: string, judgeTokenId: string) =>
    apiClient.get(`/rounds/${roundId}/placements/${danceId}`, { headers: { 'X-Judge-Token': judgeTokenId } }).then((r) => r.data),

  getSectionSummary: (sectionId: string) =>
    apiClient
      .get(`/sections/${sectionId}/final-summary`)
      .then((r) => parseApiResponse(SectionFinalSummarySchema, r.data, "scoringApi.getSectionSummary") as SectionFinalSummaryResponse),

  calculateSectionSummary: (sectionId: string) =>
    apiClient
      .post(`/sections/${sectionId}/final-summary/calculate`)
      .then((r) => parseApiResponse(SectionFinalSummarySchema, r.data, "scoringApi.calculateSectionSummary") as SectionFinalSummaryResponse),

  approveResults: (sectionId: string) =>
    apiClient.post(`/sections/${sectionId}/results/approve`).then((r) => r.data),

  resolveDanceOff: (sectionId: string, winnerId: string, loserId: string) =>
    apiClient
      .post(`/sections/${sectionId}/dance-off`, { winnerId, loserId })
      .then((r) => parseApiResponse(SectionFinalSummarySchema, r.data, "scoringApi.resolveDanceOff") as SectionFinalSummaryResponse),

  getJudgePlacements: (roundId: string) =>
    apiClient.get<JudgePlacementsResponse>(`/rounds/${roundId}/judge-placements`).then((r) => r.data),
};
