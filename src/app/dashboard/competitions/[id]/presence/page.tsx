"use client";

import { use, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Users, CheckCircle2, CreditCard, UserCheck, XCircle, Lock, Eye, EyeOff, RotateCcw, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { CompetitionSidebar } from "@/components/layout/competition-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import apiClient from "@/lib/api-client";
import { useCompetition } from "@/hooks/queries/use-competitions";
import type { SectionDto } from "@/lib/api/sections";
import { cn, getErrorMessage } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useLocale } from "@/contexts/locale-context";

type PresenceStatus = "ABSENT" | "CHECKED_IN" | "ON_FLOOR" | "DONE";
type PaymentStatus = "PAID" | "PENDING" | "WAIVED";

interface PairPresence {
  id: string;
  startNumber: number;
  dancer1FirstName: string;
  dancer1LastName: string;
  dancer1Club?: string;
  dancer2FirstName?: string;
  dancer2LastName?: string;
  sectionId: string;
  presenceStatus: PresenceStatus;
  paymentStatus: PaymentStatus;
}

function StatCard({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: number; accent?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-lg)]", accent ?? "bg-[var(--surface-secondary)]")}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-xs text-[var(--text-secondary)]">{label}</p>
          <p className="text-xl font-bold text-[var(--text-primary)]">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function PairRow({ pair, sectionName }: { pair: PairPresence; sectionName: string }) {
  const { t } = useLocale();
  const isPaid = pair.paymentStatus === "PAID" || pair.paymentStatus === "WAIVED";
  const isPresent = pair.presenceStatus === "CHECKED_IN" || pair.presenceStatus === "ON_FLOOR" || pair.presenceStatus === "DONE";
  return (
    <div className="flex items-center gap-2 py-1 text-sm">
      <code className="w-9 shrink-0 rounded bg-[var(--surface-secondary)] px-1 py-0.5 text-center font-mono text-xs font-bold text-[var(--text-primary)]">
        {String(pair.startNumber).padStart(3, "0")}
      </code>
      <span className="flex-1 text-[var(--text-primary)]">
        {pair.dancer1FirstName} {pair.dancer1LastName}
        {pair.dancer2FirstName && (
          <span className="text-[var(--text-secondary)]"> & {pair.dancer2FirstName} {pair.dancer2LastName}</span>
        )}
      </span>
      <span className="text-xs text-[var(--text-tertiary)]">{sectionName}</span>
      {!isPaid && isPresent && (
        <span className="rounded-full bg-[var(--warning)]/10 px-1.5 py-0.5 text-xs text-[var(--warning)]">{t("presence.unpaidBadge")}</span>
      )}
    </div>
  );
}

export default function PresencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useLocale();
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [showOnlyAbsent, setShowOnlyAbsent] = useState(true);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [recentActions, setRecentActions] = useState<{ pairId: string; name: string; startNumber: number; action: "checkin" | "absent" }[]>([]);

  const { data: competition } = useCompetition(id);

  const { data: presencePairs = [], isLoading } = useQuery<PairPresence[]>({
    queryKey: ["presence", id],
    queryFn: () => apiClient.get(`/competitions/${id}/presence`).then((r) => r.data),
    refetchInterval: 5000,
  });

  const { data: sections = [] } = useQuery<SectionDto[]>({
    queryKey: ["sections", id, "list"],
    queryFn: () => apiClient.get(`/competitions/${id}/sections`).then((r) => r.data),
  });

  // Is the currently filtered section (or all) closed?
  const activeSection = sections.find((s) => s.id === sectionFilter);
  const isClosed = sectionFilter === "all"
    ? sections.length > 0 && sections.every((s) => s.presenceClosed)
    : (activeSection?.presenceClosed ?? false);

  const setStatus = useMutation({
    mutationFn: ({ pairId, status }: { pairId: string; status: PresenceStatus }) =>
      apiClient.put(`/competitions/${id}/pairs/${pairId}/presence`, { status }).then((r) => r.data),
    onMutate: async ({ pairId, status }) => {
      await qc.cancelQueries({ queryKey: ["presence", id] });
      const prev = qc.getQueryData<PairPresence[]>(["presence", id]);
      const pair = prev?.find((p) => p.id === pairId);
      if (pair) {
        const name = `${pair.dancer1FirstName} ${pair.dancer1LastName}${pair.dancer2FirstName ? ` & ${pair.dancer2FirstName} ${pair.dancer2LastName}` : ""}`;
        setRecentActions((prev) => [
          { pairId, name, startNumber: pair.startNumber, action: status === "ABSENT" ? "absent" : "checkin" },
          ...prev.slice(0, 4),
        ]);
      }
      qc.setQueryData<PairPresence[]>(["presence", id], (old) =>
        old?.map((p) => p.id === pairId ? { ...p, presenceStatus: status } : p) ?? []
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => qc.setQueryData(["presence", id], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ["presence", id] }),
  });

  const setPayment = useMutation({
    mutationFn: async ({ pairId, paid, autoCheckin }: { pairId: string; paid: boolean; autoCheckin?: boolean }) => {
      await apiClient.put(`/competitions/${id}/pairs/${pairId}/payment`, { paid });
      if (autoCheckin) {
        await apiClient.put(`/competitions/${id}/pairs/${pairId}/presence`, { status: "CHECKED_IN" });
      }
    },
    onMutate: async ({ pairId, paid, autoCheckin }) => {
      await qc.cancelQueries({ queryKey: ["presence", id] });
      const prev = qc.getQueryData<PairPresence[]>(["presence", id]);
      const pair = prev?.find((p) => p.id === pairId);
      if (pair && paid && autoCheckin) {
        const name = `${pair.dancer1FirstName} ${pair.dancer1LastName}${pair.dancer2FirstName ? ` & ${pair.dancer2FirstName} ${pair.dancer2LastName}` : ""}`;
        setRecentActions((prev) => [
          { pairId, name, startNumber: pair.startNumber, action: "checkin" },
          ...prev.slice(0, 4),
        ]);
      }
      qc.setQueryData<PairPresence[]>(["presence", id], (old) =>
        old?.map((p) => p.id === pairId ? {
          ...p,
          paymentStatus: paid ? "PAID" : "PENDING",
          presenceStatus: autoCheckin ? "CHECKED_IN" : p.presenceStatus,
        } : p) ?? []
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => qc.setQueryData(["presence", id], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ["presence", id] }),
  });

  const deleteSection = useMutation({
    mutationFn: (sectionId: string) =>
      apiClient.delete(`/competitions/${id}/sections/${sectionId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sections", id, "list"] });
      qc.invalidateQueries({ queryKey: ["presence", id] });
    },
    onError: (err: unknown) => {
      toast({ title: getErrorMessage(err, t("common.error")), variant: "destructive" });
    },
  });

  const closeSectionPresence = useMutation({
    mutationFn: (sectionId: string) =>
      apiClient.post(`/competitions/${id}/sections/${sectionId}/presence/close`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sections", id, "list"] });
      setShowCloseDialog(false);
      toast({ title: t("presence.closedToast"), description: t("presence.closedToastDesc") });
    },
    onError: (err: unknown) => {
      toast({ title: getErrorMessage(err, t("common.error")), variant: "destructive" });
    },
  });

  const reopenSectionPresence = useMutation({
    mutationFn: (sectionId: string) =>
      apiClient.post(`/competitions/${id}/sections/${sectionId}/presence/reopen`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sections", id, "list"] });
      toast({ title: t("presence.reopenPresenceToast"), description: t("presence.reopenPresenceToastDesc") });
    },
    onError: (err: unknown) => {
      toast({ title: getErrorMessage(err, t("common.error")), variant: "destructive" });
    },
  });

  const filtered = useMemo(() => {
    return presencePairs
      .filter((p) => sectionFilter === "all" || p.sectionId === sectionFilter)
      .filter((p) => {
        if (!showOnlyAbsent) return true;
        const present = p.presenceStatus === "CHECKED_IN" || p.presenceStatus === "ON_FLOOR" || p.presenceStatus === "DONE";
        const paid = p.paymentStatus === "PAID" || p.paymentStatus === "WAIVED";
        return !(present && paid); // hide only when both present AND paid
      })
      .filter((p) => {
        if (!search) return true;
        const q = search.toLowerCase();
        const name = `${p.dancer1FirstName} ${p.dancer1LastName} ${p.dancer2FirstName ?? ""} ${p.dancer2LastName ?? ""}`.toLowerCase();
        return name.includes(q) || String(p.startNumber).includes(q);
      })
      .sort((a, b) => a.startNumber - b.startNumber);
  }, [presencePairs, sectionFilter, showOnlyAbsent, search]);

  const stats = useMemo(() => ({
    total: presencePairs.length,
    checkedIn: presencePairs.filter((p) => p.presenceStatus === "CHECKED_IN" || p.presenceStatus === "ON_FLOOR" || p.presenceStatus === "DONE").length,
    absent: presencePairs.filter((p) => !p.presenceStatus || p.presenceStatus === "ABSENT").length,
    paid: presencePairs.filter((p) => p.paymentStatus === "PAID" || p.paymentStatus === "WAIVED").length,
  }), [presencePairs]);

  // Groups for close dialog
  const dialogPairs = useMemo(() =>
    sectionFilter === "all" ? presencePairs : presencePairs.filter((p) => p.sectionId === sectionFilter),
    [presencePairs, sectionFilter]
  );

  const activeGroup = useMemo(() =>
    dialogPairs.filter(
      (p) =>
        (p.presenceStatus === "CHECKED_IN" || p.presenceStatus === "ON_FLOOR" || p.presenceStatus === "DONE") &&
        (p.paymentStatus === "PAID" || p.paymentStatus === "WAIVED")
    ).sort((a, b) => a.startNumber - b.startNumber),
    [dialogPairs]
  );

  const absentGroup = useMemo(() =>
    dialogPairs.filter(
      (p) => !p.presenceStatus || p.presenceStatus === "ABSENT"
    ).sort((a, b) => a.startNumber - b.startNumber),
    [dialogPairs]
  );

  const presentUnpaidGroup = useMemo(() =>
    dialogPairs.filter(
      (p) =>
        (p.presenceStatus === "CHECKED_IN" || p.presenceStatus === "ON_FLOOR" || p.presenceStatus === "DONE") &&
        p.paymentStatus === "PENDING"
    ).sort((a, b) => a.startNumber - b.startNumber),
    [dialogPairs]
  );

  return (
    <AppShell sidebar={<CompetitionSidebar competitionId={id} />}>
      {/* Back */}
      <button
        onClick={() => router.push(`/dashboard/competitions/${id}`)}
        className="mb-4 flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {competition?.name ?? t("common.back")}
      </button>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">{t("presence.title")}</h1>
          <p className="text-sm text-[var(--text-secondary)]">{t("presence.description")}</p>
        </div>
        {isClosed && sectionFilter !== "all" && (
          <div className="flex items-center gap-1.5 rounded-full bg-[var(--surface-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--text-tertiary)]">
            <Lock className="h-3.5 w-3.5" />
            {t("presence.closedBanner")}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatCard icon={Users}        label={t("presence.total")}   value={stats.total}     accent="bg-[var(--text-tertiary)]" />
        <StatCard icon={CheckCircle2} label={t("presence.present")} value={stats.checkedIn} accent="bg-[var(--success)]" />
        <StatCard icon={CreditCard}   label={t("presence.paid")}    value={stats.paid}      accent="bg-[var(--success)]" />
      </div>

      {/* Closed banner */}
      {isClosed && (
        <div className="mb-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-secondary)] p-4">
          <p className="mb-3 text-sm font-semibold text-[var(--text-primary)]">{t("presence.presenceResult")}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[var(--success)]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t("presence.presentAndPaid", { count: activeGroup.length })}
              </p>
              <div className="space-y-0.5">
                {activeGroup.map((p) => (
                  <PairRow key={p.id} pair={p} sectionName={sections.find((s) => s.id === p.sectionId)?.name ?? ""} />
                ))}
                {activeGroup.length === 0 && <p className="text-xs text-[var(--text-tertiary)]">{t("presence.noPairs")}</p>}
              </div>
            </div>
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[var(--destructive)]">
                <XCircle className="h-3.5 w-3.5" />
                {t("presence.absent", { count: absentGroup.length })}
              </p>
              <div className="space-y-0.5">
                {absentGroup.map((p) => (
                  <PairRow key={p.id} pair={p} sectionName={sections.find((s) => s.id === p.sectionId)?.name ?? ""} />
                ))}
                {absentGroup.length === 0 && <p className="text-xs text-[var(--text-tertiary)]">{t("presence.noPairs")}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section presence management panel */}
      {sections.length > 0 && (
        <div className="mb-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2.5">
            <Lock className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
            <p className="text-xs font-semibold text-[var(--text-secondary)]">Uzavretie prezencie po sekciách</p>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {sections.map((s) => {
              const sTotal = presencePairs.filter((p) => p.sectionId === s.id).length;
              const sPresent = presencePairs.filter(
                (p) => p.sectionId === s.id && (p.presenceStatus === "CHECKED_IN" || p.presenceStatus === "ON_FLOOR" || p.presenceStatus === "DONE")
              ).length;
              return (
                <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">{s.name}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">{sPresent} prítomných / {sTotal} registrovaných</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.presenceClosed ? (
                      <>
                        <span className="flex items-center gap-1 rounded-full bg-[var(--surface-secondary)] px-2 py-0.5 text-xs text-[var(--text-tertiary)]">
                          <Lock className="h-3 w-3" /> Uzavretá
                        </span>
                        <button
                          onClick={() => reopenSectionPresence.mutate(s.id)}
                          disabled={reopenSectionPresence.isPending}
                          className="rounded-md border border-[var(--border)] bg-[var(--surface-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--border)] disabled:opacity-50"
                        >
                          Otvoriť
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => { setSectionFilter(s.id); setShowCloseDialog(true); }}
                        className="rounded-md border border-[var(--destructive)]/30 bg-[var(--destructive)]/5 px-2.5 py-1 text-xs font-medium text-[var(--destructive)] hover:bg-[var(--destructive)]/10"
                      >
                        Uzavrieť
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (window.confirm(`Zmazať sekciu "${s.name}"? Táto akcia je nevratná.`)) {
                          deleteSection.mutate(s.id);
                        }
                      }}
                      disabled={deleteSection.isPending}
                      className="rounded-md p-1 text-[var(--text-tertiary)] hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)] disabled:opacity-40"
                      title="Zmazať sekciu"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent actions log — always visible */}
      <div className="mb-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3">
        <div className="mb-2 flex items-center gap-1.5">
          <RotateCcw className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
          <p className="text-xs font-semibold text-[var(--text-secondary)]">{t("presence.recentActions")}</p>
        </div>
        {recentActions.length === 0 ? (
          <p className="text-xs text-[var(--text-tertiary)]">{t("presence.noRecentActions")}</p>
        ) : (
          <div className="flex flex-col gap-1">
            {recentActions.map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className={cn(
                  "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                  a.action === "checkin" ? "bg-[var(--success)]/15 text-[var(--success)]" : "bg-[var(--text-tertiary)]/15 text-[var(--text-tertiary)]"
                )}>
                  {a.action === "checkin" ? "✓" : "✕"}
                </span>
                <code className="font-mono font-bold text-[var(--text-tertiary)]">{String(a.startNumber).padStart(3, "0")}</code>
                <span className="flex-1 truncate text-[var(--text-primary)]">{a.name}</span>
                <button
                  onClick={() => setStatus.mutate({ pairId: a.pairId, status: a.action === "checkin" ? "ABSENT" : "CHECKED_IN" })}
                  className="shrink-0 rounded-md bg-[var(--surface-secondary)] px-2 py-0.5 text-[var(--accent)] hover:bg-[var(--border)]"
                >
                  {t("presence.undo")}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder={t("presence.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:outline-none"
          />
        </div>
        {/* Absent-only toggle — prominent */}
        <button
          onClick={() => setShowOnlyAbsent((v) => !v)}
          className={cn(
            "flex w-full items-center gap-3 rounded-[var(--radius-lg)] border px-4 py-3 text-sm font-medium transition-colors",
            showOnlyAbsent
              ? "border-[var(--warning)]/40 bg-[var(--warning)]/8 text-[var(--warning)]"
              : "border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border)]"
          )}
        >
          {showOnlyAbsent
            ? <><EyeOff className="h-4 w-4 shrink-0" /><span>Zobrazujem <strong>nevybavených</strong> — klikni pre zobrazenie všetkých ({stats.total})</span></>
            : <><Eye className="h-4 w-4 shrink-0" /><span>Zobrazujem <strong>všetkých ({stats.total})</strong> — klikni pre zobrazenie len nevybavených</span></>
          }
        </button>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSectionFilter("all")}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              sectionFilter === "all"
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border)]"
            )}
          >
            {t("presence.all", { count: presencePairs.length })}
          </button>
          {sections.map((s) => {
            const count = presencePairs.filter((p) => p.sectionId === s.id).length;
            return (
              <button
                key={s.id}
                onClick={() => setSectionFilter(s.id)}
                className={cn(
                  "flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  sectionFilter === s.id
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border)]"
                )}
              >
                {s.presenceClosed && <Lock className="h-3 w-3 opacity-70" />}
                {s.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Pair list */}
      <div className="flex flex-col gap-2">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-[var(--radius-lg)]" />)
          : filtered.length === 0
          ? (
            <div className="py-16 text-center text-sm text-[var(--text-secondary)]">
              {t("presence.notFound")}
            </div>
          )
          : filtered.map((pair) => {
            const isPresent = pair.presenceStatus === "CHECKED_IN" || pair.presenceStatus === "ON_FLOOR" || pair.presenceStatus === "DONE";
            const isPaid = pair.paymentStatus === "PAID" || pair.paymentStatus === "WAIVED";
            const isWaived = pair.paymentStatus === "WAIVED";
            const pairSection = sections.find((s) => s.id === pair.sectionId);
            const sectionName = pairSection?.name ?? "";
            const pairSectionClosed = pairSection?.presenceClosed ?? false;

            return (
              <div
                key={pair.id}
                className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 transition-all"
              >
                {/* Status dot */}
                <span className={cn(
                  "inline-flex h-3 w-3 shrink-0 rounded-full",
                  isPresent ? "bg-[var(--success)]" : "bg-[var(--text-tertiary)]"
                )} />

                {/* Start number */}
                <code className="w-10 shrink-0 rounded-md bg-[var(--surface-secondary)] px-1.5 py-0.5 text-center font-mono text-sm font-bold text-[var(--text-primary)]">
                  {String(pair.startNumber).padStart(3, "0")}
                </code>

                {/* Names */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                    {pair.dancer1FirstName} {pair.dancer1LastName}
                    {pair.dancer2FirstName && (
                      <span className="text-[var(--text-secondary)]">
                        {" & "}{pair.dancer2FirstName} {pair.dancer2LastName}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-[var(--text-tertiary)]">{sectionName}</p>
                </div>

                {/* Payment toggle badge */}
                <button
                  disabled={isWaived || pairSectionClosed}
                  onClick={() => !isWaived && !pairSectionClosed && setPayment.mutate({ pairId: pair.id, paid: !isPaid, autoCheckin: !isPaid && !isPresent })}
                  className={cn(
                    "shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all hidden sm:flex",
                    pairSectionClosed || isWaived
                      ? "cursor-default border-[var(--border)] text-[var(--text-tertiary)]"
                      : isPaid
                      ? "border-[var(--success)]/40 bg-[var(--success)]/8 text-[var(--success)] hover:bg-[var(--success)]/15"
                      : "border-[var(--warning)]/40 bg-[var(--warning)]/8 text-[var(--warning)] hover:bg-[var(--warning)]/15"
                  )}
                >
                  <CreditCard className="h-3 w-3" />
                  {isWaived ? t("presence.waived") : isPaid ? t("presence.paid") : t("presence.notPaid")}
                </button>

                {/* Presence toggle badge */}
                <button
                  disabled={pairSectionClosed}
                  onClick={() => !pairSectionClosed && setStatus.mutate({ pairId: pair.id, status: isPresent ? "ABSENT" : "CHECKED_IN" })}
                  className={cn(
                    "shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all flex",
                    pairSectionClosed
                      ? "cursor-default border-[var(--border)] text-[var(--text-tertiary)]"
                      : isPresent
                      ? "border-[var(--success)]/40 bg-[var(--success)]/8 text-[var(--success)] hover:bg-[var(--success)]/15"
                      : "border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border)]"
                  )}
                >
                  <UserCheck className="h-3 w-3" />
                  {isPresent ? t("presence.checkedIn") : t("presence.notCheckedIn")}
                </button>
              </div>
            );
          })
        }
      </div>

      {/* Summary footer */}
      {!isLoading && presencePairs.length > 0 && (
        <p className="mt-6 text-center text-xs text-[var(--text-tertiary)]">
          {t("presence.statusSummary", { present: stats.checkedIn, total: stats.total, paid: stats.paid })}
        </p>
      )}

      {/* Close presence dialog */}
      {showCloseDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCloseDialog(false)} />
          <div className="relative w-full max-w-lg rounded-[var(--radius-xl)] bg-[var(--surface)] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.15)]">
            <h2 className="mb-1 text-lg font-bold text-[var(--text-primary)]">{t("presence.closePresenceTitle")}</h2>
            <p className="mb-5 text-sm text-[var(--text-secondary)]">
              {t("presence.closePresenceDesc")}
            </p>

            <div className="mb-5 grid gap-4 sm:grid-cols-2">
              {/* Group 1 */}
              <div className="rounded-[var(--radius-lg)] border border-[var(--success)]/30 bg-[var(--success)]/5 p-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[var(--success)]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t("presence.presentAndPaid", { count: activeGroup.length })}
                </p>
                <div className="max-h-40 space-y-0.5 overflow-y-auto">
                  {activeGroup.map((p) => (
                    <div key={p.id} className="flex items-center gap-1.5 text-xs text-[var(--text-primary)]">
                      <code className="shrink-0 font-mono font-bold text-[var(--text-tertiary)]">{String(p.startNumber).padStart(3, "0")}</code>
                      <span className="truncate">{p.dancer1FirstName} {p.dancer1LastName}{p.dancer2FirstName && ` & ${p.dancer2FirstName} ${p.dancer2LastName}`}</span>
                    </div>
                  ))}
                  {activeGroup.length === 0 && <p className="text-xs text-[var(--text-tertiary)]">{t("presence.noPairs")}</p>}
                </div>
              </div>

              {/* Group 2 */}
              <div className="rounded-[var(--radius-lg)] border border-[var(--destructive)]/30 bg-[var(--destructive)]/5 p-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[var(--destructive)]">
                  <XCircle className="h-3.5 w-3.5" />
                  {t("presence.absent", { count: absentGroup.length })}
                </p>
                <div className="max-h-40 space-y-0.5 overflow-y-auto">
                  {absentGroup.map((p) => (
                    <div key={p.id} className="flex items-center gap-1.5 text-xs text-[var(--text-primary)]">
                      <code className="shrink-0 font-mono font-bold text-[var(--text-tertiary)]">{String(p.startNumber).padStart(3, "0")}</code>
                      <span className="truncate">{p.dancer1FirstName} {p.dancer1LastName}{p.dancer2FirstName && ` & ${p.dancer2FirstName} ${p.dancer2LastName}`}</span>
                    </div>
                  ))}
                  {absentGroup.length === 0 && <p className="text-xs text-[var(--text-tertiary)]">{t("presence.noPairs")}</p>}
                </div>
              </div>
            </div>

            {presentUnpaidGroup.length > 0 && (
              <div className="mb-5 rounded-[var(--radius-lg)] border border-[var(--warning)]/30 bg-[var(--warning)]/5 p-3">
                <p className="mb-1 text-xs font-semibold text-[var(--warning)]">
                  {t("presence.unpaidWarning", { count: presentUnpaidGroup.length })}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {t("presence.unpaidWarningDesc")}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowCloseDialog(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                onClick={() => activeSection && closeSectionPresence.mutate(activeSection.id)}
                loading={closeSectionPresence.isPending}
                className="bg-[var(--destructive)] text-white hover:bg-[var(--destructive)]/90"
              >
                <Lock className="h-3.5 w-3.5" />
                {t("presence.closePresenceAction")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
