import apiClient from "@/lib/api-client";

export type DanceOffStatus = "PENDING" | "ACTIVE" | "COMPLETED";

export interface DanceOffDto {
  id: string;
  sectionId: string;
  positionContested: number;
  status: DanceOffStatus;
  resultPairId?: string;
  scores: DanceOffScore[];
}

export interface DanceOffScore {
  judgeTokenId: string;
  judgeNumber: number;
  pairId: string;
  placement: number;
}

export const danceOffsApi = {
  create: (sectionId: string, positionContested: number) =>
    apiClient
      .post<DanceOffDto>(`/sections/${sectionId}/dance-offs`, { positionContested })
      .then((r) => r.data),

  list: (sectionId: string) =>
    apiClient.get<DanceOffDto[]>(`/sections/${sectionId}/dance-offs`).then((r) => r.data),

  get: (danceOffId: string) =>
    apiClient.get<DanceOffDto>(`/dance-offs/${danceOffId}`).then((r) => r.data),

  resolve: (danceOffId: string) =>
    apiClient.post<DanceOffDto>(`/dance-offs/${danceOffId}/resolve`).then((r) => r.data),
};
