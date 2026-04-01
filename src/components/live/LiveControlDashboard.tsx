'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { useLiveStore } from '@/store/live-store'
import { liveApi, type JudgeStatusDto } from '@/lib/api/live'
import { violationsApi, type Violation } from '@/lib/api/violations'
import { useSSE } from '@/hooks/use-sse'
import { useSSEConnected } from '@/lib/sse-client'
import { useJudgeStatusPolling } from '@/hooks/use-judge-status-polling'
import { useRoundControl } from '@/hooks/use-round-control'

import { LiveStatusBar } from './LiveStatusBar'
import { RoundSelector, type RoundItem } from './RoundSelector'
import { DanceSelector, type DanceItem } from './DanceSelector'
import { HeatSelector, type HeatItem } from './HeatSelector'
import { JudgePanel } from './JudgePanel'
import { IncidentPanel } from './IncidentPanel'
import { HeatResults } from './HeatResults'
import { PresentationOverlay } from './PresentationOverlay'
import { LiveSidebar } from './LiveSidebar'
import { LiveBottomBar } from './LiveBottomBar'
import { LiveHelpModal } from './LiveHelpModal'
import { CloseRoundDialog } from './CloseRoundDialog'
import { TieResolutionDialog } from './TieResolutionDialog'
import { RoundResultsOverlay } from './RoundResultsOverlay'
import { IncidentModal } from './IncidentModal'

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
    heatResults,
    incidents,
    presMode,
    lastSentAt,
    selectRound,
    selectDance,
    selectHeat,
    updateJudgeStatus,
    hydrateFromServer,
    danceConfirmations,
    danceStatuses,
    roundClosed,
  } = useLiveStore()

  const { t } = useLocale()
  const [showHelp, setShowHelp] = useState(false)
  const [showIncidentModal, setShowIncidentModal] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [violations, setViolations] = useState<Violation[]>([])
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const audioRef = useRef<AudioContext | null>(null)

  const sseConnected = useSSEConnected(competitionId)

  const {
    sending,
    closing,
    closingDance,
    closeResult,
    setCloseResult,
    showCollisionDialog,
    resolveRealHeatId,
    handleSend,
    handleCloseDance,
    handleCloseRound,
    handleResolveTie,
    onResultsPublished,
    onAllSubmitted,
    onDanceClosed,
  } = useRoundControl({
    competitionId,
    activeRoundId,
    sectionId,
    selectedHeatId,
    selectedDanceName,
    heatIdMap,
  })

  // Heat is synced when its real backend UUID is available in heatIdMap
  const heatSynced = !!selectedHeatId && !!heatIdMap[selectedHeatId]

  // All dances confirmed = every dance has submitted === total and total > 0
  const danceIds = Object.keys(danceConfirmations)
  const allDancesConfirmed = danceIds.length > 0 && danceIds.every((id) => {
    const dc = danceConfirmations[id]
    return dc.total > 0 && dc.submitted === dc.total
  })

  // Dance status for selected dance — determines close dance button visibility
  const selectedDanceStatus = danceStatuses.find((ds) => ds.danceName === selectedDanceName)
  const showCloseDance = selectedDanceStatus?.status === 'SENT'
  const selectedDanceConf = selectedDanceId ? danceConfirmations[selectedDanceId] : undefined
  const canCloseDance = !!(selectedDanceConf && selectedDanceConf.total > 0 && selectedDanceConf.submitted >= selectedDanceConf.total)

  // Hydrate when heat or dance selected or activeRoundId resolves
  useEffect(() => {
    if (!activeRoundId) return
    resolveRealHeatId().then((realHeatId) => {
      if (realHeatId) hydrateFromServer(competitionId, realHeatId, selectedDanceName)
    })
  }, [competitionId, selectedHeatId, selectedDanceName, heatIdMap, activeRoundId, hydrateFromServer, resolveRealHeatId])

  // Judge status polling fallback (SSE is primary)
  useJudgeStatusPolling({ activeRoundId, selectedDanceId, selectedDanceName, competitionId, resolveRealHeatId })

  // Load pending violations
  useEffect(() => {
    violationsApi.list(competitionId, 'PENDING_REVIEW').then(setViolations).catch(() => {})
  }, [competitionId])

  const pingAudio = () => {
    try {
      if (!audioRef.current) audioRef.current = new AudioContext()
      const osc = audioRef.current.createOscillator()
      const gain = audioRef.current.createGain()
      osc.connect(gain); gain.connect(audioRef.current.destination)
      osc.frequency.value = 880; gain.gain.value = 0.15
      osc.start(); osc.stop(audioRef.current.currentTime + 0.15)
    } catch { /* ignore */ }
  }

  // SSE event handlers
  useSSE(competitionId, 'score-submitted', (data: { judgeTokenId: string }) => {
    if (data.judgeTokenId) {
      updateJudgeStatus(data.judgeTokenId, 'submitted')
      // Also refresh full judge statuses + danceConfirmations so counter stays in sync
      resolveRealHeatId().then((realHeatId) => {
        if (!realHeatId) return
        const store = useLiveStore.getState()
        liveApi.getJudgeStatuses(realHeatId, selectedDanceName ?? undefined, competitionId)
          .then((statuses) => {
            for (const s of statuses) {
              store.updateJudgeStatus(s.judgeId, s.status)
              if (s.online !== undefined) store.updateJudgeOnline(s.judgeId, s.online)
            }
            if (selectedDanceId) {
              store.setDanceConfirmation(selectedDanceId, statuses.filter((j) => j.status === 'submitted').length, statuses.length)
            }
          })
          .catch(() => {})
      })
    }
  })
  useSSE(competitionId, 'results-published', onResultsPublished)
  useSSE(competitionId, 'heat:all-submitted', onAllSubmitted)
  useSSE(competitionId, 'dance-closed', onDanceClosed)
  useSSE(competitionId, 'violation-reported', () => {
    violationsApi.list(competitionId, 'PENDING_REVIEW').then(v => { setViolations(v); pingAudio() }).catch(() => {})
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
    const { togglePresMode } = useLiveStore.getState()
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'p' || e.key === 'P') { togglePresMode() }
      else if (e.key === 'i' || e.key === 'I') { setShowIncidentModal(true) }
      else if (e.key === 'Escape') {
        if (presMode) { togglePresMode(); return }
        if (showHelp) { setShowHelp(false); return }
        if (showIncidentModal) { setShowIncidentModal(false); return }
      } else if (e.key === '?') { setShowHelp((v) => !v) }
      else if (e.key === ' ' || (e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        if (selectedHeatId && !sending) handleSend()
      } else if (e.key === 'ArrowLeft') { e.preventDefault(); navigateHeat(-1) }
      else if (e.key === 'ArrowRight') { e.preventDefault(); navigateHeat(1) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [presMode, showHelp, showIncidentModal, selectedHeatId, sending, navigateHeat, handleSend]) // eslint-disable-line react-hooks/exhaustive-deps

  // Derived labels
  const selectedRound = rounds.find((r) => r.id === selectedRoundId)
  const selectedDance = dances.find((d) => d.id === selectedDanceId)
  const selectedHeat = heats.find((h) => h.id === selectedHeatId)
  const roundLabel = selectedRound?.label ?? '—'
  const danceLabel = selectedDance?.name ?? '—'
  const heatLabel = selectedHeat ? t('live.heat', { n: selectedHeat.number }) : '—'
  const pairNumbers = selectedHeat?.pairNumbers ?? []

  // Bottom bar context text
  let ctxLine = t('live.ctxSelectRound')
  if (selectedRoundId && !selectedDanceId) ctxLine = t('live.ctxSelectDance', { round: roundLabel })
  else if (selectedDanceId && !selectedHeatId) ctxLine = t('live.ctxSelectHeat', { dance: danceLabel })
  else if (selectedHeatId) ctxLine = `${roundLabel} · ${danceLabel} · ${heatLabel}`

  // Sidebar stats
  const doneRounds = rounds.filter((r) => r.status === 'done').length
  const waitRounds = rounds.filter((r) => r.status === 'upcoming').length
  const sidebarRunning = selectedRound ? [{
    label: `${competitionName} — ${selectedRound.label}`,
    meta: heats.length > 0 ? t('live.heatsCount', { n: heats.length }) : '',
    floorLabel: selectedHeat ? t('live.heatOnFloorLabel', { n: selectedHeat.number }) : t('live.selectHeatPrompt'),
  }] : []
  const selectedBlock = selectedRound
    ? { name: `${competitionName} — ${roundLabel}`, timeRange: danceLabel }
    : null

  return (
    <div className="relative flex flex-col" style={{ minHeight: '100vh' }}>
      <LiveStatusBar
        competitionId={competitionId}
        competitionName={competitionName}
        roundLabel={roundLabel}
        sseConnected={sseConnected}
        lastSentAt={lastSentAt}
        onPresentationMode={() => useLiveStore.getState().togglePresMode()}
        onShowHelp={() => setShowHelp((v) => !v)}
        onIncident={() => setShowIncidentModal(true)}
        incidentCount={incidents.length}
      />

      {/* Progress bar */}
      <div className="sticky z-[99] h-[3px]" style={{ top: 54, background: 'var(--surface-2)' }}>
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
            <RoundSelector rounds={rounds} selectedId={selectedRoundId} onSelect={selectRound} />

            {selectedRoundId && (
              <DanceSelector dances={dances} selectedId={selectedDanceId} onSelect={selectDance} roundLabel={selectedRound?.label} confirmations={danceConfirmations} danceStatuses={danceStatuses} />
            )}

            {selectedDanceId && (
              <HeatSelector
                heats={heats}
                selectedId={selectedHeatId}
                activePairIds={[]}
                onSelect={selectHeat}
                onSkip={async (id) => {
                  const realId = heatIdMap[id] ?? id
                  try { await liveApi.skipHeat(realId) }
                  catch { useLiveStore.getState() /* toast handled by liveApi */ }
                }}
                onReorder={() => {}}
                danceLabel={selectedDance?.name}
              />
            )}

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

            {selectedHeatId && incidents.length > 0 && (
              <IncidentPanel incidents={incidents} competitionId={competitionId} roundId={selectedRoundId} heatId={selectedHeatId} />
            )}

            {heatResults && heatResults.length > 0 && <HeatResults results={heatResults} />}

            {/* Violation review queue */}
            {violations.length > 0 && (
              <div className="rounded-xl border-2 border-amber-400 bg-amber-50/10 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">{violations.length}</span>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">{t('live.violationQueue') || 'Hlášení ke schválení'}</h3>
                </div>
                {[...violations].sort((a, b) => a.issuedAt.localeCompare(b.issuedAt)).map((v) => (
                  <div key={v.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2 text-sm">
                      <div>
                        <span className="font-semibold">{v.penaltyType}</span>
                        <span className="ml-2 text-[var(--text-secondary)]">{new Date(v.issuedAt).toLocaleTimeString('cs')}</span>
                      </div>
                    </div>
                    {reviewingId === v.id && v.penaltyType === 'LIFTING' && (
                      <input
                        value={reviewNote}
                        onChange={e => setReviewNote(e.target.value)}
                        placeholder="Poznámka (povinná u Lifting)"
                        className="w-full rounded border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-1.5 text-sm"
                        id={`review-note-${v.id}`}
                      />
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          setReviewingId(v.id)
                          if (v.penaltyType === 'LIFTING' && !reviewNote.trim()) return
                          await violationsApi.review(v.id, { decision: 'CONFIRMED', note: reviewNote, applyDq: v.penaltyType === 'LIFTING' })
                          setViolations(prev => prev.filter(x => x.id !== v.id))
                          setReviewingId(null); setReviewNote('')
                        }}
                        className="flex-1 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 cursor-pointer"
                      >Potvrdit{v.penaltyType === 'LIFTING' ? ' + DQ' : ''}</button>
                      <button
                        onClick={async () => {
                          await violationsApi.review(v.id, { decision: 'DISMISSED', note: '', applyDq: false })
                          setViolations(prev => prev.filter(x => x.id !== v.id))
                        }}
                        className="flex-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] cursor-pointer"
                      >Zamítnout</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <LiveSidebar
            running={sidebarRunning}
            stats={{ totalRounds: rounds.length, doneRounds, waitRounds, totalPairs }}
            selectedBlock={selectedBlock}
          />
        </div>
      </div>

      <LiveBottomBar
        selectedHeatId={selectedHeatId}
        selectedRoundId={selectedRoundId}
        roundClosed={roundClosed}
        allDancesConfirmed={allDancesConfirmed}
        closing={closing}
        closingDance={closingDance}
        sending={sending}
        ctxLine={ctxLine}
        lastSentAt={lastSentAt}
        heatSynced={heatSynced}
        showCloseDance={showCloseDance}
        canCloseDance={canCloseDance}
        onSend={handleSend}
        onCloseDance={handleCloseDance}
        onCloseRound={() => setShowCloseConfirm(true)}
      />

      {showIncidentModal && (
        <IncidentModal
          incidents={incidents}
          competitionId={competitionId}
          roundId={selectedRoundId}
          heatId={selectedHeatId}
          onClose={() => setShowIncidentModal(false)}
        />
      )}

      {showHelp && <LiveHelpModal onClose={() => setShowHelp(false)} />}

      {showCloseConfirm && (
        <CloseRoundDialog
          closing={closing}
          onCancel={() => setShowCloseConfirm(false)}
          onConfirm={() => { setShowCloseConfirm(false); handleCloseRound() }}
        />
      )}

      {showCollisionDialog && closeResult && (
        <TieResolutionDialog closeResult={closeResult} closing={closing} onResolveTie={handleResolveTie} />
      )}

      {roundClosed && closeResult && (
        <RoundResultsOverlay closeResult={closeResult} onClose={() => setCloseResult(null)} />
      )}

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
