import apiClient from "@/lib/api-client";

export interface OrganizerUser {
  id: string;
  name: string;
  email: string;
  organizationName?: string;
  role: string;
  emailVerified: boolean;
  pending: boolean;
}

export interface InviteOrganizerRequest {
  email: string;
  name: string;
}

export const organizersApi = {
  list: () =>
    apiClient.get<OrganizerUser[]>("/admin/organizers").then((r) => r.data),

  invite: (req: InviteOrganizerRequest) =>
    apiClient.post<{ invitationId: string; expiresAt: string }>("/admin/organizer-invitations", req).then((r) => r.data),

  assignToCompetition: (competitionId: string, organizerId: string | null) =>
    apiClient.put(`/competitions/${competitionId}/organizer`, { organizerId }),
};
