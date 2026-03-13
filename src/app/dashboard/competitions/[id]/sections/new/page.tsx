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
import { useCreateSection } from "@/hooks/queries/use-sections";
import { Controller } from "react-hook-form";
import type { AgeCategory, Level, DanceStyle } from "@/lib/api/sections";

const schema = z.object({
  name: z.string().min(2, "Name required"),
  ageCategory: z.string().min(1, "Required"),
  level: z.string().min(1, "Required"),
  danceStyle: z.string().min(1, "Required"),
  entryFee: z.string().optional(),
  entryFeeCurrency: z.string().optional(),
  paymentInfo: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const AGE_CATEGORIES: { value: AgeCategory; label: string }[] = [
  { value: "CHILDREN", label: "Children" },
  { value: "JUNIOR_I", label: "Junior I" },
  { value: "JUNIOR_II", label: "Junior II" },
  { value: "YOUTH", label: "Youth" },
  { value: "ADULT", label: "Adult" },
  { value: "SENIOR_I", label: "Senior I" },
  { value: "SENIOR_II", label: "Senior II" },
];

const LEVELS: { value: Level; label: string }[] = [
  { value: "D", label: "D" },
  { value: "C", label: "C" },
  { value: "B", label: "B" },
  { value: "A", label: "A" },
  { value: "S", label: "S" },
  { value: "OPEN", label: "Open" },
];

const DANCE_STYLES: { value: DanceStyle; label: string }[] = [
  { value: "STANDARD", label: "Standard" },
  { value: "LATIN", label: "Latin" },
  { value: "COMBINATION", label: "Combination" },
];

const CURRENCIES = ["EUR", "CZK", "USD", "GBP"];

export default function NewSectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const createSection = useCreateSection(id);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { entryFeeCurrency: "EUR" },
  });

  const entryFeeValue = watch("entryFee") as string | undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSubmit = async (values: any) => {
    const fee = values.entryFee ? parseFloat(values.entryFee) : undefined;
    await createSection.mutateAsync({
      name: values.name,
      ageCategory: values.ageCategory as AgeCategory,
      level: values.level as Level,
      danceStyle: values.danceStyle as DanceStyle,
      entryFee: fee && !isNaN(fee) ? fee : undefined,
      entryFeeCurrency: fee ? (values.entryFeeCurrency || "EUR") : undefined,
      paymentInfo: values.paymentInfo || undefined,
    });
    router.push(`/dashboard/competitions/${id}`);
  };

  return (
    <AppShell>
      <PageHeader title="New section" description="Add a competitive section to this competition" />
      <div className="mx-auto max-w-lg">
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <Input
                label="Section name"
                placeholder="e.g. Children C Standard"
                error={errors.name?.message}
                {...register("name")}
              />

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                  Age category
                </label>
                <Controller
                  control={control}
                  name="ageCategory"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger error={!!errors.ageCategory}>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {AGE_CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.ageCategory && (
                  <p className="mt-1 text-xs text-[var(--destructive)]">{errors.ageCategory.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                    Level
                  </label>
                  <Controller
                    control={control}
                    name="level"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger error={!!errors.level}>
                          <SelectValue placeholder="Level" />
                        </SelectTrigger>
                        <SelectContent>
                          {LEVELS.map((l) => (
                            <SelectItem key={l.value} value={l.value}>
                              {l.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                    Dance style
                  </label>
                  <Controller
                    control={control}
                    name="danceStyle"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger error={!!errors.danceStyle}>
                          <SelectValue placeholder="Style" />
                        </SelectTrigger>
                        <SelectContent>
                          {DANCE_STYLES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              {/* Entry fee */}
              <div className="border-t border-[var(--border)] pt-4">
                <p className="mb-3 text-sm font-medium text-[var(--text-primary)]">Startovné</p>
                <div className="grid grid-cols-[1fr_120px] gap-3">
                  <Input
                    label="Cena za přihlášení"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    error={errors.entryFee?.message}
                    {...register("entryFee")}
                  />
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                      Měna
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

              {/* Payment info — shown when entry fee is set */}
              {!!entryFeeValue && parseFloat(entryFeeValue) > 0 && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                    Platební údaje
                  </label>
                  <textarea
                    className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                    rows={4}
                    placeholder="Číslo účtu, IBAN, poznámka k platbě, variabilní symbol..."
                    {...register("paymentInfo")}
                  />
                  <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                    Tyto údaje uvidí páry po přihlášení do sekce.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button type="submit" loading={createSection.isPending}>
                  Create section
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
