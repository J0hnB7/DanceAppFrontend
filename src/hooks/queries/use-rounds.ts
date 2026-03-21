import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { roundsApi, type CompleteRoundRequest } from "@/lib/api/rounds";

export const roundKeys = {
  all: ["rounds"] as const,
  lists: (sectionId: string) => [...roundKeys.all, sectionId, "list"] as const,
  detail: (roundId: string) => [...roundKeys.all, "detail", roundId] as const,
  submissionStatus: (roundId: string) => [...roundKeys.detail(roundId), "submission-status"] as const,
};

export function useRounds(competitionId: string, sectionId: string) {
  return useQuery({
    queryKey: roundKeys.lists(sectionId),
    queryFn: () => roundsApi.list(competitionId, sectionId),
    enabled: !!sectionId && !!competitionId,
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
    refetchInterval: 10_000,
  });
}

export function useOpenRound(competitionId: string, sectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => roundsApi.open(competitionId, sectionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: roundKeys.lists(sectionId) });
    },
  });
}

export function useCompleteRound(competitionId: string, sectionId: string, roundId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data?: CompleteRoundRequest) => roundsApi.complete(competitionId, sectionId, roundId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: roundKeys.lists(sectionId) });
      qc.invalidateQueries({ queryKey: roundKeys.detail(roundId) });
    },
  });
}

export function useRoundAction(roundId: string) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: roundKeys.detail(roundId) });
  return {
    start: useMutation({ mutationFn: () => roundsApi.start(roundId), onSuccess: invalidate }),
    close: useMutation({ mutationFn: () => roundsApi.close(roundId), onSuccess: invalidate }),
    calculate: useMutation({ mutationFn: () => roundsApi.calculateResults(roundId), onSuccess: invalidate }),
    resolveTie: useMutation({ mutationFn: (choice: "more" | "less") => roundsApi.resolveTie(roundId, choice), onSuccess: invalidate }),
  };
}
