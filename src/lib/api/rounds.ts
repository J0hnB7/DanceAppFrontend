import apiClient from "@/lib/api-client";

export type RoundStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OPEN" | "CLOSED" | "CALCULATED";
export type RoundType = "HEAT" | "SEMIFINAL" | "FINAL" | "SINGLE_ROUND" | "PRELIMINARY" | "QUARTER_FINAL";

export interface RoundDto {
  id: string;
  sectionId?: string;
  roundType: RoundType;
  roundNumber: number;
  status: RoundStatus;
  pairsToAdvance?: number;
  judgeCount?: number;
  startedAt?: string;
  closedAt?: string;
  completedAt?: string;
}

export interface CompleteRoundRequest {
  pairsToAdvance?: number;
  advancingPairIds?: string[];
}

export interface SubmissionStatusResponse {
  totalJudges: number;
  submitted: number;
  judges: JudgeSubmissionStatus[];
}

export interface JudgeSubmissionStatus {
  judgeTokenId: string;
  judgeNumber: number;
  submitted: boolean;
  submittedAt?: string;
}

export interface PairCallbackResult {
  pairId: string;
  startNumber: number;
  dancer1Name?: string;
  voteCount: number;
  advances: boolean;
}

export interface PreliminaryResultResponse {
  pairsToAdvance: number;
  pairs: PairCallbackResult[];
  tieAtBoundary: boolean;
  tiedPairsAtBoundary: string[];
  nextRoundId?: string;
  advancedPairIds: string[];
}

export const roundsApi = {
  /** Backend: GET /competitions/{cId}/sections/{sId}/rounds */
  list: (competitionId: string, sectionId: string) =>
    apiClient.get<RoundDto[]>(`/competitions/${competitionId}/sections/${sectionId}/rounds`).then((r) => r.data),

  /** Backend: POST /competitions/{cId}/sections/{sId}/rounds/open */
  open: (competitionId: string, sectionId: string) =>
    apiClient.post<RoundDto>(`/competitions/${competitionId}/sections/${sectionId}/rounds/open`).then((r) => r.data),

  /** Backend: POST /competitions/{cId}/sections/{sId}/rounds/{roundId}/complete */
  complete: (competitionId: string, sectionId: string, roundId: string, data?: CompleteRoundRequest) =>
    apiClient.post<RoundDto>(`/competitions/${competitionId}/sections/${sectionId}/rounds/${roundId}/complete`, data ?? {}).then((r) => r.data),

  // Scoring endpoints (direct /rounds/:id paths)
  getSubmissionStatus: (roundId: string) =>
    apiClient.get<SubmissionStatusResponse>(`/rounds/${roundId}/submission-status`).then((r) => r.data),

  calculateResults: (roundId: string) =>
    apiClient.post(`/rounds/${roundId}/calculate`).then((r) => r.data),

  resolveTie: (roundId: string, choice: "more" | "less") =>
    apiClient.post(`/rounds/${roundId}/calculate`, null, { params: { tieBreak: choice.toUpperCase() } }).then((r) => r.data),

  getResults: (roundId: string) =>
    apiClient.get(`/rounds/${roundId}/results`).then((r) => r.data),

  /** Backend: GET /rounds/{roundId}/preliminary — calculate preliminary results */
  getPreliminaryResults: (roundId: string) =>
    apiClient.get<PreliminaryResultResponse>(`/rounds/${roundId}/preliminary`).then((r) => r.data),

  /** Backend: POST /rounds/{roundId}/preliminary/chairman-resolve — resolve boundary tie */
  resolveChairmanTie: (roundId: string, approvedPairIds: string[]) =>
    apiClient.post(`/rounds/${roundId}/preliminary/chairman-resolve`, approvedPairIds).then((r) => r.data),

  /** Backend: GET /rounds/{roundId}/preliminary/export — XLSX audit export */
  exportPreliminary: (roundId: string) =>
    apiClient.get(`/rounds/${roundId}/preliminary/export`, { responseType: 'blob' }).then((r) => r.data as Blob),

  // Legacy/mock-only endpoints kept for backward compat with mock layer
  get: (roundId: string) =>
    apiClient.get<RoundDto>(`/rounds/${roundId}`).then((r) => r.data),

  start: (roundId: string) =>
    apiClient.post<RoundDto>(`/rounds/${roundId}/start`).then((r) => r.data),

  close: (roundId: string) =>
    apiClient.post<RoundDto>(`/rounds/${roundId}/close`).then((r) => r.data),
};
