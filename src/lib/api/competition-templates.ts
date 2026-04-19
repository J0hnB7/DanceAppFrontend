import apiClient from "@/lib/api-client";

export interface SectionTemplateItem {
  name: string;
  ageCategory?: string;
  level?: string;
  danceStyle?: string;
  numberOfJudges: number;
  maxFinalPairs: number;
  competitorType?: string;
  competitionType?: string;
  series?: string;
  dances?: { danceName?: string }[];
  minBirthYear?: number | null;
  maxBirthYear?: number | null;
}

export interface CompetitionTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  sections: SectionTemplateItem[];
  displayOrder: number;
  active: boolean;
  updatedAt: string; // ISO datetime
}

export const competitionTemplatesApi = {
  listActive: (): Promise<CompetitionTemplate[]> =>
    apiClient.get('/competition-templates').then(r => r.data),
  listAll: (): Promise<CompetitionTemplate[]> =>
    apiClient.get('/competition-templates/all').then(r => r.data),
  create: (req: Omit<CompetitionTemplate, 'id'>): Promise<CompetitionTemplate> =>
    apiClient.post('/competition-templates', req).then(r => r.data),
  update: (id: string, req: Omit<CompetitionTemplate, 'id'>): Promise<CompetitionTemplate> =>
    apiClient.put(`/competition-templates/${id}`, req).then(r => r.data),
  delete: (id: string): Promise<void> =>
    apiClient.delete(`/competition-templates/${id}`),
};
