"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, XCircle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { crisisApi, type WithdrawalReason, type PenaltyType } from "@/lib/api/crisis";
import type { PairDto } from "@/lib/api/pairs";
import { toast } from "@/hooks/use-toast";

// ── Withdrawal form ────────────────────────────────────────────────────────────

const withdrawalSchema = z.object({
  pairId: z.string().min(1, "Select a pair"),
  reason: z.enum(["injury", "disqualification", "voluntary"]),
  notes: z.string().optional(),
});
type WithdrawalForm = z.infer<typeof withdrawalSchema>;

interface WithdrawalModalProps {
  open: boolean;
  onClose: () => void;
  competitionId: string;
  pairs: PairDto[];
}

export function WithdrawalModal({ open, onClose, competitionId, pairs }: WithdrawalModalProps) {
  const qc = useQueryClient();

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<WithdrawalForm>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: { reason: "voluntary" },
  });

  const withdraw = useMutation({
    mutationFn: (data: WithdrawalForm) =>
      crisisApi.withdraw(competitionId, data.pairId, {
        reason: data.reason as WithdrawalReason,
        notes: data.notes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pairs", competitionId] });
      toast({ title: "Pair withdrawn — results will be recalculated", variant: "warning" } as Parameters<typeof toast>[0]);
      reset();
      onClose();
    },
    onError: () => toast({ title: "Failed to process withdrawal", variant: "destructive" } as Parameters<typeof toast>[0]),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[var(--destructive)]">
            <XCircle className="h-5 w-5" />
            Withdrawal
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((d) => withdraw.mutate(d))} className="flex flex-col gap-4">
          <div className="rounded-[var(--radius-md)] border border-[var(--warning)]/30 bg-[var(--warning)]/5 p-3 text-sm text-[var(--text-secondary)]">
            <AlertTriangle className="mb-1 h-4 w-4 text-[var(--warning)]" />
            Results will be automatically recalculated after withdrawal.
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Pair</label>
            <Controller
              control={control}
              name="pairId"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <SelectTrigger error={!!errors.pairId}>
                    <SelectValue placeholder="Select pair..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pairs.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        #{p.startNumber} — {p.dancer1FirstName} {p.dancer1LastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Reason</label>
            <Controller
              control={control}
              name="reason"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="voluntary">Voluntary withdrawal</SelectItem>
                    <SelectItem value="injury">Injury</SelectItem>
                    <SelectItem value="disqualification">Disqualification</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <Input
            label="Notes (optional)"
            placeholder="Additional details..."
            {...register("notes")}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="destructive" loading={withdraw.isPending}>
              Confirm withdrawal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Penalty form ──────────────────────────────────────────────────────────────

const penaltySchema = z.object({
  pairId: z.string().min(1, "Select a pair"),
  type: z.enum(["warning", "point_penalty", "disqualification"]),
  points: z.string().optional(),
  reason: z.string().min(1, "Reason required"),
  notes: z.string().optional(),
});
type PenaltyForm = z.infer<typeof penaltySchema>;

interface PenaltyModalProps {
  open: boolean;
  onClose: () => void;
  competitionId: string;
  pairs: PairDto[];
}

export function PenaltyModal({ open, onClose, competitionId, pairs }: PenaltyModalProps) {
  const qc = useQueryClient();

  const { register, control, handleSubmit, reset, watch, formState: { errors } } = useForm<PenaltyForm>({
    resolver: zodResolver(penaltySchema),
    defaultValues: { type: "warning" },
  });

  const penaltyType = watch("type");

  const penalty = useMutation({
    mutationFn: (data: PenaltyForm) =>
      crisisApi.addPenalty(competitionId, data.pairId, {
        type: data.type as PenaltyType,
        points: data.points ? parseInt(data.points) : undefined,
        reason: data.reason,
        notes: data.notes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pairs", competitionId] });
      toast({ title: "Penalty applied", variant: "warning" } as Parameters<typeof toast>[0]);
      reset();
      onClose();
    },
    onError: () => toast({ title: "Failed to apply penalty", variant: "destructive" } as Parameters<typeof toast>[0]),
  });

  const PRESET_REASONS = [
    "Late arrival",
    "Incorrect attire",
    "Unsporting behavior",
    "Rule violation",
    "Other",
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[var(--warning)]">
            <ShieldAlert className="h-5 w-5" />
            Apply penalty
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((d) => penalty.mutate(d))} className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Pair</label>
            <Controller
              control={control}
              name="pairId"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <SelectTrigger error={!!errors.pairId}>
                    <SelectValue placeholder="Select pair..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pairs.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        #{p.startNumber} — {p.dancer1FirstName} {p.dancer1LastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Penalty type</label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warning">⚠️ Warning</SelectItem>
                    <SelectItem value="point_penalty">➕ Point penalty</SelectItem>
                    <SelectItem value="disqualification">❌ Disqualification</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {penaltyType === "point_penalty" && (
            <Input
              label="Penalty points"
              type="number"
              min={1}
              max={10}
              placeholder="e.g. 2"
              hint="Points added to the pair's total sum (worse ranking)"
              error={errors.points?.message}
              {...register("points")}
            />
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Reason <span className="text-[var(--destructive)]">*</span>
            </label>
            <Controller
              control={control}
              name="reason"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <SelectTrigger error={!!errors.reason}>
                    <SelectValue placeholder="Select reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_REASONS.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <Input
            label="Additional notes (optional)"
            placeholder="Free text details..."
            {...register("notes")}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={penalty.isPending}>
              Apply penalty
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
