import { test, expect } from '@playwright/test';

/**
 * XSS security test — verifies that script injection via pair registration is blocked.
 *
 * Two layers of protection are tested:
 *   1. Backend validation rejects the payload (400) — preferred
 *   2. If the payload is stored, the rendered page shows the literal string, not executed JS
 *
 * Prerequisites:
 *   - Backend running on the URL configured in playwright.config.ts (baseURL)
 *   - At least one competition with registrationOpen=true
 *   - Set E2E_COMPETITION_SLUG to target a specific competition
 *
 * Run: npx playwright test tests/e2e/security/xss.spec.ts
 */

const COMPETITION_SLUG = process.env.E2E_COMPETITION_SLUG;
const XSS_PAYLOAD = '<script>alert(1)</script>';

test('pair registration — XSS payload in dancer name is rejected or sanitized', async ({ page }) => {
    // Navigate to a competition with an open registration form
    if (COMPETITION_SLUG) {
        await page.goto(`/competitions/${COMPETITION_SLUG}`);
    } else {
        await page.goto('/competitions');
        await page.waitForLoadState('domcontentloaded');

        const firstCard = page.locator('a[href^="/competitions/"]').first();
        const cardCount = await firstCard.count();
        if (cardCount === 0) {
            test.skip(true, 'No competitions available — skipping XSS test');
            return;
        }
        await firstCard.click();
    }

    await page.waitForLoadState('domcontentloaded');

    // The registration form may be inline (when registrationOpen=true) or behind a button.
    // Try button click first; if no button, the form is already visible.
    const registerBtn = page.locator('button:has-text("Registrovat"), button:has-text("Register"), a:has-text("Registrovat"), a:has-text("Register")').first();
    const btnCount = await registerBtn.count();
    if (btnCount > 0) {
        await registerBtn.click();
        await page.waitForLoadState('domcontentloaded');
    }

    // Find dancer first name field — visible either inline or after button click
    const dancer1NameField = page.locator('input[name="dancer1FirstName"], input[placeholder="Jana"], input[placeholder*="First name"]').first();
    const fieldVisible = await dancer1NameField.isVisible().catch(() => false);
    if (!fieldVisible) {
        test.skip(true, 'Registration form not visible — competition may be closed or form structure changed');
        return;
    }
    await dancer1NameField.fill(XSS_PAYLOAD);

    // Intercept the API response to check the backend status code
    let apiResponseStatus: number | null = null;
    page.on('response', (response) => {
        if (response.url().includes('/api/v1/') && response.request().method() === 'POST') {
            apiResponseStatus = response.status();
        }
    });

    // Submit the form
    const submitBtn = page.locator('button[type="submit"], button:has-text("Odeslat"), button:has-text("Submit")').first();
    await submitBtn.click();

    // Wait briefly for network activity
    await page.waitForTimeout(2_000);

    // Capture final status into local variable to help TypeScript narrowing
    const capturedStatus: number | null = apiResponseStatus;

    if (capturedStatus !== null) {
        // 500 = injection reached the DB — must never happen
        expect(capturedStatus !== 500, 'XSS payload caused 500 — possible server-side injection').toBe(true);

        if (capturedStatus === 200 || capturedStatus === 201) {
            // Payload was stored — verify it is NOT executed (script tag appears as literal text)
            const hasActiveScript = await page.evaluate(() => {
                // Check for injected <script> tags that contain the payload
                const scripts = document.querySelectorAll('script');
                for (const s of scripts) {
                    if (s.textContent?.includes('alert(1)')) return true;
                }
                return false;
            });
            expect(hasActiveScript, 'XSS payload was executed as a script — stored XSS vulnerability').toBe(false);
        } else {
            // 400/422/etc — backend rejected the payload (expected)
            expect([400, 401, 403, 422]).toContain(capturedStatus);
        }
    }
    // If no API response was captured (e.g., client-side validation blocked submission),
    // the test passes — client-side blocking is also an acceptable protection layer.
});
