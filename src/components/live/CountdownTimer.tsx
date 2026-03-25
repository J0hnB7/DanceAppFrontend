'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, RotateCcw } from 'lucide-react'

const INITIAL_SECONDS = 360 // 6:00

function fmt(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export function CountdownTimer() {
  const [seconds, setSeconds] = useState(INITIAL_SECONDS)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setRunning(false)
  }, [])

  const start = useCallback(() => {
    if (running) return
    setRunning(true)
    intervalRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current!)
          intervalRef.current = null
          setRunning(false)
          return 0
        }
        return s - 1
      })
    }, 1000)
  }, [running])

  const reset = useCallback(() => {
    stop()
    setSeconds(INITIAL_SECONDS)
  }, [stop])

  // T key — start/pause
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 't' || e.key === 'T') {
        setRunning((r) => {
          if (r) {
            stop()
            return false
          } else {
            start()
            return true
          }
        })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [start, stop])

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  const urgent = seconds <= 60

  return (
    <div
      className="mx-5 flex flex-col items-center gap-3 border-b py-5"
      style={{ borderColor: 'var(--border)' }}
    >
      <div
        className="tabular-nums transition-colors"
        style={{
          fontFamily: 'var(--font-sora)',
          fontSize: 40,
          fontWeight: 800,
          letterSpacing: -1,
          lineHeight: 1,
          color: urgent ? 'var(--destructive)' : 'var(--text-primary)',
        }}
      >
        {fmt(seconds)}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={running ? stop : start}
          className="flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-bold transition-colors"
          style={{
            background: running ? 'var(--surface-2)' : 'var(--accent)',
            borderColor: running ? 'var(--border)' : 'transparent',
            color: running ? 'var(--text-secondary)' : '#fff',
            fontFamily: 'var(--font-sora)',
          }}
        >
          {running ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          {running ? 'Pauza' : 'Start'}
        </button>

        <button
          onClick={reset}
          className="flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-bold transition-colors hover:bg-[var(--surface-2)]"
          style={{
            background: 'var(--surface-2)',
            borderColor: 'var(--border)',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-sora)',
          }}
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </div>
    </div>
  )
}
