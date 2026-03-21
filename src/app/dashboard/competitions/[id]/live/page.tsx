"use client";

import { use, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Users,
  Trophy,
  CheckCircle2,
  Clock,
  WifiOff,
  ChevronRight,
  BarChart3,
  AlertCircle,
  AlertTriangle,
  Info,
  Swords,
  Play,
  Settings,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSSE } from "@/hooks/use-sse";
import { useAlertsStore } from "@/store/alerts-store";
import { competitionsApi } from "@/lib/api/competitions";
import { sectionsApi } from "@/lib/api/sections";
import { formatTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/locale-context";

interface SSEEvent {
  type: string;
  payload: {
    roundId?: string;
    submitted?: number;
    total?: number;
    status?: string;
  };
}

export default function LiveDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useLocale();
  const router = useRouter();
  const [lastEvent, setLastEvent] = useState<{ type: string; at: Date } | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  const { alerts, markRead } = useAlertsStore();
  // Show only alerts relevant to this competition (or unfiltered global)
  const relevantAlerts = alerts.filter(
    (a) => !a.competitionId || a.competitionId === id
  );

  const { data: competition } = useQuery({
    queryKey: ["competitions", "detail", id],
    queryFn: () => competitionsApi.get(id),
  });

  const { data: sections } = useQuery({
    queryKey: ["sections", id, "list"],
    queryFn: () => sectionsApi.list(id),
  });

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useSSE<SSEEvent>(id, "ROUND_STATUS", (data) => {
    setLastEvent({ type: data.type, at: new Date() });
  });

  useSSE<SSEEvent>(id, "COMPETITION_STATUS", (data) => {
    setLastEvent({ type: data.type, at: new Date() });
  });

  const activeSection = sections?.find((s) => s.status === "ACTIVE");
  const completedSections = sections?.filter((s) => s.status === "COMPLETED") ?? [];
  const pendingSections = sections?.filter((s) => s.status === "DRAFT") ?? [];
  const totalPairs = competition?.registeredPairsCount ?? 0; // optional field

  const alertIcon = (level: string) => {
    if (level === "error") return <AlertCircle className="h-4 w-4 shrink-0 text-[var(--destructive)]" />;
    if (level === "warning") return <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--warning)]" />;
    if (level === "success") return <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--success)]" />;
    return <Info className="h-4 w-4 shrink-0 text-[var(--accent)]" />;
  };

  const alertBg = (level: string) => {
    if (level === "error") return "border-red-200 bg-red-50";
    if (level === "warning") return "border-amber-200 bg-amber-50";
    if (level === "success") return "border-green-200 bg-green-50";
    return "border-blue-200 bg-blue-50";
  };

  return (
    <AppShell>
      {/* Header with live indicator */}
      <div className="mb-4 flex items-center justify-between">
        <PageHeader
          title={t("live.liveDashboard")}
          description={competition?.name ?? ""}
          className="mb-0"
          backHref={`/dashboard/competitions/${id}`}
        />
        <div className="flex items-center gap-3">
          {isOnline ? (
            <div className="flex items-center gap-1.5 text-xs text-[var(--success)]">
              <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--success)]" />
              {t("live.live")}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-[var(--warning)]">
              <WifiOff className="h-3.5 w-3.5" />
              {t("live.offline")}
            </div>
          )}
          {lastEvent && (
            <span className="text-xs text-[var(--text-tertiary)]">
              {t("live.updated", { time: formatTime(lastEvent.at.toISOString()) })}
            </span>
          )}
        </div>
      </div>

      {/* Quick action bar */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/competitions/${id}`)}>
          <Settings className="h-4 w-4" />
          {t("live.manageSections")}
        </Button>
        <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/competitions/${id}/judges`)}>
          <Users className="h-4 w-4" />
          {t("live.judges")}
        </Button>
        <Button size="sm" variant="outline" onClick={() => router.push(`/scoreboard/${id}`)}>
          <BarChart3 className="h-4 w-4" />
          {t("live.publicScoreboard")}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: stats + sections */}
        <div className="lg:col-span-2 space-y-6">
          {/* Top stats */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <Users className="h-4 w-4" /> {t("live.pairs")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{totalPairs}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <Activity className="h-4 w-4" /> {t("live.active")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="truncate text-sm font-bold">{activeSection?.name ?? "—"}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <CheckCircle2 className="h-4 w-4" /> {t("live.done")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{completedSections.length}</p>
                <p className="text-xs text-[var(--text-tertiary)]">{t("common.of")} {sections?.length ?? 0}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <Clock className="h-4 w-4" /> {t("live.pending")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{pendingSections.length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Active section */}
          {activeSection && (
            <Card className="border-[var(--accent)]/30 bg-[var(--accent)]/3">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" />
                    {t("live.activeSection", { name: activeSection.name })}
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      router.push(`/dashboard/competitions/${id}/sections/${activeSection.id}`)
                    }
                  >
                    {t("live.manageSection")} <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
                  <span>{activeSection.ageCategory}</span>
                  <span>·</span>
                  <span>{activeSection.level}</span>
                  <span>·</span>
                  <span>{activeSection.danceStyle}</span>
                  <span>·</span>
                  <span>{activeSection.registeredPairsCount} {t("common.pairs")}</span>
                  <span>·</span>
                  <span>{t("section.dances", { count: activeSection.dances.length })}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* All sections status */}
          <div>
            <h3 className="mb-3 font-semibold text-[var(--text-primary)]">{t("live.allSections")}</h3>
            <div className="flex flex-col gap-2">
              {sections?.map((section) => (
                <Card
                  key={section.id}
                  className={cn(
                    "cursor-pointer hover:shadow-sm",
                    section.status === "ACTIVE" && "ring-1 ring-[var(--accent)]/30"
                  )}
                  onClick={() => router.push(`/dashboard/competitions/${id}/sections/${section.id}`)}
                >
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          section.status === "ACTIVE"
                            ? "animate-pulse bg-[var(--accent)]"
                            : section.status === "COMPLETED"
                            ? "bg-[var(--success)]"
                            : "bg-[var(--border)]"
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium">{section.name}</p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {section.ageCategory} · {section.level} · {t("section.dances", { count: section.dances.length })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-[var(--text-secondary)]">
                        {section.registeredPairsCount} {t("common.pairs")}
                      </span>
                      <Badge
                        variant={
                          section.status === "COMPLETED"
                            ? "success"
                            : section.status === "ACTIVE"
                            ? "warning"
                            : "secondary"
                        }
                      >
                        {section.status}
                      </Badge>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          title={t("live.manageSection")}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/competitions/${id}/sections/${section.id}`);
                          }}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        {section.status === "COMPLETED" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            title={t("round.viewResults")}
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/competitions/${id}/sections/${section.id}/results`);
                            }}
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          title={t("section.danceOffs")}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/competitions/${id}/sections/${section.id}/dance-offs`);
                          }}
                        >
                          <Swords className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Alerts feed */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-[var(--text-primary)]">{t("live.alerts")}</h3>
            {relevantAlerts.filter((a) => !a.read).length > 0 && (
              <span className="rounded-full bg-[var(--destructive)] px-2 py-0.5 text-xs font-bold text-white">
                {t("live.newAlerts", { count: relevantAlerts.filter((a) => !a.read).length })}
              </span>
            )}
          </div>

          {relevantAlerts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                <CheckCircle2 className="h-8 w-8 text-[var(--success)]" />
                <p className="text-sm text-[var(--text-secondary)]">{t("live.allClear")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {relevantAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "flex gap-3 rounded-[var(--radius-lg)] border p-3 transition-colors",
                    alertBg(alert.level),
                    !alert.read && "ring-1 ring-offset-0",
                    alert.level === "warning" && !alert.read && "ring-[var(--warning)]/30",
                    alert.level === "error" && !alert.read && "ring-[var(--destructive)]/30"
                  )}
                  onClick={() => markRead(alert.id)}
                >
                  {alertIcon(alert.level)}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{alert.title}</p>
                    {alert.description && (
                      <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{alert.description}</p>
                    )}
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-xs text-[var(--text-tertiary)]">
                        {formatTime(alert.createdAt.toISOString())}
                      </span>
                      {alert.actionLabel && alert.actionHref && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(alert.actionHref!);
                          }}
                          className="text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)]"
                        >
                          {alert.actionLabel} →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
