import apiClient from "@/lib/api-client";

export interface ScheduleSlot {
  id: string;
  competitionId: string;
  sectionId: string;
  sectionName: string;
  roundType: "PRELIMINARY" | "SEMIFINAL" | "FINAL";
  startsAt: string; // ISO
  durationMinutes: number;
  floor: string;
  notes?: string;
  orderIndex: number;
}

export interface CreateSlotRequest {
  sectionId: string;
  roundType: "PRELIMINARY" | "SEMIFINAL" | "FINAL";
  startsAt: string;
  durationMinutes: number;
  floor?: string;
  notes?: string;
}

export interface UpdateSlotRequest extends Partial<CreateSlotRequest> {
  orderIndex?: number;
}

export const scheduleApi = {
  list: (competitionId: string) =>
    apiClient.get<ScheduleSlot[]>(`/competitions/${competitionId}/schedule`).then((r) => r.data),

  create: (competitionId: string, data: CreateSlotRequest) =>
    apiClient.post<ScheduleSlot>(`/competitions/${competitionId}/schedule`, data).then((r) => r.data),

  update: (competitionId: string, slotId: string, data: UpdateSlotRequest) =>
    apiClient.put<ScheduleSlot>(`/competitions/${competitionId}/schedule/${slotId}`, data).then((r) => r.data),

  remove: (competitionId: string, slotId: string) =>
    apiClient.delete(`/competitions/${competitionId}/schedule/${slotId}`).then((r) => r.data),

  reorder: (competitionId: string, orderedIds: string[]) =>
    apiClient.put(`/competitions/${competitionId}/schedule/reorder`, { orderedIds }).then((r) => r.data),
};
