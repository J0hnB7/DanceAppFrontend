'use client'

import { useLocale } from '@/contexts/locale-context'
import type { PreliminaryResultResponse } from '@/lib/api/rounds'

interface Props {
  closeResult: PreliminaryResultResponse
  onClose: () => void
}

export function RoundResultsOverlay({ closeResult, onClose }: Props) {
  const { t } = useLocale()

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
            .map((pair) => (
              <div
                key={pair.pairId}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm"
                style={{
                  background: pair.advances ? 'rgba(48,209,88,0.08)' : 'rgba(255,69,58,0.06)',
                  border: `1px solid ${pair.advances ? 'rgba(48,209,88,0.2)' : 'rgba(255,69,58,0.15)'}`,
                }}
              >
                <div className="flex items-center gap-3">
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
          className="mt-4 w-full rounded-lg py-2 text-xs"
          style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
        >
          {t('common.close')}
        </button>
      </div>
    </div>
  )
}
