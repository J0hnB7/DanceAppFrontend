import apiClient from "@/lib/api-client";

export interface EntryFeeDto {
  id: string;
  competitionId: string;
  sectionId?: string;
  name: string;
  amount: number;
  currency: string;
  dueDate?: string;
}

export interface DiscountDto {
  id: string;
  competitionId: string;
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  maxUses?: number;
  usedCount: number;
  expiresAt?: string;
  active: boolean;
}

export interface CreateFeeRequest {
  name: string;
  amount: number;
  currency?: string;
  sectionId?: string;
  dueDate?: string;
}

export interface CreateDiscountRequest {
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  maxUses?: number;
  expiresAt?: string;
}

export const feesApi = {
  // Mock-layer endpoints (not on real backend)
  listFees: (competitionId: string) =>
    apiClient.get<EntryFeeDto[]>(`/competitions/${competitionId}/fees`).then((r) => r.data),

  createFee: (competitionId: string, data: CreateFeeRequest) =>
    apiClient.post<EntryFeeDto>(`/competitions/${competitionId}/fees`, data).then((r) => r.data),

  deleteFee: (competitionId: string, feeId: string) =>
    apiClient.delete(`/competitions/${competitionId}/fees/${feeId}`).then((r) => r.data),

  // Backend: section-level fee (PUT /sections/{sectionId}/fee)
  getSectionFee: (sectionId: string) =>
    apiClient.get<EntryFeeDto>(`/sections/${sectionId}/fee`).then((r) => r.data),

  upsertSectionFee: (sectionId: string, data: { amount: number; currency: string; dueDate?: string }) =>
    apiClient.put<EntryFeeDto>(`/sections/${sectionId}/fee`, data).then((r) => r.data),

  // Discounts (backend: /competitions/{id}/discounts)
  listDiscounts: (competitionId: string) =>
    apiClient.get<DiscountDto[]>(`/competitions/${competitionId}/discounts`).then((r) => r.data),

  createDiscount: (competitionId: string, data: CreateDiscountRequest) =>
    apiClient
      .post<DiscountDto>(`/competitions/${competitionId}/discounts`, data)
      .then((r) => r.data),

  deleteDiscount: (discountId: string) =>
    apiClient.delete(`/discounts/${discountId}`).then((r) => r.data),

  deactivateDiscount: (competitionId: string, discountId: string) =>
    apiClient
      .put(`/competitions/${competitionId}/discounts/${discountId}/deactivate`)
      .then((r) => r.data),
};
