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
  listFees: (competitionId: string) =>
    apiClient.get<EntryFeeDto[]>(`/competitions/${competitionId}/fees`).then((r) => r.data),

  createFee: (competitionId: string, data: CreateFeeRequest) =>
    apiClient.post<EntryFeeDto>(`/competitions/${competitionId}/fees`, data).then((r) => r.data),

  deleteFee: (competitionId: string, feeId: string) =>
    apiClient.delete(`/competitions/${competitionId}/fees/${feeId}`).then((r) => r.data),

  listDiscounts: (competitionId: string) =>
    apiClient.get<DiscountDto[]>(`/competitions/${competitionId}/discounts`).then((r) => r.data),

  createDiscount: (competitionId: string, data: CreateDiscountRequest) =>
    apiClient
      .post<DiscountDto>(`/competitions/${competitionId}/discounts`, data)
      .then((r) => r.data),

  deactivateDiscount: (competitionId: string, discountId: string) =>
    apiClient
      .put(`/competitions/${competitionId}/discounts/${discountId}/deactivate`)
      .then((r) => r.data),
};
