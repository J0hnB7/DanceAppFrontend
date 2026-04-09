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
