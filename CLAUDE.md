# CLAUDE.md — DanceApp Frontend

> Automaticky načítáno Claude Code. Implementuj autonomně bez potvrzování.

---

## Autonomní režim

- **Nikdy nečekej na potvrzení** — implementuj okamžitě
- **Nikdy se neptej** „Shall I proceed?", „Do you want me to…", „Mám pokračovat?"
- **Při nejasnosti** zvol nejlogičtější řešení a pokračuj — nepřerušuj implementaci otázkami
- **Nikdy nepřerušuj** rozpracovanou implementaci dotazy na uživatele
- Po dokončení ukaž výsledek, ne plán

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

- SSE via `useSSE(competitionId, event, handler)` — bere JEDEN event string
- WebSocket (STOMP) pro live marking

## Klíčové UI patterny

- `SimpleDialog` — `<SimpleDialog open onClose title>` v `dialog.tsx`
- `NavTabs` — `<NavTabs tabs activeTab onChange>` v `nav-tabs.tsx`
- `DataTable` — sortable, filterable, CSV export (`src/components/ui/data-table.tsx`)
- `useSSE` — jeden event string (ne array)
- `NotificationCenter` místo Bell buttonu v `header.tsx`

## i18n

- Primární jazyk UI: **čeština**
- Sekundární: angličtina
- Soubory: `src/lib/i18n/cs.json` + `en.json` — vždy přidej klíč do obou!

## Backend API

- Base URL: `http://localhost:8080/api/v1/`
- Všechny endpointy mají prefix `/api/v1/`

## Spec soubory

- **Schedule modul:** `/Users/janbystriansky/Documents/DanceAPP/MD/files-3/TASK_SCHEDULE_MODULE_v5.md`
  - Implementace: nové tabulky `competition_schedules` + `schedule_block_items`
  - Frontend route: `/dashboard/competitions/[id]/schedule`
  - Drag & drop: `@dnd-kit/core`
