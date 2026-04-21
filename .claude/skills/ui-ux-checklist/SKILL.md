---
name: ui-ux-checklist
description: Use when creating or modifying frontend UI — new page.tsx, new component, visual/layout change, accessibility work, judge interface, results tables, mobile responsive, forms, modals. Triggers on: "page.tsx", "component", "UI", "UX", "accessibility", "mobile", "responsive", "judge interface", "modal", "dialog", "sidebar", "results table", "form", "birthdate".
---

# UI/UX checklist — DanceApp frontend

After creating any new page.tsx or major component, go through this checklist
proactively. If any item fails, fix it as part of the implementation.

## Required checklist (proactive)

| Area | Check |
|--------|----------------|
| Accessibility | Kontrast ≥ 4.5:1, focus rings, aria-labels na icon buttons, label+for na form fields |
| Touch | Targets ≥ 44×44px, cursor-pointer na klikatelné, loading state na async buttons |
| Typography | Body ≥ 16px na mobile, line-height 1.5–1.75, řádky 65–75 znaků |
| Formuláře | Error feedback blízko problému, disabled během submitu |
| Animace | 150–300ms micro, transform/opacity (ne width/height), prefers-reduced-motion |
| Responzivita | Žádný horizontal scroll, content fits viewport, z-index škála (10/20/30/50) |
| Recharts | aria atributy, dostatečný kontrast sérií |
| Mobile (judge) | tap vs hover, font ≥ 16px, skeleton pro async data |

Selhal bod → oprav ihned jako součást implementace.

## Required patterns

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

## Accessibility — judge interface (`/judge/**`)

- Touch targets **44×44px** minimum
- Focus: `outline-none focus-visible:ring-2 focus-visible:ring-{color} focus-visible:ring-offset-2`
- Toggle buttons: `aria-pressed={boolean}`
- Icon-only: `aria-label` povinné
- `<html lang>` default `"cs"` (commit 6547c12), dynamický sync: `document.documentElement.lang = locale` effect v `LocaleProvider`
- **axe-core a11y gate**: `tests/e2e/accessibility.spec.ts` (C18, commit 0d2be21). WCAG 2.1 AA, fail na `critical`/`serious`, `moderate`/`minor` → `docs/accessibility/a11y-backlog.md`. Skipuje pages bez env vars: `E2E_COMPETITION_ID`, `E2E_JUDGE_TOKEN`. Jen v dev/test (prod CSP blokuje inline script)
- **Skip-to-content link**: v `src/app/layout.tsx` jako první child `<QueryProvider>`, target `<main id="main-content">` v `AppShell`. `sr-only focus:not-sr-only focus:fixed ...` vzor
- **Icon-only toggle button** (Eye/EyeOff, atd.): povinné `aria-label={state ? t("hide") : t("show")}` + `aria-pressed={state}` + ikony `aria-hidden="true"`. Vzor: login/register/reset-password password toggle

## Key UI components & patterns

- `SimpleDialog` — `<SimpleDialog open onClose title>` (`dialog.tsx`)
- `NavTabs` — `<NavTabs tabs activeTab onChange>`
- `DataTable` — sortable, filterable, CSV export
- `NotificationCenter` místo Bell buttonu v `header.tsx`
- `LogoMark` — `<LogoMark size={24} />` z `src/components/ui/logo-mark.tsx` (místo "PP" gradient divu)

### Results tables (ČSTS-style)
`GET /rounds/{roundId}/detail` → `roundsApi.getRoundDetail(roundId)` vrací `PreliminaryRoundDetail | FinalRoundDetail` union. Type guards `isPreliminaryDetail()` / `isFinalDetail()` z `@/lib/api/rounds`.
- `PrelimRoundTable` — callback `x/-` grid (PRELIMINARY/QUARTER/SEMI), sticky 3 sloupce, `font-mono text-base`
- `FinalRoundTable` — dual-row buňky: raw marks + `calculatedPlacement`, trophy/medal top 3

### ResultsSection mobile (2-column)
- Sloupec 1: pořadí badge (nahoře) + jméno (pod ním)
- Sloupec 2: body + chevron (vpravo, width 80)
- Bez `overflowX: auto` — 375px mobile OK
- Jméno `dancerName` = `"Muž / Žena"`, split `" / "`: `parts[0]` muž (fw 700), `parts[1]` žena (fw 600), `r.club` 3. řádek
- **Lazy-load**: `enabled: manualOpen === true` (NE `!== false` — `null !== false = true` → 15 sekcí = 15 requests)

### Birthdate UI
3 `<select>` (Rok/Měsíc/Den) + `<input type="hidden" {...register("birthDate")}>`. Stav `birthParts` v useState, kombinace `YYYY-MM-DD` přes `setValue`. Vzor: `dashboard/settings/page.tsx`, `onboarding/page.tsx`.
