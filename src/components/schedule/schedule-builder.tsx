"use client";

import { useState, useCallback, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Clock, CheckCircle2, PlayCircle, Pause, Globe, AlertTriangle, Music, ArrowRight } from "lucide-react";
import { useScheduleStore } from "@/store/schedule-store";
import { scheduleApi, type ScheduleSlot, type BlockLiveStatus } from "@/lib/api/schedule";
import { Button } from "@/components/ui/button";
import { SimpleDialog } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import type { SectionDto } from "@/lib/api/sections";

interface ScheduleBuilderProps {
  competitionId: string;
}

const BLOCK_TYPE_COLORS: Record<string, string> = {
  ROUND: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  BREAK: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  JUDGE_BREAK: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  AWARD_CEREMONY: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 border-green-200 dark:border-green-800",
  CUSTOM: "bg-gray-50 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300 border-gray-200 dark:border-gray-700",
};

const BLOCK_TYPE_LABELS: Record<string, string> = {
  ROUND: "Kolo",
  BREAK: "Přestávka",
  JUDGE_BREAK: "Pauza porotců",
  AWARD_CEREMONY: "Vyhlášení",
  CUSTOM: "Vlastní",
};

const LIVE_STATUS_ICONS: Record<BlockLiveStatus, React.ReactNode> = {
  NOT_STARTED: null,
  RUNNING: <PlayCircle className="h-3.5 w-3.5 text-green-500 animate-pulse" />,
  COMPLETED: <CheckCircle2 className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />,
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "--:--";
  }
}

interface AddBreakDialogProps {
  competitionId: string;
  afterSlotId: string | null;
  onClose: () => void;
}

function AddBreakDialog({ competitionId, afterSlotId, onClose }: AddBreakDialogProps) {
  const { addBreak } = useScheduleStore();
  const [duration, setDuration] = useState(15);
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!afterSlotId) return;
    setLoading(true);
    await addBreak(competitionId, afterSlotId, duration);
    setLoading(false);
    onClose();
  };

  return (
    <SimpleDialog open={!!afterSlotId} onClose={onClose} title="Vložit přestávku">
      <div className="space-y-4 pt-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]">Délka (min)</label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            {[5, 10, 15, 20, 30, 45, 60].map((n) => (
              <option key={n} value={n}>{n} min</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Zrušit</Button>
          <Button onClick={handleAdd} loading={loading}>
            <Plus className="h-4 w-4 mr-1.5" />
            Přidat
          </Button>
        </div>
      </div>
    </SimpleDialog>
  );
}

function parsePairCount(label: string): number | null {
  const match = label.match(/\((\d+) párů\)/);
  return match ? parseInt(match[1]) : null;
}

interface SlotItemProps {
  slot: ScheduleSlot;
  competitionId: string;
  onAddBreakAfter: (slotId: string) => void;
  dances: string[];
  danceCount: number;
  advancingCount: number | null;
}

function SlotItem({ slot, competitionId, onAddBreakAfter, dances, danceCount, advancingCount }: SlotItemProps) {
  const { toast } = useToast();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slot.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const updateStatusMutation = useMutation({
    mutationFn: (liveStatus: BlockLiveStatus) =>
      scheduleApi.updateBlockStatus(competitionId, slot.id, liveStatus),
    onSuccess: () => {
      // Store will be updated via SSE
    },
    onError: () => toast({ title: "Chyba při aktualizaci stavu", variant: "destructive" }),
  });

  const isCompleted = slot.liveStatus === "COMPLETED";
  const isRunning = slot.liveStatus === "RUNNING";
  const isBreak = slot.type === "BREAK" || slot.type === "JUDGE_BREAK";
  const breakTooShort = isBreak && slot.durationMinutes < 20;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-all",
        BLOCK_TYPE_COLORS[slot.type] ?? BLOCK_TYPE_COLORS.CUSTOM,
        isDragging && "shadow-lg ring-2 ring-[var(--accent)] opacity-90 z-50",
        isCompleted && "opacity-50",
        slot.type === "BREAK" || slot.type === "JUDGE_BREAK"
          ? "border-dashed"
          : "border-solid"
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] touch-none"
        tabIndex={-1}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Live status icon */}
      <div className="w-4 flex items-center justify-center shrink-0">
        {LIVE_STATUS_ICONS[slot.liveStatus]}
      </div>

      {/* Time */}
      <div className="flex items-center gap-1 w-14 shrink-0">
        <Clock className="h-3 w-3 opacity-60" />
        <span className="text-xs font-mono">{formatTime(slot.startTime)}</span>
      </div>

      {/* Label */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{slot.label}</p>
        {slot.type === "ROUND" && (dances.length > 0 || advancingCount !== null) && (
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {dances.length > 0 && (
              <span className="flex items-center gap-1 text-[10px] opacity-70">
                <Music className="h-2.5 w-2.5" />
                {dances.join(", ")}
              </span>
            )}
            {advancingCount !== null && (
              <span className="flex items-center gap-1 text-[10px] opacity-70">
                <ArrowRight className="h-2.5 w-2.5" />
                postupuje {advancingCount}
              </span>
            )}
          </div>
        )}
        {slot.suggested && (
          <span className="text-[10px] opacity-60">navrhováno</span>
        )}
        {breakTooShort && (
          <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-2.5 w-2.5" />
            WDSF min. 20 min
          </span>
        )}
      </div>

      {/* Duration */}
      <span className="text-xs opacity-70 shrink-0">{slot.durationMinutes} min</span>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {slot.type === "ROUND" && !isCompleted && (
          <>
            {!isRunning ? (
              <button
                onClick={() => updateStatusMutation.mutate("RUNNING")}
                className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                title="Zahájit kolo"
              >
                <PlayCircle className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                onClick={() => updateStatusMutation.mutate("COMPLETED")}
                className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                title="Ukončit kolo"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        )}
        {(slot.type === "ROUND" || slot.type === "AWARD_CEREMONY") && (
          <button
            onClick={() => onAddBreakAfter(slot.id)}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            title="Přidat přestávku za"
          >
            <Pause className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export function ScheduleBuilder({ competitionId }: ScheduleBuilderProps) {
  const { toast } = useToast();
  const { slots, isDirty, isGenerating, scheduleStatus, moveSlot, generateSchedule, publishSchedule } = useScheduleStore();
  const [breakAfterSlotId, setBreakAfterSlotId] = useState<string | null>(null);

  const { data: sections = [] } = useQuery<SectionDto[]>({
    queryKey: ["sections", competitionId, "list"],
    queryFn: () => apiClient.get(`/competitions/${competitionId}/sections`).then((r) => r.data),
  });

  // Map sectionId → effective dance count (5 for standard/latin if configured < 5)
  const sectionDanceCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sections) {
      const configured = (s.dances ?? []).length;
      const style = (s.danceStyle ?? "").toUpperCase();
      if (configured >= 5) {
        map.set(s.id, configured);
      } else if (style.includes("STANDARD") || style.includes("LATIN")) {
        map.set(s.id, 5);
      } else {
        map.set(s.id, configured);
      }
    }
    return map;
  }, [sections]);

  const ABBR: Record<string, string> = {
    Waltz: "W", Tango: "T", "Viennese Waltz": "VW", "Slow Foxtrot": "SF", Quickstep: "QS",
    Samba: "S", "Cha-Cha-Cha": "CHA", "Cha Cha Cha": "CHA", Rumba: "R", "Paso Doble": "PD", Jive: "J",
  };
  const STANDARD_5 = ["W", "T", "VW", "SF", "QS"];
  const LATIN_5 = ["S", "CHA", "R", "PD", "J"];

  // Map sectionId → dance abbreviations (always 5 based on danceStyle if section has fewer)
  const sectionDances = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const s of sections) {
      const configured = (s.dances ?? [])
        .sort((a, b) => (a.danceOrder ?? a.orderIndex ?? 0) - (b.danceOrder ?? b.orderIndex ?? 0))
        .map((d) => {
          const name = d.danceName ?? d.name ?? "";
          return ABBR[name] ?? name.slice(0, 3).toUpperCase();
        })
        .filter(Boolean);

      const style = (s.danceStyle ?? "").toUpperCase();
      if (configured.length >= 5) {
        map.set(s.id, configured);
      } else if (style.includes("STANDARD") || style === "STANDARD") {
        map.set(s.id, STANDARD_5);
      } else if (style.includes("LATIN") || style === "LATIN") {
        map.set(s.id, LATIN_5);
      } else if (configured.length > 0) {
        map.set(s.id, configured);
      }
    }
    return map;
  }, [sections]);

  // Map slotId → advancing pair count (= next round's starting count for same section)
  const advancingCounts = useMemo(() => {
    const map = new Map<string, number | null>();
    const roundSlots = slots.filter((s) => s.type === "ROUND" && s.sectionId);
    for (let i = 0; i < roundSlots.length; i++) {
      const current = roundSlots[i];
      const next = roundSlots.find(
        (s, j) => j > i && s.sectionId === current.sectionId
      );
      map.set(current.id, next ? parsePairCount(next.label) : null);
    }
    return map;
  }, [slots]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = slots.findIndex((s) => s.id === active.id);
      const newIndex = slots.findIndex((s) => s.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return;

      moveSlot(competitionId, String(active.id), newIndex);
    },
    [slots, competitionId, moveSlot]
  );

  const handlePublish = async () => {
    await publishSchedule(competitionId);
    toast({ title: "Harmonogram publikován", variant: "success" });
  };

  const isPublished = scheduleStatus === "PUBLISHED";

  if (slots.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] py-16 flex flex-col items-center gap-3">
        <Clock className="h-10 w-10 text-[var(--text-tertiary)]" />
        <p className="text-sm text-[var(--text-secondary)]">Harmonogram ještě nebyl vygenerován.</p>
        <Button
          onClick={() => generateSchedule(competitionId)}
          loading={isGenerating}
          className="gap-2"
        >
          Vygenerovat harmonogram
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-secondary)]">
            {slots.length} bloků
          </span>
          {isDirty && (
            <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Neuložené změny
            </span>
          )}
          {isPublished && (
            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
              <Globe className="h-3 w-3" />
              Publikováno
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateSchedule(competitionId)}
            loading={isGenerating}
          >
            ↺ Přegenerovat
          </Button>
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={isPublished && !isDirty}
            className="gap-2"
          >
            <Globe className="h-4 w-4" />
            {isPublished ? "Aktualizovat" : "Publikovat"}
          </Button>
        </div>
      </div>

      {/* Slot list */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={slots.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {slots.map((slot) => (
              <SlotItem
                key={slot.id}
                slot={slot}
                competitionId={competitionId}
                onAddBreakAfter={setBreakAfterSlotId}
                dances={slot.sectionId ? (sectionDances.get(slot.sectionId) ?? []) : []}
                danceCount={slot.sectionId ? (sectionDanceCounts.get(slot.sectionId) ?? 0) : 0}
                advancingCount={advancingCounts.get(slot.id) ?? null}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <AddBreakDialog
        competitionId={competitionId}
        afterSlotId={breakAfterSlotId}
        onClose={() => setBreakAfterSlotId(null)}
      />
    </div>
  );
}
