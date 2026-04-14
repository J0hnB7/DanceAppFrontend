# CLAUDE.md — DanceApp Frontend

> Automaticky načítáno Claude Code. Implementuj autonomně bez potvrzování.
> Zřídka potřebné detaily: `docs/claude-ref.md`

---

## Stack

- **Next.js 16.1.6** (App Router), TypeScript strict, Tailwind CSS v4
- **React Query** — server state (`src/lib/query-client.ts` + `QueryProvider`)
- **Zustand** — client state (auth: `src/store/auth-store.ts`, alerts: `src/store/alerts-store.ts`)
- **Axios** — `src/lib/api-client.ts` s auto-refresh interceptorem

## Kritické Next.js 16 detaily

- Middleware přejmenován na `proxy` → soubor `src/proxy.ts`, export funkce `proxy()` (ne `middleware()`)
- `useSearchParams()` musí být zabalen do `<Suspense>` na úrovni page exportu
- **Turbopack je default** — custom `webpack` config bez `turbopack: {}` = build error "Call retries were exceeded". Fix: `turbopack: {}` v `next.config.ts`, odeber custom webpack funkcie
- **`output: "standalone"` NESMIE byť na Vercel** — len pre Docker/Railway. Na Vercel spôsobuje 500 na všetkých dynamických `ƒ` stránkach
- **`sentry.edge.config.ts` MUSÍ existovať** — `instrumentation.ts` ho importuje v edge runtime (middleware). Ak chýba → `Module not found` → middleware crash → všetky nekešované (dynamic) routes vracajú 500. Static routes fungujú lebo sú servované z CDN cache a middleware obchádzajú.

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

## Results detail — ČSTS-style tables (2026-04-09)

Endpoint: `GET /rounds/{roundId}/detail` → `roundsApi.getRoundDetail(roundId)` vrací `RoundDetail` union (`PreliminaryRoundDetail | FinalRoundDetail`). Rozliš přes type guards `isPreliminaryDetail()` / `isFinalDetail()` z `@/lib/api/rounds`.

Komponenty v `src/components/results/`:
- `PrelimRoundTable` — callback `x`/`-` grid (používá pro PRELIMINARY, QUARTER_FINAL, SEMIFINAL). Sticky první 3 sloupce na mobile, `font-mono text-base` (iOS anti-zoom), `scope` atributy.
- `FinalRoundTable` — dual-row buňky: raw marks + `calculatedPlacement`. Trophy/Medal ikony pro top 3.

`results/page.tsx` `RoundContent` používá `useQuery(["round-detail", round.id], ...)` a podle type guard volí komponentu. **Neimportuj** staré `RoundResultsResponse` ani `FINAL_TYPES` — odstraněno.

i18n klíče: `results.prelimDetailCaption`, `results.finalDetailCaption` (cs + en).

## Judge scoring — pravidla chování

- **Čísla párů vždy seřazená** od nejmenšího po největší (`startNumber` ascending) — v prelim i final gridu
- **Po odeslání hodnocení se po 1.5 s automaticky přejde na další neodeslaný tanec.** Admin do toho nezasahuje. Porotce nemůže navigovat manuálně — dance tabs jsou `<span>`, ne `<button>`. Implementace: `setTimeout(1500ms)` v `handleSubmit`/`submitDance` v `judge/[token]/round/page.tsx` a `final/page.tsx`. `initialLoadRef` zabraňuje auto-skipu na první mount; `floor-control` SSE event respektuje současný `submitted` stav.

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
- **Axios error logging** — `console.error('msg', err)` serializuje axios error jako `{}` (nečitelné). Vždy destrukturuj: `const detail = axios.isAxiosError(err) ? { status: err.response?.status, data: err.response?.data, message: err.message } : err;` a loguj `detail`.

## Accessibility — povinné pre judge interface (`/judge/**`)

- Touch targets: **min 44×44px** — `min-h-[44px] min-w-[44px]` (Tailwind)
- Focus: `outline-none focus-visible:ring-2 focus-visible:ring-{color} focus-visible:ring-offset-2`
- Toggle/selection buttons: `aria-pressed={boolean}`
- Icon-only buttons: `aria-label="..."` povinné
- Dekoratívne ikony: `aria-hidden="true"`

## Backend restart — vždy clean při změně repository/query

`./mvnw spring-boot:run` bez `clean` může použít stará `.class` — "Nothing to compile" = změna se nenačetla.
Po změně `@Query`, repository nebo service vždy:
```bash
./mvnw clean spring-boot:run -Dspring-boot.run.profiles=local -DskipTests > /tmp/backend.log 2>&1 &
```

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

## Playwright — login pattern (2026-04-10)

After `page.click('button[type="submit"]')` on login form:
- Use `page.wait_for_url(lambda url: "login" not in url, timeout=15000)` — NOT `wait_for_load_state("networkidle")`
- `networkidle` fires before the Next.js redirect completes; `wait_for_url` is reliable
- Section accordions on results page expand via `page.locator("text=SectionName").first.click()`, not `button[aria-expanded]`

## Modal accessibility — Escape key pattern

All dialogs/modals must close on Escape. Standard pattern:
```ts
useEffect(() => {
  if (!open) return;
  const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, [open, onClose]);
```

## Hydration (Next.js SSR)

- Locale mismatch: server renders DEFAULT_LOCALE, client reads localStorage → `suppressHydrationWarning` **nestačí** pro text nodes. Použij `mounted` guard: `const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), []);` a renderuj locale-závislý text jen když `mounted === true`.

## ESLint — gotchas

- `.worktrees/**` must be in `globalIgnores` in `eslint.config.mjs` — missing = every error appears doubled
- `useEffect(() => setMounted(true), [])` — legitimate SSR hydration guard, but flagged by `react-hooks/set-state-in-effect`; add `// eslint-disable-next-line react-hooks/set-state-in-effect` above it
- `Date.now()` impure-in-render: `useMemo` does NOT satisfy the rule — use `useState(() => Date.now())` lazy init instead

## Mobile grid stat cards — layout pravidlo

- 3-col grid na mobilu = ~111px/sloupec. `CardContent` má `p-5` (20px sides) → jen ~69px pro content.
- Horizontální layout (ikona + label + hodnota) potřebuje ≥120px → NEFUNGUJE v 3-col gridu.
- 2-col grid na mobilu = ~173px/sloupec, ale hodnota v `text-xl` (20px) může přesáhnout — vždy přidej `truncate`.
- **Fix:** Vertikální layout: `flex-col items-center` s `px-3 py-3`. Ikona (mobile) → `text-sm font-bold truncate` → `text-[10px] truncate` label. Na `sm+` se vrátí horizontální layout (`sm:flex-row sm:justify-between`).
- Vzor (payments/presence): ikona viditelná jen na mobilu (`sm:hidden`), na desktopu (`hidden sm:block`) vpravo.

## AppShell — mobilný top bar (2026-04-14)

- AppShell zobrazuje mobilný top bar (hamburger + ProPodium logo) **IBA** keď `sidebar === undefined` (defaultný Sidebar)
- Keď je custom `sidebar` (napr. `CompetitionSidebar`), AppShell **NESMIE** pridávať vlastný mobile top bar — CompetitionSidebar má vlastný fixed top bar → dvaja top bary
- `noPadding` stránky s custom sidebar (competition detail) potrebujú `max-lg:pt-14` na main content kvôli fixed CompetitionSidebar top baru
- **CompetitionSidebar mobile top bar**: hamburger vľavo, názov soutěže v strede, bez "DA" badge

## Mobile sidebar z-index pravidlo (2026-04-14)

- Sidebar MUSÍ mať vyšší z-index ako overlay: `sidebar z-[160]` > `overlay z-[150]`
- Ak overlay > sidebar → sidebar sa zasunie ale je neviditeľný za tmavým prekrytím (z-index bug)
- Dashboard page header: `flex-col sm:flex-row` pre mobile (nie `flex items-start justify-between`)
- Landing nav: pri ≤640px skry sekundárne nav tlačidlá, nechaj len primárny CTA

## CSS proměnné — light vs dark mode (2026-04-14)

- `--accent-subtle` light mode = `#DBEAFE` (blue-100). Dark = `rgba(96,165,250,0.12)`. Nikdy nepoužívej 8% opacity v light mode — je neviditelné.
- `--success-subtle` light mode = `#D1FAE5` (emerald-100). Dark = `rgba(16,185,129,0.1)`.
- `--success-text` light mode = `#047857` (emerald-700). Dark = `#34D399`.
- **Hardcoded dark-only barvy** (napr. `text-[#6EE7B7]`, `bg-[rgba(16,185,129,0.1)]`) jsou zapsané pro dark mode. V light mode jsou neviditelné. Vždy použij `dark:` varianty nebo CSS proměnné: `text-emerald-800 dark:text-emerald-300`.

## PageHeader — mobile pravidlo

- `PageHeader` má `flex flex-wrap` → akce se zalamují na druhý řádek pokud se nevejdou
- 3+ tlačítka v `actions`: na mobile skryj text s `hidden sm:inline`, zobraz jen ikonu + `aria-label`
- Pattern: `<Icon className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">Label</span>`

## Railway / Docker deployment

- `NEXT_PUBLIC_*` proměnné jsou **build-time** — v Dockerfile musí být jako `ARG` + `ENV ARG=$ARG`
- `.gitignore` má `.env*` glob — pro `.env.example` přidej výjimku `!.env.example`
- `output: "standalone"` v `next.config.ts` nutné pro Dockerfile (kopíruje jen `.next/standalone/`) — **ale NIKDY na Vercel** (spôsobuje 500 na dynamic routes)
- Healthcheck v Dockerfile: `/api/*` jsou rewrites na backend — nepoužívej jako healthcheck endpoint
- **NEXT_PUBLIC_MOCK_API musí být `false` v produkci** — pokud `true`, frontend nikdy nevolá backend (login vrátí "Invalid credentials")
- **`tests/mocks/jap-2026-data.ts` nesmí být v `.gitignore`** — importuje ho `src/mocks/db.ts`, Vercel build jinak selže
- **DNS AAAA záznam:** Po přidání domény na Vercel smaž AAAA (IPv6) záznamy u Websupport — jinak `ERR_CONNECTION_CLOSED` a SSL certifikát se nevydá

## Spec soubory

- **Schedule modul:** `/Users/janbystriansky/Documents/DanceAPP/MD/files-3/TASK_SCHEDULE_MODULE_v5.md`
  - Frontend route: `/dashboard/competitions/[id]/schedule`
  - Drag & drop: `@dnd-kit/core`
