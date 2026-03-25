'use client'

export interface HeatItem {
  id: string
  number: number
  pairNumbers: number[]
  status: 'pending' | 'active' | 'done' | 'skipped'
}

interface Props {
  heats: HeatItem[]
  selectedId: string | null
  activePairIds: string[]
  onSelect: (id: string) => void
  onSkip: (id: string) => void
  onReorder: () => void
  danceLabel?: string
}

export function HeatSelector({ heats, selectedId, onSelect, danceLabel }: Props) {
  const selectedHeat = heats.find((h) => h.id === selectedId)

  return (
    <div>
      <div className="mb-3.5 flex items-center gap-2.5">
        <div
          className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] text-[11px] font-bold"
          style={{ fontFamily: 'var(--font-sora)', background: 'rgba(10,132,255,.14)', border: '1px solid rgba(10,132,255,.25)', color: 'var(--accent)' }}
        >
          3
        </div>
        <span
          className="text-[12px] font-bold uppercase tracking-[.8px]"
          style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-sora)' }}
        >
          Skupina na parketu
        </span>
        {danceLabel && (
          <span className="ml-auto text-xs" style={{ color: 'var(--text-secondary)' }}>
            {danceLabel}
          </span>
        )}
      </div>

      <div className="flex gap-2.5 scrollbar-none" style={{ padding: '6px 6px 14px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {heats.map((heat) => {
          const active = selectedId === heat.id
          const skipped = heat.status === 'skipped'
          return (
            <button
              key={heat.id}
              onClick={() => !skipped && onSelect(heat.id)}
              disabled={skipped}
              className="cursor-pointer rounded-[13px] border px-3.5 py-3 text-left transition-all duration-200 shrink-0"
              style={{
                width: 150,
                height: 80,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                opacity: skipped ? 0.4 : 1,
                background: active
                  ? 'linear-gradient(135deg, rgba(10,132,255,.18) 0%, rgba(10,132,255,.07) 100%)'
                  : 'var(--surface)',
                borderColor: active ? 'rgba(10,132,255,.45)' : 'var(--border)',
                boxShadow: active
                  ? '0 0 0 1px rgba(10,132,255,.22), 0 4px 16px rgba(10,132,255,.15)'
                  : undefined,
              }}
            >
              <span
                className="text-[13px] font-bold"
                style={{
                  fontFamily: 'var(--font-sora)',
                  color: active ? 'var(--accent)' : 'var(--text-primary)',
                }}
              >
                Skupina {heat.number}
              </span>
              {active && (
                <span
                  className="rounded-[7px] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[.4px]"
                  style={{
                    background: 'rgba(10,132,255,.2)',
                    color: 'var(--accent)',
                    fontFamily: 'var(--font-sora)',
                  }}
                >
                  NA PARKETU
                </span>
              )}
            </button>
          )
        })}
        {heats.length === 0 && (
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Vyberte tanec
          </p>
        )}
      </div>

      {/* Pair chips */}
      {selectedHeat && selectedHeat.pairNumbers.length > 0 && (
        <div className="mt-3.5">
          <div
            className="mb-2.5 text-[10px] font-bold uppercase tracking-[.8px]"
            style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-sora)' }}
          >
            Páry na parketu
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedHeat.pairNumbers.map((num) => (
              <span
                key={num}
                className="rounded-[7px] px-2.5 py-1 text-[11px] font-bold"
                style={{
                  fontFamily: 'var(--font-sora)',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                }}
              >
                {num}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
