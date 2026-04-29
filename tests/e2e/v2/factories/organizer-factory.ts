import { createApiClient } from './api-client';
import { testEmail } from '../helpers/test-prefix';

export interface OrganizerContext {
  email: string;
  password: string;
  accessToken: string;
}

export async function createOrganizer(label = 'org'): Promise<OrganizerContext> {
  const api = await createApiClient();
  const email = testEmail(label);
  const password = 'Organizer1!';
  const { accessToken } = await api.register({
    email,
    password,
    name: `Org ${label}`,
  });
  await api.dispose();
  return { email, password, accessToken };
}
