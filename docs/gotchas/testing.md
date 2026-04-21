# Testing gotchas — frontend

> Read on-demand when writing Vitest unit tests or Playwright E2E tests.

## Unit testy (Vitest)

- Config: `vitest.config.ts` (jsdom env, `@/` alias, `passWithNoTests: true`, excludes `tests/e2e/**`). Setup `src/test-setup.ts` importuje `@testing-library/jest-dom/vitest`.
- Běh: `npm test` (run once), `npm run test:watch`, `npm run test:coverage`.
- Test soubory: `src/**/*.{test,spec}.{ts,tsx}` (collocated s modulem — vzor `store/auth-store.test.ts`, `lib/api-client.test.ts`).
- **axios-mock-adapter dual-instance pattern** — `apiClient` má vlastní axios instance, ale 401 refresh interceptor volá **globální** `axios.post("/api/v1/auth/refresh", ...)`. Testy musí mockovat OBĚ: `new MockAdapter(apiClient)` + `new MockAdapter(axios)`.
- **Zustand reset** — v `beforeEach` volej `useXStore.setState({ ...initialState })` s **všemi** poli; `setState` dělá shallow merge, stálé pole z předchozího testu přežije.
- **Vitest 4 + Next 16.2** — bez konfliktu; `@vitejs/plugin-react` nutný pro JSX transform.
- **Testovanie `next.config.ts` / `sentry.*.config.ts`** — mock Sentry wrapper ako identity (`vi.mock("@sentry/nextjs", () => ({ withSentryConfig: (c) => c, init: vi.fn() }))`), `vi.resetModules()` v `beforeEach`, `await import("../next.config")` (alebo `../sentry.edge.config`). Env vars nastav PRED `await import`. Vzor: `src/sentry-edge-config.test.ts`, `src/next-config-rewrites.test.ts` (C14).
- **`NEXT_PUBLIC_API_URL` v `next.config.ts`** — vždy extrahuj cez `const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").trim()` a použij v OBOCH miestach (CSP connect-src + rewrites destination). Inline `${process.env.NEXT_PUBLIC_API_URL}` v rewrites je vulnerable na Vercel %0A trailing-newline bug → 500 na dynamic routes.

## E2E testy (Playwright)

- Config: `playwright.config.ts`, `testDir: tests/e2e`, `workers: 1`, `fullyParallel: false` (sdílejí BE state)
- Běh: `npx playwright test [file]` — `webServer` auto-startuje FE s `NEXT_PUBLIC_MOCK_API=false`
- Report: `playwright-report/index.html` — data embedded jako base64 zip (regex `base64,(UEsDBB...)`, unzip → `report.json`)
- **06** (dancer registration) — bez env vars, jen `/register` happy path
- **07, 08, 09** — vyžadují env vars + seed data, jinak `test.skip()` v `beforeEach` nebo inline
  - `E2E_DANCER_EMAIL`, `E2E_DANCER_PASSWORD` — seeded DANCER s `onboardingCompleted=true` + `birthYear`
  - `E2E_JUDGE_TOKEN`, `E2E_JUDGE_PIN` — pro judge scoring testy
  - `E2E_COMPETITION_SLUG` — optional, jinak první otevřená
- BE **nemá** public list endpoint — `/competitions/public` vrací 500 (parsuje "public" jako UUID), `/competitions` 401. Seed přes API: register dancer → register organizer → organizer vytvoří soutěž
