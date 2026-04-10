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

export interface PreliminaryRoundDetail {
  roundId: string;
  roundLabel: string;
  dances: string[];
  judges: { tokenId: string; label: string }[];
  pairs: {
    pairId: string;
    startNumber: number;
    dancerName: string;
    club: string | null;
    place: string;
    marksByDance: Record<string, string>;
    total: number;
  }[];
}

function CallbackMarks({ marks }: { marks: string }) {
  return (
    <span className="font-mono text-base tracking-wide">
      {marks.split("").map((ch, i) => (
        <span
          key={i}
          className={cn(
            ch === "x"
              ? "text-[var(--accent)] font-semibold"
              : "text-[var(--text-tertiary)]"
          )}
        >
          {ch}
        </span>
      ))}
    </span>
  );
}

export function PrelimRoundTable({ data }: { data: PreliminaryRoundDetail }) {
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
          {t("results.prelimDetailCaption", { round: data.roundLabel })}
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
              className="hover:bg-[var(--surface-hover)] transition-colors duration-150"
            >
              <TableCell
                scope="row"
                className="sticky left-0 z-10 bg-[var(--surface)] text-center font-bold text-[var(--text-secondary)]"
              >
                {row.place}
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
              {data.dances.map((dance) => (
                <TableCell key={dance} className="text-center">
                  <CallbackMarks marks={row.marksByDance[dance] ?? ""} />
                </TableCell>
              ))}
              <TableCell className="text-center font-bold text-[var(--text-primary)]">
                {row.total}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
