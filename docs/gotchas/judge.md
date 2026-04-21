# Judge gotchas — frontend

> Read on-demand when working on judge scoring UI, routing, or header.

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
