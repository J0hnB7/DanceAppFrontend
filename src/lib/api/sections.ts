import apiClient from "@/lib/api-client";

export type AgeCategory = "CHILDREN_I" | "CHILDREN_II" | "JUNIOR_I" | "JUNIOR_II" | "YOUTH" | "ADULT" | "SENIOR_I" | "SENIOR_II";
export type Level = "HOBBY" | "D" | "C" | "B" | "A" | "S" | "OPEN" | "CHAMPIONSHIP";
export type DanceStyle = "STANDARD" | "LATIN" | "TEN_DANCE" | "COMBINATION" | "SINGLE_DANCE" | "MULTIDANCE";
export type CompetitorType = "AMATEURS" | "PROFESSIONALS";
export type CompetitionType = "COUPLE" | "SOLO_STANDARD" | "SOLO_LATIN" | "FORMATION_STANDARD" | "FORMATION_LATIN" | "SHOW";
export type Series = "CZECH_CHAMPIONSHIP" | "CZECH_CUP" | "EXTRALIGA" | "LIGA_I" | "LIGA_II" | "GRAND_PRIX" | "OPEN" | "OTHER";
export type RoundType = "PRELIMINARY" | "SEMIFINAL" | "FINAL" | "HEAT" | "SINGLE_ROUND";

export interface DanceDto {
  id?: string;
  /** Backend field */
  danceName?: string;
  danceOrder?: number;
  /** Frontend field */
  name?: string;
  style?: DanceStyle;
  orderIndex?: number;
}

export interface SectionDto {
  id: string;
  competitionId?: string;
  name: string;
  externalId?: string;
  danceStyle?: DanceStyle | string;
  numberOfJudges?: number;
  maxFinalPairs?: number;
  orderIndex?: number;
  currentRound?: {
    id: string;
    roundNumber: number;
    roundType: RoundType;
    status: string;
    pairsToAdvance?: number;
  };
  ageCategory?: AgeCategory;
  level?: Level;
  competitorType?: CompetitorType;
  competitionType?: CompetitionType;
  series?: Series;
  dances: DanceDto[];
  registeredPairsCount?: number;
  maxPairs?: number;
  entryFee?: number;
  entryFeeCurrency?: string;
  paymentInfo?: string;
  status?: "DRAFT" | "ACTIVE" | "COMPLETED";
  presenceClosed?: boolean;
  finalSize?: number;
  mergedIntoId?: string;
  mergeId?: string;
  mergedLabel?: string;
  scoringSystem?: string;
  minBirthYear?: number | null;
  maxBirthYear?: number | null;
}

export type RegistrationStatus = "PENDING_PARTNER" | "CONFIRMED" | "ORGANIZER_APPROVED" | "ORGANIZER_REJECTED";

export interface RegistrationListItem {
  pairSectionId: string;
  pairId: string;
  dancer1Name: string;
  dancer2Name: string | null;
  club: string | null;
  gender: string | null;
  competitionType: string | null;
  registrationSource: string;
  status: RegistrationStatus;
  partnerConfirmedAt: string | null;
  organizerDecision: string | null;
  organizerDecisionAt: string | null;
}

export interface CreateSectionRequest {
  name: string;
  danceStyle?: DanceStyle | string;
  // Backend required fields
  numberOfJudges?: number;
  maxFinalPairs?: number;
  orderIndex?: number;
  dances?: string[];
  // Frontend-only / ČSTS fields
  ageCategory?: AgeCategory;
  level?: Level;
  competitorType?: CompetitorType;
  competitionType?: CompetitionType;
  series?: Series;
  danceIds?: string[];
  entryFee?: number;
  entryFeeCurrency?: string;
  paymentInfo?: string;
  minBirthYear?: number | null;
  maxBirthYear?: number | null;
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

  updateDances: (competitionId: string, sectionId: string, dances: string[]) =>
    apiClient.patch<SectionDto>(`/competitions/${competitionId}/sections/${sectionId}/dances`, { dances }).then((r) => r.data),

  reorder: (competitionId: string, sectionIds: string[]) =>
    apiClient.patch(`/competitions/${competitionId}/sections/reorder`, { sectionIds }),

  getEligible: (competitionId: string, birthYear?: number) =>
    apiClient
      .get<SectionDto[]>(
        `/competitions/${competitionId}/sections/eligible${birthYear != null ? `?birthYear=${birthYear}` : ""}`
      )
      .then((r) => r.data),

  listRegistrations: (competitionId: string, sectionId: string) =>
    apiClient
      .get<RegistrationListItem[]>(`/competitions/${competitionId}/sections/${sectionId}/registrations`)
      .then((r) => r.data),

  approveRegistration: (competitionId: string, pairSectionId: string) =>
    apiClient
      .post(`/competitions/${competitionId}/registrations/${pairSectionId}/approve`)
      .then((r) => r.data),

  rejectRegistration: (competitionId: string, pairSectionId: string) =>
    apiClient
      .post(`/competitions/${competitionId}/registrations/${pairSectionId}/reject`)
      .then((r) => r.data),
};
