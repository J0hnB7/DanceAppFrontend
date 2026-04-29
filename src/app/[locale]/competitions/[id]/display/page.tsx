"use client";

/**
 * Public kiosk / display page for a competition.
 * Shows the current heat, pairs on floor, and judge submission progress.
 * No authentication required. Dark, projection-friendly design.
 * Route: /competitions/[id]/display
 */

import { use, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLiveStore } from "@/store/live-store";
import { useShallow } from "zustand/react/shallow";
import { competitionsApi } from "@/lib/api/competitions";
import { useSSE } from "@/hooks/use-sse";
import { useLocale } from "@/contexts/locale-context";

export default function CompetitionDisplayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t } = useLocale();

  // MED-23: kiosk display previously rendered a black screen until SSE arrived,
  // indistinguishable from "BE down" or "competition not found". Now an
  // explicit "loading" state covers the cold cache, and a visible error
  // banner surfaces when the BE call fails — important on a TV that nobody
  // is interactively retrying.
  const { data: competition, isLoading, isError } = useQuery({
    queryKey: ["competitions", "detail", id],
    queryFn: () => competitionsApi.get(id),
  });

  const {
    selectedRoundId,
    selectedDanceId,
    selectedHeatId,
    judgeStatuses,
    heatResults,
    updateJudgeStatus,
    hydrateFromServer,
  } = useLiveStore(
    useShallow((s) => ({
      selectedRoundId: s.selectedRoundId,
      selectedDanceId: s.selectedDanceId,
      selectedHeatId: s.selectedHeatId,
      judgeStatuses: s.judgeStatuses,
      heatResults: s.heatResults,
      updateJudgeStatus: s.updateJudgeStatus,
      hydrateFromServer: s.hydrateFromServer,
    })),
  );

  // Hydrate when heat is set
  useEffect(() => {
    if (selectedHeatId) {
      hydrateFromServer(id, selectedHeatId)
    }
  }, [id, selectedHeatId, hydrateFromServer])

  // Real-time judge status updates
  useSSE(
    id,
    "judge:status-changed",
    (data: { judgeId: string; status: string }) => {
      updateJudgeStatus(
        data.judgeId,
        data.status as Parameters<typeof updateJudgeStatus>[1]
      );
    }
  );

  const submittedCount = Object.values(judgeStatuses).filter(
    (s) => s === "submitted"
  ).length;
  const totalJudges = Object.keys(judgeStatuses).length;

  if (isLoading) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center"
        style={{ background: "#000", color: "rgba(255,255,255,.4)", fontFamily: "var(--font-sora)" }}
      >
        <p className="text-2xl font-bold">{t("display.loading") ?? "Loading…"}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-3"
        style={{ background: "#000", color: "#ff6b6b", fontFamily: "var(--font-sora)" }}
      >
        <p className="text-2xl font-bold">{t("display.errorTitle") ?? "Connection error"}</p>
        <p className="text-sm" style={{ color: "rgba(255,255,255,.4)" }}>
          {t("display.errorDesc") ?? "Cannot reach server. Will reconnect automatically."}
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center"
      style={{ background: "#000", color: "#fff" }}
    >
      {/* Competition name */}
      <div
        className="absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold uppercase tracking-widest"
        style={{ color: "rgba(255,255,255,.3)", fontFamily: "var(--font-sora)" }}
      >
        {competition?.name ?? "—"}
      </div>

      {selectedHeatId ? (
        <>
          {/* Round · Dance labels */}
          <div
            className="mb-6 text-center text-lg font-bold tracking-wide"
            style={{ color: "rgba(255,255,255,.5)", fontFamily: "var(--font-sora)" }}
          >
            {selectedRoundId ?? "—"} · {selectedDanceId ?? "—"}
          </div>

          {/* Heat results or pairs */}
          {heatResults && heatResults.length > 0 ? (
            <div className="flex max-w-2xl flex-wrap justify-center gap-3">
              {heatResults.map((r) => (
                <div
                  key={r.pairId}
                  className="flex flex-col items-center rounded-2xl border px-6 py-4"
                  style={{
                    borderColor: r.advances
                      ? "rgba(48,209,88,.4)"
                      : "rgba(255,59,48,.3)",
                    background: r.advances
                      ? "rgba(48,209,88,.08)"
                      : "rgba(255,59,48,.06)",
                  }}
                >
                  <span
                    className="text-4xl font-extrabold"
                    style={{ fontFamily: "var(--font-sora)", color: "#fff" }}
                  >
                    {r.pairNumber}
                  </span>
                  <span
                    className="mt-1 text-xs font-bold"
                    style={{
                      color: r.advances ? "var(--success)" : "var(--destructive)",
                    }}
                  >
                    {r.votes}/{r.totalJudges} ·{" "}
                    {r.advances ? t("display.advances") : t("display.eliminated")}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="mb-3 text-[80px] font-extrabold leading-none"
              style={{ fontFamily: "var(--font-sora)" }}
            >
              {t("display.ongoing")}
            </div>
          )}

          {/* Judge progress */}
          {totalJudges > 0 && (
            <div className="mt-10 flex flex-col items-center gap-2">
              <div
                className="text-sm"
                style={{ color: "rgba(255,255,255,.4)" }}
              >
                {t("display.judges")}
              </div>
              <div className="flex gap-2">
                {Object.entries(judgeStatuses).map(([judgeId, status]) => (
                  <div
                    key={judgeId}
                    className="h-3 w-3 rounded-full"
                    style={{
                      background:
                        status === "submitted"
                          ? "var(--success)"
                          : status === "scoring"
                            ? "var(--warning)"
                            : status === "offline"
                              ? "var(--destructive)"
                              : "rgba(255,255,255,.2)",
                    }}
                  />
                ))}
              </div>
              <div
                className="text-xs"
                style={{ color: "rgba(255,255,255,.35)" }}
              >
                {submittedCount}/{totalJudges} {t("display.submitted")}
              </div>
            </div>
          )}
        </>
      ) : (
        <div
          className="text-center text-2xl font-bold"
          style={{ color: "rgba(255,255,255,.25)", fontFamily: "var(--font-sora)" }}
        >
          {t("display.gettingReady")}
        </div>
      )}

      {/* Footer */}
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px]"
        style={{ color: "rgba(255,255,255,.15)", fontFamily: "var(--font-sora)" }}
      >
        ProPodium · {competition?.name}
      </div>
    </div>
  );
}
