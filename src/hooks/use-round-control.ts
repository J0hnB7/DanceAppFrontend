import { useCallback, useEffect, useState } from 'react'
import { useLiveStore } from '@/store/live-store'
import { useScheduleStore } from '@/store/schedule-store'
import { liveApi } from '@/lib/api/live'
import { roundsApi, type PreliminaryResultResponse } from '@/lib/api/rounds'
import { useToast } from '@/hooks/use-toast'
import { useLocale } from '@/contexts/locale-context'
import apiClient from '@/lib/api-client'
import axios from 'axios'

interface Options {
  competitionId: string
  activeRoundId: string | null
  sectionId: string | null
  selectedHeatId: string | null
  selectedDanceName: string | null
  heatIdMap: Record<string, string>
}

export function useRoundControl({
  competitionId,
  activeRoundId,
  sectionId,
  selectedHeatId,
  selectedDanceName,
  heatIdMap,
}: Options) {
  const { t } = useLocale()
  const { toast } = useToast()
  const { updateJudgeStatus, updateJudgeOnline, setHeatResults, setLastSentAt, setRoundClosed, setDanceStatuses } = useLiveStore()
  const loadSchedule = useScheduleStore((s) => s.loadSchedule)

  const [sending, setSending] = useState(false)
  const [closing, setClosing] = useState(false)
  const [closingDance, setClosingDance] = useState(false)
  const [closeResult, setCloseResult] = useState<PreliminaryResultResponse | null>(null)
  const [showCollisionDialog, setShowCollisionDialog] = useState(false)

  // Resolve real heatId: heatIdMap first, then find RUNNING heat as fallback
  // Only falls back to API when a heat IS selected but not yet in heatIdMap
  const resolveRealHeatId = useCallback(async (): Promise<string | null> => {
    if (!selectedHeatId) return null
    const fromMap = heatIdMap[selectedHeatId]
    if (fromMap) return fromMap
    if (!activeRoundId) return null
    try {
      const res = await apiClient.get<Array<{ id: string; heatNumber: number; status: string }>>(
        `/rounds/${activeRoundId}/heats`
      )
      const running = res.data.find((h) => h.status === 'RUNNING') ?? res.data[0]
      return running?.id ?? null
    } catch {
      return null
    }
  }, [selectedHeatId, heatIdMap, activeRoundId])

  const handleSend = useCallback(async () => {
    if (!selectedHeatId) return
    const realHeatId = heatIdMap[selectedHeatId]
    if (!realHeatId) {
      toast({ title: t('live.heatNotSynced'), variant: 'destructive' })
      return
    }
    setSending(true)
    try {
      if (activeRoundId) {
        await liveApi.startRound(activeRoundId).catch(() => {/* already started */})
      }
      await liveApi.sendHeat(realHeatId, selectedDanceName ?? undefined)
      setLastSentAt(new Date().toISOString())
      toast({ title: t('live.heatSent') })
      liveApi.getJudgeStatuses(realHeatId, selectedDanceName ?? undefined, competitionId)
        .then((statuses) => {
          for (const s of statuses) {
            updateJudgeStatus(s.judgeId, s.status)
            if (s.online !== undefined) updateJudgeOnline(s.judgeId, s.online)
          }
        })
        .catch(() => {})
    } catch (err) {
      let title = t('live.heatSendFailed')
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        const msg: string = err.response?.data?.message ?? ''
        const isJudgesIssue = /judge|heat|assignment|draw/i.test(msg)
        title = isJudgesIssue
          ? t('live.heatSendForbiddenJudges')
          : t('live.heatSendForbiddenAuth')
      }
      toast({ title, variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }, [selectedHeatId, heatIdMap, activeRoundId, selectedDanceName, competitionId, setLastSentAt, toast, t, updateJudgeStatus, updateJudgeOnline])

  const handleCloseRound = useCallback(async () => {
    if (!activeRoundId || !sectionId) return
    setClosing(true)
    try {
      await roundsApi.close(activeRoundId)
      // Compute final dance rankings (Skating System) — needed for FINAL rounds.
      // For preliminary rounds this is a no-op (round_scores_final is empty).
      roundsApi.calculateResults(activeRoundId).catch(() => {})
      const result = await roundsApi.getPreliminaryResults(activeRoundId)
      setCloseResult(result)
      if (result.tieAtBoundary && result.tiedPairsAtBoundary?.length > 0) {
        setShowCollisionDialog(true)
      } else {
        setRoundClosed(true)
        toast({ title: t('live.roundClosedToast') })
        loadSchedule(competitionId)
      }
    } catch (err) {
      console.error('[useRoundControl] close round failed', err)
      toast({ title: t('live.roundCloseFailed'), variant: 'destructive' })
    } finally {
      setClosing(false)
    }
  }, [activeRoundId, sectionId, setRoundClosed, toast, t, loadSchedule, competitionId])

  const handleResolveTie = useCallback(async (choice: 'more' | 'less') => {
    if (!activeRoundId || !closeResult) return
    setClosing(true)
    try {
      // Derive advancing pair IDs from pairs list (backend doesn't return advancedPairIds separately)
      const advancingIds = closeResult.pairs.filter((p) => p.advances).map((p) => p.pairId)
      // 'more' = advance tied pairs too; 'less' = exclude them
      const approvedPairIds = choice === 'more'
        ? [...advancingIds, ...(closeResult.tiedPairsAtBoundary ?? [])]
        : [...advancingIds]
      const result = await roundsApi.resolveChairmanTie(activeRoundId, approvedPairIds)
      setCloseResult(result as PreliminaryResultResponse)
      setShowCollisionDialog(false)
      setRoundClosed(true)
      toast({ title: t('live.roundClosedToast') })
      loadSchedule(competitionId)
    } catch (err) {
      console.error('[useRoundControl] resolve tie failed', err)
      toast({ title: t('live.tieFailed'), variant: 'destructive' })
    } finally {
      setClosing(false)
    }
  }, [activeRoundId, closeResult, setRoundClosed, toast, t, loadSchedule, competitionId])

  // Fetch dance statuses from backend
  const fetchDanceStatuses = useCallback(async () => {
    if (!activeRoundId) return
    try {
      const statuses = await liveApi.getDanceStatuses(activeRoundId)
      setDanceStatuses(statuses)
    } catch {
      // silently ignore
    }
  }, [activeRoundId, setDanceStatuses])

  // Fetch dance statuses when activeRoundId changes — clear stale statuses first
  useEffect(() => {
    setDanceStatuses([])
    fetchDanceStatuses()
  }, [fetchDanceStatuses]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close a single dance
  const handleCloseDance = useCallback(async () => {
    if (!activeRoundId || !selectedDanceName) return
    setClosingDance(true)
    try {
      await liveApi.closeDance(activeRoundId, selectedDanceName)
      await fetchDanceStatuses()
      toast({ title: t('live.dance_closed') })
    } catch (err) {
      console.error('[useRoundControl] close dance failed', err)
      toast({ title: t('live.danceCloseFailed'), variant: 'destructive' })
    } finally {
      setClosingDance(false)
    }
  }, [activeRoundId, selectedDanceName, fetchDanceStatuses, toast, t])

  // SSE handlers for results
  const onResultsPublished = useCallback(async () => {
    if (!selectedHeatId) return
    const realHeatId = heatIdMap[selectedHeatId]
    if (!realHeatId) return
    try {
      const results = await liveApi.getHeatResults(realHeatId)
      setHeatResults(results)
    } catch {
      // silently ignore
    }
  }, [selectedHeatId, heatIdMap, setHeatResults])

  const onAllSubmitted = useCallback(async (data: { heatId: string; roundId: string }) => {
    if (!data.heatId) return
    try {
      const [results, statuses] = await Promise.all([
        liveApi.getHeatResults(data.heatId),
        liveApi.getJudgeStatuses(data.heatId, selectedDanceName ?? undefined, competitionId),
      ])
      setHeatResults(results)
      for (const s of statuses) {
        updateJudgeStatus(s.judgeId, s.status)
        if (s.online !== undefined) updateJudgeOnline(s.judgeId, s.online)
      }
    } catch {
      // silently ignore
    }
  }, [competitionId, selectedDanceName, setHeatResults, updateJudgeStatus, updateJudgeOnline])

  // SSE handler for dance-closed event (admin channel)
  const onDanceClosed = useCallback((data: { danceName: string }) => {
    if (!data.danceName) return
    fetchDanceStatuses()
  }, [fetchDanceStatuses])

  return {
    sending,
    closing,
    closingDance,
    closeResult,
    setCloseResult,
    showCollisionDialog,
    setShowCollisionDialog,
    resolveRealHeatId,
    handleSend,
    handleCloseDance,
    handleCloseRound,
    handleResolveTie,
    fetchDanceStatuses,
    onResultsPublished,
    onAllSubmitted,
    onDanceClosed,
  }
}
