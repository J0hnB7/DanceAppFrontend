import { BasePage } from './base-page';

export class CompetitionDetailPage extends BasePage {
  async goto(competitionId: string) {
    await this.page.goto(`/dashboard/competitions/${competitionId}`);
    await this.waitForReady();
    await this.waitForNoSpinner();
  }

  async clickPresence() {
    await this.page.getByRole('link', { name: /přítomnost|presence|check.in/i }).click();
  }

  async clickSchedule() {
    await this.page.getByRole('link', { name: /harmonogram|schedule/i }).click();
  }

  async clickLiveControl() {
    await this.page.getByRole('link', { name: /live|řízení/i }).click();
  }
}
