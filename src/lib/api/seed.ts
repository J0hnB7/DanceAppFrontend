import apiClient from "@/lib/api-client";

export interface SeedOptions {
  competitionName?: string;
  judgeCount?: number;
  pairCount?: number;
  sectionCount?: number;
  withResults?: boolean;
}

export interface SeedResult {
  competitionId: string;
  competitionName: string;
  judgeTokens: string[];
  pairCount: number;
  sectionIds: string[];
  message: string;
}

export const seedApi = {
  seed: (options: SeedOptions) =>
    apiClient.post<SeedResult>("/dev/seed", options).then((r) => r.data),

  reset: (competitionId: string) =>
    apiClient.delete(`/dev/seed/${competitionId}`).then((r) => r.data),

  resetAll: () => apiClient.delete("/dev/seed").then((r) => r.data),
};
