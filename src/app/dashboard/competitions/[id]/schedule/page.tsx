"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  Clock,
  GripVertical,
  CalendarDays,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SimpleDialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { scheduleApi, type ScheduleSlot, type CreateSlotRequest } from "@/lib/api/schedule";
import { sectionsApi } from "@/lib/api/sections";
import { cn } from "@/lib/utils";

const ROUND_LABELS: Record<string, string> = {
  PRELIMINARY: "Preliminary",
  SEMIFINAL: "Semifinal",
  FINAL: "Final",
};

const ROUND_COLORS: Record<string, string> = {
  PRELIMINARY: "default",
  SEMIFINAL: "warning",
  FINAL: "success",
} as const;

function addMinutes(iso: string, mins: number): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + mins);
  return d.toISOString();
}

function formatSlotTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" });
}

interface SlotRowProps {
  slot: ScheduleSlot;
  onDelete: (id: string) => void;
  deleting: boolean;
}

function SlotRow({ slot, onDelete, deleting }: SlotRowProps) {
  const endTime = formatSlotTime(addMinutes(slot.startsAt, slot.durationMinutes));
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 hover:bg-[var(--surface-secondary)] transition-colors">
      <GripVertical className="h-4 w-4 shrink-0 text-[var(--text-tertiary)] cursor-grab" />
      <div className="flex items-center gap-1.5 w-28 shrink-0">
        <Clock className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
        <span className="text-sm font-mono text-[var(--text-secondary)]">
          {formatSlotTime(slot.startsAt)} – {endTime}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{slot.sectionName}</p>
        {slot.notes && (
          <p className="text-xs text-[var(--text-tertiary)] truncate">{slot.notes}</p>
        )}
      </div>
      <Badge variant={ROUND_COLORS[slot.roundType] as "default" | "success" | "warning"} className="shrink-0">
        {ROUND_LABELS[slot.roundType]}
      </Badge>
      {slot.floor && (
        <span className="text-xs text-[var(--text-secondary)] shrink-0">Floor {slot.floor}</span>
      )}
      <span className="text-xs text-[var(--text-tertiary)] shrink-0">{slot.durationMinutes} min</span>
      <Button
        variant="ghost"
        size="icon-sm"
        className="shrink-0 text-[var(--text-tertiary)] hover:text-red-500"
        onClick={() => onDelete(slot.id)}
        loading={deleting}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

interface AddSlotDialogProps {
  competitionId: string;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  lastSlotEnd?: string;
}

function AddSlotDialog({ competitionId, open, onClose, onCreated, lastSlotEnd }: AddSlotDialogProps) {
  const { toast } = useToast();
  const { data: sections = [] } = useQuery({
    queryKey: ["sections", competitionId],
    queryFn: () => sectionsApi.list(competitionId),
  });

  const defaultTime = lastSlotEnd
    ? new Date(lastSlotEnd).toISOString().slice(0, 16)
    : new Date().toISOString().slice(0, 16);

  const [form, setForm] = useState<CreateSlotRequest>({
    sectionId: "",
    roundType: "PRELIMINARY",
    startsAt: defaultTime,
    durationMinutes: 20,
    floor: "1",
    notes: "",
  });

  const { mutate, isPending } = useMutation({
    mutationFn: () => scheduleApi.create(competitionId, { ...form, startsAt: new Date(form.startsAt).toISOString() }),
    onSuccess: () => {
      toast({ title: "Slot added", variant: "success" });
      onCreated();
      onClose();
    },
    onError: () => toast({ title: "Failed to add slot", variant: "destructive" }),
  });

  return (
    <SimpleDialog open={open} onClose={onClose} title="Add schedule slot">
      <div className="space-y-4 pt-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]">Section</label>
          <select
            value={form.sectionId}
            onChange={(e) => setForm((f) => ({ ...f, sectionId: e.target.value }))}
            className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            <option value="">Select section…</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">Round</label>
            <select
              value={form.roundType}
              onChange={(e) => setForm((f) => ({ ...f, roundType: e.target.value as CreateSlotRequest["roundType"] }))}
              className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              <option value="PRELIMINARY">Preliminary</option>
              <option value="SEMIFINAL">Semifinal</option>
              <option value="FINAL">Final</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">Duration (min)</label>
            <Input
              type="number"
              min={5}
              max={120}
              value={form.durationMinutes}
              onChange={(e) => setForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]">Start time</label>
          <Input
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">Floor</label>
            <Input
              value={form.floor}
              onChange={(e) => setForm((f) => ({ ...f, floor: e.target.value }))}
              placeholder="1"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">Notes</label>
            <Input
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutate()} loading={isPending} disabled={!form.sectionId}>
            Add slot
          </Button>
        </div>
      </div>
    </SimpleDialog>
  );
}

export default function SchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: competitionId } = use(params);
  const qc = useQueryClient();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ["schedule", competitionId],
    queryFn: () => scheduleApi.list(competitionId),
  });

  const sorted = [...slots].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  // Group by day
  const byDay = sorted.reduce<Record<string, ScheduleSlot[]>>((acc, slot) => {
    const day = new Date(slot.startsAt).toLocaleDateString("sk-SK", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    (acc[day] ??= []).push(slot);
    return acc;
  }, {});

  const lastSlotEnd = sorted.length
    ? addMinutes(sorted[sorted.length - 1].startsAt, sorted[sorted.length - 1].durationMinutes)
    : undefined;

  const { mutate: deleteSlot } = useMutation({
    mutationFn: (id: string) => scheduleApi.remove(competitionId, id),
    onMutate: (id) => setDeletingId(id),
    onSettled: () => setDeletingId(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedule", competitionId] });
      toast({ title: "Slot removed", variant: "success" });
    },
    onError: () => toast({ title: "Failed to remove slot", variant: "destructive" }),
  });

  const totalMinutes = sorted.reduce((s, slot) => s + slot.durationMinutes, 0);

  return (
    <AppShell title="Schedule">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">Schedule</h1>
            {sorted.length > 0 && (
              <p className="text-sm text-[var(--text-secondary)]">
                {sorted.length} slots · {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m total
              </p>
            )}
          </div>
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add slot
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : sorted.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <CalendarDays className="h-10 w-10 text-[var(--text-tertiary)]" />
            <p className="text-sm text-[var(--text-secondary)]">No schedule yet. Add the first slot.</p>
            <Button onClick={() => setAddOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Add slot
            </Button>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(byDay).map(([day, daySlots]) => (
              <div key={day} className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{day}</h2>
                {daySlots.map((slot) => (
                  <SlotRow
                    key={slot.id}
                    slot={slot}
                    onDelete={deleteSlot}
                    deleting={deletingId === slot.id}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <AddSlotDialog
        competitionId={competitionId}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => qc.invalidateQueries({ queryKey: ["schedule", competitionId] })}
        lastSlotEnd={lastSlotEnd}
      />
    </AppShell>
  );
}
