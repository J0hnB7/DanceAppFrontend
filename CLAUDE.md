# CLAUDE.md — DanceApp Frontend

> Implementuj autonomně bez potvrzování.
> Detaily (setup, history, component lists): `docs/claude-ref.md`

---

## Stack & Architektura

- **Next.js 16.1.6** (App Router), TypeScript strict, Tailwind v4, React Query, Zustand, Axios (`src/lib/api-client.ts` auto-refresh)
- Backend: `http://localhost:8080`, endpointy s prefixem `/api/v1/`
- Dev: `http://localhost:3000` (nebo 3001 pokud obsazeno — CORS má oba)

```
src/app/
  (auth)/                # login, register, forgot-password
  dashboard/             # admin/organizer/dancer dashboard
  competitions/[id]/     # veřejná stránka + dancer registrace
  judge/[token]/         # judge interface (mobile-first, QR)
  moderator/[token]/     # moderátor (dark, bez authu)
  scoreboard/            # live výsledky (public)
src/components/ui/       # DataTable, Badge, Dialog, Progress, ...
src/components/shared/   # SectionEditor, NotificationCenter
src/lib/api/             # ruční TS typy (ne OpenAPI!)
src/lib/i18n/            # cs.json + en.json (vždy oba)
src/store/               # Zustand stores
src/proxy.ts             # middleware (Next 16: proxy, ne middleware)
```

### Node.js PATH
```bash
#!/bin/zsh
export PATH="/Users/janbystriansky/node/bin:$PATH"
```

---

## Next.js 16 — kritické

- Middleware = `src/proxy.ts`, export `proxy()` ne `middleware()`
- `useSearchParams()` → zabal do `<Suspense>` na page úrovni
- **Turbopack default** — custom webpack bez `turbopack: {}` = build error. Fix: `turbopack: {}` v `next.config.ts`
- **`output: "standalone"` NESMÍ být na Vercel** — jen Docker/Railway. Na Vercel = 500 na dynamic routes
- **`sentry.edge.config.ts` MUSÍ existovat** — instrumentation.ts ho importuje. Chybí → middleware crash → 500 na dynamic routes
- **Nikdy nesmaž `.next` za běhu dev serveru** — `next build` vyrobí produkční build → všechny stránky 500. Fix: zabij server, smaž, restart
- TypeScript kontrola: PostToolUse hook spouští `tsc --noEmit` automaticky po každém editu

---

## Design systém — tři světy

| Oblast | Barvy | Pravidlo |
|--------|-------|----------|
| `/dashboard/**` | CSS proměnné (`--accent`, `--surface`, `--border`, ...) | Nikdy hardcoded |
| `/competitions/**` (public) | Přímé hex (`#4F46E5`, `#111827`, `#F9FAFB`) | CSS proměnné tam nefungují |
| `/login`, `/register`, `/onboarding` | Inline + `.auth-light` class | Redefinuje CSS vars na světlé |

- Font: `var(--font-sora)` = nadpisy, Inter = body
- Public page hero: `#0A1628` + animované orby + wave SVG
- Mapování: `--background→#F9FAFB`, `--text-primary→#111827`, `--text-secondary→#6B7280`, `--border→#E5E7EB`, `--surface→#FFFFFF`, `--accent→#4F46E5`

### auth-light — jen standalone stránky
`.auth-light` class se smí použít **jen** mimo AppShell (login, register, onboarding). Uvnitř AppShell/dashboard inputy zdědí tmavé CSS vars automaticky — `auth-light` by v dark mode způsobil bílé inputy. Select v dashboardu: `background: "var(--surface)"`, ne `"#fff"`.

Vzor pro standalone: `<form className="auth-light">` kde `<style>` obsahuje:
```
.auth-light{--surface:#fff;--border:#E5E7EB;--text-primary:#111827;--text-secondary:#6B7280;--text-tertiary:#9CA3AF;--radius-md:8px;--accent:#4F46E5;--destructive:#EF4444}
```

### CSS proměnné light vs dark
- `--accent-subtle`: light `#DBEAFE`, dark `rgba(96,165,250,0.12)`. Nikdy 8% opacity v light mode — neviditelné.
- `--success-subtle`: light `#D1FAE5`, dark `rgba(16,185,129,0.1)`.
- `--success-text`: light `#047857`, dark `#34D399`.
- Hardcoded dark-only barvy (`text-[#6EE7B7]`) v light mode neviditelné — vždy `dark:` varianty.

---

## Auth & role

- JWT v paměti (Zustand), refresh token v HttpOnly cookie
- Route protection: `src/proxy.ts` kontroluje `refreshToken` cookie
- `GET /auth/me` 401 při page load je **normální** — interceptor udělá refresh + retry
- **Role-gated queries**: každý `useQuery` pro role-specific endpoint MUSÍ mít `enabled: user?.role === "DANCER"` (jinak 403 pro jinou roli)
- **DancerGuard**: `DANCER_ALLOWED_PATHS` v `dashboard/layout.tsx` — každá nová `/dashboard/*` stránka pro DANCER musí být v poli, jinak silent redirect na `/dashboard/my-registrations`
- **sidebar navItems `roles` prop povinný**: bez něj = viditelné všem (včetně DANCER). Organizer/admin items: `roles: ["ORGANIZER","ADMIN"]`
- Dancer má 2 nav kontexty: `/profile/settings` (standalone top nav, `prof-nav-link`) a `/dashboard/*` (sidebar) — nezávislé

---

## i18n

- Primární UI: **čeština**, sekundární: angličtina
- Vždy přidávej do obou `cs.json` + `en.json`
- Použití: `const { t, locale } = useLocale()` z `@/contexts/locale-context`
- `t('key')` nebo `t('key', { n: 5 })` pro params
- Locale-aware date: `toLocaleDateString(locale === "cs" ? "cs-CZ" : "en-GB", {...})`
- **Namespace trap**: admin klíče (`/dashboard/**`) MUSÍ být top-level — NIKDY pod `dancer.*`. `registrations.*` a `dancer.registrations.*` jsou různé namespacy → záměna = raw klíče v UI
- **Public pages toggle**: desktop v navu, mobile skryt a zobrazen ve footeru (CSS `.lang-toggle-nav` vs `.lang-toggle-footer`)
- Hardcoded Czech string v public pages = bug
- `formatDate`/`formatTime`/`formatCurrency` v `src/lib/utils.ts` stále používají `sk-SK` — **bug**, refaktor na `cs-CZ` / `locale` param

---

## UI/UX — povinné patterny

- **inputCls → `text-base` (16px)**, ne `text-sm` — iOS Safari auto-zoomuje pod 16px
- **Icon-only button**: `min-h-[44px] min-w-[44px] flex items-center justify-center`
- `<button>` v Tailwind nemá `cursor-pointer` defaultně — přidávej explicitně
- **Labels + inputs**: každý `<label>` má `htmlFor`, každý input `id`. Dynamic lists: `id={\`field-${idx}-name\`}`
- **Decorative ikony**: `aria-hidden="true"`
- **Axios error log**: destrukturuj! `const detail = axios.isAxiosError(err) ? { status: err.response?.status, data: err.response?.data, message: err.message } : err`
- **Spring ProblemDetail**: BE vrací `.detail`, ne `.message`. Handler: `err.response?.data?.detail ?? err.response?.data?.message`

### Modal / dialog
- Escape handler povinný: `window.addEventListener("keydown", e => e.key === "Escape" && onClose())`
- Preferuj Radix `<Dialog>` — focus trap zadarmo
- Custom overlay MUSÍ mít `role="dialog"` + `aria-modal="true"` + `aria-labelledby` + focus trap

### Mobile stat grid
- 3-col na mobilu ~111px/sloupec = nestačí pro horizontální layout. Použij `flex-col items-center` + `truncate`, na `sm+` vrátit horizontální.
- Ikona viditelná jen na mobile: `sm:hidden` + `hidden sm:block` desktop

### AppShell & sidebar
- `<AppShell>` bez `sidebar` prop = default Sidebar (mobile drawer + hamburger). S prop = custom bez drawer — jen pro `CompetitionSidebar`
- Default Sidebar: předej `onNavClick={() => setMobileOpen(false)}` → zavře se po navigaci
- Mobile z-index: sidebar `z-[160]` > overlay `z-[150]`. Overlay výš = sidebar neviditelný
- `noPadding` stránky s custom sidebar → `max-lg:pt-14` kvůli fixed top baru
- `PageHeader`: 3+ tlačítek → mobile skryj text (`hidden sm:inline`), jen ikona + `aria-label`

---

## Accessibility — judge interface (`/judge/**`)

- Touch targets **44×44px** minimum
- Focus: `outline-none focus-visible:ring-2 focus-visible:ring-{color} focus-visible:ring-offset-2`
- Toggle buttons: `aria-pressed={boolean}`
- Icon-only: `aria-label` povinné
- `<html lang="sk">` v `layout.tsx` je **BUG** — UI je česky, má být `cs`. Dynamický switch: `document.documentElement.lang = locale` v `LocaleProvider`
- axe-core via `@axe-core/playwright` jen v dev/test (prod CSP blokuje inline script)

---

## Hydration & SSR

- Locale mismatch: server renderuje DEFAULT_LOCALE, client čte localStorage → `suppressHydrationWarning` **nestačí**. Použij `mounted` guard: `const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), [])` a render locale-text jen když `mounted`. Vzor: `const locale = mounted ? rawLocale : "cs"` — Sentry hydration error na `/register`, `/login`, public pages

## Unhandled promise rejections (Sentry)

- **`.then()` bez `.catch()` = Sentry issue** — `"Object captured as promise rejection with keys: errors, message"`. BE ProblemDetail má klíče `errors/message/detail/status` → reject s objektem ne Error instance
- `try { await x } finally {}` bez `catch` bloku = stejný problém, chybu si odnese finally ale rejection zůstane unhandled
- Pattern: `api.call().then(...).catch(e => console.error("[ctx]", e))` nebo toast-only handler

## ESLint gotchas

- `.worktrees/**` v `globalIgnores` v `eslint.config.mjs` (bez toho duplicitní errory)
- `setMounted(true)` v useEffect je legit SSR guard — přidej `// eslint-disable-next-line react-hooks/set-state-in-effect`
- `Date.now()` impure-in-render: `useMemo` nestačí → `useState(() => Date.now())` lazy init

---

## Zustand stores

| Store | Soubor | Co drží |
|-------|--------|---------|
| `useLiveStore` | `store/live-store.ts` | selectedRoundId/DanceId/HeatId, judgeStatuses, heatResults, incidents, presMode, roundClosed |
| `useScheduleStore` | `store/schedule-store.ts` | slots, scheduleStatus, loadSchedule(competitionId) |
| `useAuthStore` | `store/auth-store.ts` | JWT token, user, setLocale() |
| `useAlertsStore` | `store/alerts-store.ts` | notifikace, addAlert() |
| `useJudgeStore` | `store/judge-store.ts` | stav judge interface |

---

## Real-time & live modul

- `useSSE(competitionId, event, handler)` — bere JEDEN event string, ne array
- SSE eventy: `judge-connected`, `judge-disconnected`, `score-submitted`, `heat:all-submitted`, `round-status`
- SSE vyhrává nad pollingem: `submitted` status se nikdy nepřepisuje zpět
- WebSocket (STOMP) pro live marking (judge interface)
- Polling: 8s judge statusy (`use-judge-status-polling.ts`), 30s connectivity (`use-judge-connectivity.ts`)

### Syntetická vs reálná heat ID
Heaty na FE: `${slotId}-h${heatNumber}`. BE calls vyžadují reálné UUID přes `heatIdMap[syntheticId]`. Map se buildí async po resolve `activeRoundId` — může být prázdný při prvním renderu.

### Tance v live/page — synchronní z `slot.danceStyle`
Okamžité zobrazení ze `slot.danceStyle` (schedule store). API `/sections/{id}` je jen async upgrade (dodá UUID pro scoring). `getDanceNames(style)` fallback: "latin"→LATIN_5, "standard"→STANDARD_5, default→STANDARD_5.

### Heat draw před activateSlot
Backend `/slots/{id}/activate` vrátí **403** pokud slot nemá heat assignments. Pořadí v `live/page.tsx`: 1) `getHeatAssignments` → pokud 404, auto-draw → setHeats; 2) TEPRVE PAK fetch rounds / activateSlot. Paralelní = 403.

---

## Judge scoring

- **Čísla párů vždy seřazená** od nejmenšího (`startNumber` ascending) — prelim i final grid
- **Auto-skip po odeslání**: 1.5s timeout → další neodeslaný tanec. Porotce nemůže navigovat manuálně (dance tabs jsou `<span>`). `initialLoadRef` zabraňuje auto-skipu na první mount; `floor-control` SSE respektuje `submitted` stav
- **Long-press placement** (final/page.tsx `PlacementRow`): 1000ms na **selected (modrém)** buttonu, `animate-pulse ring-2` feedback, `didLongPress.current` guard v onClick, cleanup timeoutu v useEffect
- **Judge API header**: `X-Judge-Token: <judgeTokenId>` — ne query param. FE i BE ve scoring.ts, live.ts, judge-store.ts, ScoringController, JudgeAccessController, SyncController

### Judge page routing — symetrie redirectu
Obě judge stránky musí přesměrovat když `loadActiveRound()` vrátí špatný typ:
- `round/page.tsx`: `if (roundType === "FINAL") router.replace('/final')`
- `final/page.tsx`: `if (roundType !== "FINAL") router.replace('/round')`

Bez symetrie mezi sekcemi na stejné soutěži → špatné scoring UI.

### Judge header layout (2 řádky)
- Řádek 1: `justify-between` — vlevo [sectionName + roundLabel], vpravo [WifiOff (jen offline), EN toggle, theme, Hlásit icon-only]
- Řádek 2: `gap-1 overflow-x-auto` — dance tabs scrollable
- Wifi ikona jen při `!isOnline`. Hlásit v headeru jako icon-only (`TriangleAlert`, amber), NE floating button
- Dance tabs `min-h-[36px]` (v headeru, ne standalone)

---

## SectionEditor — kanonická komponenta

`src/components/shared/section-editor.tsx` = **jediné místo** UI pro tvorbu/edit sekce.
- `competitions/new/page.tsx` (`fieldArrayName="categories"`)
- Templates + `dashboard/competitions/[id]/sections/new/page.tsx` (`fieldArrayName="sections"`)
- `hideAppend={true}` skryje "Přidat sekci" — pro edit dialogy jedné položky
- **Nepřidávej inline section form jinde** — rozšiř `SectionEditor`

### Richtar kategorie (danceStyle)
- `danceStyle = "SINGLE_DANCE" | "MULTIDANCE"` → Richtar; `"STANDARD" | "LATIN" | ...` → ČSTS
- BE `danceStyle` je volný `String` — nové hodnoty projdou bez BE změny
- Richtar tance: `["Samba", "Cha Cha", "Rumba", "Paso Doble", "Polka", "Jive"]` (`RICHTAR_DANCES`)
- Age range: Junior `maxBirthYear=2014`, Děti 2015–2017, Mini 2018–2022
- `SectionTemplateItem` má `dances?: { danceName?: string }[]`, `minBirthYear?`, `maxBirthYear?`

### CompetitionTemplate — backend validace
- `icon` má `@NotBlank` → FE fallback `data.icon?.trim() || "📋"` v handleCreate/handleEdit
- `SectionTemplateValidator.VALID_DANCE_STYLES` je whitelist — při novém danceStyle přidat do setu v `SectionTemplateValidator.java`
- Java `SectionTemplateItem` record MUSÍ obsahovat všechna pole z FE interface — jinak se Richtar data při uložení ztratí
- `competitorType`/`competitionType` validator kontroluje `!= null` ale NE `!isEmpty()` → `""` způsobí 400. FE: posílej `|| undefined`

---

## Dancer — registrace & profile

- **Dancer se MUSÍ přihlásit** — anonymní registrace zrušena
- `/competitions/[id]/page.tsx` zobrazuje jen `eligibleSections` (filtr podle `birthYear` profilu)
- `/competitions/[id]/register/page.tsx` → redirect na detail
- BE validuje věk v `SelfRegistrationService.register()`
- CSP: Google Sign-In (`@react-oauth/google`) vyžaduje `https://accounts.google.com` v `script-src` + `frame-src`

### eligibleSections query guard
`enabled: isDancer && dancerProfile !== undefined` — bez toho query běží před načtením profilu (birthYear undefined → jiný query key → zbytečný request)

### Batch self-registration — shared startNumber
- `POST /competitions/{id}/pairs/self-register-batch` s `{ sectionIds: UUID[] }` → jeden `pairId` + `startNumber` pro všechny sekce
- BE: `SelfRegistrationService.registerBatch()` reuses Pair přes `PairRepository.findByCompetitionIdAndUserId`
- Jeden souhrnný email přes `registration-confirmed-batch.html` (`sectionRows` HTML string, `sectionCount`, total `entryFee`)
- FE: volej `selfRegistrationApi.registerBatch()` jednou, NE loop `register()`
- Starý `register()` zachován pro kompat

### competitionType pravidla
- `danceStyle = SINGLE_DANCE | MULTIDANCE` → Richtar SOLO, okamžitý `REGISTERED`
- `competitionType = null | COUPLE` → párová (`PENDING_PARTNER`)
- `competitionType` začíná `SOLO` → solo
- `FORMATION_*` nebo `SHOW` → self-registration zamítnuta (400)

### MyCompetitionEntry — flat
BE `GET /profile/dancer/competitions` vrací flat záznamy (`startNumber`, `sectionName`, `reachedRound` top-level) — ne `sections[]` array.

---

## FE API typy — ruční drift

`src/lib/api/*.ts` = ~25 ručně psaných interfejsů (nejsou z OpenAPI). Drifty se nedetekují.

- **InvoiceDto.amount vs BE totalAmount** — `inv.amount ?? inv.totalAmount ?? 0` (`payments.ts:86`)
- **RoundStatus**: `rounds.ts:3` obsahuje stale `"OPEN" | "CLOSED"` — BE má `PENDING | IN_PROGRESS | COMPLETED | CALCULATED`. Ignoruj
- **PairDto.competitionId je optional** — BE neposílá vždy. NIKDY nepoužívej pro URL construction (→ `/competitions//pairs/...` → 404). Předávej z route params jako prop (vzor: `ContactModal`)
- **CreateSectionRequest.dances** je `string[]` — BE očekává pole stringů (commit b3a80b5). NIKDY `.map(name => ({ danceName: name }))` — vyhazuje `HttpMessageNotReadableException: Cannot deserialize value of type 'java.lang.String'`. Platí pro create, update i import.
- **write-xlsx-file `type` field**: nikdy `type: undefined` — podmíněný objekt `val != null ? { value: val, type: Number } : { value: "" }`
- **Default `[]` v useQuery tichý skrývá 500** — UI vypadá jako "žádná data" ale backend crashuje

---

## Key UI komponenty & patterny

- `SimpleDialog` — `<SimpleDialog open onClose title>` (`dialog.tsx`)
- `NavTabs` — `<NavTabs tabs activeTab onChange>`
- `DataTable` — sortable, filterable, CSV export
- `NotificationCenter` místo Bell buttonu v `header.tsx`
- `LogoMark` — `<LogoMark size={24} />` z `src/components/ui/logo-mark.tsx` (místo "PP" gradient divu)

### Results tables (ČSTS-style)
`GET /rounds/{roundId}/detail` → `roundsApi.getRoundDetail(roundId)` vrací `PreliminaryRoundDetail | FinalRoundDetail` union. Type guards `isPreliminaryDetail()` / `isFinalDetail()` z `@/lib/api/rounds`.
- `PrelimRoundTable` — callback `x/-` grid (PRELIMINARY/QUARTER/SEMI), sticky 3 sloupce, `font-mono text-base`
- `FinalRoundTable` — dual-row buňky: raw marks + `calculatedPlacement`, trophy/medal top 3

### ResultsSection mobile (2-sloupcová)
- Sloupec 1: pořadí badge (nahoře) + jméno (pod ním)
- Sloupec 2: body + chevron (vpravo, width 80)
- Bez `overflowX: auto` — 375px mobile OK
- Jméno `dancerName` = `"Muž / Žena"`, split `" / "`: `parts[0]` muž (fw 700), `parts[1]` žena (fw 600), `r.club` 3. řádek
- **Lazy-load**: `enabled: manualOpen === true` (NE `!== false` — `null !== false = true` → 15 sekcí = 15 requests)

### Birthdate UI
3 `<select>` (Rok/Měsíc/Den) + `<input type="hidden" {...register("birthDate")}>`. Stav `birthParts` v useState, kombinace `YYYY-MM-DD` přes `setValue`. Vzor: `dashboard/settings/page.tsx`, `onboarding/page.tsx`.

---

## Zod v4 gotchas

- `z.enum([...], { required_error: ... })` **nefunguje** → `{ error: "..." }`
- `z.coerce.number()` / `z.preprocess()` inferují `unknown` → TS chyba v RHF resolveru. Fix: `z.string().refine(v => Number.isInteger(Number(v)) && ...)` + `Number(values.field)` v handleru

---

## paymentConfig struktura

`competition.paymentConfig: Record<String, String>`:
- `BANK_TRANSFER`: `holder`, `iban`, `bic`, `address`, `qrCode` (base64 PNG)
- `ORGANIZER_WEBSITE`: `{ url }`
- `STRIPE`: `{ apiKey }`

---

## Backend — critical

- `restart při změně repository/query` — `./mvnw clean spring-boot:run -Dspring-boot.run.profiles=local -DskipTests > /tmp/backend.log 2>&1 &`. Bez `clean` "Nothing to compile" = změna se nenačetla
- **onboardingCompleted flag**: update metody NESMÍ resetovat na `false`. Patří jen do `completeOnboarding()`/`activate()`. Auto-repair v `requireOnboarded()`: pokud false + firstName+lastName existují → oprav
- `@Transactional` na private metodě je AOP ignorováno (funguje v kontextu volající @Transactional)
- **Public SecurityConfig**: endpointy z `/competitions/**` bez auth → MUSÍ být `permitAll()`. `/competitions/*`, `/competitions/*/news`, `/competitions/*/sections`, `/sections/*/final-summary`, `/rounds/*/detail`

---

## Sentry

- Config: `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- DSN: `NEXT_PUBLIC_SENTRY_DSN`, org `bystriansky`, project `javascript-nextjs`
- CSP: `worker-src 'self' blob:` v `next.config.ts` (Sentry blob worker)
- Session Replay: 0.1 session / 1.0 onError, `maskAllInputs: true`
- Prod errory: `/seer` command nebo Sentry MCP
- Vercel build env vars: `SENTRY_AUTH_TOKEN` + `SENTRY_ORG=bystriansky` + `SENTRY_PROJECT=javascript-nextjs`

---

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

---

## Spec soubory

- **Schedule modul**: `/Users/janbystriansky/Documents/DanceAPP/MD/files-3/TASK_SCHEDULE_MODULE_v5.md`
  - Route: `/dashboard/competitions/[id]/schedule`, D&D: `@dnd-kit/core`
