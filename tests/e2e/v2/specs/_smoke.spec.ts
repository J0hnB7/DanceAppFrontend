import { test, expect } from '../fixtures/test-fixtures';
import { createApiClient } from '../factories/api-client';
import { testEmail } from '../helpers/test-prefix';
import { LoginPage } from '../pages/login-page';

test('framework smoke: register via API + login via UI', async ({ page }) => {
  const api = await createApiClient();
  const email = testEmail('smoke-1');
  const password = 'Pass1234!';

  await api.register({ email, password, name: 'Smoke Test' });
  await api.dispose();

  const login = new LoginPage(page);
  await login.goto();
  await login.loginWith(email, password);

  await page.waitForURL(/\/dashboard/);
  await expect(page.getByRole('heading').first()).toBeVisible();
});
