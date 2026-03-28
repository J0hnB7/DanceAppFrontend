"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, ChevronRight, ChevronLeft, Check } from "lucide-react";
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

const categorySchema = z.object({
  name: z.string().min(2, "Minimálně 2 znaky"),
  ageCategory: z.string().min(1, "Povinné"),
  level: z.string().min(1, "Povinné"),
  danceStyle: z.string().min(1, "Povinné"),
  competitorType: z.string().optional(),
  competitionType: z.string().optional(),
  series: z.string().optional(),
  entryFee: z.string().optional(),
  entryFeeCurrency: z.string().optional(),
  presenceEnd: z.string().optional(),
});

const schema = z.object({
  // Step 1
  name: z.string().min(5, "Minimálně 5 znaků"),
  eventDate: z.string().min(1, "Povinné pole"),
  registrationDeadline: z.string().min(1, "Povinné pole"),
  venue: z.string().min(1, "Povinné pole"),
  // Step 2
  categories: z.array(categorySchema).optional(),
});

type FormData = z.infer<typeof schema>;

const STEPS = [
  { n: 1, label: "Základní informace" },
  { n: 2, label: "Logistika a kategorie" },
];

const CURRENCIES = ["CZK", "EUR", "USD", "GBP"];

const inputCls =
  "w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";
const labelCls = "mb-1 block text-sm font-medium text-[var(--text-primary)]";

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
      <label className={labelCls}>{label}</label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select onValueChange={field.onChange} value={field.value ?? ""}>
            <SelectTrigger error={!!error}>
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

export default function NewCompetitionPage() {
  const { t } = useLocale();
  const router = useRouter();
  const create = useCreateCompetition();
  const [step, setStep] = useState(1);
  const [deadlineError, setDeadlineError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    formState: { errors },
    control,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { categories: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "categories" });

  const handleNext = async () => {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSubmit = async (values: any) => {
    setSubmitting(true);
    let createdId: string | null = null;

    // 1. Create competition — if this fails, stop
    try {
      const competition = await create.mutateAsync({
        name: values.name,
        eventDate: values.eventDate,
        venue: values.venue,
        registrationDeadline: values.registrationDeadline,
        federation: "NATIONAL",
        roleMode: "ORGANIZER_ONLY",
      });
      createdId = competition.id;
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // 2. Create sections — best-effort, never block navigation
    for (const [idx, cat] of (values.categories ?? []).entries()) {
      try {
        const fee = cat.entryFee ? parseFloat(cat.entryFee.replace(",", ".")) : undefined;
        await sectionsApi.create(createdId!, {
          name: cat.name,
          danceStyle: cat.danceStyle as DanceStyle,
          numberOfJudges: 5,
          maxFinalPairs: 6,
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
        // ignore individual section errors
      }
    }

    setSubmitting(false);
    router.push(`/dashboard/competitions/${createdId}`);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-xl font-bold text-[var(--text-primary)]">Nová soutěž</h1>

        {/* Step indicator */}
        <div className="mb-8 flex items-center gap-2">
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
                  {s.n < step ? <Check className="h-3 w-3" /> : s.n}
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
                  <label className={labelCls}>Uzávěrka přihlášek</label>
                  <input
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
              </div>
            )}

            {/* ─── Step 2: Logistics + Categories ─── */}
            {step === 2 && (
              <div className="flex flex-col gap-5">
                <h2 className="text-base font-semibold text-[var(--text-primary)]">Logistika a kategorie</h2>

                {/* Categories */}
                <div>
                  <p className="mb-3 text-sm font-medium text-[var(--text-primary)]">Kategorie</p>
                  <div className="flex flex-col gap-4">
                    {fields.map((field, idx) => {
                      const catErrors = (errors.categories as Record<string, unknown>[] | undefined)?.[idx] as Record<string, { message?: string }> | undefined;
                      return (
                        <div
                          key={field.id}
                          className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-secondary)] p-4"
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <span className="text-sm font-medium text-[var(--text-secondary)]">
                              Kategorie {idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => remove(idx)}
                              className="text-[var(--text-tertiary)] hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="flex flex-col gap-3">
                            <div>
                              <label className={labelCls}>{t("newSection.nameLabel")}</label>
                              <input
                                placeholder={t("newSection.namePlaceholder")}
                                className={inputCls}
                                {...register(`categories.${idx}.name`)}
                              />
                              {catErrors?.name && (
                                <p className="mt-0.5 text-xs text-red-500">{catErrors.name.message}</p>
                              )}
                            </div>

                            <div>
                              <label className={labelCls}>Konec prezence</label>
                              <input type="time" className={`${inputCls} w-40`} {...register(`categories.${idx}.presenceEnd`)} />
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
                                    render={({ field }) => (
                                      <Select onValueChange={field.onChange} value={field.value ?? "CZK"}>
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
                          competitorType: "",
                          competitionType: "",
                          series: "",
                          entryFee: "",
                          entryFeeCurrency: "CZK",
                          presenceEnd: "",
                        })
                      }
                      className="flex w-fit items-center gap-1 text-sm text-[var(--accent)] hover:underline"
                    >
                      <Plus className="h-4 w-4" />
                      Přidat kategorii
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="mt-6 flex items-center justify-between border-t border-[var(--border)] pt-4">
              {step > 1 ? (
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  {t("common.back")}
                </Button>
              ) : (
                <div />
              )}
              {step === 1 ? (
                <Button type="button" onClick={handleNext}>
                  Pokračovat
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
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
