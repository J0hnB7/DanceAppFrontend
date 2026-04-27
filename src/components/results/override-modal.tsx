"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/locale-context";
import { AlertTriangle } from "lucide-react";

export interface MissingJudgeInfo {
  judgeTokenId: string;
  judgeNumber: number;
  submitted: number;
  expected: number;
}

interface OverrideModalProps {
  open: boolean;
  onClose: () => void;
  missingJudges: MissingJudgeInfo[];
  totalJudges: number;
  submitting: boolean;
  errorMessage?: string | null;
  onSubmit: (payload: { withdrawJudgeTokenIds: string[]; reason: string }) => void;
}

export function OverrideModal({
  open,
  onClose,
  missingJudges,
  totalJudges,
  submitting,
  errorMessage,
  onSubmit,
}: OverrideModalProps) {
  const { t } = useLocale();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const remaining = useMemo(() => totalJudges - selected.size, [totalJudges, selected.size]);
  const reasonOk = reason.trim().length >= 10 && reason.trim().length <= 1000;
  const judgesOk = selected.size > 0 && remaining >= 3;
  const canSubmit = confirmed && reasonOk && judgesOk && !submitting;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClose = () => {
    if (submitting) return;
    setSelected(new Set());
    setReason("");
    setConfirmed(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden="true" />
            {t("results.overrideTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("results.overrideDesc", { missing: missingJudges.length, total: totalJudges })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-2 max-h-48 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--surface-secondary)] p-3">
            {missingJudges.map((j) => (
              <label
                key={j.judgeTokenId}
                className="flex items-center gap-3 cursor-pointer rounded p-1 hover:bg-[var(--surface-hover)]"
              >
                <input
                  type="checkbox"
                  checked={selected.has(j.judgeTokenId)}
                  onChange={() => toggle(j.judgeTokenId)}
                  className="h-4 w-4 cursor-pointer"
                  disabled={submitting}
                />
                <span className="text-sm text-[var(--text-primary)]">
                  {t("results.overrideJudgeRow", {
                    number: j.judgeNumber,
                    submitted: j.submitted,
                    expected: j.expected,
                  })}
                </span>
              </label>
            ))}
          </div>

          {!judgesOk && selected.size > 0 && remaining < 3 && (
            <p className="text-xs text-[var(--destructive)]">
              {t("results.overrideTooFewJudges")}
            </p>
          )}

          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("results.overrideReasonLabel")}
            disabled={submitting}
            minLength={10}
            maxLength={1000}
            rows={3}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none disabled:opacity-50"
          />
          <div className="text-right text-xs text-[var(--text-tertiary)]">
            {reason.trim().length}/1000
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              disabled={submitting}
              className="mt-0.5 h-4 w-4 cursor-pointer"
            />
            <span className="text-sm text-[var(--text-primary)]">
              {t("results.overrideAcknowledge")}
            </span>
          </label>

          {errorMessage && (
            <p className="rounded-md bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">
              {errorMessage}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            {t("results.overrideCancel")}
          </Button>
          <Button
            disabled={!canSubmit}
            onClick={() =>
              onSubmit({
                withdrawJudgeTokenIds: Array.from(selected),
                reason: reason.trim(),
              })
            }
          >
            {submitting
              ? t("results.recalculating")
              : t("results.overrideSubmit", { remaining })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
