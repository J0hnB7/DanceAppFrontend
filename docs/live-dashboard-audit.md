# Live Control Dashboard — Audit

> Datum: 2026-03-25
> URL: `/dashboard/competitions/{id}/live`
> Testováno: Playwright, Chromium 1440×900, přihlášen jako admin

---

## Shrnutí

| Kategorie | Počet |
|---|---|
| 🔴 Kritické | 2 |
| 🟡 Střední | 3 |
| 🔵 UX/kosmetické | 3 |
| ✅ Funguje správně | 7 |

---

## ✅ Funguje správně

1. **Krok 1 — Výběr kola**: Carousel rounds se načítá, HOTOVO/ČEKÁ statusy správně.
2. **Krok 2 — Výběr tance**: Dances se derivují dle disciplíny (Standard 5, Latin 5).
3. **Krok 3 — Skupina na parketu**: Heaty se zobrazí po výběru tance, "NA PARKETU" badge, seznam párů.
4. **Krok 4 — Porotci**: Všech 5 porotců viditelných, ONLINE status, PING tlačítko.
5. **Sidebar PROBÍHÁ NYNÍ**: Správně zobrazuje aktivní kolo + počet skupin.
6. **Sidebar PŘEHLED DNE**: Celkem kol / Hotovo / Čeká / Párů celkem — data správně.
7. **Bottom bar**: Kontextové instrukce + "Odeslat porotcům" tlačítko reaguje na stav.

---

## 🔴 Kritické problémy

### P1 — Backend vrací 500 při načítání heats/judge-statuses

**Symptom:**
Po výběru skupiny se v konzoli objeví 4× `Failed to load resource: 500 (Internal Server Error)`.
Judge counter zobrazuje "0 / 5 zadáno" i když jsou porotci připojeni.

**Pravděpodobná příčina:**
- `GET /rounds/{activeRoundId}/heats` selhává, protože `copyHeats()` nebyl zavolán pro toto kolo (heaty neexistují v tabulce `heats`).
- Nebo `GET /heats/{heatId}/judge-statuses` selhává, protože `heat_pairs` tabulka je prázdná pro daný heat UUID.

**Řešení:**
1. Zkontrolovat backend log (`/tmp/backend.log`) při výběru skupiny — najít konkrétní stacktrace.
2. Ověřit, zda `copyHeats()` byl zavolán při aktivaci slotu:
   ```sql
   SELECT COUNT(*) FROM heats WHERE round_id = '<activeRoundId>';
   SELECT COUNT(*) FROM heat_pairs WHERE heat_id IN (SELECT id FROM heats WHERE round_id = '<activeRoundId>');
   ```
3. Pokud jsou tabulky prázdné → `RoundActivationService.copyHeats()` nebyl zavolán. Opravit volání v `RoundService.startRound()` nebo přidat fallback v `LiveService`.
4. Frontend fallback: pokud `/heats/{heatId}/judge-statuses` vrátí 500, zobrazit toast varování místo tiché chyby.

---

### P2 — HeatResults zobrazuje prefix "AS" před statusem

**Symptom:**
V sekci výsledků jsou vidět texty `AS POSTUPUJE` a `AS VYŘAZEN` místo jen `POSTUPUJE` / `VYŘAZEN`.

**Pravděpodobná příčina:**
Backend vrací enum hodnotu `AS_POSTUPUJE` / `AS_VYRAZEN` (nebo podobný formát) a frontend ji zobrazuje bez transformace — případně lokalizační mapa v `HeatResults.tsx` chybí nebo má špatný klíč.

**Řešení:**
1. Najít mapování v `HeatResults.tsx`:
   ```tsx
   // Zkontrolovat, zda existuje label mapa:
   const STATUS_LABELS: Record<string, string> = {
     POSTUPUJE: 'Postupuje',
     VYRAZEN: 'Vyřazen',
     // Chybí AS_POSTUPUJE, AS_VYRAZEN?
   }
   ```
2. Přidat chybějící klíče nebo normalizovat hodnotu před zobrazením:
   ```tsx
   const label = STATUS_LABELS[status] ?? status.replace(/_/g, ' ')
   ```
3. Alternativně opravit backend — pokud `AS_` prefix nemá sémantický význam pro UI, backend by ho neměl posílat.

---

## 🟡 Střední problémy

### P3 — 401 Unauthorized při načtení stránky (SSE / polling)

**Symptom:**
6× `Failed to load resource: 401 (Unauthorized)` hned po načtení stránky.

**Pravděpodobná příčina:**
SSE spojení nebo první polling requesty odcházejí před tím, než `api-client.ts` interceptor stihne nastavit Authorization header (JWT token načítán z Zustand store po hydrataci).

**Řešení:**
1. Přidat retry delay (100–200 ms) před prvním SSE connect pokusem po mount:
   ```ts
   // use-sse.ts — přidat initial delay
   useEffect(() => {
     const timer = setTimeout(() => connectSSE(), 150)
     return () => clearTimeout(timer)
   }, [competitionId])
   ```
2. Nebo ověřit, že `useSSE` hook čeká na token z auth store před připojením:
   ```ts
   const token = useAuthStore((s) => s.accessToken)
   useEffect(() => {
     if (!token) return
     connectSSE()
   }, [token, competitionId])
   ```

---

### P4 — Judge counter "0 / 5 zadáno" neaktualizuje po odeslání skupiny

**Symptom:**
Po výběru skupiny (i Skupina 1 z Kolo 1 — HOTOVO) ukazuje "0 / 5 zadáno".

**Příčina:**
Způsobeno kombinací:
1. Backend 500 → `getJudgeStatuses()` selže → statuses se nenačtou.
2. `selectHeat()` v Zustand resetuje `judgeStatuses: {}` před tím, než přijde hydratace.

**Řešení:**
- Primárně: opravit P1 (500 errors) — to vyřeší i toto.
- Sekundárně: přidat loading state do `JudgePanel` aby bylo jasné, že se načítá:
  ```tsx
  {isHydrating ? (
    <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Načítám...</span>
  ) : (
    <span>{submittedCount} / {judgeDetails.length} zadáno</span>
  )}
  ```

---

### P5 — Nesoulad v pojmenování kroku 3

**Symptom:**
- Nadpis sekce: **"SKUPINA NA PARKETU"**
- Sidebar text (před výběrem): **"Vyberte skupinu"**
- Bottom bar (před výběrem): **"... — vyberte skupinu"**

Tři různé formulace pro jeden koncept.

**Řešení:**
Sjednotit na **"VYBRAT SKUPINU"** (konzistentní s kroky 1 "VYBRAT KOLO" a 2 "VYBRAT TANEC"). Po výběru změnit na "SKUPINA NA PARKETU" (to je správné).
Opravit v `HeatSelector.tsx` — název sekce před výběrem.

---

## 🔵 UX / Kosmetické

### U1 — Bottom bar text oříznutý při standardním viewportu

**Symptom:**
Na 1440×900 je vidět `"e kolo pro zahájení"` — první část textu `"Vyberte kolo pro zahájení"` je oříznutá.

**Příčina:**
Vlevo je avatar/ikona (`N`) který překrývá začátek textu. Padding nebo `pl-` hodnota je příliš malá.

**Řešení:**
V `LiveStatusBar.tsx` nebo bottom bar kontejneru zvýšit `padding-left`:
```tsx
// Najít kontejner textu v bottom baru a přidat:
className="pl-12"  // nebo pl-10 dle aktuální hodnoty
```

---

### U2 — Rounds carousel bez rychlé navigace (35 kol)

**Symptom:**
Soutěž má 35 kol. Carousel zobrazuje ~5 karet, navigace pouze šipkou doprava → zdlouhavé scrollování.

**Doporučené řešení:**
Přidat filtr/skupinování kol dle sekce nad carousel, nebo dropdown "Přejít na sekci" — uživatel pak klikne na sekci a carousel se přesune na první kolo dané sekce.
Případně kompaktnější karta (menší padding) aby bylo vidět více kol najednou.

---

### U3 — Název soutěže "—" při prvním načtení

**Symptom:**
Při prvním renderu header zobrazuje `"Soutež Ostrava · —"` (název competition načten, ale `competitionName` prop ještě "—").

**Příčina:**
Race condition mezi `useQuery` (competition data) a prvním renderem.

**Řešení:**
Použít skeleton/placeholder místo "—":
```tsx
// V page.tsx:
competitionName={competition?.name ?? ''}
// V LiveStatusBar.tsx:
{competitionName && <span className="...">{competitionName}</span>}
```

---

## Prioritizovaný seznam oprav

| # | Problém | Soubor | Priorita |
|---|---|---|---|
| 1 | Backend 500 — heats/judge-statuses | `RoundService.java` / `LiveService.java` | 🔴 Ihned |
| 2 | HeatResults "AS" prefix | `HeatResults.tsx` | 🔴 Ihned |
| 3 | SSE/polling 401 při startu | `use-sse.ts` / `sse-client.ts` | 🟡 Brzy |
| 4 | Judge counter loading state | `JudgePanel.tsx` | 🟡 Brzy |
| 5 | Pojmenování kroku 3 | `HeatSelector.tsx` | 🟡 Brzy |
| 6 | Bottom bar text oříznutý | `LiveStatusBar.tsx` | 🔵 Nízká |
| 7 | Rounds carousel navigace | `RoundSelector.tsx` | 🔵 Nízká |
| 8 | Competition name skeleton | `page.tsx` / `LiveStatusBar.tsx` | 🔵 Nízká |
