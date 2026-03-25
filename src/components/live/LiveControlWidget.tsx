'use client'

import { useEffect } from 'react'
import { Activity } from 'lucide-react'
import { useLiveStore } from '@/store/live-store'
import type { JudgeStatusDto } from '@/lib/api/live'

interface Props {
  competitionId: string
  competitionName: string
  /** Heat details from parent query */
  judgeDetails?: JudgeStatusDto[]
  roundLabel?: string
  danceLabel?: string
  heatLabel?: string
  pairNumbers?: number[]
  onOpenFull?: () => void
}

export function LiveControlWidget({
  competitionId,
  competitionName,
  judgeDetails = [],
  roundLabel = '—',
  danceLabel = '—',
  heatLabel = '—',
  pairNumbers = [],
  onOpenFull,
}: Props) {
  const { judgeStatuses, selectedHeatId, hydrateFromServer } = useLiveStore()

  // Hydrate widget state when heat is active
  useEffect(() => {
    if (selectedHeatId) {
      hydrateFromServer(competitionId, selectedHeatId)
    }
  }, [competitionId, selectedHeatId, hydrateFromServer])

  const submittedCount = Object.values(judgeStatuses).filter((s) => s === 'submitted').length
  const totalJudges = judgeDetails.length || Object.keys(judgeStatuses).length

  return (
    <div
      className="rounded-2xl border"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full"
            style={{ background: 'rgba(10,132,255,.12)' }}
          >
            <Activity className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
          </div>
          <span
            className="text-xs font-semibold"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}
          >
            {competitionName}
          </span>
          <div
            className="flex items-center gap-1 rounded-full px-2 py-0.5"
            style={{ background: 'rgba(48,209,88,.12)' }}
          >
            <div
              className="h-1.5 w-1.5 animate-pulse rounded-full"
              style={{ background: 'var(--success)' }}
            />
            <span className="text-[10px] font-bold" style={{ color: 'var(--success)' }}>
              LIVE
            </span>
          </div>
        </div>
        {onOpenFull && (
          <button
            onClick={onOpenFull}
            className="cursor-pointer rounded border px-2 py-0.5 text-[10px] transition-colors hover:bg-[var(--surface-2)]"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            Otevřít Live řízení →
          </button>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        {/* Context */}
        <div className="mb-3 flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{roundLabel}</span>
          {danceLabel !== '—' && (
            <>
              <span style={{ color: 'var(--text-tertiary)' }}>·</span>
              <span>{danceLabel}</span>
            </>
          )}
          {heatLabel !== '—' && (
            <>
              <span style={{ color: 'var(--text-tertiary)' }}>·</span>
              <span>{heatLabel}</span>
            </>
          )}
        </div>

        {/* Pair chips */}
        {pairNumbers.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {pairNumbers.map((num) => (
              <span
                key={num}
                className="flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-bold"
                style={{
                  fontFamily: 'var(--font-sora)',
                  background: 'var(--surface-2)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                {num}
              </span>
            ))}
          </div>
        )}

        {/* Judge submission progress */}
        {totalJudges > 0 && (
          <div>
            <div
              className="mb-1 flex items-center justify-between text-[10px]"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span>Porotci odevzdali</span>
              <span
                style={{
                  fontFamily: 'var(--font-sora)',
                  fontWeight: 700,
                  color: submittedCount === totalJudges ? 'var(--success)' : 'var(--text-primary)',
                }}
              >
                {submittedCount}/{totalJudges}
              </span>
            </div>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full"
              style={{ background: 'var(--surface-2)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: totalJudges > 0 ? `${(submittedCount / totalJudges) * 100}%` : '0%',
                  background:
                    submittedCount === totalJudges
                      ? 'var(--success)'
                      : 'linear-gradient(90deg, var(--accent), #30d158)',
                }}
              />
            </div>
          </div>
        )}

        {/* Empty state */}
        {!selectedHeatId && (
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Live řízení není aktivní
          </p>
        )}
      </div>
    </div>
  )
}
