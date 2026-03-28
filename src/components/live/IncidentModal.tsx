'use client'

import { IncidentPanel } from './IncidentPanel'
import type { Incident } from '@/store/live-store'

interface Props {
  incidents: Incident[]
  competitionId: string
  roundId: string | null
  heatId: string | null
  onClose: () => void
}

export function IncidentModal({ incidents, competitionId, roundId, heatId, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-[900] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,.72)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <IncidentPanel
          incidents={incidents}
          competitionId={competitionId}
          roundId={roundId}
          heatId={heatId}
          modal
          onClose={onClose}
        />
      </div>
    </div>
  )
}
