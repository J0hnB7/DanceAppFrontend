import { BasePage } from './base-page';

export class ResultsPage extends BasePage {
  async goto(competitionId: string, sectionId: string) {
    await this.page.goto(`/competitions/${competitionId}/sections/${sectionId}/results`);
    await this.waitForReady();
    await this.waitForNoSpinner();
  }

  async expectPlacement(pairNumber: number, expectedRank: number) {
    const row = this.page.locator(`tr:has-text("${pairNumber}")`).first();
    await row.getByText(new RegExp(`^${expectedRank}\\.?$`)).waitFor({ state: 'visible', timeout: 8_000 });
  }
}
