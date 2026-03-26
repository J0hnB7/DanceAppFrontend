'use client'

import { useCallback, useEffect, useState } from 'react'
import { Send, Lock, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'

import apiClient from '@/lib/api-client'
import { useLiveStore } from '@/store/live-store'
import { liveApi, type JudgeStatusDto } from '@/lib/api/live'
import { useSSE } from '@/hooks/use-sse'
import { useSSEConnected } from '@/lib/sse-client'
import { useToast } from '@/hooks/use-toast'

import { roundsApi, type PreliminaryResultResponse } from '@/lib/api/rounds'

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
  /** Currently selected dance name (e.g., "Waltz") — passed to judge-statuses for per-dance filtering */
  selectedDanceName: string | null
  /** Section ID — needed for round close/complete API */
  sectionId: string | null
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
  selectedDanceName,
  sectionId,
}: Props) {
  const {
    selectedRoundId,
    selectedDanceId,
    selectedHeatId,
    judgeStatuses,
    judgeOnline,
    heatResults,
    incidents,
    presMode,
    lastSentAt,
    selectRound,
    selectDance,
    selectHeat,
    updateJudgeStatus,
    updateJudgeOnline,
    setHeatResults,
    setLastSentAt,
    togglePresMode,
    hydrateFromServer,
    danceConfirmations,
    roundClosed,
    setRoundClosed,
  } = useLiveStore()

  const { toast } = useToast()
  const [sending, setSending] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showIncidentModal, setShowIncidentModal] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [closing, setClosing] = useState(false)
  const [closeResult, setCloseResult] = useState<PreliminaryResultResponse | null>(null)
  const [showCollisionDialog, setShowCollisionDialog] = useState(false)

  const sseConnected = useSSEConnected(competitionId)

  // All dances confirmed = every dance has submitted === total and total > 0
  const danceIds = Object.keys(danceConfirmations)
  const allDancesConfirmed = danceIds.length > 0 && danceIds.every((id) => {
    const dc = danceConfirmations[id]
    return dc.total > 0 && dc.submitted === dc.total
  })

  // Close round + calculate handler
  const handleCloseRound = useCallback(async () => {
    if (!activeRoundId || !sectionId) return
    setClosing(true)
    try {
      // 1. Close the round
      await roundsApi.close(activeRoundId)
      // 2. Calculate results
      const result = await roundsApi.calculateResults(activeRoundId) as PreliminaryResultResponse
      setCloseResult(result)

      if (result.tieAtBoundary && result.tiedPairsAtBoundary?.length > 0) {
        // Show collision resolution dialog
        setShowCollisionDialog(true)
      } else {
        // Success — round closed and calculated
        setRoundClosed(true)
        toast({ title: 'Kolo uzavřeno a vyhodnoceno' })
      }
    } catch (err) {
      console.error('[LiveControlDashboard] close round failed', err)
      toast({ title: 'Nepodařilo se uzavřít kolo', variant: 'destructive' })
    } finally {
      setClosing(false)
      setShowCloseConfirm(false)
    }
  }, [activeRoundId, sectionId, setRoundClosed, toast])

  // Collision resolution: "more" = all tied pairs advance, "less" = fewer advance
  const handleResolveTie = useCallback(async (choice: 'more' | 'less') => {
    if (!activeRoundId) return
    setClosing(true)
    try {
      const result = await roundsApi.resolveTie(activeRoundId, choice) as PreliminaryResultResponse
      setCloseResult(result)
      setShowCollisionDialog(false)
      setRoundClosed(true)
      toast({ title: 'Kolo uzavřeno a vyhodnoceno' })
    } catch (err) {
      console.error('[LiveControlDashboard] resolve tie failed', err)
      toast({ title: 'Nepodařilo se vyřešit remízu', variant: 'destructive' })
    } finally {
      setClosing(false)
    }
  }, [activeRoundId, setRoundClosed, toast])

  // Resolve real heatId: heatIdMap first, then find RUNNING heat in active round as fallback
  const resolveRealHeatId = useCallback(async (): Promise<string | null> => {
    const fromMap = selectedHeatId ? heatIdMap[selectedHeatId] : undefined
    if (fromMap) return fromMap
    if (!activeRoundId) return null
    try {
      const res = await apiClient.get<Array<{ id: string; heatNumber: number; status: string }>>(
        `/rounds/${activeRoundId}/heats`
      )
      // Prefer RUNNING heat; fall back to first heat if none running
      const running = res.data.find((h) => h.status === 'RUNNING') ?? res.data[0]
      return running?.id ?? null
    } catch {
      return null
    }
  }, [selectedHeatId, heatIdMap, activeRoundId])

  // Hydrate when heat or dance selected or activeRoundId resolves
  useEffect(() => {
    if (!activeRoundId) return
    resolveRealHeatId().then((realHeatId) => {
      if (realHeatId) hydrateFromServer(competitionId, realHeatId, selectedDanceName)
    })
  }, [competitionId, selectedHeatId, selectedDanceName, heatIdMap, activeRoundId, hydrateFromServer, resolveRealHeatId])

  // SSE — judge submitted score
  useSSE(competitionId, 'score-submitted', (data: { judgeTokenId: string }) => {
    if (data.judgeTokenId) {
      updateJudgeStatus(data.judgeTokenId, 'submitted')
    }
  })

  // Polling fallback — refresh judge statuses + online every 8s when a round is active
  useEffect(() => {
    if (!activeRoundId) return;
    const poll = async () => {
      const realHeatId = await resolveRealHeatId()
      if (!realHeatId) return
      liveApi.getJudgeStatuses(realHeatId, selectedDanceName ?? undefined, competitionId)
        .then((statuses) => {
          const current = useLiveStore.getState().judgeStatuses;
          for (const s of statuses) {
            if (current[s.judgeId] !== 'submitted' || s.status === 'submitted') {
              updateJudgeStatus(s.judgeId, s.status);
            }
            if (s.online !== undefined) {
              updateJudgeOnline(s.judgeId, s.online);
            }
          }
        })
        .catch(() => {});
    };
    poll();
    const id = setInterval(poll, 8_000);
    return () => clearInterval(id);
  }, [activeRoundId, selectedDanceName, resolveRealHeatId, updateJudgeStatus, updateJudgeOnline])

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

  // SSE — all judges submitted → load results + update judge statuses + online (payload contains real heatId)
  useSSE(competitionId, 'heat:all-submitted', async (data: { heatId: string; roundId: string }) => {
    if (!data.heatId) return
    try {
      const [results, statuses] = await Promise.all([
        liveApi.getHeatResults(data.heatId),
        liveApi.getJudgeStatuses(data.heatId, undefined, competitionId),
      ])
      setHeatResults(results)
      for (const s of statuses) {
        updateJudgeStatus(s.judgeId, s.status)
        if (s.online !== undefined) updateJudgeOnline(s.judgeId, s.online)
      }
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
      // Refresh judge statuses + online immediately after sending
      liveApi.getJudgeStatuses(realHeatId, selectedDanceName ?? undefined, competitionId).then((statuses) => {
        for (const s of statuses) {
          updateJudgeStatus(s.judgeId, s.status)
          if (s.online !== undefined) updateJudgeOnline(s.judgeId, s.online)
        }
      }).catch(() => {})
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
                activeRoundId={activeRoundId}
                heatResults={heatResults}
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
        <div className="min-w-0 flex-1 pr-4 pl-10">
          <div
            className="truncate text-xs"
            style={{ color: 'var(--text-secondary)' }}
          >
            {ctxLine}
          </div>
          {lastSentAt && (
            <div className="mt-0.5 text-[10px]" style={{ color: 'var(--success)' }}>
              Odesláno{' '}
              {(() => { const d = new Date(lastSentAt); return isFinite(d.getTime()) ? d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : null; })()}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Close round button — visible when round selected, hidden when already closed */}
          {selectedRoundId && !roundClosed && (
            <button
              onClick={() => setShowCloseConfirm(true)}
              disabled={!allDancesConfirmed || closing}
              title={!allDancesConfirmed ? 'Nejprve musí všichni porotci potvrdit všechny tance' : 'Uzavřít kolo a vyhodnotit'}
              className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: allDancesConfirmed
                  ? 'linear-gradient(135deg, #30d158, #28a745)'
                  : 'rgba(142,142,147,0.3)',
                boxShadow: allDancesConfirmed ? '0 4px 16px rgba(48,209,88,.3)' : 'none',
              }}
            >
              {closing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              {closing ? 'Vyhodnocuji…' : 'Uzavřít kolo'}
            </button>
          )}

          {/* Round closed badge */}
          {selectedRoundId && roundClosed && (
            <div
              className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold"
              style={{ background: 'rgba(48,209,88,0.15)', color: '#30d158' }}
            >
              <CheckCircle2 className="h-4 w-4" />
              Kolo uzavřeno
            </div>
          )}

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

      {/* Close round confirm dialog */}
      {showCloseConfirm && (
        <div
          className="fixed inset-0 z-[900] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,.72)', backdropFilter: 'blur(6px)' }}
          onClick={() => !closing && setShowCloseConfirm(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              Uzavřít kolo a vyhodnotit?
            </div>
            <p className="mb-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Po uzavření bude kolo vyhodnoceno dle pravidel Skating System.
              Postupující páry budou přiřazeny do dalšího kola.
              Tuto akci lze vzít zpět.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCloseConfirm(false)}
                disabled={closing}
                className="rounded-lg px-4 py-2 text-sm"
                style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
              >
                Zrušit
              </button>
              <button
                onClick={handleCloseRound}
                disabled={closing}
                className="flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #30d158, #28a745)' }}
              >
                {closing && <Loader2 className="h-4 w-4 animate-spin" />}
                Uzavřít a vyhodnotit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collision resolution dialog (tie at boundary) */}
      {showCollisionDialog && closeResult && (
        <div
          className="fixed inset-0 z-[900] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,.72)', backdropFilter: 'blur(6px)' }}
        >
          <div
            className="w-full max-w-lg rounded-2xl p-6"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="mb-1 flex items-center gap-2 text-base font-semibold" style={{ color: '#ff9f0a' }}>
              <AlertTriangle className="h-5 w-5" />
              Remíza na hranici postupu
            </div>
            <p className="mb-4 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Na hranici postupu se umístilo více párů se stejným počtem bodů.
              Dle pravidel WDSF (Rule E.8.1) postupují všechny páry na sdíleném místě.
            </p>

            {/* Show tied pairs */}
            {closeResult.tiedPairsAtBoundary.length > 0 && (
              <div
                className="mb-4 rounded-lg p-3 text-sm"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
              >
                <div className="mb-1 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                  Páry na hranici:
                </div>
                <div style={{ color: 'var(--text-primary)' }}>
                  {closeResult.pairs
                    .filter((p) => closeResult.tiedPairsAtBoundary.includes(p.pairId))
                    .map((p) => `#${p.startNumber}`)
                    .join(', ')}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => handleResolveTie('less')}
                disabled={closing}
                className="rounded-lg px-4 py-2 text-sm"
                style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
              >
                Méně (nepostoupí)
              </button>
              <button
                onClick={() => handleResolveTie('more')}
                disabled={closing}
                className="flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #30d158, #28a745)' }}
              >
                {closing && <Loader2 className="h-4 w-4 animate-spin" />}
                Více — postupují všichni (WDSF)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Round results inline (after close) */}
      {roundClosed && closeResult && (
        <div
          className="fixed inset-0 z-[800] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setCloseResult(null)}
        >
          <div
            className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl p-6"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              Výsledky kola — {closeResult.pairsToAdvance} párů postupuje
            </div>
            <div className="space-y-2">
              {closeResult.pairs
                .sort((a, b) => b.voteCount - a.voteCount)
                .map((pair) => (
                  <div
                    key={pair.pairId}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm"
                    style={{
                      background: pair.advances ? 'rgba(48,209,88,0.08)' : 'rgba(255,69,58,0.06)',
                      border: `1px solid ${pair.advances ? 'rgba(48,209,88,0.2)' : 'rgba(255,69,58,0.15)'}`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                        #{pair.startNumber}
                      </span>
                      {pair.dancer1Name && (
                        <span style={{ color: 'var(--text-secondary)' }}>{pair.dancer1Name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {pair.voteCount} X
                      </span>
                      <span
                        className="rounded px-2 py-0.5 text-xs font-semibold"
                        style={{
                          background: pair.advances ? 'rgba(48,209,88,0.15)' : 'rgba(255,69,58,0.12)',
                          color: pair.advances ? '#30d158' : '#ff453a',
                        }}
                      >
                        {pair.advances ? 'POSTUPUJE' : 'VYŘAZEN'}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
            <button
              onClick={() => setCloseResult(null)}
              className="mt-4 w-full rounded-lg py-2 text-xs"
              style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
            >
              Zavřít
            </button>
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
