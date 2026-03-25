'use client'

import type { HeatResult } from '@/store/live-store'

interface Props {
  results: HeatResult[]
}

export function HeatResults({ results }: Props) {
  return (
    <div className="px-5 py-4">
      <div
        className="mb-3 text-xs font-medium uppercase tracking-widest"
        style={{ color: 'var(--text-tertiary)' }}
      >
        6. Výsledky skupiny
      </div>
      <div className="flex flex-col gap-2">
        {results.map((r) => {
          return (
            <div
              key={r.pairId}
              className="flex items-center gap-3 rounded-xl border px-4 py-3"
              style={{
                background: 'var(--surface)',
                borderColor: r.advances ? 'var(--success)' : 'var(--border)',
              }}
            >
              {/* Číslo páru */}
              <span
                className="w-8 text-sm font-bold tabular-nums"
                style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
              >
                {r.pairNumber}
              </span>

              {/* Hlasy (✓ / ✗) */}
              <div className="flex gap-1">
                {Array.from({ length: r.totalJudges }, (_, i) => (
                  <span
                    key={i}
                    className="font-mono text-xs"
                    style={{ color: i < r.votes ? 'var(--success)' : 'var(--text-tertiary)' }}
                  >
                    {i < r.votes ? '✓' : '✗'}
                  </span>
                ))}
              </div>

              {/* Výsledek */}
              <span
                className="ml-auto text-xs font-bold"
                style={{
                  fontFamily: 'var(--font-sora)',
                  color: r.advances ? 'var(--success)' : 'var(--destructive)',
                }}
              >
                {r.votes}/{r.totalJudges} · {r.advances ? 'POSTUPUJE' : 'VYŘAZEN'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
