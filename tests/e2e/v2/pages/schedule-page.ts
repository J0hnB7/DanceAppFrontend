import { BasePage } from './base-page';

export class SchedulePage extends BasePage {
  async goto(competitionId: string) {
    await this.page.goto(`/dashboard/competitions/${competitionId}/schedule`);
    await this.waitForReady();
    await this.waitForNoSpinner();
  }

  async expectScheduleLoaded() {
    await this.page.locator('[data-testid="schedule-builder"], .schedule-container, h1, h2').first()
      .waitFor({ state: 'visible', timeout: 10_000 });
  }
}
