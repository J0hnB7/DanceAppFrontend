"use client";

import { use, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Bell, CloudOff, Wifi, WifiOff, AlertTriangle, Sun, Moon, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import apiClient from "@/lib/api-client";
import axios from "axios";
import { useOnline } from "@/hooks/use-online";
import { t, detectLocale, type Locale } from "@/lib/i18n/translations";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { violationsApi, type PenaltyType } from "@/lib/api/violations";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PairDto {
  id: string;
  startNumber: number;
  dancer1FirstName?: string;
  dancer1LastName?: string;
  dancer2FirstName?: string;
  dancer2LastName?: string;
}

interface DanceDto {
  id: string;
  name: string;
  code?: string;
  danceName?: string;
}

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
  submittedDances?: string[];
}

// ── Placement row ─────────────────────────────────────────────────────────────

function PlacementRow({
  pair,
  placements,
  maxPlacement,
  onSet,
}: {
  pair: PairDto;
  placements: Record<string, number>;
  maxPlacement: number;
  onSet: (pairId: string, placement: number) => void;
}) {
  const assigned = new Set(Object.values(placements));
  const current = placements[pair.id];

  return (
    <div className={cn(
      "flex items-center gap-3 rounded-xl border px-4 py-3 transition-all",
      current
        ? "border-[var(--accent)]/30 bg-[var(--surface)]"
        : "border-[var(--border)] bg-[var(--surface)]"
    )}>
      {/* Couple info */}
      <div className="min-w-[60px] shrink-0">
        <span className="text-[22px] font-black tabular-nums text-[var(--text-primary)]">
          {pair.startNumber}
        </span>
        {(pair.dancer1LastName || pair.dancer2LastName) && (
          <p className="truncate text-[9px] text-[var(--text-tertiary)]">
            {[pair.dancer1LastName, pair.dancer2LastName].filter(Boolean).join(" / ")}
          </p>
        )}
      </div>

      {/* Placement buttons */}
      <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto">
        {Array.from({ length: maxPlacement }, (_, i) => i + 1).map((p) => {
          const isSelected = current === p;
          const isUsed = assigned.has(p) && !isSelected;
          return (
            <button
              key={p}
              onClick={() => onSet(pair.id, p)}
              disabled={isUsed}
              aria-label={`Place ${p}${isSelected ? " (selected)" : isUsed ? " (taken)" : ""}`}
              aria-pressed={isSelected}
              className={cn(
                "flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-sm font-bold transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                isSelected
                  ? "bg-[var(--accent)] text-white shadow-md"
                  : isUsed
                  ? "cursor-not-allowed bg-[var(--surface-secondary)] text-[var(--text-tertiary)] opacity-25"
                  : "bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--text-primary)]"
              )}
            >
              {isSelected ? (
                <span className="flex items-center justify-center">
                  {p}
                  <span className="ml-0.5 text-[9px]">✓</span>
                </span>
              ) : p}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function JudgeFinalPage({ params }: { params: Promise<{ token: string }> }) {
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
  const [activeDanceIdx, setActiveDanceIdx] = useState(0);
  // danceId → { pairId → placement }
  const [placements, setPlacements] = useState<Record<string, Record<string, number>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());
  const [submittedDanceNames, setSubmittedDanceNames] = useState<Set<string>>(new Set());
  const [pingAlert, setPingAlert] = useState(false);
  const [showViolationSheet, setShowViolationSheet] = useState(false);
  const [violationStep, setViolationStep] = useState<"pair" | "type" | "confirm">("pair");
  const [violationPairId, setViolationPairId] = useState<string | null>(null);
  const [violationPenaltyType, setViolationPenaltyType] = useState<PenaltyType | null>(null);
  const [violationReporting, setViolationReporting] = useState(false);
  const [violationCooldown, setViolationCooldown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );
  const toggleTheme = () => {
    const dark = !isDark;
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  };

  const competitionId = typeof window !== "undefined" ? localStorage.getItem(`judge_competition_id_${token}`) : null;
  const adjudicatorId = typeof window !== "undefined" ? localStorage.getItem(`judge_adjudicator_id_${token}`) : null;
  const deviceToken   = typeof window !== "undefined" ? localStorage.getItem(`judge_device_token_${token}`)   : null;

  // True only for the first load after mount — see round/page.tsx for rationale.
  const initialLoadRef = useRef(true);

  const loadActiveRound = useCallback(() => {
    if (!competitionId) { router.push(`/judge/${token}`); return; }
    apiClient
      .get<ActiveRoundResponse>("/judge/active-round", {
        params: { competitionId },
        ...(adjudicatorId ? { headers: { 'X-Judge-Token': adjudicatorId } } : {}),
      })
      .then((r) => {
        const data = r.data;
        setRound(data.round);
        setSectionName(data.sectionName ?? null);
        const mappedDances = (data.dances ?? []).map((d) => ({ ...d, name: d.danceName ?? d.name ?? "" }));
        setDances(mappedDances);
        setPairs(data.pairs);

        // Track which dances are already submitted
        const rawSubmitted = new Set(data.submittedDances ?? []);
        const allSubmitted = rawSubmitted.has("UNKNOWN")
          ? new Set([...rawSubmitted, ...mappedDances.map((d) => d.name)])
          : rawSubmitted;
        setSubmittedDanceNames(allSubmitted);

        // Auto-skip to first unsubmitted dance ONLY on initial mount.
        // On SSE refreshes the active dance is driven by admin's floor-control event.
        if (initialLoadRef.current) {
          if (mappedDances.length > 0) {
            const firstUnsubmitted = mappedDances.findIndex((d) => !allSubmitted.has(d.name));
            setActiveDanceIdx(firstUnsubmitted >= 0 ? firstUnsubmitted : mappedDances.length - 1);
          }
          initialLoadRef.current = false;
        }
      })
      .catch(() => router.push(`/judge/${token}/lobby`))
      .finally(() => setLoading(false));
  }, [competitionId, adjudicatorId, token, router]);

  useEffect(() => {
    loadActiveRound();
  }, [loadActiveRound]);

  // Refs for SSE callbacks
  const loadActiveRoundRef = useRef(loadActiveRound);
  useEffect(() => { loadActiveRoundRef.current = loadActiveRound; }, [loadActiveRound]);
  const submittedDanceNamesRef = useRef<Set<string>>(new Set());
  useEffect(() => { submittedDanceNamesRef.current = submittedDanceNames; }, [submittedDanceNames]);
  const dancesRef = useRef<DanceDto[]>([]);
  useEffect(() => { dancesRef.current = dances; }, [dances]);

  // SSE: floor-control + judge-ping + dance-closed
  useEffect(() => {
    if (!competitionId) return;
    const es = new EventSource(`/api/v1/sse/competitions/${competitionId}/public`);
    // floor-control is the single source of truth for which dance is active.
    // Move to exactly the dance admin sent; never auto-skip past it.
    es.addEventListener("floor-control", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { danceName?: string };
        if (data.danceName) {
          const idx = dancesRef.current.findIndex((d) => d.name === data.danceName);
          if (idx >= 0) setActiveDanceIdx(idx);
        }
      } catch { /* ignore malformed */ }
      loadActiveRoundRef.current();
    });
    es.addEventListener("heat-sent", () => {
      loadActiveRoundRef.current();
    });
    es.onerror = () => console.warn("[judge-final] SSE connection error");
    es.addEventListener("judge-ping", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { judgeTokenId: string };
        if (data.judgeTokenId === adjudicatorId) {
          setPingAlert(true);
          setTimeout(() => setPingAlert(false), 4000);
        }
      } catch { /* ignore */ }
    });
    es.addEventListener("dance-closed", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { danceName: string };
        if (data.danceName && !submittedDanceNamesRef.current.has(data.danceName)) {
          setSubmittedDanceNames((prev) => new Set([...prev, data.danceName]));
        }
      } catch { /* ignore */ }
    });
    return () => es.close();
  }, [competitionId, adjudicatorId]);

  // Heartbeat every 20s
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!adjudicatorId) return;
    const sendHeartbeat = () =>
      apiClient.put(`/judge-access/${adjudicatorId}/heartbeat`).catch(() => {});
    const startInterval = () => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      sendHeartbeat();
      heartbeatIntervalRef.current = setInterval(sendHeartbeat, 20_000);
    };
    startInterval();
    const onVisible = () => { if (document.visibilityState === 'visible') startInterval(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      if (heartbeatIntervalRef.current) { clearInterval(heartbeatIntervalRef.current); heartbeatIntervalRef.current = null; }
    };
  }, [adjudicatorId]);

  const setPlacement = (danceId: string, pairId: string, placement: number) => {
    setPlacements((prev) => ({
      ...prev,
      [danceId]: { ...(prev[danceId] ?? {}), [pairId]: placement },
    }));
  };

  const clearDance = (danceId: string) => {
    setPlacements((prev) => ({ ...prev, [danceId]: {} }));
  };

  const submitDance = async (danceId: string) => {
    if (!round) return;
    const dancePlacements = placements[danceId] ?? {};
    const placed = Object.keys(dancePlacements).length;
    if (placed < pairs.length) {
      toast({ title: `${locale === "cs" ? "Přiřaď všechna umístění" : "Assign all placements"} (${placed}/${pairs.length})`, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`/api/v1/rounds/${round.id}/placements/${danceId}`, {
        pairPlacements: dancePlacements,
      }, {
        headers: adjudicatorId ? { 'X-Judge-Token': adjudicatorId } : {},
      });
      setSubmitted((prev) => new Set([...prev, danceId]));
      const danceName = dances[activeDanceIdx]?.name ?? "UNKNOWN";
      setSubmittedDanceNames((prev) => new Set([...prev, danceName]));
      toast({ title: locale === "cs" ? "Hodnocení odesláno" : "Score submitted", variant: "success" });
      // Auto-advance to the next not-yet-submitted dance after a brief pause.
      // Judge cannot navigate manually (dance tabs are non-clickable).
      const justSubmitted = new Set([...submittedDanceNames, danceName]);
      setTimeout(() => {
        const nextIdx = dances.findIndex((d, i) => i > activeDanceIdx && !justSubmitted.has(d.name));
        const fallbackIdx = dances.findIndex((d) => !justSubmitted.has(d.name));
        const target = nextIdx >= 0 ? nextIdx : fallbackIdx;
        if (target >= 0) setActiveDanceIdx(target);
      }, 1500);
    } catch (err) {
      // 409 = already submitted — mark as done silently
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setSubmitted((prev) => new Set([...prev, danceId]));
        const danceName = dances[activeDanceIdx]?.name ?? "UNKNOWN";
        setSubmittedDanceNames((prev) => new Set([...prev, danceName]));
      } else {
        toast({ title: locale === "cs" ? "Odeslání selhalo" : "Submission failed", variant: "destructive" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Store real heat UUID for violation reporting (final round has a single heat)
  const [activeHeatUUID, setActiveHeatUUID] = useState<string | null>(null);
  useEffect(() => {
    if (!round) return;
    apiClient.get<{ id: string; heatNumber: number }[]>(`/rounds/${round.id}/heats`)
      .then((r) => { if (r.data.length > 0) setActiveHeatUUID(r.data[0].id); })
      .catch(() => {});
  }, [round?.id]);

  const handleReportViolation = async (penaltyType: PenaltyType) => {
    if (!deviceToken || !competitionId || !violationPairId || !activeHeatUUID) return;
    setViolationReporting(true);
    try {
      await violationsApi.report(competitionId, {
        deviceToken,
        pairId: violationPairId,
        heatId: activeHeatUUID,
        penaltyType,
      });
      setShowViolationSheet(false);
      setViolationStep("pair");
      setViolationPairId(null);
      setViolationCooldown(true);
      setTimeout(() => setViolationCooldown(false), 3000);
    } catch {
      // silently ignore
    } finally {
      setViolationReporting(false);
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner size="lg" /></div>;
  if (!round) return null;

  const activeDance = dances[activeDanceIdx];
  const activeDanceId = activeDance?.id ?? "";
  const activePlacements = placements[activeDanceId] ?? {};
  const placedCount = Object.keys(activePlacements).length;
  const allPlaced = placedCount === pairs.length;
  const currentDanceAlreadySubmitted = activeDance ? submittedDanceNames.has(activeDance.name) : false;
  const isDoneThisDance = submitted.has(activeDanceId) || currentDanceAlreadySubmitted;
  const allDancesSubmitted = dances.length > 0 && dances.every((d) => submittedDanceNames.has(d.name));

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">

      {/* Ping alert */}
      {pingAlert && (
        <div className="flex items-center justify-center gap-2 border-b border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-2.5 text-sm font-semibold text-[var(--accent)]">
          <Bell className="h-4 w-4" /> {t("prelim.ping_alert", locale)}
        </div>
      )}

      {/* Offline banner */}
      {!isOnline && (
        <div className="flex items-center justify-center gap-2 border-b border-[var(--warning)]/20 bg-[var(--warning)]/10 px-4 py-2 text-xs font-medium text-[var(--warning)]">
          <CloudOff className="h-3.5 w-3.5" /> {t("prelim.offline_local", locale)}
        </div>
      )}

      {/* ── Header ── (matches round page) */}
      <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2 shadow-sm">
        {sectionName && (
          <p className="mx-auto max-w-lg truncate pb-1 text-[11px] font-medium text-[var(--text-tertiary)]">
            {sectionName}
          </p>
        )}
        <div className="mx-auto max-w-lg flex items-center justify-between gap-2">
          {/* Dance tabs */}
          <div className="flex gap-1 overflow-x-auto">
            {dances.map((d, i) => {
              const isDone = submittedDanceNames.has(d.name) || submitted.has(d.id);
              const isActive = i === activeDanceIdx;
              return (
                <span
                  key={d.id}
                  aria-label={`${d.name}${isDone ? " (submitted)" : ""}`}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap transition-colors min-h-[44px] flex items-center",
                    isActive ? "bg-[var(--accent)] text-white" : isDone ? "bg-[var(--success)]/15 text-[var(--success)]" : "bg-[var(--surface-secondary)] text-[var(--text-secondary)]"
                  )}
                >
                  {isDone && "✓ "}{d.name}
                </span>
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

        {allDancesSubmitted ? (
          <div className="flex flex-col items-center gap-6 py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--success)]/10">
              <CheckCircle2 className="h-10 w-10 text-[var(--success)]" />
            </div>
            <div>
              <p className="text-xl font-bold text-[var(--text-primary)]">
                {t("prelim.all_submitted_title", locale)}
              </p>
              <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
                {t("prelim.all_thanks", locale)}
              </p>
            </div>
          </div>
        ) : isDoneThisDance ? (
          <div className="flex flex-col items-center gap-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success)]/10">
              <CheckCircle2 className="h-8 w-8 text-[var(--success)]" />
            </div>
            <div>
              <p className="text-lg font-bold text-[var(--text-primary)]">
                {activeDance?.name} {locale === "cs" ? "odesláno" : "submitted"}
              </p>
              <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
                {t("prelim.wait_next", locale)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-ping rounded-full bg-[var(--accent)]" />
              <div className="h-2 w-2 animate-ping rounded-full bg-[var(--accent)] [animation-delay:0.2s]" />
              <div className="h-2 w-2 animate-ping rounded-full bg-[var(--accent)] [animation-delay:0.4s]" />
            </div>
          </div>
        ) : (
          <>
            {/* Instruction */}
            <div className="mb-4 text-center">
              <p className="text-base font-semibold text-[var(--text-primary)]">
                {locale === "cs" ? "Finále" : "Final"}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                {locale === "cs" ? `Přiřaď umístění (1 – ${pairs.length})` : `Assign placements (1 – ${pairs.length})`}
              </p>
            </div>

            {/* Not all placed warning */}
            {!allPlaced && placedCount > 0 && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/10 px-3 py-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--warning)]" />
                <p className="text-xs text-[var(--warning)]">
                  {locale === "cs" ? "Přiřaď všechna umístění" : "Assign all placements"}
                  <span className="ml-1 font-bold tabular-nums">
                    {Array.from({ length: pairs.length }, (_, i) => i + 1)
                      .filter((p) => !Object.values(activePlacements).includes(p))
                      .join(" ")}
                  </span>
                </p>
              </div>
            )}

            {/* Placement grid */}
            <div className="space-y-2">
              {pairs.toSorted((a, b) => a.startNumber - b.startNumber).map((pair) => (
                <PlacementRow
                  key={pair.id}
                  pair={pair}
                  placements={activePlacements}
                  maxPlacement={pairs.length}
                  onSet={(pairId, placement) => setPlacement(activeDanceId, pairId, placement)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Bottom bar ── (matches round page) */}
      {!isDoneThisDance && !allDancesSubmitted && activeDance && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--border)] bg-[var(--surface)] px-4 pt-3 pb-4 shadow-[0_-4px_24px_rgba(0,0,0,0.12)]">
          <div className="mx-auto max-w-lg space-y-2">
            <div className="flex gap-2">
              <Button
                variant="outline" size="lg" className="shrink-0 px-5 font-semibold"
                onClick={() => clearDance(activeDanceId)}
              >
                {t("judge.clear", locale)}
              </Button>

              <Button
                size="lg"
                className="flex-1 font-bold text-base"
                onClick={() => submitDance(activeDanceId)}
                disabled={submitting || !allPlaced}
                loading={submitting}
              >
                {t("prelim.submit_btn", locale)}
              </Button>
            </div>

            <p className="text-center text-[11px] text-[var(--text-tertiary)]">
              {activeDance?.name ?? ""}
              {` · ${pairs.length} ${locale === "en" ? "pairs" : "párů"}`}
              {` · ${placedCount} / ${pairs.length} ${locale === "cs" ? "přiřazeno" : "assigned"}`}
            </p>
          </div>
        </div>
      )}

      {/* Floating violation report button */}
      {!showViolationSheet && (
        <button
          onClick={() => { setViolationStep("pair"); setViolationPairId(null); setShowViolationSheet(true); }}
          disabled={violationCooldown}
          aria-label={locale === "cs" ? "Nahlásit porušení pravidel" : "Report violation"}
          className={cn(
            "fixed bottom-24 right-4 z-40 flex min-h-[52px] min-w-[52px] items-center justify-center gap-1.5 rounded-full px-4 text-sm font-semibold shadow-lg transition-all cursor-pointer",
            violationCooldown
              ? "bg-green-500 text-white opacity-70"
              : "bg-amber-500 text-white hover:bg-amber-600 active:scale-95"
          )}
        >
          <TriangleAlert className="h-4 w-4" aria-hidden="true" />
          <span>{locale === "cs" ? "Hlásit" : "Report"}</span>
        </button>
      )}

      {/* Violation bottom sheet */}
      {showViolationSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
          <div className="w-full max-w-md rounded-t-2xl bg-[var(--surface)] p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                {violationStep === "pair" && (locale === "cs" ? "Vyberte pár" : "Select pair")}
                {violationStep === "type" && (locale === "cs" ? "Typ porušení" : "Violation type")}
                {violationStep === "confirm" && (locale === "cs" ? "Potvrdit hlášení" : "Confirm report")}
              </h2>
              <button
                onClick={() => { setShowViolationSheet(false); setViolationStep("pair"); }}
                aria-label="Zavřít"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] cursor-pointer"
              >✕</button>
            </div>

            {violationStep === "pair" && (
              <div className="grid grid-cols-4 gap-2">
                {pairs.map((pair) => (
                  <button
                    key={pair.id}
                    onClick={() => { setViolationPairId(pair.id); setViolationStep("type"); }}
                    className="flex min-h-[64px] flex-col items-center justify-center rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] p-2 text-[20px] font-black hover:border-amber-400 hover:bg-amber-50 active:scale-95 cursor-pointer transition-all"
                    aria-label={`Pár ${pair.startNumber}`}
                  >
                    <span>{pair.startNumber}</span>
                    {(pair.dancer1LastName || pair.dancer2LastName) && (
                      <span className="mt-0.5 w-full truncate text-center text-[7px] text-[var(--text-tertiary)]">
                        {[pair.dancer1LastName, pair.dancer2LastName].filter(Boolean).join("/")}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {violationStep === "type" && (
              <div className="space-y-2">
                {(["LIFTING", "FORBIDDEN_FIGURE", "UNSPORTING_BEHAVIOUR"] as PenaltyType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => { setViolationPenaltyType(type); setViolationStep("confirm"); }}
                    className="w-full rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] p-4 text-left font-semibold hover:border-amber-400 hover:bg-amber-50 active:scale-[0.98] cursor-pointer transition-all"
                    aria-label={type}
                  >
                    {type === "LIFTING" && (locale === "cs" ? "🏋️ Zvedání" : "🏋️ Lifting")}
                    {type === "FORBIDDEN_FIGURE" && (locale === "cs" ? "🚫 Zakázaná figura" : "🚫 Forbidden figure")}
                    {type === "UNSPORTING_BEHAVIOUR" && (locale === "cs" ? "😤 Nesportovní chování" : "😤 Unsporting behaviour")}
                  </button>
                ))}
                <button
                  onClick={() => setViolationStep("pair")}
                  className="w-full py-2 text-sm text-[var(--text-secondary)] cursor-pointer"
                >← {locale === "cs" ? "Zpět" : "Back"}</button>
              </div>
            )}

            {violationStep === "confirm" && (
              <div className="space-y-4">
                <p className="text-sm text-[var(--text-secondary)]">
                  {locale === "cs"
                    ? `Opravdu nahlásit porušení pro pár ${pairs.find((p) => p.id === violationPairId)?.startNumber}?`
                    : `Report violation for pair ${pairs.find((p) => p.id === violationPairId)?.startNumber}?`}
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setViolationStep("type")}>
                    {locale === "cs" ? "Zpět" : "Back"}
                  </Button>
                  <Button
                    className="flex-1 bg-amber-500 hover:bg-amber-600 font-bold"
                    disabled={violationReporting || !violationPenaltyType}
                    onClick={() => { if (violationPenaltyType) handleReportViolation(violationPenaltyType); }}
                  >
                    {violationReporting ? <Spinner /> : (locale === "cs" ? "Potvrdit hlášení" : "Confirm report")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
