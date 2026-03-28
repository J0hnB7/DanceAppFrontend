'use client'

import { memo, useRef } from 'react'
import { NowLine } from '@/components/live/NowLine'
import { useLocale } from '@/contexts/locale-context'

const PX_PER_MIN = 3.2
const GAP_PX = 3

export type BlockStatus = 'done' | 'running' | 'future'
export type BlockType = 'competition' | 'break' | 'ceremony'

export interface TimelineBlock {
  id: string
  label: string
  startMinute: number   // minutes since midnight
  durationMinutes: number
  status: BlockStatus
  type: BlockType
}

interface Props {
  blocks: TimelineBlock[]
  readOnly?: boolean
  showNowLine?: boolean
}

function getSegClass(b: TimelineBlock): string {
  if (b.type === 'break') {
    return b.status === 'done' ? 'break-done' : 'break-future'
  }
  return b.status
}

function toTime(minute: number): string {
  const h = Math.floor(minute / 60)
  const m = minute % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const SegmentColors: Record<string, React.CSSProperties> = {
  done: { background: 'rgba(10,132,255,.35)' },
  running: { background: 'var(--accent)', overflow: 'hidden' },
  future: { background: 'rgba(255,255,255,.07)' },
  'break-done': { background: 'rgba(10,132,255,.2)' },
  'break-future': { background: 'rgba(255,255,255,.04)' },
}

const Segment = memo(function Segment({ block }: { block: TimelineBlock }) {
  const w = block.durationMinutes * PX_PER_MIN
  const cls = getSegClass(block)
  const style = SegmentColors[cls] ?? SegmentColors.future

  return (
    <div
      title={`${toTime(block.startMinute)} ${block.label} (${block.durationMinutes} min)`}
      className="relative flex-shrink-0 rounded-lg"
      style={{ width: w, height: 58, ...style }}
    >
      {/* Shimmer for running */}
      {cls === 'running' && (
        <div
          className="pointer-events-none absolute inset-y-0 w-1/2"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(255,255,255,.22), transparent)',
            animation: 'shimmer 2.2s cubic-bezier(.4,0,.6,1) infinite',
          }}
        />
      )}

      {/* Start time */}
      <div
        className="absolute left-2 top-[7px] whitespace-nowrap text-[9px] font-bold leading-none tracking-[.3px]"
        style={{
          fontFamily: 'var(--font-sora)',
          color:
            cls === 'running'
              ? 'rgba(255,255,255,.75)'
              : cls === 'done'
                ? 'rgba(255,255,255,.5)'
                : cls === 'break-future'
                  ? 'rgba(255,255,255,.3)'
                  : 'rgba(255,255,255,.4)',
          pointerEvents: 'none',
        }}
      >
        {toTime(block.startMinute)}
      </div>

      {/* Label — only if wide enough */}
      {w >= 70 && (
        <div
          className="absolute bottom-2 left-2 right-1.5 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-semibold leading-none"
          style={{
            fontFamily: 'var(--font-sora)',
            color:
              cls === 'running'
                ? '#fff'
                : cls === 'done'
                  ? 'rgba(255,255,255,.7)'
                  : cls === 'break-future'
                    ? 'rgba(255,255,255,.4)'
                    : 'rgba(255,255,255,.65)',
            pointerEvents: 'none',
          }}
        >
          {block.label}
        </div>
      )}
    </div>
  )
})

export function DayTimeline({ blocks, showNowLine = true }: Props) {
  const { t } = useLocale()
  const scrollRef = useRef<HTMLDivElement>(null)
  const totalPx = blocks.reduce((sum, b) => sum + b.durationMinutes * PX_PER_MIN + GAP_PX, 0)

  return (
    <div className="overflow-hidden px-5 py-5">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <span
          className="text-[10px] font-bold uppercase tracking-[.8px]"
          style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-sora)' }}
        >
          {t('scheduleBuilder.daySchedule')}
        </span>
        {blocks.length > 0 && (
          <span
            className="text-[11px] font-bold"
            style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-sora)' }}
          >
            {toTime(blocks[0].startMinute)} –{' '}
            {toTime(
              blocks[blocks.length - 1].startMinute +
                blocks[blocks.length - 1].durationMinutes
            )}
          </span>
        )}
      </div>

      {/* Scrollable bar */}
      <div
        ref={scrollRef}
        className="overflow-x-auto pb-1"
        style={{
          cursor: 'grab',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
        }}
      >
        <div className="relative" style={{ width: totalPx, height: 58 }}>
          {/* Segments */}
          <div className="absolute inset-0 flex" style={{ gap: GAP_PX }}>
            {blocks.map((b) => (
              <Segment key={b.id} block={b} />
            ))}
          </div>

          {/* Now line */}
          {showNowLine && blocks.length > 0 && (
            <NowLine
              blocks={blocks.map((b) => ({
                startMinute: b.startMinute,
                durationMinutes: b.durationMinutes,
              }))}
              dayStartMinute={blocks[0].startMinute}
            />
          )}
        </div>
      </div>
    </div>
  )
}
