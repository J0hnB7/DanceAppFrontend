# Claude Reference — DanceApp Frontend

Zřídka potřebné detaily. Načti když pracuješ na konkrétním modulu.

---

## Wizard — nová soutěž (`/dashboard/competitions/new`)

- 3 kroky: **Základní info → Šablona → Sekce**
- Krok 2: 4 šablony (Ballroom Championship / Latin Bronze / Začátečníci / Prázdná) — prefillují sekce přes `replace()` z `useFieldArray`
- Krok 3: každá sekce má `numberOfJudges` + `maxFinalPairs`, live majority display: `floor(n/2)+1`
- Šablona musí být vybrána pro pokračování (button `disabled` dokud `selectedTemplate === null`)

## Hotové stránky / endpointy

- `/checkin/[token]/page.tsx` — existuje; backend: CheckinTokenController + CheckinTokenService + CheckinToken entita + V050 migration
- SecurityConfig: `/api/v1/checkin-tokens/**` v `permitAll()`

### Dancer platform (Spec A — A6+A7)

- `src/lib/api/dancer.ts` — dancer API modul (register, onboarding, profile, partner invite, my-competitions)
- `/register` — registrace tančíře + Google OAuth (`/register/dancer` redirectuje sem)
- **Organizátoři se neregistrují sami** — pouze přes pozvánku od admina
- `/auth/callback` — OAuth2 callback → POST /auth/refresh → hydratuje store → redirect na `/onboarding` nebo `/profile`
- `/onboarding` — 2-krokový form (profil → partner); public path v proxy.ts
- `/profile` — profil + partner invite flow
- `/profile/my-competitions` — competition history dashboard
- `/partner-invite/[token]` — public invite stránka
- **proxy.ts public paths**: `/auth/callback`, `/onboarding`, `/partner-invite`

## Live komponenty (`src/components/live/`)

- `LiveControlDashboard` — hlavní kontejner (~320 řádků), orchestruje vše
- `LiveBottomBar` — Send + Close round (spodní lišta)
- `LiveHelpModal` — keyboard shortcuts
- `CloseRoundDialog` — potvrzení zavření kola
- `TieResolutionDialog` — tie resolution
- `RoundResultsOverlay` — overlay výsledků po close
- `IncidentModal` + `IncidentPanel`
- `RoundSelector` / `DanceSelector` / `HeatSelector`
- `JudgePanel` / `JudgeCard`
- `LiveStatusBar` (top), `LiveSidebar` (right stats)
- `HeatResults`
- `PresentationOverlay` — fullscreen prezentační mód

### Custom hooks (`src/hooks/`)
- `use-judge-status-polling.ts` — 8s polling, nikdy nepřepíše `submitted`
- `use-round-control.ts` — `handleSend`, `handleCloseRound`, `handleResolveTie`, SSE result handlers
- `use-judge-connectivity.ts` — SSE primary + 30s heartbeat fallback

### danceConfirmations flow
`page.tsx` → `setDanceConfirmation(danceId, submitted, total)` → `live-store` → `LiveControlDashboard.allDancesConfirmed` + `DanceSelector` (zelená fajfka)

---

## SSE round-status — judge auto-refresh při otevření kola

Backend broadcastuje `round-status` event s `{status:"RUNNING"}` do `Channel.PUBLIC` + ukládá do EventStore (replay po reconnectu) vždy když `RoundActivationService.activateRound()` dokončí přechod do IN_PROGRESS.

Judge klient (`round/page.tsx` i `final/page.tsx`) subscribuje na existující SSE:
```ts
es.addEventListener("round-status", (e: MessageEvent) => {
  try {
    const data = JSON.parse(e.data) as { status?: string };
    if (data.status === "RUNNING") loadActiveRoundRef.current();
  } catch {}
});
```

---

## Email šablona — registration-confirmed

`templates/emails/registration-confirmed.html` — Thymeleaf šablona v backendu.
Proměnné: `dancer1Name`, `competitionName`, `startNumber`, `sectionName`, `eventDate`, `startTime`, `venue`, `paymentHolder`, `paymentIban`, `paymentBic`, `entryFee`.
Volat: `emailNotificationService.send(..., NotificationType.REGISTRATION_CONFIRMED, "registration-confirmed", vars)`.

---

## Favicon — Next.js App Router

- `src/app/icon.png` + `src/app/apple-icon.png` → Next.js auto generuje `<link rel="icon">` a apple-touch-icon. Žádné změny v `layout.tsx`
- `public/favicon.ico` existuje (generovaný přes `sips -z 32 32 logo.png`) — prohlížeče hledají ho první před `<link rel="icon">` tagem
- Hard refresh Safari mobile: Settings → Safari → Advanced → Website Data → Delete

---

## Secret scanning & source maps (setup history)

- **Gitleaks** workflow na `main + feature/** + fix/** + hotfix/**`, allowlist v `.gitleaks.toml`
- Rotation runbook: `danceapp-backend/docs/runbooks/secret-rotation.md`
- `frontend/.env.sentry-build-plugin` (gitignored) obsahuje živý token — nikdy necommit. Token scope: Release=Admin
- Token verify: `SENTRY_AUTH_TOKEN=xxx SENTRY_ORG=bystriansky npx @sentry/cli releases list`
- **Token vždy čti přes JS DOM** (`input.value`), ne ze screenshotu — screenshot skrátí dlhé hodnoty → 401

---

## Public competition detail — performance

- `staleTime: 60_000` na competition + sections queries v `competitions/[id]/page.tsx`
- Prefetch na hover: `onMouseEnter → queryClient.prefetchQuery(competitionKeys.detail(id))` v competitions list
- Vercel Cron Hobby plán podporuje jen denní joby — pro keepalive ping použij UptimeRobot (free, 5min)

---

## Computer Use testy (2026-03-31)

- **Test 1:** `computer-use-prompt.md` — 7 flows
- **Test 2:** `computer-use-prompt-2.md` — 16 flows (A–P)
- Výsledky 23/23 PASS; nalezené bugy: Wizard silent validation, chybějící i18n klíče na Vyhodnocení, neúplné EN stats sub-labels, hydration mismatch na login

---

## Spec soubory

- **Schedule modul:** `/Users/janbystriansky/Documents/DanceAPP/MD/files-3/TASK_SCHEDULE_MODULE_v5.md`
  - Frontend route: `/dashboard/competitions/[id]/schedule`
  - Drag & drop: `@dnd-kit/core`

---

## Railway / Docker deployment

- `NEXT_PUBLIC_*` proměnné jsou **build-time** — v Dockerfile musí být jako `ARG` + `ENV ARG=$ARG`
- `.gitignore` má `.env*` glob — pro `.env.example` přidej výjimku `!.env.example`
- `output: "standalone"` v `next.config.ts` nutné pro Dockerfile (kopíruje jen `.next/standalone/`) — **ale NIKDY na Vercel** (spôsobuje 500 na dynamic routes)
- Healthcheck v Dockerfile: `/api/*` jsou rewrites na backend — nepoužívej jako healthcheck endpoint
- **NEXT_PUBLIC_MOCK_API musí být `false` v produkci** — pokud `true`, frontend nikdy nevolá backend (login vrátí "Invalid credentials")
- **`tests/mocks/jap-2026-data.ts` nesmí být v `.gitignore`** — importuje ho `src/mocks/db.ts`, Vercel build jinak selže
- **DNS AAAA záznam:** Po přidání domény na Vercel smaž AAAA (IPv6) záznamy u Websupport — jinak `ERR_CONNECTION_CLOSED` a SSL certifikát se nevydá

## Vercel deploy — vždy --prod

`npx vercel --prod` — `NEXT_PUBLIC_API_URL` je nastavená jen pro `production` target. Plain `npx vercel` (preview) vždy selže: `"destination undefined/api/:path*"` → "Invalid rewrite found". Vercel CLI není globálně nainstalovaný, použi `npx vercel`.

---

## Playwright — MSW + auth gotcha

MSW service workers **nefungují v headless Playwright** — worker se nezaregistruje.
`page.route("**/api/v1/**", ...)` interceptuje síťové volání OK, ale React auth store
(Zustand) vyžaduje accessToken v paměti — samotný `refreshToken` cookie nestačí.
Jednoduché řešení: nastav `NEXT_PUBLIC_MOCK_API=true` v `.env.local` a **znovu spusť**
dev server; pak `page.goto(url)` funguje přímo bez přihlašování. Nezapomeň vrátit na `false`.

## Playwright — login pattern

After `page.click('button[type="submit"]')` on login form:
- Use `page.wait_for_url(lambda url: "login" not in url, timeout=15000)` — NOT `wait_for_load_state("networkidle")`
- `networkidle` fires before the Next.js redirect completes; `wait_for_url` is reliable
- Section accordions on results page expand via `page.locator("text=SectionName").first.click()`, not `button[aria-expanded]`

## Playwright — dashboard wizard gotchas

- **VenueAutocomplete** — renderuje `<input>` bez `name`. Selector `[name=venue]` nefunguje. Použij placeholder: `input[placeholder="Praha, sportovní hala..."]`. Fill: `pressSequentially()`
- **datetime-local input** — `fill()` potřebuje formát `2026-05-17T08:00`
- **Wizard step 2** — "Pokračovat" disabled dokud šablona nevybrána
- **waitForURL po vytvoření** — `/dashboard/competitions/new` splňuje `/dashboard/competitions/`. Exclude: `url.href.includes('/competitions/') && !url.href.includes('/new')`
- **getByText strict mode** — text ve více elementech → použij `getByRole('heading', { name: '...' })`
- **waitForURL callback** — dostane `URL` objekt, ne string. Vždy `url.href.includes(...)`

## Vitest setup — Phase C gotchas

- **Next.js mocks** — `useRouter`/`useSearchParams`/`usePathname` hodia error v jsdom bez module name mapper. Vzor: `moduleNameMapper` v `vitest.config.ts` → `src/__mocks__/next-navigation.ts` s `vi.fn()` stubmi
- **`next/image` + `next/link`** — zlyhajú v jsdom, potrebujú pass-through mock komponent
- **IndexedDB (`judge-offline-store.ts`)** — jsdom nemá IDB. Použij `fake-indexeddb` alebo mockuj celý modul
- **`axios-mock-adapter@2` nainštalovaný** — pre `api-client.ts` interceptor testy (lepšie ako `msw/node`)
- **MSW handlers** (`src/mocks/handlers.ts`) — pokrývajú auth + competition + round + pairs; reuse v unit testoch cez `msw/node` server mode
