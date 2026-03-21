"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, ChevronRight, Plus, Trash2, Newspaper, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCreateCompetition } from "@/hooks/queries/use-competitions";
import { sectionsApi } from "@/lib/api/sections";
import apiClient from "@/lib/api-client";
import { toast } from "@/hooks/use-toast";
import { useLocale } from "@/contexts/locale-context";
import type { AgeCategory, Level, DanceStyle, CompetitorType, CompetitionType, Series, SectionDto } from "@/lib/api/sections";
import type { CompetitionNewsItem } from "@/lib/api/competitions";

// ── Schemas ───────────────────────────────────────────────────────────────────

const CURRENCIES = ["CZK", "EUR", "USD"];

// ── Step indicator ────────────────────────────────────────────────────────────
function StepIndicator({ current, steps }: { current: number; steps: string[] }) {
  return (
    <ol className="mb-8 flex items-center gap-0">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                done ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : active ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-[var(--border)] text-[var(--text-tertiary)]"
              )}>
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn(
                "hidden text-xs sm:block",
                active ? "font-medium text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"
              )}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn(
                "mx-2 mb-5 h-px flex-1 transition-colors",
                done ? "bg-[var(--accent)]" : "bg-[var(--border)]"
              )} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ── Section mini-form ─────────────────────────────────────────────────────────
interface SectionMiniFormProps {
  onAdd: (v: SectionForm) => Promise<void>;
  loading: boolean;
  labels: {
    newSectionLabel: string;
    sectionNameLabel: string;
    sectionNamePlaceholder: string;
    sectionNameRequired: string;
    ageCategoryLabel: string;
    ageCategoryPlaceholder: string;
    levelLabel: string;
    levelPlaceholder: string;
    danceStyleLabel: string;
    danceStylePlaceholder: string;
    competitionTypeLabel: string;
    competitionTypePlaceholder: string;
    competitorTypeLabel: string;
    competitorTypePlaceholder: string;
    seriesLabel: string;
    seriesPlaceholder: string;
    entryFeeLabel: string;
    currencyLabel: string;
    addSectionButton: string;
    ageCategories: { value: AgeCategory; label: string }[];
    levels: { value: Level; label: string }[];
    danceStyles: { value: DanceStyle; label: string }[];
    competitorTypes: { value: CompetitorType; label: string }[];
    competitionTypes: { value: CompetitionType; label: string }[];
    seriesOptions: { value: Series; label: string }[];
  };
}

const sectionSchema = z.object({
  name: z.string().min(2),
  ageCategory: z.string().min(1),
  level: z.string().min(1),
  danceStyle: z.string().min(1),
  competitorType: z.string().optional(),
  competitionType: z.string().optional(),
  series: z.string().optional(),
  entryFee: z.string().optional(),
  entryFeeCurrency: z.string().optional(),
});
type SectionForm = z.infer<typeof sectionSchema>;

function SectionMiniForm({ onAdd, loading, labels }: SectionMiniFormProps) {
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<SectionForm>({
    resolver: zodResolver(sectionSchema),
    defaultValues: { entryFeeCurrency: "CZK" },
  });

  const onSubmit = async (v: SectionForm) => {
    await onAdd(v);
    reset({ entryFeeCurrency: "EUR" });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-secondary)] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{labels.newSectionLabel}</p>
      <Input label={labels.sectionNameLabel} placeholder={labels.sectionNamePlaceholder} error={errors.name?.message} {...register("name")} />

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">{labels.ageCategoryLabel}</label>
          <Controller control={control} name="ageCategory" render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger error={!!errors.ageCategory}><SelectValue placeholder={labels.ageCategoryPlaceholder} /></SelectTrigger>
              <SelectContent>{labels.ageCategories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          )} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">{labels.levelLabel}</label>
          <Controller control={control} name="level" render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger error={!!errors.level}><SelectValue placeholder={labels.levelPlaceholder} /></SelectTrigger>
              <SelectContent>{labels.levels.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
            </Select>
          )} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">{labels.danceStyleLabel}</label>
          <Controller control={control} name="danceStyle" render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger error={!!errors.danceStyle}><SelectValue placeholder={labels.danceStylePlaceholder} /></SelectTrigger>
              <SelectContent>{labels.danceStyles.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          )} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">{labels.competitionTypeLabel}</label>
          <Controller control={control} name="competitionType" render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue placeholder={labels.competitionTypePlaceholder} /></SelectTrigger>
              <SelectContent>{labels.competitionTypes.map((ct) => <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>)}</SelectContent>
            </Select>
          )} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">{labels.competitorTypeLabel}</label>
          <Controller control={control} name="competitorType" render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue placeholder={labels.competitorTypePlaceholder} /></SelectTrigger>
              <SelectContent>{labels.competitorTypes.map((ct) => <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>)}</SelectContent>
            </Select>
          )} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">{labels.seriesLabel}</label>
          <Controller control={control} name="series" render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue placeholder={labels.seriesPlaceholder} /></SelectTrigger>
              <SelectContent>{labels.seriesOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          )} />
        </div>
      </div>

      <div className="grid grid-cols-[1fr_100px] gap-3">
        <Input label={labels.entryFeeLabel} type="number" min="0" step="0.01" placeholder="0" {...register("entryFee")} />
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">{labels.currencyLabel}</label>
          <Controller control={control} name="entryFeeCurrency" render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          )} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="sm" loading={loading}>
          <Plus className="h-4 w-4" /> {labels.addSectionButton}
        </Button>
      </div>
    </form>
  );
}

// ── News mini-form ────────────────────────────────────────────────────────────
const newsSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
});
type NewsForm = z.infer<typeof newsSchema>;

interface NewsMiniFormProps {
  onAdd: (v: NewsForm) => Promise<void>;
  loading: boolean;
  labels: {
    newNewsLabel: string;
    newsTitleLabel: string;
    newsTitlePlaceholder: string;
    newsContentLabel: string;
    newsContentPlaceholder: string;
    addNewsButton: string;
  };
}

function NewsMiniForm({ onAdd, loading, labels }: NewsMiniFormProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<NewsForm>({ resolver: zodResolver(newsSchema) });

  const onSubmit = async (v: NewsForm) => {
    await onAdd(v);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-secondary)] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{labels.newNewsLabel}</p>
      <Input label={labels.newsTitleLabel} placeholder={labels.newsTitlePlaceholder} error={errors.title?.message} {...register("title")} />
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">{labels.newsContentLabel}</label>
        <textarea
          className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          rows={3}
          placeholder={labels.newsContentPlaceholder}
          {...register("content")}
        />
        {errors.content && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.content.message}</p>}
      </div>
      <div className="flex justify-end">
        <Button type="submit" size="sm" loading={loading}>
          <Plus className="h-4 w-4" /> {labels.addNewsButton}
        </Button>
      </div>
    </form>
  );
}

// ── Wizard ────────────────────────────────────────────────────────────────────
export function CompetitionWizard() {
  const [step, setStep] = useState(0);
  const [competitionId, setCompetitionId] = useState<string | null>(null);
  const [sections, setSections] = useState<SectionDto[]>([]);
  const [news, setNews] = useState<CompetitionNewsItem[]>([]);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [newsLoading, setNewsLoading] = useState(false);
  const [creatingComp, setCreatingComp] = useState(false);

  const router = useRouter();
  const create = useCreateCompetition();
  const { t } = useLocale();

  const STEPS = [
    t("wizard.step0Label"),
    t("wizard.step1Label"),
    t("wizard.step2Label"),
    t("wizard.step3Label"),
  ];

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
    { value: "HOBBY", label: t("level.HOBBY") },
    { value: "CHAMPIONSHIP", label: t("level.CHAMPIONSHIP") },
    { value: "OPEN", label: t("level.OPEN") },
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

  const fullSchema = z.object({
    name: z.string().min(3, t("wizard.nameRequired")),
    description: z.string().optional(),
    venue: z.string().min(2, t("wizard.venueRequired")),
    startDate: z.string().min(1, t("wizard.startDateRequired")),
    endDate: z.string().min(1, t("wizard.endDateRequired")),
    registrationDeadline: z.string().optional(),
  }).refine((v) => !v.endDate || v.endDate >= v.startDate, {
    message: t("wizard.endDateOrder"),
    path: ["endDate"],
  });

  type WizardForm = z.infer<typeof fullSchema>;

  const { register, control, handleSubmit, trigger, formState: { errors } } = useForm<WizardForm>({
    resolver: zodResolver(fullSchema),
    mode: "onTouched",
  });

  const nextStep = async () => {
    if (step < 2) {
      const fields = getFieldsForStep(step);
      const valid = await trigger(fields as (keyof WizardForm)[]);
      if (!valid) return;
    }

    if (step === 1) {
      await handleSubmit(async (values) => {
        setCreatingComp(true);
        try {
          const competition = await create.mutateAsync({
            name: values.name,
            description: values.description,
            venue: values.venue,
            eventDate: values.startDate,
            registrationDeadline: values.registrationDeadline || undefined,
          });
          setCompetitionId(competition.id);
          setStep(2);
        } catch {
          toast({ title: t("wizard.createFailed"), variant: "destructive" } as Parameters<typeof toast>[0]);
        } finally {
          setCreatingComp(false);
        }
      })();
      return;
    }

    setStep((s) => s + 1);
  };

  const addSection = async (v: SectionForm) => {
    if (!competitionId) return;
    setSectionLoading(true);
    try {
      const fee = v.entryFee ? parseFloat(v.entryFee) : undefined;
      const section = await sectionsApi.create(competitionId, {
        name: v.name,
        ageCategory: v.ageCategory as AgeCategory,
        level: v.level as Level,
        danceStyle: v.danceStyle as DanceStyle,
        competitorType: v.competitorType as CompetitorType | undefined,
        competitionType: v.competitionType as CompetitionType | undefined,
        series: v.series as Series | undefined,
        entryFee: fee && !isNaN(fee) ? fee : undefined,
        entryFeeCurrency: fee ? (v.entryFeeCurrency || "CZK") : undefined,
      });
      setSections((prev) => [...prev, section]);
    } catch {
      toast({ title: t("wizard.addSectionFailed"), variant: "destructive" } as Parameters<typeof toast>[0]);
    } finally {
      setSectionLoading(false);
    }
  };

  const removeSection = async (sectionId: string) => {
    if (!competitionId) return;
    try {
      await sectionsApi.delete(competitionId, sectionId);
      setSections((prev) => prev.filter((s) => s.id !== sectionId));
    } catch {
      toast({ title: t("wizard.removeSectionFailed"), variant: "destructive" } as Parameters<typeof toast>[0]);
    }
  };

  const addNews = async (v: NewsForm) => {
    if (!competitionId) return;
    setNewsLoading(true);
    try {
      const item = await apiClient.post<CompetitionNewsItem>(`/competitions/${competitionId}/news`, v).then((r) => r.data);
      setNews((prev) => [...prev, item]);
    } catch {
      toast({ title: t("wizard.addNewsFailed"), variant: "destructive" } as Parameters<typeof toast>[0]);
    } finally {
      setNewsLoading(false);
    }
  };

  const removeNews = async (newsId: string) => {
    if (!competitionId) return;
    try {
      await apiClient.delete(`/competitions/${competitionId}/news/${newsId}`);
      setNews((prev) => prev.filter((n) => n.id !== newsId));
    } catch {
      toast({ title: t("wizard.removeNewsFailed"), variant: "destructive" } as Parameters<typeof toast>[0]);
    }
  };

  const finish = () => {
    toast({ title: t("wizard.created"), variant: "success" } as Parameters<typeof toast>[0]);
    router.push(`/dashboard/competitions/${competitionId}?new=1`);
  };

  const sectionLabels = {
    newSectionLabel: t("wizard.newSectionLabel"),
    sectionNameLabel: t("wizard.sectionNameLabel"),
    sectionNamePlaceholder: t("wizard.sectionNamePlaceholder"),
    sectionNameRequired: t("wizard.sectionNameRequired"),
    ageCategoryLabel: t("wizard.ageCategoryLabel"),
    ageCategoryPlaceholder: t("wizard.ageCategoryPlaceholder"),
    levelLabel: t("wizard.levelLabel"),
    levelPlaceholder: t("wizard.levelPlaceholder"),
    danceStyleLabel: t("wizard.danceStyleLabel"),
    danceStylePlaceholder: t("wizard.danceStylePlaceholder"),
    competitionTypeLabel: t("wizard.competitionTypeLabel"),
    competitionTypePlaceholder: t("wizard.competitionTypePlaceholder"),
    competitorTypeLabel: t("wizard.competitorTypeLabel"),
    competitorTypePlaceholder: t("wizard.competitorTypePlaceholder"),
    seriesLabel: t("wizard.seriesLabel"),
    seriesPlaceholder: t("wizard.seriesPlaceholder"),
    entryFeeLabel: t("wizard.entryFeeLabel"),
    currencyLabel: t("wizard.currencyLabel"),
    addSectionButton: t("wizard.addSectionButton"),
    ageCategories: AGE_CATEGORIES,
    levels: LEVELS,
    danceStyles: DANCE_STYLES,
    competitorTypes: COMPETITOR_TYPES,
    competitionTypes: COMPETITION_TYPES,
    seriesOptions: SERIES_OPTIONS,
  };

  const newsLabels = {
    newNewsLabel: t("wizard.newNewsLabel"),
    newsTitleLabel: t("wizard.newsTitleLabel"),
    newsTitlePlaceholder: t("wizard.newsTitlePlaceholder"),
    newsContentLabel: t("wizard.newsContentLabel"),
    newsContentPlaceholder: t("wizard.newsContentPlaceholder"),
    addNewsButton: t("wizard.addNewsButton"),
  };

  return (
    <div className="mx-auto max-w-xl">
      <StepIndicator current={step} steps={STEPS} />

      {/* Steps 0-1: basic form */}
      {step <= 1 && (
        <form onSubmit={(e) => e.preventDefault()}>
          {step === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("wizard.step0Title")}</CardTitle>
                <CardDescription>{t("wizard.step0Desc")}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Input label={t("wizard.nameLabel")} placeholder={t("wizard.namePlaceholder")}
                  error={errors.name?.message} {...register("name")} />
                <Input label={t("wizard.venueLabel")} placeholder={t("wizard.venuePlaceholder")}
                  error={errors.venue?.message} {...register("venue")} />
                <Input label={t("wizard.descriptionLabel")} placeholder={t("wizard.descriptionPlaceholder")}
                  error={errors.description?.message} {...register("description")} />
              </CardContent>
            </Card>
          )}

          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("wizard.step1Title")}</CardTitle>
                <CardDescription>{t("wizard.step1Desc")}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Input label={t("wizard.startDateLabel")} type="date"
                  error={errors.startDate?.message} {...register("startDate")} />
                <Input label={t("wizard.endDateLabel")} type="date"
                  error={errors.endDate?.message} {...register("endDate")} />
                <Input label={t("wizard.registrationDeadlineLabel")} type="date"
                  error={errors.registrationDeadline?.message} {...register("registrationDeadline")} />
              </CardContent>
            </Card>
          )}
        </form>
      )}

      {/* Step 2: Sections */}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-[var(--accent)]" /> {t("wizard.step2Title")}
              </CardTitle>
              <CardDescription>
                {t("wizard.step2Desc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {sections.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {sections.map((s) => (
                    <li key={s.id} className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{s.name}</p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          {s.ageCategory} · {s.level} · {s.danceStyle}
                          {s.entryFee ? ` · ${s.entryFee} ${s.entryFeeCurrency}` : ""}
                        </p>
                      </div>
                      <button type="button" onClick={() => removeSection(s.id)}
                        className="ml-3 text-[var(--text-tertiary)] hover:text-[var(--destructive)]">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <SectionMiniForm onAdd={addSection} loading={sectionLoading} labels={sectionLabels} />
            </CardContent>
          </Card>
          {sections.length === 0 && (
            <p className="text-center text-xs text-[var(--text-tertiary)]">
              {t("wizard.noSectionsHint")}
            </p>
          )}
        </div>
      )}

      {/* Step 3: News */}
      {step === 3 && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Newspaper className="h-5 w-5 text-[var(--accent)]" /> {t("wizard.step3Title")}
              </CardTitle>
              <CardDescription>
                {t("wizard.step3Desc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {news.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {news.map((n) => (
                    <li key={n.id} className="flex items-start justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{n.title}</p>
                        <p className="truncate text-xs text-[var(--text-tertiary)]">{n.content}</p>
                      </div>
                      <button type="button" onClick={() => removeNews(n.id)}
                        className="ml-3 shrink-0 text-[var(--text-tertiary)] hover:text-[var(--destructive)]">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <NewsMiniForm onAdd={addNews} loading={newsLoading} labels={newsLabels} />
            </CardContent>
          </Card>
          {sections.length > 0 && (
            <div className="flex flex-wrap gap-1.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-2">
              <span className="text-xs text-[var(--text-tertiary)]">{t("wizard.sectionsLabel")}</span>
              {sections.map((s) => (
                <Badge key={s.id} variant="secondary" className="text-xs">{s.name}</Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <Button type="button" variant="outline"
          onClick={() => step === 0 ? router.back() : setStep((s) => s - 1)}
          disabled={step >= 2}>
          {step === 0 ? t("wizard.cancelButton") : t("wizard.backButton")}
        </Button>

        {step < 2 && (
          <Button type="button" onClick={nextStep} loading={step === 1 ? creatingComp : false}>
            {step === 1 ? t("wizard.createCompetition") : t("wizard.continueButton")} <ChevronRight className="h-4 w-4" />
          </Button>
        )}
        {step === 2 && (
          <Button type="button" onClick={() => setStep(3)}>
            {t("wizard.continueButton")} <ChevronRight className="h-4 w-4" />
          </Button>
        )}
        {step === 3 && (
          <Button type="button" onClick={finish}>
            {t("wizard.finishButton")} <Check className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function getFieldsForStep(step: number): string[] {
  if (step === 0) return ["name", "venue", "description"];
  if (step === 1) return ["startDate", "endDate", "registrationDeadline"];
  return [];
}
