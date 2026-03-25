"use client";

import { useQuery } from "@tanstack/react-query";
import { scheduleApi, type ProgressionPreview } from "@/lib/api/schedule";
import { cn } from "@/lib/utils";

interface SectionProgressionPreviewProps {
  competitionId: string;
  sectionId: string;
  pairCount: number;
  finalSize: number;
  className?: string;
}

const ROUND_TYPE_LABELS: Record<string, string> = {
  QUARTER_FINAL: "Čtvrtfinále",
  SEMIFINAL: "Semifinále",
  FINAL: "Finále",
};

const ROUND_TYPE_COLORS: Record<string, string> = {
  PRELIMINARY: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  QUARTER_FINAL: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  SEMIFINAL: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  FINAL: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

export function SectionProgressionPreview({
  competitionId,
  pairCount,
  finalSize,
  className,
}: SectionProgressionPreviewProps) {
  const { data, isLoading, isError } = useQuery<ProgressionPreview>({
    queryKey: ["progression-preview", competitionId, pairCount, finalSize],
    queryFn: () => scheduleApi.getProgressionPreview(competitionId, pairCount, finalSize),
    enabled: pairCount > 0 && finalSize > 0,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className={cn("text-xs text-[var(--text-tertiary)] animate-pulse", className)}>
        Počítám...
      </div>
    );
  }

  if (isError || !data) {
    return null;
  }

  const totalMins = data.totalEstimatedMinutes;
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const durationLabel = hours > 0 ? `${hours} h ${mins} min` : `${mins} min`;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex flex-wrap gap-1">
        {data.rounds.map((r) => (
          <span
            key={r.roundNumber}
            className={cn(
              "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium",
              ROUND_TYPE_COLORS[r.type] ?? "bg-gray-100 text-gray-700"
            )}
          >
            {r.type === "PRELIMINARY" ? `Kolo ${r.roundNumber}` : (ROUND_TYPE_LABELS[r.type] ?? r.type)}
            <span className="opacity-70">
              {r.startingPairs}p / {r.heatCount}h
            </span>
          </span>
        ))}
      </div>
      <p className="text-[10px] text-[var(--text-tertiary)]">
        ~{durationLabel}
      </p>
    </div>
  );
}
