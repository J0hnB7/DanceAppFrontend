"use client";

import { use, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useOnline } from "@/hooks/use-online";
import { CheckSquare, Send, Trophy, Wifi, WifiOff, CloudOff, AlertTriangle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import apiClient from "@/lib/api-client";
import type { PairDto } from "@/lib/api/pairs";
import type { RoundDto } from "@/lib/api/rounds";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { t, detectLocale, type Locale } from "@/lib/i18n/translations";

interface JudgeSession {
  judgeTokenId: string;
  judgeNumber: number;
  competitionId: string;
  competitionName: string;
}

interface DanceDto {
  id: string;
  name: string;
}

interface ActiveRoundResponse {
  round: RoundDto & { dances?: DanceDto[] };
  pairs: PairDto[];
}

// ── Offline localStorage draft ────────────────────────────────────────────────
function draftKey(token: string) { return `judge_draft_${token}`; }

interface Draft {
  roundId: string;
  selected: string[];
  placements: Record<string, Record<string, number>>;
  savedAt: string;
}

function saveDraft(token: string, roundId: string, selected: Set<string>, placements: Record<string, Record<string, number>>) {
  try {
    const draft: Draft = { roundId, selected: Array.from(selected), placements, savedAt: new Date().toISOString() };
    localStorage.setItem(draftKey(token), JSON.stringify(draft));
  } catch { /* quota exceeded */ }
}

function loadDraft(token: string, roundId: string): Draft | null {
  try {
    const raw = localStorage.getItem(draftKey(token));
    if (!raw) return null;
    const draft: Draft = JSON.parse(raw);
    return draft.roundId === roundId ? draft : null;
  } catch { return null; }
}

function clearDraft(token: string) {
  try { localStorage.removeItem(draftKey(token)); } catch { /* ignore */ }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function JudgeTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [locale] = useState<Locale>(() => detectLocale());

  // PIN login state
  const [needsPin, setNeedsPin] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSubmitting, setPinSubmitting] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [session, setSession] = useState<JudgeSession | null>(null);
  const [activeRound, setActiveRound] = useState<(RoundDto & { dances?: DanceDto[] }) | null>(null);
  const [pairs, setPairs] = useState<PairDto[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [placements, setPlacements] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const isOnline = useOnline();
  const [hasDraft, setHasDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-save draft — debounced to avoid hammering localStorage on every tap
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistDraft = useCallback((roundId: string, sel: Set<string>, pl: Record<string, Record<string, number>>) => {
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      saveDraft(token, roundId, sel, pl);
    }, 500);
  }, [token]);

  // Step 1: Validate QR token, check if PIN needed
  useEffect(() => {
    if (!token) return;
    // Check if already authenticated (deviceToken in localStorage)
    const existingDevice = localStorage.getItem("judge_device_token");
    const existingCompetition = localStorage.getItem("judge_competition_id");

    apiClient
      .post<JudgeSession>("/judge-tokens/validate", { token })
      .then((r) => {
        setSession(r.data);
        setSessionId(r.data.judgeTokenId);

        // If no device token stored, require PIN login
        if (!existingDevice || !existingCompetition) {
          setNeedsPin(true);
          setLoading(false);
          return;
        }

        // Already logged in — load round data
        return apiClient.get<ActiveRoundResponse>("/judge/active-round", { params: { competitionId: r.data.competitionId } })
          .then((r2) => {
            const round = r2.data.round;
            const roundPairs = r2.data.pairs;
            setActiveRound(round);
            setPairs(roundPairs);
            const draft = loadDraft(token, round.id);
            if (draft) {
              setSelected(new Set(draft.selected));
              setPlacements(draft.placements);
              setHasDraft(true);
            }
          })
          .catch((e) => {
            if (e?.status === 404) return;
            setError(e?.message ?? "No active round");
          })
          .finally(() => setLoading(false));
      })
      .catch((e) => {
        setError(e?.message ?? "Invalid or expired judge token");
        setLoading(false);
      });
  }, [token]);

  const handlePinSubmit = async () => {
    if (!sessionId || pin.length < 4) return;
    setPinSubmitting(true);
    setPinError(null);
    try {
      const res = await apiClient.post("/judge-access/connect", { token, pin });
      const { accessToken, adjudicatorId, competitionId, competitionName, deviceToken } = res.data;
      localStorage.setItem("judge_access_token", accessToken);
      localStorage.setItem("judge_device_token", deviceToken);
      localStorage.setItem("judge_competition_id", competitionId);
      localStorage.setItem("judge_adjudicator_id", adjudicatorId);

      setSession({ judgeTokenId: adjudicatorId, judgeNumber: session?.judgeNumber ?? 0, competitionId, competitionName });
      setNeedsPin(false);
      // Redirect to lobby
      router.push(`/judge/${token}/lobby`);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 423) {
        setPinError(t("judge.pin_locked", locale));
      } else {
        setPinError(t("judge.pin_wrong", locale));
      }
    } finally {
      setPinSubmitting(false);
    }
  };

  const togglePair = (pairId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pairId)) { next.delete(pairId); } else { next.add(pairId); }
      if (activeRound) persistDraft(activeRound.id, next, placements);
      return next;
    });
  };

  const setPlacement = (danceId: string, pairId: string, placement: number) => {
    setPlacements((prev) => {
      const next = { ...prev, [danceId]: { ...prev[danceId], [pairId]: placement } };
      if (activeRound) persistDraft(activeRound.id, selected, next);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!activeRound || !session) return;
    if (!isOnline) {
      toast({ title: t("judge.offline_warning", locale), variant: "destructive" } as Parameters<typeof toast>[0]);
      return;
    }
    setSubmitting(true);
    try {
      if (activeRound.roundType === "PRELIMINARY") {
        await apiClient.post(`/rounds/${activeRound.id}/callbacks`, {
          selectedPairIds: Array.from(selected),
        });
      } else {
        await Promise.all(
          Object.entries(placements).map(([danceId, pairPlacements]) =>
            apiClient.post(`/rounds/${activeRound.id}/placements/${danceId}`, { pairPlacements })
          )
        );
      }
      clearDraft(token);
      setHasDraft(false);
      setSubmitted(true);
      toast({ title: t("judge.submitted", locale), variant: "success" } as Parameters<typeof toast>[0]);
    } catch {
      toast({ title: t("judge.submit_failed", locale), variant: "destructive" } as Parameters<typeof toast>[0]);
    } finally {
      setSubmitting(false);
    }
  };

  // ── PIN prompt ───────────────────────────────────────────────────────────────
  if (needsPin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 bg-[var(--background)]">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)]/10">
          <Lock className="h-8 w-8 text-[var(--accent)]" />
        </div>
        <div className="text-center">
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">{t("judge.pin_prompt", locale)}</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{session?.competitionName}</p>
        </div>

        <div className="w-full max-w-xs space-y-4">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
            placeholder="• • • •"
            className="w-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-center text-2xl font-bold tracking-[0.4em] text-[var(--text-primary)] outline-none focus:border-[var(--accent)] transition-colors"
          />

          {pinError && (
            <p className="text-center text-sm font-medium text-[var(--destructive)]">{pinError}</p>
          )}

          <Button
            className="w-full"
            size="lg"
            loading={pinSubmitting}
            disabled={pin.length < 4 || pinSubmitting}
            onClick={handlePinSubmit}
          >
            {pinSubmitting ? t("judge.connecting", locale) : t("judge.login_button", locale)}
          </Button>
        </div>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--destructive)]/10">
          <AlertTriangle className="h-8 w-8 text-[var(--destructive)]" />
        </div>
        <h1 className="text-lg font-semibold">{t("judge.access_denied", locale)}</h1>
        <p className="max-w-xs text-sm text-[var(--text-secondary)]">{error}</p>
      </div>
    );
  }

  // ── Waiting for round ─────────────────────────────────────────────────────
  if (!activeRound || !session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)]/10">
          <Trophy className="h-8 w-8 text-[var(--accent)]" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">{t("judge.waiting_title", locale)}</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {t("judge.label", locale)} <strong>{session?.judgeNumber}</strong>. {t("judge.waiting_body", locale)}
          </p>
        </div>
        <Spinner />
      </div>
    );
  }

  const dances = activeRound.dances ?? [];
  const isComplete = activeRound.roundType === "PRELIMINARY"
    ? selected.size > 0
    : dances.every((d) => {
        const dp = placements[d.id] ?? {};
        return pairs.every((p) => dp[p.id] !== undefined);
      });

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div>
            <p className="text-xs text-[var(--text-tertiary)]">{session.competitionName}</p>
            <h1 className="text-sm font-semibold text-[var(--text-primary)]">
              {t("judge.label", locale)} {session.judgeNumber}
              <span className="ml-2 text-[var(--text-secondary)]">
                — {activeRound.roundType === "PRELIMINARY" ? t("round.preliminary", locale) : t("round.final", locale)} · {t("round.label", locale)} {activeRound.roundNumber}
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {!isOnline && (
              <div className="flex items-center gap-1 rounded-full bg-[var(--warning)]/10 px-2 py-1 text-xs font-medium text-[var(--warning)]">
                <CloudOff className="h-3 w-3" />
                {t("judge.offline_badge", locale)}
              </div>
            )}
            {isOnline ? (
              <Wifi className="h-4 w-4 text-[var(--success)]" />
            ) : (
              <WifiOff className="h-4 w-4 text-[var(--warning)]" />
            )}
            {activeRound.roundType === "PRELIMINARY" && (
              <Badge variant="secondary">{selected.size} {t("judge.selected_count", locale)}</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Offline/draft banner */}
      {hasDraft && !submitted && (
        <div className="border-b border-[var(--warning)]/20 bg-[var(--warning)]/5 px-4 py-2 text-center text-xs text-[var(--warning)]">
          {t("judge.draft_restored", locale)}
        </div>
      )}

      {/* Pairs count info */}
      {pairs.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center px-4">
          <AlertTriangle className="h-10 w-10 text-[var(--warning)]" />
          <p className="font-medium text-[var(--text-primary)]">{t("judge.no_pairs", locale)}</p>
          <p className="text-sm text-[var(--text-secondary)]">{t("judge.no_pairs_body", locale)}</p>
        </div>
      ) : (
        /* Content */
        <div className="mx-auto max-w-lg p-4 pb-32">
          {submitted ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success)]/10">
                <CheckSquare className="h-8 w-8 text-[var(--success)]" />
              </div>
              <h2 className="text-lg font-semibold">{t("judge.done_title", locale)}</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                {t("judge.done_body", locale)}
              </p>
            </div>
          ) : activeRound.roundType === "PRELIMINARY" ? (
            <PreliminaryScoring
              pairs={pairs}
              selected={selected}
              onToggle={togglePair}
              pairsToAdvance={activeRound.pairsToAdvance}
              locale={locale}
            />
          ) : (
            <FinalScoring
              pairs={pairs}
              dances={dances}
              placements={placements}
              onSetPlacement={setPlacement}
              locale={locale}
            />
          )}
        </div>
      )}

      {/* Submit bar */}
      {!submitted && pairs.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <div className="mx-auto max-w-lg">
            {!isOnline && (
              <p className="mb-2 text-center text-xs text-[var(--warning)]">
                {t("judge.offline_bottom", locale)}
              </p>
            )}
            <Button
              className="w-full"
              size="lg"
              onClick={handleSubmit}
              loading={submitting}
              disabled={!isComplete}
            >
              <Send className="h-5 w-5" />
              {isOnline ? t("judge.submit_online", locale) : t("judge.submit_offline", locale)}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Preliminary scoring ───────────────────────────────────────────────────────
function PreliminaryScoring({
  pairs, selected, onToggle, pairsToAdvance, locale,
}: {
  pairs: PairDto[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  pairsToAdvance?: number | null;
  locale: Locale;
}) {
  return (
    <div>
      <p className="mb-4 text-sm text-[var(--text-secondary)]">
        {t("prelim.instruction", locale)}
        {pairsToAdvance && (
          <span className="ml-1 font-medium text-[var(--accent)]">
            {t("prelim.recommended", locale)} {pairsToAdvance} {t("prelim.recommended_pairs", locale)}
          </span>
        )}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {pairs.map((pair) => {
          const isSelected = selected.has(pair.id);
          return (
            <button
              key={pair.id}
              onClick={() => onToggle(pair.id)}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-lg)] border p-4 text-left transition-all active:scale-[0.98]",
                isSelected
                  ? "border-[var(--accent)] bg-[var(--accent)]/5 shadow-sm"
                  : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-secondary)]"
              )}
            >
              <div className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors",
                isSelected ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-secondary)] text-[var(--text-secondary)]"
              )}>
                {pair.startNumber}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                  {pair.dancer1FirstName} {pair.dancer1LastName}
                </p>
                {pair.dancer2FirstName && (
                  <p className="truncate text-xs text-[var(--text-secondary)]">
                    {pair.dancer2FirstName} {pair.dancer2LastName}
                  </p>
                )}
                {pair.dancer1Club && (
                  <p className="truncate text-xs text-[var(--text-tertiary)]">{pair.dancer1Club}</p>
                )}
              </div>
              {isSelected && (
                <CheckSquare className="ml-auto h-5 w-5 shrink-0 text-[var(--accent)]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Final scoring ─────────────────────────────────────────────────────────────
function FinalScoring({
  pairs, dances, placements, onSetPlacement, locale,
}: {
  pairs: PairDto[];
  dances: DanceDto[];
  placements: Record<string, Record<string, number>>;
  onSetPlacement: (danceId: string, pairId: string, placement: number) => void;
  locale: Locale;
}) {
  const [activeDanceIdx, setActiveDanceIdx] = useState(0);
  const activeDances = dances;
  const dance = activeDances[activeDanceIdx];
  const dancePlacements = placements[dance.id] ?? {};
  const usedPlacements = new Set(Object.values(dancePlacements));

  return (
    <div>
      {/* Dance tabs */}
      {activeDances.length > 1 && (
        <div className="mb-4 flex gap-1 overflow-x-auto pb-1">
          {activeDances.map((d, i) => {
            const done = pairs.every((p) => (placements[d.id] ?? {})[p.id] !== undefined);
            return (
              <button
                key={d.id}
                onClick={() => setActiveDanceIdx(i)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  i === activeDanceIdx
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border)]"
                )}
              >
                {d.name}
                {done && <span className="text-[10px]">✓</span>}
              </button>
            );
          })}
        </div>
      )}

      <p className="mb-3 text-sm text-[var(--text-secondary)]">
        {t("final.instruction", locale)}
      </p>

      <div className="flex flex-col gap-2">
        {pairs.map((pair) => (
          <Card key={pair.id} className="overflow-hidden">
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-sm font-bold text-[var(--text-secondary)]">
                {pair.startNumber}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {pair.dancer1FirstName} {pair.dancer1LastName}
                </p>
                {pair.dancer2FirstName && (
                  <p className="truncate text-xs text-[var(--text-tertiary)]">
                    {pair.dancer2FirstName} {pair.dancer2LastName}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-1">
                {Array.from({ length: pairs.length }, (_, i) => i + 1).map((p) => {
                  const isSelected = dancePlacements[pair.id] === p;
                  const isUsed = usedPlacements.has(p) && !isSelected;
                  return (
                    <button
                      key={p}
                      onClick={() => onSetPlacement(dance.id, pair.id, p)}
                      disabled={isUsed}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] text-sm font-semibold transition-all",
                        isSelected
                          ? "bg-[var(--accent)] text-white shadow-sm"
                          : isUsed
                          ? "cursor-not-allowed bg-[var(--surface-secondary)] text-[var(--text-tertiary)] opacity-30"
                          : "bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border)]"
                      )}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
