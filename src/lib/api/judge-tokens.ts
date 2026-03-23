import apiClient from "@/lib/api-client";

export type JudgeRole = "JUDGE" | "CHAIRMAN" | "SCRUTINEER";

export interface JudgeTokenDto {
  id: string;
  competitionId?: string;
  judgeNumber?: number;
  role?: JudgeRole;
  active?: boolean;
  connectedAt?: string;
  rawToken?: string;
  rawPin?: string;
  // Legacy mock fields
  token?: string;
  pin?: string;
  name?: string;
  country?: string;
  usedAt?: string;
  connected?: boolean;
}

export interface JudgeTokenCreatedResponse {
  id: string;
  qrUrl: string;
  rawToken: string;
  pin: string;
  role: JudgeRole;
  judgeNumber?: number;
}

export interface JudgeConnectResponse {
  accessToken: string;
  expiresIn: number;
  role: JudgeRole;
}

export const judgeTokensApi = {
  list: (competitionId: string) =>
    apiClient.get<JudgeTokenDto[]>(`/competitions/${competitionId}/judge-tokens`).then((r) => r.data),

  create: (competitionId: string, data: { judgeNumber: number; role: JudgeRole }) =>
    apiClient
      .post<JudgeTokenCreatedResponse>(`/competitions/${competitionId}/judge-tokens`, data)
      .then((r) => r.data),

  revoke: (competitionId: string, tokenId: string) =>
    apiClient
      .delete(`/competitions/${competitionId}/judge-tokens/${tokenId}`)
      .then((r) => r.data),

  deletePermanent: (competitionId: string, tokenId: string) =>
    apiClient
      .delete(`/competitions/${competitionId}/judge-tokens/${tokenId}/permanent`)
      .then((r) => r.data),

  update: (competitionId: string, tokenId: string, data: { name?: string; country?: string }) =>
    apiClient
      .put<JudgeTokenDto>(`/competitions/${competitionId}/judge-tokens/${tokenId}`, data)
      .then((r) => r.data),

  /** Judge connects with QR token + PIN → receives JWT */
  connect: (token: string, pin: string) =>
    apiClient.post<JudgeConnectResponse>("/judge-access/connect", { token, pin }).then((r) => r.data),

  /** @deprecated Use connect() instead */
  getByToken: (token: string) =>
    apiClient.post<JudgeTokenDto>("/judge-tokens/validate", { token }).then((r) => r.data),
};
