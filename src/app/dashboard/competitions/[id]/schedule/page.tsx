"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Users, CalendarDays, ArrowLeft, Radio, Pencil } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { competitionsApi } from "@/lib/api/competitions";
import { ScheduleSettings } from "@/components/schedule/schedule-settings";
import { SectionManager } from "@/components/schedule/section-manager";
import { ScheduleBuilder } from "@/components/schedule/schedule-builder";
import { useScheduleStore } from "@/store/schedule-store";
import { scheduleApi } from "@/lib/api/schedule";
import { useSSE } from "@/hooks/use-sse";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3;

const STEPS = [
  { id: 1 as Step, label: "Sekce & nastavení", icon: Users },
  { id: 2 as Step, label: "Harmonogram", icon: CalendarDays },
  { id: 3 as Step, label: "Publikace", icon: CheckCircle2 },
];

function StepIndicator({ current, onSelect }: { current: Step; onSelect: (s: Step) => void }) {
  return (
    <nav className="flex items-center gap-0" aria-label="Kroky nastavení">
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        const isCompleted = step.id < current;
        const isCurrent = step.id === current;
        return (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => onSelect(step.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                isCurrent
                  ? "bg-[var(--accent)] text-white"
                  : isCompleted
                  ? "text-[var(--accent)] hover:bg-[var(--surface-secondary)]"
                  : "text-[var(--text-tertiary)] hover:bg-[var(--surface-secondary)]"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{step.label}</span>
            </button>
            {idx < STEPS.length - 1 && (
              <span className="text-[var(--text-tertiary)] mx-1">›</span>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function PublishStep({ competitionId }: { competitionId: string }) {
  const { scheduleStatus, slots, publishSchedule, isGenerating } = useScheduleStore();
  const isPublished = scheduleStatus === "PUBLISHED";
  const totalMins = slots.reduce((s, slot) => s + slot.durationMinutes, 0);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;

  return (
    <div className="max-w-lg space-y-6">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Přehled harmonogramu</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-[var(--text-secondary)]">Počet bloků</dt>
            <dd className="font-medium text-[var(--text-primary)]">{slots.length}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--text-secondary)]">Celková délka</dt>
            <dd className="font-medium text-[var(--text-primary)]">
              {hours > 0 ? `${hours} h ${mins} min` : `${mins} min`}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--text-secondary)]">Stav</dt>
            <dd>
              {isPublished ? (
                <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Publikováno
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-medium">Koncept</span>
              )}
            </dd>
          </div>
        </dl>
      </div>

      {!isPublished && slots.length === 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-800 dark:text-amber-300">
          ⚠ Harmonogram ještě nebyl vygenerován. Přejdi na krok 2 a vygeneruj harmonogram.
        </div>
      )}

      {!isPublished && slots.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">
            Po publikování bude harmonogram viditelný pro tanečníky, rozhodčí a veřejnost.
          </p>
          <button
            onClick={() => publishSchedule(competitionId)}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-white font-medium px-4 py-3 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <CheckCircle2 className="h-5 w-5" />
            Publikovat harmonogram
          </button>
        </div>
      )}

      {isPublished && (
        <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-4 space-y-2">
          <p className="text-sm font-medium text-green-800 dark:text-green-300">
            ✓ Harmonogram je publikován
          </p>
          <p className="text-xs text-green-700 dark:text-green-400">
            Tanečníci a rozhodčí jej nyní vidí. Upravit harmonogram můžeš na kroku 2 — změny se projeví po opětovném publikování.
          </p>
        </div>
      )}
    </div>
  );
}

type LiveView = "live" | "edit";

export default function SchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: competitionId } = use(params);
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [liveView, setLiveView] = useState<LiveView>("live");
  const [activeFloor, setActiveFloor] = useState<{ danceName: string; heatNumber: number } | null>(null);
  const { loadSchedule, scheduleStatus } = useScheduleStore();

  useSSE<{ type: string; danceName: string; heatNumber: number }>(competitionId, "floor-control", (data) => {
    setActiveFloor({ danceName: data.danceName, heatNumber: data.heatNumber });
  });

  const handleFloorControl = useCallback(async (danceName: string, heatNumber: number) => {
    setActiveFloor({ danceName, heatNumber });
    try { await scheduleApi.floorControl(competitionId, danceName, heatNumber); } catch { /* ignore */ }
  }, [competitionId]);

  const { data: competition } = useQuery({
    queryKey: ["competition", competitionId],
    queryFn: () => competitionsApi.get(competitionId),
  });

  // Load schedule on mount
  useEffect(() => {
    loadSchedule(competitionId);
  }, [competitionId, loadSchedule]);

  const initialConfig = competition
    ? {
        scheduleStartTime: competition.scheduleStartTime ?? undefined,
        danceDurationSeconds: competition.danceDurationSeconds,
        transitionDurationSeconds: competition.transitionDurationSeconds,
        maxPairsOnFloor: competition.maxPairsOnFloor,
        breakDurationMinutes: competition.breakDurationMinutes,
        breakRule: competition.breakRule as "AFTER_ROUND" | "BETWEEN_CATEGORIES" | "BOTH",
        judgeBreakAfterMinutes: competition.judgeBreakAfterMinutes,
        judgeBreakDurationMinutes: competition.judgeBreakDurationMinutes,
        slotBufferMinutes: competition.slotBufferMinutes,
      }
    : undefined;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <button
              onClick={() => router.push(`/dashboard/competitions/${competitionId}`)}
              className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Zpět
            </button>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Harmonogram</h1>
            {competition && (
              <p className="text-sm text-[var(--text-secondary)]">{competition.name}</p>
            )}
          </div>
          <StepIndicator current={step} onSelect={setStep} />
        </div>

        {/* Step 1: Sections + Settings */}
        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <SectionManager competitionId={competitionId} />
            <ScheduleSettings
              competitionId={competitionId}
              initialConfig={initialConfig}
              onRegenerateRequest={() => setStep(2)}
            />
          </div>
        )}

        {/* Step 2: Live management or edit depending on competition status */}
        {step === 2 && competition?.status === "IN_PROGRESS" && (
          <div className="space-y-4">
            {/* Live banner */}
            <div className="flex items-center gap-2 rounded-xl border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/30 px-4 py-2.5 text-sm text-green-800 dark:text-green-300">
              <Radio className="h-4 w-4 animate-pulse" />
              <span className="font-medium">Soutěž probíhá</span>
              <span className="text-green-700 dark:text-green-400 text-xs">— změny harmonogramu jsou omezeny na nespuštěné bloky</span>
            </div>

            {/* Toggle: Live řízení / Upravit harmonogram */}
            <div className="flex gap-1 p-1 rounded-lg bg-[var(--surface-secondary)] w-fit">
              <button
                onClick={() => setLiveView("live")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  liveView === "live"
                    ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                <Radio className="h-3.5 w-3.5" />
                Live řízení
              </button>
              <button
                onClick={() => setLiveView("edit")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  liveView === "edit"
                    ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                <Pencil className="h-3.5 w-3.5" />
                Upravit harmonogram
              </button>
            </div>

            {liveView === "live" ? (
              <>
                {activeFloor && (
                  <div className="flex items-center gap-2 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/8 px-4 py-2 text-sm font-medium text-[var(--accent)]">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" />
                    Na parketu: {activeFloor.danceName} · Skupina {activeFloor.heatNumber}
                  </div>
                )}
                <ScheduleBuilder
                  competitionId={competitionId}
                  competition={competition}
                  restrictedEdit
                  onFloorControl={handleFloorControl}
                  activeFloor={activeFloor}
                />
              </>
            ) : (
              <ScheduleBuilder
                competitionId={competitionId}
                competition={competition}
                restrictedEdit
              />
            )}
          </div>
        )}

        {/* Step 2: Standard schedule builder for non-IN_PROGRESS competitions */}
        {step === 2 && competition?.status !== "IN_PROGRESS" && (
          <ScheduleBuilder competitionId={competitionId} competition={competition} />
        )}

        {/* Step 3: Publish */}
        {step === 3 && (
          <PublishStep competitionId={competitionId} />
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-2">
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => (s - 1) as Step)}
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              ← Zpět
            </button>
          ) : <div />}
          {step < 3 && (
            <button
              onClick={() => setStep((s) => (s + 1) as Step)}
              className="text-sm font-medium text-[var(--accent)] hover:opacity-80 transition-opacity"
            >
              Další →
            </button>
          )}
        </div>
      </div>
    </AppShell>
  );
}
