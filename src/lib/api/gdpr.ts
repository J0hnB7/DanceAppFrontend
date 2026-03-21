import apiClient from "@/lib/api-client";

export const gdprApi = {
  /** Export all personal data for a user — GET /users/{userId}/data-export */
  exportData: (userId: string) =>
    apiClient.get<Record<string, unknown>>(`/users/${userId}/data-export`).then((r) => r.data),

  /** Request deletion of personal data — DELETE /users/{userId}/personal-data */
  deletePersonalData: (userId: string) =>
    apiClient.delete(`/users/${userId}/personal-data`).then((r) => r.data),
};
