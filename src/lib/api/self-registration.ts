import apiClient from "@/lib/api-client";

export interface SelfRegistrationResponse {
  pairId: string;
  pairSectionId: string;
  startNumber: number;
  sectionName: string;
  status: "REGISTERED" | "PENDING_PARTNER";
  confirmToken: string | null;
}

export interface RegistrationInfoResponse {
  pairSectionId: string;
  competitionName: string;
  sectionName: string;
  inviterName: string;
  status: string;
}

export interface UserSearchResult {
  userId: string;
  fullName: string;
  club: string | null;
}

export interface SelfRegistrationBatchResponse {
  pairId: string;
  startNumber: number;
  sections: { pairSectionId: string; sectionName: string; status: "REGISTERED" | "PENDING_PARTNER" }[];
  totalFee: string;
}

export const selfRegistrationApi = {
  register: (competitionId: string, sectionId: string) =>
    apiClient
      .post<SelfRegistrationResponse>(
        `/competitions/${competitionId}/pairs/self-register`,
        { sectionId }
      )
      .then((r) => r.data),

  registerBatch: (competitionId: string, sectionIds: string[]) =>
    apiClient
      .post<SelfRegistrationBatchResponse>(
        `/competitions/${competitionId}/pairs/self-register-batch`,
        { sectionIds }
      )
      .then((r) => r.data),

  getConfirmInfo: (token: string) =>
    apiClient
      .get<RegistrationInfoResponse>(`/registrations/confirm/${token}`)
      .then((r) => r.data),

  confirmPartner: (token: string) =>
    apiClient
      .post(`/registrations/confirm/${token}`)
      .then((r) => r.data),

  declinePartner: (token: string) =>
    apiClient
      .delete(`/registrations/confirm/${token}`)
      .then((r) => r.data),

  searchUsers: (name: string) =>
    apiClient
      .get<UserSearchResult[]>(`/users/search?name=${encodeURIComponent(name)}`)
      .then((r) => r.data),
};
