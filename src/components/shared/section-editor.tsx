"use client";

import { Controller } from "react-hook-form";
import type { Control, FieldErrors, FieldArrayWithId } from "react-hook-form";
import { Trash2, Plus, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale } from "@/contexts/locale-context";
import type { AgeCategory, Level, DanceStyle, CompetitorType, CompetitionType, Series } from "@/lib/api/sections";

// ─── Helpers ────────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-base text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";
const labelCls = "mb-1 block text-sm font-medium text-[var(--text-primary)]";
const CURRENCIES = ["CZK", "EUR", "USD", "GBP"];

function majority(n: number): number {
  return Math.floor(n / 2) + 1;
}

// ─── SelectField ─────────────────────────────────────────────────────────────

function SelectField({
  label,
  fieldId,
  fieldName,
  options,
  control,
  error,
  placeholder,
}: {
  label: string;
  fieldId: string;
  fieldName: string;
  options: { value: string; label: string }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any;
  error?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className={labelCls} htmlFor={fieldId}>{label}</label>
      <Controller
        control={control}
        name={fieldName}
        render={({ field }) => (
          <Select onValueChange={field.onChange} value={field.value ?? ""}>
            <SelectTrigger id={fieldId} error={!!error}>
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

// ─── SectionEditor ────────────────────────────────────────────────────────────

export interface SectionEditorProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fields: FieldArrayWithId<any, any, "id">[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  append: (item: any) => void;
  remove: (index: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: FieldErrors<any>;
  /** When false, hides wizard-only fields: entryFee, entryFeeCurrency, presenceEnd. Default: true */
  showWizardFields?: boolean;
  /** The field array name used in the parent form. Default: "categories" */
  fieldArrayName?: string;
  /** Watched values for live majority display */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  watchedItems?: any[];
}

export function SectionEditor({
  fields,
  append,
  remove,
  control,
  errors,
  showWizardFields = true,
  fieldArrayName = "categories",
  watchedItems = [],
}: SectionEditorProps) {
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

  const handleAppend = () =>
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
      presenceEnd: "09:00",
    });

  return (
    <div className="flex flex-col gap-4">
      {fields.map((field, idx) => {
        const catErrors = (errors[fieldArrayName] as Record<string, unknown>[] | undefined)?.[idx] as
          | Record<string, { message?: string }>
          | undefined;
        const judgeCount = watchedItems[idx]?.numberOfJudges ?? 5;
        const maj = majority(judgeCount);

        // Helpers for building field ids and names
        const fId = (key: string) => `${fieldArrayName}-${idx}-${key}`;
        const fName = (key: string) => `${fieldArrayName}.${idx}.${key}`;

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
              {/* Name */}
              <div>
                <label className={labelCls} htmlFor={fId("name")}>
                  {t("newSection.nameLabel")}
                </label>
                <Controller
                  control={control}
                  name={fName("name")}
                  render={({ field: f }) => (
                    <input
                      id={fId("name")}
                      placeholder={t("newSection.namePlaceholder")}
                      className={inputCls}
                      value={f.value ?? ""}
                      onChange={f.onChange}
                    />
                  )}
                />
                {catErrors?.name && (
                  <p className="mt-0.5 text-xs text-red-500">{catErrors.name.message}</p>
                )}
              </div>

              {/* Judges + finals + majority */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls} htmlFor={fId("judges")}>
                    Rozhodčích
                  </label>
                  <Controller
                    control={control}
                    name={fName("numberOfJudges")}
                    render={({ field: f }) => (
                      <input
                        id={fId("judges")}
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
                  <label className={labelCls} htmlFor={fId("finals")}>
                    Max. finále
                  </label>
                  <Controller
                    control={control}
                    name={fName("maxFinalPairs")}
                    render={({ field: f }) => (
                      <input
                        id={fId("finals")}
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

              {/* Wizard-only: presenceEnd */}
              {showWizardFields && (
                <div>
                  <label className={labelCls} htmlFor={fId("presence")}>
                    Konec prezence
                  </label>
                  <Controller
                    control={control}
                    name={fName("presenceEnd")}
                    render={({ field: f }) => (
                      <input
                        id={fId("presence")}
                        type="time"
                        max="11:59"
                        className={`${inputCls} w-36`}
                        value={f.value ?? "09:00"}
                        onChange={f.onChange}
                      />
                    )}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <SelectField
                  label={t("newSection.ageCategoryLabel")}
                  fieldId={fId("ageCategory")}
                  fieldName={fName("ageCategory")}
                  options={AGE_CATEGORIES}
                  control={control}
                  error={catErrors?.ageCategory?.message}
                />
                <SelectField
                  label={t("newSection.levelLabel")}
                  fieldId={fId("level")}
                  fieldName={fName("level")}
                  options={LEVELS}
                  control={control}
                  error={catErrors?.level?.message}
                  placeholder={t("newSection.levelPlaceholder")}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SelectField
                  label={t("newSection.danceStyleLabel")}
                  fieldId={fId("danceStyle")}
                  fieldName={fName("danceStyle")}
                  options={DANCE_STYLES}
                  control={control}
                  error={catErrors?.danceStyle?.message}
                  placeholder={t("newSection.danceStylePlaceholder")}
                />
                <SelectField
                  label={t("newSection.competitionTypeLabel")}
                  fieldId={fId("competitionType")}
                  fieldName={fName("competitionType")}
                  options={COMPETITION_TYPES}
                  control={control}
                  placeholder={t("newSection.competitionTypePlaceholder")}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SelectField
                  label={t("newSection.competitorTypeLabel")}
                  fieldId={fId("competitorType")}
                  fieldName={fName("competitorType")}
                  options={COMPETITOR_TYPES}
                  control={control}
                  placeholder={t("newSection.competitorTypePlaceholder")}
                />
                <SelectField
                  label={t("newSection.seriesLabel")}
                  fieldId={fId("series")}
                  fieldName={fName("series")}
                  options={SERIES_OPTIONS}
                  control={control}
                  placeholder={t("newSection.seriesPlaceholder")}
                />
              </div>

              {/* Wizard-only: entry fee */}
              {showWizardFields && (
                <div className="border-t border-[var(--border)] pt-3">
                  <p className="mb-2 text-xs font-medium text-[var(--text-secondary)]">
                    {t("newSection.entryFeeTitle")}
                  </p>
                  <div className="grid grid-cols-[1fr_100px] gap-3">
                    <Controller
                      control={control}
                      name={fName("entryFee")}
                      render={({ field: f }) => (
                        <Input
                          label={t("newSection.entryFeeLabel")}
                          id={fId("entryFee")}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0"
                          value={f.value ?? ""}
                          onChange={f.onChange}
                        />
                      )}
                    />
                    <div>
                      <label className={labelCls} htmlFor={fId("currency")}>
                        {t("newSection.currencyLabel")}
                      </label>
                      <Controller
                        control={control}
                        name={fName("entryFeeCurrency")}
                        defaultValue="CZK"
                        render={({ field: f }) => (
                          <Select onValueChange={f.onChange} value={f.value ?? "CZK"}>
                            <SelectTrigger id={fId("currency")}>
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
              )}
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={handleAppend}
        className="flex w-fit cursor-pointer items-center gap-1 text-sm text-[var(--accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 rounded"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Přidat sekci
      </button>
    </div>
  );
}
