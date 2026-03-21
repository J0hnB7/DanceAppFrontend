"use client";

import { useQuery } from "@tanstack/react-query";
import { Trophy, Users, TrendingUp, BarChart3, Calendar, CreditCard } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { competitionsApi } from "@/lib/api/competitions";
import { formatDate } from "@/lib/utils";
import { useLocale } from "@/contexts/locale-context";

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-medium text-[var(--text-secondary)]">{label}</CardTitle>
          <Icon className={`h-4 w-4 ${accent ?? "text-[var(--text-tertiary)]"}`} />
        </div>
      </CardHeader>
      <CardContent>
        <p className={`text-3xl font-bold ${accent ?? "text-[var(--text-primary)]"}`}>{value}</p>
        {sub && <p className="mt-1 text-xs text-[var(--text-tertiary)]">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const { t } = useLocale();
  const { data, isLoading } = useQuery({
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

  // Group by year
  const byYear = competitions.reduce<Record<string, { count: number; pairs: number }>>((acc, c) => {
    const year = new Date(c.eventDate).getFullYear().toString();
    if (!acc[year]) acc[year] = { count: 0, pairs: 0 };
    acc[year].count++;
    acc[year].pairs += c.pairCount;
    return acc;
  }, {});

  const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a));
  const maxPairs = Math.max(...Object.values(byYear).map((y) => y.pairs), 1);

  // Top competitions by pairs
  const topByPairs = [...competitions]
    .sort((a, b) => b.pairCount - a.pairCount)
    .slice(0, 5);

  if (isLoading) {
    return (
      <AppShell>
        <PageHeader title={t("analytics.title")} description={t("analytics.insightsDescShort")} />
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
      <PageHeader
        title={t("analytics.title")}
        description={t("analytics.insightsDesc")}
      />

      {/* KPI row */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Trophy}
          label={t("analytics.totalCompetitions")}
          value={competitions.length}
          sub={t("analytics.completedCount", { count: completed.length })}
        />
        <StatCard
          icon={Users}
          label={t("analytics.totalPairs")}
          value={totalPairs}
          sub={t("analytics.acrossAll")}
          accent="text-[var(--accent)]"
        />
        <StatCard
          icon={TrendingUp}
          label={t("analytics.upcoming")}
          value={upcoming.length}
          sub={t("analytics.awaitingOrOpen")}
        />
        <StatCard
          icon={BarChart3}
          label={t("analytics.liveNow")}
          value={live.length}
          sub={live.length > 0 ? live[0].name : t("analytics.noCompetitionsLive")}
          accent={live.length > 0 ? "text-[var(--success)]" : undefined}
        />
      </div>

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
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {c.name}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {formatDate(c.eventDate)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-[var(--text-primary)]">
                        {c.pairCount}
                      </p>
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
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {c.name}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {formatDate(c.eventDate)}
                      </p>
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
    </AppShell>
  );
}
