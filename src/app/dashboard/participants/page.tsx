"use client";

import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { competitionsApi } from "@/lib/api/competitions";
import { pairsApi, type PairDto } from "@/lib/api/pairs";
import { useLocale } from "@/contexts/locale-context";

type PairWithComp = PairDto & { competitionName: string };

export default function ParticipantsPage() {
  const { t } = useLocale();

  const columns: DataTableColumn<PairWithComp>[] = [
    {
      key: "startNumber",
      label: "#",
      sortable: true,
      className: "w-16",
      render: (row) => (
        <span className="font-mono font-semibold">
          {String(row.startNumber).padStart(3, "0")}
        </span>
      ),
    },
    {
      key: "athlete1Id",
      label: "ID",
      sortable: true,
      className: "w-20",
      render: (row) => (
        <span className="font-mono text-xs text-[var(--text-tertiary)]">
          {row.athlete1Id ?? "—"}
        </span>
      ),
    },
    {
      key: "dancer1LastName",
      label: t("participants.dancer1"),
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-sm">
            {row.dancer1FirstName} {row.dancer1LastName}
          </p>
        </div>
      ),
    },
    {
      key: "dancer2LastName",
      label: t("participants.dancer2"),
      sortable: true,
      render: (row) =>
        row.dancer2FirstName ? (
          <p className="text-sm">
            {row.dancer2FirstName} {row.dancer2LastName}
          </p>
        ) : (
          <span className="text-[var(--text-tertiary)]">—</span>
        ),
    },
    {
      key: "dancer1Club",
      label: t("participants.club"),
      sortable: true,
      render: (row) => (
        <p className="text-xs text-[var(--text-secondary)]">{row.dancer1Club ?? "—"}</p>
      ),
    },
    {
      key: "competitionName",
      label: t("participants.competition"),
      sortable: true,
      render: (row) => (
        <p className="text-xs text-[var(--text-secondary)] truncate max-w-36">{row.competitionName}</p>
      ),
    },
    {
      key: "paymentStatus",
      label: t("participants.payment"),
      sortable: true,
      render: (row) => (
        <Badge
          variant={
            row.paymentStatus === "PAID"
              ? "success"
              : row.paymentStatus === "WAIVED"
              ? "outline"
              : "warning"
          }
        >
          {row.paymentStatus}
        </Badge>
      ),
    },
  ];

  const { data: compsData, isLoading: loadingComps, isError: errorComps, refetch: refetchComps } = useQuery({
    queryKey: ["competitions", "all"],
    queryFn: () => competitionsApi.list(),
  });

  const competitions = compsData ?? [];

  const { data: allPairsData, isLoading: loadingPairs } = useQuery({
    queryKey: ["all-pairs", competitions.map((c) => c.id).join(",")],
    queryFn: async () => {
      const results = await Promise.all(
        competitions.map((c) =>
          pairsApi.list(c.id).then((pairs) =>
            pairs.map((p): PairWithComp => ({ ...p, competitionName: c.name }))
          )
        )
      );
      return results.flat();
    },
    enabled: competitions.length > 0,
  });

  const allPairs = allPairsData ?? [];
  const isLoading = loadingComps || loadingPairs;
  const isError = errorComps;
  const paidCount = allPairs.filter((p) => p.paymentStatus === "PAID").length;
  const pendingCount = allPairs.filter((p) => p.paymentStatus === "PENDING").length;

  if (isError) {
    return (
      <AppShell>
        <EmptyState icon={<AlertCircle className="h-10 w-10" />} title="Nepodařilo se načíst účastníky" description="Zkontroluj připojení nebo to zkus znovu." action={<Button onClick={() => refetchComps()}>Zkusit znovu</Button>} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-sora, Sora, sans-serif)" }}>
            {t("participants.title")}
          </h1>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
            {t("participants.description", { count: allPairs.length, competitions: competitions.length })}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard value={allPairs.length} label={t("participants.totalPairs")} sub={`${competitions.length} soutěží`} color="bg-blue-500" />
        <StatCard value={paidCount} label={t("participants.paid")} sub={`${allPairs.length > 0 ? Math.round((paidCount / allPairs.length) * 100) : 0}% zaplaceno`} color="bg-emerald-500" />
        <StatCard value={pendingCount} label={t("participants.pendingPayment")} sub="čeká na platbu" color="bg-amber-500" />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : (
        <DataTable
          data={allPairs}
          columns={columns}
          rowKey={(row) => row.id}
          searchable
          searchPlaceholder={t("participants.searchPlaceholder")}
          searchKeys={["dancer1FirstName", "dancer1LastName", "dancer2FirstName", "dancer2LastName", "dancer1Club", "competitionName"]}
          exportable
          exportFilename="participants"
          emptyMessage={t("participants.noRegistered")}
        />
      )}
    </AppShell>
  );
}
