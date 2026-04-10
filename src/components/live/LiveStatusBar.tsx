'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, MonitorPlay, Printer, Keyboard, ArrowLeft, Sun, Moon, Signal } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useLocale } from '@/contexts/locale-context'

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
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : true
  )
  const router = useRouter()
  const { t } = useLocale()

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // isDark initialized via lazy useState from document; no effect needed

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
          className="cursor-pointer rounded p-1.5 transition-colors hover:bg-[var(--surface-2)] shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          style={{ color: 'var(--text-secondary)' }}
          title={t("common.back")}
          aria-label={t("common.back")}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <span
          className="truncate text-sm font-semibold transition-opacity duration-300"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)', opacity: competitionName ? 1 : 0 }}
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
            {(() => { const d = new Date(lastSentAt); return isFinite(d.getTime()) ? d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : null; })()}
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
          aria-label={incidentCount > 0 ? `Incidents — ${incidentCount} active (I)` : "Report incident (I)"}
          className={cn(
            'cursor-pointer rounded p-1.5 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
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
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            {incidentCount > 0 && (
              <span className="text-[10px] font-bold" aria-hidden="true">{incidentCount}</span>
            )}
          </div>
        </button>

        <button
          onClick={onPresentationMode}
          title="Prezentační mód (P)"
          aria-label="Presentation mode (P)"
          className="cursor-pointer rounded p-1.5 transition-colors hover:bg-[var(--surface-2)] min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          style={{ color: 'var(--text-secondary)' }}
        >
          <MonitorPlay className="h-4 w-4" aria-hidden="true" />
        </button>

        <button
          title="Tisk"
          aria-label="Print"
          onClick={() => window.print()}
          className="cursor-pointer rounded p-1.5 transition-colors hover:bg-[var(--surface-2)] min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
        </button>

        <button
          onClick={toggleTheme}
          title={isDark ? 'Light mode' : 'Dark mode'}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="cursor-pointer rounded p-1.5 transition-colors hover:bg-[var(--surface-2)] min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          style={{ color: 'var(--text-secondary)' }}
        >
          {isDark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
        </button>

        <button
          onClick={onShowHelp}
          title="Klávesové zkratky (?)"
          aria-label="Keyboard shortcuts (?)"
          className="cursor-pointer rounded p-1.5 transition-colors hover:bg-[var(--surface-2)] min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Keyboard className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
