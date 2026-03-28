"use client";

import { useEffect, useState } from "react";
import { getCategoryColor, getCategoryBorder, getCategoryDot } from "@/lib/category-colors";
import type { ScheduleSlot } from "@/lib/api/schedule";

interface Props {
  slots: ScheduleSlot[];
  sectionIds: string[];
  sectionNames: Map<string, string>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function msOf(iso: string): number {
  return new Date(iso).getTime();
}

function toHHMM(ms: number): string {
  return new Date(ms).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
}

function getNowMs(): number {
  return Date.now();
}

// ── Display segment model ─────────────────────────────────────────────────────

type DisplaySegment =
  | { kind: "category"; sectionId: string; startMs: number; endMs: number; state: "done" | "running" | "future" }
  | { kind: "break"; startMs: number; endMs: number };

/**
 * Merge all rounds of the same section into one category block.
 * Breaks between sections stay as-is.
 * Breaks inside a section (between its rounds) are swallowed into the category span.
 */
function buildDisplaySegments(slots: ScheduleSlot[]): DisplaySegment[] {
  if (slots.length === 0) return [];

  // Compute per-section span + status
  const spans = new Map<string, { startMs: number; endMs: number; hasRunning: boolean; allDone: boolean }>();
  for (const sl of slots) {
    if (sl.type !== "ROUND" || !sl.sectionId) continue;
    const start = msOf(sl.startTime);
    const end   = start + sl.durationMinutes * 60_000;
    const prev  = spans.get(sl.sectionId);
    if (!prev) {
      spans.set(sl.sectionId, {
        startMs: start, endMs: end,
        hasRunning: sl.liveStatus === "RUNNING",
        allDone: sl.liveStatus === "COMPLETED",
      });
    } else {
      spans.set(sl.sectionId, {
        startMs: Math.min(prev.startMs, start),
        endMs:   Math.max(prev.endMs, end),
        hasRunning: prev.hasRunning || sl.liveStatus === "RUNNING",
        allDone:    prev.allDone    && sl.liveStatus === "COMPLETED",
      });
    }
  }

  // Walk slots in order; emit category block at first appearance, skip subsequent rounds of same section
  const emitted = new Set<string>();
  const result: DisplaySegment[] = [];

  for (const sl of slots) {
    const isBreak = sl.type === "BREAK" || sl.type === "JUDGE_BREAK";

    if (isBreak) {
      // Only emit if not "inside" a category span
      const startMs = msOf(sl.startTime);
      const endMs   = startMs + sl.durationMinutes * 60_000;
      const absorbed = result.some(
        (seg) => seg.kind === "category" && seg.startMs <= startMs && seg.endMs >= endMs
      );
      if (!absorbed) result.push({ kind: "break", startMs, endMs });
      continue;
    }

    if (sl.type !== "ROUND" || !sl.sectionId) continue;
    if (emitted.has(sl.sectionId)) continue;
    emitted.add(sl.sectionId);

    const span = spans.get(sl.sectionId)!;
    const state = span.hasRunning ? "running" : span.allDone ? "done" : "future";
    result.push({ kind: "category", sectionId: sl.sectionId, ...span, state });
  }

  // Sort by startMs so order matches timeline
  result.sort((a, b) => a.startMs - b.startMs);
  return result;
}

function hourTicks(
  totalStartMs: number,
  totalEndMs: number
): Array<{ pct: number; label: string }> {
  const totalMs = totalEndMs - totalStartMs;
  if (totalMs <= 0) return [];
  const ticks: Array<{ pct: number; label: string }> = [];
  const startMin = Math.floor(totalStartMs / 60_000);
  const firstHour = Math.ceil(startMin / 60) * 60;
  for (let tickMin = firstHour; tickMin * 60_000 <= totalEndMs; tickMin += 60) {
    const tickMs = tickMin * 60_000;
    const pct    = ((tickMs - totalStartMs) / totalMs) * 100;
    if (pct < 0 || pct > 100) continue;
    ticks.push({ pct, label: toHHMM(tickMs) });
  }
  return ticks;
}

// ── Segment component ─────────────────────────────────────────────────────────

function CategorySeg({
  seg,
  widthPct,
  colorIdx,
  name,
}: {
  seg: Extract<DisplaySegment, { kind: "category" }>;
  widthPct: number;
  colorIdx: number;
  name: string;
}) {
  const { state } = seg;
  const bg     = getCategoryColor(colorIdx, state);
  const border = getCategoryBorder(colorIdx, state);
  const isRunning = state === "running";

  return (
    <div
      title={`${toHHMM(seg.startMs)} – ${toHHMM(seg.endMs)} · ${name}`}
      className="relative flex-shrink-0 overflow-hidden"
      style={{
        width: `${widthPct}%`,
        height: "100%",
        background: bg,
        borderRadius: 6,
        border: `1px solid ${border}`,
        borderLeft: isRunning ? `3px solid ${border}` : `1px solid ${border}`,
      }}
    >
      {/* Shimmer */}
      {isRunning && (
        <div
          className="pointer-events-none absolute inset-y-0 w-1/2"
          style={{
            background: "linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent)",
            animation: "shimmer 2.2s cubic-bezier(.4,0,.6,1) infinite",
          }}
        />
      )}

      {/* Start time */}
      {widthPct >= 1.5 && (
        <div
          className="absolute left-2 top-1.5 text-[9px] font-bold leading-none tabular-nums pointer-events-none"
          style={{
            fontFamily: "var(--font-sora)",
            color: isRunning ? "rgba(255,255,255,.85)"
                 : state === "done" ? "rgba(255,255,255,.5)"
                 : "rgba(255,255,255,.4)",
          }}
        >
          {toHHMM(seg.startMs)}
        </div>
      )}

      {/* Category name */}
      {widthPct >= 5 && (
        <div
          className="absolute bottom-2 left-2 right-2 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-semibold leading-none pointer-events-none"
          style={{
            fontFamily: "var(--font-sora)",
            color: isRunning ? "#fff"
                 : state === "done" ? "rgba(255,255,255,.65)"
                 : "rgba(255,255,255,.6)",
          }}
        >
          {name}
        </div>
      )}
    </div>
  );
}

function BreakSeg({ widthPct }: { widthPct: number }) {
  return (
    <div
      className="relative flex-shrink-0"
      style={{
        width: `${widthPct}%`,
        height: "100%",
        background: "rgba(255,255,255,0.03)",
        borderRadius: 4,
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CompetitionTimeline({ slots, sectionIds, sectionNames }: Props) {
  const [nowMs, setNowMs] = useState(getNowMs);

  useEffect(() => {
    const id = setInterval(() => setNowMs(getNowMs()), 30_000);
    return () => clearInterval(id);
  }, []);

  const segments = buildDisplaySegments(slots);
  if (segments.length === 0) return null;

  const totalStartMs = segments[0].startMs;
  const totalEndMs   = segments[segments.length - 1].endMs;
  const totalMs      = totalEndMs - totalStartMs;
  if (totalMs <= 0) return null;

  const nowPct =
    nowMs >= totalStartMs && nowMs <= totalEndMs
      ? ((nowMs - totalStartMs) / totalMs) * 100
      : null;

  const ticks = hourTicks(totalStartMs, totalEndMs);

  const visibleSections = segments
    .filter((s): s is Extract<DisplaySegment, { kind: "category" }> => s.kind === "category")
    .map((s) => s.sectionId);

  return (
    <div className="px-5 pt-4 pb-5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-bold uppercase tracking-[.8px]"
          style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-sora)" }}
        >
          Harmonogram dne
        </span>
        <span
          className="text-[11px] font-bold tabular-nums"
          style={{ color: "var(--text-secondary)", fontFamily: "var(--font-sora)" }}
        >
          {toHHMM(totalStartMs)} – {toHHMM(totalEndMs)}
        </span>
      </div>

      {/* Bar */}
      <div className="relative w-full overflow-visible" style={{ height: 52 }}>
        <div className="absolute inset-0 flex gap-px overflow-hidden rounded-md">
          {segments.map((seg, i) => {
            const widthPct = ((seg.endMs - seg.startMs) / totalMs) * 100;
            if (seg.kind === "break") return <BreakSeg key={i} widthPct={widthPct} />;
            const colorIdx = sectionIds.indexOf(seg.sectionId);
            const name     = sectionNames.get(seg.sectionId) ?? seg.sectionId;
            return (
              <CategorySeg
                key={seg.sectionId}
                seg={seg}
                widthPct={widthPct}
                colorIdx={colorIdx >= 0 ? colorIdx : i}
                name={name}
              />
            );
          })}
        </div>

        {/* NowLine */}
        {nowPct !== null && (
          <div
            className="pointer-events-none absolute inset-y-0 z-10"
            style={{ left: `clamp(0%, ${nowPct}%, 100%)` }}
          >
            <div
              className="absolute bottom-[calc(100%+3px)] whitespace-nowrap rounded px-1.5 py-px text-[9px] font-extrabold"
              style={{
                fontFamily: "var(--font-sora)",
                color: "#fff",
                background: "rgba(255,255,255,0.18)",
                backdropFilter: "blur(4px)",
                // shift label left when near right edge
                left: nowPct > 90 ? "auto" : "50%",
                right: nowPct > 90 ? 0 : "auto",
                transform: nowPct > 90 ? "none" : "translateX(-50%)",
              }}
            >
              {toHHMM(nowMs)}
            </div>
            <div
              className="absolute inset-y-0 w-px"
              style={{ background: "#fff", boxShadow: "0 0 6px rgba(255,255,255,0.5)" }}
            />
          </div>
        )}
      </div>

      {/* Time axis */}
      <div className="relative w-full h-4">
        {ticks.map((t) => (
          <div
            key={t.pct}
            className="absolute flex flex-col items-center"
            style={{ left: `${t.pct}%`, transform: "translateX(-50%)" }}
          >
            <div className="w-px h-1.5 bg-[var(--border)]" />
            <span
              className="text-[9px] tabular-nums mt-0.5"
              style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-sora)" }}
            >
              {t.label}
            </span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-0.5">
        {visibleSections.map((sectionId) => {
          const idx  = sectionIds.indexOf(sectionId);
          const name = sectionNames.get(sectionId) ?? sectionId;
          return (
            <div key={sectionId} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: getCategoryDot(idx >= 0 ? idx : 0) }}
              />
              <span
                className="text-[10px] font-medium"
                style={{ color: "var(--text-secondary)", fontFamily: "var(--font-sora)" }}
              >
                {name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
