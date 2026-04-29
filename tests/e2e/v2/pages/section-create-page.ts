import { BasePage } from './base-page';

export class SectionCreatePage extends BasePage {
  async goto(competitionId: string) {
    await this.page.goto(`/dashboard/competitions/${competitionId}/sections/new`);
    await this.waitForReady();
  }

  async createSection(opts: { name: string }) {
    await this.page.getByLabel(/název|name/i).first().fill(opts.name);
    await this.page.getByRole('button', { name: /uložit|vytvořit|save/i }).click();
  }
}
