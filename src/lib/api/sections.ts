import apiClient from "@/lib/api-client";

export type AgeCategory = "CHILDREN" | "JUNIOR_I" | "JUNIOR_II" | "YOUTH" | "ADULT" | "SENIOR_I" | "SENIOR_II";
export type Level = "D" | "C" | "B" | "A" | "S" | "OPEN";
export type DanceStyle = "STANDARD" | "LATIN" | "COMBINATION";
export type RoundType = "PRELIMINARY" | "SEMIFINAL" | "FINAL";

export interface DanceDto {
  id: string;
  name: string;
  style: DanceStyle;
  orderIndex: number;
}

export interface SectionDto {
  id: string;
  competitionId: string;
  name: string;
  ageCategory: AgeCategory;
  level: Level;
  danceStyle: DanceStyle;
  dances: DanceDto[];
  registeredPairsCount: number;
  maxPairs?: number;
  entryFee?: number;
  entryFeeCurrency?: string;
  paymentInfo?: string;
  status: "DRAFT" | "ACTIVE" | "COMPLETED";
}

export interface CreateSectionRequest {
  name: string;
  ageCategory: AgeCategory;
  level: Level;
  danceStyle: DanceStyle;
  danceIds?: string[];
  entryFee?: number;
  entryFeeCurrency?: string;
  paymentInfo?: string;
}

export const sectionsApi = {
  list: (competitionId: string) =>
    apiClient.get<SectionDto[]>(`/competitions/${competitionId}/sections`).then((r) => r.data),

  get: (competitionId: string, sectionId: string) =>
    apiClient.get<SectionDto>(`/competitions/${competitionId}/sections/${sectionId}`).then((r) => r.data),

  create: (competitionId: string, data: CreateSectionRequest) =>
    apiClient.post<SectionDto>(`/competitions/${competitionId}/sections`, data).then((r) => r.data),

  update: (competitionId: string, sectionId: string, data: Partial<CreateSectionRequest>) =>
    apiClient.put<SectionDto>(`/competitions/${competitionId}/sections/${sectionId}`, data).then((r) => r.data),

  delete: (competitionId: string, sectionId: string) =>
    apiClient.delete(`/competitions/${competitionId}/sections/${sectionId}`).then((r) => r.data),
};
