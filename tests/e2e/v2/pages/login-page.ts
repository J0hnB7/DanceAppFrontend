import { BasePage } from './base-page';

export class LoginPage extends BasePage {
  async goto() {
    await this.page.goto('/login');
    // Wait for hydration — label text transitions from   to actual text after mount
    await this.page.locator('form.auth-light').waitFor({ state: 'visible', timeout: 10_000 });
  }

  async loginWith(email: string, password: string) {
    await this.page.locator('input[type="email"]').fill(email);
    await this.page.locator('input[type="password"]').fill(password);
    await this.page.locator('button[type="submit"]').click();
  }

  async expectError() {
    const err = this.page.getByRole('alert');
    await err.waitFor({ state: 'visible', timeout: 5_000 });
    return err.textContent();
  }
}
