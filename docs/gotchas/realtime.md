# Real-time gotchas — frontend

> Read on-demand when working on live module, SSE, heats, or dance sync.

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
