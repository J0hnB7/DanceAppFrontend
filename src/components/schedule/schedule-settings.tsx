"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { scheduleConfigApi, type ScheduleConfig } from "@/lib/api/schedule";
import { useScheduleStore } from "@/store/schedule-store";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/contexts/locale-context";

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
const JUDGE_BREAK_AFTER_VALUES = [
  { value: 0, disabled: true },
  { value: 60, disabled: false },
  { value: 90, disabled: false },
  { value: 120, disabled: false },
];
const BUFFER_OPTIONS = [0, 5, 10, 15, 20, 30];

function timeToLocal(isoOrNull?: string) {
  if (!isoOrNull) return "09:00";
  try {
    // Extract HH:mm from the T-part directly — schedule times are wall-clock, not TZ-aware
    const match = isoOrNull.match(/T(\d{2}:\d{2})/);
    return match ? match[1] : "09:00";
  } catch {
    return "09:00";
  }
}

function buildStartTimeISO(timeStr: string): string {
  // Send as UTC with the literal HH:mm the user typed — avoid toISOString() which would
  // shift the time by the browser's UTC offset (e.g. 07:00 in UTC+1 → 06:00Z → schedule starts at 06:00)
  const [h, m] = timeStr.split(":").map(Number);
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00Z`;
}

export function ScheduleSettings({
  competitionId,
  initialConfig,
  onRegenerateRequest,
}: ScheduleSettingsProps) {
  const { t } = useLocale();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { scheduleStatus, generateSchedule, isGenerating } = useScheduleStore();

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

  // Sync state when competition data loads asynchronously
  useEffect(() => {
    if (initialConfig) {
      setStartTime(timeToLocal(initialConfig.scheduleStartTime));
      setConfig({
        danceDurationSeconds: initialConfig.danceDurationSeconds ?? 120,
        transitionDurationSeconds: initialConfig.transitionDurationSeconds ?? 30,
        maxPairsOnFloor: initialConfig.maxPairsOnFloor ?? 8,
        breakDurationMinutes: initialConfig.breakDurationMinutes ?? 15,
        breakRule: initialConfig.breakRule ?? "BETWEEN_CATEGORIES",
        judgeBreakAfterMinutes: initialConfig.judgeBreakAfterMinutes ?? 90,
        judgeBreakDurationMinutes: initialConfig.judgeBreakDurationMinutes ?? 10,
        slotBufferMinutes: initialConfig.slotBufferMinutes ?? 5,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConfig?.scheduleStartTime, initialConfig?.danceDurationSeconds]);


  const { mutate, isPending } = useApiMutation({
    mutationFn: () =>
      scheduleConfigApi.update(competitionId, {
        ...config,
        scheduleStartTime: buildStartTimeISO(startTime),
      }),
    onSuccess: async () => {
      // Invalidate competition cache so ScheduleBuilder picks up new maxPairsOnFloor etc.
      await queryClient.invalidateQueries({ queryKey: ["competition", competitionId] });
      // Regenerate schedule with updated config
      await generateSchedule(competitionId);
      toast({ title: t("scheduleSettings.saved"), variant: "success" });
      onRegenerateRequest?.();
    },
    onError: () => {
      toast({ title: t("scheduleSettings.saveFailed"), variant: "destructive" });
    },
  });

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-5 max-w-lg">
      <h2 className="text-base font-semibold text-[var(--text-primary)]">{t("scheduleSettings.title")}</h2>

      {scheduleStatus === "PUBLISHED" && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200">
          ⚠ {t("scheduleSettings.published")}
        </div>
      )}

      {/* Start time */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[var(--text-secondary)]">{t("scheduleSettings.startTime")}</label>
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
          <label className="text-xs font-medium text-[var(--text-secondary)]">{t("scheduleSettings.danceDuration")}</label>
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
          <label className="text-xs font-medium text-[var(--text-secondary)]">{t("scheduleSettings.transition")}</label>
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
          <label className="text-xs font-medium text-[var(--text-secondary)]">{t("scheduleSettings.maxPairs")}</label>
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
          <label className="text-xs font-medium text-[var(--text-secondary)]">{t("scheduleSettings.breakDuration")}</label>
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
        <label className="text-xs font-medium text-[var(--text-secondary)]">{t("scheduleSettings.breakRule")}</label>
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
              {rule === "AFTER_ROUND" && t("scheduleSettings.afterRound")}
              {rule === "BETWEEN_CATEGORIES" && t("scheduleSettings.betweenCategories")}
              {rule === "BOTH" && t("scheduleSettings.both")}
            </span>
          </label>
        ))}
      </div>

      {/* Judge break */}
      <div className="rounded-lg border border-[var(--border)] p-4 space-y-3">
        <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">{t("scheduleSettings.judgeBreaks")}</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">{t("scheduleSettings.suggestBreakAfter")}</label>
            <select
              value={config.judgeBreakAfterMinutes}
              onChange={(e) => setConfig((c) => ({ ...c, judgeBreakAfterMinutes: Number(e.target.value) }))}
              className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              {JUDGE_BREAK_AFTER_VALUES.map((o) => (
                <option key={o.value} value={o.value}>{o.disabled ? t("scheduleSettings.disabled") : `${o.value} min`}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">{t("scheduleSettings.breakDuration")}</label>
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
        <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">{t("scheduleSettings.delayBuffer")}</p>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]">
            {t("scheduleSettings.bufferLabel", { min: config.slotBufferMinutes ?? 0 })}
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
            {t("scheduleSettings.bufferDesc")}
          </p>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button onClick={() => mutate()} loading={isPending || isGenerating}>
          ⟳ {t("scheduleSettings.saveRegenerate")}
        </Button>
      </div>
    </div>
  );
}
