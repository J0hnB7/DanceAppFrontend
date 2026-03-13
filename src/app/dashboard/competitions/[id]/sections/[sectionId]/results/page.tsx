"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Trophy,
  Medal,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  BarChart3,
  Presentation,
  AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { scoringApi, type SectionFinalSummaryResponse } from "@/lib/api/scoring";
import { sectionsApi } from "@/lib/api/sections";
import { pairsApi } from "@/lib/api/pairs";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

// Medal display for top 3 placements
function PlacementCell({ placement }: { placement: number }) {
  if (placement === 1)
    return (
      <span className="flex items-center gap-1 font-black text-yellow-500">
        <Trophy className="h-4 w-4" /> 1
      </span>
    );
  if (placement === 2)
    return (
      <span className="flex items-center gap-1 font-bold text-slate-400">
        <Medal className="h-4 w-4" /> 2
      </span>
    );
  if (placement === 3)
    return (
      <span className="flex items-center gap-1 font-bold text-amber-700">
        <Medal className="h-4 w-4" /> 3
      </span>
    );
  return <span className="font-mono font-semibold text-[var(--text-secondary)]">{placement}</span>;
}

// Collapsible audit trail for a single row
function AuditTrailRow({
  row,
  danceNames,
}: {
  row: SectionFinalSummaryResponse["rankings"][0];
  danceNames: string[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TableRow
        className={cn(
          "cursor-pointer hover:bg-[var(--surface-hover)]",
          row.finalPlacement <= 3 && "bg-yellow-50/40"
        )}
        onClick={() => setOpen((o) => !o)}
      >
        <TableCell>
          <PlacementCell placement={row.finalPlacement} />
        </TableCell>
        <TableCell className="font-mono font-semibold">{row.startNumber}</TableCell>
        <TableCell>
          {/* Pair name fetched separately; show start number as fallback */}
          <span className="font-medium">Pair #{row.startNumber}</span>
          {row.tieResolution !== "NONE" && (
            <Badge variant="warning" className="ml-2 text-xs">
              Tie resolved
            </Badge>
          )}
        </TableCell>
        <TableCell className="font-semibold">{row.totalSum}</TableCell>
        {danceNames.map((dance) => (
          <TableCell key={dance} className="text-center text-sm text-[var(--text-secondary)]">
            {row.perDance[dance] ?? "—"}
          </TableCell>
        ))}
        <TableCell>
          {open ? (
            <ChevronDown className="h-4 w-4 text-[var(--text-tertiary)]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" />
          )}
        </TableCell>
      </TableRow>
      {open && (
        <TableRow className="bg-[var(--surface-secondary)]">
          <TableCell colSpan={4 + danceNames.length + 1} className="px-8 py-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-semibold text-[var(--text-tertiary)]">
                  PER-DANCE PLACEMENTS
                </p>
                <div className="flex flex-wrap gap-2">
                  {danceNames.map((d) => (
                    <div
                      key={d}
                      className="rounded-lg bg-[var(--surface)] px-3 py-1.5 text-xs"
                    >
                      <span className="text-[var(--text-tertiary)]">{d}:</span>{" "}
                      <span className="font-bold">{row.perDance[d] ?? "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-[var(--text-tertiary)]">
                  SKATING SYSTEM DETAIL
                </p>
                <div className="space-y-1 text-xs text-[var(--text-secondary)]">
                  <p>Total sum of placements: <strong>{row.totalSum}</strong></p>
                  <p>
                    Tie resolution:{" "}
                    <Badge variant={row.tieResolution === "NONE" ? "secondary" : "warning"} className="text-xs">
                      {row.tieResolution}
                    </Badge>
                  </p>
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function SectionResultsPage({
  params,
}: {
  params: Promise<{ id: string; sectionId: string }>;
}) {
  const { id: competitionId, sectionId } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const [approved, setApproved] = useState(false);

  const { data: section, isLoading: sectionLoading } = useQuery({
    queryKey: ["sections", competitionId, sectionId],
    queryFn: () => sectionsApi.get(competitionId, sectionId),
  });

  const { data: summary, isLoading: summaryLoading, refetch } = useQuery({
    queryKey: ["section-summary", sectionId],
    queryFn: () => scoringApi.getSectionSummary(sectionId),
  });

  const { data: pairs } = useQuery({
    queryKey: ["pairs", competitionId, sectionId],
    queryFn: () => pairsApi.list(competitionId, sectionId),
  });

  const calculate = useMutation({
    mutationFn: () => scoringApi.calculateSectionSummary(sectionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["section-summary", sectionId] });
      toast({ title: "Summary calculated", variant: "success" } as Parameters<typeof toast>[0]);
    },
  });

  const approve = useMutation({
    mutationFn: () => scoringApi.approveResults(sectionId),
    onSuccess: () => {
      setApproved(true);
      toast({ title: "Results approved and published!", variant: "success" } as Parameters<typeof toast>[0]);
    },
  });

  const danceNames = section?.dances.map((d) => d.name) ?? [];

  // Build pair name map from pairs data
  const pairNames = Object.fromEntries(
    (pairs ?? []).map((p) => [
      p.id,
      `${p.dancer1FirstName} ${p.dancer1LastName}${p.dancer2FirstName ? ` & ${p.dancer2FirstName} ${p.dancer2LastName}` : ""}`,
    ])
  );

  if (sectionLoading) {
    return (
      <AppShell>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-4 h-96 w-full" />
      </AppShell>
    );
  }

  return (
    <AppShell
      headerActions={
        <div className="flex items-center gap-2">
          {!summary && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => calculate.mutate()}
              loading={calculate.isPending}
            >
              <BarChart3 className="h-4 w-4" />
              Calculate summary
            </Button>
          )}
          {summary && !approved && (
            <Button
              size="sm"
              onClick={() => {
                if (confirm("Approve and publish results? This will be visible to all participants."))
                  approve.mutate();
              }}
              loading={approve.isPending}
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve & publish
            </Button>
          )}
          {summary && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                router.push(
                  `/dashboard/competitions/${competitionId}/sections/${sectionId}/presentation`
                )
              }
            >
              <Presentation className="h-4 w-4" />
              Present
            </Button>
          )}
        </div>
      }
    >
      <PageHeader
        title={`${section?.name ?? "Section"} — Results`}
        description={`${section?.ageCategory} · ${section?.level} · ${section?.danceStyle}`}
        actions={
          approved ? (
            <Badge variant="success">Published</Badge>
          ) : (
            <Badge variant="secondary">Draft</Badge>
          )
        }
      />

      {summaryLoading && <Skeleton className="h-64 w-full" />}

      {!summaryLoading && !summary && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-20 text-center">
            <BarChart3 className="h-12 w-12 text-[var(--text-tertiary)]" />
            <div>
              <p className="font-medium text-[var(--text-primary)]">No final summary yet</p>
              <p className="text-sm text-[var(--text-secondary)]">
                Run the calculation after all final round votes are submitted.
              </p>
            </div>
            <Button onClick={() => calculate.mutate()} loading={calculate.isPending}>
              <BarChart3 className="h-4 w-4" />
              Calculate now
            </Button>
          </CardContent>
        </Card>
      )}

      {summary && summary.rankings.length > 0 && (
        <>
          {/* Podium cards */}
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            {summary.rankings.slice(0, 3).map((row) => (
              <Card
                key={row.pairId}
                className={cn(
                  "border-2",
                  row.finalPlacement === 1 && "border-yellow-400 bg-yellow-50/30",
                  row.finalPlacement === 2 && "border-slate-300 bg-slate-50/30",
                  row.finalPlacement === 3 && "border-amber-700/40 bg-amber-50/20"
                )}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <PlacementCell placement={row.finalPlacement} />
                    <span className="text-[var(--text-secondary)]">place</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold text-[var(--text-primary)]">
                    #{row.startNumber}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {pairNames[row.pairId] ?? `Pair #${row.startNumber}`}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                    Sum: {row.totalSum}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Full results table with audit trail */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-[var(--text-secondary)]">
                Full rankings — click a row to expand Skating System detail
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Place</TableHead>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Pair</TableHead>
                      <TableHead className="w-20">Sum</TableHead>
                      {danceNames.map((d) => (
                        <TableHead key={d} className="w-20 text-center text-xs">
                          {d}
                        </TableHead>
                      ))}
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.rankings.map((row) => (
                      <AuditTrailRow key={row.pairId} row={row} danceNames={danceNames} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Approval note */}
          {!approved && (
            <div className="mt-4 flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--warning)]/30 bg-[var(--warning)]/5 p-4">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
              <div className="text-sm">
                <p className="font-medium text-[var(--text-primary)]">Results pending approval</p>
                <p className="text-[var(--text-secondary)]">
                  Review the rankings above. Once approved, results will be visible to all
                  participants and the scoreboard.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
