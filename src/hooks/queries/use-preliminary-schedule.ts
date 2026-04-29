import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiMutation } from "@/hooks/use-api-mutation";
import {
  preliminaryScheduleApi,
  type PreliminaryScheduleSettings,
} from "@/lib/api/preliminary-schedule";

export function usePreliminarySchedule(competitionId: string) {
  return useQuery({
    queryKey: ["preliminary-schedule", competitionId],
    queryFn: () => preliminaryScheduleApi.get(competitionId),
    enabled: !!competitionId,
    retry: (failureCount, error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404) return false;
      return failureCount < 2;
    },
  });
}

export function useSavePreliminaryScheduleSettings(competitionId: string) {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (settings: PreliminaryScheduleSettings) =>
      preliminaryScheduleApi.saveSettings(competitionId, settings),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["preliminary-schedule", competitionId] });
    },
  });
}
