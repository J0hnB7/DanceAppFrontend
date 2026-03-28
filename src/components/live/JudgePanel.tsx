'use client'

import { useCallback, useState } from 'react'
import { X } from 'lucide-react'
import { useLocale } from '@/contexts/locale-context'
import { JudgeCard } from './JudgeCard'
import apiClient from '@/lib/api-client'
import { liveApi, type JudgeStatusDto } from '@/lib/api/live'
import { useLiveStore } from '@/store/live-store'
import type { HeatResult, JudgeStatus } from '@/store/live-store'
import { useToast } from '@/hooks/use-toast'

interface Props {
  judgeStatuses: Record<string, JudgeStatus>
  judgeDetails: JudgeStatusDto[]
  competitionId: string
  heatId: string
  activeRoundId: string | null
  heatResults: HeatResult[] | null
}

export function JudgePanel({ judgeStatuses, judgeDetails, competitionId, heatId, activeRoundId, heatResults }: Props) {
  const { t } = useLocale()
  const { toast } = useToast()
  const isHydrating = useLiveStore((s) => s.isHydrating)
  const judgeOnline = useLiveStore((s) => s.judgeOnline)
  const [selectedJudge, setSelectedJudge] = useState<JudgeStatusDto | null>(null)
  const [callbackPairIds, setCallbackPairIds] = useState<string[] | null>(null)
  const [pairStartNumbers, setPairStartNumbers] = useState<Record<string, number>>({})
  const [loadingCallbacks, setLoadingCallbacks] = useState(false)

  const submittedCount = judgeDetails.filter(
    (j) => (judgeStatuses[j.judgeId] ?? j.status) === 'submitted'
  ).length
  const totalCount = judgeDetails.length

  const handlePing = useCallback(
    async (judgeId: string) => {
      try {
        await liveApi.pingJudge(judgeId)
      } catch {
        toast({ title: t('live.pingFailed'), variant: 'destructive' })
      }
    },
    [toast]
  )

  const handleJudgeClick = useCallback(
    async (judgeId: string) => {
      if (!activeRoundId) return
      const judge = judgeDetails.find((j) => j.judgeId === judgeId)
      if (!judge) return
      setSelectedJudge(judge)
      setCallbackPairIds(null)
      setPairStartNumbers({})
      setLoadingCallbacks(true)
      try {
        const [ids, pairsRes] = await Promise.all([
          liveApi.getJudgeCallbacks(activeRoundId, judgeId),
          apiClient
            .get<{ content: Array<{ id: string; startNumber: number }> } | Array<{ id: string; startNumber: number }>>(
              `/competitions/${competitionId}/pairs`,
              { params: { size: 500 } }
            )
            .then((r) => (Array.isArray(r.data) ? r.data : r.data.content))
            .catch(() => [] as Array<{ id: string; startNumber: number }>),
        ])
        setCallbackPairIds(ids)
        const numMap: Record<string, number> = {}
        for (const p of pairsRes) numMap[p.id] = p.startNumber
        // also seed from heatResults in case pairs list misses some
        for (const r of heatResults ?? []) {
          if (!(r.pairId in numMap)) numMap[r.pairId] = r.pairNumber
        }
        setPairStartNumbers(numMap)
      } catch {
        setCallbackPairIds([])
      } finally {
        setLoadingCallbacks(false)
      }
    },
    [activeRoundId, heatId, judgeDetails, competitionId, heatResults]
  )

  const closeModal = useCallback(() => {
    setSelectedJudge(null)
    setCallbackPairIds(null)
  }, [])

  const allDone = submittedCount === totalCount && totalCount > 0

  return (
    <>
      <div>
        <div className="mb-3.5 flex items-center gap-2.5">
          <div
            className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] text-[11px] font-bold"
            style={{ fontFamily: 'var(--font-sora)', background: 'rgba(10,132,255,.14)', border: '1px solid rgba(10,132,255,.25)', color: 'var(--accent)' }}
          >
            4
          </div>
          <span
            className="text-[12px] font-bold uppercase tracking-[.8px]"
            style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-sora)' }}
          >
            {t('live.judgesSection')}
          </span>
          {totalCount > 0 && (
            <span
              className="ml-auto text-[11px] font-semibold"
              style={{
                fontFamily: 'var(--font-sora)',
                color: isHydrating ? 'var(--text-tertiary)' : allDone ? 'var(--success)' : 'var(--text-secondary)',
              }}
            >
              {isHydrating ? t('live.loading') : t('live.confirmed', { n: submittedCount, total: totalCount })}
            </span>
          )}
        </div>

        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}
        >
          {judgeDetails.map((judge) => {
            const status = judgeStatuses[judge.judgeId] ?? judge.status
            const online = judgeOnline[judge.judgeId] ?? judge.online
            return (
              <JudgeCard
                key={judge.judgeId}
                judgeId={judge.judgeId}
                letter={judge.letter}
                name={judge.name}
                status={status}
                online={online}
                submittedAt={judge.submittedAt}
                canPing={status === 'pending' || status === 'scoring'}
                onPing={handlePing}
                onClick={activeRoundId ? handleJudgeClick : undefined}
              />
            )
          })}
        </div>
      </div>

      {/* Judge callbacks modal */}
      {selectedJudge && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)' }}
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-sm rounded-[18px] border p-6 shadow-2xl"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-5 flex items-start gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-[22px] font-extrabold"
                style={{
                  fontFamily: 'var(--font-sora)',
                  background: 'rgba(10,132,255,.12)',
                  border: '1px solid rgba(10,132,255,.2)',
                  color: 'var(--accent)',
                }}
              >
                {selectedJudge.letter}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {selectedJudge.name}
                </p>
                <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                  {t('live.judgeCallbacksTitle')}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="shrink-0 rounded-[8px] p-1 transition-colors hover:bg-[rgba(255,255,255,.07)]"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            {loadingCallbacks ? (
              <div className="flex items-center justify-center py-8">
                <div
                  className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
                  style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
                />
              </div>
            ) : callbackPairIds && callbackPairIds.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {callbackPairIds.map((pairId) => {
                  const num = pairStartNumbers[pairId]
                  return (
                    <div
                      key={pairId}
                      className="flex h-9 min-w-[42px] items-center justify-center rounded-[10px] border px-3 text-[14px] font-bold"
                      style={{
                        fontFamily: 'var(--font-sora)',
                        background: 'rgba(48,209,88,.08)',
                        borderColor: 'rgba(48,209,88,.22)',
                        color: 'var(--success)',
                      }}
                    >
                      {num !== undefined ? num : pairId.slice(0, 6)}
                    </div>
                  )
                })}
              </div>
            ) : callbackPairIds && callbackPairIds.length === 0 ? (
              <p className="text-center text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                {t('live.noCallbacks')}
              </p>
            ) : null}
          </div>
        </div>
      )}
    </>
  )
}
