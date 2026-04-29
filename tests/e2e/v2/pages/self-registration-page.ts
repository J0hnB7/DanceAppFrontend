import { BasePage } from './base-page';

export class SelfRegistrationPage extends BasePage {
  async goto(competitionId: string) {
    await this.page.goto(`/competitions/${competitionId}`);
    await this.waitForReady();
    await this.waitForNoSpinner();
  }

  async clickRegister() {
    await this.page.getByRole('button', { name: /registrovat|register|přihlásit se/i }).first().click();
  }

  async selectSection(sectionName: string) {
    await this.page.getByText(sectionName).click();
  }

  async submitRegistration() {
    await this.page.getByRole('button', { name: /potvrdit|odeslat|register/i }).last().click();
  }

  async expectRegistered() {
    await this.page.getByText(/registrace|registered|úspěšně/i).waitFor({ state: 'visible', timeout: 10_000 });
  }
}
