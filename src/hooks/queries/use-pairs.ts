import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { pairsApi, type CreatePairRequest } from "@/lib/api/pairs";
import type { RemovePairSectionDto } from "@/lib/api/pairs";

export const pairKeys = {
  all: ["pairs"] as const,
  lists: (competitionId: string, sectionId?: string) =>
    [...pairKeys.all, competitionId, sectionId ?? "all"] as const,
  detail: (competitionId: string, pairId: string) =>
    [...pairKeys.all, competitionId, "detail", pairId] as const,
};

export function usePairs(competitionId: string, sectionId?: string) {
  return useQuery({
    queryKey: pairKeys.lists(competitionId, sectionId),
    queryFn: () => pairsApi.list(competitionId, sectionId),
    enabled: !!competitionId,
  });
}

export function useCreatePair(competitionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePairRequest) => pairsApi.create(competitionId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pairKeys.all });
    },
  });
}

export function useDeletePair(competitionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pairId: string) => pairsApi.delete(competitionId, pairId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pairKeys.all });
    },
  });
}

export function useRemovePairFromSection(competitionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pairId, sectionId }: { pairId: string; sectionId: string }) =>
      apiClient
        .delete<RemovePairSectionDto>(
          `/competitions/${competitionId}/pairs/${pairId}/sections/${sectionId}`
        )
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pairs", competitionId] });
    },
  });
}

export function useImportPairs(competitionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => pairsApi.importCsv(competitionId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pairKeys.all });
    },
  });
}
