# CLAUDE.md — DanceApp Frontend

> Automaticky načítáno Claude Code. Implementuj autonomně bez potvrzování.

---

## Stack

- **Next.js 16.1.6** (App Router), TypeScript strict, Tailwind CSS v4
- **React Query** — server state (`src/lib/query-client.ts` + `QueryProvider`)
- **Zustand** — client state (auth: `src/store/auth-store.ts`, alerts: `src/store/alerts-store.ts`)
- **Axios** — `src/lib/api-client.ts` s auto-refresh interceptorem

## Kritické Next.js 16 detaily

- Middleware přejmenován na `proxy` → soubor `src/proxy.ts`, export funkce `proxy()` (ne `middleware()`)
- `useSearchParams()` musí být zabalen do `<Suspense>` na úrovni page exportu

## Node.js

```bash
#!/bin/zsh
export PATH="/Users/janbystriansky/node/bin:$PATH"
```

Vždy použij toto v Bash příkazech které spouštějí npm/node.

## Architektura

```
src/
  app/
    (auth)/              # login, register, forgot-password
    dashboard/           # admin/organizer dashboard
      competitions/[id]/ # detail soutěže (tabs: info, pairs, rounds, schedule, settings)
    competitions/[id]/   # veřejná stránka soutěže + registrace
    judge/               # rozhraní rozhodčích (mobile-first, QR login)
    moderator/[token]/   # moderátorský pohled (dark, bez authu)
    scoreboard/          # live výsledky (public)
  components/
    ui/                  # sdílené komponenty (DataTable, Badge, Dialog, Progress, ...)
    shared/              # NotificationCenter, SessionExpiryWarning
  lib/
    api-client.ts        # Axios + refresh interceptor
    i18n/                # cs.json + en.json — vždy přidávej překlady do obou!
    diploma.ts           # printDiploma() / printAllDiplomas()
    sse-client.ts        # SSE klient
  mocks/
    setup.ts             # MSW mock handlery pro dev/test
  store/
    auth-store.ts        # Zustand auth store
    alerts-store.ts      # Zustand alerts store
  proxy.ts               # Next.js middleware (route protection, refreshToken cookie)
```

## Design systém

- Apple-like, dark mode via `.dark` class
- CSS proměnné: `--accent: #0a84ff`, `--surface`, `--surface-secondary`, `--border`, `--text-secondary`, `--text-tertiary`, `--radius-md`, `--radius-lg`
- Nikdy nepoužívej hardcoded barvy — vždy CSS proměnné

## Auth

- JWT v paměti (Zustand), refresh token v HttpOnly cookie
- Route protection přes `src/proxy.ts` (kontroluje `refreshToken` cookie)

## Real-time

- SSE via `useSSE(competitionId, event, handler)` — bere JEDEN event string, ne array
- SSE eventy v live modulu: `judge-connected`, `judge-disconnected`, `score-submitted`, `heat:all-submitted`
- SSE vyhrává nad pollingem — `submitted` status se nikdy nepřepisuje zpět na nižší hodnotu
- WebSocket (STOMP) pro live marking (judge interface)

## Klíčové UI patterny

- `SimpleDialog` — `<SimpleDialog open onClose title>` v `dialog.tsx`
- `NavTabs` — `<NavTabs tabs activeTab onChange>` v `nav-tabs.tsx`
- `DataTable` — sortable, filterable, CSV export (`src/components/ui/data-table.tsx`)
- `NotificationCenter` místo Bell buttonu v `header.tsx`

## i18n

- Primární jazyk UI: **čeština**, sekundární: angličtina
- Soubory: `src/lib/i18n/cs.json` + `en.json` — vždy přidej klíč do OBOU!
- Překlady v komponentách: `const { t } = useLocale()` z `@/contexts/locale-context`
- `t('key')` nebo `t('key', { n: 5, name: 'foo' })` pro parametry

## Design systém — POZOR na dva světy

- **Dashboard** (`/dashboard/**`): CSS proměnné — `--accent`, `--surface`, `--border`, `--text-secondary`, atd. Nikdy hardcoded barvy.
- **Veřejné stránky** (`/competitions/**`): přímé hodnoty — `#4F46E5`, `#111827`, `#F9FAFB`. CSS proměnné tam **nefungují**.
- **Auth stránky** (`/login`, `/register`, ...): používají inline styly s přímými hodnotami. Pokud použiješ `Input` komponentu (která bere CSS proměnné), obal formulář třídou `.auth-light` definovanou v `<style>` tagu stránky — redefinuje proměnné na světlé hodnoty: `--surface:#fff; --border:#E5E7EB; --text-primary:#111827; ...`
- Veřejné stránky: hero header `#0A1628` + animované orby + wave SVG divider (sdílený pattern)
- Font: `var(--font-sora)` = nadpisy + důležité hodnoty; Inter = tělo textu
- Konkrétní nahrazení: `--background`→`#F9FAFB`, `--text-primary`→`#111827`, `--text-secondary`→`#6B7280`, `--text-tertiary`→`#9CA3AF`, `--border`→`#E5E7EB`, `--surface`→`#FFFFFF`, `--accent`→`#4F46E5`, `--warning`→`#F59E0B`

## Zustand stores

| Store | Soubor | Co drží |
|-------|--------|---------|
| `useLiveStore` | `store/live-store.ts` | `selectedRoundId/DanceId/HeatId`, `judgeStatuses`, `judgeOnline`, `danceConfirmations`, `heatResults`, `incidents`, `presMode`, `roundClosed`, `lastSentAt` |
| `useScheduleStore` | `store/schedule-store.ts` | `slots: ScheduleSlot[]`, `scheduleStatus`, `loadSchedule(competitionId)` |
| `useAuthStore` | `store/auth-store.ts` | JWT token v paměti, `user`, `setLocale()` |
| `useAlertsStore` | `store/alerts-store.ts` | notifikace, `addAlert()` |
| `useJudgeStore` | `store/judge-store.ts` | stav judge interface |

## Live modul — kritické gotchas

### Syntetická ID vs reálná UUID
Heaty na frontendu mají syntetická ID: `${slotId}-h${heatNumber}` (např. `abc123-h1`).
Jakékoli volání backendu vyžaduje **reálné UUID** přes `heatIdMap`:
```ts
const realHeatId = heatIdMap[syntheticHeatId]  // VŽDY takhle
```
`heatIdMap` se buildí asynchronně po resolve `activeRoundId` — může být prázdný při prvním renderu.

### Tance v live page — danceStyle pattern (přidáno 2026-04-01)
- `live/page.tsx` načítá tance **synchronně** z `slot.danceStyle` (z schedule store) — okamžité zobrazení
- API call na `/sections/{id}` je jen async upgrade (dodá reálná dance UUID pro scoring)
- `getDanceNames(style)` fallback: "latin" → LATIN_5, "standard" → STANDARD_5, default → STANDARD_5
- `ScheduleSlot` typ (`schedule.ts`) má `danceStyle: string | null` — plněno z backendu

### Polling architektura
- **8s** — judge statusy (v `use-judge-status-polling.ts`, spustí se když je `activeRoundId`)
- **30s** — connectivity poll online/offline (v `use-judge-connectivity.ts`, heartbeat fallback za SSE)
- Polling nikdy nepřepíše `submitted` zpět na nižší status

### Custom hooks (`src/hooks/`)
- `use-judge-status-polling.ts` — 8s polling judge statusů, nikdy nepřepíše `submitted`
- `use-round-control.ts` — `handleSend`, `handleCloseRound`, `handleResolveTie`, SSE result handlery
- `use-judge-connectivity.ts` — SSE primary + 30s heartbeat fallback (online/offline stav)

### `danceConfirmations` flow
`page.tsx` → `setDanceConfirmation(danceId, submitted, total)` → `live-store` → `LiveControlDashboard` (allDancesConfirmed) + `DanceSelector` (zelená fajfka)

### Live komponenty (`src/components/live/`)
`LiveControlDashboard` — hlavní kontejner, orchestruje vše (~320 řádků po refaktoru 2026-03-29)
`LiveBottomBar` — Send + Close round buttons (spodní lišta)
`LiveHelpModal` — keyboard shortcuts modal
`CloseRoundDialog` — potvrzení zavření kola
`TieResolutionDialog` — dialog pro tie resolution
`RoundResultsOverlay` — overlay výsledků po zavření kola
`IncidentModal` — wrapper incidentního modalu
`RoundSelector` / `DanceSelector` / `HeatSelector` — výběr
`JudgePanel` / `JudgeCard` — stav porotců
`LiveStatusBar` — horní lišta
`LiveSidebar` — pravý panel se stats
`HeatResults` — výsledky skupiny
`IncidentPanel` — incidenty
`PresentationOverlay` — fullscreen prezentační mód

## Judge scoring — pravidla chování

- **Čísla párů vždy seřazená** od nejmenšího po největší (`startNumber` ascending) — v prelim i final gridu
- **Po odeslání hodnocení tance se NESMÍ automaticky přejít na další tanec** — to řídí admin. Porotce po odeslání vidí "Hodnocení odesláno, čeká se na další tanec" a zůstává na této obrazovce, dokud admin neotevře další tanec.

## Judge API — X-Judge-Token header

- Judge endpointy (scoring, sync, active-round) používají `X-Judge-Token: <judgeTokenId>` header — **ne query param**
- Frontend: `headers: { 'X-Judge-Token': judgeTokenId }` v axios calls (scoring.ts, live.ts, judge-store.ts, judge-offline-store.ts)
- Backend: `@RequestHeader("X-Judge-Token")` v ScoringController, JudgeAccessController, SyncController

## UI/UX — povinné patterny

- **inputCls musí mít `text-base` (16px)**, ne `text-sm` — iOS Safari auto-zoomuje na inputs < 16px
- **Icon-only buttons** (Trash2, X, ...): vždy `min-h-[44px] min-w-[44px] flex items-center justify-center` — min. touch target
- **`<button>` elementy** v Tailwind nemají `cursor-pointer` defaultně — přidávej explicitně
- **Labels + inputs** — každý `<label>` musí mít `htmlFor`, každý `<input>`/`<textarea>` musí mít `id`. Pro dynamické listy: `id={\`field-${idx}-name\`}`
- **Decorative icons** (Lucide): vždy `aria-hidden="true"` na ikonách vedle textu

## Accessibility — povinné pre judge interface (`/judge/**`)

- Touch targets: **min 44×44px** — `min-h-[44px] min-w-[44px]` (Tailwind)
- Focus: `outline-none focus-visible:ring-2 focus-visible:ring-{color} focus-visible:ring-offset-2`
- Toggle/selection buttons: `aria-pressed={boolean}`
- Icon-only buttons: `aria-label="..."` povinné
- Dekoratívne ikony: `aria-hidden="true"`

## TypeScript build

PostToolUse hook automaticky spustí `tsc --noEmit` po každém editu `.ts`/`.tsx` souboru (viz `.claude/settings.json`). Manuálně:
```bash
#!/bin/zsh
export PATH="/Users/janbystriansky/node/bin:$PATH"
npx tsc --noEmit
```

## Sentry

- Config: `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- DSN: `process.env.NEXT_PUBLIC_SENTRY_DSN`
- Instrumentace: `src/instrumentation.ts` + `src/instrumentation-client.ts`
- Pro prod errory: `/seer` command nebo Sentry MCP přímo

## Backend API

- Backend: `http://localhost:8080`, Frontend dev: `http://localhost:3000`
- Všechny endpointy mají prefix `/api/v1/`
- API moduly: `src/lib/api/` — `competitions`, `rounds`, `sections`, `pairs`, `live`, `schedule`, `judge-tokens`, `scoring`, `auth`, `payments`, `gdpr`, atd.

## Wizard — nová soutěž (`/dashboard/competitions/new`)

- 3 kroky: **Základní info → Šablona → Sekce**
- Krok 2: 4 šablony (Ballroom Championship / Latin Bronze / Začátečníci / Prázdná) — prefillují sekce přes `replace()` z `useFieldArray`
- Krok 3: každá sekce má `numberOfJudges` + `maxFinalPairs`, live majority display: `floor(n/2)+1`
- Šablona musí být vybrána pro pokračování (button `disabled` dokud `selectedTemplate === null`)

## Hydration (Next.js SSR)

- Locale mismatch: server renders DEFAULT_LOCALE, client reads localStorage → `suppressHydrationWarning` **nestačí** pro text nodes. Použij `mounted` guard: `const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), []);` a renderuj locale-závislý text jen když `mounted === true`.

## Hotové stránky / endpointy — nezapomeň

- `/checkin/[token]/page.tsx` — frontend stránka již existuje; backend: CheckinTokenController + CheckinTokenService + entita CheckinToken + V050 migration (přidáno 2026-03-29)
- Přidej `/api/v1/checkin-tokens/**` do `permitAll()` v SecurityConfig (backend)

### Dancer platform (Spec A — A6+A7, přidáno 2026-03-30)
- `src/lib/api/dancer.ts` — dancer API modul (register, onboarding, profile, partner invite, my-competitions)
- `/register` — registrace tančíře + Google OAuth tlačítko (`/register/dancer` redirectuje sem)
- **Organizátoři se neregistrují sami** — pouze přes pozvánku od admina. Stránka `/register` je výhradně pro tanečníky.
- `/auth/callback` — OAuth2 callback; volá `POST /auth/refresh` z HttpOnly cookie → hydratuje store → redirect na `/onboarding` nebo `/profile`
- `/onboarding` — 2-krokový form (profil → partner); v proxy.ts přidáno jako public path
- `/profile` — profil + partner invite flow (generování linku, copy, unlink)
- `/profile/my-competitions` — competition history dashboard
- `/partner-invite/[token]` — public invite stránka; přidána do proxy.ts public paths
- **proxy.ts public paths**: `/auth/callback`, `/onboarding`, `/partner-invite` přidány

## Spec soubory

- **Schedule modul:** `/Users/janbystriansky/Documents/DanceAPP/MD/files-3/TASK_SCHEDULE_MODULE_v5.md`
  - Frontend route: `/dashboard/competitions/[id]/schedule`
  - Drag & drop: `@dnd-kit/core`

## Computer Use testy

- **Test 1 (core flows):** `computer-use-prompt.md` — 7 flows: Wizard, Live Control, Judge Scoring (mobile), Public Browsing, Schedule, Settings, Full E2E
- **Test 2 (full coverage):** `computer-use-prompt-2.md` — 16 flows (A–P): Dashboard pages, Competition Detail tabs (Kategorie, Páry, Porota, Check-in, Harmonogram, Live, Vyhodnocení, Diplomy, Obsah, E-maily, Platby, Rozpočet, Nastavení), Judge mobile, Veřejné stránky, Scoreboard, Dark/Light + Locale

### Výsledky testů (2026-03-31)

23/23 flows PASS. Nalezené bugy:

| Závažnost | Bug | Kde |
|-----------|-----|-----|
| **MAJOR** | Wizard silent validation — šablona neprefilluje "Kategorie soutěže" (series), RHF errors se nezobrazí uživateli, tlačítko "Vytvořit" nereaguje | `/dashboard/competitions/new` (krok 3) |
| **MEDIUM** | Chybějící i18n klíče na stránce Vyhodnocení — `results.hubTitle`, `results.categoriesCompleted`, `results.statusWaiting`, `results.statusInProgress` zobrazují raw klíče | `/dashboard/competitions/[id]/results` |
| **LOW** | Neúplné EN překlady na stats sub-labels (Účastníci) — "6 soutěží", "52% zaplaceno" zůstávají v CZ při EN locale | `/dashboard/participants` |
| **LOW** | Hydration mismatch na login — server renderuje EN, klient CZ (známý problém) | `/login` |
