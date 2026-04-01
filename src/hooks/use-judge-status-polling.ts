import { useCallback, useEffect } from 'react'
import { liveApi } from '@/lib/api/live'
import { useLiveStore } from '@/store/live-store'

interface Options {
  activeRoundId: string | null
  selectedDanceId: string | null
  selectedDanceName: string | null
  competitionId: string
  resolveRealHeatId: () => Promise<string | null>
}

/**
 * Polls judge statuses every 8 seconds when an active round is present.
 * SSE events are the primary update path — this is the fallback.
 * Never downgrades a judge that is already 'submitted'.
 */
export function useJudgeStatusPolling({
  activeRoundId,
  selectedDanceId,
  selectedDanceName,
  competitionId,
  resolveRealHeatId,
}: Options) {
  const { updateJudgeStatus, updateJudgeOnline, setDanceConfirmation } = useLiveStore()

  const poll = useCallback(async () => {
    const realHeatId = await resolveRealHeatId()
    if (!realHeatId) return
    liveApi
      .getJudgeStatuses(realHeatId, selectedDanceName ?? undefined, competitionId)
      .then((statuses) => {
        const current = useLiveStore.getState().judgeStatuses
        for (const s of statuses) {
          if (current[s.judgeId] !== 'submitted' || s.status === 'submitted') {
            updateJudgeStatus(s.judgeId, s.status)
          }
          if (s.online !== undefined) {
            updateJudgeOnline(s.judgeId, s.online)
          }
        }
        // Keep danceConfirmations in sync with polling data
        if (selectedDanceId) {
          setDanceConfirmation(selectedDanceId, statuses.filter((j) => j.status === 'submitted').length, statuses.length)
        }
      })
      .catch(() => {})
  }, [resolveRealHeatId, selectedDanceId, selectedDanceName, competitionId, updateJudgeStatus, updateJudgeOnline, setDanceConfirmation])

  useEffect(() => {
    if (!activeRoundId) return
    poll()
    const id = setInterval(poll, 8_000)
    return () => clearInterval(id)
  }, [activeRoundId, poll])
}
