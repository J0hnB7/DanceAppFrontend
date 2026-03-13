"use client";

import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { competitionsApi } from "@/lib/api/competitions";
import { pairsApi, type PairDto } from "@/lib/api/pairs";

type PairWithComp = PairDto & { competitionName: string };

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
    key: "dancer1LastName",
    label: "Dancer 1",
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
    label: "Dancer 2",
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
    label: "Club",
    sortable: true,
    render: (row) => (
      <p className="text-xs text-[var(--text-secondary)]">{row.dancer1Club ?? "—"}</p>
    ),
  },
  {
    key: "competitionName",
    label: "Competition",
    sortable: true,
    render: (row) => (
      <p className="text-xs text-[var(--text-secondary)] truncate max-w-36">{row.competitionName}</p>
    ),
  },
  {
    key: "paymentStatus",
    label: "Payment",
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

export default function ParticipantsPage() {
  const { data: compsData, isLoading: loadingComps } = useQuery({
    queryKey: ["competitions", "all"],
    queryFn: () => competitionsApi.list({ size: 100 }),
  });

  const competitions = compsData?.content ?? [];

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
  const paidCount = allPairs.filter((p) => p.paymentStatus === "PAID").length;
  const pendingCount = allPairs.filter((p) => p.paymentStatus === "PENDING").length;

  return (
    <AppShell>
      <PageHeader
        title="Participants"
        description={`${allPairs.length} total pairs across ${competitions.length} competitions`}
      />

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-[var(--text-primary)]">{allPairs.length}</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Total pairs</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{paidCount}</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Paid</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-amber-600">{pendingCount}</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Pending payment</p>
        </Card>
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
          searchPlaceholder="Search by name, club or number..."
          searchKeys={["dancer1FirstName", "dancer1LastName", "dancer2FirstName", "dancer2LastName", "dancer1Club", "competitionName"]}
          exportable
          exportFilename="participants"
          emptyMessage="No pairs registered yet"
        />
      )}
    </AppShell>
  );
}
