'use client'

import { useEffect, useState } from 'react'

const PX_PER_MIN = 3.2
const GAP_PX = 3

interface Block {
  startMinute: number
  durationMinutes: number
}

interface Props {
  blocks: Block[]
  dayStartMinute: number
}

function getNowMinute(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

function computeNowX(blocks: Block[], nowMin: number): number {
  let x = 0
  for (const b of blocks) {
    if (nowMin >= b.startMinute && nowMin < b.startMinute + b.durationMinutes) {
      const frac = b.durationMinutes > 0 ? (nowMin - b.startMinute) / b.durationMinutes : 0
      x += Math.round(frac * b.durationMinutes * PX_PER_MIN)
      return x
    }
    x += b.durationMinutes * PX_PER_MIN + GAP_PX
  }
  return x
}

export function NowLine({ blocks }: Props) {
  const [nowX, setNowX] = useState(() => computeNowX(blocks, getNowMinute()))

  useEffect(() => {
    const tick = () => setNowX(computeNowX(blocks, getNowMinute()))
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [blocks])

  return (
    <div
      className="pointer-events-none absolute inset-y-0"
      style={{ left: nowX, width: 2 }}
    >
      {/* Label */}
      <div
        className="absolute bottom-[calc(100%+4px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-[5px] py-px text-[9px] font-extrabold"
        style={{
          fontFamily: 'var(--font-sora)',
          color: '#fff',
          background: 'rgba(255,255,255,.15)',
        }}
      >
        {new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
      </div>
      {/* Line */}
      <div
        className="absolute inset-y-0 w-0.5 rounded-sm"
        style={{ background: '#fff', boxShadow: '0 0 6px rgba(255,255,255,.5)' }}
      />
    </div>
  )
}
