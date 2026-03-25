'use client'

import { useCallback } from 'react'
import { JudgeCard } from './JudgeCard'
import { liveApi, type JudgeStatusDto } from '@/lib/api/live'
import type { JudgeStatus } from '@/store/live-store'
import { useToast } from '@/hooks/use-toast'

interface Props {
  judgeStatuses: Record<string, JudgeStatus>
  judgeDetails: JudgeStatusDto[]
  competitionId: string
  heatId: string
}

export function JudgePanel({ judgeStatuses, judgeDetails, heatId }: Props) {
  const { toast } = useToast()

  const submittedCount = judgeDetails.filter(
    (j) => (judgeStatuses[j.judgeId] ?? j.status) === 'submitted'
  ).length
  const totalCount = judgeDetails.length

  const handlePing = useCallback(
    async (judgeId: string) => {
      try {
        await liveApi.pingJudge(judgeId)
      } catch {
        toast({ title: 'Ping se nezdařil', variant: 'destructive' })
      }
    },
    [toast]
  )

  const allDone = submittedCount === totalCount && totalCount > 0

  return (
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
          Porotci
        </span>
        {totalCount > 0 && (
          <span
            className="ml-auto text-[11px] font-semibold"
            style={{
              fontFamily: 'var(--font-sora)',
              color: allDone ? 'var(--success)' : 'var(--text-secondary)',
            }}
          >
            {submittedCount} / {totalCount} zadáno
          </span>
        )}
      </div>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}
      >
        {judgeDetails.map((judge) => {
          const status = judgeStatuses[judge.judgeId] ?? judge.status
          return (
            <JudgeCard
              key={judge.judgeId}
              judgeId={judge.judgeId}
              letter={judge.letter}
              name={judge.name}
              status={status}
              online={judge.online}
              submittedAt={judge.submittedAt}
              canPing={status === 'pending' || status === 'scoring'}
              onPing={handlePing}
            />
          )
        })}
      </div>
    </div>
  )
}
