'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useLocale } from '@/contexts/locale-context'
import { scoringApi } from '@/lib/api/scoring'
import type { PreliminaryResultResponse } from '@/lib/api/rounds'

interface Props {
  closeResult: PreliminaryResultResponse
  competitionId: string
  sectionId: string | null
  onClose: () => void
}

export function RoundResultsOverlay({ closeResult, competitionId, sectionId, onClose }: Props) {
  const { t } = useLocale()
  const router = useRouter()

  const isFinal = closeResult.pairsToAdvance === 0

  const { data: finalSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['section-final-summary', sectionId],
    queryFn: () => scoringApi.getSectionSummary(sectionId!),
    enabled: isFinal && !!sectionId,
    staleTime: 30_000,
  })

  if (isFinal) {
    const rankings = finalSummary?.rankings ?? []

    return (
      <div
        className="fixed inset-0 z-[800] flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)' }}
      >
        <div
          className="w-full max-w-sm rounded-2xl p-6"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', maxHeight: '80vh', overflowY: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 text-center">
            <div className="mb-2 text-2xl">🏆</div>
            <div className="mb-1 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              Finále uzavřeno
            </div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Výsledky sekce
            </div>
          </div>

          {summaryLoading && (
            <div className="py-4 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Načítám výsledky…
            </div>
          )}

          {rankings.length > 0 && (
            <div className="mb-4 space-y-2">
              {rankings.map((row) => (
                <div
                  key={row.pairId}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm"
                  style={{
                    background: row.finalPlacement <= 3 ? 'rgba(255,214,0,0.08)' : 'var(--surface-2)',
                    border: `1px solid ${row.finalPlacement <= 3 ? 'rgba(255,214,0,0.25)' : 'var(--border)'}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-right text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                      {row.finalPlacement}.
                    </span>
                    <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                      #{row.startNumber}
                    </span>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {row.totalSum} b.
                  </span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => router.push(`/dashboard/competitions/${competitionId}/results`)}
            className="w-full rounded-xl py-3 text-sm font-semibold text-white cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #0a84ff, #0066cc)' }}
          >
            Přejít na Výsledky
          </button>
          <button
            onClick={onClose}
            className="mt-2 w-full rounded-lg py-2 text-xs cursor-pointer"
            style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-[800] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl p-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          {t('live.roundResultsTitle', { n: closeResult.pairsToAdvance })}
        </div>
        <div className="space-y-2">
          {(closeResult.pairs ?? [])
            .sort((a, b) => b.voteCount - a.voteCount)
            .map((pair, idx) => (
              <div
                key={pair.pairId}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm"
                style={{
                  background: pair.advances ? 'rgba(48,209,88,0.08)' : 'rgba(255,69,58,0.06)',
                  border: `1px solid ${pair.advances ? 'rgba(48,209,88,0.2)' : 'rgba(255,69,58,0.15)'}`,
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-right text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                    {idx + 1}.
                  </span>
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
                    {pair.advances ? t('live.advances') : t('live.eliminated')}
                  </span>
                </div>
              </div>
            ))}
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full rounded-lg py-2 text-xs cursor-pointer"
          style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
        >
          {t('common.close')}
        </button>
      </div>
    </div>
  )
}
