# E2E Test Suite v2

Status: **22/22 green** as of 2026-04-24 (chromium + mobile projects).

## Run locally

```bash
# Prereqs: backend on :8080 (profile=local), frontend auto-started by Playwright
npm run test:e2e:v2

# Single spec
npm run test:e2e:v2 -- _smoke
npm run test:e2e:v2 -- gdpr-lifecycle

# Debug modes
npx playwright test --config=tests/e2e/v2/playwright.config.v2.ts --ui
npx playwright test --config=tests/e2e/v2/playwright.config.v2.ts --headed --trace on
```

## Backend prerequisites (application-local.yaml)

```yaml
danceapp:
  test:
    auto-verify-email: true
    rate-limit-disabled: true    # required — see danceapp-backend/docs/gotchas/e2e-test-setup.md
  cookie:
    secure: false                # required for HTTP-only local dev (refresh-token cookie)
```

Without `rate-limit-disabled: true` the suite hits two separate bucket rate limiters (`LoginAttemptService` and `RateLimitFilter`) inside the first ~12 `register` calls.

## Architecture

- **API-first setup**: register/create via REST, test only user-facing UI flows.
- **Auto-cleanup**: every run uses a unique `e2e-{timestamp}-{uuid8}-` prefix; `autoCleanup` fixture calls `DELETE /api/v1/test/cleanup/{prefix}` after each test.
- **Page Object Model**: all selectors in `pages/`; specs import POs, never raw locators.
- **Factories**: typed helpers in `factories/` create organizers, dancers, competitions, sections, judges, admins via API.
- **Projects**: `chromium` runs everything except `specs/extended/mobile-*.spec.ts`; `mobile` runs only mobile specs on iPhone 12 viewport.

## Helpers worth knowing

- `helpers/wait-for-sse.ts` — real `EventSource` driven from inside `page.evaluate`. Use `waitForRoundOpened(page, competitionId, roundType)` for HEAT/SEMI/FINAL/DANCE_OFF transitions.
- `helpers/judge-scoring-dsl.ts` — deterministic mark/placement generators: `generateHeatCallbacks`, `generateUnanimousFinal`, `generateTiedFinal` (symmetric tie requires even judge count), `generateSemiFinalWithR11`.
- `helpers/oauth-mock-server.ts` — ephemeral-port OIDC provider mock (`/authorize`, `/token`, `/userinfo`, `.well-known`).
- `helpers/stripe-test-cards.ts` — card numbers for when the Stripe kill switch flips.

## API-shape facts (saved debugging time)

These cost hours the first time around — documented here so nobody learns them twice. Full list in memory: `feedback_e2e_test_profile_gotchas.md`.

- `createPair` URL is `/competitions/{id}/pairs`, `sectionId` goes in body. No `/sections/{sid}/pairs` subroute.
- `pairs.dancer1_name` is a legacy NOT NULL column — api-client synthesises it from FirstName + LastName.
- `CreateSectionRequest` has primitive-int defaults (`orderIndex`, `numberOfJudges`, `maxFinalPairs`); api-client spreads defaults so partial bodies work.
- Section dances live in `SectionResponse.dances` — no dedicated `/dances` endpoint.
- `listPairs` returns `PageResponse`; api-client unwraps `.content`.
- `JudgeRole` enum is `JUDGE / CHAIR / TECH_SUPPORT / MODERATOR / DJ` (not `ADJUDICATOR`).
- `X-Judge-Token` header needs the token **id** (primary key), not `rawToken`. RawToken is for the `/judge/{rawToken}` URL.
- Callbacks body: `{ dance, selectedPairIds }`. Placements body: `{ pairPlacements: { uuid: rank } }`.
- GDPR endpoints: `GET /users/{id}/data-export`, `DELETE /users/{id}/personal-data`.
- Public registration: `POST /competitions/{id}/pairs/public-registration`; competition needs `registrationOpen=true` via `PUT /competitions/{id}`.
- Public result endpoints return 403 until `POST /sections/{id}/results/approve` — gated on `section.resultsPublishedAt`.
- `SectionFinalSummaryResponse.rankings` includes **eliminated-in-SEMI pairs** at rank 7+ (their elimination rank), not just finalists 1..6. To assert the exact FINAL pair set, query `GET /rounds/{finalId}/placements/{danceId}` with a judge token (no publication gate, returns the authoritative set).
- Language toggle is on `/` and `/competitions` only, never on `/login` (standalone auth-light).

## Add a new spec

1. Import `{ test, expect }` from `../fixtures/test-fixtures` — cleanup fires automatically.
2. Use factories for setup, POs for UI interaction. Don't inline raw locators in specs.
3. Put edge cases in `specs/edge/`, extended flows in `specs/extended/`.
4. For SSE waits, use `expect.poll()` or `waitForSseEvent`. Never `waitForTimeout`.

## Flakiness policy

> 1% flake rate = open a bug. Do not add retries to hide flakiness.

If a test goes intermittently red, fix the underlying coordination contract.

## Current coverage

- **T1 golden path** — `beta-smoke.spec.ts` (organizer → judges → dancer → results + xlsx).
- **Scoring edges** — semifinal R11 crosses, dance-off tie resolution.
- **Integration** — Stripe kill switch + invoice idempotency, OAuth Google mock, mobile judge iPhone 12, admin impersonation + audit.
- **Auth/account** — 2FA setup, password reset, GDPR export + deletion, i18n cookie persistence.
- **Concurrency** — 5-judge simultaneous submit, same-judge double submit idempotency.
- **Multi-section** — pair registered across two sections via public-registration.
