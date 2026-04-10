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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import type { SectionDto } from "@/lib/api/sections";
import type { CompetitionDto } from "@/lib/api/competitions";
import { useLocale } from "@/contexts/locale-context";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ScheduleBuilderProps {
  competitionId: string;
  competition?: CompetitionDto;
  /** In restricted mode, COMPLETED and RUNNING slots cannot be dragged or deleted */
  restrictedEdit?: boolean;
  onFloorControl?: (danceName: string, heatNumber: number) => void;
  activeFloor?: { danceName: string; heatNumber: number } | null;
  /** Rendered between toolbar and slot list */
  headerSlot?: React.ReactNode;
  /** Hide the toolbar (Přegenerovat / Losovat vše / Publikovat) */
  hideToolbar?: boolean;
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

/** Vraci end timestamp (ms) z ISO startTime a durationMinutes. */
function computeEndTime(startTime: string, durationMinutes: number): number {
  return new Date(startTime).getTime() + durationMinutes * 60_000;
}

/** Odstrani "(N paru)" suffix z labelu slotu. */
function cleanLabel(label: string): string {
  return label.replace(/\s*\(\d+\s*pár[ůy]?\)/i, "").trim();
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
  const { t } = useLocale();
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
    <SimpleDialog open={!!afterSlotId} onClose={onClose} title={t("scheduleBuilder.breakDialogTitle")}>
      <div className="space-y-4 pt-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]">{t("scheduleBuilder.breakDialogDuration")}</label>
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
          <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={handleAdd} loading={loading}>
            <Plus className="h-4 w-4 mr-1.5" />
            {t("common.add")}
          </Button>
        </div>
      </div>
    </SimpleDialog>
  );
}

// ── Heat Pairs Row ─────────────────────────────────────────────────────────────

function HeatPairsRow({ heat, totalHeats }: { heat: HeatAssignmentGroup; totalHeats: number }) {
  const { t } = useLocale();
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
            {t("scheduleBuilder.heatGroupName", { n: heat.heatNumber })}
          </span>
          <span className="text-xs text-[var(--text-tertiary)]">
            {t("scheduleBuilder.pairsCount", { n: heat.pairs.length })}
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
  const { t } = useLocale();
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
    enabled: !collapsed,
    staleTime: Infinity,
    retry: false,
  });

  const redraw = useCallback(async () => {
    try {
      await scheduleApi.drawHeats(competitionId, slot.id);
      redrawQuery();
    } catch {
      toast({ title: t("scheduleBuilder.drawError"), variant: "destructive" });
    }
  }, [competitionId, slot.id, redrawQuery, toast, t]);
  const updateStatus = useMutation({
    mutationFn: (status: BlockLiveStatus) => scheduleApi.updateBlockStatus(competitionId, slot.id, status),
    onError: () => toast({ title: t("scheduleBuilder.updateStatusError"), variant: "destructive" }),
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
  const headerEndMs = computeEndTime(slot.startTime, slot.durationMinutes);

  return (
    <div
      className={cn(
        "group bg-[var(--surface)] overflow-hidden transition-all",
        isCompleted && "opacity-50",
        isRunning && "ring-2 ring-green-400 dark:ring-green-600 shadow-md",
      )}
    >
      {/* ── Header ── */}
      <div className="flex items-center min-h-[52px]">
        {/* Expand/collapse — 28px */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex items-center justify-center w-7 shrink-0 self-stretch text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors",
            !collapsed && "rotate-90"
          )}
        >
          <ChevronRight className="h-3 w-3" />
        </button>

        {/* Status dot — 20px, 10px dot for better visibility */}
        <div
          className="w-5 shrink-0 flex items-center justify-center"
          aria-label={isCompleted ? "Dokonceno" : isRunning ? "Probiha" : "Nezahajeno"}
          role="status"
        >
          <div className={cn(
            "w-2.5 h-2.5 rounded-full border-[1.5px]",
            isCompleted && "bg-green-400 border-green-400",
            isRunning && "bg-red-500 border-red-500 animate-pulse",
            !isCompleted && !isRunning && "border-[var(--text-tertiary)] bg-transparent"
          )} />
        </div>

        {/* Block body — two-column layout */}
        <div className="flex-1 flex items-center gap-3 py-3 pr-2 pl-1 min-w-0">
          {/* LEFT: time range */}
          <div className="w-[88px] shrink-0 text-[13px] font-semibold text-[var(--text-secondary)] tabular-nums whitespace-nowrap pt-0.5 text-center">
            {formatTimeStr(slot.startTime)} – {formatTimeMs(headerEndMs)}
          </div>

          {/* RIGHT: content */}
          <div className="flex-1 min-w-0">
            {/* Line 1: name + status badge + round badge */}
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className={cn(
                "text-sm font-bold text-[var(--text-primary)] truncate",
                isCompleted && "line-through text-[var(--text-tertiary)]"
              )}>
                {cleanLabel(slot.label)}
              </span>
              {/* Status badge: COMPLETED */}
              {isCompleted && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 shrink-0">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  {t("scheduleBuilder.roundDoneBadge")}
                </span>
              )}
              {/* Status badge: RUNNING — includes round number */}
              {isRunning && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  {slot.roundNumber != null ? t("scheduleBuilder.roundRunningWithNum", { n: slot.roundNumber }) : t("scheduleBuilder.roundRunningBadge")}
                </span>
              )}
              {/* Round badge — only when NOT running (running badge already includes round number) */}
              {!isRunning && slot.roundNumber != null && (
                <span className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 shrink-0">
                  {t("scheduleBuilder.roundBadge", { n: slot.roundNumber })}
                </span>
              )}
            </div>

            {/* Line 2: metadata */}
            <div className="flex items-center flex-wrap gap-0 text-[11px] text-[var(--text-secondary)]">
              <span>{t("scheduleBuilder.pairsCount", { n: pairCount })}</span>
              <span className="text-[var(--text-tertiary)] mx-1" aria-hidden="true">·</span>
              <span>{heatCount} {heatCount === 1 ? t("scheduleBuilder.heatSingular") : heatCount < 5 ? t("scheduleBuilder.heatPluralFew") : t("scheduleBuilder.heatPluralMany")}</span>
              <span className="text-[var(--text-tertiary)] mx-1" aria-hidden="true">·</span>
              <span>{t("scheduleBuilder.dancesCount", { n: effectiveDances.length })}</span>
              <span className="text-[var(--text-tertiary)] mx-1" aria-hidden="true">·</span>
              <span>{formatDurSec(actualDurationSec)}</span>
              {advancingCount != null && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded-full ml-2">
                  {t("scheduleBuilder.advancingCount", { n: advancingCount })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0 pr-3 pl-2">
          {/* Toggle pairs panel */}
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
            title={drawAllowed ? t("scheduleBuilder.showPairsTitle") : t("scheduleBuilder.drawLockedTitle")}
          >
            <Users className="h-4 w-4" />
          </button>

          <button
              onClick={() => redraw()}
              disabled={isRedrawing || !drawAllowed}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded transition-colors text-xs",
                drawAllowed
                  ? "hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)] disabled:opacity-40"
                  : "text-[var(--text-tertiary)] opacity-30 cursor-not-allowed"
              )}
              title={drawAllowed ? t("scheduleBuilder.redrawTitle") : t("scheduleBuilder.drawLockedTitle")}
            >
              <ArrowRight className={cn("h-3 w-3 rotate-90", isRedrawing && "animate-spin")} />
              {t("scheduleBuilder.drawButton")}
            </button>

          <button
            onClick={() => onAddBreakAfter(slot.id)}
            className="p-1 rounded hover:bg-[var(--surface-secondary)] transition-colors text-[var(--text-secondary)]"
            title={t("scheduleBuilder.addBreakTitle")}
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
                  {t("scheduleBuilder.pairsInHeats")}
                </span>
                <button
                  onClick={() => redraw()}
                  disabled={isRedrawing}
                  className="flex items-center gap-1 text-xs text-[var(--accent)] hover:opacity-70 transition-opacity disabled:opacity-40"
                  title={t("scheduleBuilder.redrawTitle")}
                >
                  <ArrowRight className={cn("h-3 w-3 rotate-90", isRedrawing && "animate-spin")} />
                  {t("scheduleBuilder.redrawButton")}
                </button>
              </div>
              {heatError ? (
                <div className="px-3 py-3 text-xs text-red-500">
                  {t("scheduleBuilder.heatLoadError")}
                </div>
              ) : isRedrawing || !heatAssignments ? (
                <div className="px-3 py-3 text-xs text-[var(--text-tertiary)]">{t("scheduleBuilder.heatLoading")}</div>
              ) : heatAssignments.length === 0 ? (
                <div className="px-3 py-3 text-xs text-[var(--text-tertiary)]">
                  {t("scheduleBuilder.notDrawn")}
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
                        <span className={cn("text-sm flex-1 flex items-center gap-2 min-w-0", isActive ? "text-[var(--accent)] font-semibold" : "text-[var(--text-primary)]")}>
                          <span className="shrink-0">{t("scheduleBuilder.heatGroup", { n: item.num ?? 0 })}</span>
                          {isActive && <span className="text-[10px] font-bold uppercase tracking-widest opacity-70 shrink-0">● {t("scheduleBuilder.onFloor")}</span>}
                          {heatAssignments && heatAssignments.length > 0 && (() => {
                            const heat = heatAssignments.find(h => h.heatNumber === item.num);
                            if (!heat || heat.pairs.length === 0) return null;
                            return (
                              <span className="text-xs text-[var(--text-tertiary)] font-normal truncate">
                                {heat.pairs.map(p => p.startNumber).join(", ")}
                              </span>
                            );
                          })()}
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
                        {t("scheduleBuilder.transition")}
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

function SimpleCard({ slot, competitionId: _competitionId, onDelete }: SimpleCardProps) {
  const { t } = useLocale();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slot.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const isBreak = slot.type === "BREAK" || slot.type === "JUDGE_BREAK";

  const endMs = new Date(slot.startTime).getTime() + slot.durationMinutes * 60000;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center min-h-[44px] rounded-xl border transition-all",
        SIMPLE_CARD_STYLES[slot.type] ?? SIMPLE_CARD_STYLES.CUSTOM,
        isBreak && "border-dashed",
        isDragging && "shadow-lg ring-2 ring-[var(--accent)] opacity-90 z-50",
      )}
    >
      {/* Drag handle — 32px */}
      <div className="flex items-center justify-center w-8 shrink-0 self-stretch">
        <button
          {...attributes} {...listeners}
          className="cursor-grab active:cursor-grabbing text-transparent group-hover:text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] touch-none"
          tabIndex={-1}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>

      {/* Type icon — 28px */}
      <div className="flex items-center justify-center w-7 shrink-0">
        <SimpleCardIcon type={slot.type} />
      </div>

      {/* Block body — two-column */}
      <div className="flex-1 flex items-center gap-3 py-2 pr-2 pl-1 min-w-0">
        {/* LEFT: time */}
        <div className={cn(
          "w-[88px] shrink-0 text-xs font-semibold tabular-nums whitespace-nowrap",
          slot.type === "AWARD_CEREMONY" ? "text-green-400" :
          slot.type === "BREAK" || slot.type === "JUDGE_BREAK" ? "text-amber-400" :
          "text-[var(--text-tertiary)]"
        )}>
          {formatTimeStr(slot.startTime)} – {formatTimeMs(endMs)}
        </div>

        {/* RIGHT: name */}
        <span className={cn(
          "text-sm font-semibold flex-1 truncate",
          SIMPLE_CARD_TEXT[slot.type] ?? SIMPLE_CARD_TEXT.CUSTOM,
        )}>
          {slot.label}
        </span>
      </div>

      {/* Duration badge + delete */}
      <div className="flex items-center gap-1.5 pr-3 shrink-0">
        <span className={cn(
          "text-[10px] font-bold px-2 py-0.5 rounded-full",
          slot.type === "AWARD_CEREMONY" && "bg-green-500/10 text-green-400",
          (slot.type === "BREAK" || slot.type === "JUDGE_BREAK") && "bg-amber-500/10 text-amber-400",
          slot.type === "CUSTOM" && "bg-[var(--surface-secondary)] text-[var(--text-secondary)]",
        )}>
          {slot.durationMinutes} min
        </span>
        <button
          onClick={() => onDelete(slot.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-secondary)] hover:text-red-500 shrink-0"
          title={t("common.delete")}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── ScheduleBuilder ────────────────────────────────────────────────────────────

export function ScheduleBuilder({ competitionId, competition, restrictedEdit = false, onFloorControl, activeFloor, headerSlot, hideToolbar = false }: ScheduleBuilderProps) {
  const { t } = useLocale();
  const { toast } = useToast();
  const queryClient = useQueryClient();
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

  const sectionMap = useMemo(() => {
    const map = new Map<string, SectionDto>();
    for (const s of sections) map.set(s.id, s);
    return map;
  }, [sections]);

  type RenderGroup =
    | { kind: "section"; sectionId: string; rounds: ScheduleSlot[] }
    | { kind: "standalone"; slot: ScheduleSlot };

  const renderGroups = useMemo((): RenderGroup[] => {
    // Collect all rounds per section (non-consecutive rounds of same section stay in one group)
    const sectionRounds = new Map<string, ScheduleSlot[]>();
    for (const slot of slots) {
      if (slot.type === "ROUND" && slot.sectionId) {
        const arr = sectionRounds.get(slot.sectionId) ?? [];
        arr.push(slot);
        sectionRounds.set(slot.sectionId, arr);
      }
    }

    const groups: RenderGroup[] = [];
    const emitted = new Set<string>();
    for (const slot of slots) {
      if (slot.type === "ROUND" && slot.sectionId) {
        if (!emitted.has(slot.sectionId)) {
          emitted.add(slot.sectionId);
          groups.push({ kind: "section", sectionId: slot.sectionId, rounds: sectionRounds.get(slot.sectionId)! });
        }
        // subsequent rounds of same section already included above — skip
      } else {
        groups.push({ kind: "standalone", slot });
      }
    }
    return groups;
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
    // Invalidate heat assignment queries so pairs panels refresh
    queryClient.invalidateQueries({ queryKey: ["heat-assignments", competitionId] });
    if (failed === 0) {
      toast({ title: t("scheduleBuilder.drawComplete", { n: ok }), variant: "success" });
    } else {
      toast({ title: t("scheduleBuilder.drawPartial", { ok, failed }), variant: "destructive" });
    }
  };

  const handlePublish = async () => {
    await publishSchedule(competitionId);
    queryClient.invalidateQueries({ queryKey: ["schedule-status", competitionId] });
    toast({ title: t("scheduleBuilder.schedulePublished"), variant: "success" });
  };

  const isPublished = scheduleStatus === "PUBLISHED";

  if (slots.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] py-16 flex flex-col items-center gap-3">
        <Clock className="h-10 w-10 text-[var(--text-tertiary)]" />
        <p className="text-sm text-[var(--text-secondary)]">{t("scheduleBuilder.noSchedule")}</p>
        <Button onClick={() => generateSchedule(competitionId)} loading={isGenerating} className="gap-2">
          {t("scheduleBuilder.generateButton")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {!hideToolbar && <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-secondary)]">{t("scheduleBuilder.blocks", { n: slots.length })}</span>
          {isDirty && (
            <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {t("scheduleBuilder.unsavedChanges")}
            </span>
          )}
          {isPublished && (
            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {t("scheduleBuilder.published")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => generateSchedule(competitionId)} loading={isGenerating}>
            {t("scheduleBuilder.regenerate")}
          </Button>
          {firstRoundSlots.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleDrawAll} loading={isDrawingAll} className="gap-1.5">
              <Shuffle className="h-3.5 w-3.5" />
              {t("scheduleBuilder.drawAll")}
            </Button>
          )}
          <Button size="sm" onClick={handlePublish} disabled={isPublished && !isDirty} className="gap-2">
            <Globe className="h-4 w-4" />
            {isPublished ? t("scheduleBuilder.updateButton") : t("scheduleBuilder.publishButton")}
          </Button>
        </div>
      </div>}

      {/* Timeline or other header content */}
      {headerSlot}

      {/* Separator */}
      {headerSlot && (
        <div className="flex items-center gap-3 pt-2">
          <div className="h-px flex-1 bg-[var(--border)]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]" style={{ fontFamily: "var(--font-sora)" }}>
            {t("scheduleBuilder.categories")}
          </span>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>
      )}

      {/* Slot list */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={slots.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {renderGroups.map((group, gi) => {
              if (group.kind === "standalone") {
                return (
                  <SimpleCard
                    key={group.slot.id}
                    slot={group.slot}
                    competitionId={competitionId}
                    onDelete={handleDelete}
                  />
                );
              }
              const { sectionId, rounds } = group;
              const section = sectionMap.get(sectionId);
              const firstRound = rounds[0];
              const lastRound = rounds[rounds.length - 1];
              const groupEndMs = new Date(lastRound.startTime).getTime() + lastRound.durationMinutes * 60_000;
              const pairCount = parsePairCount(firstRound.label);
              const isGroupCompleted = rounds.every((s) => s.liveStatus === "COMPLETED");
              const isGroupRunning = rounds.some((s) => s.liveStatus === "RUNNING");
              return (
                <div key={`${sectionId}-${gi}`} className="rounded-xl border border-[var(--border)] overflow-hidden">
                  {/* Section header */}
                  <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[var(--surface-secondary)] border-b border-[var(--border)]">
                    <span className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      isGroupCompleted ? "bg-green-400" : isGroupRunning ? "bg-red-500 animate-pulse" : "bg-[var(--text-tertiary)]"
                    )} />
                    <span className="text-[11px] font-bold tracking-widest uppercase text-[var(--text-primary)]">
                      {section?.name ?? sectionId}
                    </span>
                    <span className="text-[var(--text-tertiary)] text-xs">·</span>
                    <span className="text-xs tabular-nums text-[var(--text-secondary)]">
                      {formatTimeStr(firstRound.startTime)} – {formatTimeMs(groupEndMs)}
                    </span>
                    {pairCount != null && (
                      <>
                        <span className="text-[var(--text-tertiary)] text-xs">·</span>
                        <span className="text-xs text-[var(--text-secondary)]">{t("scheduleBuilder.pairsCount", { n: pairCount })}</span>
                      </>
                    )}
                    <span className="text-[var(--text-tertiary)] text-xs">·</span>
                    <span className="text-xs text-[var(--text-secondary)]">
                      {rounds.length} {rounds.length === 1 ? t("scheduleBuilder.roundSingular") : rounds.length < 5 ? t("scheduleBuilder.roundPluralFew") : t("scheduleBuilder.roundPluralMany")}
                    </span>
                  </div>
                  {/* Rounds */}
                  <div className="divide-y divide-[var(--border)]">
                    {rounds.map((slot) => (
                      <RoundCard
                        key={slot.id}
                        slot={slot}
                        competitionId={competitionId}
                        danceNames={sectionDanceNames.get(sectionId) ?? []}
                        danceCount={sectionDanceCounts.get(sectionId) ?? 0}
                        advancingCount={advancingCounts.get(slot.id) ?? null}
                        danceDurationSec={danceDurationSec}
                        transitionSec={transitionSec}
                        maxPairsOnFloor={maxPairsOnFloor}
                        drawAllowed={drawAllowedMap.get(slot.id) ?? false}
                        onAddBreakAfter={setBreakAfterSlotId}
                        onFloorControl={onFloorControl}
                        activeFloor={activeFloor}
                      />
                    ))}
                  </div>
                </div>
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
