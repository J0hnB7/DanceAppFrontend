"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { zodResolver } = require("@hookform/resolvers/zod");
import { z } from "zod";
import { ChevronRight, ChevronLeft, Check } from "lucide-react";
import { SectionEditor } from "@/components/shared/section-editor";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VenueAutocomplete } from "@/components/ui/venue-autocomplete";
import { useCreateCompetition } from "@/hooks/queries/use-competitions";
import { useCompetitionTemplates } from "@/hooks/queries/use-competition-templates";
import { sectionsApi } from "@/lib/api/sections";
import { judgeTokensApi } from "@/lib/api/judge-tokens";
import { toast } from "@/hooks/use-toast";
import { useLocale } from "@/contexts/locale-context";
import type { AgeCategory, Level, DanceStyle, CompetitorType, CompetitionType, Series } from "@/lib/api/sections";

// ─── Default dances by style ────────────────────────────────────────────────

const STANDARD_DANCES = ["Waltz", "Tango", "Viennese Waltz", "Slowfoxtrot", "Quickstep"];
const LATIN_DANCES = ["Samba", "Cha-Cha-Cha", "Rumba", "Paso Doble", "Jive"];
const TEN_DANCE = [...STANDARD_DANCES, ...LATIN_DANCES];

function getDefaultDances(style?: string): string[] {
  if (!style) return [];
  if (style === "STANDARD") return STANDARD_DANCES;
  if (style === "LATIN") return LATIN_DANCES;
  if (style === "TEN_DANCE") return TEN_DANCE;
  return [];
}

// ─── Schema ─────────────────────────────────────────────────────────────────

const categorySchema = z.object({
  name: z.string().min(2, "Minimálně 2 znaky"),
  ageCategory: z.string().optional(),
  level: z.string().optional(),
  danceStyle: z.string().optional(),
  numberOfJudges: z.number().int().min(1).max(15).default(5),
  maxFinalPairs: z.number().int().min(2).max(24).default(6),
  competitorType: z.string().optional(),
  competitionType: z.string().optional(),
  series: z.string().optional(),
  // RICHTAR-specific
  singleDanceName: z.string().optional(),
  danceNames: z.array(z.string()).default([]),
  minBirthYear: z.number().nullable().optional(),
  maxBirthYear: z.number().nullable().optional(),
  // wizard-only
  entryFee: z.string().optional(),
  entryFeeCurrency: z.string().optional(),
  presenceEnd: z.string().optional(),
});

const schema = z.object({
  name: z.string().min(5, "Minimálně 5 znaků"),
  eventDate: z.string().min(1, "Povinné pole"),
  registrationDeadline: z.string().min(1, "Povinné pole").refine(
    (v) => !v || new Date(v) > new Date(),
    "Uzávěrka nesmí být v minulosti"
  ),
  venue: z.string().min(1, "Povinné pole"),
  description: z.string().optional(),
  categories: z.array(categorySchema).optional(),
});

type FormData = z.infer<typeof schema>;
type CategoryData = z.infer<typeof categorySchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeDate(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const rtf = new Intl.RelativeTimeFormat('cs', { numeric: 'auto' });
  if (days === 0) return 'dnes';
  if (days < 7) return rtf.format(-days, 'day');
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return rtf.format(-weeks, 'week');
  const months = Math.floor(days / 30);
  return rtf.format(-months, 'month');
}

// ─── Steps ───────────────────────────────────────────────────────────────────

const STEPS = [
  { n: 1, label: "Základní informace" },
  { n: 2, label: "Šablona" },
  { n: 3, label: "Sekce" },
];

const inputCls =
  "w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-base text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";
const labelCls = "mb-1 block text-sm font-medium text-[var(--text-primary)]";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewCompetitionPage() {
  const { t } = useLocale();
  const router = useRouter();
  const create = useCreateCompetition();
  const { data: apiTemplates = [], isLoading: templatesLoading, isError: templatesError } = useCompetitionTemplates();
  const [step, setStep] = useState(1);
  const [deadlineError, setDeadlineError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    watch,
    formState: { errors },
    control,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { categories: [] },
  });

  const { fields, append, remove, replace } = useFieldArray({ control, name: "categories" });

  // Watch judge counts for live majority display
  const watchedCategories = watch("categories") ?? [];

  const allTemplates = [
    ...apiTemplates,
    { id: "empty", name: "Prázdná šablona", description: "Přidám sekce ručně",
      icon: "➕", sections: [], displayOrder: 999, active: true, updatedAt: "" },
  ];

  const handleNextStep1 = async () => {
    setDeadlineError(null);
    const valid = await trigger(["name", "eventDate", "registrationDeadline", "venue"]);
    if (!valid) return;

    const { eventDate, registrationDeadline } = getValues();
    if (registrationDeadline && eventDate) {
      const deadlineDatePart = registrationDeadline.split("T")[0];
      if (deadlineDatePart >= eventDate) {
        setDeadlineError("Uzávěrka přihlášek musí být před datem soutěže");
        return;
      }
    }
    setStep(2);
  };

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (templateId === "empty") {
      replace([]);
      return;
    }
    const tpl = allTemplates.find((t) => t.id === templateId);
    if (!tpl) return;
    replace(
      tpl.sections.map((s) => ({
        ...s,
        series: s.series || "OPEN",
        singleDanceName: s.danceStyle === "SINGLE_DANCE" && s.dances?.length ? (s.dances[0].danceName ?? "") : "",
        danceNames: s.danceStyle === "MULTIDANCE" ? (s.dances?.map((d) => d.danceName ?? "").filter(Boolean) ?? []) : [],
        minBirthYear: s.minBirthYear ?? null,
        maxBirthYear: s.maxBirthYear ?? null,
        entryFee: "",
        entryFeeCurrency: "CZK",
        presenceEnd: "09:00",
      }))
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSubmit = async (values: any) => {
    setSubmitting(true);
    let createdId: string | null = null;

    try {
      const competition = await create.mutateAsync({
        name: values.name,
        eventDate: values.eventDate,
        venue: values.venue,
        registrationDeadline: values.registrationDeadline,
        description: values.description || undefined,
        federation: "NATIONAL",
        roleMode: "ORGANIZER_ONLY",
      });
      createdId = competition.id;
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
      setSubmitting(false);
      return;
    }

    const failedSections: string[] = [];

    for (const [idx, cat] of (values.categories ?? []).entries()) {
      try {
        const fee = cat.entryFee ? parseFloat(cat.entryFee.replace(",", ".")) : undefined;
        const isRichtar = cat.danceStyle === "SINGLE_DANCE" || cat.danceStyle === "MULTIDANCE";
        const dances = isRichtar
          ? (cat.danceStyle === "MULTIDANCE"
              ? (cat.danceNames ?? [])
              : cat.singleDanceName ? [cat.singleDanceName] : [])
          : getDefaultDances(cat.danceStyle);
        await sectionsApi.create(createdId!, {
          name: cat.name,
          danceStyle: (cat.danceStyle || undefined) as DanceStyle | undefined,
          numberOfJudges: cat.numberOfJudges ?? 5,
          maxFinalPairs: cat.maxFinalPairs ?? 6,
          orderIndex: idx,
          dances,
          ageCategory: isRichtar ? undefined : (cat.ageCategory || undefined) as AgeCategory | undefined,
          level: isRichtar ? undefined : (cat.level || undefined) as Level | undefined,
          competitorType: isRichtar ? undefined : cat.competitorType as CompetitorType | undefined,
          competitionType: isRichtar ? undefined : cat.competitionType as CompetitionType | undefined,
          series: isRichtar ? undefined : cat.series as Series | undefined,
          entryFee: fee && !isNaN(fee) ? fee : undefined,
          entryFeeCurrency: fee ? (cat.entryFeeCurrency || "CZK") : undefined,
          minBirthYear: isRichtar ? (cat.minBirthYear ?? null) : undefined,
          maxBirthYear: isRichtar ? (cat.maxBirthYear ?? null) : undefined,
        });
      } catch {
        failedSections.push(cat.name || `Sekce ${idx + 1}`);
      }
    }

    const maxJudges = Math.max(...(values.categories ?? []).map((c: any) => c.numberOfJudges ?? 5), 0);
    for (let i = 1; i <= maxJudges; i++) {
      try {
        await judgeTokensApi.create(createdId!, { judgeNumber: i, role: "JUDGE" });
      } catch {
        // non-fatal — judges can be added manually later
      }
    }

    setSubmitting(false);

    if (failedSections.length > 0) {
      toast({
        title: "Soutěž byla vytvořena",
        description: `Nepodařilo se vytvořit některé sekce: ${failedSections.join(", ")}. Zkontroluj je v nastavení.`,
        variant: "default",
      });
    }

    router.push(`/dashboard/competitions/${createdId}?tab=judges`);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-xl font-bold text-[var(--text-primary)]">Nová soutěž</h1>

        {/* Step indicator */}
        <div className="mb-8 flex flex-wrap items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  s.n === step
                    ? "bg-[var(--accent)] text-white"
                    : s.n < step
                      ? "bg-green-500 text-white"
                      : "bg-[var(--surface-secondary)] text-[var(--text-tertiary)]"
                }`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/25 text-xs font-bold">
                  {s.n < step ? <Check className="h-3 w-3" aria-hidden="true" /> : s.n}
                </span>
                <span>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex gap-0.5">
                  {[0, 1, 2].map((d) => (
                    <span key={d} className="h-1 w-1 rounded-full bg-[var(--border)]" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
          <form onSubmit={(e) => e.preventDefault()}>

            {/* ─── Step 1: Basic info ─── */}
            {step === 1 && (
              <div className="flex flex-col gap-4">
                <h2 className="text-base font-semibold text-[var(--text-primary)]">Základní informace</h2>
                <Input
                  label="Název soutěže"
                  placeholder="např. Jarní pohár Praha 2026"
                  error={errors.name?.message}
                  {...register("name")}
                />
                <Input
                  label="Datum soutěže"
                  type="date"
                  error={errors.eventDate?.message}
                  {...register("eventDate")}
                />
                <div>
                  <label className={labelCls} htmlFor="registrationDeadline">Uzávěrka přihlášek</label>
                  <input
                    id="registrationDeadline"
                    type="datetime-local"
                    className={inputCls}
                    min={new Date().toISOString().slice(0, 16)}
                    {...register("registrationDeadline")}
                  />
                  {(errors.registrationDeadline || deadlineError) && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.registrationDeadline?.message ?? deadlineError}
                    </p>
                  )}
                </div>
                <div>
                  <label className={labelCls}>Místo konání</label>
                  <Controller
                    control={control}
                    name="venue"
                    render={({ field }) => (
                      <VenueAutocomplete
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        placeholder="Praha, sportovní hala..."
                      />
                    )}
                  />
                  {errors.venue && (
                    <p className="mt-1 text-xs text-red-500">{errors.venue.message}</p>
                  )}
                </div>
              </div>
            )}

            {/* ─── Step 2: Template selection ─── */}
            {step === 2 && (
              <div className="flex flex-col gap-4">
                <div>
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">Vyberte šablonu</h2>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    Šablona předvyplní sekce — sekce pak upravíte dle potřeby.
                  </p>
                </div>
                {templatesError && (
                  <p className="text-xs text-[var(--destructive)]">Nepodařilo se načíst šablony</p>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {templatesLoading
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex flex-col gap-2 rounded-[var(--radius-lg)] border-2 border-[var(--border)] bg-[var(--surface-secondary)] p-4 animate-pulse"
                        >
                          <div className="h-6 w-8 rounded bg-[var(--border)]" />
                          <div className="h-4 w-3/4 rounded bg-[var(--border)]" />
                          <div className="h-3 w-full rounded bg-[var(--border)]" />
                          <div className="mt-1 flex gap-1">
                            <div className="h-5 w-16 rounded-full bg-[var(--border)]" />
                            <div className="h-5 w-16 rounded-full bg-[var(--border)]" />
                          </div>
                        </div>
                      ))
                    : allTemplates.map((tpl) => (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => handleSelectTemplate(tpl.id)}
                          aria-pressed={selectedTemplate === tpl.id}
                          className={`flex flex-col gap-1.5 cursor-pointer rounded-[var(--radius-lg)] border-2 p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ${
                            selectedTemplate === tpl.id
                              ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]"
                              : "border-[var(--border)] bg-[var(--surface-secondary)] hover:border-[var(--accent)]/50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-2xl" aria-hidden="true">{tpl.icon}</span>
                            {selectedTemplate === tpl.id && (
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)]">
                                <Check className="h-3 w-3 text-white" aria-hidden="true" />
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-semibold text-[var(--text-primary)]">{tpl.name}</span>
                          <span className="text-xs text-[var(--text-secondary)]">{tpl.description}</span>
                          {tpl.sections.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {tpl.sections.map((s, i) => (
                                <span
                                  key={i}
                                  className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-xs text-[var(--text-secondary)] border border-[var(--border)]"
                                >
                                  {s.name}
                                </span>
                              ))}
                            </div>
                          )}
                          {tpl.id !== "empty" && tpl.updatedAt && (
                            <span className="text-[10px] text-[var(--text-tertiary)]">
                              Aktualizováno {formatRelativeDate(tpl.updatedAt)}
                            </span>
                          )}
                        </button>
                      ))
                  }
                </div>
                {selectedTemplate === null && (
                  <p className="text-xs text-[var(--text-tertiary)]">Vyberte šablonu pro pokračování.</p>
                )}
              </div>
            )}

            {/* ─── Step 3: Sections ─── */}
            {step === 3 && (
              <div className="flex flex-col gap-5">
                <div>
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">Sekce soutěže</h2>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    Upravte sekce nebo přidejte nové.
                  </p>
                </div>

                <SectionEditor
                  fields={fields}
                  append={append}
                  remove={remove}
                  control={control}
                  errors={errors}
                  fieldArrayName="categories"
                  watchedItems={watchedCategories}
                />
              </div>
            )}

            {/* Navigation */}
            <div className="mt-6 flex items-center justify-between border-t border-[var(--border)] pt-4">
              {step > 1 ? (
                <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                  <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" />
                  {t("common.back")}
                </Button>
              ) : (
                <div />
              )}

              {step === 1 && (
                <Button type="button" onClick={handleNextStep1}>
                  Pokračovat
                  <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
                </Button>
              )}
              {step === 2 && (
                <Button type="button" disabled={selectedTemplate === null} onClick={() => setStep(3)}>
                  Pokračovat
                  <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
                </Button>
              )}
              {step === 3 && (
                <Button type="button" loading={submitting} onClick={() => void handleSubmit(onSubmit)()}>
                  Vytvořit soutěž
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
