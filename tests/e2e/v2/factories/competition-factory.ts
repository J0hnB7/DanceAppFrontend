import { createApiClient } from './api-client';
import { TEST_PREFIX } from '../helpers/test-prefix';

export interface CompetitionContext {
  id: string;
  name: string;
}

export interface CompetitionWithSectionContext {
  competitionId: string;
  sectionId: string;
  competitionName: string;
}

export async function createCompetition(
  token: string,
  label = 'comp'
): Promise<CompetitionContext> {
  const api = await createApiClient();
  const name = `${TEST_PREFIX}${label}`;
  const { id } = await api.createCompetition(token, {
    name,
    eventDate: '2099-12-31',
    venue: 'Test Venue',
    contactEmail: 'test@test.local',
    federation: 'NATIONAL',
    roleMode: 'ORGANIZER_ONLY',
  });
  await api.dispose();
  return { id, name };
}

export async function createCompetitionWithSection(
  token: string,
  opts: {
    label?: string;
    sectionName?: string;
    ageCategory?: string;
    danceStyle?: string;
    level?: string;
    dances?: string[];
    numberOfJudges?: number;
  } = {}
): Promise<CompetitionWithSectionContext> {
  const api = await createApiClient();
  const competitionName = `${TEST_PREFIX}${opts.label ?? 'comp'}`;
  const { id: competitionId } = await api.createCompetition(token, {
    name: competitionName,
    eventDate: '2099-12-31',
    venue: 'Test Venue',
    contactEmail: 'test@test.local',
    federation: 'NATIONAL',
    roleMode: 'ORGANIZER_ONLY',
  });
  const { id: sectionId } = await api.createSection(token, competitionId, {
    name: opts.sectionName ?? 'Test Section',
    ageCategory: opts.ageCategory ?? 'ADULT',
    danceStyle: opts.danceStyle ?? 'LATIN',
    level: opts.level ?? 'D',
    competitorType: 'AMATEURS',
    competitionType: 'COUPLE',
    dances: opts.dances ?? ['CHA_CHA', 'SAMBA'],
    numberOfJudges: opts.numberOfJudges ?? 3,
  });
  await api.dispose();
  return { competitionId, sectionId, competitionName };
}
