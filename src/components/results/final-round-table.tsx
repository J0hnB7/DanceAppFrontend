"use client";

import { useLocale } from "@/contexts/locale-context";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Trophy, Medal } from "lucide-react";

export interface FinalRoundDetail {
  roundId: string;
  roundLabel: string;
  dances: string[];
  judges: { tokenId: string; label: string }[];
  pairs: {
    pairId: string;
    startNumber: number;
    dancerName: string;
    club: string | null;
    finalPlace: number;
    marksByDance: Record<string, { rawMarks: string; calculatedPlacement: number }>;
    totalSum: number;
  }[];
}

function PlacementIcon({ placement }: { placement: number }) {
  if (placement === 1) return <Trophy className="h-4 w-4 text-yellow-500 inline-block mr-1" aria-hidden="true" />;
  if (placement === 2) return <Medal className="h-4 w-4 text-slate-400 inline-block mr-1" aria-hidden="true" />;
  if (placement === 3) return <Medal className="h-4 w-4 text-amber-700 inline-block mr-1" aria-hidden="true" />;
  return null;
}

function RawMarks({ marks }: { marks: string }) {
  return (
    <span className="font-mono text-base text-[var(--text-primary)] tracking-wide">
      {marks}
    </span>
  );
}

export function FinalRoundTable({ data }: { data: FinalRoundDetail }) {
  const { t } = useLocale();

  if (!data.pairs.length) {
    return (
      <p className="text-sm text-[var(--text-secondary)]">
        {t("results.noResults")}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto max-w-[100vw] rounded-[var(--radius-md)] border border-[var(--border)]">
      <Table>
        <caption className="sr-only">
          {t("results.finalDetailCaption", { round: data.roundLabel })}
        </caption>
        <TableHeader>
          <TableRow className="bg-[var(--surface)]">
            <TableHead scope="col" className="sticky left-0 z-20 bg-[var(--surface)] w-12 text-center">
              {t("results.place")}
            </TableHead>
            <TableHead scope="col" className="sticky left-12 z-20 bg-[var(--surface)] w-10">
              #
            </TableHead>
            <TableHead scope="col" className="sticky left-[4.5rem] z-20 bg-[var(--surface)] min-w-[140px]">
              {t("results.dancers")}
            </TableHead>
            {data.dances.map((dance) => (
              <TableHead
                key={dance}
                scope="col"
                className="text-center min-w-[100px] font-[var(--font-sora)] text-xs"
              >
                {dance}
              </TableHead>
            ))}
            <TableHead scope="col" className="w-16 text-center font-semibold">
              {t("results.sum")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.pairs.map((row) => (
            <TableRow
              key={row.pairId}
              className={cn(
                "hover:bg-[var(--surface-hover)] transition-colors duration-150",
                row.finalPlace <= 3 && "bg-yellow-50/30"
              )}
            >
              <TableCell
                scope="row"
                className="sticky left-0 z-10 bg-[var(--surface)] text-center font-bold"
              >
                <span className={cn(
                  row.finalPlace === 1 && "text-yellow-600",
                  row.finalPlace === 2 && "text-slate-500",
                  row.finalPlace === 3 && "text-amber-700",
                  row.finalPlace > 3 && "text-[var(--text-secondary)]",
                )}>
                  <PlacementIcon placement={row.finalPlace} />
                  {row.finalPlace}.
                </span>
              </TableCell>
              <TableCell className="sticky left-12 z-10 bg-[var(--surface)] font-mono font-bold">
                {row.startNumber}
              </TableCell>
              <TableCell className="sticky left-[4.5rem] z-10 bg-[var(--surface)]">
                <span className="font-medium text-[var(--text-primary)]">
                  {row.dancerName}
                </span>
                {row.club && (
                  <span className="ml-1.5 text-xs text-[var(--text-tertiary)]">
                    {row.club}
                  </span>
                )}
              </TableCell>
              {data.dances.map((dance) => {
                const mark = row.marksByDance[dance];
                return (
                  <TableCell key={dance} className="text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <RawMarks marks={mark?.rawMarks ?? "—"} />
                      <span className="text-xs text-[var(--text-secondary)] font-medium">
                        {mark?.calculatedPlacement ?? "—"}
                      </span>
                    </div>
                  </TableCell>
                );
              })}
              <TableCell className="text-center font-bold text-[var(--text-primary)]">
                {row.totalSum}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
