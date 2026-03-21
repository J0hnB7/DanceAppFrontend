"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trophy } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CompetitionCard } from "@/components/competition/competition-card";
import { useCompetitions } from "@/hooks/queries/use-competitions";
import type { CompetitionStatus } from "@/lib/api/competitions";
import { useLocale } from "@/contexts/locale-context";

const UPCOMING_STATUSES: CompetitionStatus[] = ["DRAFT", "PUBLISHED"];
const LIVE_STATUSES: CompetitionStatus[] = ["IN_PROGRESS"];
const ARCHIVED_STATUSES: CompetitionStatus[] = ["COMPLETED", "CANCELLED"];

type Tab = "all" | "upcoming" | "live" | "archive";

function StatBadge({
  value,
  label,
  sub,
  color,
}: {
  value: number;
  label: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
      <div className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white ${color}`}>
        {value}
      </div>
      <p className="text-base font-semibold text-[var(--text-primary)]">{label}</p>
      <p className="text-xs text-[var(--text-tertiary)]">{sub}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>("all");
  const all = useCompetitions();
  const { t } = useLocale();
  const competitions = all.data ?? [];

  const upcoming = competitions.filter((c) => UPCOMING_STATUSES.includes(c.status));
  const live = competitions.filter((c) => LIVE_STATUSES.includes(c.status));
  const archived = competitions.filter((c) => ARCHIVED_STATUSES.includes(c.status));
  const totalPairs = competitions.reduce((sum, c) => sum + c.pairCount, 0);

  const visibleList =
    tab === "all" ? competitions
    : tab === "upcoming" ? upcoming
    : tab === "live" ? live
    : archived;

  const tabCount = (k: Tab) =>
    k === "all" ? competitions.length
    : k === "upcoming" ? upcoming.length
    : k === "live" ? live.length
    : archived.length;

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: t("dashboard.tabAll") },
    { key: "upcoming", label: t("dashboard.upcoming") },
    { key: "live", label: t("dashboard.liveNow") },
    { key: "archive", label: t("dashboard.archived") },
  ];

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t("dashboard.title")}</h1>
        <Button asChild>
          <Link href="/dashboard/competitions/new">
            <Plus className="h-4 w-4" />
            {t("dashboard.newCompetition")}
          </Link>
        </Button>
      </div>

      {/* Stat badges */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatBadge
          value={competitions.length}
          label={t("dashboard.totalCompetitions")}
          sub={t("dashboard.total", { n: competitions.length })}
          color="bg-blue-500"
        />
        <StatBadge
          value={live.length}
          label={t("dashboard.liveNow")}
          sub={t("dashboard.ongoing")}
          color="bg-emerald-500"
        />
        <StatBadge
          value={upcoming.length}
          label={t("dashboard.upcoming")}
          sub={upcoming.length > 0 ? upcoming[0]?.eventDate?.slice(0, 10) ?? "" : "–"}
          color="bg-amber-500"
        />
        <StatBadge
          value={totalPairs}
          label={t("dashboard.totalPairs")}
          sub={t("dashboard.pairsCount", { n: String(totalPairs).padStart(2, "0") })}
          color="bg-violet-500"
        />
      </div>

      {/* Tab pills */}
      <div className="mb-5 flex items-center gap-1">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === tb.key
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]"
            }`}
          >
            {tb.label}
            {tabCount(tb.key) > 0 && (
              <span className={`ml-1.5 text-xs ${tab === tb.key ? "opacity-80" : "text-[var(--text-tertiary)]"}`}>
                ({tabCount(tb.key)})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {all.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-[var(--radius-lg)]" />
          ))}
        </div>
      ) : visibleList.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <Trophy className="h-12 w-12 text-[var(--text-tertiary)]" />
          <p className="text-sm text-[var(--text-secondary)]">{t("dashboard.noCompetitions")}</p>
          {tab === "all" && (
            <Button asChild>
              <Link href="/dashboard/competitions/new">
                <Plus className="h-4 w-4" /> {t("dashboard.createCompetition")}
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visibleList.map((c) => (
            <CompetitionCard key={c.id} competition={c} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
