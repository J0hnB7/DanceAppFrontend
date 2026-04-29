import type { Page } from '@playwright/test';

export class BasePage {
  constructor(protected readonly page: Page) {}

  async waitForReady() {
    await this.page.waitForLoadState('domcontentloaded');
  }

  async waitForNoSpinner() {
    const spinner = this.page.locator('[role="progressbar"], .animate-spin');
    await spinner.first().waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {});
  }
}
