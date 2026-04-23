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
