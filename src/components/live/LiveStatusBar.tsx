'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, MonitorPlay, Printer, Keyboard, ArrowLeft, Sun, Moon, Signal } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Props {
  competitionId: string
  competitionName: string
  roundLabel: string
  sseConnected: boolean
  lastSentAt: string | null
  onPresentationMode: () => void
  onShowHelp: () => void
  onIncident: () => void
  incidentCount: number
}

export function LiveStatusBar({
  competitionId,
  competitionName,
  roundLabel,
  sseConnected,
  lastSentAt,
  onPresentationMode,
  onShowHelp,
  onIncident,
  incidentCount,
}: Props) {
  const [time, setTime] = useState(() => new Date())
  const [isDark, setIsDark] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
  }

  return (
    <div
      className="sticky top-0 z-50 flex items-center justify-between px-5 py-3"
      style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={() => router.push(`/dashboard/competitions/${competitionId}`)}
          className="cursor-pointer rounded p-1.5 transition-colors hover:bg-[var(--surface-2)] shrink-0"
          style={{ color: 'var(--text-secondary)' }}
          title="Zpět"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span
          className="truncate text-sm font-semibold"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}
        >
          {competitionName}
        </span>
        {roundLabel && (
          <>
            <span style={{ color: 'var(--text-tertiary)' }}>·</span>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {roundLabel}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Poslední signál */}
        {lastSentAt && (
          <div
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold"
            style={{
              background: 'rgba(10,132,255,.08)',
              border: '1px solid rgba(10,132,255,.18)',
              color: 'var(--accent)',
              fontFamily: 'var(--font-sora)',
            }}
          >
            <Signal className="h-3 w-3" />
            {new Date(lastSentAt).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        )}

        {sseConnected && (
          <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--success)' }}>
            <div className="h-2 w-2 rounded-full animate-[ldot_2s_ease-in-out_infinite] bg-[var(--success)]" />
            LIVE
          </div>
        )}

        <span
          className="tabular-nums text-xs"
          style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-sora)' }}
        >
          {time.toLocaleTimeString('cs-CZ', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </span>

        <button
          onClick={onIncident}
          title="Incident (I)"
          className={cn(
            'cursor-pointer rounded p-1.5 transition-colors',
            incidentCount > 0
              ? 'bg-[rgba(255,69,58,.07)] hover:bg-[rgba(255,69,58,.14)]'
              : 'hover:bg-[var(--surface-2)]'
          )}
          style={{
            color: 'var(--destructive)',
            border: incidentCount > 0 ? '1px solid rgba(255,69,58,.25)' : '1px solid transparent',
          }}
        >
          <div className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            {incidentCount > 0 && (
              <span className="text-[10px] font-bold">{incidentCount}</span>
            )}
          </div>
        </button>

        <button
          onClick={onPresentationMode}
          title="Prezentační mód (P)"
          className="cursor-pointer rounded p-1.5 transition-colors hover:bg-[var(--surface-2)]"
          style={{ color: 'var(--text-secondary)' }}
        >
          <MonitorPlay className="h-4 w-4" />
        </button>

        <button
          title="Tisk"
          onClick={() => window.print()}
          className="cursor-pointer rounded p-1.5 transition-colors hover:bg-[var(--surface-2)]"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Printer className="h-4 w-4" />
        </button>

        <button
          onClick={toggleTheme}
          title={isDark ? 'Light mode' : 'Dark mode'}
          className="cursor-pointer rounded p-1.5 transition-colors hover:bg-[var(--surface-2)]"
          style={{ color: 'var(--text-secondary)' }}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <button
          onClick={onShowHelp}
          title="Klávesové zkratky (?)"
          className="cursor-pointer rounded p-1.5 transition-colors hover:bg-[var(--surface-2)]"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Keyboard className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
