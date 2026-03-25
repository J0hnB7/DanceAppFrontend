'use client'

import { Signal } from 'lucide-react'
import { useLiveStore } from '@/store/live-store'

interface RunningItem {
  label: string
  meta: string
  floorLabel: string
}

interface DayStats {
  totalRounds: number
  doneRounds: number
  waitRounds: number
  totalPairs: number
}

interface SelectedBlock {
  name: string
  timeRange: string
}

interface Props {
  running: RunningItem[]
  stats: DayStats
  selectedBlock: SelectedBlock | null
}

export function LiveSidebar({ running, stats, selectedBlock }: Props) {
  const { lastSentAt } = useLiveStore()

  return (
    <div
      className="flex flex-wrap gap-4 border-t px-5 py-6"
      style={{ borderColor: 'var(--border)' }}
    >
      {/* Probíhá nyní */}
      {running.length > 0 && (
        <div className="min-w-[180px] flex-1 max-w-xs">
          <div
            className="mb-2.5 text-[10px] font-bold uppercase tracking-[.8px]"
            style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-sora)' }}
          >
            Probíhá nyní
          </div>
          {running.map((item, i) => (
            <div
              key={i}
              className="mb-1.5 rounded-[11px] border p-[11px]"
              style={{
                background: 'rgba(48,209,88,.08)',
                borderColor: 'rgba(48,209,88,.2)',
              }}
            >
              <div
                className="mb-0.5 text-xs font-bold leading-tight"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}
              >
                {item.label}
              </div>
              <div className="mb-0.5 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                {item.meta}
              </div>
              <div
                className="flex items-center gap-1 text-[10px] font-semibold"
                style={{ color: 'var(--success)' }}
              >
                <span>▪</span>
                <span>{item.floorLabel}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Přehled dne */}
      <div className="min-w-[160px] flex-1">
        <div
          className="mb-2.5 text-[10px] font-bold uppercase tracking-[.8px]"
          style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-sora)' }}
        >
          Přehled dne
        </div>
        {[
          { lbl: 'Celkem kol', val: stats.totalRounds, cls: '' },
          { lbl: 'Hotovo', val: stats.doneRounds, cls: 'green' },
          { lbl: 'Čeká', val: stats.waitRounds, cls: 'blue' },
          { lbl: 'Párů celkem', val: stats.totalPairs, cls: '' },
        ].map((row) => (
          <div
            key={row.lbl}
            className="flex items-center justify-between border-b py-[7px] last:border-0"
            style={{ borderColor: 'rgba(44,44,46,.7)' }}
          >
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {row.lbl}
            </span>
            <span
              className="text-[15px] font-extrabold"
              style={{
                fontFamily: 'var(--font-sora)',
                color:
                  row.cls === 'green'
                    ? 'var(--success)'
                    : row.cls === 'blue'
                      ? 'var(--accent)'
                      : 'var(--text-primary)',
              }}
            >
              {row.val}
            </span>
          </div>
        ))}
      </div>

      {/* Poslední signál */}
      {lastSentAt && (
        <div className="min-w-[160px] flex-1">
          <div
            className="rounded-[11px] border p-[10px]"
            style={{
              background: 'rgba(10,132,255,.06)',
              borderColor: 'rgba(10,132,255,.15)',
            }}
          >
            <div
              className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold"
              style={{ color: 'var(--accent)', fontFamily: 'var(--font-sora)' }}
            >
              <Signal className="h-2.5 w-2.5" />
              Poslední signál
            </div>
            <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              {new Date(lastSentAt).toLocaleTimeString('cs-CZ', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </div>
          </div>
        </div>
      )}

      {/* Vybraný blok */}
      {selectedBlock && (
        <div className="min-w-[180px] flex-1 max-w-xs">
          <div
            className="mb-2.5 text-[10px] font-bold uppercase tracking-[.8px]"
            style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-sora)' }}
          >
            Vybraný blok
          </div>
          <div
            className="rounded-[11px] border p-[11px]"
            style={{
              background: 'rgba(10,132,255,.08)',
              borderColor: 'rgba(10,132,255,.2)',
            }}
          >
            <div
              className="mb-0.5 text-xs font-bold leading-tight"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}
            >
              {selectedBlock.name}
            </div>
            <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              {selectedBlock.timeRange}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
