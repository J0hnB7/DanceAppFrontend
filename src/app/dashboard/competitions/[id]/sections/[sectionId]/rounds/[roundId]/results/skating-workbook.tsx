"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { RoundResultsResponse } from "@/lib/api/scoring";
import { useLocale } from "@/contexts/locale-context";

interface SkatingWorkbookProps {
  results: RoundResultsResponse;
  judgeCount: number;
}

const RULE_COLORS: Record<string, string> = {
  R5: "rounded px-1.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  R6: "rounded px-1.5 py-0.5 text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  R7: "rounded px-1.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  R8: "rounded px-1.5 py-0.5 text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

function parseDetail(detail: string): { count?: number; sum?: number; k?: number } {
  try {
    return JSON.parse(detail);
  } catch {
    return {};
  }
}

export function SkatingWorkbook({ results, judgeCount }: SkatingWorkbookProps) {
  const { t } = useLocale();
  const majority = Math.floor(judgeCount / 2) + 1;

  return (
    <div className="space-y-6">
      {results.dances.map((dance) => {
        const numPairs = dance.rankings.length;
        const sorted = [...dance.rankings].sort((a, b) => a.placement - b.placement);

        return (
          <Card key={dance.danceId}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[var(--text-primary)]">
                {t("workbook.dance")}:{" "}
                <span className="text-[var(--accent)]">{dance.danceName}</span>
                <span className="ml-2 text-xs font-normal text-[var(--text-tertiary)]">
                  ({numPairs} {t("workbook.pairs")},{" "}
                  {t("workbook.majority")}: {majority})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-secondary)]">
                    <th className="py-2 pl-4 text-left text-xs font-semibold text-[var(--text-secondary)]">
                      #
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--text-secondary)]">
                      {t("workbook.pair")}
                    </th>
                    {Array.from({ length: numPairs }, (_, i) => i + 1).map((k) => (
                      <th
                        key={k}
                        className="px-2 py-2 text-center text-xs font-semibold text-[var(--text-secondary)]"
                      >
                        ≤{k}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center text-xs font-semibold text-[var(--text-secondary)]">
                      {t("workbook.place")}
                    </th>
                    <th className="pr-4 py-2 text-center text-xs font-semibold text-[var(--text-secondary)]">
                      {t("workbook.rule")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row) => {
                    const detail = parseDetail(row.detail);
                    const winningK = detail.k;
                    return (
                      <tr
                        key={row.pairId}
                        className={cn(
                          "border-b border-[var(--border)] last:border-0",
                          row.placement <= 3 &&
                            "bg-yellow-50/30 dark:bg-yellow-950/10"
                        )}
                      >
                        <td className="py-2 pl-4 font-mono font-semibold text-[var(--text-secondary)]">
                          {row.startNumber}
                        </td>
                        <td className="px-3 py-2 text-[var(--text-primary)]">
                          {row.dancer1Name}
                        </td>
                        {Array.from({ length: numPairs }, (_, i) => i + 1).map((k) => (
                          <td
                            key={k}
                            className={cn(
                              "px-2 py-2 text-center text-xs",
                              winningK === k &&
                                "font-bold text-[var(--accent)] bg-[var(--accent)]/5"
                            )}
                          >
                            {winningK === k && detail.count != null ? (
                              <span>
                                {detail.count}
                                {detail.sum != null && (
                                  <span className="text-[var(--text-tertiary)]">
                                    /{detail.sum}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-[var(--text-tertiary)]">—</span>
                            )}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-center font-bold text-[var(--text-primary)]">
                          {row.placement}
                        </td>
                        <td className="pr-4 py-2 text-center">
                          <span
                            className={
                              RULE_COLORS[row.ruleApplied] ??
                              "rounded px-1.5 py-0.5 text-xs font-semibold bg-[var(--surface-secondary)] text-[var(--text-secondary)]"
                            }
                          >
                            {row.ruleApplied}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
