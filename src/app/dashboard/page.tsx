"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trophy, AlertCircle, ArrowRight } from "lucide-react";
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

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>("all");
  const all = useCompetitions();
  const { t, locale } = useLocale();
  const { user } = useAuthStore();

  if (all.isError) {
    return (
      <AppShell>
        <EmptyState icon={<AlertCircle className="h-10 w-10" />} title={t("dashboard.loadError")} description={t("dashboard.loadErrorDesc")} action={<Button onClick={() => all.refetch()}>{t("dashboard.retry")}</Button>} />
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
    { key: "all",      label: t("dashboard.tabAll") },
    { key: "upcoming", label: t("dashboard.upcoming") },
    { key: "live",     label: t("dashboard.liveNow") },
    { key: "archive",  label: t("dashboard.archived") },
  ];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("dashboard.greetingMorning") : hour < 18 ? t("dashboard.greetingAfternoon") : t("dashboard.greetingEvening");
  const firstName = user?.name?.split(" ")[0] ?? "";

  return (
    <AppShell>
      {/* Header */}
      <div
        className="flex items-start justify-between gap-4"
        style={{ marginBottom: 20 }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--font-sora, Sora, sans-serif)",
              fontSize: "1.6rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              letterSpacing: "-0.03em",
              marginBottom: 4,
              lineHeight: 1.2,
            }}
          >
            {greeting}{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-[0.86rem]" style={{ color: "var(--text-secondary)" }}>
            {new Date().toLocaleDateString(locale === "en" ? "en-GB" : "cs-CZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <Link
          href="/dashboard/competitions/new"
          className="flex shrink-0 items-center gap-2 rounded-lg font-semibold text-white transition-all text-[0.86rem]"
          style={{
            background: "var(--accent, #3B82F6)",
            padding: "10px 20px",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#2563EB"; (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--accent, #3B82F6)"; (e.currentTarget as HTMLAnchorElement).style.transform = ""; }}
        >
          <Plus className="h-4 w-4" />
          {t("dashboard.newCompetition")}
        </Link>
      </div>

      {/* Live banner */}
      {live.length > 0 && (
        <div
          className="flex items-center gap-3 mb-6 rounded-xl transition-shadow cursor-pointer"
          style={{
            padding: "14px 18px",
            background: "#ECFDF5",
            border: "1px solid rgba(16,185,129,0.15)",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 12px rgba(16,185,129,0.1)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = ""; }}
        >
          <span
            className="shrink-0 h-2 w-2 rounded-full"
            style={{
              background: "#10B981",
              animation: "livePulse 2s infinite",
              boxShadow: "0 0 0 0 rgba(16,185,129,0.5)",
            }}
          />
          <p className="flex-1 text-[0.86rem] font-medium" style={{ color: "#059669" }}>
            <strong className="font-bold">
              {live.length === 1 ? t("dashboard.liveOngoing") : t("dashboard.liveOngoingMany", { n: live.length })}
            </strong>
          </p>
          {live.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/competitions/${c.id}`}
              className="flex items-center gap-1 text-[0.82rem] font-semibold"
              style={{ color: "#059669" }}
              onClick={(e) => e.stopPropagation()}
            >
              {c.name}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="mb-7 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard value={competitions.length} label={t("dashboard.totalCompetitions")} sub={t("dashboard.total", { n: competitions.length })} color="blue" />
        <StatCard value={live.length}         label={t("dashboard.liveNow")}           sub={t("dashboard.ongoing")}                                 color="green" />
        <StatCard value={upcoming.length}     label={t("dashboard.upcoming")}          sub={upcoming[0]?.eventDate?.slice(0, 10) ?? "–"}             color="amber" />
        <StatCard value={totalPairs}          label={t("dashboard.totalPairs")}        sub={t("dashboard.pairsCount", { n: String(totalPairs) })}    color="cyan" />
      </div>

      {/* Tabs — underline style */}
      <div
        className="flex mb-5"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        {tabs.map((tb) => {
          const isActive = tab === tb.key;
          const count = tabCount(tb.key);
          return (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className="text-[0.86rem] transition-colors"
              style={{
                padding: "10px 18px",
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "var(--accent, #3B82F6)" : "var(--text-secondary)",
                borderBottom: isActive ? "2px solid var(--accent, #3B82F6)" : "2px solid transparent",
                background: "none",
                border: "none",
                borderBottomWidth: 2,
                borderBottomStyle: "solid",
                borderBottomColor: isActive ? "var(--accent, #3B82F6)" : "transparent",
                cursor: "pointer",
              }}
            >
              {tb.label}
              {count > 0 && (
                <span
                  className="ml-1.5 text-[0.68rem] font-bold px-1.5 py-px rounded-lg"
                  style={{
                    background: "rgba(59,130,246,0.08)",
                    color: "#3B82F6",
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
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

      <style>{`
        @keyframes livePulse {
          0%   { box-shadow: 0 0 0 0 rgba(16,185,129,0.5); }
          70%  { box-shadow: 0 0 0 6px rgba(16,185,129,0); }
          100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
        }
      `}</style>
    </AppShell>
  );
}
