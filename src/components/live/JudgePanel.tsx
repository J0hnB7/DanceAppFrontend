'use client'

import { useCallback, useState } from 'react'
import { X } from 'lucide-react'
import { useLocale } from '@/contexts/locale-context'
import { JudgeCard } from './JudgeCard'
import { liveApi, type JudgeStatusDto, type JudgeMarksResponse } from '@/lib/api/live'
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
  const [judgeMarks, setJudgeMarks] = useState<JudgeMarksResponse | null>(null)
  const [loadingMarks, setLoadingMarks] = useState(false)

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
      setJudgeMarks(null)
      setLoadingMarks(true)
      try {
        const marks = await liveApi.getJudgeMarks(activeRoundId, judgeId)
        setJudgeMarks(marks)
      } catch {
        setJudgeMarks({ roundType: 'PRELIMINARY', dances: [], pairs: [], marks: {} })
      } finally {
        setLoadingMarks(false)
      }
    },
    [activeRoundId, judgeDetails]
  )

  const closeModal = useCallback(() => {
    setSelectedJudge(null)
    setJudgeMarks(null)
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

      {/* Judge marks modal */}
      {selectedJudge && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)' }}
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-lg rounded-[18px] border p-6 shadow-2xl"
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
                aria-label="Zavřít"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            {loadingMarks ? (
              <div className="flex items-center justify-center py-8">
                <div
                  className="h-6 w-6 animate-spin rounded-full border-2"
                  style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
                />
              </div>
            ) : judgeMarks && judgeMarks.dances.length > 0 && judgeMarks.pairs.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '4px 10px 8px 0', color: 'var(--text-tertiary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        #
                      </th>
                      {judgeMarks.dances.map((d) => (
                        <th key={d} style={{ padding: '4px 8px 8px', color: 'var(--text-tertiary)', fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {d.length > 5 ? d.slice(0, 4) + '.' : d}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {judgeMarks.pairs.map((pair, i) => (
                      <tr
                        key={pair.id}
                        style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.03)' }}
                      >
                        <td style={{ padding: '5px 10px 5px 0', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-sora)', whiteSpace: 'nowrap' }}>
                          {pair.startNumber}
                        </td>
                        {judgeMarks.dances.map((d) => {
                          const val = judgeMarks.marks[d]?.[pair.id]
                          const isPrelim = judgeMarks.roundType === 'PRELIMINARY'
                          return (
                            <td key={d} style={{ padding: '5px 8px', textAlign: 'center' }}>
                              {isPrelim ? (
                                val === 1 ? (
                                  <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: 15 }}>✓</span>
                                ) : (
                                  <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>—</span>
                                )
                              ) : val !== undefined ? (
                                <span style={{
                                  fontWeight: 700,
                                  fontFamily: 'var(--font-sora)',
                                  color: val === 1 ? '#FFD60A' : val <= 3 ? 'var(--accent)' : 'var(--text-secondary)',
                                }}>
                                  {val}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : judgeMarks ? (
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
