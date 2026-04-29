import apiClient from "@/lib/api-client";

export type CompetitionStatus = "DRAFT" | "PUBLISHED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type FederationType = "WDSF" | "WDC" | "NATIONAL" | "CUSTOM";
export type RoleMode = "ORGANIZER_ONLY" | "TEAM";
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

/** Returned by GET /competitions (list) */
export interface CompetitionSummary {
  id: string;
  name: string;
  slug: string;
  status: CompetitionStatus;
  eventDate: string;
  sectionCount: number;
  pairCount: number;
  /** Frontend-only: set from detail fetch when available */
  registrationOpen?: boolean;
}

/** Returned by GET /competitions/:id (detail) and POST/PUT */
export interface CompetitionDto {
  id: string;
  name: string;
  slug?: string;
  status: CompetitionStatus;
  federation?: FederationType;
  roleMode?: RoleMode;
  /** Backend field for date */
  eventDate: string;
  startTime?: string;
  /** Backend field for location */
  venue: string;
  description?: string;
  logoUrl?: string;
  publicPageEnabled?: boolean;
  registrationOpen: boolean;
  registrationDeadline?: string;
  organizerId?: string;
  organizerName?: string;
  // Frontend extension fields (not yet in backend)
  numberOfRounds?: number;
  maxPairs?: number;
  presenceClosed?: boolean;
  pairsVisibility?: PairsVisibility;
  contentDescription?: string;
  contentFees?: string;
  contentPayment?: string;
  feeCalculationType?: FeeCalculationType;
  feeConfig?: Record<string, unknown>;
  paymentMethod?: PaymentMethodType;
  paymentConfig?: Record<string, unknown>;
  contactEmail?: string;
  bannerUrl?: string;
  propozice?: string;
  paymentInfo?: string;
  /** Computed pair count (not in backend DTO directly) */
  registeredPairsCount?: number;
  // Schedule config (from backend V026)
  scheduleStartTime?: string;
  danceDurationSeconds?: number;
  transitionDurationSeconds?: number;
  maxPairsOnFloor?: number;
  breakDurationMinutes?: number;
  breakRule?: "AFTER_ROUND" | "BETWEEN_CATEGORIES" | "BOTH";
  judgeBreakAfterMinutes?: number;
  judgeBreakDurationMinutes?: number;
  slotBufferMinutes?: number;
  discount2ndPct?: number | null;
  discount3rdPlusPct?: number | null;
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
  eventDate?: string;
  venue?: string;
  description?: string;
  federation?: FederationType;
  roleMode?: RoleMode;
  registrationDeadline?: string;
}

export interface UpdateCompetitionRequest {
  name?: string;
  eventDate?: string;
  startTime?: string;
  venue?: string;
  description?: string;
  federation?: FederationType;
  roleMode?: RoleMode;
  logoUrl?: string;
  publicPageEnabled?: boolean;
  registrationOpen?: boolean;
  registrationDeadline?: string;
  // Frontend extension fields
  numberOfRounds?: number;
  maxPairs?: number;
  pairsVisibility?: PairsVisibility;
  contentDescription?: string;
  contentFees?: string;
  contentPayment?: string;
  feeCalculationType?: FeeCalculationType;
  feeConfig?: Record<string, unknown>;
  paymentMethod?: PaymentMethodType;
  paymentConfig?: Record<string, unknown>;
  contactEmail?: string;
  propozice?: string;
  paymentInfo?: string;
  discount2ndPct?: number | null;
  discount3rdPlusPct?: number | null;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export const competitionsApi = {
  list: (params?: { status?: CompetitionStatus }) =>
    apiClient.get<CompetitionSummary[]>("/competitions", { params }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<CompetitionDto>(`/competitions/${id}`).then((r) => r.data),

  create: (data: CreateCompetitionRequest) =>
    apiClient.post<CompetitionDto>("/competitions", data).then((r) => r.data),

  update: (id: string, data: UpdateCompetitionRequest) =>
    apiClient.put<CompetitionDto>(`/competitions/${id}`, data).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/competitions/${id}`).then((r) => r.data),

  publish: (id: string) =>
    apiClient.post<CompetitionDto>(`/competitions/${id}/publish`).then((r) => r.data),

  complete: (id: string) =>
    apiClient.post(`/competitions/${id}/complete`).then((r) => r.data),

  openRegistration: (id: string) =>
    apiClient.put<CompetitionDto>(`/competitions/${id}`, { registrationOpen: true }).then((r) => r.data),

  closeRegistration: (id: string) =>
    apiClient.put<CompetitionDto>(`/competitions/${id}`, { registrationOpen: false }).then((r) => r.data),

  listNews: (id: string) =>
    apiClient.get<CompetitionNewsItem[]>(`/competitions/${id}/news`).then((r) => r.data),

  createNews: (id: string, data: { title: string; content: string; imageUrl?: string }) =>
    apiClient.post<CompetitionNewsItem>(`/competitions/${id}/news`, data).then((r) => r.data),

  deleteNews: (id: string, newsId: string) =>
    apiClient.delete(`/competitions/${id}/news/${newsId}`).then((r) => r.data),

  /** POST /competitions/{id}/start → 204 */
  start: (id: string) => apiClient.post(`/competitions/${id}/start`),

  /** POST /competitions/{id}/cancel-start → 204 */
  cancelStart: (id: string) => apiClient.post(`/competitions/${id}/cancel-start`),
};
