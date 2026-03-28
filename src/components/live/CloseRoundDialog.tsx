'use client'

import { Loader2 } from 'lucide-react'
import { useLocale } from '@/contexts/locale-context'

interface Props {
  closing: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function CloseRoundDialog({ closing, onCancel, onConfirm }: Props) {
  const { t } = useLocale()

  return (
    <div
      className="fixed inset-0 z-[900] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,.72)', backdropFilter: 'blur(6px)' }}
      onClick={() => !closing && onCancel()}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          {t('live.closeConfirmTitle')}
        </div>
        <p className="mb-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {t('live.closeConfirmDesc')}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={closing}
            className="rounded-lg px-4 py-2 text-sm"
            style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={closing}
            className="flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #30d158, #28a745)' }}
          >
            {closing && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('live.closeAndEvaluate')}
          </button>
        </div>
      </div>
    </div>
  )
}
