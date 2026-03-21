"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { X, ChevronLeft, ChevronRight, Trophy, Medal } from "lucide-react";
import { scoringApi } from "@/lib/api/scoring";
import { sectionsApi } from "@/lib/api/sections";
import { pairsApi } from "@/lib/api/pairs";
import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/locale-context";

// Fullscreen dramatic result reveal — no AppShell, standalone dark mode page
export default function PresentationPage({
  params,
}: {
  params: Promise<{ id: string; sectionId: string }>;
}) {
  const { id: competitionId, sectionId } = use(params);
  const router = useRouter();
  const { t } = useLocale();

  // currentIndex: which result we're showing (0 = last place, increments to 1st)
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealing, setRevealing] = useState(false);

  const { data: section } = useQuery({
    queryKey: ["sections", competitionId, sectionId],
    queryFn: () => sectionsApi.get(competitionId, sectionId),
  });

  const { data: summary } = useQuery({
    queryKey: ["section-summary", sectionId],
    queryFn: () => scoringApi.getSectionSummary(sectionId),
  });

  const { data: pairs } = useQuery({
    queryKey: ["pairs", competitionId, sectionId],
    queryFn: () => pairsApi.list(competitionId, sectionId),
  });

  // Reverse the rankings so we reveal last→first
  const reversed = summary?.rankings
    ? [...summary.rankings].sort((a, b) => b.finalPlacement - a.finalPlacement)
    : [];

  const total = reversed.length;
  const current = reversed[currentIndex];
  const isFirst = current?.finalPlacement === 1;

  const pairName = (pairId: string) => {
    const pair = pairs?.find((p) => p.id === pairId);
    if (!pair) return null;
    return `${pair.dancer1FirstName} ${pair.dancer1LastName}${
      pair.dancer2FirstName ? ` & ${pair.dancer2FirstName} ${pair.dancer2LastName}` : ""
    }`;
  };

  const advance = useCallback(() => {
    if (currentIndex < total - 1) {
      setRevealing(true);
      setTimeout(() => setRevealing(false), 400);
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, total]);

  const back = useCallback(() => {
    if (currentIndex > 0) {
      setRevealing(true);
      setTimeout(() => setRevealing(false), 400);
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") advance();
      if (e.key === "ArrowLeft") back();
      if (e.key === "Escape") router.back();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [advance, back, router]);

  const placementColor = (placement: number) => {
    if (placement === 1) return "text-yellow-400";
    if (placement === 2) return "text-slate-300";
    if (placement === 3) return "text-amber-600";
    return "text-white/60";
  };

  const PlacementIcon = ({ placement }: { placement: number }) => {
    if (placement === 1) return <Trophy className="h-10 w-10 text-yellow-400" />;
    if (placement === 2) return <Medal className="h-8 w-8 text-slate-300" />;
    if (placement === 3) return <Medal className="h-8 w-8 text-amber-600" />;
    return null;
  };

  return (
    <div
      className="relative min-h-screen select-none overflow-hidden bg-[#080808]"
      onClick={advance}
    >
      {/* Background radial for 1st place */}
      {isFirst && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[600px] w-[600px] rounded-full bg-yellow-400/10 blur-[120px]" />
        </div>
      )}

      {/* Header bar */}
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-8 py-5">
        <div>
          <p className="text-xs font-semibold tracking-widest text-white/30 uppercase">
            {section?.name}
          </p>
          <p className="text-xs text-white/20">
            {section?.ageCategory} · {section?.level}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {total > 0 && (
            <p className="text-xs text-white/30">
              {currentIndex + 1} / {total}
            </p>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); router.back(); }}
            className="rounded p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Exit presentation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex min-h-screen flex-col items-center justify-center px-8 text-center">
        {!summary || total === 0 ? (
          <div className="flex flex-col items-center gap-4">
            <Trophy className="h-16 w-16 text-white/10" />
            <p className="text-xl text-white/30">{t("results.noSummary")}</p>
            <p className="text-sm text-white/20">
              {t("results.noSummaryDesc")}
            </p>
          </div>
        ) : current ? (
          <div
            className={cn(
              "transition-all duration-300",
              revealing ? "opacity-0 scale-95" : "opacity-100 scale-100"
            )}
          >
            {/* Place number */}
            <div className={cn("mb-4 text-[120px] font-black leading-none", placementColor(current.finalPlacement))}>
              {current.finalPlacement}
            </div>

            {/* Place icon (medals for top 3) */}
            <div className="mb-6 flex justify-center">
              <PlacementIcon placement={current.finalPlacement} />
            </div>

            {/* Start number */}
            <div className="mb-4 inline-flex items-center justify-center rounded-2xl bg-white/10 px-8 py-3">
              <span className="text-5xl font-black text-white">#{current.startNumber}</span>
            </div>

            {/* Pair name */}
            {pairName(current.pairId) && (
              <p className="mt-4 text-2xl font-semibold text-white/80">
                {pairName(current.pairId)}
              </p>
            )}

            {/* Sum detail (subtle) */}
            <p className="mt-3 text-sm text-white/20">
              {t("results.totalSumOf")} {current.totalSum}
            </p>

            {/* 1st place special message */}
            {isFirst && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-400" />
                <p className="text-lg font-bold tracking-wide text-yellow-400">
                  {t("results.champion")}
                </p>
                <Trophy className="h-5 w-5 text-yellow-400" />
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Navigation buttons */}
      <div className="absolute bottom-8 left-0 right-0 z-10 flex items-center justify-center gap-4">
        <button
          onClick={(e) => { e.stopPropagation(); back(); }}
          disabled={currentIndex === 0}
          className="rounded-xl bg-white/5 p-3 text-white/40 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-20"
          aria-label="Previous"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <p className="text-xs text-white/20">
          {total > 0 ? t("results.presentNavHint") : ""}
        </p>
        <button
          onClick={(e) => { e.stopPropagation(); advance(); }}
          disabled={currentIndex === total - 1}
          className="rounded-xl bg-white/5 p-3 text-white/40 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-20"
          aria-label="Next"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
