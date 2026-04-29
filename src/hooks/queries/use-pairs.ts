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

// Scoped invalidator — only refetches lists for THIS competition. Using pairKeys.all
// triggered an N×M refetch storm: every cached pair list across all competitions and
// sections re-fetched on every pair edit. The "all" key is reserved for explicit
// "drop everything" actions (logout, full state reset).
function invalidateCompetitionPairs(qc: ReturnType<typeof useQueryClient>, competitionId: string) {
  qc.invalidateQueries({ queryKey: ["pairs", competitionId] });
}

function logMutationError(operation: string, err: unknown) {
  // Sentry's React Query integration auto-captures useMutation errors; this gives
  // a domain-prefixed breadcrumb for triage.
  console.error(`[pairs] ${operation} failed:`, err);
}

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
    onSuccess: () => invalidateCompetitionPairs(qc, competitionId),
    onError: (err) => logMutationError("create", err),
  });
}

export function useDeletePair(competitionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pairId: string) => pairsApi.delete(competitionId, pairId),
    onSuccess: () => invalidateCompetitionPairs(qc, competitionId),
    onError: (err) => logMutationError("delete", err),
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
    onSuccess: () => invalidateCompetitionPairs(qc, competitionId),
    onError: (err) => logMutationError("removeFromSection", err),
  });
}

export function useImportPairs(competitionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => pairsApi.importCsv(competitionId, file),
    onSuccess: () => invalidateCompetitionPairs(qc, competitionId),
    onError: (err) => logMutationError("import", err),
  });
}
