import apiClient from "@/lib/api-client";

export interface DancerRegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  gdprAccepted: boolean;
}

export interface OnboardingRequest {
  firstName: string;
  lastName: string;
  birthYear: number;
  club?: string;
  partnerNameText?: string;
}

export interface DancerProfileRequest {
  firstName?: string;
  lastName?: string;
  birthYear?: number;
  club?: string;
  partnerNameText?: string;
  gender?: string;
}

export interface DancerProfileResponse {
  id: string;
  firstName: string;
  lastName: string;
  birthYear: number | null;
  club: string | null;
  partnerUserId: string | null;
  partnerName: string | null;
  onboardingCompleted: boolean;
  gender: string | null;
}

export interface PartnerInviteResponse {
  inviteUrl: string;
  expiresAt: string;
}

export interface PartnerInvitePreview {
  fromName: string;
}

export interface MyCompetitionSection {
  sectionId: string;
  sectionName: string;
  startNumber: number;
  paymentStatus: string;
  finalPlacement: number | null;
  reachedRound: string | null;
}

export interface MyCompetitionEntry {
  competitionId: string;
  competitionName: string;
  date: string;
  venue: string;
  sections: MyCompetitionSection[];
}

export const dancerApi = {
  register: (data: DancerRegisterRequest) =>
    apiClient.post("/auth/register/dancer", data).then((r) => r.data),

  completeOnboarding: (data: OnboardingRequest) =>
    apiClient.put<DancerProfileResponse>("/profile/dancer/onboarding", data).then((r) => r.data),

  getProfile: () =>
    apiClient.get<DancerProfileResponse>("/profile/dancer").then((r) => r.data),

  updateProfile: (data: DancerProfileRequest) =>
    apiClient.put<DancerProfileResponse>("/profile/dancer", data).then((r) => r.data),

  generateInvite: () =>
    apiClient.post<PartnerInviteResponse>("/profile/partner-invite").then((r) => r.data),

  getInvitePreview: (token: string) =>
    apiClient.get<PartnerInvitePreview>(`/partner-invite/${token}`).then((r) => r.data),

  acceptInvite: (token: string) =>
    apiClient.post(`/partner-invite/${token}/accept`).then((r) => r.data),

  unlinkPartner: () =>
    apiClient.delete("/profile/partner").then((r) => r.data),

  getMyCompetitions: () =>
    apiClient.get<MyCompetitionEntry[]>("/profile/my-competitions").then((r) => r.data),
};
