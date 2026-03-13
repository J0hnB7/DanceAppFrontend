"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Trophy,
  CreditCard,
  Calendar,
  MapPin,
  Hash,
  XCircle,
  Download,
  Clock,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NavTabs } from "@/components/ui/nav-tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { myRegistrationsApi, type MyRegistration, type MyPayment } from "@/lib/api/my-registrations";
import { formatDate, formatCurrency, cn } from "@/lib/utils";
import { CountdownTimer } from "@/components/ui/countdown-timer";

const PAYMENT_COLORS: Record<string, "default" | "success" | "warning" | "destructive"> = {
  PENDING: "warning",
  PAID: "success",
  WAIVED: "default",
  REFUNDED: "default",
};

const COMPETITION_STATUS_COLORS: Record<string, "default" | "success" | "warning"> = {
  DRAFT: "default",
  PUBLISHED: "default",
  REGISTRATION_OPEN: "success",
  IN_PROGRESS: "warning",
  COMPLETED: "default",
  CANCELLED: "destructive" as "default",
};

// ── Days until ────────────────────────────────────────────────────────────────
function daysUntil(date: string): number {
  const ms = new Date(date).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

// ── UpcomingCompetitionCard ───────────────────────────────────────────────────
function UpcomingCompetitionCard({ reg }: { reg: MyRegistration }) {
  const days = daysUntil(reg.competitionStartDate);
  const isLive = reg.competitionStatus === "IN_PROGRESS";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-6",
        isLive
          ? "border-[var(--success)]/30 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20"
          : "border-[var(--accent)]/20 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20"
      )}
    >
      {/* Live pulse */}
      {isLive && (
        <div className="absolute right-4 top-4 flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--success)]" />
          <span className="text-xs font-semibold text-[var(--success)]">LIVE NOW</span>
        </div>
      )}

      {/* Countdown */}
      {!isLive && days > 0 && (
        <div className="absolute right-4 top-4 text-right">
          <CountdownTimer
            target={reg.competitionStartDate}
            warnBelowMinutes={60}
            className="items-end"
          />
        </div>
      )}

      <div className="pr-24">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
          {isLive ? "Competition in progress" : "Next up"}
        </p>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">{reg.competitionName}</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{reg.sectionName}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[var(--text-secondary)]">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4" />
          {formatDate(reg.competitionStartDate)}
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4" />
          {reg.competitionLocation}
        </div>
        {reg.startNumber && (
          <div className="flex items-center gap-1.5">
            <Hash className="h-4 w-4" />
            Start #{String(reg.startNumber).padStart(3, "0")}
          </div>
        )}
      </div>

      <Separator className="my-4 opacity-40" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant={PAYMENT_COLORS[reg.paymentStatus]}>
            {reg.paymentStatus === "PAID" ? "✓ Paid" : reg.paymentStatus === "PENDING" ? "Payment pending" : reg.paymentStatus}
          </Badge>
          {reg.paymentStatus === "PENDING" && reg.amountDue && (
            <span className="text-sm font-semibold text-[var(--warning)]">
              {formatCurrency(reg.amountDue, reg.currency ?? "EUR")} due
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href={`/competitions/${reg.competitionId}`}>
              View competition <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
          {isLive && (
            <Button size="sm" asChild>
              <Link href={`/scoreboard/${reg.competitionId}`}>
                Live results
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── RegistrationCard ──────────────────────────────────────────────────────────
function RegistrationCard({
  reg,
  onCancel,
  cancelling,
}: {
  reg: MyRegistration;
  onCancel: (id: string) => void;
  cancelling: boolean;
}) {
  const canCancel = ["DRAFT", "PUBLISHED", "REGISTRATION_OPEN"].includes(reg.competitionStatus);

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-[var(--text-primary)] truncate">{reg.competitionName}</h3>
            <Badge
              variant={COMPETITION_STATUS_COLORS[reg.competitionStatus] ?? "default"}
              className="shrink-0 text-xs"
            >
              {reg.competitionStatus.replace(/_/g, " ")}
            </Badge>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">{reg.sectionName}</p>
        </div>
        <Badge variant={PAYMENT_COLORS[reg.paymentStatus]} className="shrink-0">
          {reg.paymentStatus}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-secondary)]">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          {formatDate(reg.competitionStartDate)}
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          {reg.competitionLocation}
        </div>
        {reg.startNumber && (
          <div className="flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5" />
            Start #{String(reg.startNumber).padStart(3, "0")}
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          Registered {formatDate(reg.registeredAt)}
        </div>
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-primary)] font-medium">
          {reg.dancer1FirstName} {reg.dancer1LastName}
          {reg.dancer2FirstName && ` & ${reg.dancer2FirstName} ${reg.dancer2LastName}`}
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="text-xs" asChild>
            <Link href={`/competitions/${reg.competitionId}`}>View</Link>
          </Button>
          {canCancel && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-1.5"
              onClick={() => {
                if (confirm("Cancel this registration?")) onCancel(reg.id);
              }}
              loading={cancelling}
            >
              <XCircle className="h-3.5 w-3.5" />
              Cancel
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// ── PaymentRow ────────────────────────────────────────────────────────────────
function PaymentRow({ payment }: { payment: MyPayment }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
          {payment.competitionName}
        </p>
        <p className="text-xs text-[var(--text-secondary)]">
          {payment.paidAt
            ? `Paid ${formatDate(payment.paidAt)}`
            : payment.dueDate
            ? `Due ${formatDate(payment.dueDate)}`
            : "No due date"}
        </p>
      </div>
      <span className="text-sm font-semibold text-[var(--text-primary)] shrink-0">
        {formatCurrency(payment.amount, payment.currency)}
      </span>
      <Badge variant={PAYMENT_COLORS[payment.status]} className="shrink-0">
        {payment.status}
      </Badge>
      {payment.invoiceUrl && (
        <Button variant="ghost" size="icon-sm" asChild className="shrink-0 text-[var(--text-tertiary)]">
          <a href={payment.invoiceUrl} target="_blank" rel="noopener noreferrer">
            <Download className="h-3.5 w-3.5" />
          </a>
        </Button>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MyRegistrationsPage() {
  const [tab, setTab] = useState<"registrations" | "payments">("registrations");
  const { toast } = useToast();
  const qc = useQueryClient();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const { data: registrations = [], isLoading: loadingRegs } = useQuery({
    queryKey: ["my-registrations"],
    queryFn: () => myRegistrationsApi.list(),
  });

  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ["my-payments"],
    queryFn: () => myRegistrationsApi.payments(),
  });

  const { mutate: cancelReg } = useMutation({
    mutationFn: (id: string) => myRegistrationsApi.cancel(id),
    onMutate: (id) => setCancellingId(id),
    onSettled: () => setCancellingId(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-registrations"] });
      toast({ title: "Registration cancelled", variant: "success" });
    },
    onError: () => toast({ title: "Failed to cancel", variant: "destructive" }),
  });

  // Find the next upcoming registration (soonest future date)
  const now = Date.now();
  const upcomingReg = registrations
    .filter((r) =>
      ["DRAFT", "PUBLISHED", "REGISTRATION_OPEN", "IN_PROGRESS"].includes(r.competitionStatus) &&
      new Date(r.competitionStartDate).getTime() > now - 1000 * 60 * 60 * 24
    )
    .sort(
      (a, b) => new Date(a.competitionStartDate).getTime() - new Date(b.competitionStartDate).getTime()
    )[0];

  const pendingPayments = payments.filter((p) => p.status === "PENDING");
  const pendingTotal = pendingPayments.reduce((s, p) => s + p.amount, 0);
  const currency = pendingPayments[0]?.currency ?? "EUR";

  return (
    <AppShell title="My Registrations">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">My Registrations</h1>
          {pendingPayments.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm dark:border-amber-800 dark:bg-amber-950">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="font-semibold text-amber-800 dark:text-amber-300">
                {formatCurrency(pendingTotal, currency)} outstanding
              </span>
            </div>
          )}
        </div>

        {/* Upcoming competition hero card */}
        {!loadingRegs && upcomingReg && <UpcomingCompetitionCard reg={upcomingReg} />}
        {loadingRegs && <Skeleton className="h-52 rounded-2xl" />}

        {/* Summary stat cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-[var(--text-primary)]">{registrations.length}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Registrations</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {registrations.filter((r) => r.paymentStatus === "PAID").length}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Paid</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {registrations.filter((r) => r.paymentStatus === "PENDING").length}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Pending payment</p>
          </Card>
        </div>

        <NavTabs
          tabs={[
            { id: "registrations", label: "Registrations", icon: <Trophy className="h-3.5 w-3.5" /> },
            {
              id: "payments",
              label: "Payments",
              icon: <CreditCard className="h-3.5 w-3.5" />,
              badge:
                pendingPayments.length > 0 ? String(pendingPayments.length) : undefined,
            },
          ]}
          activeTab={tab}
          onChange={(t) => setTab(t as typeof tab)}
        />

        {tab === "registrations" && (
          <div className="space-y-3">
            {loadingRegs ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)
            ) : registrations.length === 0 ? (
              <Card className="flex flex-col items-center gap-3 py-16 text-center">
                <Trophy className="h-10 w-10 text-[var(--text-tertiary)]" />
                <p className="text-sm text-[var(--text-secondary)]">No registrations yet.</p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/competitions">Browse competitions</Link>
                </Button>
              </Card>
            ) : (
              registrations.map((r) => (
                <RegistrationCard
                  key={r.id}
                  reg={r}
                  onCancel={cancelReg}
                  cancelling={cancellingId === r.id}
                />
              ))
            )}
          </div>
        )}

        {tab === "payments" && (
          <div className="space-y-2">
            {loadingPayments ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)
            ) : payments.length === 0 ? (
              <Card className="flex flex-col items-center gap-3 py-16 text-center">
                <CreditCard className="h-10 w-10 text-[var(--text-tertiary)]" />
                <p className="text-sm text-[var(--text-secondary)]">No payments yet.</p>
              </Card>
            ) : (
              payments.map((p) => <PaymentRow key={p.id} payment={p} />)
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
