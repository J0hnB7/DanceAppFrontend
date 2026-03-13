import apiClient from "@/lib/api-client";

export type WithdrawalReason = "injury" | "disqualification" | "voluntary";
export type PenaltyType = "warning" | "point_penalty" | "disqualification";

export interface WithdrawalRequest {
  reason: WithdrawalReason;
  notes?: string;
}

export interface PenaltyRequest {
  type: PenaltyType;
  points?: number; // only for point_penalty
  reason: string;
  notes?: string;
}

export const crisisApi = {
  withdraw: (competitionId: string, pairId: string, data: WithdrawalRequest) =>
    apiClient
      .post(`/competitions/${competitionId}/pairs/${pairId}/withdraw`, data)
      .then((r) => r.data),

  addPenalty: (competitionId: string, pairId: string, data: PenaltyRequest) =>
    apiClient
      .post(`/competitions/${competitionId}/pairs/${pairId}/penalty`, data)
      .then((r) => r.data),
};
