import { BasePage } from './base-page';

export class RegisterPage extends BasePage {
  async goto() {
    await this.page.goto('/register');
    await this.waitForReady();
  }

  async registerDancer(opts: { firstName: string; lastName: string; email: string; password: string }) {
    await this.page.getByLabel('Jméno').fill(opts.firstName);
    await this.page.getByLabel('Příjmení').fill(opts.lastName);
    await this.page.getByLabel('Email').fill(opts.email);
    await this.page.getByLabel('Heslo').fill(opts.password);
    await this.page.locator('#gdpr-dancer').check();
    await this.page.getByRole('button', { name: /vytvořit účet/i }).click();
  }

  async expectSuccess() {
    await this.page.waitForURL(/\/onboarding|\/dashboard/, { timeout: 10_000 });
  }
}
