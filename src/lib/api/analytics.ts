import apiClient from "@/lib/api-client";

export interface RegistrationActivityPoint {
  date: string;
  count: number;
}

export interface PresencePair {
  id: string;
  presenceStatus: "ABSENT" | "CHECKED_IN" | "ON_FLOOR" | "DONE";
}

export const analyticsApi = {
  registrationActivity: (days = 14): Promise<RegistrationActivityPoint[]> =>
    apiClient
      .get<RegistrationActivityPoint[]>("/organizer/analytics/registration-activity", {
        params: { days },
      })
      .then((r) => r.data),

  presence: (competitionId: string): Promise<PresencePair[]> =>
    apiClient
      .get<PresencePair[]>(`/competitions/${competitionId}/presence`)
      .then((r) => r.data),
};
