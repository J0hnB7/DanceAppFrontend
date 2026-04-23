import { BasePage } from './base-page';

export class LiveControlPage extends BasePage {
  async goto(competitionId: string) {
    await this.page.goto(`/dashboard/competitions/${competitionId}/live`);
    await this.waitForReady();
    await this.waitForNoSpinner();
  }

  async openHeatRound(sectionId: string) {
    await this.page.getByRole('button', { name: /otevřít|start heat|heat/i }).first().click();
  }

  async calculateResults(sectionId: string) {
    await this.page.getByRole('button', { name: /výsledky|calculate|vypočítat/i }).click();
  }

  async approveResults() {
    await this.page.getByRole('button', { name: /publikovat|approve|zveřejnit/i }).click();
  }
}
