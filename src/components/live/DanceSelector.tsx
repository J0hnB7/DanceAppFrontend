'use client'

export interface DanceItem {
  id: string
  name: string
}

interface Props {
  dances: DanceItem[]
  selectedId: string | null
  onSelect: (id: string) => void
  roundLabel?: string
}

export function DanceSelector({ dances, selectedId, onSelect, roundLabel }: Props) {
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
          Vybrat tanec
        </span>
        {roundLabel && (
          <span className="ml-auto text-xs" style={{ color: 'var(--text-secondary)' }}>
            {roundLabel}
          </span>
        )}
      </div>

      <div className="flex gap-2.5 scrollbar-none" style={{ padding: '6px 6px 14px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {dances.map((dance, i) => {
          const active = selectedId === dance.id
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
                  : 'var(--surface)',
                borderColor: active ? 'rgba(10,132,255,.45)' : 'var(--border)',
                boxShadow: active
                  ? '0 0 0 1px rgba(10,132,255,.22), 0 4px 16px rgba(10,132,255,.15)'
                  : undefined,
              }}
            >
              <div
                className="text-[13px] font-bold"
                style={{
                  fontFamily: 'var(--font-sora)',
                  color: active ? 'var(--accent)' : 'var(--text-primary)',
                }}
              >
                {dance.name}
              </div>
            </button>
          )
        })}
        {dances.length === 0 && (
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Vyberte kolo
          </p>
        )}
      </div>
    </div>
  )
}
