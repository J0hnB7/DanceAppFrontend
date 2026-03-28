import { useCallback, useEffect, useState } from 'react'
import { judgeTokensApi } from '@/lib/api/judge-tokens'
import { liveApi, type JudgeStatusDto } from '@/lib/api/live'
import { useSSE } from '@/hooks/use-sse'
import { useLiveStore } from '@/store/live-store'
import apiClient from '@/lib/api-client'

/**
 * Loads judge list and manages online/offline state.
 * SSE = primary (instant events), 30s poll = fallback heartbeat refresh.
 */
export function useJudgeConnectivity(competitionId: string) {
  const { updateJudgeOnline } = useLiveStore()
  const [baseJudges, setBaseJudges] = useState<JudgeStatusDto[]>([])
  const [judgeDetails, setJudgeDetails] = useState<JudgeStatusDto[]>([])

  // Load judges on mount and immediately fetch connectivity
  useEffect(() => {
    judgeTokensApi.list(competitionId)
      .then((tokens) => {
        const mapped: JudgeStatusDto[] = tokens
          .filter((t) => t.active !== false)
          .sort((a, b) => (a.judgeNumber ?? 99) - (b.judgeNumber ?? 99))
          .map((t, i) => ({
            judgeId: t.id,
            letter: String.fromCharCode(65 + i),
            name: t.name ?? `Porotce ${i + 1}`,
            status: 'pending' as const,
            online: false,
          }))
        setBaseJudges(mapped)
        setJudgeDetails(mapped)

        // Immediately fetch real connectivity status
        apiClient.get<{ judges: Array<{ judgeTokenId: string; status: string }> }>(
          `/competitions/${competitionId}/connectivity`
        ).then((res) => {
          const connectivity = res.data.judges ?? []
          setBaseJudges((prev) =>
            prev.map((j) => {
              const conn = connectivity.find((c) => c.judgeTokenId === j.judgeId)
              return conn ? { ...j, online: conn.status === 'ONLINE' } : j
            })
          )
          connectivity.forEach((c) => updateJudgeOnline(c.judgeTokenId, c.status === 'ONLINE'))
        }).catch(() => {})
      })
      .catch(() => {})
  }, [competitionId]) // eslint-disable-line react-hooks/exhaustive-deps

  // SSE — judge connected
  useSSE(competitionId, 'judge-connected', (data: { judgeTokenId: string }) => {
    if (!data.judgeTokenId) return
    setBaseJudges((prev) => prev.map((j) => j.judgeId === data.judgeTokenId ? { ...j, online: true } : j))
    updateJudgeOnline(data.judgeTokenId, true)
  })

  // SSE — judge disconnected
  useSSE(competitionId, 'judge-disconnected', (data: { judgeTokenId: string }) => {
    if (!data.judgeTokenId) return
    setBaseJudges((prev) => prev.map((j) => j.judgeId === data.judgeTokenId ? { ...j, online: false } : j))
    updateJudgeOnline(data.judgeTokenId, false)
  })

  // 30s connectivity poll — heartbeat fallback when SSE misses disconnect
  useEffect(() => {
    const refresh = () =>
      apiClient.get<{ judges: Array<{ judgeTokenId: string; status: string }> }>(
        `/competitions/${competitionId}/connectivity`
      ).then((res) => {
        const onlineMap = new Map(res.data.judges?.map((c) => [c.judgeTokenId, c.status === 'ONLINE']))
        setBaseJudges((prev) =>
          prev.map((j) => {
            const isOnline = onlineMap.get(j.judgeId)
            return isOnline !== undefined ? { ...j, online: isOnline } : j
          })
        )
        res.data.judges?.forEach((c) => updateJudgeOnline(c.judgeTokenId, c.status === 'ONLINE'))
      }).catch(() => {})
    const id = setInterval(refresh, 30_000)
    return () => clearInterval(id)
  }, [competitionId, updateJudgeOnline])

  const updateJudgeDetails = useCallback((
    selectedHeatId: string | null,
    selectedDanceId: string | null,
    heatIdMap: Record<string, string>,
    dances: Array<{ id: string; name: string }>,
    competitionIdArg: string,
  ) => {
    if (!selectedHeatId || baseJudges.length === 0) { setJudgeDetails(baseJudges); return }
    const realHeatId = heatIdMap[selectedHeatId]
    if (!realHeatId) { setJudgeDetails(baseJudges); return }
    const danceName = dances.find((d) => d.id === selectedDanceId)?.name
    liveApi.getJudgeStatuses(realHeatId, danceName, competitionIdArg)
      .then((heatStatuses) => {
        setJudgeDetails(
          baseJudges.map((judge) => {
            const hs = heatStatuses.find((s) => s.judgeId === judge.judgeId)
            return hs ? { ...judge, status: hs.status, online: hs.online, submittedAt: hs.submittedAt } : judge
          })
        )
      })
      .catch(() => setJudgeDetails(baseJudges))
  }, [baseJudges])

  return { judgeDetails, baseJudges, updateJudgeDetails }
}
