"use client";

import { use, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Music2, Users, Clock, Play, ChevronRight, Volume2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useSSE } from "@/hooks/use-sse";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/api-client";
import { useLocale } from "@/contexts/locale-context";

// ── Types ──────────────────────────────────────────────────────────────────────
interface ModeratorView {
  competitionId: string;
  competitionName: string;
  currentRound?: {
    id: string;
    sectionName: string;
    roundType: "PRELIMINARY" | "SEMIFINAL" | "FINAL";
    status: "OPEN" | "IN_PROGRESS" | "CLOSED" | "RESULTS_READY";
    pairsCount: number;
    dances: string[];
    startedAt?: string;
  };
  upNext?: {
    sectionName: string;
    roundType: string;
    scheduledAt?: string;
  };
  announcementQueue: AnnouncementItem[];
}

interface AnnouncementItem {
  id: string;
  text: string;
  type: "SECTION_CALL" | "RESULTS" | "CUSTOM";
  priority: number;
}

// ── API ────────────────────────────────────────────────────────────────────────
async function fetchModeratorView(token: string): Promise<ModeratorView> {
  const r = await apiClient.get<ModeratorView>(`/moderator/${token}`);
  return r.data;
}

// ── Components ────────────────────────────────────────────────────────────────
function RoundTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    PRELIMINARY: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
    SEMIFINAL: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
    FINAL: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  };
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", colors[type] ?? "bg-gray-100 text-gray-700")}>
      {type}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    OPEN: "bg-amber-400",
    IN_PROGRESS: "bg-green-500 animate-pulse",
    CLOSED: "bg-gray-400",
    RESULTS_READY: "bg-blue-500",
  };
  return (
    <span className={cn("inline-block h-2.5 w-2.5 rounded-full", colors[status] ?? "bg-gray-400")} />
  );
}

function AnnouncementCard({ item, onDismiss, dismissLabel }: { item: AnnouncementItem; onDismiss: (id: string) => void; dismissLabel: string }) {
  return (
    <div className={cn(
      "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
      item.priority === 1
        ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950"
        : "border-[var(--border)] bg-[var(--surface)]"
    )}>
      <Volume2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
      <p className="flex-1 text-[var(--text-primary)]">{item.text}</p>
      <button
        onClick={() => onDismiss(item.id)}
        className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] shrink-0"
      >
        {dismissLabel}
      </button>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ModeratorPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { t } = useLocale();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState(new Date());

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["moderator", token],
    queryFn: () => fetchModeratorView(token),
    refetchInterval: 10_000,
  });

  // Live updates via SSE (refetch on round status or results changes)
  useSSE(data?.competitionId ?? null, "round.status_changed", () => refetch());
  useSSE(data?.competitionId ?? null, "results.approved", () => refetch());

  // Clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const announcements = (data?.announcementQueue ?? []).filter((a) => !dismissed.has(a.id));

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 text-white">
        <div className="text-center space-y-3">
          <Music2 className="h-12 w-12 mx-auto text-gray-600" />
          <p className="text-lg font-semibold">{t("moderator.invalidLink")}</p>
          <p className="text-sm text-gray-400">{t("moderator.invalidLinkDesc")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]">
            <Music2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">{data?.competitionName ?? t("common.loading")}</h1>
            <p className="text-xs text-gray-400">{t("moderator.viewTitle")}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-mono font-bold text-white">
            {currentTime.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
          <p className="text-xs text-gray-400">
            {currentTime.toLocaleDateString("sk-SK", { weekday: "short", day: "numeric", month: "short" })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Current round — large card */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">{t("moderator.nowOnFloor")}</h2>

          {isLoading ? (
            <div className="h-48 rounded-2xl bg-gray-900 animate-pulse" />
          ) : data?.currentRound ? (
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <StatusDot status={data.currentRound.status} />
                    <span className="text-xs text-gray-400 uppercase tracking-wide">{data.currentRound.status.replace("_", " ")}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white">{data.currentRound.sectionName}</h3>
                </div>
                <RoundTypeBadge type={data.currentRound.roundType} />
              </div>

              <Separator className="border-gray-800" />

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Users className="h-3.5 w-3.5" />
                    {t("moderator.pairs")}
                  </div>
                  <p className="text-2xl font-bold">{data.currentRound.pairsCount}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Music2 className="h-3.5 w-3.5" />
                    {t("moderator.dances")}
                  </div>
                  <p className="text-2xl font-bold">{data.currentRound.dances.length}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock className="h-3.5 w-3.5" />
                    {t("moderator.started")}
                  </div>
                  <p className="text-xl font-bold">
                    {data.currentRound.startedAt
                      ? new Date(data.currentRound.startedAt).toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </p>
                </div>
              </div>

              {/* Dance list */}
              <div className="space-y-1.5">
                <p className="text-xs text-gray-500 uppercase tracking-wide">{t("moderator.danceOrder")}</p>
                <div className="flex flex-wrap gap-2">
                  {data.currentRound.dances.map((dance, i) => (
                    <div key={dance} className="flex items-center gap-1.5 rounded-lg bg-gray-800 px-3 py-1.5 text-sm">
                      <span className="text-gray-500 text-xs">{i + 1}.</span>
                      <span className="font-medium">{dance}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-800 py-16 text-center">
              <Play className="h-10 w-10 text-gray-700" />
              <p className="text-gray-500">{t("moderator.noActiveRound")}</p>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Up next */}
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">{t("moderator.upNext")}</h2>
            {data?.upNext ? (
              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                  <RoundTypeBadge type={data.upNext.roundType} />
                </div>
                <p className="font-semibold text-white">{data.upNext.sectionName}</p>
                {data.upNext.scheduledAt && (
                  <p className="text-xs text-gray-400">
                    {t("moderator.scheduled", { time: new Date(data.upNext.scheduledAt).toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" }) })}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 text-center text-sm text-gray-600">
                {t("moderator.nothingScheduled")}
              </div>
            )}
          </div>

          {/* Announcements */}
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 flex items-center gap-2">
              <Volume2 className="h-3.5 w-3.5" />
              {t("moderator.announcements")}
              {announcements.length > 0 && (
                <span className="ml-auto rounded-full bg-red-600 px-1.5 py-0.5 text-xs text-white">
                  {announcements.length}
                </span>
              )}
            </h2>
            {announcements.length === 0 ? (
              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 text-center text-sm text-gray-600">
                {t("moderator.noPendingAnnouncements")}
              </div>
            ) : (
              <div className="space-y-2">
                {announcements.map((a) => (
                  <AnnouncementCard
                    key={a.id}
                    item={a}
                    dismissLabel={t("moderator.dismiss")}
                    onDismiss={(id) => setDismissed((prev) => new Set([...prev, id]))}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
