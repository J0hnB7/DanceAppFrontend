'use client'

import { useEffect } from 'react'
import { useLiveStore } from '@/store/live-store'

interface Props {
  competitionName: string
  roundLabel: string
  danceLabel: string
  heatLabel: string
  pairNumbers: number[]
}

export function PresentationOverlay({
  competitionName,
  roundLabel,
  danceLabel,
  heatLabel,
  pairNumbers,
}: Props) {
  const { presMode, togglePresMode } = useLiveStore()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && presMode) togglePresMode()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [presMode, togglePresMode])

  if (!presMode) return null

  return (
    <div
      className="fixed inset-0 z-[1000] flex flex-col items-center justify-center"
      style={{ background: '#000' }}
    >
      {/* Competition name — top center */}
      <div
        className="absolute top-9 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold uppercase tracking-widest"
        style={{ color: 'rgba(255,255,255,.35)', fontFamily: 'var(--font-sora)' }}
      >
        {competitionName}
      </div>

      {/* Round */}
      <div
        className="mb-2 text-[22px] font-bold tracking-wide"
        style={{ color: 'rgba(255,255,255,.55)', fontFamily: 'var(--font-sora)' }}
      >
        {roundLabel || '—'}
      </div>

      {/* Dance */}
      <div
        className="mb-5 text-[32px] font-extrabold"
        style={{ color: 'var(--accent)', fontFamily: 'var(--font-sora)' }}
      >
        {danceLabel || '—'}
      </div>

      {/* Heat / group name — huge */}
      <div
        className="mb-4 text-center text-[80px] font-extrabold leading-none"
        style={{ color: '#fff', fontFamily: 'var(--font-sora)' }}
      >
        {heatLabel || '—'}
      </div>

      {/* Pair chips */}
      {pairNumbers.length > 0 && (
        <div className="flex max-w-[700px] flex-wrap justify-center gap-2">
          {pairNumbers.map((num) => (
            <span
              key={num}
              className="rounded-[10px] border px-4 py-1.5 text-base font-bold"
              style={{
                fontFamily: 'var(--font-sora)',
                background: 'rgba(255,255,255,.08)',
                borderColor: 'rgba(255,255,255,.15)',
                color: 'rgba(255,255,255,.75)',
              }}
            >
              {num}
            </span>
          ))}
        </div>
      )}

      {/* ESC hint */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] tracking-wide"
        style={{ color: 'rgba(255,255,255,.2)', fontFamily: 'var(--font-sora)' }}
      >
        ESC pro zavření
      </div>
    </div>
  )
}
