"use client";

import { use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Send,
  DollarSign,
  Clock,
  CreditCard,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { invoicesApi, type InvoiceDto } from "@/lib/api/payments";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/locale-context";

const STATUS_COLORS: Record<string, "default" | "success" | "warning" | "destructive"> = {
  PAID: "success",
  SENT: "warning",
  DRAFT: "default",
  REFUNDED: "destructive",
};

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
  const { t } = useLocale();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices", competitionId],
    queryFn: () => invoicesApi.list(competitionId),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["invoices", competitionId] });

  const { mutate: markPaid, variables: markPaidId, isPending: markingPaid } = useMutation({
    mutationFn: (invoiceId: string) => invoicesApi.markPaid(competitionId, invoiceId),
    onSuccess: () => { invalidate(); toast({ title: t("payments.markedPaid"), variant: "success" }); },
    onError: () => toast({ title: t("payments.failed"), variant: "destructive" }),
  });

  const { mutate: sendInvoice, variables: sendId, isPending: sending } = useMutation({
    mutationFn: (invoiceId: string) => invoicesApi.send(competitionId, invoiceId),
    onSuccess: () => { invalidate(); toast({ title: t("payments.sentInvoice"), variant: "success" }); },
    onError: () => toast({ title: t("payments.failedToSend"), variant: "destructive" }),
  });

  const paidInvoices = invoices.filter((i: InvoiceDto) => i.status === "PAID");
  const pendingInvoices = invoices.filter((i: InvoiceDto) => i.status !== "PAID" && i.status !== "REFUNDED");
  const totalCollected = paidInvoices.reduce((sum: number, i: InvoiceDto) => sum + i.amount, 0);
  const totalPending = pendingInvoices.reduce((sum: number, i: InvoiceDto) => sum + i.amount, 0);
  const currency = invoices[0]?.currency ?? "EUR";

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">{t("payments.title")}</h1>
        </div>

        {/* Stats */}
        {!isLoading && invoices.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label={t("payments.totalInvoices")} value={String(invoices.length)} icon={CreditCard} color="text-[var(--text-primary)]" />
            <StatCard label={t("payments.collected")} value={formatCurrency(totalCollected, currency)} icon={TrendingUp} color="text-green-600 dark:text-green-400" />
            <StatCard label={t("payments.pending")} value={formatCurrency(totalPending, currency)} icon={Clock} color="text-amber-600 dark:text-amber-400" />
            <StatCard label={t("payments.paid")} value={t("payments.paidCount", { paid: paidInvoices.length, total: invoices.length })} icon={DollarSign} color="text-[var(--accent)]" />
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : invoices.length === 0 ? (
          <Card className="flex flex-col items-center py-16 gap-3 text-center">
            <CreditCard className="h-10 w-10 text-[var(--text-tertiary)]" />
            <p className="text-sm text-[var(--text-secondary)]">{t("payments.noInvoices")}</p>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-secondary)] text-xs text-[var(--text-tertiary)]">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">{t("payments.invoiceNumber")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("payments.amount")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("payments.status")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("payments.paidAt")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("payments.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
                {invoices.map((inv: InvoiceDto) => (
                  <tr key={inv.id} className="hover:bg-[var(--surface-secondary)]">
                    <td className="px-4 py-3 font-mono text-[var(--text-secondary)]">
                      {inv.invoiceNumber ?? inv.id.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-[var(--text-primary)]">
                      {formatCurrency(inv.amount, inv.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_COLORS[inv.status]}>{inv.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] text-xs">
                      {inv.paidAt ? formatDate(inv.paidAt) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {inv.status === "DRAFT" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-xs text-[var(--accent)]"
                            onClick={() => sendInvoice(inv.id)}
                            loading={sending && sendId === inv.id}
                          >
                            <Send className="h-3.5 w-3.5" />
                            {t("payments.send")}
                          </Button>
                        )}
                        {(inv.status === "SENT" || inv.status === "DRAFT") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => markPaid(inv.id)}
                            loading={markingPaid && markPaidId === inv.id}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {t("payments.markPaid")}
                          </Button>
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
