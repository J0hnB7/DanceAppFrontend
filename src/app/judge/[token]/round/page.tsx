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
  /** Dance names this judge has already submitted — used to skip completed dances */
  submittedDances?: string[];
}

// ── Couple tile ───────────────────────────────────────────────────────────────

type PairState = "none" | "tentative" | "selected";

function CoupleTile({ pair, state, isDisabled, onTap, onLongPress }: {
  pair: PairDto; state: PairState; isDisabled: boolean; onTap: () => void; onLongPress: () => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const handlePointerDown = () => {
    didLongPress.current = false;
    timerRef.current = setTimeout(() => {
      didLongPress.current = true;
      onLongPress();
      // Haptic feedback if available
      if (navigator.vibrate) navigator.vibrate(30);
    }, 1000);
  };

  const handlePointerUp = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (!didLongPress.current) onTap();
  };

  const handlePointerLeave = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  };

  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onContextMenu={(e) => e.preventDefault()}
      disabled={isDisabled && state === "none"}
      aria-label={`Pair ${pair.startNumber}${pair.dancer1LastName ? ` — ${[pair.dancer1LastName, pair.dancer2LastName].filter(Boolean).join(" / ")}` : ""}, ${state === "selected" ? "selected" : state === "tentative" ? "tentative" : "not selected"}`}
      aria-pressed={state === "selected"}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-xl border-2 p-2 transition-all active:scale-95 select-none min-h-[76px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1",
        state === "selected"
          ? "border-[var(--accent)] bg-[var(--accent)] shadow-lg"
          : state === "tentative"
          ? "border-amber-400 bg-amber-500/20 shadow-md animate-pulse"
          : isDisabled
          ? "border-[var(--border)] bg-[var(--surface)] opacity-35 cursor-not-allowed"
          : "border-[var(--border)] bg-[var(--surface)] active:bg-[var(--surface-secondary)]"
      )}
    >
      {state === "selected" && (
        <span className="absolute right-1.5 top-1.5 flex h-[14px] w-[14px] items-center justify-center rounded-full bg-white/25 text-[8px] font-bold text-white">✓</span>
      )}
      {state === "tentative" && (
        <span className="absolute right-1.5 top-1.5 flex h-[14px] w-[14px] items-center justify-center rounded-full bg-amber-400/40 text-[8px] font-bold text-amber-900">?</span>
      )}
      <span className={cn(
        "text-[22px] font-black leading-none tabular-nums",
        state === "selected" ? "text-white" : state === "tentative" ? "text-amber-400" : "text-[var(--text-primary)]"
      )}>
        {pair.startNumber}
      </span>
      {(pair.dancer1LastName || pair.dancer2LastName) && (
        <span className={cn(
          "mt-1 w-full truncate text-center text-[8px] font-medium leading-tight",
          state === "selected" ? "text-white/70" : state === "tentative" ? "text-amber-400/70" : "text-[var(--text-tertiary)]"
        )}>
          {[pair.dancer1LastName, pair.dancer2LastName].filter(Boolean).join(" / ")}
        </span>
      )}
    </button>
  );
}

// ── Confirmation sheet ────────────────────────────────────────────────────────

function ConfirmSheet({ open, selected, required, onConfirm, onBack, locale }: {
  open: boolean; selected: number; required: number; onConfirm: () => void; onBack: () => void; locale: Locale;
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
              {selected < required ? t("prelim.less_crosses", locale) : t("prelim.more_crosses", locale)}
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {t("prelim.marked", locale, { selected: String(selected), required: String(required) })}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onBack}>{t("judge.back", locale)}</Button>
          {selected > required && (
            <Button className="flex-1" onClick={onConfirm}>{t("judge.submit_anyway", locale)}</Button>
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
  const [locale, setLocale] = useState<Locale>(() => detectLocale());

  const toggleLocale = () => {
    const next: Locale = locale === "cs" ? "en" : "cs";
    setLocale(next);
    localStorage.setItem("danceapp_locale", next);
  };
  const isOnline = useOnline();

  const [round, setRound] = useState<RoundInfo | null>(null);
  const [sectionName, setSectionName] = useState<string | null>(null);
  const [dances, setDances] = useState<DanceDto[]>([]);
  const [pairs, setPairs] = useState<PairDto[]>([]);
  const [heats, setHeats] = useState<HeatGroup[]>([]);

  // Active dance index — first unsubmitted dance shown by default, updated by floor-control SSE
  const [activeDanceIdx, setActiveDanceIdx] = useState(0);
  // Active heat (group) — 0-indexed, updated by floor-control SSE
  const [activeHeatIdx, setActiveHeatIdx] = useState(0);

  // Dance names this judge has already submitted — prevent re-scoring
  const [submittedDanceNames, setSubmittedDanceNames] = useState<Set<string>>(new Set());

  // Pair states: "selected" (blue, counts as X), "tentative" (yellow, doesn't count)
  const [pairStates, setPairStates] = useState<Record<string, PairState>>({});

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
      .get<ActiveRoundResponse>("/judge/active-round", {
        params: { competitionId },
        ...(adjudicatorId ? { headers: { 'X-Judge-Token': adjudicatorId } } : {}),
      })
      .then((r) => {
        setRound(r.data.round);
        const mappedDances = (r.data.dances ?? []).map((d) => ({ ...d, name: d.danceName ?? d.name ?? "" }));
        setDances(mappedDances);
        setPairs(r.data.pairs);
        setHeats(r.data.heats ?? []);
        setSectionName(r.data.sectionName ?? null);

        // Track which dances are already submitted
        const submitted = new Set(r.data.submittedDances ?? []);
        setSubmittedDanceNames(submitted);

        // Auto-skip to first unsubmitted dance
        if (submitted.size > 0 && mappedDances.length > 0) {
          const firstUnsubmitted = mappedDances.findIndex((d) => !submitted.has(d.name));
          if (firstUnsubmitted >= 0) {
            setActiveDanceIdx(firstUnsubmitted);
          } else {
            // All dances submitted — show last dance as submitted
            setActiveDanceIdx(mappedDances.length - 1);
          }
        }
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

  // localStorage key for tentative marks — scoped to judge + round + dance
  const tentativeStorageKey = round && activeDance
    ? `tentative_${adjudicatorId}_${round.id}_${activeDance.name}`
    : null;

  // Persist tentative marks to localStorage on change
  useEffect(() => {
    if (!tentativeStorageKey) return;
    const tentativePairs = Object.entries(pairStates)
      .filter(([, s]) => s === "tentative")
      .map(([id]) => id);
    if (tentativePairs.length > 0) {
      localStorage.setItem(tentativeStorageKey, JSON.stringify(tentativePairs));
    } else {
      localStorage.removeItem(tentativeStorageKey);
    }
  }, [pairStates, tentativeStorageKey]);

  // Restore tentative marks from localStorage when dance changes
  useEffect(() => {
    if (!tentativeStorageKey) return;
    try {
      const saved = localStorage.getItem(tentativeStorageKey);
      if (saved) {
        const ids: string[] = JSON.parse(saved);
        setPairStates((prev) => {
          const next = { ...prev };
          for (const [k, v] of Object.entries(next)) {
            if (v === "tentative") delete next[k];
          }
          for (const id of ids) {
            if (!next[id] || next[id] === "none") next[id] = "tentative";
          }
          return next;
        });
      }
    } catch { /* ignore */ }
  }, [tentativeStorageKey]);
  const currentDanceAlreadySubmitted = activeDance ? submittedDanceNames.has(activeDance.name) : false;
  const allDancesSubmitted = dances.length > 0 && dances.every((d) => submittedDanceNames.has(d.name));

  // Show pairs for the selected group only; fall back to all pairs if no heats
  const visiblePairs = activeHeat
    ? pairs.filter((p) => activeHeat.pairIds.includes(p.id))
    : pairs;

  const allowedCrosses = round?.pairsToAdvance ?? 0;
  const givenCrosses   = Object.values(pairStates).filter((s) => s === "selected").length;
  const tentativeCount = Object.values(pairStates).filter((s) => s === "tentative").length;
  const remaining      = Math.max(0, allowedCrosses - givenCrosses);
  const atLimit        = allowedCrosses > 0 && givenCrosses >= allowedCrosses;
  const isExact        = allowedCrosses > 0 && givenCrosses === allowedCrosses;

  // Tap: none→selected, tentative→selected, selected→none
  const handleTap = (pairId: string) => {
    setPairStates((prev) => {
      const current = prev[pairId] ?? "none";
      if (current === "selected") return { ...prev, [pairId]: "none" };
      // none or tentative → selected
      if (current === "none" && allowedCrosses > 0) {
        const selectedCount = Object.values(prev).filter((s) => s === "selected").length;
        if (selectedCount >= allowedCrosses) return prev;
      }
      return { ...prev, [pairId]: "selected" };
    });
  };

  // Long-press: none→tentative, tentative→none, selected→tentative
  const handleLongPress = (pairId: string) => {
    setPairStates((prev) => {
      const current = prev[pairId] ?? "none";
      if (current === "none") return { ...prev, [pairId]: "tentative" };
      if (current === "tentative") return { ...prev, [pairId]: "none" };
      if (current === "selected") return { ...prev, [pairId]: "tentative" };
      return prev;
    });
  };

  const doSubmit = useCallback(async () => {
    if (!round || !adjudicatorId) return;
    setSubmitting(true);
    setShowConfirm(false);

    // Only selected (blue) pairs count — tentative (yellow) are ignored
    const selectedPairIds = pairs.filter((p) => pairStates[p.id] === "selected").map((p) => p.id);
    const selectedSet = new Set(selectedPairIds);

    try {
      await Promise.all(pairs.map((p) =>
        judgeOfflineStore.saveMark({
          key: `${adjudicatorId}-${round.id}-${p.id}`,
          judgeTokenId: adjudicatorId, roundId: round.id,
          dance: "", danceId: "",
          pairId: p.id, recalled: selectedSet.has(p.id),
          deviceToken: deviceToken ?? "", createdAt: new Date().toISOString(), synced: false,
        })
      ));
    } catch { /* ignore IDB errors */ }

    if (isOnline) {
      try {
        await apiClient.post(
          `/rounds/${round.id}/callbacks`,
          { selectedPairIds, dance: activeDance?.name ?? 'UNKNOWN' },
          { params: { dance: activeDance?.name }, headers: { 'X-Judge-Token': adjudicatorId } }
        );
        await judgeOfflineStore.markAsSynced(pairs.map((p) => `${adjudicatorId}-${round.id}-${p.id}`));
      } catch { /* saved offline */ }
    }

    // Clean up tentative localStorage for this dance
    if (tentativeStorageKey) localStorage.removeItem(tentativeStorageKey);

    const danceName = activeDance?.name ?? 'UNKNOWN';
    setSubmittedDanceNames((prev) => {
      const next = new Set(prev);
      next.add(danceName);
      return next;
    });

    const nextIdx = dances.findIndex((d, i) => i > activeDanceIdx && !submittedDanceNames.has(d.name) && d.name !== danceName);
    if (nextIdx >= 0) {
      setTimeout(() => {
        setActiveDanceIdx(nextIdx);
        setPairStates({});
        setSubmitted(false);
      }, 2000);
    } else {
      setSubmitted(true);
    }
    setSubmitting(false);
  }, [round, adjudicatorId, pairs, pairStates, deviceToken, isOnline, activeDance, dances, activeDanceIdx, submittedDanceNames, tentativeStorageKey]);

  const [showTentativeWarn, setShowTentativeWarn] = useState(false);

  const handleSubmit = () => {
    if (tentativeCount > 0) {
      setShowTentativeWarn(true);
    } else if (allowedCrosses > 0 && givenCrosses !== allowedCrosses) {
      setShowConfirm(true);
    } else {
      doSubmit();
    }
  };

  const confirmTentativeAndSubmit = () => {
    setShowTentativeWarn(false);
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
          <Bell className="h-4 w-4" /> {t("prelim.ping_alert", locale)}
        </div>
      )}

      {!isOnline && (
        <div className="flex items-center justify-center gap-2 border-b border-[var(--warning)]/20 bg-[var(--warning)]/10 px-4 py-2 text-xs font-medium text-[var(--warning)]">
          <CloudOff className="h-3.5 w-3.5" /> {t("prelim.offline_local", locale)}
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

          {/* Dance tabs — show which are done */}
          <div className="flex gap-1 overflow-x-auto">
            {dances.map((d, i) => {
              const isDone = submittedDanceNames.has(d.name);
              const isActive = i === activeDanceIdx;
              return (
                <button
                  key={d.id}
                  onClick={() => { setActiveDanceIdx(i); if (!isDone) { setPairStates({}); setSubmitted(false); } }}
                  aria-label={`${d.name}${isDone ? " (submitted)" : ""}`}
                  aria-pressed={isActive}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap transition-colors min-h-[44px] flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                    isActive ? "bg-[var(--accent)] text-white" : isDone ? "bg-[var(--success)]/15 text-[var(--success)]" : "bg-[var(--surface-secondary)] text-[var(--text-secondary)]"
                  )}
                >
                  {isDone && "✓ "}{d.name}
                </button>
              );
            })}
          </div>

          {/* Right controls */}
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={toggleLocale}
              aria-label={locale === "cs" ? "Switch to English" : "Přepnout do češtiny"}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-[var(--surface-secondary)] px-3 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] hover:bg-[var(--border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
              {locale === "cs" ? "EN" : "CZ"}
            </button>
            <button onClick={toggleTheme}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
              {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
            {isOnline ? <Wifi className="h-4 w-4 text-[var(--success)]" aria-hidden="true" /> : <WifiOff className="h-4 w-4 text-[var(--warning)]" aria-hidden="true" />}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="mx-auto w-full max-w-lg flex-1 px-4 pt-4 pb-36">

        {allDancesSubmitted || submitted ? (
          <div className="flex flex-col items-center gap-6 py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--success)]/10">
              <CheckCircle2 className="h-10 w-10 text-[var(--success)]" />
            </div>
            <div>
              <p className="text-xl font-bold text-[var(--text-primary)]">
                {allDancesSubmitted ? t("prelim.all_submitted_title", locale) : t("prelim.submitted_title", locale)}
              </p>
              <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
                {allDancesSubmitted ? t("prelim.all_thanks", locale) : t("prelim.wait_next", locale)}
              </p>
            </div>
            {!allDancesSubmitted && (
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-ping rounded-full bg-[var(--accent)]" />
                <div className="h-2 w-2 animate-ping rounded-full bg-[var(--accent)] [animation-delay:0.2s]" />
                <div className="h-2 w-2 animate-ping rounded-full bg-[var(--accent)] [animation-delay:0.4s]" />
              </div>
            )}
          </div>
        ) : currentDanceAlreadySubmitted ? (
          <div className="flex flex-col items-center gap-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success)]/10">
              <CheckCircle2 className="h-8 w-8 text-[var(--success)]" />
            </div>
            <div>
              <p className="text-lg font-bold text-[var(--text-primary)]">
                {activeDance?.name} {t("prelim.already_submitted", locale)}
              </p>
              <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
                {t("prelim.dance_already_desc", locale)}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* ── Cross counter ── */}
            {allowedCrosses > 0 && (
              <div className="mb-4 text-center">
                <p className="mb-1 text-xs font-medium uppercase tracking-widest text-[var(--text-tertiary)]">{t("prelim.selected_label", locale)}</p>
                <p className={cn(
                  "text-4xl font-black tabular-nums leading-none transition-colors",
                  isExact ? "text-green-500" : "text-[var(--text-primary)]"
                )}>
                  {givenCrosses} <span className="text-[var(--text-tertiary)] font-light">/</span> {allowedCrosses}
                  {tentativeCount > 0 && (
                    <span className="ml-2 text-lg font-semibold text-amber-400">(+{tentativeCount}?)</span>
                  )}
                </p>
                {remaining > 0 && (
                  <p className="mt-1 text-sm text-[var(--text-tertiary)]">{t("prelim.remaining", locale, { n: String(remaining) })}</p>
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
                    aria-pressed={i === activeHeatIdx}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors border min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                      i === activeHeatIdx
                        ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                        : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)]"
                    )}
                  >
                    {t("prelim.group", locale, { n: String(heat.heatNumber) })}
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
                  state={pairStates[pair.id] ?? "none"}
                  isDisabled={atLimit}
                  onTap={() => handleTap(pair.id)}
                  onLongPress={() => handleLongPress(pair.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Bottom bar ── */}
      {!submitted && !allDancesSubmitted && !currentDanceAlreadySubmitted && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--border)] bg-[var(--surface)] px-4 pt-3 pb-4 shadow-[0_-4px_24px_rgba(0,0,0,0.12)]">
          <div className="mx-auto max-w-lg space-y-2">
            <div className="flex gap-2">
              <Button
                variant="outline" size="lg" className="shrink-0 px-5 font-semibold"
                onClick={() => setPairStates({})}
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
                {t("prelim.submit_btn", locale)}
              </Button>
            </div>

            <p className="text-center text-[11px] text-[var(--text-tertiary)]">
              {activeDance?.name ?? ""}
              {heats.length > 1 && ` · ${t("prelim.group", locale, { n: String(heats[activeHeatIdx]?.heatNumber ?? 1) })}`}
              {` · ${pairs.length} ${locale === "en" ? "pairs" : "párů"} · ${locale === "en" ? "advances" : "postupuje"} ${allowedCrosses}`}
            </p>
          </div>
        </div>
      )}

      {/* Tentative warning dialog */}
      {showTentativeWarn && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-t-2xl bg-[var(--surface)] p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  {t("prelim.undecided_title", locale)}
                </h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  {locale === "cs" ? (
                    <>Máte <strong>{tentativeCount}</strong> {tentativeCount === 1 ? t("prelim.undecided_one", locale) : tentativeCount < 5 ? t("prelim.undecided_few", locale) : t("prelim.undecided_many", locale)} (žluté). Nebudou započítány.</>
                  ) : (
                    <>You have <strong>{tentativeCount}</strong> {tentativeCount === 1 ? t("prelim.undecided_one", locale) : t("prelim.undecided_many", locale)} (yellow). They will not be counted.</>
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowTentativeWarn(false)}>{t("judge.back", locale)}</Button>
              <Button className="flex-1 bg-amber-500 hover:bg-amber-600" onClick={confirmTentativeAndSubmit}>{t("prelim.submit_anyway_btn", locale)}</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmSheet
        open={showConfirm}
        selected={givenCrosses}
        required={allowedCrosses}
        onConfirm={doSubmit}
        onBack={() => setShowConfirm(false)}
        locale={locale}
      />
    </div>
  );
}
