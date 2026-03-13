"use client";

import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  exportable?: boolean;
  exportFilename?: string;
  emptyMessage?: string;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  className?: string;
}

type SortDir = "asc" | "desc" | null;

function exportToCSV<T>(data: T[], columns: DataTableColumn<T>[], filename: string) {
  const headers = columns.map((c) => c.label).join(",");
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const val = (row as Record<string, unknown>)[col.key as string];
        const str = val == null ? "" : String(val);
        return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      })
      .join(",")
  );
  const csv = [headers, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function DataTable<T>({
  data,
  columns,
  searchable,
  searchPlaceholder = "Search...",
  searchKeys,
  exportable,
  exportFilename = "export",
  emptyMessage = "No data",
  rowKey,
  onRowClick,
  className,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const handleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortKey(null);
      setSortDir(null);
    }
  };

  const processed = useMemo(() => {
    let result = [...data];

    // Filter
    if (search && searchKeys) {
      const q = search.toLowerCase();
      result = result.filter((row) =>
        searchKeys.some((k) => {
          const v = (row as Record<string, unknown>)[k as string];
          return v != null && String(v).toLowerCase().includes(q);
        })
      );
    }

    // Sort
    if (sortKey && sortDir) {
      result.sort((a, b) => {
        const av = (a as Record<string, unknown>)[sortKey] ?? "";
        const bv = (b as Record<string, unknown>)[sortKey] ?? "";
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [data, search, searchKeys, sortKey, sortDir]);

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey !== colKey) return <ChevronsUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? (
      <ChevronUp className="h-3 w-3" />
    ) : (
      <ChevronDown className="h-3 w-3" />
    );
  };

  return (
    <div className={cn("space-y-3", className)}>
      {(searchable || exportable) && (
        <div className="flex items-center justify-between gap-3">
          {searchable && (
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
          )}
          {exportable && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV(processed, columns, exportFilename)}
              className="ml-auto"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          )}
        </div>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={String(col.key)}
                  className={cn(col.className, col.sortable && "cursor-pointer select-none")}
                  onClick={col.sortable ? () => handleSort(String(col.key)) : undefined}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && <SortIcon colKey={String(col.key)} />}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {processed.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-12 text-center text-[var(--text-secondary)]">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              processed.map((row) => (
                <TableRow
                  key={rowKey(row)}
                  className={cn(onRowClick && "cursor-pointer hover:bg-[var(--surface-hover)]")}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <TableCell key={String(col.key)} className={col.className}>
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key as string] ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {processed.length > 0 && (
        <p className="text-xs text-[var(--text-tertiary)]">
          {processed.length} {processed.length === 1 ? "row" : "rows"}
          {search && ` (filtered from ${data.length})`}
        </p>
      )}
    </div>
  );
}
