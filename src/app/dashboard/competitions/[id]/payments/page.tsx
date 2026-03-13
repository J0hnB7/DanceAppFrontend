"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  MinusCircle,
  Download,
  Filter,
  CreditCard,
  DollarSign,
  Clock,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { paymentsApi, type PaymentRecord } from "@/lib/api/payments";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, "default" | "success" | "warning" | "destructive"> = {
  PAID: "success",
  PENDING: "warning",
  REFUNDED: "default",
  WAIVED: "default",
};

type FilterStatus = "ALL" | "PENDING" | "PAID" | "WAIVED" | "REFUNDED";

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--text-secondary)]">{label}</p>
          <p className={cn("mt-1 text-xl font-bold", color)}>{value}</p>
        </div>
        <div className={cn("rounded-xl p-2.5", color.includes("green") ? "bg-green-100 dark:bg-green-950" : color.includes("amber") ? "bg-amber-100 dark:bg-amber-950" : "bg-[var(--surface-secondary)]")}>
          <Icon className={cn("h-5 w-5", color)} />
        </div>
      </div>
    </Card>
  );
}

export default function PaymentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: competitionId } = use(params);
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actioningId, setActioningId] = useState<string | null>(null);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments", competitionId],
    queryFn: () => paymentsApi.list(competitionId),
  });

  const { data: summary } = useQuery({
    queryKey: ["payments-summary", competitionId],
    queryFn: () => paymentsApi.summary(competitionId),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["payments", competitionId] });
    qc.invalidateQueries({ queryKey: ["payments-summary", competitionId] });
  };

  const { mutate: markPaid } = useMutation({
    mutationFn: (id: string) => paymentsApi.markPaid(competitionId, id),
    onMutate: (id) => setActioningId(id),
    onSettled: () => setActioningId(null),
    onSuccess: () => { invalidate(); toast({ title: "Marked as paid", variant: "success" }); },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  const { mutate: waive } = useMutation({
    mutationFn: (id: string) => paymentsApi.waive(competitionId, id),
    onMutate: (id) => setActioningId(id),
    onSettled: () => setActioningId(null),
    onSuccess: () => { invalidate(); toast({ title: "Payment waived", variant: "success" }); },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  const { mutate: bulkPaid, isPending: bulkPending } = useMutation({
    mutationFn: () => paymentsApi.bulkMarkPaid(competitionId, [...selectedIds]),
    onSuccess: () => {
      invalidate();
      setSelectedIds(new Set());
      toast({ title: `${selectedIds.size} payments marked as paid`, variant: "success" });
    },
    onError: () => toast({ title: "Bulk update failed", variant: "destructive" }),
  });

  const filtered = filter === "ALL" ? payments : payments.filter((p) => p.status === filter);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const pendingIds = filtered.filter((p) => p.status === "PENDING").map((p) => p.id);
    if (pendingIds.every((id) => selectedIds.has(id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingIds));
    }
  };

  return (
    <AppShell title="Payments">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Payments</h1>
          <Button variant="outline" size="sm" onClick={() => paymentsApi.exportCsv(competitionId)} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Stats */}
        {summary ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Total expected"
              value={formatCurrency(summary.totalExpected, summary.currency)}
              icon={DollarSign}
              color="text-[var(--text-primary)]"
            />
            <StatCard
              label="Collected"
              value={formatCurrency(summary.totalCollected, summary.currency)}
              icon={TrendingUp}
              color="text-green-600 dark:text-green-400"
            />
            <StatCard
              label="Pending"
              value={formatCurrency(summary.totalPending, summary.currency)}
              icon={Clock}
              color="text-amber-600 dark:text-amber-400"
            />
            <StatCard
              label="Paid count"
              value={`${summary.paidCount} / ${summary.paidCount + summary.pendingCount}`}
              icon={CreditCard}
              color="text-[var(--accent)]"
            />
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        )}

        {/* Filters + bulk actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-[var(--text-tertiary)]" />
          {(["ALL", "PENDING", "PAID", "WAIVED", "REFUNDED"] as FilterStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filter === s
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]"
              )}
            >
              {s}
            </button>
          ))}

          {selectedIds.size > 0 && (
            <Button size="sm" onClick={() => bulkPaid()} loading={bulkPending} className="ml-auto gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Mark {selectedIds.size} as paid
            </Button>
          )}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="flex flex-col items-center py-16 gap-3 text-center">
            <CreditCard className="h-10 w-10 text-[var(--text-tertiary)]" />
            <p className="text-sm text-[var(--text-secondary)]">No payments found.</p>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-secondary)] text-xs text-[var(--text-tertiary)]">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      onChange={toggleAll}
                      checked={filtered.filter((p) => p.status === "PENDING").every((p) => selectedIds.has(p.id)) && filtered.some((p) => p.status === "PENDING")}
                      className="rounded accent-[var(--accent)]"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Dancer</th>
                  <th className="px-4 py-3 text-left font-medium">Section</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Due</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
                {filtered.map((p) => (
                  <tr key={p.id} className={cn("hover:bg-[var(--surface-secondary)]", selectedIds.has(p.id) && "bg-[var(--accent)]/5")}>
                    <td className="px-4 py-3">
                      {p.status === "PENDING" && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.id)}
                          onChange={() => toggleSelect(p.id)}
                          className="rounded accent-[var(--accent)]"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--text-primary)]">
                        {p.dancer1Name}{p.dancer2Name ? ` & ${p.dancer2Name}` : ""}
                      </p>
                      {p.startNumber && (
                        <p className="text-xs text-[var(--text-tertiary)]">#{p.startNumber}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{p.sectionName}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[var(--text-primary)]">
                      {formatCurrency(p.amount, p.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_COLORS[p.status]}>{p.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] text-xs">
                      {p.paidAt ? `Paid ${formatDate(p.paidAt)}` : p.dueDate ? formatDate(p.dueDate) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {p.status === "PENDING" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50 gap-1 text-xs"
                              onClick={() => markPaid(p.id)}
                              loading={actioningId === p.id}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Paid
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] gap-1 text-xs"
                              onClick={() => waive(p.id)}
                              loading={actioningId === p.id}
                            >
                              <MinusCircle className="h-3.5 w-3.5" />
                              Waive
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
