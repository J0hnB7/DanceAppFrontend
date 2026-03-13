import apiClient from "@/lib/api-client";

export type CompetitionStatus = "DRAFT" | "PUBLISHED" | "REGISTRATION_OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type PairsVisibility = "PUBLIC" | "PRIVATE" | "HIDDEN";
export type FeeCalculationType =
  | "ASK_ORGANIZER"
  | "DAILY_MAX"
  | "MOST_EXPENSIVE"
  | "PER_COMPETITION_TYPE"
  | "PER_DAY"
  | "BASE_PLUS_ADDITIONAL"
  | "COMBINATION"
  | "PER_ATHLETE_AGE_GROUP";
export type PaymentMethodType = "PAY_AT_VENUE" | "ORGANIZER_WEBSITE" | "BANK_TRANSFER" | "STRIPE" | "OTHER";

export interface CompetitionDto {
  id: string;
  name: string;
  description?: string;
  location: string;
  startDate: string;
  endDate: string;
  status: CompetitionStatus;
  organizerId: string;
  registrationDeadline?: string;
  maxPairs?: number;
  registeredPairsCount: number;
  createdAt: string;
  pairsVisibility?: PairsVisibility;
  bannerUrl?: string;
  logoUrl?: string;
  contactEmail?: string;
  propozice?: string;
  paymentInfo?: string;
  numberOfRounds?: number;
  presenceClosed?: boolean;
  // Content pages
  contentDescription?: string;
  contentFees?: string;
  contentPayment?: string;
  // Fee calculation
  feeCalculationType?: FeeCalculationType;
  feeConfig?: Record<string, unknown>;
  // Payment method
  paymentMethod?: PaymentMethodType;
  paymentConfig?: Record<string, unknown>;
}

export interface CompetitionNewsItem {
  id: string;
  competitionId: string;
  title: string;
  content: string;
  imageUrl?: string;
  publishedAt: string;
}

export interface CreateCompetitionRequest {
  name: string;
  description?: string;
  location: string;
  startDate: string;
  endDate: string;
  registrationDeadline?: string;
  maxPairs?: number;
  contactEmail?: string;
  propozice?: string;
  paymentInfo?: string;
  numberOfRounds?: number;
}

export interface UpdateCompetitionRequest extends Partial<CreateCompetitionRequest> {
  status?: CompetitionStatus;
  pairsVisibility?: PairsVisibility;
  bannerUrl?: string;
  logoUrl?: string;
  contentDescription?: string;
  contentFees?: string;
  contentPayment?: string;
  feeCalculationType?: FeeCalculationType;
  feeConfig?: Record<string, unknown>;
  paymentMethod?: PaymentMethodType;
  paymentConfig?: Record<string, unknown>;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export const competitionsApi = {
  list: (params?: { page?: number; size?: number; status?: CompetitionStatus }) =>
    apiClient.get<PageResponse<CompetitionDto>>("/competitions", { params }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<CompetitionDto>(`/competitions/${id}`).then((r) => r.data),

  create: (data: CreateCompetitionRequest) =>
    apiClient.post<CompetitionDto>("/competitions", data).then((r) => r.data),

  update: (id: string, data: UpdateCompetitionRequest) =>
    apiClient.put<CompetitionDto>(`/competitions/${id}`, data).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/competitions/${id}`).then((r) => r.data),

  publish: (id: string) =>
    apiClient.post<CompetitionDto>(`/competitions/${id}/publish`).then((r) => r.data),

  openRegistration: (id: string) =>
    apiClient.post<CompetitionDto>(`/competitions/${id}/open-registration`).then((r) => r.data),

  closeRegistration: (id: string) =>
    apiClient.post<CompetitionDto>(`/competitions/${id}/close-registration`).then((r) => r.data),

  listNews: (id: string) =>
    apiClient.get<CompetitionNewsItem[]>(`/competitions/${id}/news`).then((r) => r.data),

  createNews: (id: string, data: { title: string; content: string; imageUrl?: string }) =>
    apiClient.post<CompetitionNewsItem>(`/competitions/${id}/news`, data).then((r) => r.data),

  deleteNews: (id: string, newsId: string) =>
    apiClient.delete(`/competitions/${id}/news/${newsId}`).then((r) => r.data),
};
