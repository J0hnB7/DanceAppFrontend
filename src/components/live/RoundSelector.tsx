'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface RoundItem {
  id: string
  label: string
  status: 'upcoming' | 'active' | 'done'
}

interface Props {
  rounds: RoundItem[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function RoundSelector({ rounds, selectedId, onSelect }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateArrows = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    updateArrows()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', updateArrows, { passive: true })
    const ro = new ResizeObserver(updateArrows)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', updateArrows)
      ro.disconnect()
    }
  }, [updateArrows, rounds])

  const scroll = (dir: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: dir * 260, behavior: 'smooth' })
  }

  const onWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return
    e.preventDefault()
    scrollRef.current?.scrollBy({ left: e.deltaY * 1.2, behavior: 'auto' })
  }

  return (
    <div>
      <div className="mb-3.5 flex items-center gap-2.5">
        <div
          className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] text-[11px] font-bold"
          style={{ fontFamily: 'var(--font-sora)', background: 'rgba(10,132,255,.14)', border: '1px solid rgba(10,132,255,.25)', color: 'var(--accent)' }}
        >
          1
        </div>
        <span
          className="text-[12px] font-bold uppercase tracking-[.8px]"
          style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-sora)' }}
        >
          Vybrat kolo
        </span>
      </div>

      <div className="relative">
        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll(-1)}
            className="absolute left-0 top-1/2 z-10 -translate-y-1/2 cursor-pointer rounded-xl border p-2.5 shadow-lg transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
              color: 'var(--text-secondary)',
              boxShadow: '0 2px 12px rgba(0,0,0,.18)',
            }}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll(1)}
            className="absolute right-0 top-1/2 z-10 -translate-y-1/2 cursor-pointer rounded-xl border p-2.5 shadow-lg transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
              color: 'var(--text-secondary)',
              boxShadow: '0 2px 12px rgba(0,0,0,.18)',
            }}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        <div
          ref={scrollRef}
          onWheel={onWheel}
          className="flex items-center scrollbar-none"
          style={{ padding: '6px 6px 14px', overflowX: 'auto', scrollbarWidth: 'none', gap: 0 }}
        >
          {(() => {
            // Group rounds by category prefix (everything before " — ")
            const groups: RoundItem[][] = []
            rounds.forEach((round) => {
              const cat = round.label.split(/\s*[—–]\s*/)[0].trim()
              const last = groups[groups.length - 1]
              if (last && last[0].label.split(/\s*[—–]\s*/)[0].trim() === cat) {
                last.push(round)
              } else {
                groups.push([round])
              }
            })

            return groups.map((group, gi) => (
              <div key={gi} className="flex items-center shrink-0">
                {/* Separator between categories */}
                {gi > 0 && (
                  <div
                    className="mx-3 shrink-0"
                    style={{ width: 2, height: 48, background: 'rgba(10,132,255,.55)', borderRadius: 2, boxShadow: '0 0 8px rgba(10,132,255,.4)' }}
                  />
                )}
                {/* Cards within the group */}
                <div className="flex gap-2.5">
                  {group.map((round) => {
                    const active = selectedId === round.id
                    return (
                      <button
                        key={round.id}
                        onClick={() => onSelect(round.id)}
                        className="cursor-pointer rounded-[13px] border px-3.5 py-3 text-left transition-all duration-200 shrink-0"
                        style={{
                          width: 190,
                          height: 80,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          background: active
                            ? 'linear-gradient(135deg, rgba(10,132,255,.2) 0%, rgba(10,132,255,.08) 100%)'
                            : 'var(--surface)',
                          borderColor: active ? 'rgba(10,132,255,.5)' : 'var(--border)',
                          boxShadow: active
                            ? '0 0 0 1px rgba(10,132,255,.25), 0 6px 24px rgba(10,132,255,.18)'
                            : undefined,
                        }}
                      >
                        <div
                          className="text-sm font-bold leading-tight"
                          style={{
                            fontFamily: 'var(--font-sora)',
                            color: active ? 'var(--accent)' : 'var(--text-primary)',
                          }}
                        >
                          {round.label}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }} />
                          <span
                            className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[.4px]"
                            style={{
                              background: round.status === 'active'
                                ? 'rgba(48,209,88,.12)'
                                : round.status === 'done'
                                ? 'rgba(48,209,88,.06)'
                                : 'rgba(142,142,147,.1)',
                              color: round.status === 'active'
                                ? 'var(--success)'
                                : 'var(--text-tertiary)',
                              border: `1px solid ${
                                round.status === 'active'
                                  ? 'rgba(48,209,88,.25)'
                                  : round.status === 'done'
                                  ? 'rgba(48,209,88,.12)'
                                  : 'rgba(142,142,147,.15)'
                              }`,
                              fontFamily: 'var(--font-sora)',
                            }}
                          >
                            {round.status === 'active' ? 'Probíhá' : round.status === 'done' ? 'Hotovo' : 'Čeká'}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          })()}
          {rounds.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Žádná kola
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
