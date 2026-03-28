'use client'

import { Send, Lock, CheckCircle2, Loader2 } from 'lucide-react'
import { useLocale } from '@/contexts/locale-context'

interface Props {
  selectedHeatId: string | null
  selectedRoundId: string | null
  roundClosed: boolean
  allDancesConfirmed: boolean
  closing: boolean
  sending: boolean
  ctxLine: string
  lastSentAt: string | null
  onSend: () => void
  onCloseRound: () => void
}

export function LiveBottomBar({
  selectedHeatId,
  selectedRoundId,
  roundClosed,
  allDancesConfirmed,
  closing,
  sending,
  ctxLine,
  lastSentAt,
  onSend,
  onCloseRound,
}: Props) {
  const { t } = useLocale()

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-3.5"
      style={{
        background: 'rgba(28,28,30,0.97)',
        borderTop: '1px solid var(--border)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <div className="min-w-0 flex-1 pr-4 pl-10">
        <div
          className="truncate text-xs"
          style={{ color: 'var(--text-secondary)' }}
        >
          {ctxLine}
        </div>
        {lastSentAt && (
          <div className="mt-0.5 text-[10px]" style={{ color: 'var(--success)' }}>
            {t('live.sent')}{' '}
            {(() => {
              const d = new Date(lastSentAt)
              return isFinite(d.getTime())
                ? d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : null
            })()}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Close round button — visible when round selected, hidden when already closed */}
        {selectedRoundId && !roundClosed && (
          <button
            onClick={onCloseRound}
            disabled={!allDancesConfirmed || closing}
            title={!allDancesConfirmed ? t('live.allConfirmedRequired') : t('live.closeConfirmTitle')}
            className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: allDancesConfirmed
                ? 'linear-gradient(135deg, #30d158, #28a745)'
                : 'rgba(142,142,147,0.3)',
              boxShadow: allDancesConfirmed ? '0 4px 16px rgba(48,209,88,.3)' : 'none',
            }}
          >
            {closing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            {closing ? t('live.evaluating') : t('live.closeRound')}
          </button>
        )}

        {/* Round closed badge */}
        {selectedRoundId && roundClosed && (
          <div
            className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold"
            style={{ background: 'rgba(48,209,88,0.15)', color: '#30d158' }}
          >
            <CheckCircle2 className="h-4 w-4" />
            {t('live.roundClosed')}
          </div>
        )}

        <button
          onClick={onSend}
          disabled={!selectedHeatId || sending}
          className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-40"
          style={{
            background: 'linear-gradient(135deg, #0a84ff, #0066cc)',
            boxShadow: '0 4px 16px rgba(10,132,255,.3)',
          }}
        >
          <Send className="h-4 w-4" />
          {sending ? t('live.sending') : t('live.sendHeat')}
        </button>
      </div>
    </div>
  )
}
