import apiClient from "@/lib/api-client";

export type PenaltyType = "LIFTING" | "FORBIDDEN_FIGURE" | "UNSPORTING_BEHAVIOUR";
export type PenaltyStatus = "PENDING_REVIEW" | "CONFIRMED" | "DISMISSED" | "RETRACTED" | "EXPIRED";

export interface ViolationReport {
  deviceToken: string;
  pairId: string;
  heatId: string;
  penaltyType: PenaltyType;
}

export interface Violation {
  id: string;
  competitionId: string;
  pairId: string;
  sectionId: string | null;
  penaltyType: PenaltyType;
  penaltyStatus: PenaltyStatus;
  reportedByJudgeTokenId: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  resolutionNote: string | null;
  issuedAt: string;
  updatedAt: string;
}

export interface ViolationReview {
  decision: "CONFIRMED" | "DISMISSED";
  note?: string;
  applyDq: boolean;
}

export const violationsApi = {
  report: (competitionId: string, req: ViolationReport) =>
    apiClient.post<Violation>(`/competitions/${competitionId}/violations`, req).then((r) => r.data),

  retract: (penaltyId: string, deviceToken: string) =>
    apiClient.delete(`/violations/${penaltyId}`, { params: { deviceToken } }),

  list: (competitionId: string, status?: PenaltyStatus) =>
    apiClient.get<Violation[]>(`/competitions/${competitionId}/violations`, {
      params: status ? { status } : undefined,
    }).then((r) => r.data),

  review: (penaltyId: string, req: ViolationReview) =>
    apiClient.post<Violation>(`/violations/${penaltyId}/review`, req).then((r) => r.data),
};
