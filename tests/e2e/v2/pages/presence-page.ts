import { BasePage } from './base-page';
import type { Page } from '@playwright/test';

export class PresencePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(competitionId: string) {
    await this.page.goto(`/dashboard/competitions/${competitionId}/presence`);
    await this.waitForReady();
    await this.waitForNoSpinner();
  }

  async checkIn(pairStartNumber: number) {
    const row = this.page.locator(`[data-pair-number="${pairStartNumber}"], tr:has-text("${pairStartNumber}")`).first();
    const btn = row.getByRole('button', { name: /check.in|přítomn|potvrdit/i });
    await btn.click();
  }

  async expectCheckedIn(pairStartNumber: number) {
    const row = this.page.locator(`tr:has-text("${pairStartNumber}")`).first();
    await row.getByText(/přítomn|checked/i).waitFor({ state: 'visible', timeout: 5_000 });
  }
}
