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
import type { AgeCategory, Level, DanceStyle, SectionDto } from "@/lib/api/sections";
import type { CompetitionNewsItem } from "@/lib/api/competitions";

// ── Schemas ───────────────────────────────────────────────────────────────────
const step1Schema = z.object({
  name: z.string().min(3, "Název musí mít alespoň 3 znaky"),
  description: z.string().optional(),
  location: z.string().min(2, "Místo je povinné"),
});

const step2BaseSchema = z.object({
  startDate: z.string().min(1, "Datum zahájení je povinné"),
  endDate: z.string().min(1, "Datum ukončení je povinné"),
  registrationDeadline: z.string().optional(),
});

const step3Schema = z.object({
  maxPairs: z.string().optional(),
  numberOfRounds: z.string().min(1, "Vyberte počet kol"),
});

const fullSchema = step1Schema
  .merge(step2BaseSchema)
  .merge(step3Schema)
  .refine((v) => !v.endDate || v.endDate >= v.startDate, {
    message: "Datum ukončení musí být stejné nebo pozdější než zahájení",
    path: ["endDate"],
  });

type WizardForm = z.infer<typeof fullSchema>;

// Section mini-form schema
const sectionSchema = z.object({
  name: z.string().min(2, "Název je povinný"),
  ageCategory: z.string().min(1, "Povinné"),
  level: z.string().min(1, "Povinné"),
  danceStyle: z.string().min(1, "Povinné"),
  entryFee: z.string().optional(),
  entryFeeCurrency: z.string().optional(),
});
type SectionForm = z.infer<typeof sectionSchema>;

// News mini-form schema
const newsSchema = z.object({
  title: z.string().min(1, "Název je povinný"),
  content: z.string().min(1, "Obsah je povinný"),
});
type NewsForm = z.infer<typeof newsSchema>;

// ── Constants ─────────────────────────────────────────────────────────────────
const AGE_CATEGORIES: { value: AgeCategory; label: string }[] = [
  { value: "CHILDREN", label: "Děti" },
  { value: "JUNIOR_I", label: "Junioři I" },
  { value: "JUNIOR_II", label: "Junioři II" },
  { value: "YOUTH", label: "Mládež" },
  { value: "ADULT", label: "Dospělí" },
  { value: "SENIOR_I", label: "Senioři I" },
  { value: "SENIOR_II", label: "Senioři II" },
];

const LEVELS: { value: Level; label: string }[] = [
  { value: "D", label: "D" }, { value: "C", label: "C" }, { value: "B", label: "B" },
  { value: "A", label: "A" }, { value: "S", label: "S" }, { value: "OPEN", label: "Open" },
];

const DANCE_STYLES: { value: DanceStyle; label: string }[] = [
  { value: "STANDARD", label: "Standard" },
  { value: "LATIN", label: "Latin" },
  { value: "COMBINATION", label: "Kombinace" },
];

const CURRENCIES = ["EUR", "CZK", "USD"];

const STEPS = ["Základní info", "Termíny", "Kapacita", "Kategorie", "Aktuality"];

// ── Step indicator ────────────────────────────────────────────────────────────
function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="mb-8 flex items-center gap-0">
      {STEPS.map((label, i) => {
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
            {i < STEPS.length - 1 && (
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
function SectionMiniForm({ onAdd, loading }: { onAdd: (v: SectionForm) => Promise<void>; loading: boolean }) {
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<SectionForm>({
    resolver: zodResolver(sectionSchema),
    defaultValues: { entryFeeCurrency: "EUR" },
  });

  const onSubmit = async (v: SectionForm) => {
    await onAdd(v);
    reset({ entryFeeCurrency: "EUR" });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-secondary)] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Nová kategorie</p>
      <Input label="Název" placeholder="Adult Standard A" error={errors.name?.message} {...register("name")} />

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Věková kat.</label>
          <Controller control={control} name="ageCategory" render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger error={!!errors.ageCategory}><SelectValue placeholder="Věk" /></SelectTrigger>
              <SelectContent>{AGE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          )} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Třída</label>
          <Controller control={control} name="level" render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger error={!!errors.level}><SelectValue placeholder="Třída" /></SelectTrigger>
              <SelectContent>{LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
            </Select>
          )} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Styl</label>
          <Controller control={control} name="danceStyle" render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger error={!!errors.danceStyle}><SelectValue placeholder="Styl" /></SelectTrigger>
              <SelectContent>{DANCE_STYLES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          )} />
        </div>
      </div>

      <div className="grid grid-cols-[1fr_100px] gap-3">
        <Input label="Startovné" type="number" min="0" step="0.01" placeholder="0" {...register("entryFee")} />
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Měna</label>
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
          <Plus className="h-4 w-4" /> Přidat kategorii
        </Button>
      </div>
    </form>
  );
}

// ── News mini-form ────────────────────────────────────────────────────────────
function NewsMiniForm({ onAdd, loading }: { onAdd: (v: NewsForm) => Promise<void>; loading: boolean }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<NewsForm>({ resolver: zodResolver(newsSchema) });

  const onSubmit = async (v: NewsForm) => {
    await onAdd(v);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-secondary)] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Nová aktualita</p>
      <Input label="Nadpis" placeholder="Důležitá informace pro účastníky" error={errors.title?.message} {...register("title")} />
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Obsah</label>
        <textarea
          className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          rows={3}
          placeholder="Text aktuality..."
          {...register("content")}
        />
        {errors.content && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.content.message}</p>}
      </div>
      <div className="flex justify-end">
        <Button type="submit" size="sm" loading={loading}>
          <Plus className="h-4 w-4" /> Přidat aktualitu
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

  const { register, control, handleSubmit, trigger, formState: { errors } } = useForm<WizardForm>({
    resolver: zodResolver(fullSchema),
    mode: "onTouched",
  });

  // Steps 0-2: validate fields and advance; step 2→3 creates the competition
  const nextStep = async () => {
    if (step < 3) {
      const fields = getFieldsForStep(step);
      const valid = await trigger(fields as (keyof WizardForm)[]);
      if (!valid) return;
    }

    if (step === 2) {
      // Create competition before entering step 3
      await handleSubmit(async (values) => {
        setCreatingComp(true);
        try {
          const competition = await create.mutateAsync({
            name: values.name,
            description: values.description,
            location: values.location,
            startDate: values.startDate,
            endDate: values.endDate,
            registrationDeadline: values.registrationDeadline || undefined,
            maxPairs: values.maxPairs ? Number(values.maxPairs) : undefined,
            numberOfRounds: Number(values.numberOfRounds) || 2,
          });
          setCompetitionId(competition.id);
          setStep(3);
        } catch {
          toast({ title: "Nepodařilo se vytvořit soutěž", variant: "destructive" } as Parameters<typeof toast>[0]);
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
        entryFee: fee && !isNaN(fee) ? fee : undefined,
        entryFeeCurrency: fee ? (v.entryFeeCurrency || "EUR") : undefined,
      });
      setSections((prev) => [...prev, section]);
    } catch {
      toast({ title: "Nepodařilo se přidat kategorii", variant: "destructive" } as Parameters<typeof toast>[0]);
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
      toast({ title: "Nepodařilo se odebrat kategorii", variant: "destructive" } as Parameters<typeof toast>[0]);
    }
  };

  const addNews = async (v: NewsForm) => {
    if (!competitionId) return;
    setNewsLoading(true);
    try {
      const item = await apiClient.post<CompetitionNewsItem>(`/competitions/${competitionId}/news`, v).then((r) => r.data);
      setNews((prev) => [...prev, item]);
    } catch {
      toast({ title: "Nepodařilo se přidat aktualitu", variant: "destructive" } as Parameters<typeof toast>[0]);
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
      toast({ title: "Nepodařilo se odebrat aktualitu", variant: "destructive" } as Parameters<typeof toast>[0]);
    }
  };

  const finish = () => {
    toast({ title: "Soutěž vytvořena!", variant: "success" } as Parameters<typeof toast>[0]);
    router.push(`/dashboard/competitions/${competitionId}?new=1`);
  };

  return (
    <div className="mx-auto max-w-xl">
      <StepIndicator current={step} />

      {/* Steps 0-2: basic form */}
      {step <= 2 && (
        <form onSubmit={(e) => e.preventDefault()}>
          {step === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Základní informace</CardTitle>
                <CardDescription>Název a místo konání soutěže</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Input label="Název soutěže" placeholder="Slovak Open 2026"
                  error={errors.name?.message} {...register("name")} />
                <Input label="Místo konání" placeholder="Bratislava, Incheba Expo"
                  error={errors.location?.message} {...register("location")} />
                <Input label="Popis (volitelné)" placeholder="Krátký popis..."
                  error={errors.description?.message} {...register("description")} />
              </CardContent>
            </Card>
          )}

          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Termíny</CardTitle>
                <CardDescription>Kdy se soutěž koná?</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Input label="Datum zahájení" type="date"
                  error={errors.startDate?.message} {...register("startDate")} />
                <Input label="Datum ukončení" type="date"
                  error={errors.endDate?.message} {...register("endDate")} />
                <Input label="Uzávěrka přihlášek (volitelné)" type="date"
                  error={errors.registrationDeadline?.message} {...register("registrationDeadline")} />
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Kapacita a kola</CardTitle>
                <CardDescription>Nastavte limity a strukturu soutěže</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    Počet kol <span className="text-[var(--destructive)]">*</span>
                  </label>
                  <Controller control={control} name="numberOfRounds" render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Vyberte počet kol" /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n} {n === 1 ? "kolo" : n < 5 ? "kola" : "kol"}
                            {n === 1 && " (pouze finále)"}
                            {n === 2 && " (předkolo + finále)"}
                            {n === 3 && " (předkolo + semifinále + finále)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )} />
                  {errors.numberOfRounds && (
                    <p className="text-xs text-[var(--destructive)]">{errors.numberOfRounds.message}</p>
                  )}
                </div>
                <Input label="Max počet párů (prázdné = bez limitu)" type="number" min={1}
                  placeholder="např. 200" error={errors.maxPairs?.message} {...register("maxPairs")} />
              </CardContent>
            </Card>
          )}
        </form>
      )}

      {/* Step 3: Kategorie */}
      {step === 3 && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-[var(--accent)]" /> Kategorie
              </CardTitle>
              <CardDescription>
                Přidejte soutěžní kategorie. Kategorie můžete přidávat i kdykoli později.
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
              <SectionMiniForm onAdd={addSection} loading={sectionLoading} />
            </CardContent>
          </Card>
          {sections.length === 0 && (
            <p className="text-center text-xs text-[var(--text-tertiary)]">
              Nemáte žádné kategorie. Můžete je přeskočit a přidat later.
            </p>
          )}
        </div>
      )}

      {/* Step 4: Aktuality */}
      {step === 4 && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Newspaper className="h-5 w-5 text-[var(--accent)]" /> Aktuality
              </CardTitle>
              <CardDescription>
                Přidejte aktuality pro účastníky. Lze přidat i kdykoliv později.
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
              <NewsMiniForm onAdd={addNews} loading={newsLoading} />
            </CardContent>
          </Card>
          {sections.length > 0 && (
            <div className="flex flex-wrap gap-1.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-2">
              <span className="text-xs text-[var(--text-tertiary)]">Kategorie:</span>
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
          disabled={step >= 3 && step < 4 /* can't go back after creating */ || false}>
          {step === 0 ? "Zrušit" : "Zpět"}
        </Button>

        {step < 3 && (
          <Button type="button" onClick={nextStep} loading={step === 2 ? creatingComp : false}>
            {step === 2 ? "Vytvořit soutěž" : "Pokračovat"} <ChevronRight className="h-4 w-4" />
          </Button>
        )}
        {step === 3 && (
          <Button type="button" onClick={() => setStep(4)}>
            Pokračovat <ChevronRight className="h-4 w-4" />
          </Button>
        )}
        {step === 4 && (
          <Button type="button" onClick={finish}>
            Dokončit <Check className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function getFieldsForStep(step: number): string[] {
  if (step === 0) return ["name", "location", "description"];
  if (step === 1) return ["startDate", "endDate", "registrationDeadline"];
  if (step === 2) return ["numberOfRounds", "maxPairs"];
  return [];
}
