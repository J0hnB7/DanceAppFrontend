"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useOnline } from "@/hooks/use-online";
import { CloudOff, Wifi, WifiOff, AlertTriangle, Sun, Moon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import apiClient from "@/lib/api-client";
import { judgeOfflineStore } from "@/lib/judge-offline-store";
import { t, detectLocale, type Locale } from "@/lib/i18n/translations";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PairDto {
  id: string;
  startNumber: number;
  dancer1FirstName?: string;
  dancer1LastName?: string;
  dancer2FirstName?: string;
  dancer2LastName?: string;
}

interface DanceDto { id: string; name: string; code?: string; danceName?: string; }

interface RoundInfo {
  id: string;
  roundNumber: number;
  roundType: string;
  pairsToAdvance?: number | null;
  dances?: DanceDto[];
}

interface HeatGroup { heatNumber: number; pairIds: string[]; }

interface ActiveRoundResponse {
  round: RoundInfo;
  dances: DanceDto[];
  pairs: PairDto[];
  heats: HeatGroup[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function roundLabel(type: string): string {
  switch (type) {
    case "PRELIMINARY":   return "Předkolo";
    case "QUARTER_FINAL": return "Čtvrtfinále";
    case "SEMIFINAL":     return "Semifinále";
    case "FINAL":         return "Finále";
    default:              return type;
  }
}

// ── Couple tile ───────────────────────────────────────────────────────────────

function CoupleTile({
  pair, isSelected, isDisabled, onToggle,
}: {
  pair: PairDto; isSelected: boolean; isDisabled: boolean; onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={isDisabled && !isSelected}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-xl border-2 p-2 transition-all active:scale-95 select-none",
        "min-h-[76px]",
        isSelected
          ? "border-[var(--accent)] bg-[var(--accent)] shadow-lg"
          : isDisabled
          ? "border-[var(--border)] bg-[var(--surface)] opacity-35 cursor-not-allowed"
          : "border-[var(--border)] bg-[var(--surface)] active:bg-[var(--surface-secondary)]"
      )}
    >
      {isSelected && (
        <span className="absolute right-1.5 top-1.5 flex h-[14px] w-[14px] items-center justify-center rounded-full bg-white/25 text-[8px] font-bold text-white">✓</span>
      )}
      {/* Dominant number */}
      <span className={cn("text-[22px] font-black leading-none tabular-nums", isSelected ? "text-white" : "text-[var(--text-primary)]")}>
        {pair.startNumber}
      </span>
      {/* Surname line */}
      {(pair.dancer1LastName || pair.dancer2LastName) && (
        <span className={cn("mt-1 w-full truncate text-center text-[8px] font-medium leading-tight", isSelected ? "text-white/70" : "text-[var(--text-tertiary)]")}>
          {[pair.dancer1LastName, pair.dancer2LastName].filter(Boolean).join(" / ")}
        </span>
      )}
    </button>
  );
}

// ── Confirmation sheet ────────────────────────────────────────────────────────

function ConfirmSheet({ open, selected, required, onConfirm, onBack }: {
  open: boolean; selected: number; required: number; onConfirm: () => void; onBack: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-t-2xl bg-[var(--surface)] p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--warning)]/10">
            <AlertTriangle className="h-5 w-5 text-[var(--warning)]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              {selected < required ? "Méně křížů než požadováno" : "Více křížů než požadováno"}
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Označeno <strong>{selected}</strong>, požadováno <strong>{required}</strong>
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onBack}>Zpět</Button>
          <Button className="flex-1" onClick={onConfirm}>Odeslat tak</Button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PreliminaryRoundPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [locale] = useState<Locale>(() => detectLocale());
  const isOnline = useOnline();

  const [round, setRound] = useState<RoundInfo | null>(null);
  const [pairs, setPairs] = useState<PairDto[]>([]);
  const [heats, setHeats] = useState<HeatGroup[]>([]);
  const [activeDanceIdx, setActiveDanceIdx] = useState(0);
  const [currentHeatIdx, setCurrentHeatIdx] = useState(0);
  // danceCode → Set<pairId>
  const [selected, setSelected] = useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );

  const toggleTheme = () => {
    const dark = !isDark;
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  };

  const competitionId = typeof window !== "undefined" ? localStorage.getItem("judge_competition_id") : null;
  const adjudicatorId = typeof window !== "undefined" ? localStorage.getItem("judge_adjudicator_id") : null;
  const deviceToken   = typeof window !== "undefined" ? localStorage.getItem("judge_device_token")   : null;

  useEffect(() => {
    if (!competitionId) { router.push(`/judge/${token}`); return; }
    apiClient
      .get<ActiveRoundResponse>("/judge/active-round", { params: { competitionId } })
      .then((r) => {
        const dances = (r.data.dances ?? []).map((d) => ({
          id: d.id,
          name: d.danceName ?? d.name ?? "",
          code: d.code,
        }));
        setRound({ ...r.data.round, dances });
        setPairs(r.data.pairs);
        setHeats(r.data.heats ?? []);
      })
      .catch(() => router.push(`/judge/${token}/lobby`))
      .finally(() => setLoading(false));
  }, [competitionId, token, router]);

  const activeDance     = round?.dances?.[activeDanceIdx];
  const activeDanceCode = activeDance?.code ?? activeDance?.name ?? "";
  const activeSelected  = selected.get(activeDanceCode) ?? new Set<string>();

  // Skating System: judge may give at most `pairsToAdvance` crosses
  const allowedCrosses = round?.pairsToAdvance ?? 0;
  const givenCrosses   = activeSelected.size;
  const remaining      = Math.max(0, allowedCrosses - givenCrosses);
  const atLimit        = allowedCrosses > 0 && givenCrosses >= allowedCrosses;

  // Current heat — if no heat groups, treat all pairs as one virtual heat
  const currentHeat     = heats.length > 0 ? heats[currentHeatIdx] : null;
  const currentHeatPairs = currentHeat
    ? pairs.filter((p) => currentHeat.pairIds.includes(p.id))
    : pairs;
  const totalHeats = heats.length;

  const togglePair = (pairId: string) => {
    setSelected((prev) => {
      const next = new Map(prev);
      const s = new Set(next.get(activeDanceCode) ?? []);
      if (s.has(pairId)) {
        s.delete(pairId);
      } else {
        // Hard limit — WDSF Skating System: never exceed pairsToAdvance
        if (allowedCrosses > 0 && s.size >= allowedCrosses) return prev;
        s.add(pairId);
      }
      next.set(activeDanceCode, s);
      return next;
    });
  };

  const doSubmit = useCallback(async () => {
    if (!round || !adjudicatorId || !activeDance) return;
    setSubmitting(true);
    setShowConfirm(false);

    const recalls = pairs.map((p) => ({ pairId: p.id, recalled: activeSelected.has(p.id) }));

    try {
      await Promise.all(recalls.map((r) =>
        judgeOfflineStore.saveMark({
          key: `${adjudicatorId}-${round.id}-${activeDanceCode}-${r.pairId}`,
          judgeTokenId: adjudicatorId, roundId: round.id,
          dance: activeDanceCode, danceId: activeDance.id,
          pairId: r.pairId, recalled: r.recalled,
          deviceToken: deviceToken ?? "", createdAt: new Date().toISOString(), synced: false,
        })
      ));
    } catch { /* ignore IDB errors */ }

    if (isOnline) {
      try {
        await apiClient.post(
          `/rounds/${round.id}/callbacks`,
          { dance: activeDanceCode, recalls, deviceToken },
          { params: { judgeTokenId: adjudicatorId } }
        );
        await judgeOfflineStore.markAsSynced(recalls.map((r) => `${adjudicatorId}-${round.id}-${activeDanceCode}-${r.pairId}`));
      } catch { /* saved offline */ }
    }

    setSubmitted((prev) => new Set([...prev, activeDanceCode]));
    if (activeDanceIdx < (round.dances?.length ?? 1) - 1) {
      setActiveDanceIdx((i) => i + 1);
      setCurrentHeatIdx(0);
    } else {
      router.push(`/judge/${token}/lobby`);
    }
    setSubmitting(false);
  }, [round, adjudicatorId, activeDance, activeDanceCode, activeDanceIdx, activeSelected, deviceToken, isOnline, pairs, router, token]);

  const handleSubmit = () => {
    if (allowedCrosses > 0 && givenCrosses !== allowedCrosses) {
      setShowConfirm(true);
    } else {
      doSubmit();
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner size="lg" /></div>;
  if (!round) return null;

  const dances = round.dances ?? [];
  const isAlreadyDone = submitted.has(activeDanceCode);
  const isExact = allowedCrosses > 0 && givenCrosses === allowedCrosses;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">

      {/* Offline banner */}
      {!isOnline && (
        <div className="flex items-center justify-center gap-2 border-b border-[var(--warning)]/20 bg-[var(--warning)]/10 px-4 py-2 text-xs font-medium text-[var(--warning)]">
          <CloudOff className="h-3.5 w-3.5" /> Offline — hodnocení se uloží lokálně
        </div>
      )}

      {/* ── Header ── */}
      <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2 shadow-sm">
        <div className="mx-auto max-w-lg flex items-center justify-between gap-2">

          {/* Dance tabs */}
          <div className="flex gap-1 overflow-x-auto">
            {dances.length > 1 ? dances.map((d, i) => {
              const code = d.code ?? d.name;
              const done = submitted.has(code);
              return (
                <button key={d.id} onClick={() => { setActiveDanceIdx(i); setCurrentHeatIdx(0); }}
                  className={cn(
                    "flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                    i === activeDanceIdx ? "bg-[var(--accent)] text-white"
                      : done ? "bg-green-600 text-white"
                      : "bg-[var(--surface-secondary)] text-[var(--text-secondary)]"
                  )}>
                  {d.name}{done && <span className="text-[9px]">✓</span>}
                </button>
              );
            }) : activeDance ? (
              <span className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white">
                {activeDance.name}
              </span>
            ) : null}
          </div>

          {/* Right controls */}
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={toggleTheme}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border)]">
              {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
            {isOnline ? <Wifi className="h-4 w-4 text-[var(--success)]" /> : <WifiOff className="h-4 w-4 text-[var(--warning)]" />}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="mx-auto w-full max-w-lg flex-1 px-4 pt-4 pb-36">

        {isAlreadyDone ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 text-2xl">✓</div>
            <p className="font-semibold text-[var(--text-primary)]">Hodnocení odesláno</p>
            <p className="text-sm text-[var(--text-secondary)]">{activeDance?.name} — přejdi na další tanec</p>
          </div>
        ) : (
          <>
            {/* ── Cross counter — Skating System ── */}
            {allowedCrosses > 0 && (
              <div className="mb-5 text-center">
                <p className="mb-1 text-xs font-medium uppercase tracking-widest text-[var(--text-tertiary)]">Vybráno</p>
                <p className={cn(
                  "text-4xl font-black tabular-nums leading-none transition-colors",
                  isExact ? "text-green-500" : givenCrosses > allowedCrosses ? "text-red-500" : "text-[var(--text-primary)]"
                )}>
                  {givenCrosses} <span className="text-[var(--text-tertiary)] font-light">/</span> {allowedCrosses}
                </p>
              </div>
            )}

            {/* ── Heat navigation ── */}
            {totalHeats > 1 && (
              <div className="mb-4 flex items-center justify-between">
                <button
                  onClick={() => setCurrentHeatIdx((i) => Math.max(0, i - 1))}
                  disabled={currentHeatIdx === 0}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-[var(--text-secondary)] disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  Skupina {currentHeatIdx + 1}
                  <span className="ml-1 text-[var(--text-tertiary)] font-normal">/ {totalHeats}</span>
                  <span className="ml-2 text-xs text-[var(--text-tertiary)]">· {currentHeatPairs.length} párů</span>
                </span>
                <button
                  onClick={() => setCurrentHeatIdx((i) => Math.min(totalHeats - 1, i + 1))}
                  disabled={currentHeatIdx === totalHeats - 1}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-[var(--text-secondary)] disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* ── Couple grid ── */}
            <div className="grid grid-cols-4 gap-2">
              {currentHeatPairs.map((pair) => (
                <CoupleTile
                  key={pair.id}
                  pair={pair}
                  isSelected={activeSelected.has(pair.id)}
                  isDisabled={atLimit}
                  onToggle={() => togglePair(pair.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Bottom bar ── */}
      {!isAlreadyDone && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--border)] bg-[var(--surface)] px-4 pt-3 pb-4 shadow-[0_-4px_24px_rgba(0,0,0,0.12)]">
          <div className="mx-auto max-w-lg space-y-2">

            {/* Main actions */}
            <div className="flex gap-2">
              <Button
                variant="outline" size="lg" className="shrink-0 px-5 font-semibold"
                onClick={() => setSelected((prev) => { const next = new Map(prev); next.set(activeDanceCode, new Set()); return next; })}
              >
                {t("judge.clear", locale)}
              </Button>

              {/* Submit button with counter pill */}
              <button
                onClick={handleSubmit}
                disabled={submitting || givenCrosses === 0}
                className={cn(
                  "flex flex-1 items-center justify-between overflow-hidden rounded-[var(--radius-md)] transition-all disabled:opacity-40",
                  isExact ? "bg-[var(--accent)]" : "bg-[var(--accent)]/75"
                )}
              >
                <span className="flex-1 px-4 text-sm font-bold text-white">
                  {givenCrosses} {t("judge.selected_of", locale) || "vybráno"}
                </span>
                <span className={cn(
                  "flex items-center gap-1 px-4 py-4 text-sm font-bold",
                  isExact ? "bg-white/15 text-white" : "bg-black/20 text-white/80"
                )}>
                  {remaining > 0 && <span className="text-xs">+{remaining} ◆ </span>}
                  Odeslat
                </span>
              </button>
            </div>

            {/* Context footer: "Judging: Čtvrtfinále · Skupina 3 · Cha Cha" */}
            <p className="text-center text-[11px] text-[var(--text-tertiary)]">
              Hodnotíš: <span className="font-semibold text-[var(--text-secondary)]">
                {roundLabel(round.roundType)}
                {totalHeats > 1 && ` · Skupina ${currentHeatIdx + 1}`}
                {activeDance && ` · ${activeDance.name}`}
              </span>
            </p>
          </div>
        </div>
      )}

      <ConfirmSheet
        open={showConfirm}
        selected={givenCrosses}
        required={allowedCrosses}
        onConfirm={doSubmit}
        onBack={() => setShowConfirm(false)}
      />
    </div>
  );
}
