"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, PlayCircle, CheckCircle2, Trophy, Pause, Users } from "lucide-react";
import { scheduleApi, type ScheduleSlot, type BlockLiveStatus } from "@/lib/api/schedule";
import { useSSE } from "@/hooks/use-sse";
import { useScheduleStore } from "@/store/schedule-store";
import { cn } from "@/lib/utils";

interface ScheduleTimelineProps {
  competitionId: string;
  role?: "organizer" | "dancer" | "judge" | "public";
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "--:--";
  }
}

function formatCountdown(ms: number): string {
  const totalMins = Math.floor(ms / 60000);
  if (totalMins <= 0) return "právě teď";
  if (totalMins < 60) return `za ${totalMins} min`;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return m > 0 ? `za ${h}h ${m}min` : `za ${h}h`;
}

const BLOCK_COLORS: Record<string, string> = {
  ROUND: "border-l-blue-400",
  BREAK: "border-l-gray-300 dark:border-l-gray-600",
  JUDGE_BREAK: "border-l-purple-400",
  AWARD_CEREMONY: "border-l-amber-400",
  CUSTOM: "border-l-gray-400",
};

const BLOCK_BG: Record<string, string> = {
  ROUND: "bg-[var(--surface)]",
  BREAK: "bg-[var(--surface-secondary)]",
  JUDGE_BREAK: "bg-purple-50 dark:bg-purple-950/30",
  AWARD_CEREMONY: "bg-amber-50 dark:bg-amber-950/30",
  CUSTOM: "bg-[var(--surface)]",
};

function BlockIcon({ type }: { type: string }) {
  if (type === "BREAK") return <Pause className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />;
  if (type === "JUDGE_BREAK") return <Pause className="h-3.5 w-3.5 text-purple-500" />;
  if (type === "AWARD_CEREMONY") return <Trophy className="h-3.5 w-3.5 text-amber-500" />;
  return null;
}

function LiveStatusBadge({ status }: { status: BlockLiveStatus }) {
  if (status === "RUNNING") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded px-1.5 py-0.5">
        <PlayCircle className="h-3 w-3 animate-pulse" />
        Probíhá
      </span>
    );
  }
  if (status === "COMPLETED") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--text-tertiary)]">
        <CheckCircle2 className="h-3 w-3" />
        Hotovo
      </span>
    );
  }
  return null;
}

interface TimelineBlockProps {
  slot: ScheduleSlot;
  role: string;
  mySectionIds: string[];
  now: Date;
}

function TimelineBlock({ slot, role, mySectionIds, now }: TimelineBlockProps) {
  const blockStart = new Date(slot.startTime);
  const blockEnd = new Date(blockStart.getTime() + slot.durationMinutes * 60000);
  const isCompleted = slot.liveStatus === "COMPLETED";
  const isRunning = slot.liveStatus === "RUNNING";
  const msUntil = blockStart.getTime() - now.getTime();
  const isUpcoming = msUntil > 0 && msUntil < 15 * 60000;
  const isMine = slot.sectionId ? mySectionIds.includes(slot.sectionId) : false;

  // Judge role: show only ROUND blocks
  if (role === "judge" && slot.type !== "ROUND") return null;

  return (
    <div
      className={cn(
        "relative border-l-4 rounded-r-xl px-4 py-3 transition-all",
        BLOCK_COLORS[slot.type] ?? BLOCK_COLORS.ROUND,
        BLOCK_BG[slot.type] ?? BLOCK_BG.ROUND,
        isCompleted && "opacity-40",
        isRunning && "ring-1 ring-green-400 dark:ring-green-600 shadow-sm",
        isUpcoming && !isRunning && !isCompleted && "ring-1 ring-[var(--accent)] shadow-sm animate-pulse",
        isMine && !isCompleted && "ring-1 ring-amber-400 dark:ring-amber-600"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <BlockIcon type={slot.type} />
            <span className={cn(
              "text-sm font-medium",
              isCompleted ? "text-[var(--text-tertiary)] line-through" : "text-[var(--text-primary)]"
            )}>
              {slot.label}
            </span>
            {isMine && (
              <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded font-semibold">
                Nastupuješ
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)] font-mono">
              <Clock className="h-3 w-3" />
              {formatTime(slot.startTime)} – {formatTime(blockEnd.toISOString())}
            </span>
            <span className="text-xs text-[var(--text-tertiary)]">{slot.durationMinutes} min</span>

            {role !== "judge" && role !== "public" && slot.type === "ROUND" && slot.roundNumber != null && (
              <span className="text-xs text-[var(--text-tertiary)]">Kolo {slot.roundNumber}</span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <LiveStatusBadge status={slot.liveStatus} />
          {isUpcoming && !isRunning && !isCompleted && (
            <span className="text-[10px] text-[var(--accent)] font-medium">
              {formatCountdown(msUntil)}
            </span>
          )}
          {isMine && isUpcoming && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
              {formatCountdown(msUntil)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function ScheduleTimeline({ competitionId, role = "public" }: ScheduleTimelineProps) {
  const { slots, setSlots, setScheduleStatus, setSlotsHash, slotsHash } = useScheduleStore();
  const nowRef = useRef(new Date());

  // Refresh now every minute
  useEffect(() => {
    const id = setInterval(() => {
      nowRef.current = new Date();
    }, 60000);
    return () => clearInterval(id);
  }, []);

  const { data: loadedSlots, isLoading } = useQuery({
    queryKey: ["schedule", competitionId],
    queryFn: () => scheduleApi.list(competitionId),
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (loadedSlots) setSlots(loadedSlots);
  }, [loadedSlots, setSlots]);

  // My sections for dancer role
  const { data: mySectionsData } = useQuery({
    queryKey: ["my-sections", competitionId],
    queryFn: () => scheduleApi.getMySections(competitionId),
    enabled: role === "dancer",
    retry: false,
  });
  const mySectionIds: string[] = mySectionsData?.sectionIds ?? [];

  // SSE: schedule-updated
  useSSE(competitionId, "schedule-updated", (data: { status: string; slotsHash?: string }) => {
    if (data.status === "PUBLISHED") {
      setScheduleStatus("PUBLISHED");
      // Only refetch if hash changed
      if (!data.slotsHash || data.slotsHash !== slotsHash) {
        scheduleApi.list(competitionId).then(setSlots);
      }
    }
  });

  // SSE: block-status-changed
  useSSE(competitionId, "block-status-changed", (data: { slotId: string; liveStatus: BlockLiveStatus }) => {
    const updated = slots.map((s) =>
      s.id === data.slotId ? { ...s, liveStatus: data.liveStatus } : s
    );
    setSlots(updated);
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-16 rounded-xl border-l-4 border-l-[var(--border)] bg-[var(--surface)] animate-pulse" />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] py-16 text-center">
        <Clock className="h-10 w-10 text-[var(--text-tertiary)] mx-auto mb-3" />
        <p className="text-sm text-[var(--text-secondary)]">Harmonogram zatím není k dispozici.</p>
      </div>
    );
  }

  const now = nowRef.current;

  // Find current red-line position
  const runningSlot = slots.find((s) => s.liveStatus === "RUNNING");
  const nextSlot = slots.find((s) => {
    const start = new Date(s.startTime).getTime();
    return s.liveStatus === "NOT_STARTED" && start > now.getTime();
  });

  return (
    <div className="space-y-1.5">
      {slots.map((slot, idx) => {
        const isBeforeNow = new Date(slot.startTime).getTime() < now.getTime();
        const showRedLine =
          runningSlot?.id === slot.id ||
          (!runningSlot && nextSlot?.id === slot.id);

        return (
          <div key={slot.id} className="relative">
            {showRedLine && !runningSlot && (
              <div className="absolute -top-px left-0 right-0 h-px bg-red-500 z-10" />
            )}
            <TimelineBlock
              slot={slot}
              role={role}
              mySectionIds={mySectionIds}
              now={now}
            />
          </div>
        );
      })}
    </div>
  );
}
