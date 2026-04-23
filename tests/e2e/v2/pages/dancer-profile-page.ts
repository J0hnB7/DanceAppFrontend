import { BasePage } from './base-page';

export class DancerProfilePage extends BasePage {
  async goto() {
    await this.page.goto('/profile');
    await this.waitForReady();
    await this.waitForNoSpinner();
  }

  async expectLoaded() {
    await this.page.getByRole('heading').first().waitFor({ state: 'visible', timeout: 8_000 });
  }
}
