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
  const { data, isLoading } = useQuery({
    queryKey: ["competitions", "all"],
    queryFn: () => competitionsApi.list({ size: 100 }),
  });

  const competitions = data?.content ?? [];
  const totalPairs = competitions.reduce((s, c) => s + c.registeredPairsCount, 0);
  const completed = competitions.filter((c) => c.status === "COMPLETED");
  const upcoming = competitions.filter((c) =>
    ["DRAFT", "PUBLISHED", "REGISTRATION_OPEN"].includes(c.status)
  );
  const live = competitions.filter((c) => c.status === "IN_PROGRESS");

  // Group by year
  const byYear = competitions.reduce<Record<string, { count: number; pairs: number }>>((acc, c) => {
    const year = new Date(c.startDate).getFullYear().toString();
    if (!acc[year]) acc[year] = { count: 0, pairs: 0 };
    acc[year].count++;
    acc[year].pairs += c.registeredPairsCount;
    return acc;
  }, {});

  const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a));
  const maxPairs = Math.max(...Object.values(byYear).map((y) => y.pairs), 1);

  // Top competitions by pairs
  const topByPairs = [...competitions]
    .sort((a, b) => b.registeredPairsCount - a.registeredPairsCount)
    .slice(0, 5);

  if (isLoading) {
    return (
      <AppShell>
        <PageHeader title="Analytics" description="Insights across all competitions" />
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
        title="Analytics"
        description="Insights and statistics across all competitions"
      />

      {/* KPI row */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Trophy}
          label="Total competitions"
          value={competitions.length}
          sub={`${completed.length} completed`}
        />
        <StatCard
          icon={Users}
          label="Total pairs"
          value={totalPairs}
          sub="across all competitions"
          accent="text-[var(--accent)]"
        />
        <StatCard
          icon={TrendingUp}
          label="Upcoming"
          value={upcoming.length}
          sub="awaiting or open for registration"
        />
        <StatCard
          icon={BarChart3}
          label="Live now"
          value={live.length}
          sub={live.length > 0 ? live[0].name : "no competitions live"}
          accent={live.length > 0 ? "text-[var(--success)]" : undefined}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Year-over-year */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              Year-over-year pairs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {years.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--text-secondary)]">No data yet</p>
            ) : (
              years.map((year) => {
                const d = byYear[year];
                const pct = Math.round((d.pairs / maxPairs) * 100);
                return (
                  <div key={year} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-[var(--text-primary)]">{year}</span>
                      <span className="text-[var(--text-secondary)]">
                        {d.pairs} pairs · {d.count} competition{d.count !== 1 ? "s" : ""}
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
              Top competitions by pairs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topByPairs.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--text-secondary)]">No data yet</p>
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
                        {formatDate(c.startDate)} · {c.location}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-[var(--text-primary)]">
                        {c.registeredPairsCount}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)]">pairs</p>
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
              Status distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Draft", status: "DRAFT", color: "bg-[var(--border)]" },
              { label: "Published", status: "PUBLISHED", color: "bg-blue-400" },
              { label: "Registration open", status: "REGISTRATION_OPEN", color: "bg-[var(--success)]" },
              { label: "In progress", status: "IN_PROGRESS", color: "bg-[var(--warning)]" },
              { label: "Completed", status: "COMPLETED", color: "bg-[var(--text-tertiary)]" },
            ].map(({ label, status, color }) => {
              const count = competitions.filter((c) => c.status === status).length;
              const pct = competitions.length > 0 ? Math.round((count / competitions.length) * 100) : 0;
              return (
                <div key={status} className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${color}`} />
                  <span className="flex-1 text-sm text-[var(--text-secondary)]">{label}</span>
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
              Recent activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...competitions]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 5)
                .map((c) => (
                  <div key={c.id} className="flex items-start gap-3">
                    <div className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {c.name}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        Created {formatDate(c.createdAt)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {c.registeredPairsCount} pairs
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
