"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { Merge, Unlink, ChevronDown, ChevronUp, Users, GripVertical } from "lucide-react";
import { sectionsApi, type SectionDto } from "@/lib/api/sections";
import { sectionsApi2 } from "@/lib/api/schedule";
import { Button } from "@/components/ui/button";
import { SimpleDialog } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { SectionProgressionPreview } from "./section-progression-preview";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SectionManagerProps {
  competitionId: string;
}

const FINAL_SIZE_OPTIONS = [4, 5, 6];

function getFinalSize(section: SectionDto): number {
  return section.finalSize ?? recommendFinalSize(section.registeredPairsCount ?? 0);
}

function recommendFinalSize(pairCount: number): number {
  if (pairCount <= 4) return 4;
  if (pairCount <= 8) return 5;
  return 6;
}

interface SectionCardProps {
  section: SectionDto;
  allSections: SectionDto[];
  competitionId: string;
  onMergeRequest: (section: SectionDto) => void;
}

function SectionCard({ section, allSections, competitionId, onMergeRequest }: SectionCardProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const mergedIntoId: string | null = section.mergedIntoId ?? null;
  const isMergedAway = !!mergedIntoId;
  const pairCount = section.registeredPairsCount ?? 0;
  const finalSize = getFinalSize(section);

  const mergeId: string | null = section.mergeId ?? null;
  const mergeLabel: string | null = section.mergedLabel ?? null;

  const unmergeMutation = useApiMutation({
    mutationFn: () => sectionsApi2.unmergeSections(competitionId, mergeId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sections", competitionId] });
      toast({ title: "Sloučení zrušeno", variant: "success" });
    },
    onError: () => toast({ title: "Chyba při rušení sloučení", variant: "destructive" }),
  });

  if (isMergedAway) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3 opacity-50"
      >
        <div className="flex items-center gap-2">
          <Merge className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
          <span className="text-sm text-[var(--text-tertiary)] line-through">{section.name}</span>
          <span className="text-xs text-[var(--text-tertiary)]">sloučena</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border border-[var(--border)] bg-[var(--surface)] transition-shadow",
        isDragging && "shadow-xl ring-2 ring-[var(--accent)] opacity-90 z-50",
        mergeLabel && "ring-1 ring-blue-300 dark:ring-blue-700"
      )}
    >
      <div className="flex items-center gap-1 px-2 py-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-transparent group-hover:text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] touch-none shrink-0"
          tabIndex={-1}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex-1 min-w-0 px-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {mergeLabel ?? section.name}
            </span>
            {mergeLabel && (
              <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                sloučeno
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <Users className="h-3 w-3 text-[var(--text-tertiary)]" />
            <span className="text-xs text-[var(--text-secondary)]">{pairCount} párů</span>
            {section.danceStyle && (
              <span className="text-xs text-[var(--text-tertiary)]">· {section.danceStyle}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {mergeId ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1 text-[var(--text-secondary)]"
              onClick={() => unmergeMutation.mutate()}
              loading={unmergeMutation.isPending}
            >
              <Unlink className="h-3 w-3" />
              Zrušit
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1 text-[var(--text-secondary)]"
              onClick={() => onMergeRequest(section)}
            >
              <Merge className="h-3 w-3" />
              Sloučit
            </Button>
          )}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[var(--border)] px-4 py-3 space-y-3">
          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Velikost finále</label>
              <div className="flex gap-1">
                {FINAL_SIZE_OPTIONS.map((n) => (
                  <button
                    key={n}
                    className={cn(
                      "w-8 h-8 rounded text-sm font-medium border transition-colors",
                      getFinalSize(section) === n
                        ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                        : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <SectionProgressionPreview
            competitionId={competitionId}
            sectionId={section.id}
            pairCount={pairCount}
            finalSize={finalSize}
          />
        </div>
      )}
    </div>
  );
}

interface MergeDialogProps {
  competitionId: string;
  primarySection: SectionDto | null;
  allSections: SectionDto[];
  onClose: () => void;
}

function MergeDialog({ competitionId, primarySection, allSections, onClose }: MergeDialogProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [targetId, setTargetId] = useState("");
  const [customLabel, setCustomLabel] = useState("");

  const candidates = allSections.filter(
    (s) =>
      s.id !== primarySection?.id &&
      !s.mergedIntoId &&
      !s.mergeId &&
      s.danceStyle === primarySection?.danceStyle
  );

  const mergeMutation = useApiMutation({
    mutationFn: () =>
      sectionsApi2.mergeSections(competitionId, {
        primarySectionId: primarySection!.id,
        mergedSectionId: targetId,
        mergedLabel: customLabel || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sections", competitionId] });
      toast({ title: "Sekce sloučeny", variant: "success" });
      onClose();
    },
    onError: (e: Error) =>
      toast({ title: e.message || "Chyba při slučování", variant: "destructive" }),
  });

  return (
    <SimpleDialog
      open={!!primarySection}
      onClose={onClose}
      title={`Sloučit: ${primarySection?.name}`}
    >
      <div className="space-y-4 pt-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]">Sloučit s kategorií</label>
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            <option value="">Vyberte kategorii...</option>
            {candidates.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.registeredPairsCount ?? 0} párů)
              </option>
            ))}
          </select>
          {candidates.length === 0 && (
            <p className="text-xs text-[var(--text-tertiary)]">
              Žádné kompatibilní kategorie (stejný styl).
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]">
            Název sloučené kategorie (volitelné)
          </label>
          <input
            type="text"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="Nechte prázdné pro automatický název"
            className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Zrušit</Button>
          <Button
            onClick={() => mergeMutation.mutate()}
            loading={mergeMutation.isPending}
            disabled={!targetId}
          >
            <Merge className="h-4 w-4 mr-1.5" />
            Sloučit
          </Button>
        </div>
      </div>
    </SimpleDialog>
  );
}

export function SectionManager({ competitionId }: SectionManagerProps) {
  const [mergeTarget, setMergeTarget] = useState<SectionDto | null>(null);
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ["sections", competitionId],
    queryFn: () => sectionsApi.list(competitionId),
  });

  const orderedSections = useMemo(() => {
    if (!localOrder) return sections;
    const map = new Map(sections.map((s) => [s.id, s]));
    return localOrder.map((id) => map.get(id)).filter(Boolean) as SectionDto[];
  }, [sections, localOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ids = orderedSections.map((s) => s.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const newOrder = [...ids];
    newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, String(active.id));
    setLocalOrder(newOrder);

    // Persist new order with a single batch request
    sectionsApi.reorder(competitionId, newOrder).catch(() => {
      toast({ title: "Chyba při ukládání pořadí", variant: "destructive" });
      setLocalOrder(ids);
      qc.invalidateQueries({ queryKey: ["sections", competitionId] });
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 rounded-xl border border-[var(--border)] bg-[var(--surface)] animate-pulse" />
        ))}
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] py-12 text-center">
        <p className="text-sm text-[var(--text-tertiary)]">Žádné kategorie nenalezeny.</p>
      </div>
    );
  }

  const totalPairs = sections.reduce((s, sec) => s + (sec.registeredPairsCount ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Kategorie</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            {sections.length} kategorií · {totalPairs} párů celkem
          </p>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={orderedSections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {orderedSections.map((section) => (
              <SectionCard
                key={section.id}
                section={section}
                allSections={sections}
                competitionId={competitionId}
                onMergeRequest={setMergeTarget}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <MergeDialog
        competitionId={competitionId}
        primarySection={mergeTarget}
        allSections={sections}
        onClose={() => setMergeTarget(null)}
      />
    </div>
  );
}
