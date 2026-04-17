import apiClient from "@/lib/api-client";

/** Replace legacy "Předkolo" in stored labels with "Kolo N" using roundNumber. */
function normalizeSlotLabel(slot: ScheduleSlot): ScheduleSlot {
  if (slot.roundNumber && /předkolo/i.test(slot.label)) {
    return { ...slot, label: slot.label.replace(/předkolo/gi, `Kolo ${slot.roundNumber}`) };
  }
  return slot;
}

function normalizeSlots(slots: ScheduleSlot[]): ScheduleSlot[] {
  return slots.map(normalizeSlotLabel);
}

export type ScheduleBlockType = "ROUND" | "BREAK" | "JUDGE_BREAK" | "AWARD_CEREMONY" | "CUSTOM";
export type BlockLiveStatus = "NOT_STARTED" | "RUNNING" | "COMPLETED";
export type ScheduleStatus = "DRAFT" | "PUBLISHED";

export interface ScheduleSlot {
  id: string;
  competitionId: string;
  sectionId: string | null;
  roundId: string | null;
  label: string;
  startTime: string; // LocalDateTime as ISO string
  durationMinutes: number;
  orderIndex: number;
  type: ScheduleBlockType;
  liveStatus: BlockLiveStatus;
  manuallyMoved: boolean;
  suggested: boolean;
  durationLocked: boolean;
  roundNumber: number | null;
  danceStyle: string | null;
}

export interface CompetitionSchedule {
  id: string;
  status: ScheduleStatus;
  publishedAt: string | null;
  version: number;
}

export interface SectionMerge {
  id: string;
  competitionId: string;
  primarySectionId: string;
  mergedSectionId: string;
  mergedLabel: string;
}

export interface ProgressionRound {
  roundNumber: number;
  type: string;
  startingPairs: number;
  advancing: number;
  heatCount: number;
  estimatedMinutes: number;
}

export interface ProgressionPreview {
  rounds: ProgressionRound[];
  totalEstimatedMinutes: number;
}

// Legacy fields kept for backward compatibility
export interface CreateSlotRequest {
  sectionId: string;
  roundType: "PRELIMINARY" | "SEMIFINAL" | "FINAL";
  startsAt: string;
  durationMinutes: number;
  floor?: string;
  notes?: string;
}

export interface ScheduleConfig {
  scheduleStartTime?: string;
  danceDurationSeconds?: number;
  transitionDurationSeconds?: number;
  maxPairsOnFloor?: number;
  breakDurationMinutes?: number;
  breakRule?: "AFTER_ROUND" | "BETWEEN_CATEGORIES" | "BOTH";
  judgeBreakAfterMinutes?: number;
  judgeBreakDurationMinutes?: number;
  slotBufferMinutes?: number;
}

export interface HeatPairEntry {
  pairId: string;
  startNumber: number;
  dancer1: string; // "Příjmení Jméno"
  dancer2: string;
  club: string;
}

export interface HeatAssignmentGroup {
  heatNumber: number;
  pairs: HeatPairEntry[];        // order for first dance (backward compat)
  pairsByDance?: Record<string, HeatPairEntry[]>; // per-dance shuffle; null = old data
}

export const scheduleApi = {
  list: (competitionId: string) =>
    apiClient.get<ScheduleSlot[]>(`/competitions/${competitionId}/schedule`).then((r) => normalizeSlots(r.data)),

  generate: (competitionId: string, startTime?: string) =>
    apiClient
      .post<ScheduleSlot[]>(`/competitions/${competitionId}/schedule/generate`, { startTime })
      .then((r) => normalizeSlots(r.data)),

  publish: (competitionId: string) =>
    apiClient
      .post<CompetitionSchedule>(`/competitions/${competitionId}/schedule/publish`)
      .then((r) => r.data),

  getStatus: (competitionId: string) =>
    apiClient
      .get<CompetitionSchedule>(`/competitions/${competitionId}/schedule/status`)
      .then((r) => r.data),

  reorderSlot: (competitionId: string, slotId: string, newPosition: number) =>
    apiClient
      .patch<ScheduleSlot[]>(`/competitions/${competitionId}/schedule/slots/${slotId}/reorder`, { newPosition })
      .then((r) => normalizeSlots(r.data)),

  insertBreak: (competitionId: string, slotId: string, durationMinutes?: number) =>
    apiClient
      .post<ScheduleSlot[]>(`/competitions/${competitionId}/schedule/slots/${slotId}/break`, {
        durationMinutes,
      })
      .then((r) => normalizeSlots(r.data)),

  updateBlockStatus: (competitionId: string, slotId: string, liveStatus: BlockLiveStatus) =>
    apiClient
      .patch<ScheduleSlot>(`/competitions/${competitionId}/schedule/slots/${slotId}/status`, { liveStatus })
      .then((r) => normalizeSlotLabel(r.data)),

  getMySections: (competitionId: string) =>
    apiClient
      .get<{ sectionIds: string[] }>(`/competitions/${competitionId}/schedule/my-sections`)
      .then((r) => r.data),

  getProgressionPreview: (competitionId: string, pairCount: number, finalSize: number) =>
    apiClient
      .get<ProgressionPreview>(
        `/competitions/${competitionId}/schedule/progression-preview?pairCount=${pairCount}&finalSize=${finalSize}`
      )
      .then((r) => r.data),

  // Legacy CRUD (kept for backward compat)
  create: (competitionId: string, data: CreateSlotRequest) =>
    apiClient.post<ScheduleSlot>(`/competitions/${competitionId}/schedule/slots`, data).then((r) => r.data),

  update: (competitionId: string, slotId: string, data: Partial<CreateSlotRequest>) =>
    apiClient.put<ScheduleSlot>(`/competitions/${competitionId}/schedule/slots/${slotId}`, data).then((r) => r.data),

  remove: (competitionId: string, slotId: string) =>
    apiClient.delete(`/competitions/${competitionId}/schedule/slots/${slotId}`).then((r) => r.data),

  export: (competitionId: string, format: "pdf" | "xlsx" = "pdf") =>
    apiClient.get(`/competitions/${competitionId}/schedule/export?format=${format}`, { responseType: "blob" }),

  getHeatAssignments: (competitionId: string, slotId: string) =>
    apiClient
      .get<HeatAssignmentGroup[]>(`/competitions/${competitionId}/schedule/slots/${slotId}/heat-assignments`)
      .then((r) => r.data),

  drawHeats: (competitionId: string, slotId: string) =>
    apiClient
      .post<HeatAssignmentGroup[]>(`/competitions/${competitionId}/schedule/slots/${slotId}/draw-heats`)
      .then((r) => r.data),

  /** POST /floor-control → broadcasts SSE to all judge interfaces */
  floorControl: (competitionId: string, danceName: string, heatNumber: number) =>
    apiClient
      .post<void>(`/competitions/${competitionId}/floor-control`, { danceName, heatNumber })
      .then((r) => r.data),

  /** POST /slots/{slotId}/activate → 200 ScheduleSlot (idempotent) */
  activateSlot: (competitionId: string, slotId: string) =>
    apiClient
      .post<ScheduleSlot>(`/competitions/${competitionId}/schedule/slots/${slotId}/activate`)
      .then((r) => normalizeSlotLabel(r.data)),

  /** POST /slots/{slotId}/complete → 200 ScheduleSlot (idempotent) */
  completeSlot: (competitionId: string, slotId: string) =>
    apiClient
      .post<ScheduleSlot>(`/competitions/${competitionId}/schedule/slots/${slotId}/complete`)
      .then((r) => normalizeSlotLabel(r.data)),

  /** POST /slots/{slotId}/revert → 200 ScheduleSlot (idempotent) */
  revertSlot: (competitionId: string, slotId: string) =>
    apiClient
      .post<ScheduleSlot>(`/competitions/${competitionId}/schedule/slots/${slotId}/revert`)
      .then((r) => normalizeSlotLabel(r.data)),

  /** POST /slots/{slotId}/assign-advancing-pairs?force=false → 204 */
  assignAdvancingPairs: (competitionId: string, slotId: string, force = false) =>
    apiClient
      .post(`/competitions/${competitionId}/schedule/slots/${slotId}/assign-advancing-pairs?force=${force}`)
      .then((r) => r.data),

  /** GET /rounds/{roundId}/submission-status → {totalJudges, submitted, judges} */
  getSubmissionStatus: (roundId: string) =>
    apiClient
      .get<{ totalJudges: number; submitted: number; judges: { judgeTokenId: string; submitted: boolean; submittedAt: string | null }[] }>(
        `/rounds/${roundId}/submission-status`
      )
      .then((r) => r.data),
};

export const sectionsApi2 = {
  mergeSections: (competitionId: string, data: { primarySectionId: string; mergedSectionId: string; mergedLabel?: string }) =>
    apiClient.post<SectionMerge>(`/competitions/${competitionId}/sections/merge`, data).then((r) => r.data),

  unmergeSections: (competitionId: string, mergeId: string) =>
    apiClient.delete(`/competitions/${competitionId}/sections/merge/${mergeId}`).then((r) => r.data),
};

export const scheduleConfigApi = {
  update: (competitionId: string, config: ScheduleConfig) =>
    apiClient.patch(`/competitions/${competitionId}/schedule-config`, config).then((r) => r.data),
};
