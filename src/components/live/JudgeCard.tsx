'use client'

import type { JudgeStatus } from '@/store/live-store'

interface Props {
  judgeId: string
  letter: string
  name: string
  status: JudgeStatus
  online: boolean
  submittedAt?: string
  canPing: boolean
  onPing: (judgeId: string) => void
}

const STATUS_LABELS: Record<JudgeStatus, string> = {
  pending: 'Čeká',
  scoring: 'Zadává',
  submitted: 'Zadáno',
  offline: 'Offline',
}

export function JudgeCard({ judgeId, letter, name, status, online, canPing, onPing }: Props) {
  const isSubmitted = status === 'submitted'
  const isScoring = status === 'scoring'
  const isOffline = status === 'offline'

  return (
    <div
      className="flex flex-col items-center gap-1.5 rounded-[13px] border px-2 py-3 transition-all duration-200"
      style={{
        background: isSubmitted
          ? 'rgba(48,209,88,.07)'
          : isScoring
          ? 'rgba(10,132,255,.09)'
          : 'var(--surface)',
        borderColor: isSubmitted
          ? 'rgba(48,209,88,.2)'
          : isScoring
          ? 'rgba(10,132,255,.28)'
          : 'var(--border)',
      }}
    >
      {/* Letter */}
      <span
        className="text-[20px] font-extrabold leading-none"
        style={{
          fontFamily: 'var(--font-sora)',
          color: isSubmitted
            ? 'var(--success)'
            : isScoring
            ? 'var(--accent)'
            : 'var(--text-secondary)',
        }}
      >
        {letter}
      </span>

      {/* Name */}
      <span
        className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-center text-[9.5px]"
        style={{ color: 'var(--text-secondary)' }}
      >
        {name}
      </span>

      {/* Status */}
      <div
        className="flex items-center gap-1 text-[8.5px] font-bold uppercase tracking-[.4px]"
        style={{
          fontFamily: 'var(--font-sora)',
          color: isSubmitted
            ? 'var(--success)'
            : isScoring
            ? 'var(--accent)'
            : isOffline
            ? 'var(--destructive)'
            : 'var(--text-tertiary)',
        }}
      >
        <span
          className="h-[5px] w-[5px] shrink-0 rounded-full"
          style={{
            background: isSubmitted
              ? 'var(--success)'
              : isScoring
              ? 'var(--accent)'
              : isOffline
              ? 'var(--destructive)'
              : 'var(--text-tertiary)',
            animation: isScoring ? 'dp 1.4s ease-in-out infinite' : undefined,
          }}
        />
        {STATUS_LABELS[status]}
      </div>

      {/* Online indicator */}
      <div
        className="flex items-center gap-1 text-[8px] font-semibold uppercase tracking-[.35px]"
        style={{
          fontFamily: 'var(--font-sora)',
          color: online ? 'rgba(48,209,88,.7)' : 'var(--text-tertiary)',
        }}
      >
        <span
          className="h-[5px] w-[5px] shrink-0 rounded-full"
          style={{
            background: online ? 'var(--success)' : 'var(--text-tertiary)',
            boxShadow: online ? '0 0 4px rgba(48,209,88,.6)' : undefined,
          }}
        />
        {online ? 'Online' : 'Offline'}
      </div>

      {/* Ping button */}
      {canPing && (
        <button
          onClick={() => onPing(judgeId)}
          className="mt-0.5 flex cursor-pointer items-center gap-1 rounded-[6px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[.3px] transition-all hover:bg-[rgba(10,132,255,.2)]"
          style={{
            border: '1px solid rgba(10,132,255,.3)',
            background: 'rgba(10,132,255,.1)',
            color: 'var(--accent)',
            fontFamily: 'var(--font-sora)',
          }}
        >
          Ping
        </button>
      )}
    </div>
  )
}
