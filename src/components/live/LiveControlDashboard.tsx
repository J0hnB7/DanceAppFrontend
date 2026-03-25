'use client'

import { useCallback, useEffect, useState } from 'react'
import { Send } from 'lucide-react'

import { useLiveStore } from '@/store/live-store'
import { liveApi, type JudgeStatusDto } from '@/lib/api/live'
import { useSSE } from '@/hooks/use-sse'
import { useSSEConnected } from '@/lib/sse-client'
import { useToast } from '@/hooks/use-toast'

import { LiveStatusBar } from './LiveStatusBar'
import { RoundSelector, type RoundItem } from './RoundSelector'
import { DanceSelector, type DanceItem } from './DanceSelector'
import { HeatSelector, type HeatItem } from './HeatSelector'
import { JudgePanel } from './JudgePanel'
import { IncidentPanel } from './IncidentPanel'
import { HeatResults } from './HeatResults'
import { PresentationOverlay } from './PresentationOverlay'
import { LiveSidebar } from './LiveSidebar'
interface Props {
  competitionId: string
  competitionName: string
  rounds: RoundItem[]
  dances: DanceItem[]
  heats: HeatItem[]
  judgeDetails: JudgeStatusDto[]
  /** Real backend Round entity UUID — needed to start round before scoring */
  activeRoundId: string | null
  /** For sidebar stats */
  totalPairs: number
  /** Maps synthetic heat IDs (`${slotId}-h${heatNumber}`) → real backend UUID heat IDs */
  heatIdMap: Record<string, string>
}

export function LiveControlDashboard({
  competitionId,
  competitionName,
  rounds,
  dances,
  heats,
  judgeDetails,
  activeRoundId,
  totalPairs,
  heatIdMap,
}: Props) {
  const {
    selectedRoundId,
    selectedDanceId,
    selectedHeatId,
    judgeStatuses,
    heatResults,
    incidents,
    presMode,
    lastSentAt,
    selectRound,
    selectDance,
    selectHeat,
    updateJudgeStatus,
    setHeatResults,
    setLastSentAt,
    togglePresMode,
    hydrateFromServer,
  } = useLiveStore()

  const { toast } = useToast()
  const [sending, setSending] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showIncidentModal, setShowIncidentModal] = useState(false)

  const sseConnected = useSSEConnected(competitionId)

  // Hydrate when heat selected — use real backend UUID (not synthetic)
  useEffect(() => {
    if (selectedHeatId) {
      const realHeatId = heatIdMap[selectedHeatId]
      if (realHeatId) {
        hydrateFromServer(competitionId, realHeatId)
      }
    }
  }, [competitionId, selectedHeatId, heatIdMap, hydrateFromServer])

  // SSE — judge submitted score
  useSSE(competitionId, 'score-submitted', (data: { judgeTokenId: string }) => {
    if (data.judgeTokenId) {
      updateJudgeStatus(data.judgeTokenId, 'submitted')
    }
  })

  // Polling fallback — refresh judge statuses immediately + every 8s when a heat is active
  // Catches any updates missed by SSE (connection drops, reconnects, etc.)
  useEffect(() => {
    if (!selectedHeatId) return;
    const realHeatId = heatIdMap[selectedHeatId];
    if (!realHeatId) return;
    const poll = () => {
      liveApi.getJudgeStatuses(realHeatId)
        .then((statuses) => {
          for (const s of statuses) {
            updateJudgeStatus(s.judgeId, s.status);
          }
        })
        .catch(() => {});
    };
    poll(); // immediate fetch on mount / heat change
    const id = setInterval(poll, 8_000);
    return () => clearInterval(id);
  }, [selectedHeatId, heatIdMap, updateJudgeStatus])

  // SSE — results published (all judges done) → load results (legacy fallback)
  useSSE(competitionId, 'results-published', async () => {
    if (!selectedHeatId) return
    const realHeatId = heatIdMap[selectedHeatId]
    if (!realHeatId) return
    try {
      const results = await liveApi.getHeatResults(realHeatId)
      setHeatResults(results)
    } catch {
      // silently ignore — user can refresh
    }
  })

  // SSE — all judges submitted → auto-show results panel (payload contains real heatId)
  useSSE(competitionId, 'heat:all-submitted', async (data: { heatId: string; roundId: string }) => {
    if (!data.heatId) return
    try {
      const results = await liveApi.getHeatResults(data.heatId)
      setHeatResults(results)
    } catch {
      // silently ignore
    }
  })

  // ← → heat navigation
  const navigateHeat = useCallback((dir: -1 | 1) => {
    if (heats.length === 0) return
    const idx = heats.findIndex((h) => h.id === selectedHeatId)
    const next = idx === -1 ? 0 : Math.max(0, Math.min(heats.length - 1, idx + dir))
    selectHeat(heats[next].id)
  }, [heats, selectedHeatId, selectHeat])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'p' || e.key === 'P') {
        togglePresMode()
      } else if (e.key === 'i' || e.key === 'I') {
        setShowIncidentModal(true)
      } else if (e.key === 'Escape') {
        if (presMode) { togglePresMode(); return }
        if (showHelp) { setShowHelp(false); return }
        if (showIncidentModal) { setShowIncidentModal(false); return }
      } else if (e.key === '?') {
        setShowHelp((v) => !v)
      } else if (e.key === ' ' || (e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        if (selectedHeatId && !sending) handleSend()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        navigateHeat(-1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        navigateHeat(1)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [presMode, showHelp, showIncidentModal, selectedHeatId, sending, navigateHeat]) // eslint-disable-line react-hooks/exhaustive-deps

  // Derived labels
  const selectedRound = rounds.find((r) => r.id === selectedRoundId)
  const selectedDance = dances.find((d) => d.id === selectedDanceId)

  const handleSend = useCallback(async () => {
    if (!selectedHeatId) return
    const realHeatId = heatIdMap[selectedHeatId]
    if (!realHeatId) {
      toast({ title: 'Skupina zatím není synchronizována. Zkuste znovu.', variant: 'destructive' })
      return
    }
    setSending(true)
    try {
      // Ensure round is IN_PROGRESS so judges see it in their lobby
      if (activeRoundId) {
        await liveApi.startRound(activeRoundId).catch(() => {/* already started — ignore */})
      }
      await liveApi.sendHeat(realHeatId)
      setLastSentAt(new Date().toISOString())
      toast({ title: 'Skupina odeslána porotcům' })
    } catch {
      toast({ title: 'Nepodařilo se odeslat skupinu', variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }, [selectedHeatId, heatIdMap, activeRoundId, setLastSentAt, toast])
  const selectedHeat = heats.find((h) => h.id === selectedHeatId)

  const roundLabel = selectedRound?.label ?? '—'
  const danceLabel = selectedDance?.name ?? '—'
  const heatLabel = selectedHeat ? `Skupina ${selectedHeat.number}` : '—'
  const pairNumbers = selectedHeat?.pairNumbers ?? []

  // Bottom bar context text
  let ctxLine = 'Vyberte kolo pro zahájení'
  if (selectedRoundId && !selectedDanceId) ctxLine = `${roundLabel} — vyberte tanec`
  else if (selectedDanceId && !selectedHeatId) ctxLine = `${danceLabel} — vyberte skupinu`
  else if (selectedHeatId) ctxLine = `${roundLabel} · ${danceLabel} · ${heatLabel}`

  // Sidebar stats
  const doneRounds = rounds.filter((r) => r.status === 'done').length
  const waitRounds = rounds.filter((r) => r.status === 'upcoming').length
  const sidebarRunning = selectedRound ? [{
    label: `${competitionName} — ${selectedRound.label}`,
    meta: heats.length > 0 ? `${heats.length} skupin` : '',
    floorLabel: selectedHeat ? `Skupina ${selectedHeat.number} na parketu` : 'Vyberte skupinu',
  }] : []

  // Sidebar selected block
  const selectedBlock = selectedRound
    ? { name: `${competitionName} — ${roundLabel}`, timeRange: danceLabel }
    : null

  return (
    <div className="relative flex flex-col" style={{ minHeight: '100vh' }}>
      {/* Sticky status bar */}
      <LiveStatusBar
        competitionId={competitionId}
        competitionName={competitionName}
        roundLabel={roundLabel}
        sseConnected={sseConnected}
        lastSentAt={lastSentAt}
        onPresentationMode={togglePresMode}
        onShowHelp={() => setShowHelp((v) => !v)}
        onIncident={() => setShowIncidentModal(true)}
        incidentCount={incidents.length}
      />

      {/* Progress bar */}
      <div
        className="sticky z-[99] h-[3px]"
        style={{ top: 54, background: 'var(--surface-2)' }}
      >
        {selectedHeatId && (
          <div
            className="h-full transition-all duration-500"
            style={{
              width: Object.keys(judgeStatuses).length > 0
                ? `${(Object.values(judgeStatuses).filter((s) => s === 'submitted').length / judgeDetails.length) * 100}%`
                : '0%',
              background: 'linear-gradient(90deg, var(--accent), #30d158)',
            }}
          />
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 pb-24">
        <div className="mx-auto max-w-[960px]">
          <div className="flex flex-col gap-8 px-5 py-7">
            {/* 1. Round selector */}
            <RoundSelector rounds={rounds} selectedId={selectedRoundId} onSelect={selectRound} />

            {/* 2. Dance selector */}
            {selectedRoundId && (
              <DanceSelector dances={dances} selectedId={selectedDanceId} onSelect={selectDance} roundLabel={selectedRound?.label} />
            )}

            {/* 3. Heat selector */}
            {selectedDanceId && (
              <HeatSelector
                heats={heats}
                selectedId={selectedHeatId}
                activePairIds={[]}
                onSelect={selectHeat}
                onSkip={async (id) => {
                  const realId = heatIdMap[id] ?? id
                  try {
                    await liveApi.skipHeat(realId)
                  } catch {
                    toast({ title: 'Nepodařilo se přeskočit skupinu', variant: 'destructive' })
                  }
                }}
                onReorder={() => {}}
                danceLabel={selectedDance?.name}
              />
            )}

            {/* 4. Judge panel */}
            {selectedRoundId && judgeDetails.length > 0 && (
              <JudgePanel
                judgeStatuses={judgeStatuses}
                judgeDetails={judgeDetails}
                competitionId={competitionId}
                heatId={(selectedHeatId ? heatIdMap[selectedHeatId] : undefined) ?? ''}
              />
            )}

            {/* 5. Incidents */}
            {selectedHeatId && incidents.length > 0 && (
              <IncidentPanel
                incidents={incidents}
                competitionId={competitionId}
                roundId={selectedRoundId}
                heatId={selectedHeatId}
              />
            )}

            {/* 6. Heat results */}
            {heatResults && heatResults.length > 0 && (
              <HeatResults results={heatResults} />
            )}
          </div>

          {/* Inline sidebar */}
          <LiveSidebar
            running={sidebarRunning}
            stats={{
              totalRounds: rounds.length,
              doneRounds,
              waitRounds,
              totalPairs,
            }}
            selectedBlock={selectedBlock}
          />
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-3.5"
        style={{
          background: 'rgba(28,28,30,0.97)',
          borderTop: '1px solid var(--border)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div className="min-w-0 flex-1 pr-4">
          <div
            className="truncate text-xs"
            style={{ color: 'var(--text-secondary)' }}
          >
            {ctxLine}
          </div>
          {lastSentAt && (
            <div className="mt-0.5 text-[10px]" style={{ color: 'var(--success)' }}>
              Odesláno{' '}
              {new Date(lastSentAt).toLocaleTimeString('cs-CZ', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </div>
          )}
        </div>

        <button
          onClick={handleSend}
          disabled={!selectedHeatId || sending}
          className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-40"
          style={{
            background: 'linear-gradient(135deg, #0a84ff, #0066cc)',
            boxShadow: '0 4px 16px rgba(10,132,255,.3)',
          }}
        >
          <Send className="h-4 w-4" />
          {sending ? 'Odesílám…' : 'Odeslat porotcům'}
        </button>
      </div>

      {/* Help modal */}
      {showHelp && (
        <div
          className="fixed inset-0 z-[900] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowHelp(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Klávesové zkratky
            </div>
            {[
              ['Space', 'Odeslat skupinu porotcům'],
              ['←  /  →', 'Přepínání skupin'],
              ['P', 'Prezentační mód'],
              ['I', 'Zaznamenat incident'],
              ['ESC', 'Zavřít modaly / prezentaci'],
              ['?', 'Tato nápověda'],
            ].map(([key, desc]) => (
              <div
                key={key}
                className="flex items-center justify-between border-b py-2 last:border-0"
                style={{ borderColor: 'var(--border)' }}
              >
                <kbd
                  className="rounded border px-2 py-0.5 text-xs font-mono"
                  style={{
                    background: 'var(--surface-2)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {key}
                </kbd>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {desc}
                </span>
              </div>
            ))}
            <button
              onClick={() => setShowHelp(false)}
              className="mt-4 w-full rounded-lg py-2 text-xs"
              style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
            >
              Zavřít
            </button>
          </div>
        </div>
      )}

      {/* Incident modal */}
      {showIncidentModal && (
        <div
          className="fixed inset-0 z-[900] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,.72)', backdropFilter: 'blur(6px)' }}
          onClick={() => setShowIncidentModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <IncidentPanel
              incidents={incidents}
              competitionId={competitionId}
              roundId={selectedRoundId}
              heatId={selectedHeatId}
              modal
              onClose={() => setShowIncidentModal(false)}
            />
          </div>
        </div>
      )}

      {/* Presentation overlay */}
      <PresentationOverlay
        competitionName={competitionName}
        roundLabel={roundLabel}
        danceLabel={danceLabel}
        heatLabel={heatLabel}
        pairNumbers={pairNumbers}
      />
    </div>
  )
}
