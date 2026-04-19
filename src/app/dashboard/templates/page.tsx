"use client";

import axios from "axios";
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { zodResolver } = require("@hookform/resolvers/zod");
import { z } from "zod";
import { Pencil, Trash2, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { SectionEditor } from "@/components/shared/section-editor";
import { useAllCompetitionTemplates } from "@/hooks/queries/use-competition-templates";
import { competitionTemplatesApi } from "@/lib/api/competition-templates";
import type { CompetitionTemplate } from "@/lib/api/competition-templates";
import { toast } from "@/hooks/use-toast";
import { useLocale } from "@/contexts/locale-context";

// ─── Schema ──────────────────────────────────────────────────────────────────

const sectionSchema = z.object({
  name: z.string().min(1, "Povinné"),
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
  // wizard-only fields kept so SectionEditor can bind
  entryFee: z.string().optional(),
  entryFeeCurrency: z.string().optional(),
  presenceEnd: z.string().optional(),
});

const templateSchema = z.object({
  name: z.string().min(1, "Povinné"),
  description: z.string().optional(),
  icon: z.string().max(2, "Maximálně 1 emoji").optional(),
  active: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0),
  sections: z.array(sectionSchema).optional(),
});

type TemplateFormData = z.infer<typeof templateSchema>;

// ─── Template Form Dialog ────────────────────────────────────────────────────

function TemplateFormDialog({
  open,
  onClose,
  title,
  defaultValues,
  onSubmit,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  defaultValues?: Partial<TemplateFormData>;
  onSubmit: (data: TemplateFormData) => Promise<void>;
  loading: boolean;
}) {
  const { t } = useLocale();
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      description: "",
      icon: "",
      active: true,
      displayOrder: 0,
      sections: [],
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "sections" });
  const watchedSections = watch("sections") ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          id="template-form"
        >
          <Input
            label="Název"
            id="template-name"
            error={errors.name?.message}
            {...register("name")}
          />

          <div>
            <label
              htmlFor="template-description"
              className="mb-1 block text-sm font-medium text-[var(--text-primary)]"
            >
              Popis <span className="text-[var(--text-tertiary)] font-normal">(volitelné)</span>
            </label>
            <textarea
              id="template-description"
              rows={2}
              placeholder="Krátký popis šablony..."
              className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-base text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
              {...register("description")}
            />
          </div>

          <Input
            label="Ikona (emoji)"
            id="template-icon"
            placeholder="🏆"
            maxLength={2}
            {...register("icon")}
          />

          <div className="flex items-center gap-3">
            <input
              id="template-active"
              type="checkbox"
              className="h-4 w-4 cursor-pointer rounded border-[var(--border)] accent-[var(--accent)]"
              {...register("active")}
            />
            <label htmlFor="template-active" className="text-sm font-medium text-[var(--text-primary)] cursor-pointer">
              Zobrazit ve wizardu
            </label>
          </div>

          <Input
            label="Pořadí"
            id="template-order"
            type="number"
            min={0}
            {...register("displayOrder", { valueAsNumber: true })}
          />

          <div>
            <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Sekce</h3>
            <SectionEditor
              fields={fields}
              append={append}
              remove={remove}
              control={control}
              errors={errors}
              showWizardFields={false}
              fieldArrayName="sections"
              watchedItems={watchedSections}
            />
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="template-form" loading={loading}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirmation Dialog ───────────────────────────────────────────────

function DeleteConfirmDialog({
  open,
  onClose,
  templateName,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  templateName: string;
  onConfirm: () => Promise<void>;
  loading: boolean;
}) {
  const { t } = useLocale();

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Smazat šablonu</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-[var(--text-secondary)]">
          {t("templates.deleteConfirm", { name: templateName })}
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="button" variant="destructive" loading={loading} onClick={onConfirm}>
            Smazat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const { data: templates = [], isLoading, isError } = useAllCompetitionTemplates();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<CompetitionTemplate | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<CompetitionTemplate | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["competition-templates"] }),
      queryClient.invalidateQueries({ queryKey: ["competition-templates", "all"] }),
    ]);

  const handleCreate = async (data: TemplateFormData) => {
    setActionLoading(true);
    try {
      await competitionTemplatesApi.create({
        name: data.name,
        description: data.description ?? "",
        icon: data.icon?.trim() || "📋",
        active: data.active,
        displayOrder: data.displayOrder,
        sections: (data.sections ?? []).map((s) => ({
          name: s.name,
          ageCategory: s.ageCategory || undefined,
          level: s.level || undefined,
          danceStyle: s.danceStyle || undefined,
          numberOfJudges: s.numberOfJudges,
          maxFinalPairs: s.maxFinalPairs,
          competitorType: s.competitorType || undefined,
          competitionType: s.competitionType || undefined,
          series: s.series || undefined,
        })),
        updatedAt: new Date().toISOString(),
      });
      await invalidate();
      setCreateOpen(false);
      toast({ title: "Šablona vytvořena" });
    } catch (err) {
      const detail = axios.isAxiosError(err) ? { status: err.response?.status, data: err.response?.data, message: err.message } : err;
      console.error("[template create]", detail);
      toast({ title: t("common.error"), variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = async (data: TemplateFormData) => {
    if (!editTemplate) return;
    setActionLoading(true);
    try {
      await competitionTemplatesApi.update(editTemplate.id, {
        name: data.name,
        description: data.description ?? "",
        icon: data.icon?.trim() || "📋",
        active: data.active,
        displayOrder: data.displayOrder,
        sections: (data.sections ?? []).map((s) => ({
          name: s.name,
          ageCategory: s.ageCategory || undefined,
          level: s.level || undefined,
          danceStyle: s.danceStyle || undefined,
          numberOfJudges: s.numberOfJudges,
          maxFinalPairs: s.maxFinalPairs,
          competitorType: s.competitorType || undefined,
          competitionType: s.competitionType || undefined,
          series: s.series || undefined,
        })),
        updatedAt: new Date().toISOString(),
      });
      await invalidate();
      setEditTemplate(null);
      toast({ title: "Šablona uložena" });
    } catch (err) {
      const detail = axios.isAxiosError(err) ? { status: err.response?.status, data: err.response?.data, message: err.message } : err;
      console.error("[template edit]", detail);
      toast({ title: t("common.error"), variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTemplate) return;
    setActionLoading(true);
    try {
      await competitionTemplatesApi.delete(deleteTemplate.id);
      await invalidate();
      setDeleteTemplate(null);
      toast({ title: "Šablona smazána" });
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            {t("templates.title")}
          </h1>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {t("templates.addButton")}
          </Button>
        </div>

        {/* Error state */}
        {isError && (
          <p className="mb-4 text-sm text-[var(--destructive)]">{t("templates.loadError")}</p>
        )}

        {/* Loading skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5"
              >
                <div className="mb-2 h-6 w-8 rounded bg-[var(--border)]" />
                <div className="mb-1.5 h-4 w-3/4 rounded bg-[var(--border)]" />
                <div className="h-3 w-full rounded bg-[var(--border)]" />
              </div>
            ))}
          </div>
        )}

        {/* Template grid */}
        {!isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className={`relative rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-opacity ${
                  !tpl.active ? "opacity-50" : ""
                }`}
              >
                {/* Action buttons (top-right) */}
                <div className="absolute right-3 top-3 flex items-center gap-1" aria-label="Akce šablony">
                  {!tpl.active && (
                    <span className="mr-1 rounded-full bg-[var(--surface-secondary)] border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">
                      {t("templates.inactive")}
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label="Upravit šablonu"
                    onClick={() => setEditTemplate(tpl)}
                    className="flex min-h-[36px] min-w-[36px] cursor-pointer items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="Smazat šablonu"
                    onClick={() => setDeleteTemplate(tpl)}
                    className="flex min-h-[36px] min-w-[36px] cursor-pointer items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>

                {/* Content */}
                <div className="pr-24">
                  <span className="mb-2 block text-2xl" aria-hidden="true">{tpl.icon}</span>
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">{tpl.name}</h2>
                  {tpl.description && (
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">{tpl.description}</p>
                  )}
                  {tpl.sections.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {tpl.sections.map((s, i) => (
                        <span
                          key={i}
                          className="rounded-full border border-[var(--border)] bg-[var(--surface-secondary)] px-2 py-0.5 text-xs text-[var(--text-secondary)]"
                        >
                          {s.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {templates.length === 0 && !isLoading && (
              <div className="col-span-2 flex flex-col items-center gap-2 py-12 text-center">
                <p className="text-sm text-[var(--text-tertiary)]">Žádné šablony. Vytvořte první.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create dialog */}
      {createOpen && (
        <TemplateFormDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          title={t("templates.createDialog.title")}
          onSubmit={handleCreate}
          loading={actionLoading}
        />
      )}

      {/* Edit dialog */}
      {editTemplate && (
        <TemplateFormDialog
          open={!!editTemplate}
          onClose={() => setEditTemplate(null)}
          title={t("templates.editDialog.title")}
          defaultValues={{
            name: editTemplate.name,
            description: editTemplate.description,
            icon: editTemplate.icon,
            active: editTemplate.active,
            displayOrder: editTemplate.displayOrder,
            sections: editTemplate.sections.map((s) => ({
              name: s.name,
              ageCategory: s.ageCategory,
              level: s.level,
              danceStyle: s.danceStyle,
              numberOfJudges: s.numberOfJudges,
              maxFinalPairs: s.maxFinalPairs,
              competitorType: s.competitorType ?? "",
              competitionType: s.competitionType ?? "",
              series: s.series ?? "",
              singleDanceName: s.danceStyle === "SINGLE_DANCE" && s.dances?.length ? (s.dances[0].danceName ?? "") : "",
              danceNames: s.danceStyle === "MULTIDANCE" ? (s.dances?.map((d) => d.danceName ?? "").filter(Boolean) ?? []) : [],
              minBirthYear: s.minBirthYear ?? null,
              maxBirthYear: s.maxBirthYear ?? null,
              entryFee: "",
              entryFeeCurrency: "CZK",
              presenceEnd: "09:00",
            })),
          }}
          onSubmit={handleEdit}
          loading={actionLoading}
        />
      )}

      {/* Delete dialog */}
      {deleteTemplate && (
        <DeleteConfirmDialog
          open={!!deleteTemplate}
          onClose={() => setDeleteTemplate(null)}
          templateName={deleteTemplate.name}
          onConfirm={handleDelete}
          loading={actionLoading}
        />
      )}
    </AppShell>
  );
}
