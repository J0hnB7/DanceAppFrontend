"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Medal } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { roundsApi } from "@/lib/api/rounds";
import { scoringApi } from "@/lib/api/scoring";
import type { RoundResultsResponse, PreliminaryResultResponse } from "@/lib/api/scoring";

function PlacementBadge({ placement }: { placement: number }) {
  if (placement === 1) return <Trophy className="h-4 w-4 text-yellow-500" />;
  if (placement === 2) return <Medal className="h-4 w-4 text-gray-400" />;
  if (placement === 3) return <Medal className="h-4 w-4 text-amber-700" />;
  return <span className="font-mono text-sm font-bold">{placement}</span>;
}

export default function RoundResultsPage({
  params,
}: {
  params: Promise<{ id: string; sectionId: string; roundId: string }>;
}) {
  const { roundId } = use(params);

  const { data: round, isLoading: roundLoading } = useQuery({
    queryKey: ["rounds", "detail", roundId],
    queryFn: () => roundsApi.get(roundId),
  });

  const { data: results, isLoading: resultsLoading } = useQuery({
    queryKey: ["rounds", "detail", roundId, "results"],
    queryFn: () => roundsApi.getResults(roundId),
    enabled: round?.status === "CALCULATED",
  });

  if (roundLoading) {
    return (
      <AppShell>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-4 h-96 w-full" />
      </AppShell>
    );
  }

  const isFinal = round?.roundType === "FINAL";
  const isPreliminary = round?.roundType === "PRELIMINARY";

  return (
    <AppShell>
      <PageHeader
        title={`${round?.roundType} Results`}
        description={`Round ${round?.roundNumber}`}
        actions={<Badge variant="success">Calculated</Badge>}
      />

      {resultsLoading && <Skeleton className="h-96 w-full" />}

      {isFinal && results && (
        <FinalResults results={results as RoundResultsResponse} />
      )}

      {isPreliminary && results && (
        <PreliminaryResults results={results as PreliminaryResultResponse} />
      )}

      {round?.status !== "CALCULATED" && (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Trophy className="h-12 w-12 text-[var(--text-tertiary)]" />
          <p className="text-[var(--text-secondary)]">Results not yet calculated</p>
        </div>
      )}
    </AppShell>
  );
}

function FinalResults({ results }: { results: RoundResultsResponse }) {
  return (
    <div className="flex flex-col gap-6">
      {results.dances.map((dance) => (
        <Card key={dance.danceId}>
          <CardHeader>
            <CardTitle className="text-sm">{dance.danceName}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Place</TableHead>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Dancer</TableHead>
                  <TableHead className="w-16">Rule</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dance.rankings.map((row) => (
                  <TableRow key={row.pairId}>
                    <TableCell>
                      <PlacementBadge placement={row.placement} />
                    </TableCell>
                    <TableCell className="font-mono font-semibold">{row.startNumber}</TableCell>
                    <TableCell className="font-medium">{row.dancer1Name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono">
                        {row.ruleApplied}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PreliminaryResults({ results }: { results: PreliminaryResultResponse }) {
  const advancing = results.pairs.filter((p) => p.advances);
  const notAdvancing = results.pairs.filter((p) => !p.advances);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Badge variant="success">{advancing.length} advancing</Badge>
        <Badge variant="secondary">{notAdvancing.length} eliminated</Badge>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Dancer</TableHead>
              <TableHead className="w-24">Votes</TableHead>
              <TableHead className="w-24">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.pairs.map((row) => (
              <TableRow key={row.pairId}>
                <TableCell className="font-mono font-semibold">{row.startNumber}</TableCell>
                <TableCell className="font-medium">{row.dancer1Name}</TableCell>
                <TableCell className="font-semibold">{row.voteCount}</TableCell>
                <TableCell>
                  <Badge variant={row.advances ? "success" : "secondary"}>
                    {row.advances ? "Advances" : "Out"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
