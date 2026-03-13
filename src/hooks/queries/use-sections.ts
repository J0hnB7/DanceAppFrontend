import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sectionsApi, type CreateSectionRequest } from "@/lib/api/sections";

export const sectionKeys = {
  all: ["sections"] as const,
  lists: (competitionId: string) => [...sectionKeys.all, competitionId, "list"] as const,
  detail: (competitionId: string, sectionId: string) =>
    [...sectionKeys.all, competitionId, sectionId] as const,
};

export function useSections(competitionId: string) {
  return useQuery({
    queryKey: sectionKeys.lists(competitionId),
    queryFn: () => sectionsApi.list(competitionId),
    enabled: !!competitionId,
  });
}

export function useSection(competitionId: string, sectionId: string) {
  return useQuery({
    queryKey: sectionKeys.detail(competitionId, sectionId),
    queryFn: () => sectionsApi.get(competitionId, sectionId),
    enabled: !!competitionId && !!sectionId,
  });
}

export function useCreateSection(competitionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSectionRequest) => sectionsApi.create(competitionId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sectionKeys.lists(competitionId) });
    },
  });
}

export function useDeleteSection(competitionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sectionId: string) => sectionsApi.delete(competitionId, sectionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sectionKeys.lists(competitionId) });
    },
  });
}
