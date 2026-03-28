"use client";

import { Trophy, Medal } from "lucide-react";
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
import type { RoundResultsResponse, PreliminaryResultResponse } from "@/lib/api/scoring";
import { useLocale } from "@/contexts/locale-context";

export function PlacementBadge({ placement }: { placement: number }) {
  if (placement === 1) return <Trophy className="h-4 w-4 text-yellow-500" />;
  if (placement === 2) return <Medal className="h-4 w-4 text-gray-400" />;
  if (placement === 3) return <Medal className="h-4 w-4 text-amber-700" />;
  return <span className="font-mono text-sm font-bold">{placement}</span>;
}

export function FinalResults({ results }: { results: RoundResultsResponse }) {
  const { t } = useLocale();
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
                  <TableHead className="w-16">{t("roundResults.place")}</TableHead>
                  <TableHead className="w-12">{t("roundResults.number")}</TableHead>
                  <TableHead>{t("roundResults.dancer")}</TableHead>
                  <TableHead className="w-16">{t("roundResults.rule")}</TableHead>
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

export function PreliminaryResults({ results }: { results: PreliminaryResultResponse }) {
  const { t } = useLocale();
  const advancing = results.pairs.filter((p) => p.advances);
  const notAdvancing = results.pairs.filter((p) => !p.advances);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Badge variant="success">{t("roundResults.advancing", { count: advancing.length })}</Badge>
        <Badge variant="secondary">{t("roundResults.eliminated", { count: notAdvancing.length })}</Badge>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">{t("roundResults.number")}</TableHead>
              <TableHead>{t("roundResults.dancer")}</TableHead>
              <TableHead className="w-24">{t("roundResults.votes")}</TableHead>
              <TableHead className="w-24">{t("roundResults.status")}</TableHead>
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
                    {row.advances ? t("roundResults.advances") : t("roundResults.out")}
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
