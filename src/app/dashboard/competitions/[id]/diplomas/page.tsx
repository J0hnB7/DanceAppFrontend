"use client";

import { use, useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { Award, Printer, Upload, Trash2, Plus, GripVertical, ArrowLeft, Eye } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { CompetitionSidebar } from "@/components/layout/competition-sidebar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { competitionsApi } from "@/lib/api/competitions";
import { sectionsApi } from "@/lib/api/sections";
import { scoringApi } from "@/lib/api/scoring";
import { usePairs } from "@/hooks/queries/use-pairs";
import {
  printDiploma,
  printAllDiplomas,
  printMergedDiploma,
  printAllMergedDiplomas,
  loadTemplate,
  saveTemplate,
  resolveVariable,
  DEFAULT_FIELDS,
  VARIABLE_LABELS,
  type DiplomaTemplate,
  type DiplomaTextField,
  type DiplomaVariable,
  type DiplomaData,
  type MergedDiplomaData,
} from "@/lib/diploma";
import type { SectionFinalSummaryResponse } from "@/lib/api/scoring";
import { formatDate, cn } from "@/lib/utils";
import { useLocale } from "@/contexts/locale-context";
import { useRouter } from "next/navigation";

type TFn = (key: string, vars?: Record<string, string | number>) => string;

// ── Template Editor ─────────────────────────────────────────────────────────

function TemplateEditor({
  competitionId,
  competitionName,
  competitionDate,
  competitionLocation,
  onSave,
  initial,
  t,
}: {
  competitionId: string;
  competitionName: string;
  competitionDate: string;
  competitionLocation: string;
  onSave: (tmpl: DiplomaTemplate) => void;
  initial: DiplomaTemplate | null;
  t: TFn;
}) {
  const [bgImage, setBgImage] = useState(initial?.backgroundImage ?? "");
  const [fields, setFields] = useState<DiplomaTextField[]>(initial?.fields ?? DEFAULT_FIELDS);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const selectedField = fields.find((f) => f.id === selectedFieldId) ?? null;

  const previewData: DiplomaData = {
    competitionName: competitionName || "Soutěž Ostrava 2026",
    competitionDate: competitionDate || "15. března 2026",
    competitionLocation: competitionLocation || "Ostrava",
    sectionName: "Standard Junioři II B",
    placement: 1,
    dancer1Name: "Jan Novák",
    dancer2Name: "Jana Nováková",
    club: "TK Praha",
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBgImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const updateField = (id: string, patch: Partial<DiplomaTextField>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const addField = () => {
    const id = `f${Date.now()}`;
    const newField: DiplomaTextField = {
      id,
      variable: "competitionName",
      label: t("diplomas.newField"),
      x: 50,
      y: 50,
      fontSize: 14,
      fontWeight: "normal",
      color: "#333333",
      textAlign: "center",
      fontFamily: "sans-serif",
    };
    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(id);
  };

  const removeField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  const handlePointerDown = (fieldId: string, e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(fieldId);
    setSelectedFieldId(fieldId);
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
      updateField(dragging, { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
    },
    [dragging]
  );

  const handlePointerUp = useCallback(() => setDragging(null), []);

  const handleSave = () => {
    const template: DiplomaTemplate = { backgroundImage: bgImage, fields };
    saveTemplate(competitionId, template);
    onSave(template);
  };

  // A4 portrait ratio: 210/297 = 0.707
  const A4_RATIO = 210 / 297;

  return (
    <div className="space-y-4">
      {/* Background upload */}
      {!bgImage ? (
        <label className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-secondary)] p-12 text-center transition-colors hover:border-[var(--accent)]">
          <Upload className="h-10 w-10 text-[var(--text-tertiary)]" />
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{t("diplomas.uploadLabel")}</p>
            <p className="text-xs text-[var(--text-tertiary)]">{t("diplomas.uploadHint")}</p>
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
        </label>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          {/* Canvas — A4 preview with draggable fields */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-[var(--text-secondary)]">{t("diplomas.previewLabel")}</p>
              <button
                onClick={() => setBgImage("")}
                className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
              >
                <Trash2 className="h-3 w-3" /> {t("diplomas.changeBg")}
              </button>
            </div>
            <div
              ref={canvasRef}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className="relative mx-auto overflow-hidden rounded-xl border border-[var(--border)] shadow-lg select-none"
              style={{ width: "100%", maxWidth: 500, aspectRatio: `${A4_RATIO}` }}
            >
              <img
                src={bgImage}
                alt="Šablona"
                className="absolute inset-0 h-full w-full object-cover pointer-events-none"
                draggable={false}
              />
              {fields.map((f) => {
                const text = resolveVariable(f.variable, previewData);
                if (!text) return null;
                // Scale font size relative to canvas width (500px maps to 210mm)
                const scaledFontSize = (f.fontSize / 210) * 100;
                return (
                  <div
                    key={f.id}
                    onPointerDown={(e) => handlePointerDown(f.id, e)}
                    onClick={() => setSelectedFieldId(f.id)}
                    className={cn(
                      "absolute cursor-move whitespace-nowrap transition-shadow",
                      selectedFieldId === f.id && "ring-2 ring-[var(--accent)] ring-offset-1 rounded"
                    )}
                    style={{
                      top: `${f.y}%`,
                      ...(f.textAlign === "center"
                        ? { left: `${f.x}%`, transform: "translateX(-50%)" }
                        : f.textAlign === "right"
                        ? { right: `${100 - f.x}%` }
                        : { left: `${f.x}%` }),
                      fontSize: `${scaledFontSize}vw`,
                      fontWeight: f.fontWeight,
                      color: f.color,
                      fontFamily: f.fontFamily === "serif" ? "'Georgia', serif" : "'Arial', sans-serif",
                    }}
                  >
                    {text}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Field panel */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{t("diplomas.textFields")}</p>
              <button onClick={addField} className="flex items-center gap-1 rounded-lg bg-[var(--accent)] px-2.5 py-1 text-xs font-semibold text-white">
                <Plus className="h-3 w-3" /> {t("diplomas.addField")}
              </button>
            </div>

            <div className="space-y-1.5 max-h-[360px] overflow-y-auto">
              {fields.map((f) => (
                <div
                  key={f.id}
                  onClick={() => setSelectedFieldId(f.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs cursor-pointer transition-colors",
                    selectedFieldId === f.id
                      ? "border-[var(--accent)] bg-[var(--accent)]/5"
                      : "border-[var(--border)] hover:bg-[var(--surface-secondary)]"
                  )}
                >
                  <GripVertical className="h-3 w-3 text-[var(--text-tertiary)] shrink-0" />
                  <span className="flex-1 truncate font-medium text-[var(--text-primary)]">{VARIABLE_LABELS[f.variable]}</span>
                  <button onClick={(e) => { e.stopPropagation(); removeField(f.id); }} className="text-[var(--text-tertiary)] hover:text-red-500">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Field settings */}
            {selectedField && (
              <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                <p className="text-xs font-semibold text-[var(--text-primary)]">{t("diplomas.fieldSettings")}</p>

                <div>
                  <label className="text-[10px] font-medium text-[var(--text-tertiary)]">{t("diplomas.variable")}</label>
                  <select
                    value={selectedField.variable}
                    onChange={(e) => updateField(selectedField.id, { variable: e.target.value as DiplomaVariable })}
                    className="mt-0.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs text-[var(--text-primary)]"
                  >
                    {Object.entries(VARIABLE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-medium text-[var(--text-tertiary)]">{t("diplomas.fontSize")}</label>
                    <Input
                      type="number"
                      min={6}
                      max={72}
                      value={selectedField.fontSize}
                      onChange={(e) => updateField(selectedField.id, { fontSize: Number(e.target.value) })}
                      className="mt-0.5 h-7 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-[var(--text-tertiary)]">{t("diplomas.color")}</label>
                    <div className="mt-0.5 flex gap-1.5 items-center">
                      <input
                        type="color"
                        value={selectedField.color}
                        onChange={(e) => updateField(selectedField.id, { color: e.target.value })}
                        className="h-7 w-7 cursor-pointer rounded border-0"
                      />
                      <Input
                        value={selectedField.color}
                        onChange={(e) => updateField(selectedField.id, { color: e.target.value })}
                        className="h-7 text-xs flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {(["left", "center", "right"] as const).map((a) => (
                    <button
                      key={a}
                      onClick={() => updateField(selectedField.id, { textAlign: a })}
                      className={cn(
                        "rounded-lg py-1 text-[10px] font-semibold transition-colors",
                        selectedField.textAlign === a
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--surface-secondary)] text-[var(--text-secondary)]"
                      )}
                    >
                      {a === "left" ? t("diplomas.alignLeft") : a === "center" ? t("diplomas.alignCenter") : t("diplomas.alignRight")}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {(["normal", "bold"] as const).map((w) => (
                    <button
                      key={w}
                      onClick={() => updateField(selectedField.id, { fontWeight: w })}
                      className={cn(
                        "rounded-lg py-1 text-[10px] font-semibold transition-colors",
                        selectedField.fontWeight === w
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--surface-secondary)] text-[var(--text-secondary)]"
                      )}
                    >
                      {w === "normal" ? t("diplomas.weightNormal") : t("diplomas.weightBold")}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {(["serif", "sans-serif"] as const).map((ff) => (
                    <button
                      key={ff}
                      onClick={() => updateField(selectedField.id, { fontFamily: ff })}
                      className={cn(
                        "rounded-lg py-1 text-[10px] transition-colors",
                        selectedField.fontFamily === ff
                          ? "bg-[var(--accent)] text-white font-semibold"
                          : "bg-[var(--surface-secondary)] text-[var(--text-secondary)]"
                      )}
                      style={{ fontFamily: ff === "serif" ? "Georgia, serif" : "Arial, sans-serif" }}
                    >
                      {ff === "serif" ? "Serif" : "Sans-serif"}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-medium text-[var(--text-tertiary)]">X (%)</label>
                    <Input
                      type="number" min={0} max={100} step={0.5}
                      value={selectedField.x}
                      onChange={(e) => updateField(selectedField.id, { x: Number(e.target.value) })}
                      className="mt-0.5 h-7 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-[var(--text-tertiary)]">Y (%)</label>
                    <Input
                      type="number" min={0} max={100} step={0.5}
                      value={selectedField.y}
                      onChange={(e) => updateField(selectedField.id, { y: Number(e.target.value) })}
                      className="mt-0.5 h-7 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            <Button onClick={handleSave} className="w-full gap-2 font-semibold">
              {t("diplomas.saveTemplate")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section diplomas (generation) ───────────────────────────────────────────

const MEDAL_BG: Record<number, string> = {
  1: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800",
  2: "bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700",
  3: "bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800",
};

function SectionDiplomas({
  sectionId,
  sectionName,
  competitionName,
  competitionDate,
  competitionLocation,
  competitionId,
  template,
  t,
}: {
  sectionId: string;
  sectionName: string;
  competitionName: string;
  competitionDate: string;
  competitionLocation: string;
  competitionId: string;
  template: DiplomaTemplate | null;
  t: TFn;
}) {
  const { data: summary, isLoading } = useQuery({
    queryKey: ["section-summary", sectionId],
    queryFn: () => scoringApi.getSectionSummary(sectionId),
  });

  const { data: pairs = [] } = usePairs(competitionId);

  if (isLoading) return <Skeleton className="h-40 rounded-xl" />;
  if (!summary || summary.rankings.length === 0) {
    return (
      <Card className="p-4 text-center text-sm text-[var(--text-secondary)]">
        {sectionName} — {t("diplomas.noResults")}
      </Card>
    );
  }

  const top3 = summary.rankings.filter((r) => r.finalPlacement <= 3);
  const medals: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

  const pairLookup = new Map<number, { dancer1Name: string; dancer2Name?: string; club?: string }>();
  for (const p of pairs) {
    const name1 = [p.dancer1FirstName, p.dancer1LastName].filter(Boolean).join(" ");
    const name2 = [p.dancer2FirstName, p.dancer2LastName].filter(Boolean).join(" ");
    pairLookup.set(p.startNumber, { dancer1Name: name1 || `Pár #${p.startNumber}`, dancer2Name: name2 || undefined, club: p.club });
  }

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[var(--text-primary)]">{sectionName}</h3>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => printAllDiplomas(summary.rankings, competitionName, competitionDate, competitionLocation, sectionName, pairLookup, template)}
        >
          <Printer className="h-3.5 w-3.5" />
          {t("diplomas.printTop3")}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {top3.map((r) => {
          const pair = pairLookup.get(r.startNumber);
          const dancer1 = pair?.dancer1Name ?? `Pár #${r.startNumber}`;
          const dancer2 = pair?.dancer2Name;
          return (
            <div
              key={r.pairId}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border p-3 text-center",
                MEDAL_BG[r.finalPlacement] ?? "border-[var(--border)]"
              )}
            >
              <span className="text-2xl">{medals[r.finalPlacement]}</span>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{r.startNumber}</p>
                <p className="text-xs text-[var(--text-secondary)] truncate max-w-[140px]">
                  {dancer1}{dancer2 ? ` & ${dancer2}` : ""}
                </p>
                {pair?.club && <p className="text-[10px] text-[var(--text-tertiary)]">{pair.club}</p>}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs"
                onClick={() =>
                  printDiploma({
                    competitionName, competitionDate, competitionLocation, sectionName,
                    placement: r.finalPlacement,
                    dancer1Name: dancer1,
                    dancer2Name: dancer2,
                    club: pair?.club,
                  }, template)
                }
              >
                <Printer className="h-3 w-3" />
                {t("diplomas.print")}
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── Merged diploma helpers ───────────────────────────────────────────────────

type PairInfo = { dancer1Name: string; dancer2Name?: string; club?: string };

function buildMergedDiplomaList(
  sections: { id: string; name: string }[],
  summaryMap: Map<string, SectionFinalSummaryResponse>,
  pairLookup: Map<number, PairInfo>,
  competitionName: string,
  competitionDate: string,
  competitionLocation: string,
): MergedDiplomaData[] {
  const byPairId = new Map<string, MergedDiplomaData>();

  for (const section of sections) {
    const summary = summaryMap.get(section.id);
    if (!summary) continue;

    for (const r of summary.rankings) {
      if (r.finalPlacement > 3) continue;

      if (!byPairId.has(r.pairId)) {
        const pair = pairLookup.get(r.startNumber);
        byPairId.set(r.pairId, {
          competitionName,
          competitionDate,
          competitionLocation,
          dancer1Name: pair?.dancer1Name ?? `Pár #${r.startNumber}`,
          dancer2Name: pair?.dancer2Name,
          club: pair?.club,
          results: [],
        });
      }
      byPairId.get(r.pairId)!.results.push({
        sectionName: section.name,
        placement: r.finalPlacement,
      });
    }
  }

  for (const data of byPairId.values()) {
    data.results.sort((a, b) => a.placement - b.placement);
  }

  return [...byPairId.values()].sort((a, b) =>
    a.dancer1Name.localeCompare(b.dancer1Name)
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function DiplomasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: competitionId } = use(params);
  const router = useRouter();
  const { t } = useLocale();
  const [tab, setTab] = useState<"generate" | "editor" | "sloucene">("generate");
  const [template, setTemplate] = useState<DiplomaTemplate | null>(null);

  useEffect(() => {
    setTemplate(loadTemplate(competitionId));
  }, [competitionId]);

  const { data: competition, isLoading: loadingComp } = useQuery({
    queryKey: ["competition", competitionId],
    queryFn: () => competitionsApi.get(competitionId),
  });

  const { data: sections = [], isLoading: loadingSections } = useQuery({
    queryKey: ["sections", competitionId],
    queryFn: () => sectionsApi.list(competitionId),
  });

  const { data: pairs = [] } = usePairs(competitionId);

  const summaryQueries = useQueries({
    queries: sections.map((s) => ({
      queryKey: ["section-summary", s.id],
      queryFn: () => scoringApi.getSectionSummary(s.id),
      enabled: sections.length > 0,
    })),
  });

  const allSummariesLoaded = summaryQueries.every((q) => !q.isLoading);
  const summaryMap = new Map<string, SectionFinalSummaryResponse>(
    sections
      .map((s, i) => [s.id, summaryQueries[i]?.data] as [string, SectionFinalSummaryResponse | undefined])
      .filter((entry): entry is [string, SectionFinalSummaryResponse] => entry[1] != null)
  );

  const pairLookup = new Map<number, PairInfo>();
  for (const p of pairs) {
    const name1 = [p.dancer1FirstName, p.dancer1LastName].filter(Boolean).join(" ");
    const name2 = [p.dancer2FirstName, p.dancer2LastName].filter(Boolean).join(" ");
    pairLookup.set(p.startNumber, {
      dancer1Name: name1 || `Pár #${p.startNumber}`,
      dancer2Name: name2 || undefined,
      club: p.club,
    });
  }

  const mergedList = allSummariesLoaded
    ? buildMergedDiplomaList(
        sections,
        summaryMap,
        pairLookup,
        competition?.name ?? "",
        competition ? formatDate(competition.eventDate) : "",
        competition?.venue ?? "",
      )
    : [];

  return (
    <AppShell sidebar={<CompetitionSidebar competitionId={competitionId} />}>
      <div className="mx-auto max-w-5xl space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--surface-secondary)]">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">{t("diplomas.title")}</h1>
            {competition && (
              <p className="text-sm text-[var(--text-secondary)]">
                {competition.name} · {formatDate(competition.eventDate)} · {competition.venue}
              </p>
            )}
          </div>
          <Badge variant={template ? "default" : "secondary"}>
            {template ? t("diplomas.templateLoaded") : t("diplomas.noTemplate")}
          </Badge>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 rounded-xl bg-[var(--surface-secondary)] p-1">
          <button
            onClick={() => setTab("generate")}
            className={cn(
              "flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
              tab === "generate" ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-secondary)]"
            )}
          >
            <Printer className="mr-1.5 inline-block h-4 w-4" />
            {t("diplomas.generateTab")}
          </button>
          <button
            onClick={() => setTab("editor")}
            className={cn(
              "flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
              tab === "editor" ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-secondary)]"
            )}
          >
            <Eye className="mr-1.5 inline-block h-4 w-4" />
            {t("diplomas.editorTab")}
          </button>
          <button
            onClick={() => setTab("sloucene")}
            className={cn(
              "flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
              tab === "sloucene" ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-secondary)]"
            )}
          >
            <Award className="mr-1.5 inline-block h-4 w-4" />
            {t("diplomas.mergedTab")}
          </button>
        </div>

        {tab === "sloucene" ? (
          <div className="space-y-4">
            {/* Bulk action card */}
            <Card className="p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {t("diplomas.mergedTitle")}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {t("diplomas.mergedDescription")}
                  {mergedList.length > 0 && ` ${mergedList.length} párů má alespoň jedno umístění.`}
                </p>
              </div>
              <Button
                variant="outline"
                className="gap-2 shrink-0"
                disabled={mergedList.length === 0}
                onClick={() => printAllMergedDiplomas(mergedList)}
              >
                <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                {t("diplomas.mergedPrintAll", { count: mergedList.length })}
              </Button>
            </Card>

            {/* Loading / empty / list */}
            {!allSummariesLoaded ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-xl" />
                ))}
              </div>
            ) : mergedList.length === 0 ? (
              <Card className="py-16 text-center text-sm text-[var(--text-secondary)]">
                {t("diplomas.mergedNoResults")}
              </Card>
            ) : (
              <div className="space-y-2">
                {mergedList.map((data, i) => (
                  <Card key={i} className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                        {data.dancer1Name}{data.dancer2Name ? ` & ${data.dancer2Name}` : ""}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {data.results.map((r) => `${r.placement}. — ${r.sectionName}`).join(" · ")}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 shrink-0"
                      onClick={() => printMergedDiploma(data)}
                    >
                      <Printer className="h-3 w-3" aria-hidden="true" />
                      {t("diplomas.mergedPrint")}
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : tab === "editor" ? (
          <TemplateEditor
            competitionId={competitionId}
            competitionName={competition?.name ?? ""}
            competitionDate={competition ? formatDate(competition.eventDate) : ""}
            competitionLocation={competition?.venue ?? ""}
            onSave={(tmpl) => { setTemplate(tmpl); setTab("generate"); }}
            initial={template}
            t={t}
          />
        ) : loadingComp || loadingSections ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : sections.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 py-20 text-center">
            <Award className="h-12 w-12 text-[var(--text-tertiary)]" />
            <p className="text-sm text-[var(--text-secondary)]">{t("diplomas.noCategories")}</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {!template && (
              <div className="flex items-center gap-3 rounded-xl border border-amber-300/30 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
                <Upload className="h-5 w-5 text-amber-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{t("diplomas.noTemplateWarning")}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{t("diplomas.noTemplateDesc")}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setTab("editor")}>{t("diplomas.uploadTemplate")}</Button>
              </div>
            )}
            {sections.map((section) => (
              <SectionDiplomas
                key={section.id}
                sectionId={section.id}
                sectionName={section.name}
                competitionId={competitionId}
                competitionName={competition?.name ?? ""}
                competitionDate={competition ? formatDate(competition.eventDate) : ""}
                competitionLocation={competition?.venue ?? ""}
                template={template}
                t={t}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
