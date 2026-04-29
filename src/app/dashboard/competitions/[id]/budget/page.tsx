"use client";

import { use, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { AppShell } from "@/components/layout/app-shell";
import { CompetitionSidebar } from "@/components/layout/competition-sidebar";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { budgetApi, type ExpenseCategory, type ExpenseDto } from "@/lib/api/budget";
import { formatCurrency, cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useLocale } from "@/contexts/locale-context";

const CATEGORIES: ExpenseCategory[] = [
  "VENUE",
  "DJ",
  "SCORER",
  "JUDGE_FEE",
  "PRINTING",
  "CATERING",
  "OTHER",
];

const CURRENCIES = ["CZK", "EUR", "USD"];

const expenseSchema = z.object({
  name: z.string().min(1),
  category: z.enum([
    "VENUE",
    "DJ",
    "SCORER",
    "JUDGE_FEE",
    "PRINTING",
    "CATERING",
    "OTHER",
  ]),
  amount: z
    .string()
    .min(1)
    .refine((v) => parseFloat(v) > 0, { message: "Must be > 0" }),
  currency: z.string().min(1),
  note: z.string().optional(),
});

type ExpenseForm = z.infer<typeof expenseSchema>;

export default function BudgetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const qc = useQueryClient();
  const { t } = useLocale();

  const [dialog, setDialog] = useState<{ open: boolean; expenseId?: string }>({
    open: false,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["budget", id],
    queryFn: () => budgetApi.getSummary(id),
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { category: "OTHER", currency: "CZK" },
  });

  // MED-30: useApiMutation provides a default destructive-toast onError so
  // 409/422/5xx surfaces visibly instead of silently rejecting. Migrating
  // budget/page.tsx as the proof case (audit explicitly flagged 4 mutations
  // with 0 onError here); other pages will be migrated incrementally.
  const createMut = useApiMutation({
    mutationFn: (d: ExpenseForm) =>
      budgetApi.createExpense(id, { ...d, amount: parseFloat(d.amount) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budget", id] });
      setDialog({ open: false });
      reset();
      toast({ title: t("budget.addExpense"), description: "OK" });
    },
  });

  const updateMut = useApiMutation({
    mutationFn: ({
      expenseId,
      d,
    }: {
      expenseId: string;
      d: ExpenseForm;
    }) =>
      budgetApi.updateExpense(id, expenseId, {
        ...d,
        amount: parseFloat(d.amount),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budget", id] });
      setDialog({ open: false });
      reset();
    },
  });

  const deleteMut = useApiMutation({
    mutationFn: (expenseId: string) => budgetApi.deleteExpense(id, expenseId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budget", id] }),
  });

  function openCreate() {
    reset({ category: "OTHER", currency: "CZK", name: "", amount: "", note: "" });
    setDialog({ open: true });
  }

  function openEdit(expense: ExpenseDto) {
    reset({
      name: expense.name,
      category: expense.category,
      amount: String(expense.amount),
      currency: expense.currency,
      note: expense.note ?? "",
    });
    setDialog({ open: true, expenseId: expense.id });
  }

  function onSubmit(d: ExpenseForm) {
    if (dialog.expenseId) {
      updateMut.mutate({ expenseId: dialog.expenseId, d });
    } else {
      createMut.mutate(d);
    }
  }

  const profit = data?.netProfit ?? 0;
  const profitAccent =
    profit > 0 ? "positive" : profit < 0 ? "negative" : "neutral";

  const displayCurrency = data?.currency ?? "CZK";

  return (
    <AppShell sidebar={<CompetitionSidebar competitionId={id} />}>
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <PageHeader
          title={t("budget.title")}
          actions={
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t("budget.addExpense")}
            </Button>
          }
        />

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <SummaryCard
            label={t("budget.paidRevenue")}
            value={data ? formatCurrency(data.paidRevenue, displayCurrency) : "—"}
            accent="positive"
            loading={isLoading}
          />
          <SummaryCard
            label={t("budget.pendingRevenue")}
            value={data ? formatCurrency(data.pendingRevenue, displayCurrency) : "—"}
            accent="neutral"
            loading={isLoading}
          />
          <SummaryCard
            label={t("budget.totalExpenses")}
            value={data ? formatCurrency(data.totalExpenses, displayCurrency) : "—"}
            accent="negative"
            loading={isLoading}
          />
          <SummaryCard
            label={t("budget.netProfit")}
            value={data ? formatCurrency(data.netProfit, displayCurrency) : "—"}
            accent={profitAccent}
            loading={isLoading}
            subLabel={
              data
                ? `${t("budget.projectedProfit")}: ${formatCurrency(data.projectedProfit, displayCurrency)}`
                : undefined
            }
          />
        </div>

        {/* Expenses table */}
        <Card>
          <CardContent className="p-0">
            {!data || data.expenses.length === 0 ? (
              <div className="py-12 text-center text-sm text-[var(--text-tertiary)]">
                {t("budget.noExpenses")}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-tertiary)]">
                    <th className="px-4 py-3 text-left font-medium">
                      {t("budget.expenseName")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      {t("budget.expenseCategory")}
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      {t("budget.expenseAmount")}
                    </th>
                    <th className="w-20 px-4 py-3 text-right font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {data.expenses.map((exp) => (
                    <tr
                      key={exp.id}
                      className="border-b border-[var(--border)] last:border-0 transition-colors hover:bg-[var(--surface-secondary)]"
                    >
                      <td className="px-4 py-3 font-medium text-[var(--text)]">
                        {exp.name}
                        {exp.note && (
                          <div className="text-xs text-[var(--text-tertiary)]">
                            {exp.note}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">
                          {t(`budget.categories.${exp.category}`)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[var(--text)]">
                        {formatCurrency(exp.amount, exp.currency)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(exp)}
                            className="rounded-md p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--surface-secondary)] hover:text-[var(--text)]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(t("budget.deleteConfirm"))) {
                                deleteMut.mutate(exp.id);
                              }
                            }}
                            className="rounded-md p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--surface-secondary)] hover:text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[var(--border)] bg-[var(--surface-secondary)]">
                    <td
                      colSpan={2}
                      className="px-4 py-3 text-sm font-semibold text-[var(--text-secondary)]"
                    >
                      {t("budget.totalExpenses")}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[var(--text)]">
                      {data
                        ? formatCurrency(data.totalExpenses, displayCurrency)
                        : "—"}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit dialog */}
      <Dialog
        open={dialog.open}
        onOpenChange={(o) => !o && setDialog({ open: false })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog.expenseId
                ? t("budget.editExpense")
                : t("budget.addExpense")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                {t("budget.expenseName")}
              </label>
              <Input
                {...register("name")}
                placeholder="Např. Pronájem sálu"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                {t("budget.expenseCategory")}
              </label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {t(`budget.categories.${c}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                  {t("budget.expenseAmount")}
                </label>
                <Input
                  {...register("amount")}
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                />
                {errors.amount && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.amount.message}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                  {t("budget.expenseCurrency")}
                </label>
                <Controller
                  name="currency"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                {t("budget.expenseNote")}
              </label>
              <Input
                {...register("note")}
                placeholder="Volitelná poznámka…"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialog({ open: false })}
              >
                Zrušit
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  createMut.isPending ||
                  updateMut.isPending
                }
              >
                Uložit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

/* ─── Summary card ─────────────────────────────────────────────────────────── */
function SummaryCard({
  label,
  value,
  accent,
  loading,
  subLabel,
}: {
  label: string;
  value: string;
  accent: "positive" | "negative" | "neutral";
  loading?: boolean;
  subLabel?: string;
}) {
  const accentClass = {
    positive: "text-green-500",
    negative: "text-red-500",
    neutral: "text-[var(--text)]",
  }[accent];

  return (
    <Card>
      <CardContent className="p-3 sm:p-4">
        <div className="text-xs font-medium text-[var(--text-tertiary)]">
          {label}
        </div>
        {loading ? (
          <div className="mt-1 h-6 w-24 animate-pulse rounded bg-[var(--surface-secondary)]" />
        ) : (
          <div className={cn("mt-1 break-words text-base font-bold leading-tight sm:text-xl", accentClass)}>
            {value}
          </div>
        )}
        {subLabel && (
          <div className="mt-0.5 text-xs text-[var(--text-tertiary)]">
            {subLabel}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
