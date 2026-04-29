import { createApiClient } from './api-client';
import { testEmail } from '../helpers/test-prefix';

export interface DancerContext {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export async function createDancer(label = 'dancer'): Promise<DancerContext> {
  const api = await createApiClient();
  const email = testEmail(label);
  const password = 'Dancer1234!';
  const firstName = 'Test';
  const lastName = `Dancer-${label}`;
  await api.registerDancer({ email, password, firstName, lastName });
  await api.dispose();
  return { email, password, firstName, lastName };
}

export async function createDancerWithProfile(
  label: string,
  opts: { birthYear?: number; club?: string } = {}
): Promise<DancerContext> {
  const api = await createApiClient();
  const email = testEmail(label);
  const password = 'Dancer1234!';
  const firstName = 'Test';
  const lastName = `Dancer-${label}`;
  await api.registerDancer({ email, password, firstName, lastName });
  const token = await api.login(email, password);
  await api.updateDancerProfile(token, {
    firstName,
    lastName,
    birthYear: opts.birthYear,
    club: opts.club ?? 'Test Club',
  });
  await api.dispose();
  return { email, password, firstName, lastName };
}
