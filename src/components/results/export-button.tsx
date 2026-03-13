"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportResultsToExcel, exportResultsToPDF } from "@/lib/export";
import type { SectionFinalSummaryResponse } from "@/lib/api/scoring";

interface ExportButtonProps {
  summary: SectionFinalSummaryResponse;
  sectionName: string;
  competitionName: string;
}

export function ExportButton({ summary, sectionName, competitionName }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExcel = async () => {
    setLoading(true);
    await exportResultsToExcel(summary, sectionName, competitionName);
    setLoading(false);
  };

  const handlePDF = () => {
    exportResultsToPDF(summary, sectionName, competitionName);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" loading={loading}>
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExcel}>
          <FileSpreadsheet className="h-4 w-4 text-green-600" />
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePDF}>
          <FileText className="h-4 w-4 text-red-500" />
          PDF (print)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
