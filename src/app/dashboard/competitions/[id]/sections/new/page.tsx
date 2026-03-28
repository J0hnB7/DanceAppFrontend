"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateSection, useSections } from "@/hooks/queries/use-sections";
import { Controller } from "react-hook-form";
import type { AgeCategory, Level, DanceStyle, CompetitorType, CompetitionType, Series } from "@/lib/api/sections";
import { useLocale } from "@/contexts/locale-context";
import { getErrorMessage } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

const schema = z.object({
  name: z.string().min(2),
  ageCategory: z.string().min(1),
  level: z.string().min(1),
  danceStyle: z.string().min(1),
  competitorType: z.string().optional(),
  competitionType: z.string().optional(),
  series: z.string().optional(),
  entryFee: z.string().optional(),
  entryFeeCurrency: z.string().optional(),
  paymentInfo: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const CURRENCIES = ["CZK", "EUR", "USD", "GBP"];

function SelectField<T extends string>({
  label,
  name,
  options,
  control,
  error,
  placeholder,
}: {
  label: string;
  name: string;
  options: { value: T; label: string }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any;
  error?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">{label}</label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select onValueChange={field.onChange} value={field.value}>
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

export default function NewSectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const createSection = useCreateSection(id);
  const { data: existingSections } = useSections(id);
  const { t } = useLocale();

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
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { entryFeeCurrency: "CZK" },
  });

  const entryFeeValue = watch("entryFee") as string | undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSubmit = async (values: any) => {
    const fee = values.entryFee ? parseFloat(values.entryFee) : undefined;
    try {
      await createSection.mutateAsync({
        name: values.name,
        numberOfJudges: 5,
        maxFinalPairs: 6,
        orderIndex: existingSections?.length ?? 0,
        dances: [],
        ageCategory: values.ageCategory as AgeCategory,
        level: values.level as Level,
        danceStyle: values.danceStyle as DanceStyle,
        competitorType: values.competitorType as CompetitorType | undefined,
        competitionType: values.competitionType as CompetitionType | undefined,
        series: values.series as Series | undefined,
        entryFee: fee && !isNaN(fee) ? fee : undefined,
        entryFeeCurrency: fee ? (values.entryFeeCurrency || "CZK") : undefined,
        paymentInfo: values.paymentInfo || undefined,
      });
    } catch (err: unknown) {
      const msg = getErrorMessage(err, t("common.error"));
      toast({ title: msg, variant: "destructive" });
      return;
    }
    router.push(`/dashboard/competitions/${id}`);
  };

  return (
    <AppShell>
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("common.back")}
      </button>
      <PageHeader title={t("newSection.title")} description={t("newSection.description")} />
      <div className="mx-auto max-w-lg">
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <Input
                label={t("newSection.nameLabel")}
                placeholder={t("newSection.namePlaceholder")}
                error={errors.name?.message}
                {...register("name")}
              />

              {/* Row 1: Age category + Level */}
              <div className="grid grid-cols-2 gap-4">
                <SelectField
                  label={t("newSection.ageCategoryLabel")}
                  name="ageCategory"
                  options={AGE_CATEGORIES}
                  control={control}
                  error={errors.ageCategory?.message}
                  placeholder={t("newSection.ageCategoryPlaceholder")}
                />
                <SelectField
                  label={t("newSection.levelLabel")}
                  name="level"
                  options={LEVELS}
                  control={control}
                  error={errors.level?.message}
                  placeholder={t("newSection.levelPlaceholder")}
                />
              </div>

              {/* Row 2: Dance style + Competition type */}
              <div className="grid grid-cols-2 gap-4">
                <SelectField
                  label={t("newSection.danceStyleLabel")}
                  name="danceStyle"
                  options={DANCE_STYLES}
                  control={control}
                  error={errors.danceStyle?.message}
                  placeholder={t("newSection.danceStylePlaceholder")}
                />
                <SelectField
                  label={t("newSection.competitionTypeLabel")}
                  name="competitionType"
                  options={COMPETITION_TYPES}
                  control={control}
                  placeholder={t("newSection.competitionTypePlaceholder")}
                />
              </div>

              {/* Row 3: Competitor type + Series */}
              <div className="grid grid-cols-2 gap-4">
                <SelectField
                  label={t("newSection.competitorTypeLabel")}
                  name="competitorType"
                  options={COMPETITOR_TYPES}
                  control={control}
                  placeholder={t("newSection.competitorTypePlaceholder")}
                />
                <SelectField
                  label={t("newSection.seriesLabel")}
                  name="series"
                  options={SERIES_OPTIONS}
                  control={control}
                  placeholder={t("newSection.seriesPlaceholder")}
                />
              </div>

              {/* Entry fee */}
              <div className="border-t border-[var(--border)] pt-4">
                <p className="mb-3 text-sm font-medium text-[var(--text-primary)]">{t("newSection.entryFeeTitle")}</p>
                <div className="grid grid-cols-[1fr_120px] gap-3">
                  <Input
                    label={t("newSection.entryFeeLabel")}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    error={errors.entryFee?.message}
                    {...register("entryFee")}
                  />
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                      {t("newSection.currencyLabel")}
                    </label>
                    <Controller
                      control={control}
                      name="entryFeeCurrency"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
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

              {/* Payment info */}
              {!!entryFeeValue && parseFloat(entryFeeValue) > 0 && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                    {t("newSection.paymentInfoLabel")}
                  </label>
                  <textarea
                    className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                    rows={4}
                    placeholder={t("newSection.paymentInfoPlaceholder")}
                    {...register("paymentInfo")}
                  />
                  <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                    {t("newSection.paymentInfoHint")}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  {t("newSection.cancel")}
                </Button>
                <Button type="submit" loading={createSection.isPending}>
                  {t("newSection.submit")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
