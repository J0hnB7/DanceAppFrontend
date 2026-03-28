'use client'

import { AlertTriangle, Loader2 } from 'lucide-react'
import { useLocale } from '@/contexts/locale-context'
import type { PreliminaryResultResponse } from '@/lib/api/rounds'

interface Props {
  closeResult: PreliminaryResultResponse
  closing: boolean
  onResolveTie: (choice: 'more' | 'less') => void
}

export function TieResolutionDialog({ closeResult, closing, onResolveTie }: Props) {
  const { t } = useLocale()

  return (
    <div
      className="fixed inset-0 z-[900] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,.72)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="mb-1 flex items-center gap-2 text-base font-semibold" style={{ color: '#ff9f0a' }}>
          <AlertTriangle className="h-5 w-5" />
          {t('live.tieTitle')}
        </div>
        <p className="mb-4 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {t('live.tieDesc')}
        </p>

        {/* Show tied pairs */}
        {closeResult.tiedPairsAtBoundary.length > 0 && (
          <div
            className="mb-4 rounded-lg p-3 text-sm"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
          >
            <div className="mb-1 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
              {t('live.tiePairsAtBoundary')}
            </div>
            <div style={{ color: 'var(--text-primary)' }}>
              {closeResult.pairs
                .filter((p) => closeResult.tiedPairsAtBoundary.includes(p.pairId))
                .map((p) => `#${p.startNumber}`)
                .join(', ')}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={() => onResolveTie('less')}
            disabled={closing}
            className="rounded-lg px-4 py-2 text-sm"
            style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
          >
            {t('live.tieLess')}
          </button>
          <button
            onClick={() => onResolveTie('more')}
            disabled={closing}
            className="flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #30d158, #28a745)' }}
          >
            {closing && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('live.tieMore')}
          </button>
        </div>
      </div>
    </div>
  )
}
