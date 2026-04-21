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
src/components/shared/   # section editor, NotificationCenter
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

- Font: `var(--font-sora)` = nadpisy, Inter = body. Public hero: `#0A1628` + orby + wave SVG
- Mapování: `--background→#F9FAFB`, `--text-primary→#111827`, `--border→#E5E7EB`, `--surface→#FFFFFF`, `--accent→#4F46E5`

### auth-light — jen standalone stránky
`.auth-light` class se smí použít **jen** mimo AppShell (login, register, onboarding). Uvnitř AppShell/dashboard inputy zdědí tmavé CSS vars automaticky — `auth-light` by v dark mode způsobil bílé inputy. Select v dashboardu: `background: "var(--surface)"`, ne `"#fff"`. Vzor: `<form className="auth-light">` + inline `<style>` redefining `--surface:#fff; --border:#E5E7EB; --text-primary:#111827; --accent:#4F46E5; --destructive:#EF4444`.

### CSS proměnné light vs dark
- `--accent-subtle` light `#DBEAFE` / dark `rgba(96,165,250,0.12)` — nikdy 8% opacity v light mode
- `--success-subtle` / `--success-text` liší se light vs dark; hardcoded dark-only barvy (`text-[#6EE7B7]`) v light mode neviditelné — vždy `dark:` varianty

---

## Auth & role

- JWT v paměti (Zustand), refresh token v HttpOnly cookie. Route protection: `src/proxy.ts` kontroluje `refreshToken` cookie
- `GET /auth/me` 401 při page load je **normální** — interceptor udělá refresh + retry
- **Role-gated queries**: každý `useQuery` pro role-specific endpoint MUSÍ mít `enabled: user?.role === "DANCER"` (jinak 403 pro jinou roli)
- **DancerGuard**: `DANCER_ALLOWED_PATHS` v `dashboard/layout.tsx` — každá nová `/dashboard/*` stránka pro DANCER musí být v poli, jinak silent redirect na `/dashboard/my-registrations`
- **sidebar navItems `roles` prop povinný**: bez něj = viditelné všem (včetně DANCER). Organizer/admin items: `roles: ["ORGANIZER","ADMIN"]`
- Dancer má 2 nav kontexty: `/profile/settings` (standalone top nav, `prof-nav-link`) a `/dashboard/*` (sidebar) — nezávislé

---

## i18n

- Primární UI: **čeština**, sekundární angličtina. Vždy přidávej do obou `cs.json` + `en.json`
- Použití: `const { t, locale } = useLocale()` z `@/contexts/locale-context`; `t('key', { n: 5 })` pro params
- Locale-aware date: `toLocaleDateString(locale === "cs" ? "cs-CZ" : "en-GB", {...})`
- **Namespace trap**: admin klíče (`/dashboard/**`) MUSÍ být top-level — NIKDY pod `dancer.*`. `registrations.*` a `dancer.registrations.*` jsou různé namespacy → záměna = raw klíče v UI
- **Public pages toggle**: desktop v navu, mobile ve footeru (`.lang-toggle-nav` vs `.lang-toggle-footer`). Hardcoded Czech v public pages = bug
- `formatDate`/`formatTime`/`formatCurrency` v `src/lib/utils.ts` stále používají `sk-SK` — **bug**, refaktor na `cs-CZ` / `locale` param

---

## Hydration & SSR

- Locale mismatch: server renderuje DEFAULT_LOCALE, client čte localStorage → `suppressHydrationWarning` **nestačí**. Použij `mounted` guard: `const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), [])` a render locale-text jen když `mounted`. Vzor: `const locale = mounted ? rawLocale : "cs"` — Sentry hydration error na `/register`, `/login`, public pages

## Unhandled promise rejections (Sentry)

- **`.then()` bez `.catch()` = Sentry issue** — `"Object captured as promise rejection with keys: errors, message"`. BE ProblemDetail má klíče `errors/message/detail/status` → reject objektem, ne Error instancí
- `try { await x } finally {}` bez `catch` bloku = stejný problém. Pattern: `api.call().then(...).catch(e => console.error("[ctx]", e))`

## ESLint gotchas

- `.worktrees/**` v `globalIgnores` v `eslint.config.mjs` (bez toho duplicitní errory)
- `setMounted(true)` v useEffect = legit SSR guard → `// eslint-disable-next-line react-hooks/set-state-in-effect`
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

## FE API typy — ruční drift

`src/lib/api/*.ts` = ~25 ručně psaných interfejsů (ne z OpenAPI). Drifty se nedetekují.

- **InvoiceDto.amount vs BE totalAmount** — `inv.amount ?? inv.totalAmount ?? 0` (`payments.ts:86`)
- **RoundStatus**: `rounds.ts:3` stale `"OPEN" | "CLOSED"` — BE má `PENDING | IN_PROGRESS | COMPLETED | CALCULATED`
- **PairDto.competitionId je optional** — NIKDY pro URL construction (`/competitions//pairs/...` → 404). Předávej z route params jako prop
- **CreateSectionRequest.dances** je `string[]` (commit b3a80b5). NIKDY `.map(name => ({ danceName: name }))` — `HttpMessageNotReadableException`. Platí pro create, update i import
- **write-xlsx-file `type` field**: nikdy `type: undefined` — `val != null ? { value: val, type: Number } : { value: "" }`
- **Default `[]` v useQuery tichý skrývá 500** — UI "žádná data" ale backend crashuje

---

## Backend — critical

- `restart při změně repository/query`: `./mvnw clean spring-boot:run -Dspring-boot.run.profiles=local -DskipTests > /tmp/backend.log 2>&1 &`. Bez `clean` "Nothing to compile" = změna se nenačetla
- **onboardingCompleted flag**: update metody NESMÍ resetovat na `false`. Patří jen do `completeOnboarding()`/`activate()`. Auto-repair v `requireOnboarded()`: pokud false + firstName+lastName existují → oprav
- `@Transactional` na private metodě je AOP ignorováno (funguje v kontextu volající @Transactional)
- **Public SecurityConfig** `permitAll()`: `/competitions/*`, `/competitions/*/news`, `/competitions/*/sections`, `/sections/*/final-summary`, `/rounds/*/detail`

---

## Sentry

- Config: `sentry.client/server/edge.config.ts`. DSN: `NEXT_PUBLIC_SENTRY_DSN`, org `bystriansky`, project `javascript-nextjs`
- CSP: `worker-src 'self' blob:` v `next.config.ts` (Sentry blob worker)
- Session Replay: 0.1 session / 1.0 onError, `maskAllInputs: true`. Prod errory: `/seer` command nebo Sentry MCP
- Vercel build env vars: `SENTRY_AUTH_TOKEN` + `SENTRY_ORG=bystriansky` + `SENTRY_PROJECT=javascript-nextjs`

---

## Spec soubory

- **Schedule modul**: `/Users/janbystriansky/Documents/DanceAPP/MD/files-3/TASK_SCHEDULE_MODULE_v5.md`
  - Route: `/dashboard/competitions/[id]/schedule`, D&D: `@dnd-kit/core`

---

## INDEX — kde najít co

### Auto-trigger skills
- **`ui-ux-checklist`** — UI/UX patterns, accessibility, judge interface, results tables, mobile, forms, modals (triggers on page.tsx, new component, visual change)

### On-demand docs (docs/gotchas/, Read when relevant)
- `realtime.md` — Live module, heat IDs, dance sync
- `judge.md` — Judge scoring UI, routing, header
- `section-editor.md` — section editor canonical component, richtar kategorie
- `dancer-registration.md` — Self-reg, eligibleSections, batch
- `testing.md` — Vitest, Playwright patterns
- `zod-paymentConfig.md` — Zod v4 gotchas, paymentConfig struct
