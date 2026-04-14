"use client";

import { use, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Layers, Sheet, Download } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { CompetitionSidebar } from "@/components/layout/competition-sidebar";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSections } from "@/hooks/queries/use-sections";
import { sectionsApi } from "@/lib/api/sections";
import { useLocale } from "@/contexts/locale-context";
import { useQuery } from "@tanstack/react-query";
import { competitionsApi } from "@/lib/api/competitions";


const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Příprava",
  ACTIVE: "Aktivní",
  COMPLETED: "Dokončeno",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive"> = {
  DRAFT: "secondary",
  ACTIVE: "default",
  COMPLETED: "secondary",
};

export default function SectionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const { t } = useLocale();

  const { data: sections, isLoading } = useSections(id);
  const { data: competition } = useQuery({
    queryKey: ["competition", id],
    queryFn: () => competitionsApi.get(id),
  });

  const importRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    try {
      const { default: readXlsxFile } = await import("read-excel-file/browser");
      // Columns: Název(0), Styl(1), Věková kategorie(2), Úroveň(3), Typ soutěžícího(4), Typ soutěže(5), Počet rozhodčích(6), Max párů finále(7), Startovné(8), Měna(9)
      const rows = await readXlsxFile(file);
      const dataRows = rows.slice(1).filter((r) => r[0]);

      for (const row of dataRows) {
        const r = row as (string | number | undefined)[];
        const name = String(r[0] ?? "").trim();
        if (!name) { skipped++; continue; }
        const danceStyle = String(r[1] ?? "").trim() || undefined;
        const ageCategory = String(r[2] ?? "").trim() || undefined;
        const level = String(r[3] ?? "").trim() || undefined;
        const competitorType = String(r[4] ?? "").trim() || undefined;
        const competitionType = String(r[5] ?? "").trim() || undefined;
        const rawJudges = r[6] != null && r[6] !== "" ? Number(r[6]) : NaN;
        const rawFinal = r[7] != null && r[7] !== "" ? Number(r[7]) : NaN;
        const numberOfJudges = isNaN(rawJudges) ? 5 : Math.max(1, rawJudges);
        const maxFinalPairs = isNaN(rawFinal) ? 6 : Math.max(2, rawFinal);
        const rawFee = r[8] != null && r[8] !== "" ? Number(r[8]) : NaN;
        const entryFee = isNaN(rawFee) ? undefined : rawFee;
        const entryFeeCurrency = String(r[9] ?? "").trim() || undefined;
        try {
          await sectionsApi.create(id, {
            name,
            danceStyle,
            ageCategory: ageCategory as Parameters<typeof sectionsApi.create>[1]["ageCategory"],
            level: level as Parameters<typeof sectionsApi.create>[1]["level"],
            competitorType: competitorType as Parameters<typeof sectionsApi.create>[1]["competitorType"],
            competitionType: competitionType as Parameters<typeof sectionsApi.create>[1]["competitionType"],
            numberOfJudges,
            maxFinalPairs,
            orderIndex: 0,
            dances: [],
            entryFee,
            entryFeeCurrency,
          });
          imported++;
        } catch (err) {
          errors.push(`${name}: ${(err as { message?: string })?.message ?? t("competitionDetail.error")}`);
        }
      }
      qc.invalidateQueries({ queryKey: ["sections", id] });
      setImportResult({ imported, skipped, errors });
    } catch (err) {
      setImportResult({ imported, skipped, errors: [(err as { message?: string })?.message ?? t("competitionDetail.unknownError")] });
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const handleExport = async () => {
    const { default: writeXlsxFile } = await import("write-excel-file/browser");
    const HEADERS = [
      t("competitionDetail.exportName"), t("competitionDetail.exportStyle"),
      t("competitionDetail.exportAgeCategory"), t("competitionDetail.exportLevel"),
      t("competitionDetail.exportCompetitorType"), t("competitionDetail.exportCompetitionType"),
      t("competitionDetail.exportJudgesCount"), t("competitionDetail.exportMaxFinalPairs"),
      t("competitionDetail.exportEntryFee"), t("competitionDetail.exportCurrency"),
      t("competitionDetail.exportRegisteredPairs"),
    ];
    const data = [
      HEADERS.map((h) => ({ value: h, fontWeight: "bold" as const })),
      ...(sections ?? []).map((s) => [
        { value: s.name ?? "" },
        { value: s.danceStyle ?? "" },
        { value: s.ageCategory ?? "" },
        { value: s.level ?? "" },
        { value: s.competitorType ?? "" },
        { value: s.competitionType ?? "" },
        { value: s.numberOfJudges ?? 0, type: Number },
        { value: s.maxFinalPairs ?? 0, type: Number },
        { value: s.entryFee ?? 0, type: Number },
        { value: s.entryFeeCurrency ?? "" },
        { value: s.registeredPairsCount ?? 0, type: Number },
      ]),
    ];
    await writeXlsxFile(data, {
      fileName: `kategorie-${competition?.name ?? id}.xlsx`,
      sheet: t("competitionDetail.exportSheetSections"),
    });
  };

  return (
    <AppShell sidebar={<CompetitionSidebar competitionId={id} />}>
      <PageHeader
        title="Kategorie"
        description={isLoading ? "Načítám…" : `${sections?.length ?? 0} kategorií`}
        backHref={`/dashboard/competitions/${id}`}
        actions={
          <div className="flex items-center gap-2">
            <input
              ref={importRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleImport}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => importRef.current?.click()}
              loading={importing}
              title="Import kategorií z Excel souboru"
              aria-label="Import XLSX"
            >
              <Sheet className="h-4 w-4 sm:mr-1.5" aria-hidden="true" />
              <span className="hidden sm:inline">Import XLSX</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExport}
              title="Export kategorií do Excel souboru"
              aria-label="Export XLSX"
            >
              <Download className="h-4 w-4 sm:mr-1.5" aria-hidden="true" />
              <span className="hidden sm:inline">Export XLSX</span>
            </Button>
            <Button
              size="sm"
              onClick={() => router.push(`/dashboard/competitions/${id}/sections/new`)}
            >
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {t("section.new")}
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-3">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <Skeleton className="mb-2 h-4 w-48" />
                <Skeleton className="h-3 w-72" />
              </CardContent>
            </Card>
          ))}

        {!isLoading && !sections?.length && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Layers className="mb-4 h-10 w-10 text-[var(--text-tertiary)]" />
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              {t("section.noSections")}
            </p>
            <Button
              className="mt-4"
              onClick={() => router.push(`/dashboard/competitions/${id}/sections/new`)}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("section.new")}
            </Button>
          </div>
        )}

        {sections?.map((section) => (
          <Card
            key={section.id}
            className="cursor-pointer transition-shadow hover:shadow-sm"
            onClick={() =>
              router.push(`/dashboard/competitions/${id}/sections/${section.id}`)
            }
          >
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {section.name}
                </p>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                  {section.ageCategory} · {section.level} · {section.danceStyle} ·{" "}
                  {section.dances.length} {t("competitionDetail.dances")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-[var(--text-secondary)]">
                  {section.registeredPairsCount} {t("competitionDetail.pairsLabel")}
                </span>
                <Badge variant={STATUS_VARIANTS[section.status ?? ""] ?? "secondary"}>
                  {STATUS_LABELS[section.status ?? ""] ?? section.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {importResult && (
        <Dialog open onOpenChange={() => setImportResult(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Výsledek importu</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-1 text-sm">
              <p className="text-[var(--success-text)]">✓ Importováno: <strong>{importResult.imported}</strong></p>
              {importResult.skipped > 0 && (
                <p className="text-[var(--text-secondary)]">↷ Přeskočeno: {importResult.skipped}</p>
              )}
              {importResult.errors.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium text-[var(--destructive)]">
                    ✗ Chyby ({importResult.errors.length}):
                  </p>
                  <ul className="mt-1 list-disc pl-4">
                    {importResult.errors.map((e, i) => (
                      <li key={i} className="text-[var(--destructive)]">{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AppShell>
  );
}
