"use client";

import { use, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import apiClient from "@/lib/api-client";
import type { PairDto } from "@/lib/api/pairs";
import type { DanceDto } from "@/lib/api/sections";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { t, detectLocale, type Locale } from "@/lib/i18n/translations";

interface FinalRoundSession {
  judgeTokenId: string;
  judgeNumber: number;
  roundId: string;
  competitionName: string;
  pairs: PairDto[];
  dances: DanceDto[];
}

// Drag-and-drop placement grid for one dance
function DancePlacementGrid({
  pairs,
  placements,
  onSet,
}: {
  pairs: PairDto[];
  placements: Record<string, number>;
  onSet: (pairId: string, placement: number) => void;
}) {
  const assigned = new Set(Object.values(placements));
  const maxPlacement = pairs.length;

  return (
    <div className="flex flex-col gap-2">
      {pairs.map((pair) => {
        const current = placements[pair.id];
        return (
          <div
            key={pair.id}
            className={cn(
              "flex items-center gap-3 rounded-[var(--radius-lg)] border p-3 transition-all",
              current
                ? "border-[var(--accent)]/30 bg-[var(--accent)]/5"
                : "border-[var(--border)] bg-[var(--surface)]"
            )}
          >
            {/* Start number */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-sm font-bold text-[var(--text-secondary)]">
              {pair.startNumber}
            </div>

            {/* Name */}
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

            {/* Placement buttons */}
            <div className="flex shrink-0 flex-wrap justify-end gap-1">
              {Array.from({ length: maxPlacement }, (_, i) => i + 1).map((p) => {
                const isSelected = current === p;
                const isUsed = assigned.has(p) && !isSelected;
                return (
                  <button
                    key={p}
                    onClick={() => onSet(pair.id, p)}
                    disabled={isUsed}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] text-sm font-semibold transition-all active:scale-95",
                      isSelected
                        ? "bg-[var(--accent)] text-white shadow-sm"
                        : isUsed
                        ? "cursor-not-allowed bg-[var(--surface-secondary)] text-[var(--text-tertiary)] opacity-30"
                        : "bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function JudgeFinalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [locale] = useState<Locale>(() => detectLocale());

  const [session, setSession] = useState<FinalRoundSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDanceIndex, setActiveDanceIndex] = useState(0);
  const [placements, setPlacements] = useState<Record<string, Record<string, number>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!token) return;
    apiClient
      .post<FinalRoundSession>("/judge/final-session", { token })
      .then((r) => setSession(r.data))
      .catch((e) => setError(e?.message ?? "Invalid token"))
      .finally(() => setLoading(false));
  }, [token]);

  const setPlacement = (danceId: string, pairId: string, placement: number) => {
    setPlacements((prev) => ({
      ...prev,
      [danceId]: { ...prev[danceId], [pairId]: placement },
    }));
  };

  const submitDance = async (danceId: string) => {
    if (!session) return;
    const dancePlacements = placements[danceId] ?? {};
    if (Object.keys(dancePlacements).length < session.pairs.length) {
      toast({ title: t("final.assign_all", locale), variant: "destructive" } as Parameters<typeof toast>[0]);
      return;
    }
    // Clear any prior error before each submission attempt
    setError(null);
    setSubmitting(true);
    try {
      await apiClient.post(`/rounds/${session.roundId}/placements/${danceId}`, {
        pairPlacements: dancePlacements,
      });
      setSubmitted((prev) => new Set([...prev, danceId]));
      toast({ title: t("final.dance_submitted", locale), variant: "success" } as Parameters<typeof toast>[0]);
      // Auto-advance to next dance
      if (activeDanceIndex < (session.dances.length - 1)) {
        setActiveDanceIndex((i) => i + 1);
      }
    } catch {
      toast({ title: t("final.submit_failed", locale), variant: "destructive" } as Parameters<typeof toast>[0]);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
        <AlertCircle className="h-10 w-10 text-[var(--destructive)]" />
        <p className="font-medium">{error ?? "Session not found"}</p>
      </div>
    );
  }

  const allSubmitted = session.dances.every((d) => submitted.has(d.id ?? ""));
  const activeDance = session.dances[activeDanceIndex];
  const activePlacements = placements[activeDance?.id ?? ""] ?? {};
  const allPlaced = activeDance
    ? Object.keys(activePlacements).length === session.pairs.length
    : false;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--text-tertiary)]">{session.competitionName}</p>
            <h1 className="text-sm font-semibold">{t("judge.label", locale)} {session.judgeNumber} — {t("final.header", locale)}</h1>
          </div>
          <div className="flex items-center gap-2">
            {session.dances.map((dance, i) => (
              <button
                key={dance.id}
                onClick={() => setActiveDanceIndex(i)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all",
                  submitted.has(dance.id ?? "")
                    ? "bg-[var(--success)] text-white"
                    : i === activeDanceIndex
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--surface-secondary)] text-[var(--text-secondary)]"
                )}
              >
                {submitted.has(dance.id ?? "") ? "✓" : i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      {allSubmitted ? (
        <div className="flex flex-col items-center gap-4 py-24 text-center px-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success)]/10">
            <CheckCircle2 className="h-8 w-8 text-[var(--success)]" />
          </div>
          <h2 className="text-lg font-semibold">{t("final.all_done_title", locale)}</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            {t("final.all_done_body_a", locale)} {session.dances.length} {t("final.all_done_body_b", locale)}
          </p>
        </div>
      ) : (
        <div className="p-4 pb-28">
          {/* Dance nav */}
          <div className="mb-4 flex items-center justify-between">
            <div>
              <Badge variant={submitted.has(activeDance?.id ?? "") ? "success" : "secondary"}>
                {submitted.has(activeDance?.id ?? "") ? t("final.status_submitted", locale) : t("final.status_in_progress", locale)}
              </Badge>
              <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                {activeDance?.name}
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                {t("final.assign_placements", locale, { n: session.pairs.length })}
              </p>
            </div>
          </div>

          {activeDance && !submitted.has(activeDance.id ?? "") && (
            <DancePlacementGrid
              pairs={session.pairs}
              placements={activePlacements}
              onSet={(pairId, placement) => setPlacement(activeDance.id ?? "", pairId, placement)}
            />
          )}

          {activeDance && submitted.has(activeDance.id ?? "") && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <CheckCircle2 className="h-10 w-10 text-[var(--success)]" />
              <p className="font-medium">{t("final.submitted_for", locale)} {activeDance.name}</p>
              <p className="text-sm text-[var(--text-secondary)]">
                {t("final.dance_done_review", locale)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Bottom bar */}
      {!allSubmitted && activeDance && !submitted.has(activeDance.id ?? "") && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              disabled={activeDanceIndex === 0}
              onClick={() => setActiveDanceIndex((i) => i - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              className="flex-1"
              size="lg"
              loading={submitting}
              disabled={!allPlaced}
              onClick={() => submitDance(activeDance.id ?? "")}
            >
              <Send className="h-5 w-5" />
              {t("final.submit_dance", locale)} {activeDance.name}
              {!allPlaced && (
                <span className="ml-1 text-xs opacity-70">
                  ({Object.keys(activePlacements).length}/{session.pairs.length})
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={activeDanceIndex === session.dances.length - 1}
              onClick={() => setActiveDanceIndex((i) => i + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
