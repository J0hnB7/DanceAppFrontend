# CLAUDE.md — DanceApp Frontend

> Automaticky načítáno Claude Code. Implementuj autonomně bez potvrzování.
> Zřídka potřebné detaily: `docs/claude-ref.md`

---

## SectionEditor — kanonická komponenta pro formulář sekce

`src/components/shared/section-editor.tsx` — **jediné místo** kde žije UI pro tvorbu/edit sekce.
- `competitions/new/page.tsx` ho používá (`fieldArrayName="categories"`), templates (`fieldArrayName="sections"`), `dashboard/competitions/[id]/sections/new/page.tsx` (`fieldArrayName="sections"`)
- Nepřidávej inline section form nikde jinde — přidej prop do `SectionEditor`

### Richtar kategorie — template mode via danceStyle
- `danceStyle = "SINGLE_DANCE" | "MULTIDANCE"` → Richtar režim; `"STANDARD" | "LATIN" | ...` → ČSTS režim
- Backend `danceStyle` je volný `String` — žádný enum, nové hodnoty projdou bez BE změny
- Richtar tance: `["Samba", "Cha Cha", "Rumba", "Paso Doble", "Polka", "Jive"]` (konstanta `RICHTAR_DANCES`)
- Age range: `minBirthYear`/`maxBirthYear` — Junior = `maxBirthYear=2014`, Děti = 2015–2017, Mini = 2018–2022
- `SectionTemplateItem` (`competition-templates.ts`) má `dances?: { danceName?: string }[]`, `minBirthYear?`, `maxBirthYear?`

## Dancer registrace — pouze přihlášení (2026-04-19)

- Anonymní registrace na soutěž **odstraněna** — dancer musí být přihlášen
- `/competitions/[id]/page.tsx` zobrazuje jen `eligibleSections` (filtrované podle `birthYear` z profilu)
- `/competitions/[id]/register/page.tsx` → redirect na `/competitions/[id]`
- Backend validuje věk v `SelfRegistrationService.register()` — `minBirthYear`/`maxBirthYear` vs `profile.getBirthYear()`
- CSP: Google Sign-In (`@react-oauth/google`) vyžaduje `https://accounts.google.com` v `script-src` i `frame-src` v `next.config.ts`

## LogoMark — sdílené logo

`src/components/ui/logo-mark.tsx` — `<LogoMark size={24} />` renderuje `public/logo.png`. Používej všude místo "PP" gradient divu. Import: `import { LogoMark } from "@/components/ui/logo-mark"`.

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
- **`GET /auth/me` 401 v console při page load je normální** — access token se neperzistuje, `checkAuth()` vždy začne bez tokenu → 401 → interceptor zkusí refresh → retry s novým tokenem. Console 401 neznamená bug; refresh selže teprve když vyprší i refresh token cookie.

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
- `useLocale()` vrací i `locale` (`"cs"` | `"en"`) — použij pro browser APIs: `const { t, locale } = useLocale()`
- Locale-aware date: `toLocaleDateString(locale === "cs" ? "cs-CZ" : "en-GB", { ... })`

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

## Sentry auth token — `.env.sentry-build-plugin`

`frontend/.env.sentry-build-plugin` je gitignorovaný a obsahuje živý `SENTRY_AUTH_TOKEN=sntryu_...` (Release=Admin scope). NIKDY necommituj. Pokud náhodou commitnut: ihned revoke na sentry.io → Settings → Auth Tokens. Soubor slouží jen pro lokální `sentry-cli` operace; v CI je token jako Vercel secret `SENTRY_AUTH_TOKEN`.

## Secret scanning (gitleaks — C4-lite ✅ 2026-04-17)

- **`.gitleaks.toml`** existuje — allowlist pro `.env.sentry-build-plugin` a `.env.example` placeholdery.
- **Gitleaks workflow** triggeruje na `main + feature/** + fix/** + hotfix/**`.
- **Rotation runbook**: `danceapp-backend/docs/runbooks/secret-rotation.md` — platí pro oba projekty.

## Sentry

- Config: `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- DSN: `process.env.NEXT_PUBLIC_SENTRY_DSN` — nastavené v `.env.local` + Vercel prod
- Org: `bystriansky`, Project: `javascript-nextjs`
- Instrumentace: `src/instrumentation.ts` + `src/instrumentation-client.ts`
- **CSP:** `worker-src 'self' blob:` musí byť v `next.config.ts` — Sentry SDK používa blob worker
- Pro prod errory: `/seer` command nebo Sentry MCP přímo
- **Session Replay:** `replaysSessionSampleRate: 0.1`, `replaysOnErrorSampleRate: 1.0`, `maskAllInputs: true` — zapnuté od 2026-04-16

## Sentry — source maps na Vercel (2026-04-16)

Vercel build vyžaduje 3 env vars (nie len token):
- `SENTRY_AUTH_TOKEN` — personal token s Release=Admin + Organization=Read scopmi
- `SENTRY_ORG=bystriansky`
- `SENTRY_PROJECT=javascript-nextjs`

Token overenie lokálne: `SENTRY_AUTH_TOKEN=xxx SENTRY_ORG=bystriansky npx @sentry/cli releases list`
**POZOR:** Token vždy čítaj cez JS DOM (`input.value`), nie zo screenshotu — screenshot skráti dlhé hodnoty → 401 Invalid token.

## Public pages — jazykový toggle (2026-04-16, updated 2026-04-17)

- `/competitions` a `/competitions/[id]` majú CZ/EN toggle v nave **na desktopu**, na mobile je skrytý a zobrazený vo footeri
- Vzor pre mobile-only footer toggle: CSS trieda `lang-toggle-nav` (skrytá na mobile) + `lang-toggle-footer` (viditeľná len na mobile)
- Media query v `<style>` tagu stránky: `@media(max-width:640px){.lang-toggle-nav{display:none!important}.lang-toggle-footer{display:inline-flex!important}}`
- Footer button má `style={{ display: "none" }}` inline (default skrytý), CSS ho zobrazí na mobile
- Štýl: `{ padding: "4px 10px", borderRadius: 6, background: "#f3f4f6", border: "1px solid #e5e7eb" }` — rovnaký ako landing page
- Toggle volá `setLocale()` z `useLocale()` — ukladá do localStorage
- Všetky 86 prekladových kľúčov `publicCompetition.*` existujú v cs.json aj en.json
- **Pozor:** Hardcoded Czech strings v public pages = bug. Vždy použi `t()` z `useLocale()`

## Backend API

- Backend: `http://localhost:8080`, Frontend dev: `http://localhost:3000`
- Všechny endpointy mají prefix `/api/v1/`
- API moduly: `src/lib/api/` — `competitions`, `rounds`, `sections`, `pairs`, `live`, `schedule`, `judge-tokens`, `scoring`, `auth`, `payments`, `gdpr`, atd.

## FE API typy — ruční drift (audit 2026-04-17)

`src/lib/api/*.ts` obsahuje ~25 ručně psaných TypeScript interfejsů — **nejsou generované z OpenAPI**. Drifty se nedetekují automaticky.

- **Potvrzený drift:** `InvoiceDto.amount` vs BE `totalAmount` — frontend mapuje `inv.amount ?? inv.totalAmount ?? 0` (`payments.ts:86`). Nepředpokládej, že FE název pole = BE název.
- **`RoundStatus` stale values:** `rounds.ts:3` obsahuje `"OPEN" | "CLOSED"` — v BE enumu **neexistují**. BE používá `PENDING | IN_PROGRESS | COMPLETED | CALCULATED`. Ignoruj `OPEN`/`CLOSED` ve switch/conditions.
- **`PairDto.competitionId` je `optional`** — backend ho v response neposílá vždy. NIKDY nepoužívej `pair.competitionId` pro URL konstrukci (→ `undefined` → URL `/competitions//pairs/...` → 404). Vždy předej `competitionId` z route params jako explicitní prop do komponent (vzor: `ContactModal`).
- Při přidávání nového BE pole → vždy ručně aktualizuj odpovídající interfejs v `src/lib/api/`.

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

**Vlastní bottom-sheet / potvrzovací overlay** (ne Radix Dialog) MUSÍ mít `role="dialog"`, `aria-modal="true"`, `aria-labelledby` a focus trap. Jinak Tab projde do pozadí. Preferuj Radix `<Dialog>` — focus trap zadarmo. Viz `ConfirmSheet` v `judge/[token]/round/page.tsx` (B18 G4 pending).

## Accessibility — `<html lang>` a dynamický locale switch (2026-04-17)

- `src/app/layout.tsx` má `lang="sk"` — **BUG**: UI je česky, správně `lang="cs"` (Phase B18 G2, HIGH, pending fix)
- Pro dynamický CS/EN switch: `document.documentElement.lang = locale` v `LocaleProvider` effect
- Nikdy `lang="sk"` pro česky psaný obsah — screen reader použije slovenskou výslovnost

## Accessibility — axe-core a CSP (2026-04-17)

- `@axe-core/playwright` — pending instalace a spec (`tests/e2e/accessibility.spec.ts`); Phase B18 G1
- Sken spouštěj **výhradně** v dev/test prostředí — prod CSP by mohla axe inline-script blokovat
- Pattern: `new AxeBuilder({ page }).analyze()` → `expect(results.violations).toEqual([])`

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

## Dev server — NIKDY nesmaz .next za běhu dev serveru

`rm -rf .next` za běhu dev serveru → `npx next build` vytvoří produkční build → dev server servíruje produkční `.next` → všechny stránky vrací 500. Fix: zabij dev server (`kill <pid>`), smaž `.next`, pak `npm run dev`.

## auth-light — POUZE mimo AppShell

`auth-light` class (přepisuje CSS proměnné na bílé) se smí použít **jen** na standalone stránkách bez AppShell (login, register, onboarding). Uvnitř AppShell/dashboard inputy zdědí tmavé CSS proměnné automaticky — `auth-light` by způsobil bílé inputy v dark mode. Select elementy v dashboardu: `background: "var(--surface)"`, ne `"#fff"`.

## DancerGuard — DANCER_ALLOWED_PATHS whitelist

`src/app/dashboard/layout.tsx` má `DANCER_ALLOWED_PATHS` — každá nová dashboard stránka přístupná pro DANCER musí být přidána do tohoto pole, jinak DANCER tiše přesměrován na `/dashboard/my-registrations`. Příčina: useEffect s `router.replace`.

## Zod v4 — enum error option

`z.enum([...], { required_error: "..." })` → nefunguje. Správně: `z.enum([...], { error: "..." })`.

## Zod v4 — coerce/preprocess vrací `unknown`

`z.coerce.number()` a `z.preprocess()` inferují `unknown` output type → TS chyba v react-hook-form resolveru. Fix: `z.string().refine((v) => { const n = Number(v); return Number.isInteger(n) && n >= MIN && n <= MAX; })` + `Number(values.field)` v handleru.

## Birthdate UI — tři selekty místo type="date"

Pattern pro výběr data bez klikání po měsících: tři `<select>` (Rok/Měsíc/Den) + `<input type="hidden" {...register("birthDate")}>`. Stav `birthParts: {year,month,day}` v `useState`, kombinace do `YYYY-MM-DD` přes `setValue`. Pre-fill z existujícího data v useEffect: `setBirthParts({year: String(d.getFullYear()), month: String(d.getMonth()+1), day: String(d.getDate())})`. Viz `dashboard/settings/page.tsx` a `onboarding/page.tsx`.

## Dancer — dva oddělené nav kontexty

`/profile/settings` má vlastní standalone top nav (`prof-nav-link` class, inline `<style>`). `/dashboard/settings` používá `sidebar.tsx` navItems. Jsou nezávislé — změna jednoho neovlivní druhý. `DANCER_ALLOWED_PATHS` v `dashboard/layout.tsx` chrání pouze `/dashboard/**` — linky na `/competitions` a jiné veřejné stránky whitelist nepotřebují.

## MyCompetitionEntry — flat struktura (ne sections)

Backend `GET /profile/dancer/competitions` vrací flat záznamy (`startNumber`, `sectionName`, `reachedRound` na top level) — **ne** `sections[]` array. Interface v `dancer.ts` byl opraven (2026-04-19).

## Public competition page — eligible sections + nav auth

- `eligibleSections` query musí mať `enabled: isDancer && dancerProfile !== undefined` — bez toho sa spustí pred načítaním profilu (birthYear=undefined → iný query key → zbytočný request)
- `PublicNav` na public pages musí čítať `useAuthStore` a zobrazovať meno + link na dashboard/profil pre prihláseného uživatela (nie statický "Přihlášení →")
- React Query `useQuery` s default `[]` tichý skryje 500 chybu — UI vyzerá ako "žiadne dáta"; root cause bugovania = backend hádže 500 (nie prázdny výsledok)

## CORS — localhost:3001 pro případ obsazeného portu

Pokud je port 3000 obsazen starým procesem, Next.js dev server spustí na 3001 → login selže (backend CORS blokuje). `application.yaml` má default `http://localhost:3000,http://localhost:3001` — oba porty vždy povoleny.

## Standalone pages — auth-light CSS pre biele inputy

`Input` komponent používa `bg-[var(--surface)]`, `border-[var(--border)]`, `text-[var(--text-primary)]` — bez redefinície zdedí tmavé dashboard hodnoty → čierne inputy na bielej stránke. Každá standalone stránka (onboarding, login, register) musí mať `<form className="auth-light">` kde `<style>` obsahuje `.auth-light{--surface:#fff;--border:#E5E7EB;--text-primary:#111827;--text-secondary:#6B7280;--text-tertiary:#9CA3AF;--radius-md:8px;--accent:#4F46E5;--destructive:#EF4444}`.

## sidebar navItems — vždy pridaj roles pre organizer/admin sekcie

`navItems` bez `roles` prop = viditeľné pre VŠETKÝCH vrátane DANCER. Každý item smerujúci na dashboard/organizer stránku MUSÍ mať `roles: ["ORGANIZER","ADMIN"]`. Ak rola DANCER potrebuje vlastnú stránku (napr. `/profile`), pridaj separátny item s `roles: ["DANCER"]`. Bez toho DANCER pristane na nesprávnom formulári.

## AppShell — sidebar prop gotcha

`<AppShell sidebar={<Sidebar />}>` → `usesDefaultSidebar = false` → Sidebar renderuje jako statický element vždy viditelný na mobile (žádný drawer, žádný hamburger). Správně pro všechny běžné dashboard stránky: `<AppShell>` bez prop. `sidebar` prop je jen pro `CompetitionSidebar` a jiné custom sidebary se svým vlastním mobile UI.

## Default Sidebar — mobile close on navigation

- `Sidebar` akceptuje voliteľný prop `onNavClick?: () => void` — zavolá sa pri kliknutí na každý nav link
- AppShell ho nastaví ako `() => setMobileOpen(false)` v mobile draweri → sidebar sa automaticky zavrie po navigácii
- Bez tohto prop sidebar zostane otvorený po kliknutí na link (bug: menu "zaseknuté" vľavo)
- Pattern: `<Sidebar onNavClick={() => setMobileOpen(false)} />` v AppShell mobile drawer

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

## Judge interface header — layout pravidlo (2026-04-14)

Header má **2 řádky**:
- Řádek 1: `flex items-center justify-between` — vlevo [sectionName + roundLabel], vpravo [WifiOff (jen offline), EN toggle, theme toggle, Hlásit (icon-only)]
- Řádek 2: `flex gap-1 overflow-x-auto` — dance tabs (scrollable, `scrollbarWidth: none`)
- Wifi ikona se zobrazuje **pouze** při offline (`!isOnline`) — online = žádná ikona
- Hlásit je v headeru jako icon-only (`TriangleAlert`, amber), **ne** jako floating button u bottom baru
- Round label: `round.roundType` → "Finále"/"Final", "Semifinále"/"Semifinal", "Čtvrtfinále"/"Quarter-final", nebo "Kolo N"/"Round N"
- Dance tabs mají `min-h-[36px]` (ne 44px) — jsou v headeru, ne standalone touch target

## CSS proměnné — light vs dark mode (2026-04-14)

- `--accent-subtle` light mode = `#DBEAFE` (blue-100). Dark = `rgba(96,165,250,0.12)`. Nikdy nepoužívej 8% opacity v light mode — je neviditelné.
- `--success-subtle` light mode = `#D1FAE5` (emerald-100). Dark = `rgba(16,185,129,0.1)`.
- `--success-text` light mode = `#047857` (emerald-700). Dark = `#34D399`.
- **Hardcoded dark-only barvy** (napr. `text-[#6EE7B7]`, `bg-[rgba(16,185,129,0.1)]`) jsou zapsané pro dark mode. V light mode jsou neviditelné. Vždy použij `dark:` varianty nebo CSS proměnné: `text-emerald-800 dark:text-emerald-300`.

## PageHeader — mobile pravidlo

- `PageHeader` má `flex flex-wrap` → akce se zalamují na druhý řádek pokud se nevejdou
- 3+ tlačítka v `actions`: na mobile skryj text s `hidden sm:inline`, zobraz jen ikonu + `aria-label`
- Pattern: `<Icon className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">Label</span>`

## Public pages — SecurityConfig permitAll (2026-04-16)

Endpointy volané z public competition stránky bez autentifikácie MUSIA byť v `permitAll`:
- `GET /competitions/*` — detailová stránka (bez toho 401 → "Competition not found")
- `GET /competitions/*/news` — news feed (bez toho React Query 3× retry = 7s zdržanie)
- `GET /competitions/*/sections` ✅ (bolo)
- `GET /sections/*/final-summary` ✅ (bolo)
- `GET /rounds/*/detail` ✅ (bolo)

Pri pridávaní nového endpointu volaného z `/competitions/**`: vždy skontroluj SecurityConfig.

## Favicon — browser cache (2026-04-16)

Prehliadače hľadajú `/favicon.ico` ako prvé pred `<link rel="icon">` tagom. Bez `public/favicon.ico` drží browser cache zo starej verzie donekonečna.
- `public/favicon.ico` generuj cez: `sips -z 32 32 logo.png --out /tmp/favicon-32.png` + Python ICO writer
- `src/app/icon.png` + `apple-icon.png` pre Next.js App Router metadata (apple-touch-icon)
- Hard refresh na mobile Safari: Settings → Safari → Advanced → Website Data → Delete

## ResultsSection — mobile table layout (2026-04-17)

`src/components/public/ResultsSection.tsx` — tabulka výsledků musí být **2-sloupcová** (ne 3):
- Sloupec 1: pořadí badge (nahoře, malý pill) + jméno (pod ním)
- Sloupec 2: body + chevron expand button (vpravo, `width: 80`)
- **Žádný `overflowX: auto` wrapper** — 2 sloupce se vejdou bez scrollu na 375px mobilu
- MÍSTO jako separátní sloupec → přidá ~60px → tabulka přetéká; vždy merge do name cell

**Jméno páru** (`dancerName`) je `"Muž Příjmení / Žena Příjmení"` — vždy split `" / "`:
- `parts[0]` = muž (první řádek, `fontWeight: 700`)
- `parts[1]` = žena (druhý řádek, `fontWeight: 600`)
- `r.club` = klub (třetí řádek, `fontSize: ".72rem", color: "#9CA3AF"`)

Backend: `dancer1Name + " / " + dancer2Name` v `ResultsService.java:694`, `RoundDetailService.java:342`.

## ResultsSection — lazy-load gotcha (2026-04-16)

`SectionResultCard` v `src/components/public/ResultsSection.tsx` používa `enabled` prop na React Query.
**NIKDY nepoužívaj `enabled: manualOpen !== false`** — `null !== false = true`, takže query beží pre každú sekciu hneď pri monte, aj keď je collapsed. Pri 15 sekciách = 15 simultánnych API calls → 20-30s loading.

Správny vzor: `enabled: manualOpen === true` — query sa spustí len keď užívateľ sekciu otvorí.

## Favicon — Next.js App Router (2026-04-16)

`src/app/icon.png` + `src/app/apple-icon.png` → Next.js automaticky generuje `<link rel="icon">` a apple-touch-icon. Žiadne zmeny v `layout.tsx` nie sú potrebné.

## Public competition detail — performance (2026-04-16)

- `staleTime: 60_000` na competition + sections queries v `competitions/[id]/page.tsx` — cached data sa zobrazí okamžite pri opakovanej návšteve
- Prefetch na hover: `onMouseEnter → queryClient.prefetchQuery(competitionKeys.detail(id))` v competitions list — data prichádzajú pred kliknutím
- Vercel Cron na Hobby plane podporuje len denné joby — pre keepalive pingov použi UptimeRobot (free, 5min interval)

## `formatDate` — používá `sk-SK` locale (BUG)

`src/lib/utils.ts:9` — `new Intl.DateTimeFormat("sk-SK", ...)`. App je CZ/EN, nie SK. Slovak dátum formát sa líši od česky. Pri oprave: zmeň na `cs-CZ` alebo predávaj `locale` parameter z `useLocale()`. Rovnaký problém v `formatTime` (line:17) a `formatCurrency` (line:25 — SK locale).

## SSE round-status — judge auto-refresh při otevření kola (2026-04-17)

Backend již broadcastuje `round-status` (eventName) s `{status:"RUNNING"}` do `Channel.PUBLIC` + ukládá do EventStore (replay po reconnectu) vždy když `RoundActivationService.activateRound()` dokončí přechod kola do IN_PROGRESS. **Žádná BE změna není potřeba.**

Judge klient (`round/page.tsx` i `final/page.tsx`) se přihlásí k odběru přes existující SSE EventSource na `/api/v1/sse/competitions/${competitionId}/public` a přidá:
```ts
es.addEventListener("round-status", (e: MessageEvent) => {
  try {
    const data = JSON.parse(e.data) as { status?: string };
    if (data.status === "RUNNING") loadActiveRoundRef.current();
  } catch { /* ignore */ }
});
```

## Judge final — long-press pro odebrání umístění (2026-04-17)

`PlacementRow` v `judge/[token]/final/page.tsx` — long-press je na **selected (modrém)** placement tlačítku, ne na oblasti startovního čísla.

- Timeout: **1000ms** (ne 600ms)
- Visální feedback: `animate-pulse ring-2 ring-white/70 ring-offset-1 ring-offset-[var(--accent)]` po dobu držení (`[holding, setHolding]` state)
- `isDone` prop blokuje long-press i click když je tanec odeslán
- `didLongPress.current` guard v `onClick` — zabrání re-assignování placement po long-pressu
- Cleanup: `useEffect(() => () => clearTimeout(timerRef.current), [])` při unmountu
- `onPointerDown/Up/Leave` pouze na `isSelected && !isDone` buttonech; `onContextMenu={(e) => e.preventDefault()}` zachováno

## Judge page routing — symetrie round type redirectu (2026-04-17)

Obě judge stránky musí přesměrovat když `loadActiveRound()` vrátí špatný typ kola:
- `round/page.tsx`: `if (roundType === "FINAL") router.replace('/final')` ✅ již existovalo
- `final/page.tsx`: `if (roundType !== "FINAL") router.replace('/round')` ← chybělo; přidáno commit ce2cdbb

**Scénář bug:** Po dokončení LATIN Finále soudci zůstali na `/final` stránce. Při spuštění STANDARD Kolo 1 přišel `heat-sent` SSE → `loadActiveRound()` načetl PRELIMINARY kolo, ale **nepřesměroval** → soudci viděli PRELIMINARY kolo s finálním UI (umístění 1–18 místo callbacks x/-).

**Pravidlo:** Každá `loadActiveRound()` `.then()` větev musí obsahovat type guard a redirect na správnou stránku. Bez symetrie = špatné scoring UI mezi sekcemi na stejné soutěži.

## Live page — heat draw musí předcházet activateSlot (2026-04-17)

Backend `/slots/{id}/activate` vrátí **403** pokud slot nemá heat assignments. `live/page.tsx` useEffect musí být **sekvenční** (ne paralelní):
1. `getHeatAssignments` → pokud 404, auto-draw (`drawHeats`) → `setHeats`
2. Teprve potom: fetch rounds → pokud nenalezeno, `activateSlot`

Paralelní spuštění (původní kód) = 403 na activate protože heaty ještě neexistovaly. Opraveno v `setupRound()` async funkci (commit ce2cdbb).

## React Query — enabled guard pro role-gated endpointy (2026-04-19)

Každý `useQuery` volající dancer/organizer endpoint MUSÍ mít `enabled: user?.role === "DANCER"` (nebo příslušnou roli). Bez toho každý přihlášený uživatel jiné role dostane 403 při návštěvě stránky. Vzor:
```ts
const { user } = useAuthStore();
const isDancer = user?.role === "DANCER";
const { data } = useQuery({
  queryKey: ["dancer-competitions"],
  queryFn: () => dancerApi.getMyCompetitions(),
  enabled: isDancer,  // ← VŽDY pro role-specific endpointy
});
```
Opraveno v `dashboard/results/page.tsx` — chyběl guard na `getMyCompetitions()`.

## Backend — onboardingCompleted flag bug pattern (2026-04-19)

`DancerProfileService.updateProfile()` původně přepočítával `onboardingCompleted` po každém uložení (klub byl required). Prázdný klub → flag na `false` → `requireOnboarded()` vyhazuje `ForbiddenException("ONBOARDING_REQUIRED")` → "Access denied" pro tančícího při každém dalším Save. Sebeposilující zámek.

**Pravidlo:** Update metody NESMÍ nikdy resetovat completion/status flagy na `false`. Ty patří pouze do `completeOnboarding()` / `activate()` flow.

**Auto-repair pattern** v `requireOnboarded()`: pokud flag je `false` ale `firstName` + `lastName` existují → oprav flag na `true` a ulož. Chrání před corrupted DB state bez ruční opravy.

**`@Transactional` na private metodě** je v Spring proxy AOP tiše ignorováno — save uvnitř `requireOnboarded()` funguje v kontextu volající `@Transactional` metody.

## Self-registration — competitionType pravidla (2026-04-19)

Backend `SelfRegistrationService` rozlišuje typ registrace:
- `danceStyle = "SINGLE_DANCE"` nebo `"MULTIDANCE"` → **Richtar = SOLO** (žádný partner, okamžitý `REGISTERED`)
- `competitionType = null` nebo `"COUPLE"` → párová soutěž (`PENDING_PARTNER`, čeká na partnera)
- `competitionType` začíná `"SOLO"` → solo
- `"FORMATION_*"` nebo `"SHOW"` → self-registration zamítnuta (400)

`getEligibleSections` propouští `null` competitionType — `register` musí být konzistentní.

## Spring ProblemDetail — `.detail` ne `.message`

Backend vrací `ProblemDetail.forStatusAndDetail(status, msg)` → tělo response má pole `detail`, ne `message`.
Frontend error handler: `err.response?.data?.detail ?? err.response?.data?.message`
Bez toho všechny 4xx chyby zobrazují generický fallback místo skutečné zprávy.

## paymentConfig — struktura polí

`competition.paymentConfig` je `Record<String, String>`:
- `BANK_TRANSFER`: klíče `holder`, `iban`, `bic`, `address`, `qrCode` (base64 PNG)
- `ORGANIZER_WEBSITE`: `{ url }`
- `STRIPE`: `{ apiKey }`

## Email šablona — registration-confirmed

`templates/emails/registration-confirmed.html` — Thymeleaf šablona v backendu, existuje.
Proměnné: `dancer1Name`, `competitionName`, `startNumber`, `sectionName`, `eventDate`, `startTime`, `venue`, `paymentHolder`, `paymentIban`, `paymentBic`, `entryFee`.
Volat: `emailNotificationService.send(..., NotificationType.REGISTRATION_CONFIRMED, "registration-confirmed", vars)`.

## Spec soubory

- **Schedule modul:** `/Users/janbystriansky/Documents/DanceAPP/MD/files-3/TASK_SCHEDULE_MODULE_v5.md`
  - Frontend route: `/dashboard/competitions/[id]/schedule`
  - Drag & drop: `@dnd-kit/core`
