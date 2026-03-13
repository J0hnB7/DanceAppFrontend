"use client";

import { use, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, UserCheck, XCircle, CreditCard, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import apiClient from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { PresenceStatus } from "@/mocks/db";

interface CheckinSession {
  token: string;
  competitionId: string;
  competitionName: string;
}

interface CheckinPair {
  id: string;
  startNumber: number;
  dancer1FirstName: string;
  dancer1LastName: string;
  dancer1Club?: string;
  dancer2FirstName?: string;
  dancer2LastName?: string;
  sectionId: string;
  sectionName: string;
  presenceStatus: PresenceStatus;
  paymentStatus: "PAID" | "PENDING" | "WAIVED";
}

export default function CheckinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "absent" | "unpaid">("all");

  const { data: session, isLoading: sessionLoading, isError } = useQuery<CheckinSession>({
    queryKey: ["checkin-session", token],
    queryFn: () => apiClient.get(`/checkin-tokens/${token}`).then((r) => r.data),
    retry: false,
  });

  const { data: pairs = [], isLoading: pairsLoading } = useQuery<CheckinPair[]>({
    queryKey: ["checkin-pairs", token],
    queryFn: () => apiClient.get(`/checkin-tokens/${token}/pairs`).then((r) => r.data),
    enabled: !!session,
    refetchInterval: 10_000,
  });

  const markArrival = useMutation({
    mutationFn: ({ pairId, present }: { pairId: string; present: boolean }) =>
      apiClient.put(`/checkin-tokens/${token}/pairs/${pairId}/arrival`, { present }).then((r) => r.data),
    onMutate: async ({ pairId, present }) => {
      await qc.cancelQueries({ queryKey: ["checkin-pairs", token] });
      const prev = qc.getQueryData<CheckinPair[]>(["checkin-pairs", token]);
      qc.setQueryData<CheckinPair[]>(["checkin-pairs", token], (old) =>
        old?.map((p) => p.id === pairId ? { ...p, presenceStatus: present ? "CHECKED_IN" : "ABSENT" } : p)
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["checkin-pairs", token], ctx.prev);
    },
  });

  const markPayment = useMutation({
    mutationFn: ({ pairId, paid }: { pairId: string; paid: boolean }) =>
      apiClient.put(`/checkin-tokens/${token}/pairs/${pairId}/payment`, { paid }).then((r) => r.data),
    onMutate: async ({ pairId, paid }) => {
      await qc.cancelQueries({ queryKey: ["checkin-pairs", token] });
      const prev = qc.getQueryData<CheckinPair[]>(["checkin-pairs", token]);
      qc.setQueryData<CheckinPair[]>(["checkin-pairs", token], (old) =>
        old?.map((p) => p.id === pairId ? { ...p, paymentStatus: paid ? "PAID" : "PENDING" } : p)
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["checkin-pairs", token], ctx.prev);
    },
  });

  const filtered = useMemo(() => {
    return pairs
      .filter((p) => {
        if (filter === "absent") return p.presenceStatus === "ABSENT";
        if (filter === "unpaid") return p.paymentStatus === "PENDING";
        return true;
      })
      .filter((p) => {
        if (!search) return true;
        const q = search.toLowerCase();
        const name = `${p.dancer1FirstName} ${p.dancer1LastName} ${p.dancer2FirstName ?? ""} ${p.dancer2LastName ?? ""}`.toLowerCase();
        return name.includes(q) || String(p.startNumber).includes(q);
      })
      .sort((a, b) => a.startNumber - b.startNumber);
  }, [pairs, filter, search]);

  const stats = useMemo(() => ({
    total: pairs.length,
    present: pairs.filter((p) => p.presenceStatus !== "ABSENT").length,
    paid: pairs.filter((p) => p.paymentStatus === "PAID" || p.paymentStatus === "WAIVED").length,
  }), [pairs]);

  if (sessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  if (isError || !session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--destructive)]/10">
          <AlertTriangle className="h-8 w-8 text-[var(--destructive)]" />
        </div>
        <h1 className="text-lg font-semibold">Neplatný odkaz</h1>
        <p className="max-w-xs text-sm text-[var(--text-secondary)]">
          Tento check-in odkaz není platný nebo vypršel. Požádejte organizátora o nový odkaz.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-sm">
        <p className="text-xs text-[var(--text-tertiary)]">Check-in · Vstup</p>
        <h1 className="truncate text-sm font-semibold text-[var(--text-primary)]">{session.competitionName}</h1>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 divide-x divide-[var(--border)] border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="px-4 py-3 text-center">
          <p className="text-lg font-bold text-[var(--text-primary)]">{stats.total}</p>
          <p className="text-xs text-[var(--text-tertiary)]">Celkem</p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-lg font-bold text-[var(--success)]">{stats.present}</p>
          <p className="text-xs text-[var(--text-tertiary)]">Přítomno</p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-lg font-bold text-[var(--accent)]">{stats.paid}</p>
          <p className="text-xs text-[var(--text-tertiary)]">Zaplaceno</p>
        </div>
      </div>

      {/* Search + filter */}
      <div className="sticky top-[57px] z-10 space-y-2 border-b border-[var(--border)] bg-[var(--background)] px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="search"
            placeholder="Hledat jméno nebo číslo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:outline-none"
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "absent", "unpaid"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filter === f
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border)]"
              )}
            >
              {f === "all" ? `Vše (${pairs.length})` : f === "absent" ? "Nedorazili" : "Nezaplaceno"}
            </button>
          ))}
        </div>
      </div>

      {/* Pair list */}
      <div className="divide-y divide-[var(--border)]">
        {pairsLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-9 w-20 rounded-lg" />
                <Skeleton className="h-9 w-20 rounded-lg" />
              </div>
            ))
          : filtered.length === 0
          ? (
            <div className="py-20 text-center text-sm text-[var(--text-secondary)]">
              Žádné páry nenalezeny
            </div>
          )
          : filtered.map((pair) => {
              const isPresent = pair.presenceStatus !== "ABSENT";
              const isPaid = pair.paymentStatus === "PAID" || pair.paymentStatus === "WAIVED";

              return (
                <div
                  key={pair.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 transition-colors",
                    isPresent && isPaid ? "bg-[var(--success)]/3" : "bg-[var(--surface)]"
                  )}
                >
                  {/* Start number */}
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold",
                    isPresent
                      ? "bg-[var(--success)]/10 text-[var(--success)]"
                      : "bg-[var(--surface-secondary)] text-[var(--text-tertiary)]"
                  )}>
                    {String(pair.startNumber).padStart(3, "0")}
                  </div>

                  {/* Names */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                      {pair.dancer1FirstName} {pair.dancer1LastName}
                    </p>
                    <p className="truncate text-xs text-[var(--text-tertiary)]">
                      {pair.dancer2FirstName
                        ? `${pair.dancer2FirstName} ${pair.dancer2LastName} · `
                        : ""}
                      {pair.sectionName}
                    </p>
                  </div>

                  {/* Arrival toggle */}
                  <button
                    onClick={() => markArrival.mutate({ pairId: pair.id, present: !isPresent })}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-[var(--radius-lg)] border px-3 py-2 text-xs font-medium transition-all active:scale-95",
                      isPresent
                        ? "border-[var(--success)]/40 bg-[var(--success)]/10 text-[var(--success)]"
                        : "border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-tertiary)]"
                    )}
                  >
                    {isPresent
                      ? <><CheckCircle2 className="h-3.5 w-3.5" /> Dorazil</>
                      : <><XCircle className="h-3.5 w-3.5" /> Chybí</>
                    }
                  </button>

                  {/* Payment toggle */}
                  <button
                    onClick={() => pair.paymentStatus !== "WAIVED" && markPayment.mutate({ pairId: pair.id, paid: !isPaid })}
                    disabled={pair.paymentStatus === "WAIVED"}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-[var(--radius-lg)] border px-3 py-2 text-xs font-medium transition-all active:scale-95",
                      pair.paymentStatus === "WAIVED"
                        ? "border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-tertiary)] cursor-default opacity-60"
                        : isPaid
                        ? "border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)]"
                        : "border-[var(--warning)]/40 bg-[var(--warning)]/10 text-[var(--warning)]"
                    )}
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    {pair.paymentStatus === "WAIVED" ? "Prominuto" : isPaid ? "Zaplaceno" : "Nezaplaceno"}
                  </button>
                </div>
              );
            })
        }
      </div>

      {!pairsLoading && pairs.length > 0 && (
        <p className="py-6 text-center text-xs text-[var(--text-tertiary)]">
          {stats.present} / {stats.total} přítomno · {stats.paid} / {stats.total} zaplaceno
        </p>
      )}
    </div>
  );
}
