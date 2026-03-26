"use client";

import { use, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useOnline } from "@/hooks/use-online";
import { CheckCircle2, Bell, CloudOff, Wifi, WifiOff, AlertTriangle, Sun, Moon } from "lucide-react";
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
  dancer1LastName?: string;
  dancer2LastName?: string;
}

interface DanceDto { id: string; name: string; code?: string; danceName?: string; }
interface HeatGroup { heatNumber: number; pairIds: string[]; }

interface RoundInfo {
  id: string;
  roundNumber: number;
  roundType: string;
  pairsToAdvance?: number | null;
}

interface ActiveRoundResponse {
  round: RoundInfo;
  dances: DanceDto[];
  pairs: PairDto[];
  heats: HeatGroup[];
  sectionName?: string;
}

// ── Couple tile ───────────────────────────────────────────────────────────────

function CoupleTile({ pair, isSelected, isDisabled, onToggle }: {
  pair: PairDto; isSelected: boolean; isDisabled: boolean; onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={isDisabled && !isSelected}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-xl border-2 p-2 transition-all active:scale-95 select-none min-h-[76px]",
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
      <span className={cn("text-[22px] font-black leading-none tabular-nums", isSelected ? "text-white" : "text-[var(--text-primary)]")}>
        {pair.startNumber}
      </span>
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
          {selected > required && (
            <Button className="flex-1" onClick={onConfirm}>Odeslat tak</Button>
          )}
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
  const [sectionName, setSectionName] = useState<string | null>(null);
  const [dances, setDances] = useState<DanceDto[]>([]);
  const [pairs, setPairs] = useState<PairDto[]>([]);
  const [heats, setHeats] = useState<HeatGroup[]>([]);

  // Active dance index — first dance shown by default, updated by floor-control SSE
  const [activeDanceIdx, setActiveDanceIdx] = useState(0);
  // Active heat (group) — 0-indexed, updated by floor-control SSE
  const [activeHeatIdx, setActiveHeatIdx] = useState(0);

  // Global recalled set — one cross per pair across the whole round
  const [recalled, setRecalled] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pingAlert, setPingAlert] = useState(false);
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
        setRound(r.data.round);
        setDances((r.data.dances ?? []).map((d) => ({ ...d, name: d.danceName ?? d.name ?? "" })));
        setPairs(r.data.pairs);
        setHeats(r.data.heats ?? []);
        setSectionName(r.data.sectionName ?? null);
      })
      .catch(() => router.push(`/judge/${token}/lobby`))
      .finally(() => setLoading(false));
  }, [competitionId, token, router]);

  // Refs to avoid stale closure in SSE callback
  const dancesRef = useRef<DanceDto[]>([]);
  const heatsRef  = useRef<HeatGroup[]>([]);
  useEffect(() => { dancesRef.current = dances; }, [dances]);
  useEffect(() => { heatsRef.current  = heats;  }, [heats]);

  // Subscribe to public SSE channel: floor-control + judge-ping
  useEffect(() => {
    if (!competitionId) return;
    const es = new EventSource(`/api/v1/sse/competitions/${competitionId}/public`);
    es.addEventListener("floor-control", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { danceName: string; heatNumber: number };
        const danceIdx = dancesRef.current.findIndex((d) => d.name === data.danceName);
        if (danceIdx >= 0) setActiveDanceIdx(danceIdx);
        const heatIdx = heatsRef.current.findIndex((h) => h.heatNumber === data.heatNumber);
        if (heatIdx >= 0) setActiveHeatIdx(heatIdx);
      } catch { /* ignore malformed */ }
    });
    es.addEventListener("judge-ping", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { judgeTokenId: string };
        if (data.judgeTokenId === adjudicatorId) {
          setPingAlert(true);
          setTimeout(() => setPingAlert(false), 4000);
        }
      } catch { /* ignore */ }
    });
    return () => es.close();
  }, [competitionId, adjudicatorId]);

  // Heartbeat every 20s — keeps admin dashboard online indicator accurate
  useEffect(() => {
    if (!adjudicatorId || !isOnline) return;
    const sendHeartbeat = () =>
      apiClient.put(`/judge-access/${adjudicatorId}/heartbeat`).catch(() => {});
    sendHeartbeat();
    const id = setInterval(sendHeartbeat, 20_000);
    return () => clearInterval(id);
  }, [adjudicatorId, isOnline]);

  const activeDance = dances[activeDanceIdx];
  const activeHeat  = heats.length > 0 ? heats[activeHeatIdx] : null;

  // Show pairs for the selected group only; fall back to all pairs if no heats
  const visiblePairs = activeHeat
    ? pairs.filter((p) => activeHeat.pairIds.includes(p.id))
    : pairs;

  const allowedCrosses = round?.pairsToAdvance ?? 0;
  const givenCrosses   = recalled.size;
  const remaining      = Math.max(0, allowedCrosses - givenCrosses);
  const atLimit        = allowedCrosses > 0 && givenCrosses >= allowedCrosses;
  const isExact        = allowedCrosses > 0 && givenCrosses === allowedCrosses;

  const togglePair = (pairId: string) => {
    setRecalled((prev) => {
      const next = new Set(prev);
      if (next.has(pairId)) {
        next.delete(pairId);
      } else {
        if (allowedCrosses > 0 && next.size >= allowedCrosses) return prev;
        next.add(pairId);
      }
      return next;
    });
  };

  const doSubmit = useCallback(async () => {
    if (!round || !adjudicatorId) return;
    setSubmitting(true);
    setShowConfirm(false);

    const selectedPairIds = pairs.filter((p) => recalled.has(p.id)).map((p) => p.id);

    try {
      await Promise.all(pairs.map((p) =>
        judgeOfflineStore.saveMark({
          key: `${adjudicatorId}-${round.id}-${p.id}`,
          judgeTokenId: adjudicatorId, roundId: round.id,
          dance: "", danceId: "",
          pairId: p.id, recalled: recalled.has(p.id),
          deviceToken: deviceToken ?? "", createdAt: new Date().toISOString(), synced: false,
        })
      ));
    } catch { /* ignore IDB errors */ }

    if (isOnline) {
      try {
        // Judge confirms once per dance (roundId:dance) — covers all groups/heats
        await apiClient.post(
          `/rounds/${round.id}/callbacks`,
          { selectedPairIds, dance: activeDance?.name ?? 'UNKNOWN' },
          { params: { judgeTokenId: adjudicatorId, dance: activeDance?.name } }
        );
        await judgeOfflineStore.markAsSynced(pairs.map((p) => `${adjudicatorId}-${round.id}-${p.id}`));
      } catch { /* saved offline */ }
    }

    setSubmitted(true);
    setSubmitting(false);
  }, [round, adjudicatorId, pairs, recalled, deviceToken, isOnline, router, token]);

  const handleSubmit = () => {
    if (allowedCrosses > 0 && givenCrosses !== allowedCrosses) {
      setShowConfirm(true);
    } else {
      doSubmit();
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner size="lg" /></div>;
  if (!round) return null;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">

      {/* Offline banner */}
      {pingAlert && (
        <div className="flex items-center justify-center gap-2 border-b border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-2.5 text-sm font-semibold text-[var(--accent)]">
          <Bell className="h-4 w-4" /> Upozornění od porotní komise — prosím odevzdejte hodnocení
        </div>
      )}

      {!isOnline && (
        <div className="flex items-center justify-center gap-2 border-b border-[var(--warning)]/20 bg-[var(--warning)]/10 px-4 py-2 text-xs font-medium text-[var(--warning)]">
          <CloudOff className="h-3.5 w-3.5" /> Offline — hodnocení se uloží lokálně
        </div>
      )}

      {/* ── Header ── */}
      <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2 shadow-sm">
        {sectionName && (
          <p className="mx-auto max-w-lg truncate pb-1 text-[11px] font-medium text-[var(--text-tertiary)]">
            {sectionName}
          </p>
        )}
        <div className="mx-auto max-w-lg flex items-center justify-between gap-2">

          {/* Current dance — single read-only pill */}
          <span className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white">
            {activeDance?.name ?? round.roundType}
          </span>

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

        {submitted ? (
          <div className="flex flex-col items-center gap-6 py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--success)]/10">
              <CheckCircle2 className="h-10 w-10 text-[var(--success)]" />
            </div>
            <div>
              <p className="text-xl font-bold text-[var(--text-primary)]">Hodnocení odesláno</p>
              <p className="mt-1.5 text-sm text-[var(--text-secondary)]">Čeká se na další kolo</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-ping rounded-full bg-[var(--accent)]" />
              <div className="h-2 w-2 animate-ping rounded-full bg-[var(--accent)] [animation-delay:0.2s]" />
              <div className="h-2 w-2 animate-ping rounded-full bg-[var(--accent)] [animation-delay:0.4s]" />
            </div>
          </div>
        ) : (
          <>
            {/* ── Cross counter ── */}
            {allowedCrosses > 0 && (
              <div className="mb-4 text-center">
                <p className="mb-1 text-xs font-medium uppercase tracking-widest text-[var(--text-tertiary)]">Vybráno</p>
                <p className={cn(
                  "text-4xl font-black tabular-nums leading-none transition-colors",
                  isExact ? "text-green-500" : "text-[var(--text-primary)]"
                )}>
                  {givenCrosses} <span className="text-[var(--text-tertiary)] font-light">/</span> {allowedCrosses}
                </p>
                {remaining > 0 && (
                  <p className="mt-1 text-sm text-[var(--text-tertiary)]">{remaining} zbývá</p>
                )}
              </div>
            )}

            {/* ── Group selector ── */}
            {heats.length > 1 && (
              <div className="mb-4 flex gap-1.5 flex-wrap">
                {heats.map((heat, i) => (
                  <button
                    key={heat.heatNumber}
                    onClick={() => setActiveHeatIdx(i)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors border",
                      i === activeHeatIdx
                        ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                        : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)]"
                    )}
                  >
                    Skupina {heat.heatNumber}
                  </button>
                ))}
              </div>
            )}

            {/* ── Pairs grid for selected group ── */}
            <div className="grid grid-cols-4 gap-2">
              {visiblePairs.map((pair) => (
                <CoupleTile
                  key={pair.id}
                  pair={pair}
                  isSelected={recalled.has(pair.id)}
                  isDisabled={atLimit}
                  onToggle={() => togglePair(pair.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Bottom bar ── */}
      {!submitted && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--border)] bg-[var(--surface)] px-4 pt-3 pb-4 shadow-[0_-4px_24px_rgba(0,0,0,0.12)]">
          <div className="mx-auto max-w-lg space-y-2">
            <div className="flex gap-2">
              <Button
                variant="outline" size="lg" className="shrink-0 px-5 font-semibold"
                onClick={() => setRecalled(new Set())}
              >
                {t("judge.clear", locale)}
              </Button>

              <Button
                size="lg"
                className="flex-1 font-bold text-base"
                onClick={handleSubmit}
                disabled={submitting || givenCrosses === 0}
                loading={submitting}
              >
                Odeslat
              </Button>
            </div>

            <p className="text-center text-[11px] text-[var(--text-tertiary)]">
              {activeDance?.name ?? ""}
              {heats.length > 1 && ` · Skupina ${heats[activeHeatIdx]?.heatNumber ?? 1}`}
              {` · ${pairs.length} párů · postupuje ${allowedCrosses}`}
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
