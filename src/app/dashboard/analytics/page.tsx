"use client";

import { useQuery, useQueries } from "@tanstack/react-query";
import { Trophy, Users, TrendingUp, BarChart3, Calendar, CreditCard, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkline } from "@/components/ui/sparkline";
import { competitionsApi } from "@/lib/api/competitions";
import { analyticsApi } from "@/lib/api/analytics";
import { budgetApi } from "@/lib/api/budget";
import { formatDate } from "@/lib/utils";
import { useLocale } from "@/contexts/locale-context";


export default function AnalyticsPage() {
  const { t } = useLocale();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["competitions", "all"],
    queryFn: () => competitionsApi.list(),
  });

  const competitions = data ?? [];
  const totalPairs = competitions.reduce((s, c) => s + c.pairCount, 0);
  const completed = competitions.filter((c) => c.status === "COMPLETED");
  const upcoming = competitions.filter((c) =>
    ["DRAFT", "PUBLISHED"].includes(c.status)
  );
  const live = competitions.filter((c) => c.status === "IN_PROGRESS");

  // ── Registration activity ─────────────────────────────────────────────────
  const { data: activityData } = useQuery({
    queryKey: ["analytics", "registration-activity"],
    queryFn: () => analyticsApi.registrationActivity(14),
    enabled: !isLoading,
  });

  // ── Presence per completed competition (parallel) ─────────────────────────
  const presenceQueries = useQueries({
    queries: completed.map((c) => ({
      queryKey: ["presence", c.id],
      queryFn: () => analyticsApi.presence(c.id),
      enabled: !isLoading,
    })),
  });

  // ── Budget per competition (parallel) ─────────────────────────────────────
  const budgetQueries = useQueries({
    queries: competitions.map((c) => ({
      queryKey: ["budget", c.id],
      queryFn: () => budgetApi.getSummary(c.id),
      enabled: !isLoading,
    })),
  });

  // ── Computed values ───────────────────────────────────────────────────────
  const attendanceStats = completed.map((c, i) => {
    const presencePairs = presenceQueries[i]?.data ?? [];
    const attended = presencePairs.filter((p) => p.presenceStatus !== "ABSENT").length;
    return { competition: c, registered: c.pairCount, attended };
  });
  const avgAttendance =
    attendanceStats.length > 0
      ? Math.round(
          (attendanceStats.reduce(
            (s, a) => s + (a.registered > 0 ? a.attended / a.registered : 0),
            0
          ) /
            attendanceStats.length) *
            100
        )
      : null;

  const budgets = budgetQueries.map((q) => q.data).filter(Boolean);
  const totalPaid = budgets.reduce((s, b) => s + (b?.paidRevenue ?? 0), 0);
  const totalPending = budgets.reduce((s, b) => s + (b?.pendingRevenue ?? 0), 0);

  const activityPoints = activityData?.map((p) => p.count) ?? [];
  const activityTotal = activityPoints.reduce((s, v) => s + v, 0);
  const activityMax = Math.max(...activityPoints, 1);

  // ── Year grouping ─────────────────────────────────────────────────────────
  const byYear = competitions.reduce<Record<string, { count: number; pairs: number }>>((acc, c) => {
    const year = new Date(c.eventDate).getFullYear().toString();
    if (!acc[year]) acc[year] = { count: 0, pairs: 0 };
    acc[year].count++;
    acc[year].pairs += c.pairCount;
    return acc;
  }, {});

  const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a));
  const maxPairs = Math.max(...Object.values(byYear).map((y) => y.pairs), 1);

  const topByPairs = [...competitions]
    .sort((a, b) => b.pairCount - a.pairCount)
    .slice(0, 5);

  if (isError) {
    return (
      <AppShell>
        <EmptyState icon={<AlertCircle className="h-10 w-10" />} title="Nepodařilo se načíst data" description="Zkontroluj připojení nebo to zkus znovu." action={<Button onClick={() => refetch()}>Zkusit znovu</Button>} />
      </AppShell>
    );
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-sora, Sora, sans-serif)" }}>{t("analytics.title")}</h1>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{t("analytics.insightsDescShort")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-sora, Sora, sans-serif)" }}>{t("analytics.title")}</h1>
        <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{t("analytics.insightsDesc")}</p>
      </div>

      {/* KPI row */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard value={competitions.length} label={t("analytics.totalCompetitions")} sub={t("analytics.completedCount", { count: completed.length })} color="bg-blue-500" icon={Trophy} />
        <StatCard value={totalPairs} label={t("analytics.totalPairs")} sub={t("analytics.acrossAll")} color="bg-[var(--accent)]" icon={Users} />
        <StatCard value={upcoming.length} label={t("analytics.upcoming")} sub={t("analytics.awaitingOrOpen")} color="bg-amber-500" icon={TrendingUp} />
        <StatCard value={live.length} label={t("analytics.liveNow")} sub={live.length > 0 ? live[0].name : t("analytics.noCompetitionsLive")} color={live.length > 0 ? "bg-emerald-500" : "bg-[var(--text-tertiary)]"} icon={BarChart3} />
      </div>

      {/* Existing grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Year-over-year */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              {t("analytics.yearOverYearPairs")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {years.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--text-secondary)]">{t("analytics.noDataYet")}</p>
            ) : (
              years.map((year) => {
                const d = byYear[year];
                const pct = Math.round((d.pairs / maxPairs) * 100);
                return (
                  <div key={year} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-[var(--text-primary)]">{year}</span>
                      <span className="text-[var(--text-secondary)]">
                        {d.count !== 1
                          ? t("analytics.pairsCompetitionsPlural", { pairs: d.pairs, count: d.count })
                          : t("analytics.pairsCompetitions", { pairs: d.pairs, count: d.count })}
                      </span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Top competitions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4" />
              {t("analytics.topByPairs")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topByPairs.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--text-secondary)]">{t("analytics.noDataYet")}</p>
            ) : (
              <div className="space-y-3">
                {topByPairs.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="w-5 shrink-0 text-right text-xs font-bold text-[var(--text-tertiary)]">
                      {i + 1}.
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">{c.name}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">{formatDate(c.eventDate)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-[var(--text-primary)]">{c.pairCount}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">{t("analytics.pairsLabel")}</p>
                    </div>
                    <Badge variant={c.status === "COMPLETED" ? "secondary" : c.status === "IN_PROGRESS" ? "warning" : "success"}>
                      {c.status.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Competition status breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <CreditCard className="h-4 w-4" />
              {t("analytics.statusBreakdown")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { labelKey: "analytics.draft", status: "DRAFT", color: "bg-[var(--border)]" },
              { labelKey: "analytics.published", status: "PUBLISHED", color: "bg-blue-400" },
              { labelKey: "analytics.inProgress", status: "IN_PROGRESS", color: "bg-[var(--warning)]" },
              { labelKey: "analytics.completed", status: "COMPLETED", color: "bg-[var(--text-tertiary)]" },
            ].map(({ labelKey, status, color }) => {
              const count = competitions.filter((c) => c.status === status).length;
              const pct = competitions.length > 0 ? Math.round((count / competitions.length) * 100) : 0;
              return (
                <div key={status} className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${color}`} />
                  <span className="flex-1 text-sm text-[var(--text-secondary)]">{t(labelKey)}</span>
                  <span className="text-sm font-medium text-[var(--text-primary)]">{count}</span>
                  <span className="w-8 text-right text-xs text-[var(--text-tertiary)]">{pct}%</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent competitions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              {t("analytics.recentActivity")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...competitions]
                .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
                .slice(0, 5)
                .map((c) => (
                  <div key={c.id} className="flex items-start gap-3">
                    <div className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">{c.name}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">{formatDate(c.eventDate)}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {c.pairCount} {t("analytics.pairsLabel")}
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Nové sekce ── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">

        {/* Registrace vs. příchod */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t("analytics.attendanceTitle")}
              </span>
              {avgAttendance !== null && (
                <span className="text-xs font-normal text-[var(--text-secondary)]">
                  {t("analytics.avgAttendance")}:{" "}
                  <strong className="text-[var(--text-primary)]">{avgAttendance}%</strong>
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {attendanceStats.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--text-secondary)]">
                {t("analytics.noAttendanceData")}
              </p>
            ) : (
              attendanceStats.slice(0, 6).map(({ competition: c, registered, attended }) => {
                const pct = registered > 0 ? Math.round((attended / registered) * 100) : 0;
                const barColor = pct >= 80 ? "#10B981" : pct >= 60 ? "#F59E0B" : "#EF4444";
                return (
                  <div key={c.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span
                        className="truncate font-medium text-[var(--text-primary)]"
                        style={{ maxWidth: "55%" }}
                      >
                        {c.name}
                      </span>
                      <span className="shrink-0 text-xs text-[var(--text-secondary)]">
                        {attended}/{registered} ·{" "}
                        <strong style={{ color: barColor }}>{pct}%</strong>
                      </span>
                    </div>
                    <div className="relative h-1.5 overflow-hidden rounded-full bg-[var(--surface-secondary)]">
                      <div
                        className="absolute left-0 top-0 h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: barColor }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Finance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <CreditCard className="h-4 w-4" />
              {t("analytics.financeTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {budgets.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--text-secondary)]">
                {t("analytics.noFinanceData")}
              </p>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl p-4" style={{ background: "var(--surface-secondary)" }}>
                    <p className="text-xs text-[var(--text-secondary)]">{t("analytics.paidRevenue")}</p>
                    <p className="mt-1 text-xl font-bold text-emerald-500">
                      {totalPaid.toLocaleString("cs-CZ")} Kč
                    </p>
                  </div>
                  <div className="rounded-xl p-4" style={{ background: "var(--surface-secondary)" }}>
                    <p className="text-xs text-[var(--text-secondary)]">{t("analytics.pendingRevenue")}</p>
                    <p className="mt-1 text-xl font-bold text-amber-500">
                      {totalPending.toLocaleString("cs-CZ")} Kč
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {budgetQueries
                    .map((q, i) => ({ budget: q.data, competition: competitions[i] }))
                    .filter((x) => x.budget && x.budget.pendingRevenue > 0)
                    .sort((a, b) => b.budget!.pendingRevenue - a.budget!.pendingRevenue)
                    .slice(0, 4)
                    .map(({ budget, competition: c }) => (
                      <div key={c.id} className="flex items-center justify-between text-sm">
                        <span
                          className="truncate text-[var(--text-secondary)]"
                          style={{ maxWidth: "60%" }}
                        >
                          {c.name}
                        </span>
                        <span className="font-medium text-amber-500">
                          {budget!.pendingRevenue.toLocaleString("cs-CZ")} Kč
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Aktivita registrací — full width */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {t("analytics.registrationActivityTitle")}
            </span>
            <span className="text-xs font-normal text-[var(--text-secondary)]">
              {activityTotal} {t("analytics.newPairsTotal")}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activityPoints.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--text-secondary)]">
              {t("analytics.noDataYet")}
            </p>
          ) : (
            <div className="space-y-3">
              <Sparkline data={activityPoints} height={56} />
              <div className="flex justify-between text-[0.72rem] text-[var(--text-tertiary)]">
                <span>{activityData?.[0]?.date?.slice(5)}</span>
                <span>{activityData?.[activityData.length - 1]?.date?.slice(5)}</span>
              </div>
              {/* Heatmap tiles */}
              <div
                className="grid gap-1"
                style={{ gridTemplateColumns: `repeat(${activityPoints.length}, 1fr)` }}
              >
                {activityPoints.map((count, i) => (
                  <div
                    key={i}
                    title={`${activityData?.[i]?.date}: ${count} párů`}
                    className="h-2 w-full rounded-sm"
                    style={{
                      background: count === 0 ? "var(--surface-secondary)" : "var(--accent)",
                      opacity:
                        count === 0
                          ? 1
                          : Math.min(0.3 + (count / activityMax) * 0.7, 1),
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
