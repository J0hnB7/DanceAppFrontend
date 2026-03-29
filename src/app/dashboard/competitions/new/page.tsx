"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { zodResolver } = require("@hookform/resolvers/zod");
import { z } from "zod";
import { Plus, Trash2, ChevronRight, ChevronLeft, Check, Users } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VenueAutocomplete } from "@/components/ui/venue-autocomplete";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateCompetition } from "@/hooks/queries/use-competitions";
import { sectionsApi } from "@/lib/api/sections";
import { toast } from "@/hooks/use-toast";
import { useLocale } from "@/contexts/locale-context";
import type { AgeCategory, Level, DanceStyle, CompetitorType, CompetitionType, Series } from "@/lib/api/sections";

// ─── Schema ─────────────────────────────────────────────────────────────────

const categorySchema = z.object({
  name: z.string().min(2, "Minimálně 2 znaky"),
  ageCategory: z.string().min(1, "Povinné"),
  level: z.string().min(1, "Povinné"),
  danceStyle: z.string().min(1, "Povinné"),
  numberOfJudges: z.number().int().min(1).max(15).default(5),
  maxFinalPairs: z.number().int().min(2).max(24).default(6),
  competitorType: z.string().optional(),
  competitionType: z.string().optional(),
  series: z.string().optional(),
  entryFee: z.string().optional(),
  entryFeeCurrency: z.string().optional(),
  presenceEnd: z.string().optional(),
});

const schema = z.object({
  name: z.string().min(5, "Minimálně 5 znaků"),
  eventDate: z.string().min(1, "Povinné pole"),
  registrationDeadline: z.string().min(1, "Povinné pole"),
  venue: z.string().min(1, "Povinné pole"),
  description: z.string().optional(),
  categories: z.array(categorySchema).optional(),
});

type FormData = z.infer<typeof schema>;
type CategoryData = z.infer<typeof categorySchema>;

// ─── Templates ───────────────────────────────────────────────────────────────

type Template = {
  id: string;
  name: string;
  description: string;
  icon: string;
  sections: Omit<CategoryData, "entryFee" | "entryFeeCurrency" | "presenceEnd">[];
};

const TEMPLATES: Template[] = [
  {
    id: "ballroom",
    name: "Ballroom Championship",
    description: "5 tanců / 7 rozhodčích / Standard",
    icon: "🏆",
    sections: [
      { name: "Standard D", ageCategory: "ADULT", level: "D", danceStyle: "STANDARD", numberOfJudges: 7, maxFinalPairs: 6, competitorType: "AMATEURS", competitionType: "COUPLE" },
      { name: "Standard C", ageCategory: "ADULT", level: "C", danceStyle: "STANDARD", numberOfJudges: 7, maxFinalPairs: 6, competitorType: "AMATEURS", competitionType: "COUPLE" },
      { name: "Latin D", ageCategory: "ADULT", level: "D", danceStyle: "LATIN", numberOfJudges: 7, maxFinalPairs: 6, competitorType: "AMATEURS", competitionType: "COUPLE" },
    ],
  },
  {
    id: "latin",
    name: "Latin Bronze",
    description: "5 tanců / 5 rozhodčích / Latin",
    icon: "💃",
    sections: [
      { name: "Latin D", ageCategory: "ADULT", level: "D", danceStyle: "LATIN", numberOfJudges: 5, maxFinalPairs: 6, competitorType: "AMATEURS", competitionType: "COUPLE" },
      { name: "Latin C", ageCategory: "ADULT", level: "C", danceStyle: "LATIN", numberOfJudges: 5, maxFinalPairs: 6, competitorType: "AMATEURS", competitionType: "COUPLE" },
    ],
  },
  {
    id: "beginners",
    name: "Začátečníci",
    description: "3 tance / 3 rozhodčí / Junioři",
    icon: "🌱",
    sections: [
      { name: "Standard D Junior I", ageCategory: "JUNIOR_I", level: "D", danceStyle: "STANDARD", numberOfJudges: 3, maxFinalPairs: 6, competitorType: "AMATEURS", competitionType: "COUPLE" },
      { name: "Latin D Junior I", ageCategory: "JUNIOR_I", level: "D", danceStyle: "LATIN", numberOfJudges: 3, maxFinalPairs: 6, competitorType: "AMATEURS", competitionType: "COUPLE" },
      { name: "Standard D Junior II", ageCategory: "JUNIOR_II", level: "D", danceStyle: "STANDARD", numberOfJudges: 3, maxFinalPairs: 6, competitorType: "AMATEURS", competitionType: "COUPLE" },
    ],
  },
  {
    id: "empty",
    name: "Prázdná šablona",
    description: "Přidám sekce ručně",
    icon: "➕",
    sections: [],
  },
];

// ─── Steps ───────────────────────────────────────────────────────────────────

const STEPS = [
  { n: 1, label: "Základní informace" },
  { n: 2, label: "Šablona" },
  { n: 3, label: "Sekce" },
];

const CURRENCIES = ["CZK", "EUR", "USD", "GBP"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-base text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";
const labelCls = "mb-1 block text-sm font-medium text-[var(--text-primary)]";

function majority(n: number): number {
  return Math.floor(n / 2) + 1;
}

function SelectField({
  label,
  name,
  options,
  control,
  error,
  placeholder,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any;
  error?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className={labelCls} htmlFor={name}>{label}</label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select onValueChange={field.onChange} value={field.value ?? ""}>
            <SelectTrigger id={name} error={!!error}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      {error && <p className="mt-1 text-xs text-[var(--destructive)]">{error}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewCompetitionPage() {
  const { t } = useLocale();
  const router = useRouter();
  const create = useCreateCompetition();
  const [step, setStep] = useState(1);
  const [deadlineError, setDeadlineError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const AGE_CATEGORIES: { value: AgeCategory; label: string }[] = [
    { value: "CHILDREN_I", label: t("ageCategory.CHILDREN_I") },
    { value: "CHILDREN_II", label: t("ageCategory.CHILDREN_II") },
    { value: "JUNIOR_I", label: t("ageCategory.JUNIOR_I") },
    { value: "JUNIOR_II", label: t("ageCategory.JUNIOR_II") },
    { value: "YOUTH", label: t("ageCategory.YOUTH") },
    { value: "ADULT", label: t("ageCategory.ADULT") },
    { value: "SENIOR_I", label: t("ageCategory.SENIOR_I") },
    { value: "SENIOR_II", label: t("ageCategory.SENIOR_II") },
  ];

  const LEVELS: { value: Level; label: string }[] = [
    { value: "A", label: "A" },
    { value: "B", label: "B" },
    { value: "C", label: "C" },
    { value: "D", label: "D" },
    { value: "HOBBY", label: "Hobby" },
    { value: "CHAMPIONSHIP", label: t("series.CZECH_CHAMPIONSHIP") },
    { value: "OPEN", label: t("series.OPEN") },
    { value: "S", label: "S" },
  ];

  const DANCE_STYLES: { value: DanceStyle; label: string }[] = [
    { value: "STANDARD", label: t("danceStyle.STANDARD") },
    { value: "LATIN", label: t("danceStyle.LATIN") },
    { value: "TEN_DANCE", label: t("danceStyle.TEN_DANCE") },
    { value: "COMBINATION", label: t("danceStyle.COMBINATION") },
  ];

  const COMPETITOR_TYPES: { value: CompetitorType; label: string }[] = [
    { value: "AMATEURS", label: t("competitorType.AMATEURS") },
    { value: "PROFESSIONALS", label: t("competitorType.PROFESSIONALS") },
  ];

  const COMPETITION_TYPES: { value: CompetitionType; label: string }[] = [
    { value: "COUPLE", label: t("competitionType.COUPLE") },
    { value: "SOLO_STANDARD", label: t("competitionType.SOLO_STANDARD") },
    { value: "SOLO_LATIN", label: t("competitionType.SOLO_LATIN") },
    { value: "FORMATION_STANDARD", label: t("competitionType.FORMATION_STANDARD") },
    { value: "FORMATION_LATIN", label: t("competitionType.FORMATION_LATIN") },
    { value: "SHOW", label: t("competitionType.SHOW") },
  ];

  const SERIES_OPTIONS: { value: Series; label: string }[] = [
    { value: "CZECH_CHAMPIONSHIP", label: t("series.CZECH_CHAMPIONSHIP") },
    { value: "CZECH_CUP", label: t("series.CZECH_CUP") },
    { value: "EXTRALIGA", label: t("series.EXTRALIGA") },
    { value: "LIGA_I", label: t("series.LIGA_I") },
    { value: "LIGA_II", label: t("series.LIGA_II") },
    { value: "GRAND_PRIX", label: t("series.GRAND_PRIX") },
    { value: "OPEN", label: t("series.OPEN") },
    { value: "OTHER", label: t("series.OTHER") },
  ];

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
    const tpl = TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    replace(
      tpl.sections.map((s) => ({
        ...s,
        entryFee: "",
        entryFeeCurrency: "CZK",
        presenceEnd: "",
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
        await sectionsApi.create(createdId!, {
          name: cat.name,
          danceStyle: cat.danceStyle as DanceStyle,
          numberOfJudges: cat.numberOfJudges ?? 5,
          maxFinalPairs: cat.maxFinalPairs ?? 6,
          orderIndex: idx,
          dances: [],
          ageCategory: cat.ageCategory as AgeCategory,
          level: cat.level as Level,
          competitorType: cat.competitorType as CompetitorType | undefined,
          competitionType: cat.competitionType as CompetitionType | undefined,
          series: cat.series as Series | undefined,
          entryFee: fee && !isNaN(fee) ? fee : undefined,
          entryFeeCurrency: fee ? (cat.entryFeeCurrency || "CZK") : undefined,
        });
      } catch {
        failedSections.push(cat.name || `Sekce ${idx + 1}`);
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

    router.push(`/dashboard/competitions/${createdId}`);
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
                <div>
                  <label className={labelCls} htmlFor="description">Popis akce <span className="text-[var(--text-tertiary)] font-normal">(volitelné)</span></label>
                  <textarea
                    id="description"
                    rows={3}
                    placeholder="Krátký popis soutěže pro veřejnou stránku..."
                    className={`${inputCls} resize-none`}
                    {...register("description")}
                  />
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
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {TEMPLATES.map((tpl) => (
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
                    </button>
                  ))}
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

                <div className="flex flex-col gap-4">
                  {fields.map((field, idx) => {
                    const catErrors = (errors.categories as Record<string, unknown>[] | undefined)?.[idx] as Record<string, { message?: string }> | undefined;
                    const judgeCount = watchedCategories[idx]?.numberOfJudges ?? 5;
                    const maj = majority(judgeCount);

                    return (
                      <div
                        key={field.id}
                        className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-secondary)] p-4"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-sm font-medium text-[var(--text-secondary)]">
                            Sekce {idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => remove(idx)}
                            aria-label="Odebrat sekci"
                            className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center -mr-2 text-[var(--text-tertiary)] hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>

                        <div className="flex flex-col gap-3">
                          <div>
                            <label className={labelCls} htmlFor={`cat-${idx}-name`}>{t("newSection.nameLabel")}</label>
                            <input
                              id={`cat-${idx}-name`}
                              placeholder={t("newSection.namePlaceholder")}
                              className={inputCls}
                              {...register(`categories.${idx}.name`)}
                            />
                            {catErrors?.name && (
                              <p className="mt-0.5 text-xs text-red-500">{catErrors.name.message}</p>
                            )}
                          </div>

                          {/* Judges + finals + majority */}
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className={labelCls} htmlFor={`cat-${idx}-judges`}>Rozhodčích</label>
                              <Controller
                                control={control}
                                name={`categories.${idx}.numberOfJudges`}
                                render={({ field: f }) => (
                                  <input
                                    id={`cat-${idx}-judges`}
                                    type="number"
                                    min={1}
                                    max={15}
                                    className={inputCls}
                                    value={f.value ?? 5}
                                    onChange={(e) => f.onChange(Number(e.target.value))}
                                  />
                                )}
                              />
                            </div>
                            <div>
                              <label className={labelCls} htmlFor={`cat-${idx}-finals`}>Max. finále</label>
                              <Controller
                                control={control}
                                name={`categories.${idx}.maxFinalPairs`}
                                render={({ field: f }) => (
                                  <input
                                    id={`cat-${idx}-finals`}
                                    type="number"
                                    min={2}
                                    max={24}
                                    className={inputCls}
                                    value={f.value ?? 6}
                                    onChange={(e) => f.onChange(Number(e.target.value))}
                                  />
                                )}
                              />
                            </div>
                            <div className="flex flex-col justify-end">
                              <div className="flex items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                                <Users className="h-3.5 w-3.5 text-[var(--text-tertiary)]" aria-hidden="true" />
                                <span className="text-xs text-[var(--text-secondary)]">Majorita:</span>
                                <span className="text-sm font-semibold text-[var(--accent)]">{maj}</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className={labelCls} htmlFor={`cat-${idx}-presence`}>Konec prezence</label>
                            <input id={`cat-${idx}-presence`} type="time" className={`${inputCls} w-36`} {...register(`categories.${idx}.presenceEnd`)} />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <SelectField
                              label={t("newSection.ageCategoryLabel")}
                              name={`categories.${idx}.ageCategory`}
                              options={AGE_CATEGORIES}
                              control={control}
                              error={catErrors?.ageCategory?.message}
                            />
                            <SelectField
                              label={t("newSection.levelLabel")}
                              name={`categories.${idx}.level`}
                              options={LEVELS}
                              control={control}
                              error={catErrors?.level?.message}
                              placeholder={t("newSection.levelPlaceholder")}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <SelectField
                              label={t("newSection.danceStyleLabel")}
                              name={`categories.${idx}.danceStyle`}
                              options={DANCE_STYLES}
                              control={control}
                              error={catErrors?.danceStyle?.message}
                              placeholder={t("newSection.danceStylePlaceholder")}
                            />
                            <SelectField
                              label={t("newSection.competitionTypeLabel")}
                              name={`categories.${idx}.competitionType`}
                              options={COMPETITION_TYPES}
                              control={control}
                              placeholder={t("newSection.competitionTypePlaceholder")}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <SelectField
                              label={t("newSection.competitorTypeLabel")}
                              name={`categories.${idx}.competitorType`}
                              options={COMPETITOR_TYPES}
                              control={control}
                              placeholder={t("newSection.competitorTypePlaceholder")}
                            />
                            <SelectField
                              label={t("newSection.seriesLabel")}
                              name={`categories.${idx}.series`}
                              options={SERIES_OPTIONS}
                              control={control}
                              placeholder={t("newSection.seriesPlaceholder")}
                            />
                          </div>

                          {/* Entry fee */}
                          <div className="border-t border-[var(--border)] pt-3">
                            <p className="mb-2 text-xs font-medium text-[var(--text-secondary)]">{t("newSection.entryFeeTitle")}</p>
                            <div className="grid grid-cols-[1fr_100px] gap-3">
                              <Input
                                label={t("newSection.entryFeeLabel")}
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0"
                                {...register(`categories.${idx}.entryFee`)}
                              />
                              <div>
                                <label className={labelCls}>{t("newSection.currencyLabel")}</label>
                                <Controller
                                  control={control}
                                  name={`categories.${idx}.entryFeeCurrency`}
                                  defaultValue="CZK"
                                  render={({ field: f }) => (
                                    <Select onValueChange={f.onChange} value={f.value ?? "CZK"}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {CURRENCIES.map((c) => (
                                          <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() =>
                      append({
                        name: "",
                        ageCategory: "",
                        level: "",
                        danceStyle: "",
                        numberOfJudges: 5,
                        maxFinalPairs: 6,
                        competitorType: "",
                        competitionType: "",
                        series: "",
                        entryFee: "",
                        entryFeeCurrency: "CZK",
                        presenceEnd: "",
                      })
                    }
                    className="flex w-fit cursor-pointer items-center gap-1 text-sm text-[var(--accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 rounded"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Přidat sekci
                  </button>
                </div>
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
