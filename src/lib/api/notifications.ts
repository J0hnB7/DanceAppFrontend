import apiClient from "@/lib/api-client";

export interface NotificationDto {
  id: string;
  competitionId: string;
  subject: string;
  recipientType?: "ALL_PAIRS" | "SECTION" | "INDIVIDUAL";
  sectionId?: string;
  recipientEmail?: string;
  sentAt?: string;
  status: "PENDING" | "SENT" | "FAILED";
  bodyContent?: string;
}

export interface ComposeNotificationRequest {
  subject: string;
  body: string;
  recipientType: "ALL_PAIRS" | "SECTION" | "INDIVIDUAL";
  sectionId?: string;
  recipientEmail?: string;
}

export const notificationsApi = {
  list: (competitionId: string) =>
    apiClient.get<NotificationDto[]>(`/competitions/${competitionId}/notifications`).then((r) => r.data),

  send: (competitionId: string, data: ComposeNotificationRequest) =>
    apiClient
      .post<NotificationDto[]>(`/competitions/${competitionId}/notifications/compose`, data)
      .then((r) => r.data),
};
