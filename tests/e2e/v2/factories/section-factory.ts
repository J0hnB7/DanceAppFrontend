import { createApiClient } from './api-client';

export interface SectionContext {
  id: string;
}

export async function createSection(
  token: string,
  competitionId: string,
  opts: Partial<{
    name: string;
    ageCategory: string;
    danceStyle: string;
    level: string;
    dances: string[];
    numberOfJudges: number;
    minBirthYear: number;
    maxBirthYear: number;
    competitionType: string;
  }> = {}
): Promise<SectionContext> {
  const api = await createApiClient();
  const { id } = await api.createSection(token, competitionId, {
    name: opts.name ?? 'Test Section',
    ageCategory: opts.ageCategory ?? 'ADULT',
    danceStyle: opts.danceStyle ?? 'LATIN',
    level: opts.level ?? 'D',
    competitorType: 'AMATEURS',
    competitionType: opts.competitionType ?? 'COUPLE',
    dances: opts.dances ?? ['CHA_CHA', 'SAMBA'],
    numberOfJudges: opts.numberOfJudges ?? 3,
    ...(opts.minBirthYear != null && { minBirthYear: opts.minBirthYear }),
    ...(opts.maxBirthYear != null && { maxBirthYear: opts.maxBirthYear }),
  });
  await api.dispose();
  return { id };
}
