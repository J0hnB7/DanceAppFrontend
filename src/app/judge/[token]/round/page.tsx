"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useOnline } from "@/hooks/use-online";
import { CheckSquare, CloudOff, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import apiClient from "@/lib/api-client";
import { judgeOfflineStore } from "@/lib/judge-offline-store";
import { t, detectLocale, type Locale } from "@/lib/i18n/translations";
import { cn } from "@/lib/utils";

interface PairDto {
  id: string;
  startNumber: number;
  dancer1FirstName?: string;
  dancer1LastName?: string;
  dancer2FirstName?: string;
  dancer2LastName?: string;
  club?: string;
}

interface DanceDto {
  id: string;
  name: string;
  code?: string;
}

interface RoundInfo {
  id: string;
  roundNumber: number;
  roundType: string;
  pairsToAdvance?: number | null;
  dances?: DanceDto[];
}

interface ActiveRoundResponse {
  round: RoundInfo;
  pairs: PairDto[];
}

function ConfirmDialog({
  open,
  selected,
  required,
  onConfirm,
  onBack,
  locale,
}: {
  open: boolean;
  selected: number;
  required: number;
  onConfirm: () => void;
  onBack: () => void;
  locale: Locale;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-t-[var(--radius-lg)] bg-[var(--surface)] p-6 space-y-4">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">
          {t("judge.count_mismatch_title", locale)}
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          {t("judge.count_mismatch_body", locale, { selected: String(selected), required: String(required) })}
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onBack}>
            {t("judge.back", locale)}
          </Button>
          <Button className="flex-1" onClick={onConfirm}>
            {t("judge.submit_anyway", locale)}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PreliminaryRoundPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [locale] = useState<Locale>(() => detectLocale());
  const isOnline = useOnline();

  const [round, setRound] = useState<RoundInfo | null>(null);
  const [pairs, setPairs] = useState<PairDto[]>([]);
  const [activeDanceIdx, setActiveDanceIdx] = useState(0);
  const [selected, setSelected] = useState<Map<string, Set<string>>>(new Map()); // danceCode → Set<pairId>
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<Set<string>>(new Set()); // submitted dance codes
  const [showConfirm, setShowConfirm] = useState(false);

  const competitionId = typeof window !== "undefined"
    ? localStorage.getItem("judge_competition_id")
    : null;
  const adjudicatorId = typeof window !== "undefined"
    ? localStorage.getItem("judge_adjudicator_id")
    : null;
  const deviceToken = typeof window !== "undefined"
    ? localStorage.getItem("judge_device_token")
    : null;

  useEffect(() => {
    if (!competitionId) {
      router.push(`/judge/${token}`);
      return;
    }
    apiClient
      .get<ActiveRoundResponse>("/judge/active-round", { params: { competitionId } })
      .then((r) => {
        setRound(r.data.round);
        setPairs(r.data.pairs);
      })
      .catch(() => router.push(`/judge/${token}/lobby`))
      .finally(() => setLoading(false));
  }, [competitionId, token, router]);

  const togglePair = (dance: string, pairId: string) => {
    setSelected((prev) => {
      const next = new Map(prev);
      const s = new Set(next.get(dance) ?? []);
      if (s.has(pairId)) s.delete(pairId); else s.add(pairId);
      next.set(dance, s);
      return next;
    });
  };

  const activeDance = round?.dances?.[activeDanceIdx];
  const activeDanceCode = activeDance?.code ?? activeDance?.name ?? "";
  const activeSelected = selected.get(activeDanceCode) ?? new Set<string>();
  const required = round?.pairsToAdvance ?? 0;
  const mismatch = required > 0 && activeSelected.size !== required;

  const doSubmit = useCallback(async () => {
    if (!round || !adjudicatorId || !activeDance) return;
    setSubmitting(true);
    setShowConfirm(false);

    const recalls = pairs.map((p) => ({
      pairId: p.id,
      recalled: activeSelected.has(p.id),
    }));

    // Save to IndexedDB first
    try {
      await Promise.all(
        recalls.map((r) =>
          judgeOfflineStore.saveMark({
            key: `${adjudicatorId}-${round.id}-${activeDanceCode}-${r.pairId}`,
            judgeTokenId: adjudicatorId,
            roundId: round.id,
            dance: activeDanceCode,
            danceId: activeDance.id,
            pairId: r.pairId,
            recalled: r.recalled,
            deviceToken: deviceToken ?? "",
            createdAt: new Date().toISOString(),
            synced: false,
          })
        )
      );
    } catch { /* ignore IDB errors */ }

    if (isOnline) {
      try {
        await apiClient.post(
          `/rounds/${round.id}/callbacks`,
          { dance: activeDanceCode, recalls, deviceToken },
          { params: { judgeTokenId: adjudicatorId } }
        );
        await judgeOfflineStore.markAsSynced(
          recalls.map((r) => `${adjudicatorId}-${round.id}-${activeDanceCode}-${r.pairId}`)
        );
      } catch { /* saved offline */ }
    }

    setSubmitted((prev) => new Set([...prev, activeDanceCode]));

    // Advance to next dance or go to lobby
    if (activeDanceIdx < (round.dances?.length ?? 1) - 1) {
      setActiveDanceIdx((i) => i + 1);
    } else {
      router.push(`/judge/${token}/lobby`);
    }
    setSubmitting(false);
  }, [round, adjudicatorId, activeDance, activeDanceCode, activeDanceIdx, activeSelected, deviceToken, isOnline, pairs, router, token]);

  const handleSubmit = () => {
    if (mismatch) {
      setShowConfirm(true);
    } else {
      doSubmit();
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!round) return null;

  const dances = round.dances ?? [];

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Offline banner */}
      {!isOnline && (
        <div className="flex items-center justify-center gap-2 border-b border-[var(--warning)]/20 bg-[var(--warning)]/10 px-4 py-2 text-xs font-medium text-[var(--warning)]">
          <CloudOff className="h-3.5 w-3.5" />
          Offline — hodnocení se uloží lokálně
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div>
            <p className="text-xs text-[var(--text-tertiary)]">
              {round.roundType} · Kolo {round.roundNumber}
            </p>
            <h1 className="text-sm font-semibold text-[var(--text-primary)]">
              {activeDance?.name ?? "—"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-[var(--success)]" />
            ) : (
              <WifiOff className="h-4 w-4 text-[var(--warning)]" />
            )}
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              {t("judge.selected_of", locale)} {activeSelected.size}
              {required > 0 && ` ${t("judge.of", locale)} ${required}`}
            </span>
          </div>
        </div>

        {/* Dance tabs */}
        {dances.length > 1 && (
          <div className="mx-auto mt-2 flex max-w-lg gap-1 overflow-x-auto pb-1">
            {dances.map((d, i) => {
              const code = d.code ?? d.name;
              const done = submitted.has(code);
              return (
                <button
                  key={d.id}
                  onClick={() => setActiveDanceIdx(i)}
                  className={cn(
                    "flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    i === activeDanceIdx
                      ? "bg-[var(--accent)] text-white"
                      : done
                      ? "bg-[var(--success)] text-white"
                      : "bg-[var(--surface-secondary)] text-[var(--text-secondary)]"
                  )}
                >
                  {d.name}
                  {done && <span>✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Pair grid */}
      <div className="mx-auto max-w-lg p-4 pb-32">
        <p className="mb-3 text-sm text-[var(--text-secondary)]">
          Vyber páry které postupují do dalšího kola
          {required > 0 && (
            <span className="ml-1 font-medium text-[var(--accent)]">
              (požadováno {required})
            </span>
          )}
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          {pairs.map((pair) => {
            const isSelected = activeSelected.has(pair.id);
            return (
              <button
                key={pair.id}
                onClick={() => togglePair(activeDanceCode, pair.id)}
                className={cn(
                  "flex min-h-[56px] items-center gap-3 rounded-[var(--radius-lg)] border p-3 text-left transition-all active:scale-[0.98]",
                  isSelected
                    ? "border-[var(--accent)] bg-[var(--accent)]/5 shadow-sm"
                    : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-secondary)]"
                )}
              >
                <div className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors",
                  isSelected
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--surface-secondary)] text-[var(--text-secondary)]"
                )}>
                  {pair.startNumber}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                    {pair.dancer1FirstName} {pair.dancer1LastName}
                  </p>
                  {pair.dancer2FirstName && (
                    <p className="truncate text-xs text-[var(--text-secondary)]">
                      {pair.dancer2FirstName} {pair.dancer2LastName}
                    </p>
                  )}
                </div>
                {isSelected && <CheckSquare className="ml-auto h-5 w-5 shrink-0 text-[var(--accent)]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex max-w-lg gap-3">
          <Button
            variant="outline"
            size="lg"
            className="shrink-0"
            onClick={() => setSelected((prev) => { const next = new Map(prev); next.set(activeDanceCode, new Set()); return next; })}
          >
            {t("judge.clear", locale)}
          </Button>
          <Button
            className={cn("flex-1", mismatch && activeSelected.size > 0 && "bg-[var(--warning)] hover:bg-[var(--warning)]/90")}
            size="lg"
            loading={submitting}
            onClick={handleSubmit}
          >
            {activeSelected.size} vybráno — Odeslat
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={showConfirm}
        selected={activeSelected.size}
        required={required}
        onConfirm={doSubmit}
        onBack={() => setShowConfirm(false)}
        locale={locale}
      />
    </div>
  );
}
