import { BasePage } from './base-page';

export class DashboardPage extends BasePage {
  async expectLoaded() {
    await this.page.waitForURL(/\/dashboard/, { timeout: 10_000 });
    await this.waitForReady();
    await this.waitForNoSpinner();
  }

  async expectHeadingVisible() {
    await this.page.getByRole('heading').first().waitFor({ state: 'visible', timeout: 8_000 });
  }

  clickNewCompetition() {
    return this.page.getByRole('link', { name: /nová soutěž|new competition/i }).click();
  }
}
