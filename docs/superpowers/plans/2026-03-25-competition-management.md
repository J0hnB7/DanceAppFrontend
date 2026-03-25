# Competition Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementovat celý Competition Management systém dle IMPLEMENTATION_SPEC.md — tab navigaci, Live řízení dashboard (přepis `schedule-varB-cards.html`), Harmonogram, rozšíření Porota/Vyhodnocení/Páry/Obsah tabů a backend endpointy.

**Architecture:** Frontend Next.js 16 s Zustand live-store + SSE real-time; backend Spring Boot 4 s novými REST endpointy pro Live řízení (send heat, judge status, incidents, skip, reorder, ping, unlock, withdraw). Implementace probíhá v 5 fázích dle prioritizace ze specifikace.

**Tech Stack:** Next.js 16, TypeScript, Tailwind v4, Zustand, React Query, SSE (`sse-client.ts`), Spring Boot 4, Java 21, Liquibase, PostgreSQL, `@dnd-kit/core`

**Spec reference:** `/Users/janbystriansky/Documents/DanceAPP/Design/IMPLEMENTATION_SPEC.md`
**Design reference:** `/Users/janbystriansky/Documents/DanceAPP/Design/schedule-varB-cards.html`

---

## Soubory — přehled

### Nové frontend soubory
| Soubor | Účel |
|--------|------|
| `src/store/live-store.ts` | Zustand store pro celý live stav |
| `src/components/live/LiveControlDashboard.tsx` | Hlavní wrapper — přepis `schedule-varB-cards.html` |
| `src/components/live/LiveStatusBar.tsx` | Sticky status bar |
| `src/components/live/LiveTimeline.tsx` | `<DayTimeline readOnly />` wrapper |
| `src/components/live/RoundSelector.tsx` | Sekce 1 — výběr kola |
| `src/components/live/DanceSelector.tsx` | Sekce 2 — výběr tance |
| `src/components/live/HeatSelector.tsx` | Sekce 3 — skupiny + páry na parketu |
| `src/components/live/JudgePanel.tsx` | Sekce 4 — panel 7 karet porotců |
| `src/components/live/JudgeCard.tsx` | Karta porotce s real-time stavem |
| `src/components/live/IncidentPanel.tsx` | Sekce 5 — incidenty |
| `src/components/live/HeatResults.tsx` | Sekce 6 — Skating čipy |
| `src/components/live/LiveSidebar.tsx` | Inline sidebar (Probíhá nyní / Přehled dne) |
| `src/components/live/PresentationOverlay.tsx` | Full-screen prezentační mód (klávesa P) |
| `src/components/live/LiveControlWidget.tsx` | Mini embed pro tab Přehled |
| `src/components/live/NowLine.tsx` | Izolovaná now-line vrstva pro timeline |
| `src/components/schedule/DayTimeline.tsx` | Gantt timeline (edit + readOnly) |
| `src/lib/api/live.ts` | API volání pro live endpointy |
| `src/app/competitions/[id]/display/page.tsx` | Veřejná projekční stránka (bez authu) |

### Modifikované frontend soubory
| Soubor | Změny |
|--------|-------|
| `src/app/dashboard/competitions/[id]/page.tsx` | Přidat `live` TabsTrigger + TabsContent; reorder tabů |
| `src/app/dashboard/competitions/[id]/live/page.tsx` | Nahradit stávající shell za `<LiveControlDashboard>` |
| `src/lib/sse-client.ts` | Přidat `useSSEConnected()` hook |
| `src/components/competition/judges-tab.tsx` | Přidat ping + online/offline |
| `src/components/competition/vyhodnoceni-tab.tsx` | Přidat Skating vizualizaci (A✓ B✓ C✗...) |
| `src/mocks/setup.ts` | Přidat mocky pro všechny nové endpointy |
| `src/lib/api/rounds.ts` | Přidat `sendHeat`, `skipHeat`, `reorderRound` |

### Nové backend soubory
| Soubor | Účel |
|--------|------|
| `src/main/resources/db/changelog/migrations/V041__section_scoring_system.sql` | Liquibase migrace: `scoring_system` pole na `sections` |
| `src/main/resources/db/changelog/migrations/V042__incidents.sql` | Tabulka `incidents` |
| `com/danceapp/competition/entity/Incident.java` | JPA entita incidentu |
| `com/danceapp/competition/dto/IncidentResponse.java` | Response DTO |
| `com/danceapp/competition/dto/CreateIncidentRequest.java` | Request DTO |
| `com/danceapp/competition/dto/JudgeStatusResponse.java` | Judge status DTO |
| `com/danceapp/competition/dto/HeatResultResponse.java` | Heat result DTO |
| `com/danceapp/competition/dto/SendHeatResponse.java` | Send heat response DTO |
| `com/danceapp/competition/dto/PingResponse.java` | Ping response DTO |
| `com/danceapp/competition/dto/WithdrawResponse.java` | Withdraw pair response DTO |
| `com/danceapp/competition/dto/ReorderRequest.java` | Reorder DTO |
| `com/danceapp/competition/controller/LiveController.java` | Live řízení endpointy |
| `com/danceapp/competition/service/LiveService.java` | Logika live endpointů |
| `com/danceapp/competition/repository/IncidentRepository.java` | Incident repo |

### Modifikované backend soubory
| Soubor | Změny |
|--------|-------|
| `com/danceapp/competition/entity/Section.java` | Přidat `scoringSystem` field |
| `com/danceapp/competition/dto/SectionResponse.java` | Přidat `scoringSystem` |
| `com/danceapp/competition/controller/HeatController.java` | Přidat `/send`, `/skip` |

---

## FÁZE 1 — Backend: nové endpointy pro Live řízení

### Task 1: Liquibase migrace — scoring_system + incidents tabulka

**Files:**
- Create: `src/main/resources/db/changelog/migrations/V041__section_scoring_system.sql`
- Create: `src/main/resources/db/changelog/migrations/V042__incidents.sql`

- [ ] Zkontrolovat poslední migraci: `ls src/main/resources/db/changelog/migrations/ | sort | tail -3` — potvrdit V040 je poslední
- [ ] Vytvořit `V041__section_scoring_system.sql`:
```sql
ALTER TABLE sections ADD COLUMN scoring_system VARCHAR(10) NOT NULL DEFAULT 'skating';
```
- [ ] Vytvořit `V042__incidents.sql`:
```sql
CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID NOT NULL REFERENCES competitions(id),
    round_id UUID REFERENCES rounds(id),
    heat_id UUID REFERENCES heats(id),
    type VARCHAR(20) NOT NULL,
    pair_number INTEGER,
    note TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    deleted_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_incidents_competition_id ON incidents(competition_id);
```
- [ ] Commit: `git commit -m "feat: add scoring_system to sections and incidents table"`

### Task 2: Incident entita + DTO + repository

**Files:**
- Create: `com/danceapp/competition/entity/Incident.java`
- Create: `com/danceapp/competition/dto/IncidentResponse.java`
- Create: `com/danceapp/competition/dto/CreateIncidentRequest.java`
- Create: `com/danceapp/competition/repository/IncidentRepository.java`

- [ ] Vytvořit `Incident.java`:
```java
package com.danceapp.competition.entity;

import com.danceapp.common.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.util.UUID;

@Entity
@Table(name = "incidents")
@Getter @Setter @NoArgsConstructor
public class Incident extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "competition_id", nullable = false)
    private Competition competition;

    @Column(name = "round_id")
    private UUID roundId;

    @Column(name = "heat_id")
    private UUID heatId;

    @Column(nullable = false, length = 20)
    private String type;  // "withdrawal" | "penalty"

    @Column(name = "pair_number")
    private Integer pairNumber;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String note = "";

    @Column(name = "created_by")
    private UUID createdBy;
}
```
- [ ] Vytvořit `IncidentResponse.java`:
```java
package com.danceapp.competition.dto;
import java.time.Instant;
import java.util.UUID;

public record IncidentResponse(
    UUID id,
    String type,
    Integer pairNumber,
    String note,
    Instant timestamp,
    UUID roundId,
    UUID heatId
) {}
```
- [ ] Vytvořit `CreateIncidentRequest.java`:
```java
package com.danceapp.competition.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CreateIncidentRequest(
    @NotNull String type,
    Integer pairNumber,
    @NotBlank String note,
    UUID roundId,
    UUID heatId
) {}
```
- [ ] Vytvořit `IncidentRepository.java`:
```java
package com.danceapp.competition.repository;
import com.danceapp.competition.entity.Incident;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface IncidentRepository extends JpaRepository<Incident, UUID> {
    List<Incident> findByCompetitionIdOrderByCreatedAtDesc(UUID competitionId);
}
```
- [ ] Commit: `git commit -m "feat: Incident entity, DTO, repository"`

### Task 3: DTOs pro nové live endpointy

**Files:**
- Create: `com/danceapp/competition/dto/JudgeStatusResponse.java`
- Create: `com/danceapp/competition/dto/HeatResultResponse.java`
- Create: `com/danceapp/competition/dto/SendHeatResponse.java`
- Create: `com/danceapp/competition/dto/PingResponse.java`
- Create: `com/danceapp/competition/dto/WithdrawResponse.java`
- Create: `com/danceapp/competition/dto/ReorderRequest.java`
- Modify: `com/danceapp/competition/dto/SectionResponse.java`
- Modify: `com/danceapp/competition/entity/Section.java`

- [ ] Vytvořit `JudgeStatusResponse.java`:
```java
package com.danceapp.competition.dto;
import java.time.Instant;
import java.util.UUID;

public record JudgeStatusResponse(
    UUID judgeId,
    String letter,
    String name,
    String status,  // pending | scoring | submitted | offline
    Instant submittedAt,
    boolean online
) {}
```
- [ ] Vytvořit `HeatResultResponse.java`:
```java
package com.danceapp.competition.dto;
import java.util.UUID;

public record HeatResultResponse(
    UUID pairId,
    Integer pairNumber,
    int votes,
    int totalJudges,
    boolean advances
) {}
```
- [ ] Vytvořit `SendHeatResponse.java`, `PingResponse.java`, `WithdrawResponse.java`:
```java
// SendHeatResponse.java
package com.danceapp.competition.dto;
import java.time.Instant;
public record SendHeatResponse(Instant sentAt) {}

// PingResponse.java
package com.danceapp.competition.dto;
public record PingResponse(boolean delivered) {}

// WithdrawResponse.java
package com.danceapp.competition.dto;
import java.util.UUID;
public record WithdrawResponse(UUID pairId, String status) {}
```
- [ ] Vytvořit `ReorderRequest.java`:
```java
package com.danceapp.competition.dto;
import java.util.List;
import java.util.UUID;

public record ReorderRequest(
    List<UUID> heatOrder,
    List<UUID> danceOrder
) {}
```
- [ ] Přidat `scoringSystem` do `Section.java` entity (mezi ostatní @Column pole):
```java
@Column(name = "scoring_system", length = 10, nullable = false)
private String scoringSystem = "skating";
```
- [ ] Přidat `String scoringSystem` do `SectionResponse.java` recordu (zkontrolovat existující record strukturu a přidat pole)
- [ ] Commit: `git commit -m "feat: DTOs for live endpoints, scoringSystem on Section"`

### Task 4: LiveService + LiveController

**Files:**
- Create: `com/danceapp/competition/service/LiveService.java`
- Create: `com/danceapp/competition/controller/LiveController.java`

- [ ] Vytvořit `LiveService.java` — business logika (stubs pro SSE dispatch, heat send):
```java
package com.danceapp.competition.service;

import com.danceapp.competition.dto.*;
import com.danceapp.competition.entity.Incident;
import com.danceapp.competition.repository.*;
import com.danceapp.common.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LiveService {

    private final HeatRepository heatRepository;
    private final IncidentRepository incidentRepository;
    private final CompetitionRepository competitionRepository;

    /** POST /heats/{heatId}/send — odeslat skupinu porotcům */
    @Transactional
    public SendHeatResponse sendHeat(UUID heatId) {
        // TODO: validate heat exists, dispatch SSE event to judges
        return new SendHeatResponse(Instant.now());
    }

    /** GET /heats/{heatId}/judge-statuses */
    public List<JudgeStatusResponse> getJudgeStatuses(UUID heatId) {
        // TODO: query actual judge submission status from scoring tables
        // Returning empty list as stub — real impl reads from ScoreTable / JudgeToken sessions
        return List.of();
    }

    /** GET /heats/{heatId}/results */
    public List<HeatResultResponse> getHeatResults(UUID heatId) {
        // TODO: compute from RoundScorePreliminary using majority vote
        return List.of();
    }

    /** POST /judges/{judgeId}/ping */
    public PingResponse pingJudge(UUID judgeId) {
        // TODO: send SSE push to judge device
        return new PingResponse(true);
    }

    /** POST /competitions/{competitionId}/incidents */
    @Transactional
    public IncidentResponse createIncident(UUID competitionId, CreateIncidentRequest req) {
        var competition = competitionRepository.findById(competitionId)
            .orElseThrow(() -> new NotFoundException("Competition not found"));
        var incident = new Incident();
        incident.setCompetition(competition);
        incident.setType(req.type());
        incident.setPairNumber(req.pairNumber());
        incident.setNote(req.note());
        incident.setRoundId(req.roundId());
        incident.setHeatId(req.heatId());
        var saved = incidentRepository.save(incident);
        return new IncidentResponse(
            saved.getId(), saved.getType(), saved.getPairNumber(),
            saved.getNote(), saved.getCreatedAt(), saved.getRoundId(), saved.getHeatId()
        );
    }

    /** GET /competitions/{competitionId}/incidents */
    public List<IncidentResponse> getIncidents(UUID competitionId) {
        return incidentRepository.findByCompetitionIdOrderByCreatedAtDesc(competitionId)
            .stream()
            .map(i -> new IncidentResponse(
                i.getId(), i.getType(), i.getPairNumber(),
                i.getNote(), i.getCreatedAt(), i.getRoundId(), i.getHeatId()
            ))
            .collect(Collectors.toList());
    }

    /** POST /heats/{heatId}/skip */
    @Transactional
    public void skipHeat(UUID heatId) {
        var heat = heatRepository.findById(heatId)
            .orElseThrow(() -> new NotFoundException("Heat not found"));
        // Set status to SKIPPED — reuse existing HeatStatus enum or string
        // TODO: verify HeatStatus enum has SKIPPED value, add if not
        heatService_updateStatus(heatId);
    }

    private void heatService_updateStatus(UUID heatId) {
        // delegate to HeatService.updateStatus if needed
    }

    /** PUT /heats/{heatId}/pairs/{pairId}/withdraw */
    @Transactional
    public WithdrawResponse withdrawPair(UUID heatId, UUID pairId) {
        // TODO: update HeatPair status to WITHDRAWN
        return new WithdrawResponse(pairId, "withdrawn");
    }
}
```

- [ ] Vytvořit `LiveController.java`:
```java
package com.danceapp.competition.controller;

import com.danceapp.competition.dto.*;
import com.danceapp.competition.service.LiveService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class LiveController {

    private final LiveService liveService;

    // POST /api/v1/heats/{heatId}/send
    @PostMapping("/api/v1/heats/{heatId}/send")
    public SendHeatResponse sendHeat(@PathVariable UUID heatId) {
        return liveService.sendHeat(heatId);
    }

    // GET /api/v1/heats/{heatId}/judge-statuses
    @GetMapping("/api/v1/heats/{heatId}/judge-statuses")
    public List<JudgeStatusResponse> getJudgeStatuses(@PathVariable UUID heatId) {
        return liveService.getJudgeStatuses(heatId);
    }

    // GET /api/v1/heats/{heatId}/results
    @GetMapping("/api/v1/heats/{heatId}/results")
    public List<HeatResultResponse> getHeatResults(@PathVariable UUID heatId) {
        return liveService.getHeatResults(heatId);
    }

    // POST /api/v1/judges/{judgeId}/ping
    @PostMapping("/api/v1/judges/{judgeId}/ping")
    public PingResponse pingJudge(@PathVariable UUID judgeId) {
        return liveService.pingJudge(judgeId);
    }

    // POST /api/v1/competitions/{competitionId}/incidents
    @PostMapping("/api/v1/competitions/{competitionId}/incidents")
    @ResponseStatus(HttpStatus.CREATED)
    public IncidentResponse createIncident(
            @PathVariable UUID competitionId,
            @Valid @RequestBody CreateIncidentRequest req) {
        return liveService.createIncident(competitionId, req);
    }

    // GET /api/v1/competitions/{competitionId}/incidents
    @GetMapping("/api/v1/competitions/{competitionId}/incidents")
    public List<IncidentResponse> getIncidents(@PathVariable UUID competitionId) {
        return liveService.getIncidents(competitionId);
    }

    // POST /api/v1/heats/{heatId}/skip
    @PostMapping("/api/v1/heats/{heatId}/skip")
    public void skipHeat(@PathVariable UUID heatId) {
        liveService.skipHeat(heatId);
    }

    // PUT /api/v1/heats/{heatId}/pairs/{pairId}/withdraw
    @PutMapping("/api/v1/heats/{heatId}/pairs/{pairId}/withdraw")
    public WithdrawResponse withdrawPair(
            @PathVariable UUID heatId,
            @PathVariable UUID pairId) {
        return liveService.withdrawPair(heatId, pairId);
    }

    // POST /api/v1/judges/{judgeId}/heats/{heatId}/unlock
    @PostMapping("/api/v1/judges/{judgeId}/heats/{heatId}/unlock")
    public void unlockScoring(@PathVariable UUID judgeId, @PathVariable UUID heatId) {
        // TODO: set judge submission status back to scoring, dispatch SSE
    }

    // POST /api/v1/rounds/{roundId}/reorder
    @PostMapping("/api/v1/rounds/{roundId}/reorder")
    public void reorderRound(
            @PathVariable UUID roundId,
            @RequestBody ReorderRequest req) {
        // TODO: implement heat/dance reorder
    }
}
```
- [ ] Zkompilovat backend: `cd /Users/janbystriansky/IdeaProjects/danceapp-backend && ./mvnw compile -q`
- [ ] Opravit případné compile chyby (import, BaseEntity.getCreatedAt())
- [ ] Commit: `git commit -m "feat: LiveService + LiveController with all spec endpoints"`

---

## FÁZE 2 — Frontend: live-store + useSSEConnected

### Task 5: live-store.ts

**Files:**
- Create: `src/store/live-store.ts`

- [ ] Vytvořit `src/store/live-store.ts` — vzor je `src/store/auth-store.ts`:
```typescript
import { create } from 'zustand'
import apiClient from '@/lib/api-client'

export type JudgeStatus = 'pending' | 'scoring' | 'submitted' | 'offline'

export interface HeatResult {
  pairId: string
  pairNumber: number
  votes: number
  totalJudges: number
  advances: boolean
}

export interface Incident {
  id: string
  type: 'withdrawal' | 'penalty'
  pairNumber?: number
  note: string
  timestamp: string
  roundId?: string
  heatId?: string
}

interface LiveState {
  selectedRoundId: string | null
  selectedDanceId: string | null
  selectedHeatId: string | null
  judgeStatuses: Record<string, JudgeStatus>
  activePairs: string[]
  heatResults: HeatResult[] | null
  incidents: Incident[]
  presMode: boolean
  lastSentAt: string | null

  selectRound: (id: string) => void
  selectDance: (id: string) => void
  selectHeat: (id: string) => void
  updateJudgeStatus: (judgeId: string, status: JudgeStatus) => void
  setHeatResults: (results: HeatResult[]) => void
  addIncident: (incident: Incident) => void
  withdrawPair: (pairId: string) => void
  togglePresMode: () => void
  reset: () => void
  hydrateFromServer: (competitionId: string, heatId: string) => Promise<void>
}

const initialState = {
  selectedRoundId: null,
  selectedDanceId: null,
  selectedHeatId: null,
  judgeStatuses: {},
  activePairs: [],
  heatResults: null,
  incidents: [],
  presMode: false,
  lastSentAt: null,
}

export const useLiveStore = create<LiveState>((set, get) => ({
  ...initialState,

  selectRound: (id) => set({ selectedRoundId: id, selectedDanceId: null, selectedHeatId: null, heatResults: null }),
  selectDance: (id) => set({ selectedDanceId: id, selectedHeatId: null, heatResults: null }),
  selectHeat: (id) => set({ selectedHeatId: id, heatResults: null, judgeStatuses: {} }),

  updateJudgeStatus: (judgeId, status) =>
    set((s) => ({ judgeStatuses: { ...s.judgeStatuses, [judgeId]: status } })),

  setHeatResults: (results) => set({ heatResults: results }),

  addIncident: (incident) =>
    set((s) => ({ incidents: [incident, ...s.incidents] })),

  withdrawPair: (pairId) =>
    set((s) => ({ activePairs: s.activePairs.filter((id) => id !== pairId) })),

  togglePresMode: () => set((s) => ({ presMode: !s.presMode })),

  reset: () => set(initialState),

  hydrateFromServer: async (competitionId, heatId) => {
    try {
      const [statusRes, resultsRes, incidentsRes] = await Promise.allSettled([
        apiClient.get(`/heats/${heatId}/judge-statuses`),
        apiClient.get(`/heats/${heatId}/results`),
        apiClient.get(`/competitions/${competitionId}/incidents`),
      ])
      if (statusRes.status === 'fulfilled') {
        const statuses: Record<string, JudgeStatus> = {}
        for (const j of statusRes.value.data) {
          statuses[j.judgeId] = j.status
        }
        set({ judgeStatuses: statuses })
      }
      if (resultsRes.status === 'fulfilled' && resultsRes.value.status !== 204) {
        set({ heatResults: resultsRes.value.data })
      }
      if (incidentsRes.status === 'fulfilled') {
        set({ incidents: incidentsRes.value.data })
      }
    } catch {
      // silent — store keeps current state
    }
  },
}))
```
- [ ] Ověřit TypeScript: `cd /Users/janbystriansky/IdeaProjects/frontend && #!/bin/zsh && export PATH="/Users/janbystriansky/node/bin:$PATH" && npx tsc --noEmit 2>&1 | head -20`
- [ ] Commit: `git commit -m "feat: live-store.ts — Zustand store for live control"`

### Task 6: useSSEConnected hook

**Files:**
- Modify: `src/lib/sse-client.ts`

- [ ] Přidat export funkce na konec `src/lib/sse-client.ts`:
```typescript
// --- useSSEConnected hook ---
// Tracks SSE connection state for a competition.
// Returns true when EventSource is open, false on disconnect/error.
import { useState, useEffect } from 'react'

export function useSSEConnected(competitionId: string): boolean {
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const unsubReconnect = sseClient.onReconnect(competitionId, () => setConnected(true))
    const unsubFallback = sseClient.onPollingFallback(competitionId, () => setConnected(false))

    return () => {
      unsubReconnect()
      unsubFallback()
    }
  }, [competitionId])

  return connected
}
```
- [ ] Ověřit TypeScript: `npx tsc --noEmit 2>&1 | head -20`
- [ ] Commit: `git commit -m "feat: useSSEConnected hook in sse-client.ts"`

### Task 7: API klient pro live endpointy

**Files:**
- Create: `src/lib/api/live.ts`

- [ ] Vytvořit `src/lib/api/live.ts`:
```typescript
import apiClient from '@/lib/api-client'
import type { HeatResult, Incident, JudgeStatus } from '@/store/live-store'

export interface JudgeStatusDto {
  judgeId: string
  letter: string
  name: string
  status: JudgeStatus
  submittedAt?: string
  online: boolean
}

export const liveApi = {
  sendHeat: (heatId: string) =>
    apiClient.post<{ sentAt: string }>(`/heats/${heatId}/send`).then((r) => r.data),

  getJudgeStatuses: (heatId: string) =>
    apiClient.get<JudgeStatusDto[]>(`/heats/${heatId}/judge-statuses`).then((r) => r.data),

  getHeatResults: (heatId: string) =>
    apiClient.get<HeatResult[]>(`/heats/${heatId}/results`).then((r) => r.data),

  pingJudge: (judgeId: string) =>
    apiClient.post<{ delivered: boolean }>(`/judges/${judgeId}/ping`).then((r) => r.data),

  createIncident: (competitionId: string, data: { type: string; pairNumber?: number; note: string; roundId?: string; heatId?: string }) =>
    apiClient.post<Incident>(`/competitions/${competitionId}/incidents`, data).then((r) => r.data),

  getIncidents: (competitionId: string) =>
    apiClient.get<Incident[]>(`/competitions/${competitionId}/incidents`).then((r) => r.data),

  skipHeat: (heatId: string) =>
    apiClient.post(`/heats/${heatId}/skip`).then((r) => r.data),

  withdrawPair: (heatId: string, pairId: string) =>
    apiClient.put<{ pairId: string; status: string }>(`/heats/${heatId}/pairs/${pairId}/withdraw`).then((r) => r.data),

  reorderRound: (roundId: string, heatOrder: string[], danceOrder: string[]) =>
    apiClient.post(`/rounds/${roundId}/reorder`, { heatOrder, danceOrder }).then((r) => r.data),

  unlockScoring: (judgeId: string, heatId: string) =>
    apiClient.post(`/judges/${judgeId}/heats/${heatId}/unlock`).then((r) => r.data),
}
```
- [ ] Commit: `git commit -m "feat: src/lib/api/live.ts — live API client"`

---

## FÁZE 3 — Frontend: Live Control Dashboard (přepis schedule-varB-cards.html)

> **Důležité:** Otevřít `/Users/janbystriansky/Documents/DanceAPP/Design/schedule-varB-cards.html` v prohlížeči jako vizuální referenci před každou komponentou.

### Task 8: MSW mocky pro live endpointy

**Files:**
- Modify: `src/mocks/setup.ts`

- [ ] Přidat do `setup.ts` mocky (vyhledat sekci s `.onPost` patternem a přidat za ostatní):
```typescript
// POST /heats/:heatId/send
mock.onPost(new RegExp('/heats/.*/send')).reply(200, { sentAt: new Date().toISOString() })

// GET /heats/:heatId/judge-statuses
mock.onGet(new RegExp('/heats/.*/judge-statuses')).reply(200, [
  { judgeId: 'judge-1', letter: 'A', name: 'Jana Nováková', status: 'pending', online: true },
  { judgeId: 'judge-2', letter: 'B', name: 'Petr Svoboda', status: 'scoring', online: true },
  { judgeId: 'judge-3', letter: 'C', name: 'Marie Horáková', status: 'submitted', submittedAt: new Date().toISOString(), online: true },
  { judgeId: 'judge-4', letter: 'D', name: 'Jan Dvořák', status: 'pending', online: false },
  { judgeId: 'judge-5', letter: 'E', name: 'Eva Procházková', status: 'pending', online: true },
])

// GET /heats/:heatId/results
mock.onGet(new RegExp('/heats/.*/results')).reply(200, [
  { pairId: 'pair-1', pairNumber: 12, votes: 4, totalJudges: 5, advances: true },
  { pairId: 'pair-2', pairNumber: 34, votes: 2, totalJudges: 5, advances: false },
  { pairId: 'pair-3', pairNumber: 56, votes: 5, totalJudges: 5, advances: true },
])

// POST /judges/:judgeId/ping
mock.onPost(new RegExp('/judges/.*/ping')).reply(200, { delivered: true })

// POST /competitions/:id/incidents
mock.onPost(new RegExp('/competitions/.*/incidents')).reply(201, (config) => {
  const body = JSON.parse(config.data)
  return { id: 'inc-' + Date.now(), ...body, timestamp: new Date().toISOString() }
})

// GET /competitions/:id/incidents
mock.onGet(new RegExp('/competitions/.*/incidents')).reply(200, [])

// POST /heats/:heatId/skip
mock.onPost(new RegExp('/heats/.*/skip')).reply(200, { status: 'skipped' })

// PUT /heats/:heatId/pairs/:pairId/withdraw
mock.onPut(new RegExp('/heats/.*/pairs/.*/withdraw')).reply(200, { status: 'withdrawn' })
```
- [ ] Ověřit TypeScript: `npx tsc --noEmit 2>&1 | head -20`
- [ ] Commit: `git commit -m "test: MSW mocks for live control endpoints"`

### Task 9: LiveStatusBar

**Files:**
- Create: `src/components/live/LiveStatusBar.tsx`

- [ ] Přečíst HTML prototyp — section `<div class="status-bar">` (~line 400–440 v `schedule-varB-cards.html`)
- [ ] Vytvořit `src/components/live/LiveStatusBar.tsx`:
```typescript
'use client'
import { useState, useEffect } from 'react'
import { AlertTriangle, MonitorPlay, Printer, Keyboard } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  competitionName: string
  roundLabel: string
  sseConnected: boolean
  onPresentationMode: () => void
  onShowHelp: () => void
  incidentCount: number
}

export function LiveStatusBar({ competitionName, roundLabel, sseConnected, onPresentationMode, onShowHelp, incidentCount }: Props) {
  const [time, setTime] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between px-5 py-3"
      style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-center gap-3 min-w-0">
        <span className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}>
          {competitionName}
        </span>
        {roundLabel && (
          <>
            <span style={{ color: 'var(--text-tertiary)' }}>·</span>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{roundLabel}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-xs font-medium"
          style={{ color: sseConnected ? 'var(--success)' : 'var(--destructive)' }}>
          <div className={cn('h-2 w-2 rounded-full', sseConnected ? 'animate-pulse bg-[var(--success)]' : 'bg-[var(--destructive)]')} />
          {sseConnected ? 'LIVE' : 'OFFLINE'}
        </div>
        <span className="text-xs tabular-nums" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-sora)' }}>
          {time.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
        {incidentCount > 0 && (
          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--warning)' }}>
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>{incidentCount}</span>
          </div>
        )}
        <button onClick={onPresentationMode} title="Prezentační mód (P)"
          className="rounded p-1.5 transition-colors hover:bg-[var(--surface-2)]"
          style={{ color: 'var(--text-secondary)' }}>
          <MonitorPlay className="h-4 w-4" />
        </button>
        <button title="Tisk" className="rounded p-1.5 transition-colors hover:bg-[var(--surface-2)]"
          style={{ color: 'var(--text-secondary)' }}>
          <Printer className="h-4 w-4" />
        </button>
        <button onClick={onShowHelp} title="Klávesové zkratky (?)"
          className="rounded p-1.5 transition-colors hover:bg-[var(--surface-2)]"
          style={{ color: 'var(--text-secondary)' }}>
          <Keyboard className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
```
- [ ] Commit: `git commit -m "feat: LiveStatusBar component"`

### Task 10: RoundSelector + DanceSelector

**Files:**
- Create: `src/components/live/RoundSelector.tsx`
- Create: `src/components/live/DanceSelector.tsx`

- [ ] Přečíst HTML prototyp — sekce `#roundRow` a `#danceRow` (karty s `flex:1`, aktivní gradient)
- [ ] Vytvořit `src/components/live/RoundSelector.tsx`:
```typescript
'use client'
import { cn } from '@/lib/utils'

interface Round {
  id: string
  label: string
  status: 'upcoming' | 'active' | 'done'
}

interface Props {
  rounds: Round[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function RoundSelector({ rounds, selectedId, onSelect }: Props) {
  return (
    <div className="px-5 py-4">
      <div className="mb-2 text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
        1. Vybrat kolo
      </div>
      <div className="flex gap-2" style={{ overflowX: 'visible' }}>
        {rounds.map((round) => (
          <button
            key={round.id}
            onClick={() => onSelect(round.id)}
            className={cn(
              'flex-1 min-w-0 rounded-xl border px-4 py-3 text-left transition-all cursor-pointer',
              'hover:-translate-y-0.5',
              selectedId === round.id
                ? 'border-[rgba(10,132,255,0.5)] shadow-[0_0_0_1px_rgba(10,132,255,0.25)]'
                : 'border-[var(--border)] hover:border-[var(--accent)]/30'
            )}
            style={{
              background: selectedId === round.id
                ? 'linear-gradient(135deg, rgba(10,132,255,.2), rgba(10,132,255,.08))'
                : 'var(--surface)',
            }}
          >
            <div className="text-sm font-semibold" style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}>
              {round.label}
            </div>
            <div className="mt-0.5 text-xs capitalize" style={{ color: 'var(--text-secondary)' }}>
              {round.status === 'active' ? 'Probíhá' : round.status === 'done' ? 'Hotovo' : 'Čeká'}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
```
- [ ] Vytvořit `src/components/live/DanceSelector.tsx` — identický pattern jako RoundSelector, label "2. Vybrat tanec", prop `dances: { id: string; name: string }[]`
- [ ] Commit: `git commit -m "feat: RoundSelector + DanceSelector components"`

### Task 11: HeatSelector (skupiny na parketu)

**Files:**
- Create: `src/components/live/HeatSelector.tsx`

- [ ] Přečíst HTML prototyp — sekce skupin `#heatGrid` a páry na parketu `#floorPairs`
- [ ] Vytvořit `src/components/live/HeatSelector.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface Heat {
  id: string
  number: number
  pairNumbers: number[]
  status: 'pending' | 'active' | 'done' | 'skipped'
}

interface Props {
  heats: Heat[]
  selectedId: string | null
  activePairs: string[]
  onSelect: (id: string) => void
  onSkip: (id: string) => void
  onReorder: () => void
}

export function HeatSelector({ heats, selectedId, onSelect, onSkip, onReorder }: Props) {
  const selectedHeat = heats.find((h) => h.id === selectedId)

  return (
    <div className="px-5 py-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
          3. Skupina na parketu
        </div>
        <button
          onClick={onReorder}
          className="text-xs px-2 py-1 rounded border transition-colors hover:bg-[var(--surface-2)]"
          style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
        >
          Upravit frontu
        </button>
      </div>

      {/* Heat grid */}
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}>
        {heats.map((heat) => (
          <button
            key={heat.id}
            onClick={() => heat.status !== 'skipped' && onSelect(heat.id)}
            disabled={heat.status === 'skipped'}
            className={cn(
              'rounded-lg border py-2.5 text-center transition-all cursor-pointer',
              heat.status === 'skipped' && 'opacity-40 cursor-not-allowed',
              heat.status === 'done' && 'opacity-60',
              selectedId === heat.id
                ? 'border-[rgba(10,132,255,0.5)]'
                : 'border-[var(--border)] hover:border-[var(--accent)]/30'
            )}
            style={{
              background: selectedId === heat.id
                ? 'linear-gradient(135deg, rgba(10,132,255,.2), rgba(10,132,255,.08))'
                : 'var(--surface)',
            }}
          >
            <div className="text-sm font-bold" style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}>
              {heat.number}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{heat.pairNumbers.length} párů</div>
          </button>
        ))}
      </div>

      {/* Pairs on floor */}
      {selectedHeat && (
        <div className="mt-4">
          <div className="mb-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            Páry na parketu — Skupina {selectedHeat.number}
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedHeat.pairNumbers.map((num) => (
              <div key={num}
                className="flex h-11 w-11 items-center justify-center rounded-lg border text-sm font-bold"
                style={{ fontFamily: 'var(--font-sora)', background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                {num}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```
- [ ] Commit: `git commit -m "feat: HeatSelector component"`

### Task 12: JudgeCard + JudgePanel

**Files:**
- Create: `src/components/live/JudgeCard.tsx`
- Create: `src/components/live/JudgePanel.tsx`

- [ ] Přečíst HTML prototyp — sekce `#judgeGrid` a `.judge-card` s CSS animacemi `ldot` a `dp`
- [ ] Vytvořit `src/components/live/JudgeCard.tsx`:
```typescript
'use client'
import { cn } from '@/lib/utils'
import type { JudgeStatus } from '@/store/live-store'

interface Props {
  judgeId: string
  letter: string
  name: string
  status: JudgeStatus
  online: boolean
  submittedAt?: string
  canPing: boolean
  onPing: (judgeId: string) => void
}

const STATUS_COLORS: Record<JudgeStatus, string> = {
  pending: 'var(--text-tertiary)',
  scoring: 'var(--warning)',
  submitted: 'var(--success)',
  offline: 'var(--destructive)',
}

const STATUS_LABELS: Record<JudgeStatus, string> = {
  pending: 'Čeká',
  scoring: 'Zadává',
  submitted: 'Odevzdáno',
  offline: 'Offline',
}

export function JudgeCard({ judgeId, letter, name, status, online, submittedAt, canPing, onPing }: Props) {
  return (
    <div
      className={cn(
        'rounded-xl border p-3 flex flex-col gap-2 transition-all',
        status === 'submitted' && 'border-[var(--success)]/30 bg-[var(--success)]/5',
        status === 'scoring' && 'border-[var(--warning)]/30 bg-[var(--warning)]/5',
        status === 'offline' && 'border-[var(--destructive)]/30 opacity-60',
        status === 'pending' && 'border-[var(--border)]',
      )}
      style={{ background: status === 'pending' ? 'var(--surface)' : undefined }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold"
            style={{ fontFamily: 'var(--font-sora)', background: 'var(--surface-2)', color: 'var(--text-primary)' }}>
            {letter}
          </span>
          <div className="h-2 w-2 rounded-full animate-[dp_2s_ease-in-out_infinite]"
            style={{ background: STATUS_COLORS[status] }} />
        </div>
        {!online && (
          <span className="text-xs" style={{ color: 'var(--destructive)' }}>●</span>
        )}
      </div>
      <div className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{name}</div>
      <div className="text-xs" style={{ color: STATUS_COLORS[status] }}>{STATUS_LABELS[status]}</div>
      {canPing && (
        <button
          onClick={() => onPing(judgeId)}
          className="mt-1 rounded border px-2 py-1 text-xs transition-colors hover:bg-[var(--surface-2)]"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          Ping
        </button>
      )}
      {submittedAt && (
        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {new Date(submittedAt).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  )
}
```
- [ ] Vytvořit `src/components/live/JudgePanel.tsx` — grid 5–7 karet, volá `liveApi.pingJudge`, ukazuje progress `X/7 odevzdalo`
- [ ] Commit: `git commit -m "feat: JudgeCard + JudgePanel components"`

### Task 13: HeatResults (Skating čipy)

**Files:**
- Create: `src/components/live/HeatResults.tsx`

- [ ] Vytvořit `src/components/live/HeatResults.tsx`:
```typescript
'use client'
import type { HeatResult } from '@/store/live-store'

interface Props {
  results: HeatResult[]
  judgeLetters: string[]  // ["A","B","C","D","E","F","G"]
  judgeVotes: Record<string, Record<string, boolean>>  // judgeId -> pairId -> advances
}

export function HeatResults({ results }: Props) {
  return (
    <div className="px-5 py-4">
      <div className="mb-3 text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
        6. Výsledky skupiny
      </div>
      <div className="flex flex-col gap-2">
        {results.map((r) => (
          <div key={r.pairId} className="flex items-center gap-3 rounded-xl border px-4 py-3"
            style={{ background: 'var(--surface)', borderColor: r.advances ? 'var(--success)' : 'var(--border)' }}>
            <span className="w-8 text-sm font-bold tabular-nums" style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}>
              {r.pairNumber}
            </span>
            <div className="flex gap-1">
              {Array.from({ length: r.totalJudges }, (_, i) => (
                <span key={i} className="text-xs font-mono"
                  style={{ color: i < r.votes ? 'var(--success)' : 'var(--text-tertiary)' }}>
                  {i < r.votes ? '✓' : '✗'}
                </span>
              ))}
            </div>
            <span className="ml-auto text-xs font-bold" style={{ fontFamily: 'var(--font-sora)', color: r.advances ? 'var(--success)' : 'var(--destructive)' }}>
              {r.votes}/{r.totalJudges} · {r.advances ? 'POSTUPUJE' : 'VYŘAZEN'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```
- [ ] Commit: `git commit -m "feat: HeatResults component (Skating chips)"`

### Task 14: IncidentPanel

**Files:**
- Create: `src/components/live/IncidentPanel.tsx`

- [ ] Vytvořit `src/components/live/IncidentPanel.tsx` — zobrazí seznam incidentů, tlačítko "Přidat incident" otevře existující `WithdrawalModal` / `PenaltyModal` z `crisis-modals.tsx`
- [ ] Commit: `git commit -m "feat: IncidentPanel component"`

### Task 15: PresentationOverlay

**Files:**
- Create: `src/components/live/PresentationOverlay.tsx`

- [ ] Vytvořit `src/components/live/PresentationOverlay.tsx` — full-screen dark overlay, ESC zavírá:
```typescript
'use client'
import { useEffect } from 'react'

interface Props {
  competitionName: string
  roundLabel: string
  danceLabel: string
  heatNumber?: number
  pairNumbers: number[]
  open: boolean
  onClose: () => void
}

export function PresentationOverlay({ competitionName, roundLabel, danceLabel, heatNumber, pairNumbers, open, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) { document.addEventListener('keydown', handler) }
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{ background: 'var(--bg)' }}>
      <div className="text-center">
        <div className="mb-2 text-sm uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>{competitionName}</div>
        <div className="mb-1 text-4xl font-bold" style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}>{danceLabel}</div>
        <div className="mb-8 text-xl" style={{ color: 'var(--text-secondary)' }}>{roundLabel} · Skupina {heatNumber}</div>
        <div className="flex flex-wrap justify-center gap-4">
          {pairNumbers.map((num) => (
            <div key={num} className="flex h-20 w-20 items-center justify-center rounded-2xl border text-3xl font-bold"
              style={{ fontFamily: 'var(--font-sora)', borderColor: 'var(--border)', color: 'var(--accent)', background: 'var(--surface)' }}>
              {num}
            </div>
          ))}
        </div>
      </div>
      <button onClick={onClose} className="mt-16 text-xs" style={{ color: 'var(--text-tertiary)' }}>
        ESC — zavřít
      </button>
    </div>
  )
}
```
- [ ] Commit: `git commit -m "feat: PresentationOverlay component"`

### Task 16: LiveSidebar

**Files:**
- Create: `src/components/live/LiveSidebar.tsx`

- [ ] Přečíst HTML prototyp — sekce sidebar s tab-y "Probíhá nyní | Přehled dne | Vybraný blok | Poslední signál"
- [ ] Vytvořit `src/components/live/LiveSidebar.tsx` — 4 interní taby, `useState` pro activní tab
- [ ] Commit: `git commit -m "feat: LiveSidebar component"`

### Task 17: LiveTimeline + DayTimeline + NowLine

**Files:**
- Create: `src/components/live/LiveTimeline.tsx`
- Create: `src/components/schedule/DayTimeline.tsx`
- Create: `src/components/live/NowLine.tsx`

- [ ] Přečíst HTML prototyp — sekce `#timeline` s Gantt bloky a animovanou now-line
- [ ] Vytvořit `src/components/live/NowLine.tsx` — izolovaná vrstva, `setInterval(1000)`, absolutně pozicovaná:
```typescript
'use client'
import { useState, useEffect } from 'react'

interface Props {
  startHour: number  // 8 = 08:00
  pxPerMin: number   // 3.2
}

function calcNowPos(startHour: number, pxPerMin: number): number {
  const now = new Date()
  const minutes = (now.getHours() - startHour) * 60 + now.getMinutes()
  return Math.max(0, minutes * pxPerMin)
}

export function NowLine({ startHour, pxPerMin }: Props) {
  const [pos, setPos] = useState(() => calcNowPos(startHour, pxPerMin))
  useEffect(() => {
    const id = setInterval(() => setPos(calcNowPos(startHour, pxPerMin)), 1000)
    return () => clearInterval(id)
  }, [startHour, pxPerMin])

  return (
    <div className="pointer-events-none absolute top-0 bottom-0 z-10 w-0.5"
      style={{ left: pos, background: 'var(--accent)', opacity: 0.8 }}>
      <div className="absolute -top-1 -left-1.5 h-3 w-3 rounded-full" style={{ background: 'var(--accent)' }} />
    </div>
  )
}
```
- [ ] Vytvořit `src/components/schedule/DayTimeline.tsx` — Gantt bloky jako `React.memo`, `overflow-x: auto`, `PX_PER_MIN = 3.2`, NowLine jako sourozenec, `readOnly` prop disabluje drag-and-drop
- [ ] Vytvořit `src/components/live/LiveTimeline.tsx`:
```typescript
'use client'
import { DayTimeline } from '@/components/schedule/DayTimeline'
import type { ScheduleBlock } from '@/lib/api/schedule'

export function LiveTimeline({ blocks }: { blocks: ScheduleBlock[] }) {
  return <DayTimeline blocks={blocks} readOnly />
}
```
- [ ] Commit: `git commit -m "feat: DayTimeline + NowLine + LiveTimeline components"`

### Task 18: LiveControlDashboard (hlavní wrapper)

**Files:**
- Create: `src/components/live/LiveControlDashboard.tsx`

- [ ] Vytvořit `src/components/live/LiveControlDashboard.tsx` — kompozice všech live komponent, klávesové zkratky, SSE subscriptions, re-hydratace:
```typescript
'use client'
import { useEffect, useCallback } from 'react'
import { useLiveStore } from '@/store/live-store'
import { useSSEConnected } from '@/lib/sse-client'
import { useSSE } from '@/hooks/use-sse'
import { liveApi } from '@/lib/api/live'
import { useQuery } from '@tanstack/react-query'
import { LiveStatusBar } from './LiveStatusBar'
import { LiveTimeline } from './LiveTimeline'
import { RoundSelector } from './RoundSelector'
import { DanceSelector } from './DanceSelector'
import { HeatSelector } from './HeatSelector'
import { JudgePanel } from './JudgePanel'
import { IncidentPanel } from './IncidentPanel'
import { HeatResults } from './HeatResults'
import { LiveSidebar } from './LiveSidebar'
import { PresentationOverlay } from './PresentationOverlay'
import { scheduleApi } from '@/lib/api/schedule'
import { useRounds } from '@/hooks/queries/use-rounds'
import { useCompetition } from '@/hooks/queries/use-competitions'
import { useToast } from '@/hooks/use-toast'

interface Props {
  competitionId: string
}

function isAnyElementFocused(): boolean {
  const tag = document.activeElement?.tagName.toLowerCase()
  return ['input', 'textarea', 'button', 'select', 'a'].includes(tag ?? '')
}

export function LiveControlDashboard({ competitionId }: Props) {
  const { toast } = useToast()
  const sseConnected = useSSEConnected(competitionId)
  const {
    selectedRoundId, selectedDanceId, selectedHeatId,
    judgeStatuses, activePairs, heatResults, incidents, presMode, lastSentAt,
    selectRound, selectDance, selectHeat,
    updateJudgeStatus, setHeatResults, addIncident, withdrawPair,
    togglePresMode, hydrateFromServer, reset,
  } = useLiveStore()

  const { data: competition } = useCompetition(competitionId)
  const { data: schedule } = useQuery({
    queryKey: ['schedule', competitionId],
    queryFn: () => scheduleApi.get(competitionId),
  })

  // SSE subscriptions
  useSSE<{ judgeId: string; status: string }>(competitionId, 'judge:status-changed', (data) => {
    updateJudgeStatus(data.judgeId, data.status as any)
  })
  useSSE<{ judgeId: string; online: boolean }>(competitionId, 'judge:online-changed', (data) => {
    updateJudgeStatus(data.judgeId, data.online ? 'pending' : 'offline')
  })
  useSSE<unknown>(competitionId, 'heat:all-submitted', () => {
    if (selectedHeatId) {
      liveApi.getHeatResults(selectedHeatId).then(setHeatResults).catch(() => {
        toast({ title: 'Výsledky nelze načíst', variant: 'destructive' })
      })
    }
  })

  // Re-hydratace při reconnectu
  useEffect(() => {
    if (sseConnected && selectedHeatId) {
      hydrateFromServer(competitionId, selectedHeatId)
    }
  }, [sseConnected, selectedHeatId, competitionId, hydrateFromServer])

  // Klávesové zkratky
  const sendToJudges = useCallback(async () => {
    if (!selectedHeatId) return
    try {
      await liveApi.sendHeat(selectedHeatId)
    } catch {
      toast({ title: 'Nepodařilo se odeslat skupinu', variant: 'destructive' })
    }
  }, [selectedHeatId, toast])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !isAnyElementFocused()) {
        e.preventDefault()
        sendToJudges()
      }
      if (e.key === 'p' || e.key === 'P') {
        if (!isAnyElementFocused()) togglePresMode()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [sendToJudges, togglePresMode])

  // Cleanup on unmount
  useEffect(() => () => reset(), [reset])

  const allJudgesSubmitted = Object.values(judgeStatuses).length > 0 &&
    Object.values(judgeStatuses).every((s) => s === 'submitted')

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <LiveStatusBar
        competitionName={competition?.name ?? ''}
        roundLabel={selectedRoundId ? `Kolo ${selectedRoundId}` : ''}
        sseConnected={sseConnected}
        onPresentationMode={togglePresMode}
        onShowHelp={() => {}} // TODO: help modal
        incidentCount={incidents.length}
      />

      {/* Progress bar */}
      <div className="h-[3px] bg-gradient-to-r from-[var(--accent)] to-[rgba(10,132,255,0.3)]" />

      {/* Timeline */}
      {schedule?.blocks && <LiveTimeline blocks={schedule.blocks} />}

      {/* Main content */}
      <div className="flex-1 pb-24">
        <RoundSelector rounds={[]} selectedId={selectedRoundId} onSelect={selectRound} />
        {selectedRoundId && <DanceSelector dances={[]} selectedId={selectedDanceId} onSelect={selectDance} />}
        {selectedDanceId && (
          <HeatSelector heats={[]} selectedId={selectedHeatId} activePairs={activePairs}
            onSelect={selectHeat} onSkip={() => {}} onReorder={() => {}} />
        )}
        {selectedHeatId && (
          <JudgePanel judgeStatuses={judgeStatuses} competitionId={competitionId}
            heatId={selectedHeatId} />
        )}
        {incidents.length > 0 && (
          <IncidentPanel incidents={incidents} competitionId={competitionId}
            roundId={selectedRoundId} heatId={selectedHeatId} />
        )}
        {allJudgesSubmitted && heatResults && (
          <HeatResults results={heatResults} judgeLetters={['A','B','C','D','E','F','G']} judgeVotes={{}} />
        )}
      </div>

      {/* Sidebar */}
      <LiveSidebar competitionId={competitionId} selectedHeatId={selectedHeatId} />

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between px-5 py-4"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {lastSentAt ? `Odesláno v ${new Date(lastSentAt).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}` : 'Vyberte kolo, tanec a skupinu'}
        </div>
        <button
          onClick={sendToJudges}
          disabled={!selectedHeatId}
          className="rounded-xl px-6 py-3 text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-95"
          style={{ background: 'var(--accent)', color: '#fff', fontFamily: 'var(--font-sora)', minHeight: '44px' }}
        >
          Odeslat porotcům →
        </button>
      </div>

      <PresentationOverlay
        competitionName={competition?.name ?? ''}
        roundLabel={selectedRoundId ?? ''}
        danceLabel={selectedDanceId ?? ''}
        heatNumber={undefined}
        pairNumbers={[]}
        open={presMode}
        onClose={togglePresMode}
      />
    </div>
  )
}
```
- [ ] Ověřit TypeScript: `npx tsc --noEmit 2>&1 | head -30`
- [ ] Opravit import chyby (useCompetition hook, schedule types)
- [ ] Commit: `git commit -m "feat: LiveControlDashboard — main live control wrapper"`

### Task 19: Napojit live/page.tsx + přidat live tab do page.tsx

**Files:**
- Modify: `src/app/dashboard/competitions/[id]/live/page.tsx`
- Modify: `src/app/dashboard/competitions/[id]/page.tsx`

- [ ] Nahradit obsah `live/page.tsx` — zahodit stávající implementaci, vložit `<LiveControlDashboard>`:
```typescript
'use client'
import { use } from 'react'
import { LiveControlDashboard } from '@/components/live/LiveControlDashboard'

export default function LivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <LiveControlDashboard competitionId={id} />
}
```
- [ ] V `src/app/dashboard/competitions/[id]/page.tsx` přidat import a live tab:
  1. Přidat import: `import { LiveControlDashboard } from '@/components/live/LiveControlDashboard'`
  2. V `<TabsList>` přidat za `settings` trigger: `<TabsTrigger value="live">Live řízení</TabsTrigger>`
  3. Přidat `<TabsContent value="live"><LiveControlDashboard competitionId={id} /></TabsContent>`
  4. Reorder triggery v TabsList tak aby odpovídaly: overview, sections, pairs, judges, content, settings, schedule, live, analytics
- [ ] Spustit dev: `#!/bin/zsh && export PATH="/Users/janbystriansky/node/bin:$PATH" && cd /Users/janbystriansky/IdeaProjects/frontend && npm run dev > /tmp/frontend.log 2>&1 &`
- [ ] Ověřit: `sleep 5 && tail -20 /tmp/frontend.log`
- [ ] Commit: `git commit -m "feat: wire LiveControlDashboard to live tab + live/page.tsx"`

---

## FÁZE 4 — LiveControlWidget + Veřejná projekce

### Task 20: LiveControlWidget pro tab Přehled

**Files:**
- Create: `src/components/live/LiveControlWidget.tsx`
- Modify: `src/app/dashboard/competitions/[id]/page.tsx` (overview TabsContent)

- [ ] Vytvořit `src/components/live/LiveControlWidget.tsx` — mini read-only verze:
```typescript
'use client'
import { useLiveStore } from '@/store/live-store'
import { useRouter } from 'next/navigation'

interface Props {
  competitionId: string
  competitionStatus: string
}

export function LiveControlWidget({ competitionId, competitionStatus }: Props) {
  const router = useRouter()
  const { selectedRoundId, selectedDanceId, judgeStatuses, heatResults } = useLiveStore()

  if (competitionStatus === 'DRAFT' || competitionStatus === 'PUBLISHED') {
    return (
      <div className="rounded-xl border p-6 text-center" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Soutěž ještě nezačala. Live řízení bude dostupné po spuštění.
        </p>
      </div>
    )
  }

  if (competitionStatus === 'COMPLETED') {
    return (
      <div className="rounded-xl border p-6 text-center" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Soutěž skončila. Výsledky jsou dostupné v záložce Vyhodnocení.
        </p>
      </div>
    )
  }

  const submittedCount = Object.values(judgeStatuses).filter((s) => s === 'submitted').length
  const totalJudges = Object.keys(judgeStatuses).length

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--accent)/30', background: 'var(--surface)' }}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          <div className="h-2 w-2 animate-pulse rounded-full" style={{ background: 'var(--accent)' }} />
          Probíhá nyní
        </div>
        <button onClick={() => router.push(`/dashboard/competitions/${competitionId}?tab=live`)}
          className="text-xs" style={{ color: 'var(--accent)' }}>
          Otevřít Live řízení →
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Kolo</div>
          <div className="text-sm font-bold" style={{ fontFamily: 'var(--font-sora)' }}>{selectedRoundId ?? '—'}</div>
        </div>
        <div>
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Tanec</div>
          <div className="text-sm font-bold" style={{ fontFamily: 'var(--font-sora)' }}>{selectedDanceId ?? '—'}</div>
        </div>
        <div>
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Porotci</div>
          <div className="text-sm font-bold" style={{ fontFamily: 'var(--font-sora)' }}>
            {totalJudges > 0 ? `${submittedCount}/${totalJudges}` : '—'}
          </div>
        </div>
      </div>
    </div>
  )
}
```
- [ ] Přidat `LiveControlWidget` do overview TabsContent v `page.tsx` — za existující metriky, před sections list
- [ ] Commit: `git commit -m "feat: LiveControlWidget for overview tab"`

### Task 21: Veřejná projekční stránka /display

**Files:**
- Create: `src/app/competitions/[id]/display/page.tsx`

- [ ] Vytvořit `src/app/competitions/[id]/display/page.tsx` — veřejná, bez authu, dark full-screen:
```typescript
'use client'
import { use } from 'react'
import { useLiveStore } from '@/store/live-store'
import { useSSE } from '@/hooks/use-sse'

export default function DisplayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { selectedRoundId, selectedDanceId, selectedHeatId, judgeStatuses, heatResults, updateJudgeStatus, setHeatResults } = useLiveStore()

  useSSE<{ judgeId: string; status: string }>(id, 'judge:status-changed', (data) => {
    updateJudgeStatus(data.judgeId, data.status as any)
  })

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ background: '#0d0d0f', color: '#f5f5f7' }}>
      <div className="text-center">
        <div className="mb-4 text-sm uppercase tracking-widest" style={{ color: '#48484a' }}>
          {selectedDanceId ?? 'Live výsledky'}
        </div>
        <div className="text-5xl font-bold mb-2" style={{ fontFamily: 'var(--font-sora)' }}>
          {selectedDanceId ?? '—'}
        </div>
        <div className="text-xl mb-8" style={{ color: '#8e8e93' }}>
          {selectedRoundId ? `Kolo ${selectedRoundId}` : ''} {selectedHeatId ? `· Skupina ${selectedHeatId}` : ''}
        </div>
        {heatResults && (
          <div className="flex flex-col gap-3 max-w-md mx-auto">
            {heatResults.map((r) => (
              <div key={r.pairId} className="flex items-center justify-between rounded-xl border px-6 py-4"
                style={{ borderColor: r.advances ? '#30d158' : '#2c2c2e', background: '#1c1c1e' }}>
                <span className="text-2xl font-bold" style={{ fontFamily: 'var(--font-sora)' }}>{r.pairNumber}</span>
                <span className="font-bold" style={{ color: r.advances ? '#30d158' : '#ff453a' }}>
                  {r.advances ? 'POSTUPUJE' : 'VYŘAZEN'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```
- [ ] Ověřit TypeScript
- [ ] Commit: `git commit -m "feat: public display page /competitions/[id]/display"`

---

## FÁZE 5 — Dopilování existujících tabů

### Task 22: Vyhodnocení — Skating vizualizace

**Files:**
- Modify: `src/components/competition/vyhodnoceni-tab.tsx`

- [ ] Přečíst aktuální `vyhodnoceni-tab.tsx` (celý soubor)
- [ ] Přidat `SkatingVizRow` komponentu přímo v souboru (lokální):
```typescript
function SkatingVizRow({ pairNumber, votes, judgeLetters }: { pairNumber: number; votes: boolean[]; judgeLetters: string[] }) {
  const yesCount = votes.filter(Boolean).length
  const advances = yesCount > votes.length / 2
  return (
    <div className="flex items-center gap-2 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
      <span className="w-8 font-bold" style={{ fontFamily: 'var(--font-sora)' }}>{pairNumber}</span>
      <div className="flex gap-1">
        {votes.map((v, i) => (
          <span key={i} className="text-xs"
            style={{ color: v ? 'var(--success)' : 'var(--text-tertiary)' }}>
            {judgeLetters[i]}{v ? '✓' : '✗'}
          </span>
        ))}
      </div>
      <span className="ml-auto text-xs font-bold"
        style={{ color: advances ? 'var(--success)' : 'var(--destructive)' }}>
        {yesCount}/{votes.length}
      </span>
    </div>
  )
}
```
- [ ] Přidat sekci Skating vizualizace za existující FinalSummaryTable
- [ ] Commit: `git commit -m "feat: Skating visualization in vyhodnoceni-tab"`

### Task 23: Porota — ping + online/offline

**Files:**
- Modify: `src/components/competition/judges-tab.tsx`

- [ ] Přečíst aktuální `judges-tab.tsx`
- [ ] Přidat online/offline badge na každého porotce (dot + text)
- [ ] Přidat "Ping" tlačítko u porotců se stavem `pending`/`scoring` — volá `liveApi.pingJudge(judgeId)` s toast na chybu
- [ ] Commit: `git commit -m "feat: ping + online/offline in judges-tab"`

### Task 24: Páry — heat assignment

**Files:**
- Modify: `src/app/dashboard/competitions/[id]/pairs/page.tsx`

- [ ] Přečíst aktuální `pairs/page.tsx`
- [ ] Přidat sekci "Přiřazení do skupin" — DataTable párů s novým sloupcem `Skupina`, tlačítko "Auto-generovat skupiny" volá `PUT /rounds/{id}/heats/auto-assign` mock
- [ ] Přidat MSW mock: `mock.onPut(new RegExp('/rounds/.*/heats/auto-assign')).reply(200, { assigned: true })`
- [ ] Commit: `git commit -m "feat: heat assignment UI in pairs page"`

### Task 25: Obsah tab — rozšíření

**Files:**
- Modify: `src/app/dashboard/competitions/[id]/page.tsx` (sekce TabsContent value="content")

- [ ] Přečíst relevantní část `page.tsx` — najít `<TabsContent value="content">`
- [ ] Přidat do content sekce:
  - Místo konání: adresa, mapový embed (Google Maps iframe)
  - Kontakty pořadatelů (jméno, email, telefon)
  - Veřejná stránka toggle: `PUT /competitions/{id}` s `status: PUBLISHED/DRAFT`
  - Galerie fotek (file input, zobrazení jako grid thumbnails)
- [ ] Commit: `git commit -m "feat: content tab — venue, contacts, gallery, public toggle"`

### Task 26: Nastavení tab — scoring system + nebezpečná zóna

**Files:**
- Modify: `src/app/dashboard/competitions/[id]/page.tsx` (sekce TabsContent value="settings")

- [ ] Přečíst relevantní část `page.tsx` — najít `<TabsContent value="settings">`
- [ ] Přidat do settings sekce:
  - Soutěžní systém selector: `<Select>` s hodnotami Skating System / WDSF
  - Nebezpečná zóna: tlačítko "Smazat soutěž" (červené, potvrzovací dialog)
  - Tlačítko "Archivovat" — volá `PUT /competitions/{id}` s `status: ARCHIVED`
- [ ] Commit: `git commit -m "feat: settings tab — scoring system selector + danger zone"`

---

## FÁZE 6 — Finální ověření

### Task 27: TypeScript + build check

- [ ] Spustit `npx tsc --noEmit 2>&1` — opravit všechny chyby
- [ ] Spustit `npm run build 2>&1 | tail -20` — ověřit čistý build
- [ ] Commit: `git commit -m "fix: TypeScript errors from full build check"`

### Task 28: Playwright vizuální verifikace

- [ ] Spustit frontend: `npm run dev > /tmp/frontend.log 2>&1 &` + `sleep 5`
- [ ] Screenshot tab navigace — ověřit 9 tabů
- [ ] Screenshot Live tab — ověřit sekce 1–6 viditelné
- [ ] Screenshot Prezentační mód — stisknout P, screenshot full-screen overlay
- [ ] Screenshot Přehled tab s LiveControlWidget
- [ ] Screenshot /competitions/[id]/display — veřejná stránka

### Task 29: Backend compile + migrace

- [ ] Spustit backend kompilaci: `cd /Users/janbystriansky/IdeaProjects/danceapp-backend && ./mvnw compile -q`
- [ ] Spustit aplikaci: `./mvnw spring-boot:run > /tmp/backend.log 2>&1 &`
- [ ] Ověřit migrace proběhly: `tail -30 /tmp/backend.log | grep -i liquibase`
- [ ] Curl nové endpointy (po přihlášení): `curl -X POST http://localhost:8080/api/v1/heats/test/send`

---

## Závislosti (pořadí tasků)

```
Task 1 → Task 2 → Task 3 → Task 4   (backend, sekvenčně)
Task 5 → Task 6 → Task 7             (store + SSE + API, sekvenčně)
Task 8                                (MSW, paralelně po Task 7)
Task 9–17                             (live komponenty, po Task 5+7)
Task 18                               (LiveControlDashboard, po Task 9–17)
Task 19                               (wire do page.tsx, po Task 18)
Task 20–21                            (widget + display, po Task 18)
Task 22–26                            (tab dopilování, nezávislé na Fázi 3)
Task 27–29                            (verifikace, vždy poslední)
```
