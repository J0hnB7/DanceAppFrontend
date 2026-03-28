import apiClient from "@/lib/api-client";

export type PairStatus = "REGISTERED" | "CONFIRMED" | "WITHDRAWN" | "DISQUALIFIED";
/** @deprecated Use PairStatus instead */
export type RegistrationStatus = "UNCONFIRMED" | "CONFIRMED" | "CANCELLED";

export interface PairSectionAssignment {
  sectionId: string;
  sectionName?: string;
  paymentStatus: "PENDING" | "PAID" | "WAIVED";
}

export interface PairDto {
  id: string;
  /** Competition ID — may not be in backend response; used for frontend routing */
  competitionId?: string;
  startNumber: number;
  /** Backend: full name in one field */
  dancer1Name?: string;
  dancer2Name?: string;
  club?: string;
  email?: string;
  status?: PairStatus;
  sections?: PairSectionAssignment[];
  // Frontend-split name fields (used in mock / legacy code)
  dancer1FirstName?: string;
  dancer1LastName?: string;
  dancer1Club?: string;
  dancer2FirstName?: string;
  dancer2LastName?: string;
  dancer2Club?: string;
  registeredAt?: string;
  paymentStatus?: "PENDING" | "PAID" | "WAIVED";
  /** @deprecated Use status instead */
  registrationStatus?: RegistrationStatus;
  adminNote?: string;
  sectionId?: string;
  athlete1Id?: number | null;
  athlete2Id?: number | null;
  // Extended fields from external competition system
  externalId?: string;
  externalSectionId?: string;
  country?: string | null;
  presenceDeadline?: string | null;
  feePerPerson?: number;
  feeTotal?: number;
  starts?: boolean;
  withdrawalDate?: string | null;
  startType?: string;
  startsFromRound?: number;
  classValue?: string;
  finaleCount?: number | null;
  points?: number | null;
  ranklistPosition?: number | null;
}

export interface CreatePairRequest {
  startNumber: number;
  dancer1Name: string;
  dancer2Name?: string;
  club?: string;
  email?: string;
  /** Frontend also sends these for legacy/mock support */
  sectionId?: string;
  dancer1FirstName?: string;
  dancer1LastName?: string;
  dancer1Club?: string;
  dancer2FirstName?: string;
  dancer2LastName?: string;
  dancer2Club?: string;
  markAsPaid?: boolean;
}

export const pairsApi = {
  list: (competitionId: string, sectionId?: string) =>
    apiClient
      .get<{ content: PairDto[] } | PairDto[]>(`/competitions/${competitionId}/pairs`, {
        params: { ...(sectionId ? { sectionId } : {}), size: 10000 },
      })
      .then((r) => (Array.isArray(r.data) ? r.data : (r.data as { content: PairDto[] }).content)),

  get: (competitionId: string, pairId: string) =>
    apiClient.get<PairDto>(`/competitions/${competitionId}/pairs/${pairId}`).then((r) => r.data),

  create: (competitionId: string, data: CreatePairRequest) =>
    apiClient.post<PairDto>(`/competitions/${competitionId}/pairs`, data).then((r) => r.data),

  update: (competitionId: string, pairId: string, data: Partial<CreatePairRequest>) =>
    apiClient
      .put<PairDto>(`/competitions/${competitionId}/pairs/${pairId}`, data)
      .then((r) => r.data),

  delete: (competitionId: string, pairId: string) =>
    apiClient.delete(`/competitions/${competitionId}/pairs/${pairId}`).then((r) => r.data),

  withdraw: (competitionId: string, pairId: string) =>
    apiClient.post<PairDto>(`/competitions/${competitionId}/pairs/${pairId}/withdraw`).then((r) => r.data),

  addToSection: (competitionId: string, pairId: string, sectionId: string) =>
    apiClient.post<PairDto>(`/competitions/${competitionId}/pairs/${pairId}/sections/${sectionId}`).then((r) => r.data),

  setRegistrationStatus: (competitionId: string, pairId: string, status: RegistrationStatus) =>
    apiClient
      .put<PairDto>(`/competitions/${competitionId}/pairs/${pairId}/registration-status`, { status })
      .then((r) => r.data),

  setPaymentStatus: (competitionId: string, pairId: string, status: "PENDING" | "PAID" | "WAIVED") =>
    apiClient
      .put(`/competitions/${competitionId}/pairs/${pairId}/payment-status`, { status })
      .then((r) => r.data),

  setNote: (competitionId: string, pairId: string, note: string) =>
    apiClient
      .put<PairDto>(`/competitions/${competitionId}/pairs/${pairId}/note`, { note })
      .then((r) => r.data),

  contactEmail: (competitionId: string, pairId: string, data: { subject: string; message: string }) =>
    apiClient
      .post(`/competitions/${competitionId}/pairs/${pairId}/contact-email`, data)
      .then((r) => r.data),

  importCsv: (competitionId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiClient
      .post<{ imported: number; errors: string[] }>(`/competitions/${competitionId}/pairs/import`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
};
