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

`LiveControlDashboard` — hlavní kontejner
`LiveBottomBar` — Send + Close round buttons
`LiveHelpModal` — keyboard shortcuts modal
`CloseRoundDialog` — potvrzení zavření kola
`TieResolutionDialog` — tie resolution
`RoundResultsOverlay` — overlay výsledků po zavření kola
`IncidentModal` — incidentní modal
`RoundSelector` / `DanceSelector` / `HeatSelector` — výběr
`JudgePanel` / `JudgeCard` — stav porotců
`LiveStatusBar` — horní lišta
`LiveSidebar` — pravý panel se stats
`HeatResults` — výsledky skupiny
`IncidentPanel` — incidenty
`PresentationOverlay` — fullscreen prezentační mód

## Computer Use testy (2026-03-31)

- **Test 1:** `computer-use-prompt.md` — 7 flows (Wizard, Live Control, Judge Scoring, Public, Schedule, Settings, E2E)
- **Test 2:** `computer-use-prompt-2.md` — 16 flows (A–P), kompletní pokrytí

### Výsledky (23/23 PASS) — nalezené bugy

| Závažnost | Bug | Kde |
|-----------|-----|-----|
| MAJOR | Wizard silent validation — šablona neprefilluje series, RHF errors se nezobrazí, tlačítko "Vytvořit" nereaguje | `/dashboard/competitions/new` krok 3 |
| MEDIUM | Chybějící i18n klíče na stránce Vyhodnocení | `/dashboard/competitions/[id]/results` |
| LOW | Neúplné EN překlady na stats sub-labels | `/dashboard/participants` |
| LOW | Hydration mismatch na login | `/login` |

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

## Playwright — MSW + auth gotcha (2026-04-15)

MSW service workers **nefungují v headless Playwright** — worker se nezaregistruje.
`page.route("**/api/v1/**", ...)` interceptuje síťové volání OK, ale React auth store
(Zustand) vyžaduje accessToken v paměti — samotný `refreshToken` cookie nestačí.
Jednoduché řešení: nastav `NEXT_PUBLIC_MOCK_API=true` v `.env.local` a **znovu spusť**
dev server; pak `page.goto(url)` funguje přímo bez přihlašování. Nezapomeň vrátit na `false`.

## Playwright — login pattern (2026-04-10)

After `page.click('button[type="submit"]')` on login form:
- Use `page.wait_for_url(lambda url: "login" not in url, timeout=15000)` — NOT `wait_for_load_state("networkidle")`
- `networkidle` fires before the Next.js redirect completes; `wait_for_url` is reliable
- Section accordions on results page expand via `page.locator("text=SectionName").first.click()`, not `button[aria-expanded]`

## Playwright — dashboard wizard gotchas (2026-04-17)

- **VenueAutocomplete** — renderuje `<input>` bez `name` atributu. Selector `[name=venue]` nefunguje. Použij přesný placeholder: `input[placeholder="Praha, sportovní hala..."]`. Pro fill: `pressSequentially()` místo `fill()`.
- **datetime-local input** — `fill()` potřebuje formát `2026-05-17T08:00`, ne `2026-05-17`.
- **Wizard step 2 (Šablona)** — "Pokračovat" je `disabled` dokud není vybrána šablona. Klikni nejdřív `button:has-text("Prázdná šablona")`.
- **waitForURL po vytvoření** — `/dashboard/competitions/new` splňuje `/dashboard/competitions/` podmínku. Vždy exclude `/new`: `url.href.includes('/competitions/') && !url.href.includes('/new')`.
- **getByText strict mode** — pokud text existuje ve více elementech (heading + popis), použij `getByRole('heading', { name: '...' })`.
- **waitForURL callback** — dostane `URL` objekt, ne string. Vždy `url.href.includes(...)`, ne `url.includes(...)`.

## Vitest setup — gotchas pre Phase C

- **Next.js mocks** — `useRouter`/`useSearchParams`/`usePathname` hodia error v jsdom bez module name mapper. Vzor: `moduleNameMapper` v `vitest.config.ts` → `src/__mocks__/next-navigation.ts` s `vi.fn()` stubmi
- **`next/image` + `next/link`** — zlyhajú v jsdom, potrebujú pass-through mock komponent
- **IndexedDB (`judge-offline-store.ts`)** — jsdom nemá IDB. Použij `fake-indexeddb` npm package pri testovaní `judgeOfflineStore` priamo, alebo mockuj celý modul pri testovaní `judge-store.ts`
- **`axios-mock-adapter@2` je už nainštalovaný** — použiť pre `api-client.ts` interceptor testy (lepšie ako `msw/node` pre nízkoúrovňové interceptor testy)
- **MSW handlers** (`src/mocks/handlers.ts`) — pokrývajú auth + competition + round + pairs; reuse v unit testoch cez `msw/node` server mode
