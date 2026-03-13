"use client";

import { use, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Tag, EuroIcon } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { feesApi } from "@/lib/api/fees";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const feeSchema = z.object({
  name: z.string().min(1, "Required"),
  amount: z.string().min(1, "Required"),
  dueDate: z.string().optional(),
});

const discountSchema = z.object({
  code: z.string().min(3, "Min 3 characters").toUpperCase(),
  type: z.enum(["PERCENTAGE", "FIXED"]),
  value: z.string().min(1, "Required"),
  maxUses: z.string().optional(),
  expiresAt: z.string().optional(),
});

type FeeForm = z.infer<typeof feeSchema>;
type DiscountForm = z.infer<typeof discountSchema>;

export default function FeesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [feeDialog, setFeeDialog] = useState(false);
  const [discountDialog, setDiscountDialog] = useState(false);

  const { data: fees } = useQuery({
    queryKey: ["fees", id],
    queryFn: () => feesApi.listFees(id),
  });

  const { data: discounts } = useQuery({
    queryKey: ["discounts", id],
    queryFn: () => feesApi.listDiscounts(id),
  });

  const createFee = useMutation({
    mutationFn: (d: FeeForm) =>
      feesApi.createFee(id, { name: d.name, amount: parseFloat(d.amount), dueDate: d.dueDate }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fees", id] });
      setFeeDialog(false);
      feeForm.reset();
      toast({ title: "Fee created", variant: "success" } as Parameters<typeof toast>[0]);
    },
  });

  const deleteFee = useMutation({
    mutationFn: (feeId: string) => feesApi.deleteFee(id, feeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fees", id] }),
  });

  const createDiscount = useMutation({
    mutationFn: (d: DiscountForm) =>
      feesApi.createDiscount(id, {
        code: d.code,
        type: d.type,
        value: parseFloat(d.value),
        maxUses: d.maxUses ? parseInt(d.maxUses) : undefined,
        expiresAt: d.expiresAt,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discounts", id] });
      setDiscountDialog(false);
      discountForm.reset();
      toast({ title: "Discount code created", variant: "success" } as Parameters<typeof toast>[0]);
    },
  });

  const deactivateDiscount = useMutation({
    mutationFn: (discountId: string) => feesApi.deactivateDiscount(id, discountId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discounts", id] }),
  });

  const feeForm = useForm<FeeForm>({ resolver: zodResolver(feeSchema) });
  const discountForm = useForm<DiscountForm>({
    resolver: zodResolver(discountSchema),
    defaultValues: { type: "FIXED" },
  });

  return (
    <AppShell
      headerActions={
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setDiscountDialog(true)}>
            <Tag className="h-4 w-4" />
            Add discount
          </Button>
          <Button size="sm" onClick={() => setFeeDialog(true)}>
            <Plus className="h-4 w-4" />
            Add fee
          </Button>
        </div>
      }
    >
      <PageHeader title="Entry fees & discounts" description="Configure registration fees and discount codes" />

      {/* Fees */}
      <div className="mb-8">
        <h3 className="mb-3 font-semibold text-[var(--text-primary)]">Entry fees</h3>
        {!fees?.length ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-[var(--text-secondary)]">
              No fees configured. Pairs can register for free.
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {fees.map((fee) => (
              <Card key={fee.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium text-sm">{fee.name}</p>
                    {fee.dueDate && (
                      <p className="text-xs text-[var(--text-tertiary)]">Due: {fee.dueDate}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-[var(--text-primary)]">
                      {formatCurrency(fee.amount, fee.currency)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-[var(--text-tertiary)] hover:text-[var(--destructive)]"
                      onClick={() => deleteFee.mutate(fee.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Separator className="mb-8" />

      {/* Discounts */}
      <div>
        <h3 className="mb-3 font-semibold text-[var(--text-primary)]">Discount codes</h3>
        {!discounts?.length ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-[var(--text-secondary)]">
              No discount codes yet.
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {discounts.map((d) => (
              <Card key={d.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <code className="rounded bg-[var(--surface-secondary)] px-2 py-1 text-sm font-bold">
                      {d.code}
                    </code>
                    <div>
                      <p className="text-sm font-medium">
                        {d.type === "PERCENTAGE" ? `${d.value}% off` : formatCurrency(d.value)} discount
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {d.usedCount}{d.maxUses ? `/${d.maxUses}` : ""} uses
                        {d.expiresAt && ` · expires ${d.expiresAt}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={d.active ? "success" : "secondary"}>
                      {d.active ? "Active" : "Inactive"}
                    </Badge>
                    {d.active && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[var(--text-tertiary)]"
                        onClick={() => deactivateDiscount.mutate(d.id)}
                      >
                        Deactivate
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Fee Dialog */}
      <Dialog open={feeDialog} onOpenChange={setFeeDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add entry fee</DialogTitle>
          </DialogHeader>
          <form onSubmit={feeForm.handleSubmit((d) => createFee.mutate(d))} className="flex flex-col gap-4">
            <Input label="Fee name" placeholder="e.g. Standard registration" {...feeForm.register("name")} error={feeForm.formState.errors.name?.message} />
            <Input label="Amount (EUR)" type="number" min="0" step="0.01" placeholder="15.00" {...feeForm.register("amount")} error={feeForm.formState.errors.amount?.message} />
            <Input label="Due date (optional)" type="date" {...feeForm.register("dueDate")} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFeeDialog(false)}>Cancel</Button>
              <Button type="submit" loading={createFee.isPending}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Discount Dialog */}
      <Dialog open={discountDialog} onOpenChange={setDiscountDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create discount code</DialogTitle>
          </DialogHeader>
          <form onSubmit={discountForm.handleSubmit((d) => createDiscount.mutate(d))} className="flex flex-col gap-4">
            <Input
              label="Code"
              placeholder="EARLYBIRD"
              {...discountForm.register("code")}
              error={discountForm.formState.errors.code?.message}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium">Type</label>
              <Controller
                control={discountForm.control}
                name="type"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIXED">Fixed amount (€)</SelectItem>
                      <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <Input label="Value" type="number" min="0" step="0.01" {...discountForm.register("value")} error={discountForm.formState.errors.value?.message} />
            <Input label="Max uses (optional)" type="number" min="1" {...discountForm.register("maxUses")} />
            <Input label="Expires at (optional)" type="date" {...discountForm.register("expiresAt")} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDiscountDialog(false)}>Cancel</Button>
              <Button type="submit" loading={createDiscount.isPending}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
