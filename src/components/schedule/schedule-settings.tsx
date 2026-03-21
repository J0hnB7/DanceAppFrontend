"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { scheduleConfigApi, type ScheduleConfig } from "@/lib/api/schedule";
import { useScheduleStore } from "@/store/schedule-store";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ScheduleSettingsProps {
  competitionId: string;
  initialConfig?: {
    scheduleStartTime?: string;
    danceDurationSeconds?: number;
    transitionDurationSeconds?: number;
    maxPairsOnFloor?: number;
    breakDurationMinutes?: number;
    breakRule?: "AFTER_ROUND" | "BETWEEN_CATEGORIES" | "BOTH";
    judgeBreakAfterMinutes?: number;
    judgeBreakDurationMinutes?: number;
    slotBufferMinutes?: number;
  };
  onRegenerateRequest?: () => void;
}

const DANCE_DURATION_OPTIONS = [
  { value: 60, label: "1 min" },
  { value: 90, label: "1:30 min" },
  { value: 120, label: "2 min" },
  { value: 150, label: "2:30 min" },
  { value: 180, label: "3 min" },
];

const TRANSITION_OPTIONS = [
  { value: 0, label: "0 sek" },
  { value: 15, label: "15 sek" },
  { value: 30, label: "30 sek" },
  { value: 45, label: "45 sek" },
  { value: 60, label: "60 sek" },
];

const MAX_PAIRS_OPTIONS = [4, 6, 8, 10, 12, 16];
const BREAK_DURATION_OPTIONS = [5, 10, 15, 20, 30];
const JUDGE_BREAK_DURATION_OPTIONS = [5, 10, 15, 20];
const JUDGE_BREAK_AFTER_OPTIONS = [
  { value: 0, label: "Vypnuto" },
  { value: 60, label: "60 min" },
  { value: 90, label: "90 min" },
  { value: 120, label: "120 min" },
];
const BUFFER_OPTIONS = [0, 5, 10, 15, 20, 30];

function timeToLocal(isoOrNull?: string) {
  if (!isoOrNull) return "09:00";
  try {
    const d = new Date(isoOrNull);
    return d.toTimeString().slice(0, 5);
  } catch {
    return "09:00";
  }
}

function buildStartTimeISO(timeStr: string): string {
  const today = new Date();
  const [h, m] = timeStr.split(":").map(Number);
  today.setHours(h, m, 0, 0);
  return today.toISOString();
}

export function ScheduleSettings({
  competitionId,
  initialConfig,
  onRegenerateRequest,
}: ScheduleSettingsProps) {
  const { toast } = useToast();
  const { scheduleStatus } = useScheduleStore();

  const [config, setConfig] = useState<ScheduleConfig>({
    danceDurationSeconds: initialConfig?.danceDurationSeconds ?? 120,
    transitionDurationSeconds: initialConfig?.transitionDurationSeconds ?? 30,
    maxPairsOnFloor: initialConfig?.maxPairsOnFloor ?? 8,
    breakDurationMinutes: initialConfig?.breakDurationMinutes ?? 15,
    breakRule: initialConfig?.breakRule ?? "BETWEEN_CATEGORIES",
    judgeBreakAfterMinutes: initialConfig?.judgeBreakAfterMinutes ?? 90,
    judgeBreakDurationMinutes: initialConfig?.judgeBreakDurationMinutes ?? 10,
    slotBufferMinutes: initialConfig?.slotBufferMinutes ?? 5,
  });
  const [startTime, setStartTime] = useState(timeToLocal(initialConfig?.scheduleStartTime));

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      scheduleConfigApi.update(competitionId, {
        ...config,
        scheduleStartTime: buildStartTimeISO(startTime),
      }),
    onSuccess: () => {
      toast({ title: "Nastavení uloženo", variant: "success" });
    },
    onError: () => {
      toast({ title: "Chyba při ukládání", variant: "destructive" });
    },
  });

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-5 max-w-lg">
      <h2 className="text-base font-semibold text-[var(--text-primary)]">Nastavení harmonogramu</h2>

      {scheduleStatus === "PUBLISHED" && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200">
          ⚠ Harmonogram je publikován. Změna vyžaduje nové vygenerování.
        </div>
      )}

      {/* Start time */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[var(--text-secondary)]">Začátek soutěže</label>
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Dance duration */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]">Délka tance</label>
          <select
            value={config.danceDurationSeconds}
            onChange={(e) => setConfig((c) => ({ ...c, danceDurationSeconds: Number(e.target.value) }))}
            className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            {DANCE_DURATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Transition */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]">Nástup/odchod (rezerva)</label>
          <select
            value={config.transitionDurationSeconds}
            onChange={(e) => setConfig((c) => ({ ...c, transitionDurationSeconds: Number(e.target.value) }))}
            className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            {TRANSITION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Max pairs */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]">Max párů na parketu</label>
          <select
            value={config.maxPairsOnFloor}
            onChange={(e) => setConfig((c) => ({ ...c, maxPairsOnFloor: Number(e.target.value) }))}
            className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            {MAX_PAIRS_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {/* Break duration */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]">Délka pauzy</label>
          <select
            value={config.breakDurationMinutes}
            onChange={(e) => setConfig((c) => ({ ...c, breakDurationMinutes: Number(e.target.value) }))}
            className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            {BREAK_DURATION_OPTIONS.map((n) => (
              <option key={n} value={n}>{n} min</option>
            ))}
          </select>
        </div>
      </div>

      {/* Break rule */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-[var(--text-secondary)]">Vkládat pauzu</label>
        {(["AFTER_ROUND", "BETWEEN_CATEGORIES", "BOTH"] as const).map((rule) => (
          <label key={rule} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="breakRule"
              value={rule}
              checked={config.breakRule === rule}
              onChange={() => setConfig((c) => ({ ...c, breakRule: rule }))}
              className="accent-[var(--accent)]"
            />
            <span className="text-sm text-[var(--text-primary)]">
              {rule === "AFTER_ROUND" && "Po každém kole"}
              {rule === "BETWEEN_CATEGORIES" && "Mezi kategoriemi"}
              {rule === "BOTH" && "Obojí"}
            </span>
          </label>
        ))}
      </div>

      {/* Judge break */}
      <div className="rounded-lg border border-[var(--border)] p-4 space-y-3">
        <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Pauzy pro porotce</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">Navrhnout pauzu po</label>
            <select
              value={config.judgeBreakAfterMinutes}
              onChange={(e) => setConfig((c) => ({ ...c, judgeBreakAfterMinutes: Number(e.target.value) }))}
              className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              {JUDGE_BREAK_AFTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">Délka pauzy</label>
            <select
              value={config.judgeBreakDurationMinutes}
              onChange={(e) => setConfig((c) => ({ ...c, judgeBreakDurationMinutes: Number(e.target.value) }))}
              className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              {JUDGE_BREAK_DURATION_OPTIONS.map((n) => (
                <option key={n} value={n}>{n} min</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Slot buffer */}
      <div className="rounded-lg border border-[var(--border)] p-4 space-y-2">
        <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Rezerva na zpoždění</p>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]">
            Buffer za každým kolem: {config.slotBufferMinutes} min (0–30 min)
          </label>
          <select
            value={config.slotBufferMinutes}
            onChange={(e) => setConfig((c) => ({ ...c, slotBufferMinutes: Number(e.target.value) }))}
            className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            {BUFFER_OPTIONS.map((n) => (
              <option key={n} value={n}>{n} min</option>
            ))}
          </select>
          <p className="text-xs text-[var(--text-tertiary)]">
            Reálné soutěže vždy nabíhají zpoždění. Buffer se přičítá ke každému bloku jako záchrana.
          </p>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button onClick={() => mutate()} loading={isPending}>
          Uložit
        </Button>
        {onRegenerateRequest && (
          <Button variant="outline" onClick={onRegenerateRequest} loading={isPending}>
            ⟳ Přegenerovat
          </Button>
        )}
      </div>
    </div>
  );
}
