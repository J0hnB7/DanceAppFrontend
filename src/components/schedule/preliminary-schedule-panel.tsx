"use client";

import { useState, useEffect } from "react";
import { useLocale } from "@/contexts/locale-context";
import {
  usePreliminarySchedule,
  useSavePreliminaryScheduleSettings,
} from "@/hooks/queries/use-preliminary-schedule";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock } from "lucide-react";
import type { PreliminaryScheduleSettings } from "@/lib/api/preliminary-schedule";

interface Props {
  competitionId: string;
}

export function PreliminarySchedulePanel({ competitionId }: Props) {
  const { t } = useLocale();
  const { data, isLoading, error } = usePreliminarySchedule(competitionId);
  const saveMutation = useSavePreliminaryScheduleSettings(competitionId);

  const is404 =
    (error as { response?: { status?: number } })?.response?.status === 404;

  const [startTime, setStartTime] = useState("09:00");
  const [pairsPerHeat, setPairsPerHeat] = useState("8");
  const [minutesPerDance, setMinutesPerDance] = useState("1.5");

  useEffect(() => {
    if (data?.settings) {
      setStartTime(data.settings.startTime);
      setPairsPerHeat(String(data.settings.pairsPerHeat));
      setMinutesPerDance(String(data.settings.minutesPerDance));
    }
  }, [data?.settings]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const settings: PreliminaryScheduleSettings = {
      startTime,
      pairsPerHeat: parseInt(pairsPerHeat) || 8,
      minutesPerDance: parseFloat(minutesPerDance) || 1.5,
    };
    saveMutation.mutate(settings, {
      onSuccess: () =>
        toast({ title: t("prelimSchedule.saveSuccess") }),
      onError: () =>
        toast({ title: t("prelimSchedule.saveError"), variant: "destructive" }),
    });
  }

  const inputCls =
    "w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-base text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1";
  const labelCls = "block text-sm font-medium text-[var(--text-secondary)] mb-1";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* Left — settings form */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-5">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">
          {t("prelimSchedule.settingsTitle")}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="prelim-start-time" className={labelCls}>
              {t("prelimSchedule.startTime")}
            </label>
            <input
              id="prelim-start-time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="prelim-pairs-per-heat" className={labelCls}>
              {t("prelimSchedule.pairsPerHeat")}
            </label>
            <input
              id="prelim-pairs-per-heat"
              type="number"
              min={1}
              value={pairsPerHeat}
              onChange={(e) => setPairsPerHeat(e.target.value)}
              required
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="prelim-minutes-per-dance" className={labelCls}>
              {t("prelimSchedule.minutesPerDance")}
            </label>
            <input
              id="prelim-minutes-per-dance"
              type="number"
              min={0.5}
              step={0.5}
              value={minutesPerDance}
              onChange={(e) => setMinutesPerDance(e.target.value)}
              required
              className={inputCls}
            />
          </div>
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-white font-medium px-4 py-3 hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
          >
            <Clock className="h-4 w-4" aria-hidden="true" />
            {saveMutation.isPending
              ? t("common.saving")
              : t("prelimSchedule.saveAndCompute")}
          </button>
        </form>
      </div>

      {/* Right — computed timeline */}
      <div className="space-y-4">
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        )}

        {!isLoading && (is404 || !data) && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-10 flex flex-col items-center gap-3 text-center">
            <Clock className="h-10 w-10 text-[var(--text-tertiary)]" aria-hidden="true" />
            <p className="text-sm text-[var(--text-secondary)]">
              {t("prelimSchedule.emptyState")}
            </p>
          </div>
        )}

        {data && data.timeline.length === 0 && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              {t("prelimSchedule.noSections")}
            </p>
          </div>
        )}

        {data &&
          data.timeline.map((section) => (
            <div
              key={section.sectionId}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {section.sectionName}
                </span>
                <span className="text-xs text-[var(--text-secondary)]">
                  {section.pairCount} {t("prelimSchedule.pairs")}
                </span>
              </div>
              {section.rounds.length === 0 ? (
                <p className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                  {t("prelimSchedule.noRounds")}
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)]">
                        {t("prelimSchedule.colRound")}
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-[var(--text-secondary)]">
                        {t("prelimSchedule.colHeats")}
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-[var(--text-secondary)]">
                        {t("prelimSchedule.colDances")}
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-[var(--text-secondary)]">
                        {t("prelimSchedule.colDuration")}
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-[var(--text-secondary)]">
                        {t("prelimSchedule.colTime")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.rounds.map((round, i) => (
                      <tr
                        key={i}
                        className="border-b border-[var(--border)] last:border-0"
                      >
                        <td className="px-4 py-2 text-[var(--text-primary)]">
                          {round.roundType}
                        </td>
                        <td className="px-4 py-2 text-right text-[var(--text-secondary)]">
                          {round.heatCount}
                        </td>
                        <td className="px-4 py-2 text-right text-[var(--text-secondary)]">
                          {round.danceCount}
                        </td>
                        <td className="px-4 py-2 text-right text-[var(--text-secondary)]">
                          {round.durationMinutes} min
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-[var(--text-primary)]">
                          {round.startTime}–{round.endTime}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}

        {data && data.timeline.length > 0 && (
          <div className="rounded-xl border border-[var(--accent)] bg-[var(--surface)] px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              {t("prelimSchedule.total")} —{" "}
              {Math.floor(data.totalDurationMinutes / 60)}h{" "}
              {data.totalDurationMinutes % 60}min
            </span>
            <span className="text-sm font-semibold text-[var(--accent)]">
              {t("prelimSchedule.estimatedEnd")}: {data.estimatedEndTime}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
