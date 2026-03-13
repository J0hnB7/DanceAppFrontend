import apiClient from "@/lib/api-client";
import type { RoundType } from "./sections";

export type RoundStatus = "PENDING" | "OPEN" | "IN_PROGRESS" | "CLOSED" | "CALCULATED";

export interface RoundDto {
  id: string;
  sectionId: string;
  roundType: RoundType;
  roundNumber: number;
  status: RoundStatus;
  pairsToAdvance?: number;
  judgeCount: number;
  startedAt?: string;
  closedAt?: string;
}

export interface CreateRoundRequest {
  roundType: RoundType;
  pairsToAdvance?: number;
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

export const roundsApi = {
  list: (sectionId: string) =>
    apiClient.get<RoundDto[]>(`/sections/${sectionId}/rounds`).then((r) => r.data),

  get: (roundId: string) =>
    apiClient.get<RoundDto>(`/rounds/${roundId}`).then((r) => r.data),

  create: (sectionId: string, data: CreateRoundRequest) =>
    apiClient.post<RoundDto>(`/sections/${sectionId}/rounds`, data).then((r) => r.data),

  open: (roundId: string) =>
    apiClient.post<RoundDto>(`/rounds/${roundId}/open`).then((r) => r.data),

  start: (roundId: string) =>
    apiClient.post<RoundDto>(`/rounds/${roundId}/start`).then((r) => r.data),

  close: (roundId: string) =>
    apiClient.post<RoundDto>(`/rounds/${roundId}/close`).then((r) => r.data),

  getSubmissionStatus: (roundId: string) =>
    apiClient.get<SubmissionStatusResponse>(`/rounds/${roundId}/submission-status`).then((r) => r.data),

  calculateResults: (roundId: string) =>
    apiClient.post(`/rounds/${roundId}/calculate`).then((r) => r.data),

  getResults: (roundId: string) =>
    apiClient.get(`/rounds/${roundId}/results`).then((r) => r.data),
};
