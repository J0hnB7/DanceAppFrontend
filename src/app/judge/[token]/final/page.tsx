"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, AlertTriangle, Wifi, WifiOff, CloudOff, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import apiClient from "@/lib/api-client";
import { useOnline } from "@/hooks/use-online";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

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
}

interface FinalRoundSession {
  judgeTokenId: string;
  judgeNumber: number;
  roundId: string;
  competitionName: string;
  pairs: PairDto[];
  dances: DanceDto[];
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
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {pair.dancer1FirstName
            ? `${pair.dancer1FirstName} ${pair.dancer1LastName}`
            : `Pár ${pair.startNumber}`}
        </p>
        {pair.dancer2FirstName && (
          <p className="truncate text-xs text-[var(--text-secondary)]">
            {pair.dancer2FirstName} {pair.dancer2LastName}
          </p>
        )}
      </div>

      {/* Placement buttons */}
      <div className="flex shrink-0 items-center gap-1.5">
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
  const isOnline = useOnline();

  const [session, setSession] = useState<FinalRoundSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDanceIdx, setActiveDanceIdx] = useState(0);
  // danceId → { pairId → placement }
  const [placements, setPlacements] = useState<Record<string, Record<string, number>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );
  const toggleTheme = () => {
    const dark = !isDark;
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  };

  const adjudicatorId = typeof window !== "undefined" ? localStorage.getItem("judge_adjudicator_id") : null;

  useEffect(() => {
    if (!token) return;
    const competitionId = localStorage.getItem("judge_competition_id");
    if (!competitionId) { router.push(`/judge/${token}`); return; }

    // Try active-round first (may be FINAL type), fallback to final-session
    apiClient
      .get("/judge/active-round", { params: { competitionId } })
      .then((r) => {
        const data = r.data;
        setSession({
          judgeTokenId: adjudicatorId ?? "",
          judgeNumber: 0,
          roundId: data.round.id,
          competitionName: "",
          pairs: data.pairs,
          dances: data.dances ?? [],
        });
      })
      .catch(() => {
        apiClient
          .post<FinalRoundSession>("/judge/final-session", { token })
          .then((r) => setSession(r.data))
          .catch((e) => setError(e?.message ?? "Invalid token"));
      })
      .finally(() => setLoading(false));
  }, [token, adjudicatorId, router]);

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
    if (!session) return;
    const dancePlacements = placements[danceId] ?? {};
    const placed = Object.keys(dancePlacements).length;
    if (placed < session.pairs.length) {
      toast({ title: `Přiřaď všechna umístění (${placed}/${session.pairs.length})`, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(`/rounds/${session.roundId}/placements/${danceId}`, {
        pairPlacements: dancePlacements,
      });
      setSubmitted((prev) => new Set([...prev, danceId]));
      toast({ title: "Hodnocení odesláno", variant: "success" });
      if (activeDanceIdx < session.dances.length - 1) {
        setActiveDanceIdx((i) => i + 1);
      }
    } catch {
      toast({ title: "Odeslání selhalo", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner size="lg" /></div>;
  if (error || !session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
        <AlertCircle className="h-10 w-10 text-[var(--destructive)]" />
        <p className="font-medium">{error ?? "Session nenalezena"}</p>
      </div>
    );
  }

  const activeDance = session.dances[activeDanceIdx];
  const activeDanceId = activeDance?.id ?? "";
  const activePlacements = placements[activeDanceId] ?? {};
  const placedCount = Object.keys(activePlacements).length;
  const allPlaced = placedCount === session.pairs.length;
  const allSubmitted = session.dances.every((d) => submitted.has(d.id ?? ""));
  const isDoneThisDance = submitted.has(activeDanceId);

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
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">Finále</p>
              <h1 className="text-sm font-semibold text-[var(--text-primary)]">
                {activeDance?.name ?? "—"}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-[var(--success)]" aria-hidden="true" />
              ) : (
                <WifiOff className="h-4 w-4 text-[var(--warning)]" aria-hidden="true" />
              )}
              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-[var(--surface-secondary)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </button>
              {/* Dance dots */}
              <div className="flex gap-1">
                {session.dances.map((d, i) => {
                  const done = submitted.has(d.id ?? "");
                  return (
                    <button
                      key={d.id}
                      onClick={() => setActiveDanceIdx(i)}
                      aria-label={`${d.name}${done ? " (submitted)" : i === activeDanceIdx ? " (active)" : ""}`}
                      aria-pressed={i === activeDanceIdx}
                      className={cn(
                        "flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-[10px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                        done
                          ? "bg-green-600 text-white"
                          : i === activeDanceIdx
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--surface-secondary)] text-[var(--text-secondary)]"
                      )}
                    >
                      {done ? "✓" : i + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      {allSubmitted ? (
        <div className="flex flex-col items-center gap-4 py-24 text-center px-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Hodnocení dokončeno</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Všechny {session.dances.length} tance ohodnoceny
          </p>
        </div>
      ) : (
        <div className="mx-auto max-w-lg p-4 pb-32 space-y-4">
          {/* Instruction */}
          {!isDoneThisDance && (
            <div>
              <p className="text-base font-semibold text-[var(--text-primary)]">Finále</p>
              <p className="text-sm text-[var(--text-secondary)]">
                Přiřaď umístění (1 – {session.pairs.length})
              </p>
            </div>
          )}

          {/* Not all placed warning */}
          {!isDoneThisDance && !allPlaced && placedCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/10 px-3 py-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--warning)]" />
              <p className="text-xs text-[var(--warning)]">
                Přiřaď všechna umístění
                <span className="ml-1 font-bold tabular-nums">
                  {Array.from({ length: session.pairs.length }, (_, i) => i + 1)
                    .filter((p) => !Object.values(activePlacements).includes(p))
                    .join(" ")}
                </span>
              </p>
            </div>
          )}

          {/* Placement grid */}
          {isDoneThisDance ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <p className="font-medium text-[var(--text-primary)]">
                {activeDance?.name} odesláno
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                Přejdi na další tanec
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {session.pairs.map((pair) => (
                <PlacementRow
                  key={pair.id}
                  pair={pair}
                  placements={activePlacements}
                  maxPlacement={session.pairs.length}
                  onSet={(pairId, placement) => setPlacement(activeDanceId, pairId, placement)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom bar */}
      {!allSubmitted && !isDoneThisDance && activeDance && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.1)]">
          <div className="mx-auto flex max-w-lg gap-3">
            <Button
              variant="outline"
              size="lg"
              className="shrink-0 px-5"
              onClick={() => clearDance(activeDanceId)}
            >
              Smazat
            </Button>
            <Button
              className={cn("flex-1 font-semibold", allPlaced ? "bg-[var(--accent)]" : "bg-[var(--accent)]/60")}
              size="lg"
              loading={submitting}
              disabled={!allPlaced}
              onClick={() => submitDance(activeDanceId)}
            >
              {allPlaced
                ? "Odeslat"
                : `${placedCount} / ${session.pairs.length} přiřazeno`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
