'use client'

import { Lock } from 'lucide-react'
import { useLocale } from '@/contexts/locale-context'
import type { DanceStatusEntry } from '@/store/live-store'

export interface DanceItem {
  id: string
  name: string
}

interface Props {
  dances: DanceItem[]
  selectedId: string | null
  onSelect: (id: string) => void
  roundLabel?: string
  confirmations?: Record<string, { submitted: number; total: number }>
  danceStatuses?: DanceStatusEntry[]
}

export function DanceSelector({ dances, selectedId, onSelect, roundLabel, confirmations, danceStatuses }: Props) {
  const { t } = useLocale()
  return (
    <div>
      <div className="mb-3.5 flex items-center gap-2.5">
        <div
          className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] text-[11px] font-bold"
          style={{ fontFamily: 'var(--font-sora)', background: 'rgba(10,132,255,.14)', border: '1px solid rgba(10,132,255,.25)', color: 'var(--accent)' }}
        >
          2
        </div>
        <span
          className="text-[12px] font-bold uppercase tracking-[.8px]"
          style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-sora)' }}
        >
          {t('live.selectDance')}
        </span>
        {roundLabel && (
          <span className="ml-auto text-xs" style={{ color: 'var(--text-secondary)' }}>
            {roundLabel}
          </span>
        )}
      </div>

      <div className="flex gap-2.5 scrollbar-none" style={{ padding: '6px 6px 14px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {dances.map((dance) => {
          const active = selectedId === dance.id
          const conf = confirmations?.[dance.id]
          const done = conf && conf.total > 0 && conf.submitted >= conf.total
          const danceStatus = danceStatuses?.find((ds) => ds.danceName === dance.name)
          const isClosed = danceStatus?.status === 'CLOSED'
          const isSent = danceStatus?.status === 'SENT'
          return (
            <button
              key={dance.id}
              onClick={() => onSelect(dance.id)}
              className="cursor-pointer rounded-[13px] border px-3.5 py-3 text-left transition-all duration-200 shrink-0"
              style={{
                width: 150,
                height: 80,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                background: active
                  ? 'linear-gradient(135deg, rgba(10,132,255,.18) 0%, rgba(10,132,255,.07) 100%)'
                  : isClosed
                    ? 'rgba(48,209,88,.07)'
                    : done
                      ? 'rgba(48,209,88,.07)'
                      : isSent
                        ? 'rgba(255,159,10,.07)'
                        : 'var(--surface)',
                borderColor: active
                  ? 'rgba(10,132,255,.45)'
                  : isClosed
                    ? 'rgba(48,209,88,.45)'
                    : done
                      ? 'rgba(48,209,88,.35)'
                      : isSent
                        ? 'rgba(255,159,10,.45)'
                        : 'var(--border)',
                boxShadow: active
                  ? '0 0 0 1px rgba(10,132,255,.22), 0 4px 16px rgba(10,132,255,.15)'
                  : undefined,
              }}
            >
              <div className="flex items-center gap-1.5">
                <div
                  className="text-[13px] font-bold"
                  style={{
                    fontFamily: 'var(--font-sora)',
                    color: active ? 'var(--accent)' : isClosed ? '#30d158' : done ? '#30d158' : isSent ? '#ff9f0a' : 'var(--text-primary)',
                  }}
                >
                  {dance.name}
                </div>
                {isClosed && <Lock className="h-3 w-3" style={{ color: '#30d158' }} aria-hidden="true" />}
              </div>
              {isClosed ? (
                <div className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: '#30d158' }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M2 6l3 3 5-5" stroke="#30d158" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {t('live.dance_closed')}
                </div>
              ) : done ? (
                <div className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: '#30d158' }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M2 6l3 3 5-5" stroke="#30d158" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {t('live.heatDone')}
                </div>
              ) : null}
            </button>
          )
        })}
        {dances.length === 0 && (
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            {t('live.selectRoundFirst')}
          </p>
        )}
      </div>
    </div>
  )
}
