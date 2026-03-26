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
import {
  GripVertical, Plus, Clock, CheckCircle2, PlayCircle, Pause,
  Globe, AlertTriangle, ArrowRight, X, Trophy, ChevronDown, ChevronRight,
  Users, Shuffle,
} from "lucide-react";
import { useScheduleStore } from "@/store/schedule-store";
import { scheduleApi, type ScheduleSlot, type BlockLiveStatus, type HeatAssignmentGroup } from "@/lib/api/schedule";
import { Button } from "@/components/ui/button";
import { SimpleDialog } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import type { SectionDto } from "@/lib/api/sections";
import type { CompetitionDto } from "@/lib/api/competitions";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ScheduleBuilderProps {
  competitionId: string;
  competition?: CompetitionDto;
  /** In restricted mode, COMPLETED and RUNNING slots cannot be dragged or deleted */
  restrictedEdit?: boolean;
  onFloorControl?: (danceName: string, heatNumber: number) => void;
  activeFloor?: { danceName: string; heatNumber: number } | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatTimeMs(ms: number): string {
  if (!isFinite(ms)) return "--:--";
  return new Date(ms).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
}

function formatTimeStr(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "--:--";
  }
}

function formatDurSec(secs: number): string {
  if (secs < 60) return `${secs} s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m} min ${s} s` : `${m} min`;
}

function parsePairCount(label: string): number | null {
  const match = label.match(/\((\d+)\s*párů?\)/i);
  return match ? parseInt(match[1]) : null;
}

interface GroupItem {
  type: "group" | "transition";
  num?: number;        // for type=group
  startMs: number;
  durationSec: number;
}

/** Builds dance-first view: dance[] → group items (inverted from old heat-first view) */
function buildDanceGroups(
  slotStartMs: number,
  heatCount: number,
  danceNames: string[],
  danceDurationSec: number,
  transitionSec: number,
) {
  const perDanceSec = danceDurationSec + transitionSec;
  const heatSec = danceNames.length * perDanceSec;

  return danceNames.map((danceName, d) => {
    const items: GroupItem[] = [];
    for (let h = 0; h < heatCount; h++) {
      const groupStartMs = slotStartMs + h * heatSec * 1000 + d * perDanceSec * 1000;
      items.push({ type: "group", num: h + 1, startMs: groupStartMs, durationSec: danceDurationSec });
      if (transitionSec > 0) {
        items.push({
          type: "transition",
          startMs: groupStartMs + danceDurationSec * 1000,
          durationSec: transitionSec,
        });
      }
    }
    return { danceName, items };
  });
}

// Full dance names for fallbacks
const STANDARD_5 = ["Waltz", "Tango", "Vídeňský valčík", "Slowfoxtrot", "Quickstep"];
const LATIN_5 = ["Samba", "Cha-Cha-Cha", "Rumba", "Paso Doble", "Jive"];

// ── Add Break Dialog ───────────────────────────────────────────────────────────

function AddBreakDialog({ competitionId, afterSlotId, onClose }: {
  competitionId: string;
  afterSlotId: string | null;
  onClose: () => void;
}) {
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

// ── Heat Pairs Row ─────────────────────────────────────────────────────────────

function HeatPairsRow({ heat, totalHeats }: { heat: HeatAssignmentGroup; totalHeats: number }) {
  const [open, setOpen] = useState(totalHeats === 1); // auto-open if only 1 heat

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--surface-secondary)] transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="h-3.5 w-3.5 text-[var(--text-tertiary)]" /> : <ChevronRight className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />}
          <span className="text-xs font-semibold text-[var(--text-primary)]">
            Skupina {heat.heatNumber}
          </span>
          <span className="text-xs text-[var(--text-tertiary)]">
            {heat.pairs.length} {heat.pairs.length === 1 ? "pár" : heat.pairs.length < 5 ? "páry" : "párů"}
          </span>
        </div>
        <div className="flex gap-1">
          {heat.pairs.map((p) => (
            <span
              key={p.pairId}
              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--surface-secondary)] text-[9px] font-bold text-[var(--text-secondary)] border border-[var(--border)]"
            >
              {p.startNumber}
            </span>
          ))}
        </div>
      </button>
      {open && (
        <div className="px-3 pb-2">
          <table className="w-full text-xs">
            <tbody className="divide-y divide-[var(--border)]">
              {heat.pairs.map((p) => (
                <tr key={p.pairId} className="hover:bg-[var(--surface-secondary)] transition-colors">
                  <td className="py-1 pr-2 w-8 font-mono font-bold text-[var(--text-secondary)] tabular-nums">
                    {p.startNumber}
                  </td>
                  <td className="py-1 pr-2 text-[var(--text-primary)] font-medium">
                    {p.dancer1}
                  </td>
                  <td className="py-1 pr-2 text-[var(--text-secondary)]">
                    / {p.dancer2}
                  </td>
                  <td className="py-1 text-[var(--text-tertiary)] text-right truncate max-w-[100px]">
                    {p.club}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Round Card ─────────────────────────────────────────────────────────────────

interface RoundCardProps {
  slot: ScheduleSlot;
  competitionId: string;
  danceNames: string[];
  danceCount: number;
  advancingCount: number | null;
  danceDurationSec: number;
  transitionSec: number;
  maxPairsOnFloor: number;
  drawAllowed: boolean;
  onAddBreakAfter: (slotId: string) => void;
  /** If provided, Skupina rows are clickable — sends floor-control signal to judges */
  onFloorControl?: (danceName: string, heatNumber: number) => void;
  /** Currently active floor item (for highlighting) */
  activeFloor?: { danceName: string; heatNumber: number } | null;
}

function RoundCard({
  slot, competitionId, danceNames, danceCount, advancingCount,
  danceDurationSec, transitionSec, maxPairsOnFloor, drawAllowed, onAddBreakAfter,
  onFloorControl, activeFloor,
}: RoundCardProps) {
  const [collapsed, setCollapsed] = useState(!onFloorControl);
  const [showPairs, setShowPairs] = useState(false);
  const { toast } = useToast();

  const { data: heatAssignments, refetch: redrawQuery, isFetching: isRedrawing, isError: heatError } = useQuery<HeatAssignmentGroup[]>({
    queryKey: ["heat-assignments", competitionId, slot.id],
    queryFn: async () => {
      try {
        return await scheduleApi.getHeatAssignments(competitionId, slot.id);
      } catch (e: unknown) {
        // 404 = not drawn yet; return empty array so UI shows "Losovat" prompt
        if ((e as { status?: number })?.status === 404) return [];
        throw e;
      }
    },
    enabled: showPairs && !collapsed,
    staleTime: Infinity,
    retry: false,
  });

  const redraw = useCallback(async () => {
    try {
      await scheduleApi.drawHeats(competitionId, slot.id);
      redrawQuery();
    } catch {
      toast({ title: "Chyba při losování", variant: "destructive" });
    }
  }, [competitionId, slot.id, redrawQuery, toast]);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slot.id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  const updateStatus = useMutation({
    mutationFn: (status: BlockLiveStatus) => scheduleApi.updateBlockStatus(competitionId, slot.id, status),
    onError: () => toast({ title: "Chyba při aktualizaci stavu", variant: "destructive" }),
  });

  const isCompleted = slot.liveStatus === "COMPLETED";
  const isRunning = slot.liveStatus === "RUNNING";

  // Compute heats
  const pairCount = parsePairCount(slot.label) ?? maxPairsOnFloor;
  const heatCount = Math.max(1, Math.ceil(pairCount / maxPairsOnFloor));
  const effectiveDances = danceNames.length > 0
    ? danceNames
    : Array.from({ length: danceCount || 3 }, (_, i) => `Tanec ${i + 1}`);
  const danceGroups = buildDanceGroups(
    new Date(slot.startTime).getTime(),
    heatCount,
    effectiveDances,
    danceDurationSec,
    transitionSec,
  );

  // Compute actual duration including transitions (slot.durationMinutes lacks them)
  const actualDurationSec = heatCount * effectiveDances.length * (danceDurationSec + transitionSec);
  const endMs = new Date(slot.startTime).getTime() + actualDurationSec * 1000;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden transition-all",
        isDragging && "shadow-xl ring-2 ring-[var(--accent)] opacity-90 z-50",
        isCompleted && "opacity-50",
        isRunning && "ring-2 ring-green-400 dark:ring-green-600 shadow-md",
      )}
    >
      {/* ── Header ── */}
      <div className="flex items-start gap-2 px-3 py-2.5">
        {/* Drag handle */}
        <button
          {...attributes} {...listeners}
          className="mt-0.5 cursor-grab active:cursor-grabbing text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] touch-none shrink-0"
          tabIndex={-1}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Expand/collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mt-0.5 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] shrink-0"
        >
          {collapsed
            ? <ChevronRight className="h-4 w-4" />
            : <ChevronDown className="h-4 w-4" />}
        </button>

        {/* Live status icon */}
        <div className="mt-0.5 w-4 shrink-0">
          {isRunning && <PlayCircle className="h-4 w-4 text-green-500 animate-pulse" />}
          {isCompleted && <CheckCircle2 className="h-4 w-4 text-[var(--text-tertiary)]" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <p className={cn(
              "text-sm font-semibold leading-tight",
              isCompleted && "line-through text-[var(--text-tertiary)]"
            )}>
              {slot.label.replace(/\s*\(\d+\s*párů?\)/i, "")}
            </p>
            <div className="flex items-center gap-1 shrink-0">
              {/* Round type badge */}
              {slot.roundNumber != null && (
                <span className="text-[10px] font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded px-1.5 py-0.5">
                  Kolo {slot.roundNumber}
                </span>
              )}
            </div>
          </div>
          {/* Meta row */}
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="flex items-center gap-1 text-xs font-mono text-[var(--text-secondary)]">
              <Clock className="h-3 w-3" />
              {formatTimeStr(slot.startTime)} – {formatTimeMs(endMs)}
            </span>
            <span className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
              <Users className="h-3 w-3" />
              {pairCount} párů
            </span>
            <span className="text-xs text-[var(--text-tertiary)]">
              {heatCount} {heatCount === 1 ? "skupina" : heatCount < 5 ? "skupiny" : "skupin"}
            </span>
            <span className="text-xs text-[var(--text-tertiary)]">
              {effectiveDances.length} tanců
            </span>
            <span className="text-xs text-[var(--text-tertiary)]">
              {formatDurSec(actualDurationSec)}
            </span>
            {advancingCount != null && (
              <span className="flex items-center gap-1 text-xs text-blue-500 dark:text-blue-400">
                <ArrowRight className="h-3 w-3" />
                postupuje {advancingCount}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          {/* Toggle pairs panel — only for rounds where draw is allowed */}
          <button
            onClick={() => { if (!drawAllowed) return; setShowPairs(!showPairs); if (collapsed) setCollapsed(false); }}
            disabled={!drawAllowed}
            className={cn(
              "p-1 rounded transition-colors",
              drawAllowed
                ? showPairs
                  ? "bg-[var(--accent)] text-white hover:opacity-80"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]"
                : "text-[var(--text-tertiary)] opacity-30 cursor-not-allowed"
            )}
            title={drawAllowed ? "Zobrazit páry ve skupinách" : "Dostupné až po dokončení předchozího kola"}
          >
            <Users className="h-4 w-4" />
          </button>

          {!isCompleted && (
            <>
              {!isRunning ? (
                <button
                  onClick={() => updateStatus.mutate("RUNNING")}
                  className="p-1 rounded hover:bg-[var(--surface-secondary)] transition-colors text-[var(--text-secondary)]"
                  title="Zahájit kolo"
                >
                  <PlayCircle className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={() => updateStatus.mutate("COMPLETED")}
                  className="p-1 rounded hover:bg-[var(--surface-secondary)] transition-colors text-[var(--text-secondary)]"
                  title="Ukončit kolo"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </button>
              )}
            </>
          )}
          <button
            onClick={() => onAddBreakAfter(slot.id)}
            className="p-1 rounded hover:bg-[var(--surface-secondary)] transition-colors text-[var(--text-secondary)]"
            title="Přidat přestávku za"
          >
            <Pause className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Expanded body: heats + dances ── */}
      {!collapsed && (
        <div className="border-t border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3 space-y-4">

          {/* ── Pairs panel ── */}
          {showPairs && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
                <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                  Přiřazení párů do skupin
                </span>
                <button
                  onClick={() => redraw()}
                  disabled={isRedrawing}
                  className="flex items-center gap-1 text-xs text-[var(--accent)] hover:opacity-70 transition-opacity disabled:opacity-40"
                  title="Znovu losovat (WDSF Rule 8.1.5 — náhodný los)"
                >
                  <ArrowRight className={cn("h-3 w-3 rotate-90", isRedrawing && "animate-spin")} />
                  Losovat
                </button>
              </div>
              {heatError ? (
                <div className="px-3 py-3 text-xs text-red-500">
                  Chyba při načítání přiřazení párů.
                </div>
              ) : isRedrawing || !heatAssignments ? (
                <div className="px-3 py-3 text-xs text-[var(--text-tertiary)]">Načítám…</div>
              ) : heatAssignments.length === 0 ? (
                <div className="px-3 py-3 text-xs text-[var(--text-tertiary)]">
                  Páry zatím nebyly rozlosovány — klikněte <strong>Losovat</strong>.
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {heatAssignments.map((heat) => (
                    <HeatPairsRow key={heat.heatNumber} heat={heat} totalHeats={heatAssignments.length} />
                  ))}
                </div>
              )}
            </div>
          )}

          {danceGroups.map((dance) => (
            <div key={dance.danceName}>
              {/* Dance label (primary grouping) */}
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
                  {dance.danceName}
                </span>
                <div className="flex-1 h-px bg-[var(--border)]" />
              </div>

              {/* Groups + transitions */}
              <div className="space-y-0">
                {dance.items.map((item, i) => {
                  if (item.type === "group") {
                    const isActive = activeFloor?.danceName === dance.danceName && activeFloor?.heatNumber === item.num;
                    return (
                      <div
                        key={i}
                        onClick={() => onFloorControl?.(dance.danceName, item.num!)}
                        className={cn(
                          "flex items-center gap-3 py-1 border-b border-[var(--border)] last:border-0 transition-colors",
                          onFloorControl ? "cursor-pointer hover:bg-[var(--accent)]/8" : "",
                          isActive ? "bg-[var(--accent)]/15 border-l-2 border-l-[var(--accent)]" : ""
                        )}
                      >
                        <span className="font-mono text-xs text-[var(--text-tertiary)] w-11 shrink-0 tabular-nums">
                          {formatTimeMs(item.startMs)}
                        </span>
                        <span className={cn("text-sm flex-1", isActive ? "text-[var(--accent)] font-semibold" : "text-[var(--text-primary)]")}>
                          Skupina {item.num}
                          {isActive && <span className="ml-2 text-[10px] font-bold uppercase tracking-widest opacity-70">● na parketu</span>}
                        </span>
                        <span className="text-xs text-[var(--text-tertiary)] tabular-nums shrink-0">
                          {formatDurSec(item.durationSec)}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 py-0.5 border-b border-[var(--border)] last:border-0"
                    >
                      <span className="font-mono text-xs text-[var(--text-tertiary)] w-11 shrink-0 tabular-nums opacity-60">
                        {formatTimeMs(item.startMs)}
                      </span>
                      <span className="text-xs italic text-[var(--text-tertiary)] flex-1">
                        — Nástup / odchod —
                      </span>
                      <span className="text-xs text-[var(--text-tertiary)] tabular-nums shrink-0 opacity-60">
                        {formatDurSec(item.durationSec)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Simple Card (Break / Award / Custom) ───────────────────────────────────────

interface SimpleCardProps {
  slot: ScheduleSlot;
  competitionId: string;
  onDelete: (slotId: string) => void;
}

const SIMPLE_CARD_STYLES: Record<string, string> = {
  BREAK: "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30",
  JUDGE_BREAK: "border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30",
  AWARD_CEREMONY: "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30",
  CUSTOM: "border-[var(--border)] bg-[var(--surface)]",
};

const SIMPLE_CARD_TEXT: Record<string, string> = {
  BREAK: "text-amber-700 dark:text-amber-300",
  JUDGE_BREAK: "text-purple-700 dark:text-purple-300",
  AWARD_CEREMONY: "text-green-700 dark:text-green-300",
  CUSTOM: "text-[var(--text-primary)]",
};

function SimpleCardIcon({ type }: { type: string }) {
  if (type === "BREAK") return <Pause className="h-4 w-4 text-amber-500" />;
  if (type === "JUDGE_BREAK") return <Pause className="h-4 w-4 text-purple-500" />;
  if (type === "AWARD_CEREMONY") return <Trophy className="h-4 w-4 text-green-500" />;
  return null;
}

function SimpleCard({ slot, competitionId, onDelete }: SimpleCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slot.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const isBreak = slot.type === "BREAK" || slot.type === "JUDGE_BREAK";

  const endMs = new Date(slot.startTime).getTime() + slot.durationMinutes * 60000;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-all",
        SIMPLE_CARD_STYLES[slot.type] ?? SIMPLE_CARD_STYLES.CUSTOM,
        isBreak && "border-dashed",
        isDragging && "shadow-lg ring-2 ring-[var(--accent)] opacity-90 z-50",
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes} {...listeners}
        className="cursor-grab active:cursor-grabbing text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] touch-none shrink-0"
        tabIndex={-1}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <SimpleCardIcon type={slot.type} />

      {/* Time */}
      <span className="font-mono text-xs text-[var(--text-secondary)] shrink-0 tabular-nums">
        {formatTimeStr(slot.startTime)} – {formatTimeMs(endMs)}
      </span>

      {/* Label */}
      <span className={cn("text-sm font-medium flex-1 truncate", SIMPLE_CARD_TEXT[slot.type] ?? SIMPLE_CARD_TEXT.CUSTOM)}>
        {slot.label}
      </span>

      {/* Duration */}
      <span className={cn("text-xs tabular-nums shrink-0", SIMPLE_CARD_TEXT[slot.type] ?? SIMPLE_CARD_TEXT.CUSTOM, "opacity-70")}>
        {slot.durationMinutes} min
      </span>

      {/* Delete button */}
      <button
        onClick={() => onDelete(slot.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-secondary)] hover:text-red-500 shrink-0"
        title="Smazat"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── ScheduleBuilder ────────────────────────────────────────────────────────────

export function ScheduleBuilder({ competitionId, competition, restrictedEdit = false, onFloorControl, activeFloor }: ScheduleBuilderProps) {
  const { toast } = useToast();
  const { slots, isDirty, isGenerating, scheduleStatus, moveSlot, generateSchedule, publishSchedule, removeSlot } = useScheduleStore();
  const [breakAfterSlotId, setBreakAfterSlotId] = useState<string | null>(null);
  const [isDrawingAll, setIsDrawingAll] = useState(false);

  const { data: sections = [] } = useQuery<SectionDto[]>({
    queryKey: ["sections", competitionId, "list"],
    queryFn: () => apiClient.get(`/competitions/${competitionId}/sections`).then((r) => r.data),
  });

  // Competition config — with sensible defaults
  const danceDurationSec = competition?.danceDurationSeconds ?? 90;
  const transitionSec = competition?.transitionDurationSeconds ?? 30;
  const maxPairsOnFloor = competition?.maxPairsOnFloor ?? 8;

  // sectionId → full dance names
  const sectionDanceNames = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const s of sections) {
      const configured = (s.dances ?? [])
        .sort((a, b) => (a.danceOrder ?? a.orderIndex ?? 0) - (b.danceOrder ?? b.orderIndex ?? 0))
        .map((d) => d.danceName ?? d.name ?? "")
        .filter(Boolean);

      const style = (s.danceStyle ?? "").toUpperCase();
      if (configured.length >= 5) {
        map.set(s.id, configured);
      } else if (style.includes("STANDARD")) {
        map.set(s.id, STANDARD_5);
      } else if (style.includes("LATIN")) {
        map.set(s.id, LATIN_5);
      } else if (configured.length > 0) {
        map.set(s.id, configured);
      } else {
        map.set(s.id, []);
      }
    }
    return map;
  }, [sections]);

  // sectionId → dance count (for rendering when names unavailable)
  const sectionDanceCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sections) {
      const configured = (s.dances ?? []).length;
      const style = (s.danceStyle ?? "").toUpperCase();
      map.set(s.id, configured >= 5 ? configured : (style.includes("STANDARD") || style.includes("LATIN")) ? 5 : configured);
    }
    return map;
  }, [sections]);

  // slotId → advancing count (from next round in same section)
  const advancingCounts = useMemo(() => {
    const map = new Map<string, number | null>();
    const roundSlots = slots.filter((s) => s.type === "ROUND" && s.sectionId);
    for (let i = 0; i < roundSlots.length; i++) {
      const current = roundSlots[i];
      const next = roundSlots.find((s, j) => j > i && s.sectionId === current.sectionId);
      map.set(current.id, next ? parsePairCount(next.label) : null);
    }
    return map;
  }, [slots]);

  // slotId → whether heat draw is allowed
  // Round 1: always allowed. Round 2+: only when previous round (same section) is COMPLETED.
  const drawAllowedMap = useMemo(() => {
    const map = new Map<string, boolean>();
    const roundSlots = slots.filter((s) => s.type === "ROUND" && s.sectionId);
    for (const slot of roundSlots) {
      if (!slot.roundNumber || slot.roundNumber <= 1) {
        map.set(slot.id, true);
      } else {
        const prevRoundNumber = (slot.roundNumber ?? 0) - 1;
        const prev = roundSlots.find(
          (s) => s.sectionId === slot.sectionId && s.roundNumber === prevRoundNumber
        );
        map.set(slot.id, prev?.liveStatus === "COMPLETED");
      }
    }
    return map;
  }, [slots]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = slots.findIndex((s) => s.id === active.id);
    const newIndex = slots.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    // In restricted edit, block reordering of COMPLETED/RUNNING slots
    if (restrictedEdit) {
      const movingSlot = slots[oldIndex];
      const targetSlot = slots[newIndex];
      if (movingSlot.liveStatus !== "NOT_STARTED" || targetSlot.liveStatus !== "NOT_STARTED") return;
    }
    moveSlot(competitionId, String(active.id), newIndex);
  }, [slots, competitionId, moveSlot, restrictedEdit]);

  const handleDelete = useCallback((slotId: string) => {
    if (restrictedEdit) {
      const slot = slots.find((s) => s.id === slotId);
      if (slot && slot.liveStatus !== "NOT_STARTED") return;
    }
    removeSlot(competitionId, slotId);
  }, [competitionId, removeSlot, restrictedEdit, slots]);

  const firstRoundSlots = useMemo(() =>
    slots.filter((s) => s.type === "ROUND" && s.sectionId && (s.roundNumber == null || s.roundNumber <= 1)),
    [slots]
  );

  const handleDrawAll = async () => {
    if (firstRoundSlots.length === 0) return;
    setIsDrawingAll(true);
    let ok = 0;
    let failed = 0;
    for (const slot of firstRoundSlots) {
      try {
        await scheduleApi.drawHeats(competitionId, slot.id);
        ok++;
      } catch {
        failed++;
      }
    }
    setIsDrawingAll(false);
    if (failed === 0) {
      toast({ title: `Losování dokončeno (${ok} kol)`, variant: "success" });
    } else {
      toast({ title: `Losování: ${ok} ok, ${failed} selhalo`, variant: "destructive" });
    }
  };

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
        <Button onClick={() => generateSchedule(competitionId)} loading={isGenerating} className="gap-2">
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
          <span className="text-sm text-[var(--text-secondary)]">{slots.length} bloků</span>
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
          <Button variant="outline" size="sm" onClick={() => generateSchedule(competitionId)} loading={isGenerating}>
            ↺ Přegenerovat
          </Button>
          {firstRoundSlots.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleDrawAll} loading={isDrawingAll} className="gap-1.5">
              <Shuffle className="h-3.5 w-3.5" />
              Losovat vše
            </Button>
          )}
          <Button size="sm" onClick={handlePublish} disabled={isPublished && !isDirty} className="gap-2">
            <Globe className="h-4 w-4" />
            {isPublished ? "Aktualizovat" : "Publikovat"}
          </Button>
        </div>
      </div>

      {/* Slot list */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={slots.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {slots.map((slot) => {
              if (slot.type === "ROUND") {
                return (
                  <RoundCard
                    key={slot.id}
                    slot={slot}
                    competitionId={competitionId}
                    danceNames={slot.sectionId ? (sectionDanceNames.get(slot.sectionId) ?? []) : []}
                    danceCount={slot.sectionId ? (sectionDanceCounts.get(slot.sectionId) ?? 0) : 0}
                    advancingCount={advancingCounts.get(slot.id) ?? null}
                    danceDurationSec={danceDurationSec}
                    transitionSec={transitionSec}
                    maxPairsOnFloor={maxPairsOnFloor}
                    drawAllowed={drawAllowedMap.get(slot.id) ?? false}
                    onAddBreakAfter={setBreakAfterSlotId}
                    onFloorControl={onFloorControl}
                    activeFloor={activeFloor}
                  />
                );
              }
              return (
                <SimpleCard
                  key={slot.id}
                  slot={slot}
                  competitionId={competitionId}
                  onDelete={handleDelete}
                />
              );
            })}
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
