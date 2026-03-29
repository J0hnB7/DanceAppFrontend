import apiClient from "@/lib/api-client";

export interface PreliminaryScheduleSettings {
  startTime: string;       // "HH:mm"
  pairsPerHeat: number;
  minutesPerDance: number;
}

export interface RoundTimeline {
  roundType: string;
  heatCount: number;
  danceCount: number;
  durationMinutes: number;
  startTime: string;   // "HH:mm"
  endTime: string;     // "HH:mm"
}

export interface SectionTimeline {
  sectionId: string;
  sectionName: string;
  pairCount: number;
  rounds: RoundTimeline[];
}

export interface PreliminaryScheduleResponse {
  settings: PreliminaryScheduleSettings;
  timeline: SectionTimeline[];
  totalDurationMinutes: number;
  estimatedEndTime: string;   // "HH:mm"
}

export const preliminaryScheduleApi = {
  get: (competitionId: string): Promise<PreliminaryScheduleResponse> =>
    apiClient.get(`/competitions/${competitionId}/preliminary-schedule`).then((r) => r.data),

  saveSettings: (
    competitionId: string,
    settings: PreliminaryScheduleSettings
  ): Promise<PreliminaryScheduleSettings> =>
    apiClient
      .put(`/competitions/${competitionId}/preliminary-schedule/settings`, settings)
      .then((r) => r.data),
};
