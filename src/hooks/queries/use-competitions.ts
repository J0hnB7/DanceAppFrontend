import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { competitionsApi, type CompetitionStatus, type CompetitionSummary, type CreateCompetitionRequest, type UpdateCompetitionRequest } from "@/lib/api/competitions";
import { toast } from "@/hooks/use-toast";
import { getT } from "@/lib/i18n";

export const competitionKeys = {
  all: ["competitions"] as const,
  lists: () => [...competitionKeys.all, "list"] as const,
  list: (params?: { status?: CompetitionStatus }) =>
    [...competitionKeys.lists(), params] as const,
  details: () => [...competitionKeys.all, "detail"] as const,
  detail: (id: string) => [...competitionKeys.details(), id] as const,
};

export function useCompetitions(params?: { status?: CompetitionStatus }) {
  return useQuery({
    queryKey: competitionKeys.list(params),
    queryFn: () => competitionsApi.list(params),
  });
}

export function useCompetition(id: string) {
  return useQuery({
    queryKey: competitionKeys.detail(id),
    queryFn: () => competitionsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateCompetition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCompetitionRequest) => competitionsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: competitionKeys.lists() });
      toast({ title: getT()("competitions.created"), variant: "success" } as Parameters<typeof toast>[0]);
    },
  });
}

export function useUpdateCompetition(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateCompetitionRequest) => competitionsApi.update(id, data),
    onSuccess: (updated) => {
      qc.setQueryData(competitionKeys.detail(id), updated);
      qc.invalidateQueries({ queryKey: competitionKeys.lists() });
    },
  });
}

export function useDeleteCompetition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => competitionsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: competitionKeys.lists() });
    },
  });
}

export function useToggleRegistration(id: string, registrationOpen: boolean) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (registrationOpen) {
        return competitionsApi.closeRegistration(id);
      }
      return competitionsApi.openRegistration(id);
    },
    onSuccess: (updated) => {
      // Update detail cache
      qc.setQueryData(competitionKeys.detail(id), updated);
      // Patch every cached list to flip registrationOpen for this competition
      qc.setQueriesData<CompetitionSummary[]>(
        { queryKey: competitionKeys.lists() },
        (old) => old?.map((c) => c.id === id ? { ...c, registrationOpen: !registrationOpen } : c)
      );
      const t = getT();
      toast({
        title: registrationOpen ? t("competition.registrationClosed") : t("competition.registrationOpened"),
        variant: registrationOpen ? "default" : "success",
      } as Parameters<typeof toast>[0]);
    },
  });
}
