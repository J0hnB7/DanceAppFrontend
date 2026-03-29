"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Users, CalendarDays, ArrowLeft, Radio, Maximize2, Minimize2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { CompetitionSidebar } from "@/components/layout/competition-sidebar";
import { competitionsApi } from "@/lib/api/competitions";
import { ScheduleSettings } from "@/components/schedule/schedule-settings";
import { SectionManager } from "@/components/schedule/section-manager";
import { ScheduleBuilder } from "@/components/schedule/schedule-builder";
import { CompetitionTimeline } from "@/components/schedule/competition-timeline";
import { useScheduleStore } from "@/store/schedule-store";
import { sectionsApi } from "@/lib/api/sections";
import { PreliminarySchedulePanel } from "@/components/schedule/preliminary-schedule-panel";

import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/locale-context";

type Step = 0 | 1 | 2 | 3;

function StepIndicator({ current, onSelect }: { current: Step; onSelect: (s: Step) => void }) {
  const { t } = useLocale();
  const STEPS = [
    { id: 0 as Step, label: t("schedulePage.step0"), icon: CalendarDays },
    { id: 1 as Step, label: t("schedulePage.step1"), icon: Users },
    { id: 2 as Step, label: t("schedulePage.step2"), icon: CalendarDays },
    { id: 3 as Step, label: t("schedulePage.step3"), icon: CheckCircle2 },
  ];
  return (
    <nav className="flex items-center gap-0" aria-label={t("schedulePage.stepsAriaLabel")}>
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
  const { t } = useLocale();
  const isPublished = scheduleStatus === "PUBLISHED";
  const totalMins = slots.reduce((s, slot) => s + slot.durationMinutes, 0);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;

  return (
    <div className="max-w-lg space-y-6">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">{t("schedulePage.overview")}</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-[var(--text-secondary)]">{t("schedulePage.slotsCount")}</dt>
            <dd className="font-medium text-[var(--text-primary)]">{slots.length}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--text-secondary)]">{t("schedulePage.totalDuration")}</dt>
            <dd className="font-medium text-[var(--text-primary)]">
              {hours > 0 ? `${hours} h ${mins} min` : `${mins} min`}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--text-secondary)]">{t("schedulePage.statusLabel")}</dt>
            <dd>
              {isPublished ? (
                <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  {t("schedulePage.publishedStatus")}
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-medium">{t("schedulePage.draftStatus")}</span>
              )}
            </dd>
          </div>
        </dl>
      </div>

      {!isPublished && slots.length === 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-800 dark:text-amber-300">
          ⚠ {t("schedulePage.noScheduleWarning")}
        </div>
      )}

      {!isPublished && slots.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">
            {t("schedulePage.publishDesc")}
          </p>
          <button
            onClick={() => publishSchedule(competitionId)}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-white font-medium px-4 py-3 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <CheckCircle2 className="h-5 w-5" />
            {t("schedulePage.publishButton")}
          </button>
        </div>
      )}

      {isPublished && (
        <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-4 space-y-2">
          <p className="text-sm font-medium text-green-800 dark:text-green-300">
            ✓ {t("schedulePage.publishedSuccess")}
          </p>
          <p className="text-xs text-green-700 dark:text-green-400">
            {t("schedulePage.publishedSuccessDesc")}
          </p>
        </div>
      )}
    </div>
  );
}

export default function SchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: competitionId } = use(params);
  const router = useRouter();
  const { t } = useLocale();
  const [step, setStep] = useState<Step>(0);
  const [fullscreen, setFullscreen] = useState(false);
  const { loadSchedule, scheduleStatus, slots } = useScheduleStore();

  const { data: competition } = useQuery({
    queryKey: ["competition", competitionId],
    queryFn: () => competitionsApi.get(competitionId),
  });

  const { data: sections = [] } = useQuery({
    queryKey: ["sections", competitionId, "list"],
    queryFn: () => sectionsApi.list(competitionId),
  });

  // Build ordered sectionIds and names for timeline coloring
  const { sectionIds, sectionNames } = (() => {
    const ids: string[] = [];
    for (const sl of slots) {
      if (sl.sectionId && !ids.includes(sl.sectionId)) ids.push(sl.sectionId);
    }
    const names = new Map(sections.map((s) => [s.id, s.name]));
    return { sectionIds: ids, sectionNames: names };
  })();

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
    <AppShell sidebar={fullscreen ? null : <CompetitionSidebar competitionId={competitionId} />}>
      <div className="space-y-6">
        {/* Header — hidden in fullscreen */}
        {!fullscreen && (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <button
                onClick={() => router.push(`/dashboard/competitions/${competitionId}`)}
                className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-1"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("common.back")}
              </button>
              <h1 className="text-xl font-semibold text-[var(--text-primary)]">{t("schedulePage.step2")}</h1>
              {competition && (
                <p className="text-sm text-[var(--text-secondary)]">{competition.name}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <StepIndicator current={step} onSelect={setStep} />
              {step === 2 && (
                <button
                  onClick={() => setFullscreen(true)}
                  className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  title="Fullscreen"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 0: Preliminary schedule */}
        {step === 0 && <PreliminarySchedulePanel competitionId={competitionId} />}

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

        {/* Fullscreen header bar */}
        {fullscreen && competition && (
          <div className="flex items-center justify-between gap-4 mb-2">
            {/* Competition info */}
            <div className="flex items-center gap-5 min-w-0">
              <div className="min-w-0">
                <p className="text-base font-bold text-[var(--text-primary)] truncate" style={{ fontFamily: "var(--font-sora)" }}>
                  {competition.name}
                </p>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  {competition.venue && (
                    <span className="text-xs text-[var(--text-secondary)]">{competition.venue}</span>
                  )}
                  {competition.eventDate && (
                    <span className="text-xs text-[var(--text-secondary)]">
                      {new Date(competition.eventDate).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                  )}
                  {(competition.registeredPairsCount ?? 0) > 0 && (
                    <span className="text-xs text-[var(--text-secondary)]">{competition.registeredPairsCount} {t("schedulePage.pairs")}</span>
                  )}
                  {sections.length > 0 && (
                    <span className="text-xs text-[var(--text-secondary)]">{sections.length} {t("schedulePage.categories")}</span>
                  )}
                  {(() => {
                    const judges = Math.max(...sections.map((s) => s.numberOfJudges ?? 0));
                    return judges > 0 ? (
                      <span className="text-xs text-[var(--text-secondary)]">{judges} {t("schedulePage.judges")}</span>
                    ) : null;
                  })()}
                </div>
              </div>
            </div>

            {/* Exit button */}
            <button
              onClick={() => setFullscreen(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors shadow-sm shrink-0"
            >
              <Minimize2 className="h-3.5 w-3.5" />
              {t("schedulePage.exitFullscreen")}
            </button>
          </div>
        )}

        {/* Step 2: Live management or edit depending on competition status */}
        {step === 2 && competition?.status === "IN_PROGRESS" && (
          <div className="space-y-4">
            {/* Live banner — hidden in fullscreen */}
            {!fullscreen && (
              <div className="flex items-center gap-2 rounded-xl border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/30 px-4 py-2.5 text-sm text-green-800 dark:text-green-300">
                <Radio className="h-4 w-4 animate-pulse" />
                <span className="font-medium">{t("schedulePage.liveWarning")}</span>
                <span className="text-green-700 dark:text-green-400 text-xs">{t("schedulePage.liveWarningDesc")}</span>
              </div>
            )}

            <ScheduleBuilder
              competitionId={competitionId}
              competition={competition}
              restrictedEdit
              hideToolbar={fullscreen}
              headerSlot={slots.length > 0 ? (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                  <CompetitionTimeline slots={slots} sectionIds={sectionIds} sectionNames={sectionNames} />
                </div>
              ) : undefined}
            />
          </div>
        )}

        {/* Step 2: Standard schedule builder for non-IN_PROGRESS competitions */}
        {step === 2 && competition?.status !== "IN_PROGRESS" && (
          <ScheduleBuilder
            competitionId={competitionId}
            competition={competition}
            hideToolbar={fullscreen}
            headerSlot={slots.length > 0 ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                <CompetitionTimeline slots={slots} sectionIds={sectionIds} sectionNames={sectionNames} />
              </div>
            ) : undefined}
          />
        )}

        {/* Step 3: Publish */}
        {step === 3 && (
          <PublishStep competitionId={competitionId} />
        )}

        {/* Navigation — hidden in fullscreen */}
        {!fullscreen && <div className="flex justify-between pt-2">
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => (s - 1) as Step)}
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              ← {t("common.back")}
            </button>
          ) : <div />}
          {step < 3 && (
            <button
              onClick={() => setStep((s) => (s + 1) as Step)}
              className="text-sm font-medium text-[var(--accent)] hover:opacity-80 transition-opacity"
            >
              {t("common.next")} →
            </button>
          )}
        </div>}
      </div>
    </AppShell>
  );
}
