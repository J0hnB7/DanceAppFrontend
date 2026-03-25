/**
 * TypeScript interfaces for all SSE payload types emitted by the backend.
 * Events are received via useSSE(competitionId, eventType, handler).
 */

export interface JudgeConnectedPayload {
  type: "JUDGE_CONNECTED";
  judgeTokenId: string;
  competitionId: string;
}

export interface JudgeDisconnectedPayload {
  type: "JUDGE_DISCONNECTED";
  judgeTokenId: string;
  competitionId: string;
}

export interface ScoreSubmittedPayload {
  type: "SCORE_SUBMITTED";
  roundId: string;
  judgeTokenId: string;
  scoreType: "CALLBACK" | "PLACEMENT";
  heatId?: string;
}

export interface HeatSentPayload {
  type: "HEAT_SENT";
  heatId: string;
  roundId: string;
  pairIds: string[];
  heatNumber: number;
}

export interface AllSubmittedPayload {
  type: "HEAT_ALL_SUBMITTED";
  heatId: string;
  roundId: string;
}

export interface ResultsPublishedPayload {
  type: "RESULTS_PUBLISHED";
  roundId: string;
  sectionId: string;
}

export interface RoundStatusPayload {
  type: "ROUND_STATUS_CHANGED";
  roundId: string;
  sectionId: string;
  status: "CREATED" | "OPEN" | "IN_PROGRESS" | "SCORING" | "CLOSED" | "RESULTS_PUBLISHED";
  eventId: string;
}

export interface FloorControlPayload {
  type: "FLOOR_CONTROL";
  competitionId: string;
  danceName: string;
  heatNumber: number;
}

export interface IncidentAddedPayload {
  type: "INCIDENT_ADDED";
  competitionId: string;
  incidentId: string;
  pairId?: string;
  incidentType: "WITHDRAWAL" | "PENALTY" | "DQ" | "INJURY" | "TECHNICAL";
  roundId?: string;
}

/** Union of all SSE payload types */
export type SSEPayload =
  | JudgeConnectedPayload
  | JudgeDisconnectedPayload
  | ScoreSubmittedPayload
  | HeatSentPayload
  | AllSubmittedPayload
  | ResultsPublishedPayload
  | RoundStatusPayload
  | FloorControlPayload
  | IncidentAddedPayload;

/** SSE event type strings used with useSSE hook */
export type SSEEventType = SSEPayload["type"];
