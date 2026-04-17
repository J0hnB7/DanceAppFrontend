"use client";

import { use, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { CompetitionSidebar } from "@/components/layout/competition-sidebar";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { useSection } from "@/hooks/queries/use-sections";
import { sectionsApi, type RegistrationListItem, type RegistrationStatus } from "@/lib/api/sections";
import { toast } from "@/hooks/use-toast";
import { useLocale } from "@/contexts/locale-context";
import { getErrorMessage } from "@/lib/utils";

type StatusFilter = "ALL" | "PENDING_PARTNER" | "CONFIRMED" | "DECIDED";

export default function SectionRegistrationsPage({
  params,
}: {
  params: Promise<{ id: string; sectionId: string }>;
}) {
  const { id: competitionId, sectionId } = use(params);
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const { data: section } = useSection(competitionId, sectionId);

  const { data: registrations, isLoading } = useQuery({
    queryKey: ["section-registrations", competitionId, sectionId],
    queryFn: () => sectionsApi.listRegistrations(competitionId, sectionId),
  });

  const approveMutation = useMutation({
    mutationFn: (pairSectionId: string) =>
      sectionsApi.approveRegistration(competitionId, pairSectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["section-registrations", competitionId, sectionId] });
      toast({ title: t("registrations.approveSuccess"), variant: "success" });
    },
    onError: (err) => {
      toast({ title: getErrorMessage(err, t("common.error")), variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (pairSectionId: string) =>
      sectionsApi.rejectRegistration(competitionId, pairSectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["section-registrations", competitionId, sectionId] });
      toast({ title: t("registrations.rejectSuccess"), variant: "success" });
    },
    onError: (err) => {
      toast({ title: getErrorMessage(err, t("common.error")), variant: "destructive" });
    },
  });

  const filtered = useMemo(() => {
    const items = registrations ?? [];
    if (statusFilter === "ALL") return items;
    if (statusFilter === "DECIDED") {
      return items.filter(
        (r) => r.status === "ORGANIZER_APPROVED" || r.status === "ORGANIZER_REJECTED"
      );
    }
    return items.filter((r) => r.status === statusFilter);
  }, [registrations, statusFilter]);

  const columns: DataTableColumn<RegistrationListItem>[] = [
    {
      key: "dancer1Name",
      label: t("registrations.colName"),
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-sm">{row.dancer1Name}</p>
          {row.dancer2Name && (
            <p className="text-xs text-[var(--text-secondary)]">{row.dancer2Name}</p>
          )}
        </div>
      ),
    },
    {
      key: "club",
      label: t("registrations.colClub"),
      sortable: true,
      render: (row) => (
        <span className="text-sm text-[var(--text-secondary)]">{row.club ?? "—"}</span>
      ),
    },
    {
      key: "gender",
      label: t("registrations.colGender"),
      sortable: true,
      render: (row) => (
        <span className="text-xs text-[var(--text-secondary)]">
          {row.gender ? t(`profile.gender${row.gender.charAt(0)}${row.gender.slice(1).toLowerCase()}`) : "—"}
        </span>
      ),
    },
    {
      key: "competitionType",
      label: t("registrations.colType"),
      sortable: true,
      render: (row) => {
        const isSolo = row.competitionType?.toUpperCase().startsWith("SOLO");
        return (
          <Badge variant="outline">
            {isSolo ? t("registrations.typeSolo") : t("registrations.typeCouple")}
          </Badge>
        );
      },
    },
    {
      key: "status",
      label: t("registrations.colStatus"),
      sortable: true,
      render: (row) => <StatusBadge status={row.status} t={t} />,
    },
    {
      key: "partnerConfirmedAt",
      label: t("registrations.colDate"),
      sortable: true,
      render: (row) => (
        <span className="text-xs text-[var(--text-tertiary)]">
          {row.partnerConfirmedAt
            ? new Date(row.partnerConfirmedAt).toLocaleDateString()
            : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex items-center gap-2 justify-end">
          {row.status === "CONFIRMED" && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => approveMutation.mutate(row.pairSectionId)}
                disabled={approveMutation.isPending}
                aria-label={t("registrations.approve")}
              >
                <Check className="h-4 w-4 text-[var(--success-text)]" aria-hidden="true" />
                <span className="hidden sm:inline ml-1">{t("registrations.approve")}</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => rejectMutation.mutate(row.pairSectionId)}
                disabled={rejectMutation.isPending}
                aria-label={t("registrations.reject")}
              >
                <X className="h-4 w-4 text-[var(--destructive-text)]" aria-hidden="true" />
                <span className="hidden sm:inline ml-1">{t("registrations.reject")}</span>
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppShell sidebar={<CompetitionSidebar competitionId={competitionId} />}>
      <PageHeader
        title={t("registrations.title")}
        description={section?.name}
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <FilterButton
          active={statusFilter === "ALL"}
          onClick={() => setStatusFilter("ALL")}
          label={t("registrations.filterAll")}
          count={registrations?.length ?? 0}
        />
        <FilterButton
          active={statusFilter === "PENDING_PARTNER"}
          onClick={() => setStatusFilter("PENDING_PARTNER")}
          label={t("registrations.filterPending")}
          count={registrations?.filter((r) => r.status === "PENDING_PARTNER").length ?? 0}
        />
        <FilterButton
          active={statusFilter === "CONFIRMED"}
          onClick={() => setStatusFilter("CONFIRMED")}
          label={t("registrations.filterConfirmed")}
          count={registrations?.filter((r) => r.status === "CONFIRMED").length ?? 0}
        />
        <FilterButton
          active={statusFilter === "DECIDED"}
          onClick={() => setStatusFilter("DECIDED")}
          label={t("registrations.filterDecided")}
          count={
            registrations?.filter(
              (r) => r.status === "ORGANIZER_APPROVED" || r.status === "ORGANIZER_REJECTED"
            ).length ?? 0
          }
        />
      </div>

      <div className="mt-4">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <DataTable
            data={filtered}
            columns={columns}
            rowKey={(r) => r.pairSectionId}
            searchable
            searchPlaceholder={t("registrations.searchPlaceholder")}
            searchKeys={["dancer1Name", "dancer2Name", "club"]}
            emptyMessage={t("registrations.empty")}
          />
        )}
      </div>
    </AppShell>
  );
}

function StatusBadge({
  status,
  t,
}: {
  status: RegistrationStatus;
  t: (key: string) => string;
}) {
  switch (status) {
    case "PENDING_PARTNER":
      return <Badge variant="warning">{t("registrations.statusPending")}</Badge>;
    case "CONFIRMED":
      return <Badge variant="info">{t("registrations.statusConfirmed")}</Badge>;
    case "ORGANIZER_APPROVED":
      return <Badge variant="success">{t("registrations.statusApproved")}</Badge>;
    case "ORGANIZER_REJECTED":
      return <Badge variant="destructive">{t("registrations.statusRejected")}</Badge>;
  }
}

function FilterButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <Button
      size="sm"
      variant={active ? "default" : "outline"}
      onClick={onClick}
    >
      {label} <span className="ml-1 opacity-70">({count})</span>
    </Button>
  );
}
