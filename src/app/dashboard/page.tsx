"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trophy, TrendingUp, Users, CalendarCheck, Activity, Archive, Clock } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CompetitionCard } from "@/components/competition/competition-card";
import { useCompetitions } from "@/hooks/queries/use-competitions";
import type { CompetitionStatus } from "@/lib/api/competitions";
import { useLocale } from "@/contexts/locale-context";

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <Card className="">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-medium text-[var(--text-secondary)]">{label}</CardTitle>
          <Icon className="h-4 w-4 text-[var(--text-tertiary)]" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
      </CardContent>
    </Card>
  );
}

// Status buckets for tabs
const UPCOMING_STATUSES: CompetitionStatus[] = ["DRAFT", "PUBLISHED", "REGISTRATION_OPEN"];
const LIVE_STATUSES: CompetitionStatus[] = ["IN_PROGRESS"];
const ARCHIVED_STATUSES: CompetitionStatus[] = ["COMPLETED", "CANCELLED"];

export default function DashboardPage() {
  const [tab, setTab] = useState<"upcoming" | "live" | "archived">("upcoming");
  const { t } = useLocale();

  const all = useCompetitions();
  const competitions = all.data?.content ?? [];

  const upcoming = competitions.filter((c) => UPCOMING_STATUSES.includes(c.status));
  const live = competitions.filter((c) => LIVE_STATUSES.includes(c.status));
  const archived = competitions.filter((c) => ARCHIVED_STATUSES.includes(c.status));
  const totalPairs = competitions.reduce((sum, c) => sum + c.registeredPairsCount, 0);

  const visibleList = tab === "upcoming" ? upcoming : tab === "live" ? live : archived;
  const isLoading = all.isLoading;

  const emptyMessage = tab === "upcoming" ? t("dashboard.noUpcoming") : tab === "live" ? t("dashboard.noLive") : t("dashboard.noArchived");

  return (
    <AppShell>
      <PageHeader
        title={t("dashboard.title")}
        description={t("dashboard.description")}
        actions={
          <Button asChild size="sm">
            <Link href="/dashboard/competitions/new">
              <Plus className="h-4 w-4" />
              {t("dashboard.newCompetition")}
            </Link>
          </Button>
        }
      />

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4 overflow-visible">
        <StatCard icon={Trophy} label={t("dashboard.totalCompetitions")} value={competitions.length} />
        <StatCard icon={Activity} label={t("dashboard.liveNow")} value={live.length} />
        <StatCard icon={CalendarCheck} label={t("dashboard.upcoming")} value={upcoming.length} />
        <StatCard icon={Users} label={t("dashboard.totalPairs")} value={totalPairs} />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="mb-4">
          <TabsTrigger value="upcoming" className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {t("dashboard.upcoming")}
            {upcoming.length > 0 && (
              <span className="ml-1 rounded-full bg-white/40 px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-primary)]">
                {upcoming.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="live" className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            {t("status.IN_PROGRESS")}
            {live.length > 0 && (
              <span className="ml-1 rounded-full bg-white/40 px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-primary)]">
                {live.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="archived" className="flex items-center gap-1.5">
            <Archive className="h-3.5 w-3.5" />
            {t("dashboard.archived")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-44 rounded-[var(--radius-lg)]" />
              ))}
            </div>
          ) : visibleList.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <Trophy className="h-12 w-12 text-[var(--text-tertiary)]" />
              <div>
                <p className="font-medium text-[var(--text-primary)]">{emptyMessage}</p>
                {tab === "upcoming" && (
                  <p className="text-sm text-[var(--text-secondary)]">{t("dashboard.createFirst")}</p>
                )}
              </div>
              {tab === "upcoming" && (
                <Button asChild>
                  <Link href="/dashboard/competitions/new">
                    <Plus className="h-4 w-4" />
                    {t("dashboard.newCompetition")}
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleList.map((c) => (
                <CompetitionCard key={c.id} competition={c} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
