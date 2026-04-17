import apiClient from "@/lib/api-client";

export interface SelfRegistrationResponse {
  pairId: string;
  pairSectionId: string;
  startNumber: number;
  sectionName: string;
  status: "REGISTERED" | "PENDING_PARTNER";
  confirmToken: string | null;
}

export const selfRegistrationApi = {
  register: (competitionId: string, sectionId: string) =>
    apiClient
      .post<SelfRegistrationResponse>(
        `/competitions/${competitionId}/pairs/self-register`,
        { sectionId }
      )
      .then((r) => r.data),
};
