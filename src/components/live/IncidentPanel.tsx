'use client'

import { useState } from 'react'
import { AlertTriangle, Plus } from 'lucide-react'
import type { Incident } from '@/store/live-store'
import { useLiveStore } from '@/store/live-store'
import { liveApi } from '@/lib/api/live'
import { useToast } from '@/hooks/use-toast'

const INCIDENT_TYPES = [
  { value: 'withdrawal', label: 'Stažení páru' },
  { value: 'penalty', label: 'Penalizace' },
  { value: 'injury', label: 'Zranění' },
  { value: 'other', label: 'Jiné' },
] as const

type IncidentType = typeof INCIDENT_TYPES[number]['value']

interface Props {
  incidents: Incident[]
  competitionId: string
  roundId: string | null
  heatId: string | null
  modal?: boolean
  onClose?: () => void
}

export function IncidentPanel({ incidents, competitionId, roundId, heatId, modal, onClose }: Props) {
  const [showForm, setShowForm] = useState(modal ?? false)
  const [type, setType] = useState<IncidentType>('withdrawal')
  const [pairNumber, setPairNumber] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { addIncident, withdrawPair } = useLiveStore()
  const { toast } = useToast()

  const handleSubmit = async () => {
    if (!note.trim()) return
    setSubmitting(true)
    try {
      const incident = await liveApi.createIncident(competitionId, {
        type,
        pairNumber: pairNumber ? parseInt(pairNumber, 10) : undefined,
        note: note.trim(),
        roundId: roundId ?? undefined,
        heatId: heatId ?? undefined,
      })
      addIncident(incident)
      if (type === 'withdrawal' && pairNumber) {
        withdrawPair(pairNumber)
      }
      setNote('')
      setPairNumber('')
      setShowForm(false)
      onClose?.()
    } catch {
      toast({ title: 'Nepodařilo se uložit incident', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={modal ? '' : ''}>
      {modal ? (
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            <AlertTriangle className="h-4 w-4" style={{ color: 'var(--destructive)' }} />
            Incident
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded p-1 text-xs hover:bg-[var(--surface-2)]"
            style={{ color: 'var(--text-secondary)' }}
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="mb-3.5 flex items-center gap-2.5">
          <div
            className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] text-[11px] font-bold"
            style={{ fontFamily: 'var(--font-sora)', background: 'rgba(255,69,58,.12)', border: '1px solid rgba(255,69,58,.25)', color: 'var(--destructive)' }}
          >
            5
          </div>
          <span
            className="text-[12px] font-bold uppercase tracking-[.8px]"
            style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-sora)' }}
          >
            Incidenty
          </span>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>({incidents.length})</span>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="ml-auto flex cursor-pointer items-center gap-1 rounded border px-2 py-1 text-xs transition-colors hover:bg-[var(--surface-2)]"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            <Plus className="h-3 w-3" />
            Přidat
          </button>
        </div>
      )}

      {showForm && (
        <div
          className={modal ? '' : 'mb-4 rounded-xl border p-4'}
          style={modal ? {} : { background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="mb-3 grid grid-cols-2 gap-2">
            {INCIDENT_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className="cursor-pointer rounded-lg border px-3 py-2 text-xs font-medium text-center transition-colors"
                style={{
                  borderColor: type === t.value ? 'rgba(255,69,58,.35)' : 'var(--border)',
                  color: type === t.value ? 'var(--destructive)' : 'var(--text-secondary)',
                  background: type === t.value ? 'rgba(255,69,58,.1)' : 'transparent',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <input
            type="number"
            value={pairNumber}
            onChange={(e) => setPairNumber(e.target.value)}
            placeholder="Číslo páru (volitelné)"
            className="mb-2 w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Poznámka *"
            rows={2}
            className="mb-3 w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none resize-none"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={submitting || !note.trim()}
              className="cursor-pointer rounded-lg px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-40"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {submitting ? 'Ukládám...' : 'Uložit incident'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="cursor-pointer rounded-lg border px-4 py-2 text-xs transition-colors hover:bg-[var(--surface-2)]"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              Zrušit
            </button>
          </div>
        </div>
      )}

      {!modal && <div className="flex flex-col gap-2">
        {incidents.map((incident) => (
          <div
            key={incident.id}
            className="flex items-start gap-3 rounded-xl border px-4 py-3"
            style={{
              background: 'var(--surface)',
              borderColor: incident.type === 'withdrawal' ? 'var(--destructive)' : 'var(--warning)',
            }}
          >
            <AlertTriangle
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
              style={{
                color: incident.type === 'withdrawal' ? 'var(--destructive)' : 'var(--warning)',
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {incident.type === 'withdrawal' ? 'Stažení' : 'Penalizace'}
                  {incident.pairNumber ? ` — pár ${incident.pairNumber}` : ''}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {new Date(incident.timestamp).toLocaleTimeString('cs-CZ', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                {incident.note}
              </p>
            </div>
          </div>
        ))}
      </div>}
    </div>
  )
}
