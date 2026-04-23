import { BasePage } from './base-page';

export class CompetitionCreatePage extends BasePage {
  async goto() {
    await this.page.goto('/dashboard/competitions/new');
    await this.waitForReady();
  }

  async fillStep1(opts: { name: string; eventDate: string; venue: string }) {
    await this.page.getByLabel('Název soutěže').fill(opts.name);
    await this.page.locator('input[type="date"]').first().fill(opts.eventDate);
    await this.page.getByLabel('Místo konání').fill(opts.venue);
    await this.page.getByRole('button', { name: /pokračovat|next|dále/i }).click();
  }

  async skipToSubmit() {
    // Skip template step
    const skip = this.page.getByRole('button', { name: /bez šablony|skip|přeskočit/i });
    if (await skip.isVisible()) await skip.click();
    await this.page.getByRole('button', { name: /vytvořit|uložit|submit/i }).last().click();
  }

  async expectCompetitionCreated() {
    await this.page.waitForURL(/\/competitions\/[^/]+$/, { timeout: 15_000 });
  }
}
