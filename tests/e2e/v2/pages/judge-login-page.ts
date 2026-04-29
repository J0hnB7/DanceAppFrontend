import { BasePage } from './base-page';

export class JudgeLoginPage extends BasePage {
  async goto(rawToken: string) {
    await this.page.goto(`/judge/${rawToken}`);
    await this.waitForReady();
  }

  async enterPin(pin: string) {
    const pinInput = this.page.locator('input[type="text"], input[type="number"], input[inputmode="numeric"]').first();
    await pinInput.waitFor({ state: 'visible', timeout: 8_000 });
    await pinInput.fill(pin);
    await this.page.getByRole('button', { name: /potvrdit|vstoupit|unlock|enter/i }).click();
  }

  async expectJudgePanelLoaded() {
    await this.page.locator('[data-testid="judge-panel"], .judge-panel, h1, h2').first()
      .waitFor({ state: 'visible', timeout: 10_000 });
  }
}
