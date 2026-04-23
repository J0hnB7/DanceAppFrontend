import { BasePage } from './base-page';

export class JudgeScoringPage extends BasePage {
  async selectPair(pairNumber: number) {
    await this.page.getByRole('button', { name: new RegExp(`^${pairNumber}$`) }).click();
  }

  async markX(danceIndex = 0) {
    const markButtons = this.page.getByRole('button', { name: /✓|X|mark/i });
    await markButtons.nth(danceIndex).click();
  }

  async submitHeat() {
    await this.page.getByRole('button', { name: /odeslat|submit|potvrdit/i }).click();
  }

  async placePair(rank: number, pairNumber: number) {
    const rankInput = this.page.locator(`input[data-pair="${pairNumber}"], input[aria-label*="${pairNumber}"]`).first();
    await rankInput.fill(String(rank));
  }

  async submitFinal() {
    await this.page.getByRole('button', { name: /odeslat|submit/i }).click();
  }
}
