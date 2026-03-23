"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trophy, BarChart3, Users, Zap, ArrowRight, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CompetitionCard } from "@/components/competition/competition-card";
import { useCompetitions } from "@/hooks/queries/use-competitions";
import { EmptyState } from "@/components/ui/empty-state";
import type { CompetitionStatus } from "@/lib/api/competitions";
import { useLocale } from "@/contexts/locale-context";
import { useAuthStore } from "@/store/auth-store";
import { StatCard } from "@/components/ui/stat-card";

const UPCOMING_STATUSES: CompetitionStatus[] = ["DRAFT", "PUBLISHED"];
const LIVE_STATUSES: CompetitionStatus[] = ["IN_PROGRESS"];
const ARCHIVED_STATUSES: CompetitionStatus[] = ["COMPLETED", "CANCELLED"];

type Tab = "all" | "upcoming" | "live" | "archive";


function QuickAction({ href, icon: Icon, label, sub, accent }: { href: string; icon: React.ElementType; label: string; sub: string; accent: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-all hover:shadow-md hover:-translate-y-px"
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white ${accent}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
        <p className="text-xs text-[var(--text-tertiary)]">{sub}</p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>("all");
  const all = useCompetitions();
  const { t } = useLocale();
  const { user } = useAuthStore();

  if (all.isError) {
    return (
      <AppShell>
        <EmptyState icon={<AlertCircle className="h-10 w-10" />} title="Nepodařilo se načíst soutěže" description="Zkontroluj připojení nebo to zkus znovu." action={<Button onClick={() => all.refetch()}>Zkusit znovu</Button>} />
      </AppShell>
    );
  }
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

  // Time-based greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Dobré ráno" : hour < 18 ? "Dobré odpoledne" : "Dobrý večer";
  const firstName = user?.name?.split(" ")[0] ?? "";

  return (
    <AppShell>
      {/* Welcome header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-sora, Sora, sans-serif)" }}>
            {greeting}{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
            {t("dashboard.title")} · {new Date().toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <Button asChild className="gap-1.5 shrink-0">
          <Link href="/dashboard/competitions/new">
            <Plus className="h-4 w-4" />
            {t("dashboard.newCompetition")}
          </Link>
        </Button>
      </div>

      {/* Quick actions */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <QuickAction
          href="/dashboard/competitions/new"
          icon={Plus}
          label={t("dashboard.newCompetition")}
          sub="Vytvořit novou soutěž"
          accent="bg-[var(--accent)]"
        />
        <QuickAction
          href="/dashboard/analytics"
          icon={BarChart3}
          label="Analytika"
          sub="Statistiky a přehledy"
          accent="bg-blue-500"
        />
        <QuickAction
          href="/dashboard/participants"
          icon={Users}
          label="Účastníci"
          sub="Správa párů a přihlášek"
          accent="bg-teal-500"
        />
      </div>

      {/* Live spotlight */}
      {live.length > 0 && (
        <div className="mb-6 overflow-hidden rounded-[var(--radius-lg)] border border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 p-4 dark:border-emerald-900 dark:from-emerald-950/30 dark:to-green-950/20">
          <div className="mb-3 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              {live.length === 1 ? "1 soutěž právě probíhá" : `${live.length} soutěže právě probíhají`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {live.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/competitions/${c.id}`}
                className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-1.5 text-sm font-medium text-emerald-800 shadow-sm transition-colors hover:bg-white dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
              >
                <Zap className="h-3.5 w-3.5" />
                {c.name}
                <ArrowRight className="h-3 w-3 opacity-60" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Stat badges */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard value={competitions.length} label={t("dashboard.totalCompetitions")} sub={t("dashboard.total", { n: competitions.length })} color="bg-blue-500" />
        <StatCard value={live.length} label={t("dashboard.liveNow")} sub={t("dashboard.ongoing")} color="bg-emerald-500" />
        <StatCard value={upcoming.length} label={t("dashboard.upcoming")} sub={upcoming.length > 0 ? upcoming[0]?.eventDate?.slice(0, 10) ?? "" : "–"} color="bg-amber-500" />
        <StatCard value={totalPairs} label={t("dashboard.totalPairs")} sub={t("dashboard.pairsCount", { n: String(totalPairs).padStart(2, "0") })} color="bg-blue-500" />
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
