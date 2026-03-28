import { useCallback, useState } from 'react'
import { useLiveStore } from '@/store/live-store'
import { liveApi } from '@/lib/api/live'
import { roundsApi, type PreliminaryResultResponse } from '@/lib/api/rounds'
import { useToast } from '@/hooks/use-toast'
import { useLocale } from '@/contexts/locale-context'
import apiClient from '@/lib/api-client'

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
  const { updateJudgeStatus, updateJudgeOnline, setHeatResults, setLastSentAt, setRoundClosed } = useLiveStore()

  const [sending, setSending] = useState(false)
  const [closing, setClosing] = useState(false)
  const [closeResult, setCloseResult] = useState<PreliminaryResultResponse | null>(null)
  const [showCollisionDialog, setShowCollisionDialog] = useState(false)

  // Resolve real heatId: heatIdMap first, then find RUNNING heat as fallback
  const resolveRealHeatId = useCallback(async (): Promise<string | null> => {
    const fromMap = selectedHeatId ? heatIdMap[selectedHeatId] : undefined
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
    } catch {
      toast({ title: t('live.heatSendFailed'), variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }, [selectedHeatId, heatIdMap, activeRoundId, selectedDanceName, competitionId, setLastSentAt, toast, t, updateJudgeStatus, updateJudgeOnline])

  const handleCloseRound = useCallback(async () => {
    if (!activeRoundId || !sectionId) return
    setClosing(true)
    try {
      await roundsApi.close(activeRoundId)
      const result = await roundsApi.calculateResults(activeRoundId) as PreliminaryResultResponse
      setCloseResult(result)
      if (result.tieAtBoundary && result.tiedPairsAtBoundary?.length > 0) {
        setShowCollisionDialog(true)
      } else {
        setRoundClosed(true)
        toast({ title: t('live.roundClosedToast') })
      }
    } catch (err) {
      console.error('[useRoundControl] close round failed', err)
      toast({ title: t('live.roundCloseFailed'), variant: 'destructive' })
    } finally {
      setClosing(false)
    }
  }, [activeRoundId, sectionId, setRoundClosed, toast, t])

  const handleResolveTie = useCallback(async (choice: 'more' | 'less') => {
    if (!activeRoundId) return
    setClosing(true)
    try {
      const result = await roundsApi.resolveTie(activeRoundId, choice) as PreliminaryResultResponse
      setCloseResult(result)
      setShowCollisionDialog(false)
      setRoundClosed(true)
      toast({ title: t('live.roundClosedToast') })
    } catch (err) {
      console.error('[useRoundControl] resolve tie failed', err)
      toast({ title: t('live.tieFailed'), variant: 'destructive' })
    } finally {
      setClosing(false)
    }
  }, [activeRoundId, setRoundClosed, toast, t])

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
  }, [competitionId, setHeatResults, updateJudgeStatus, updateJudgeOnline])

  return {
    sending,
    closing,
    closeResult,
    setCloseResult,
    showCollisionDialog,
    setShowCollisionDialog,
    resolveRealHeatId,
    handleSend,
    handleCloseRound,
    handleResolveTie,
    onResultsPublished,
    onAllSubmitted,
  }
}
