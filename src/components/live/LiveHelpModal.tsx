'use client'

import { useLocale } from '@/contexts/locale-context'

interface Props {
  onClose: () => void
}

export function LiveHelpModal({ onClose }: Props) {
  const { t } = useLocale()

  return (
    <div
      className="fixed inset-0 z-[900] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {t('live.keyboardShortcuts')}
        </div>
        {[
          ['Space', t('live.shortcutSendHeat')],
          ['←  /  →', t('live.shortcutSwitchHeats')],
          ['P', t('live.shortcutPresMode')],
          ['I', t('live.shortcutIncident')],
          ['ESC', t('live.shortcutEscape')],
          ['?', t('live.shortcutHelp')],
        ].map(([key, desc]) => (
          <div
            key={key}
            className="flex items-center justify-between border-b py-2 last:border-0"
            style={{ borderColor: 'var(--border)' }}
          >
            <kbd
              className="rounded border px-2 py-0.5 text-xs font-mono"
              style={{
                background: 'var(--surface-2)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              {key}
            </kbd>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {desc}
            </span>
          </div>
        ))}
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
