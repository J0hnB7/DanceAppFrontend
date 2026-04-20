import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Accessibility smoke — axe-core WCAG 2.1 AA scan for 5 priority pages.
 *
 * Fails when any violation has impact "critical" or "serious".
 * Moderate/minor violations are printed but do not fail the run — they
 * are tracked in `docs/accessibility/a11y-backlog.md`.
 *
 * Pages that need seeded backend data (public competition detail,
 * judge scoring) read env vars and skip when they are missing.
 *
 *   E2E_COMPETITION_ID   — UUID of a public competition
 *   E2E_JUDGE_TOKEN      — raw judge token string from POST /judge-tokens
 */

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function scan(page: import("@playwright/test").Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

  const blocking = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
  const info = results.violations.filter(
    (v) => v.impact !== "critical" && v.impact !== "serious",
  );

  if (info.length > 0) {
    console.log(`[a11y:${label}] ${info.length} moderate/minor finding(s):`);
    for (const v of info) {
      console.log(`  - ${v.id} (${v.impact}): ${v.help} — ${v.nodes.length} node(s)`);
    }
  }

  if (blocking.length > 0) {
    const report = blocking
      .map((v) => {
        const sel = v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join("\n      ");
        return `  - ${v.id} (${v.impact}): ${v.help}\n    ${v.helpUrl}\n    Nodes:\n      ${sel}`;
      })
      .join("\n");
    throw new Error(`[a11y:${label}] ${blocking.length} critical/serious violation(s):\n${report}`);
  }

  expect(blocking).toEqual([]);
}

test.describe("@a11y axe-core scan", () => {
  test("landing page /", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await scan(page, "landing");
  });

  test("login page /login", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await scan(page, "login");
  });

  test("register page /register", async ({ page }) => {
    await page.goto("/register");
    await page.waitForLoadState("networkidle");
    await scan(page, "register");
  });

  test("public competition detail /competitions/[id]", async ({ page }) => {
    const id = process.env.E2E_COMPETITION_ID;
    test.skip(!id, "E2E_COMPETITION_ID not set — seed a competition and export it");
    await page.goto(`/competitions/${id}`);
    await page.waitForLoadState("networkidle");
    await scan(page, "competition-detail");
  });

  test("judge scoring /judge/[token]", async ({ page }) => {
    const token = process.env.E2E_JUDGE_TOKEN;
    test.skip(!token, "E2E_JUDGE_TOKEN not set — seed a judge token and export it");
    await page.goto(`/judge/${token}`);
    await page.waitForLoadState("networkidle");
    await scan(page, "judge-scoring");
  });
});
