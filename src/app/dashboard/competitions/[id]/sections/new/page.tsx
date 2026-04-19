"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { zodResolver } = require("@hookform/resolvers/zod");
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { SectionEditor } from "@/components/shared/section-editor";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCreateSection, useSections } from "@/hooks/queries/use-sections";
import { sectionsApi } from "@/lib/api/sections";
import { useLocale } from "@/contexts/locale-context";
import { toast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/utils";
import type { AgeCategory, Level, DanceStyle, CompetitorType, CompetitionType, Series } from "@/lib/api/sections";

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

const sectionSchema = z.object({
  name: z.string().min(2, "Minimálně 2 znaky"),
  ageCategory: z.string().optional(),
  level: z.string().optional(),
  danceStyle: z.string().optional(),
  numberOfJudges: z.number().int().min(1).max(15).default(5),
  maxFinalPairs: z.number().int().min(2).max(24).default(6),
  competitorType: z.string().optional(),
  competitionType: z.string().optional(),
  series: z.string().optional(),
  singleDanceName: z.string().optional(),
  danceNames: z.array(z.string()).default([]),
  minBirthYear: z.number().nullable().optional(),
  maxBirthYear: z.number().nullable().optional(),
  entryFee: z.string().optional(),
  entryFeeCurrency: z.string().optional(),
  presenceEnd: z.string().optional(),
});

const schema = z.object({
  sections: z.array(sectionSchema),
});

type FormData = z.infer<typeof schema>;

const emptySection = {
  name: "",
  ageCategory: "",
  level: "",
  danceStyle: "",
  numberOfJudges: 5,
  maxFinalPairs: 6,
  competitorType: "",
  competitionType: "",
  series: "",
  singleDanceName: "",
  danceNames: [],
  minBirthYear: null,
  maxBirthYear: null,
  entryFee: "",
  entryFeeCurrency: "CZK",
  presenceEnd: "09:00",
};

export default function NewSectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { t } = useLocale();
  const { data: existingSections } = useSections(id);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { sections: [emptySection] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "sections" });
  const watchedSections = watch("sections");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSubmit = async (values: any) => {
    const baseIndex = existingSections?.length ?? 0;
    for (const [idx, s] of (values.sections ?? []).entries()) {
      try {
        const fee = s.entryFee ? parseFloat(s.entryFee.replace(",", ".")) : undefined;
        const isRichtar = s.danceStyle === "SINGLE_DANCE" || s.danceStyle === "MULTIDANCE";
        const dances = isRichtar
          ? (s.danceStyle === "MULTIDANCE"
              ? (s.danceNames ?? [])
              : s.singleDanceName ? [s.singleDanceName] : [])
          : getDefaultDances(s.danceStyle);
        await sectionsApi.create(id, {
          name: s.name,
          danceStyle: (s.danceStyle || undefined) as DanceStyle | undefined,
          numberOfJudges: s.numberOfJudges ?? 5,
          maxFinalPairs: s.maxFinalPairs ?? 6,
          orderIndex: baseIndex + idx,
          dances,
          ageCategory: isRichtar ? undefined : (s.ageCategory || undefined) as AgeCategory | undefined,
          level: isRichtar ? undefined : (s.level || undefined) as Level | undefined,
          competitorType: isRichtar ? undefined : s.competitorType as CompetitorType | undefined,
          competitionType: isRichtar ? undefined : s.competitionType as CompetitionType | undefined,
          series: isRichtar ? undefined : s.series as Series | undefined,
          entryFee: fee && !isNaN(fee) ? fee : undefined,
          entryFeeCurrency: fee ? (s.entryFeeCurrency || "CZK") : undefined,
          minBirthYear: isRichtar ? (s.minBirthYear ?? null) : undefined,
          maxBirthYear: isRichtar ? (s.maxBirthYear ?? null) : undefined,
        });
      } catch (err: unknown) {
        toast({ title: getErrorMessage(err, t("common.error")), variant: "destructive" });
        return;
      }
    }
    router.push(`/dashboard/competitions/${id}`);
  };

  return (
    <AppShell>
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("common.back")}
      </button>
      <PageHeader title={t("newSection.title")} description={t("newSection.description")} />
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <SectionEditor
                fields={fields}
                append={append}
                remove={remove}
                control={control}
                errors={errors}
                showWizardFields
                fieldArrayName="sections"
                watchedItems={watchedSections}
              />
              <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  {t("newSection.cancel")}
                </Button>
                <Button type="submit" loading={isSubmitting}>
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
