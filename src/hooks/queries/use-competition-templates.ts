import { useQuery } from '@tanstack/react-query';
import { competitionTemplatesApi } from '@/lib/api/competition-templates';

export function useCompetitionTemplates() {
  return useQuery({
    queryKey: ['competition-templates'],
    queryFn: competitionTemplatesApi.listActive,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAllCompetitionTemplates() {
  return useQuery({
    queryKey: ['competition-templates', 'all'],
    queryFn: competitionTemplatesApi.listAll,
  });
}
