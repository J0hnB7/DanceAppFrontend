import apiClient from "@/lib/api-client";

export interface JudgeTokenDto {
  id: string;
  competitionId: string;
  judgeNumber: number;
  token: string;
  name?: string;
  usedAt?: string;
  active: boolean;
}

export const judgeTokensApi = {
  list: (competitionId: string) =>
    apiClient.get<JudgeTokenDto[]>(`/competitions/${competitionId}/judge-tokens`).then((r) => r.data),

  create: (competitionId: string, count: number) =>
    apiClient
      .post<JudgeTokenDto[]>(`/competitions/${competitionId}/judge-tokens`, { count })
      .then((r) => r.data),

  revoke: (competitionId: string, tokenId: string) =>
    apiClient
      .delete(`/competitions/${competitionId}/judge-tokens/${tokenId}`)
      .then((r) => r.data),

  getByToken: (token: string) =>
    apiClient.post<JudgeTokenDto>("/judge-tokens/validate", { token }).then((r) => r.data),
};
