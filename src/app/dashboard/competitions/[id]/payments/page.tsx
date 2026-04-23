"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Send,
  DollarSign,
  Clock,
  CreditCard,
  TrendingUp,
  Download,
  ArrowLeft,
  Plus,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { CompetitionSidebar } from "@/components/layout/competition-sidebar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { invoicesApi } from "@/lib/api/payments";
import { usePairs } from "@/hooks/queries/use-pairs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const iconBg = color.includes("green") ? "bg-green-100 dark:bg-green-950" : color.includes("amber") ? "bg-amber-100 dark:bg-amber-950" : "bg-[var(--surface-secondary)]";
  return (
    <Card className="px-3 py-3 sm:p-4">
      <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
        <div className={cn("mb-2 rounded-xl p-2 sm:hidden", iconBg)}>
          <Icon className={cn("h-4 w-4", color)} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[10px] text-[var(--text-secondary)] sm:text-xs">{label}</p>
          <p className={cn("truncate text-sm font-bold sm:mt-1 sm:text-xl", color)}>{value}</p>
        </div>
        <div className={cn("ml-3 hidden shrink-0 rounded-xl p-2.5 sm:block", iconBg)}>
          <Icon className={cn("h-5 w-5", color)} />
        </div>
      </div>
    </Card>
  );
}

export default function PaymentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: competitionId } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useLocale();

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPairId, setSelectedPairId] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceCurrency, setInvoiceCurrency] = useState("CZK");

  const { data: pairs } = usePairs(competitionId);

  const createInvoice = useMutation({
    mutationFn: () =>
      invoicesApi.create(competitionId, {
        pairId: selectedPairId || undefined,
        amount: parseFloat(invoiceAmount) || 0,
        currency: invoiceCurrency,
      }),
    onSuccess: () => {
      invalidate();
      toast({ title: t("payments.invoiceCreated"), variant: "success" });
      setCreateOpen(false);
      setSelectedPairId("");
      setInvoiceAmount("");
    },
    onError: () => toast({ title: t("payments.failedCreate"), variant: "destructive" }),
  });

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

  const paidInvoices = invoices.filter((i) => i.status === "PAID");
  const pendingInvoices = invoices.filter((i) => i.status !== "PAID" && i.status !== "REFUNDED");
  const totalCollected = paidInvoices.reduce((sum, i) => sum + i.amount, 0);
  const totalPending = pendingInvoices.reduce((sum, i) => sum + i.amount, 0);
  const currency = invoices[0]?.currency ?? "EUR";

  return (
    <AppShell sidebar={<CompetitionSidebar competitionId={competitionId} />}>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/dashboard/competitions/${competitionId}`)}
              className="shrink-0 rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
              aria-label={t("common.back")}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">{t("payments.title")}</h1>
          </div>
          <Button size="sm" className="shrink-0" onClick={() => setCreateOpen(true)} aria-label={t("payments.createInvoice")}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("payments.createInvoice")}</span>
          </Button>
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
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="bg-[var(--surface-secondary)] text-xs text-[var(--text-tertiary)]">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">{t("payments.invoiceNumber")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("payments.amount")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("payments.status")}</th>
                  <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">{t("payments.paidAt")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("payments.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
                {invoices.map((inv) => (
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
                    <td className="hidden px-4 py-3 text-[var(--text-secondary)] text-xs sm:table-cell">
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
                        {inv.status === "PAID" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-xs text-[var(--accent)]"
                            onClick={() => invoicesApi.downloadPdf(competitionId, inv.id)}
                          >
                            <Download className="h-3.5 w-3.5" />
                            {t("payments.invoicePdf")}
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

      {/* Create invoice dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("payments.createInvoice")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("payments.competitor")}</label>
              <Select onValueChange={setSelectedPairId} value={selectedPairId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("payments.selectCompetitor")} />
                </SelectTrigger>
                <SelectContent>
                  {pairs?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {String(p.startNumber).padStart(3, "0")} — {p.dancer1Name ?? `${p.dancer1FirstName} ${p.dancer1LastName}`}
                      {(p.dancer2Name ?? p.dancer2FirstName) ? ` & ${p.dancer2Name ?? `${p.dancer2FirstName} ${p.dancer2LastName}`}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t("payments.amount")}</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t("payments.currency")}</label>
                <Select onValueChange={setInvoiceCurrency} value={invoiceCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CZK">CZK</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>{t("common.cancel")}</Button>
              <Button
                onClick={() => createInvoice.mutate()}
                loading={createInvoice.isPending}
                disabled={!selectedPairId || !invoiceAmount}
              >
                {t("payments.create")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
