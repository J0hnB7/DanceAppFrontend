import apiClient from "@/lib/api-client";

export type RegistrationStatus = "UNCONFIRMED" | "CONFIRMED" | "CANCELLED";

export interface PairDto {
  id: string;
  competitionId: string;
  sectionId: string;
  startNumber: number;
  dancer1FirstName: string;
  dancer1LastName: string;
  dancer1Club?: string;
  dancer2FirstName?: string;
  dancer2LastName?: string;
  dancer2Club?: string;
  email?: string;
  registeredAt: string;
  paymentStatus: "PENDING" | "PAID" | "WAIVED";
  registrationStatus: RegistrationStatus;
  adminNote?: string;
}

export interface CreatePairRequest {
  sectionId: string;
  startNumber?: number;
  dancer1FirstName: string;
  dancer1LastName: string;
  dancer1Club?: string;
  dancer2FirstName?: string;
  dancer2LastName?: string;
  dancer2Club?: string;
}

export const pairsApi = {
  list: (competitionId: string, sectionId?: string) =>
    apiClient
      .get<PairDto[]>(`/competitions/${competitionId}/pairs`, {
        params: sectionId ? { sectionId } : undefined,
      })
      .then((r) => r.data),

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

  setRegistrationStatus: (competitionId: string, pairId: string, status: RegistrationStatus) =>
    apiClient
      .put<PairDto>(`/competitions/${competitionId}/pairs/${pairId}/registration-status`, { status })
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
