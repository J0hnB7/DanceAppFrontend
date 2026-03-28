import apiClient from "@/lib/api-client";

export interface ActivityEvent {
  id: string;
  eventType:
    | "PAIR_REGISTERED"
    | "PAIR_PUBLIC_REGISTERED"
    | "PAIR_WITHDRAWN"
    | "ROUND_STARTED"
    | "ROUND_CLOSED"
    | "RESULTS_PUBLISHED"
    | "JUDGE_CONNECTED"
    | "CHECKIN_OPENED"
    | "CHECKIN_CLOSED"
    | "COMPETITION_STARTED"
    | "COMPETITION_COMPLETED";
  metadata: string | null;
  createdAt: string;
}

export async function fetchActivityFeed(competitionId: string): Promise<ActivityEvent[]> {
  const { data } = await apiClient.get<ActivityEvent[]>(
    `/competitions/${competitionId}/activity`
  );
  return data;
}
