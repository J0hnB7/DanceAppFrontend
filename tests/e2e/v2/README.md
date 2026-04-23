# E2E Test Suite v2

## Run locally

```bash
# Prereqs: backend on :8080, frontend auto-started by Playwright
npm run test:e2e:v2

# Single spec
npm run test:e2e:v2 -- _smoke
npm run test:e2e:v2 -- gdpr-lifecycle

# Debug modes
npx playwright test --config=tests/e2e/v2/playwright.config.v2.ts --ui
npx playwright test --config=tests/e2e/v2/playwright.config.v2.ts --headed --trace on
```

## Architecture

- **API-first setup**: register/create via REST, test only user-facing UI flows
- **Auto-cleanup**: every test run uses a unique `e2e-{timestamp}-{uuid8}-` prefix; `autoCleanup` fixture calls `DELETE /api/v1/test/cleanup/{prefix}` after each test
- **Page Object Model**: all selectors in `pages/`; specs import POs, never raw locators
- **Factories**: typed helpers in `factories/` create organizers, dancers, competitions, sections, judges via API

## Add a new spec

1. Import `{ test, expect }` from `../fixtures/test-fixtures`
2. Use factories for setup, POs for UI interaction
3. Put edge cases in `specs/edge/`, extended flows in `specs/extended/`

## Cleanup fixture

The `autoCleanup` fixture fires after every test regardless of pass/fail. It calls the `@Profile("!prod")` backend cleanup endpoint. Data must use the shared `TEST_PREFIX` from `helpers/test-prefix.ts`.

## Flakiness policy

> 1% flake rate = open a bug. Do not add retries to hide flakiness.

Prefer `expect.poll()` over `waitForTimeout()` for SSE/async state.

## What's in Opus plan

Task 1.4 (beta-smoke golden path), Tasks 2.4/2.5/2.6 (semifinal, dance-off, payments), Tasks 3.3/3.4/3.6 (OAuth mock, mobile judge, admin ops), `wait-for-sse.ts` real implementation.
