import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { roundsApi, type CreateRoundRequest } from "@/lib/api/rounds";

export const roundKeys = {
  all: ["rounds"] as const,
  lists: (sectionId: string) => [...roundKeys.all, sectionId, "list"] as const,
  detail: (roundId: string) => [...roundKeys.all, "detail", roundId] as const,
  submissionStatus: (roundId: string) => [...roundKeys.detail(roundId), "submission-status"] as const,
};

export function useRounds(sectionId: string) {
  return useQuery({
    queryKey: roundKeys.lists(sectionId),
    queryFn: () => roundsApi.list(sectionId),
    enabled: !!sectionId,
  });
}

export function useRound(roundId: string) {
  return useQuery({
    queryKey: roundKeys.detail(roundId),
    queryFn: () => roundsApi.get(roundId),
    enabled: !!roundId,
  });
}

export function useSubmissionStatus(roundId: string) {
  return useQuery({
    queryKey: roundKeys.submissionStatus(roundId),
    queryFn: () => roundsApi.getSubmissionStatus(roundId),
    enabled: !!roundId,
    refetchInterval: 10_000, // poll every 10s during active round
  });
}

export function useCreateRound(sectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRoundRequest) => roundsApi.create(sectionId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: roundKeys.lists(sectionId) });
    },
  });
}

export function useRoundAction(roundId: string) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: roundKeys.detail(roundId) });
  return {
    open: useMutation({ mutationFn: () => roundsApi.open(roundId), onSuccess: invalidate }),
    start: useMutation({ mutationFn: () => roundsApi.start(roundId), onSuccess: invalidate }),
    close: useMutation({ mutationFn: () => roundsApi.close(roundId), onSuccess: invalidate }),
    calculate: useMutation({ mutationFn: () => roundsApi.calculateResults(roundId), onSuccess: invalidate }),
  };
}
