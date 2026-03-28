"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, Users, Settings, ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { CompetitionSummary, CompetitionStatus } from "@/lib/api/competitions";
import { useLocale } from "@/contexts/locale-context";


const STATUS_STYLE: Record<CompetitionStatus, { bg: string; color: string; border?: string }> = {
  DRAFT:       { bg: "transparent",             color: "#9CA3AF", border: "1px solid #E5E7EB" },
  PUBLISHED:   { bg: "rgba(59,130,246,0.08)",   color: "#3B82F6" },
  IN_PROGRESS: { bg: "rgba(16,185,129,0.1)",    color: "#10B981" },
  COMPLETED:   { bg: "rgba(107,114,128,0.08)",  color: "#6B7280" },
  CANCELLED:   { bg: "rgba(220,38,38,0.08)",    color: "#DC2626" },
};

interface CompetitionCardProps {
  competition: CompetitionSummary;
}

export function CompetitionCard({ competition }: CompetitionCardProps) {
  const router = useRouter();
  const { t } = useLocale();
  const isLive = competition.status === "IN_PROGRESS";

  const STATUS_LABEL: Record<CompetitionStatus, string> = {
    DRAFT: t("status.DRAFT"),
    PUBLISHED: t("status.PUBLISHED"),
    IN_PROGRESS: t("status.IN_PROGRESS"),
    COMPLETED: t("status.COMPLETED"),
    CANCELLED: t("status.CANCELLED"),
  };
  const style = STATUS_STYLE[competition.status];

  // Progress: pairCount / capacity (if available), else use sectionCount as proxy
  const progressPct = Math.min(100, competition.pairCount > 0 ? Math.min(100, (competition.pairCount / Math.max(competition.pairCount, 1)) * 100) : 0);

  return (
    <div
      className="cursor-pointer overflow-hidden transition-all hover:-translate-y-0.5"
      style={{
        background: "var(--surface)",
        borderRadius: 16,
        border: "1px solid var(--border)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
      onClick={() => router.push(`/dashboard/competitions/${competition.id}`)}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)"; }}
    >
      {/* Top */}
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4">
        <div className="min-w-0">
          <p
            className="font-bold leading-tight tracking-[-0.02em] mb-1.5"
            style={{
              fontFamily: "var(--font-sora, Sora, sans-serif)",
              fontSize: "1.05rem",
              color: "var(--text-primary)",
            }}
          >
            {competition.name}
          </p>
          {/* Meta */}
          <div className="flex items-center gap-3 flex-wrap">
            {competition.eventDate && (
              <span className="flex items-center gap-1 text-[0.78rem]" style={{ color: "var(--text-secondary)" }}>
                <Calendar className="h-3 w-3 shrink-0" style={{ color: "var(--text-tertiary)" }} />
                {formatDate(competition.eventDate)}
              </span>
            )}
          </div>
        </div>

        {/* Badge */}
        {isLive ? (
          <span
            className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.3px] rounded-full"
            style={{ background: "rgba(16,185,129,0.1)", color: "#10B981" }}
          >
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
        ) : (
          <span
            className="shrink-0 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.3px] rounded-full"
            style={{ background: style.bg, color: style.color, border: style.border }}
          >
            {STATUS_LABEL[competition.status]}
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="flex gap-4 px-5">
        <span className="text-[0.75rem]" style={{ color: "var(--text-secondary)" }}>
          <strong
            className="mr-0.5"
            style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontWeight: 700, fontSize: "0.88rem", color: "var(--text-primary)" }}
          >
            {competition.pairCount}
          </strong>
          {t("competition.pairsCount", { count: competition.pairCount }).replace(/^\d+\s*/, "")}
        </span>
        <span className="text-[0.75rem]" style={{ color: "var(--text-secondary)" }}>
          <strong
            className="mr-0.5"
            style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontWeight: 700, fontSize: "0.88rem", color: "var(--text-primary)" }}
          >
            {competition.sectionCount}
          </strong>
          {t("section.title").toLowerCase()}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mx-5 mt-3.5 h-1 rounded-full" style={{ background: "var(--border)" }}>
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${isLive ? 60 : competition.status === "COMPLETED" ? 100 : progressPct}%`,
            background: isLive ? "#10B981" : "#3B82F6",
          }}
        />
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-5 py-3.5 mt-3.5"
        style={{ borderTop: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <Link
          href={`/dashboard/competitions/${competition.id}`}
          className="flex items-center gap-1 text-[0.82rem] font-semibold"
          style={{ color: "var(--accent, #3B82F6)", textDecoration: "none" }}
        >
          {t("dashboard.openDetail")}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <div className="flex items-center gap-1.5">
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-all"
            style={{ border: "1px solid var(--border)", background: "none", color: "var(--text-tertiary)" }}
            title={t("nav.settings")}
            onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/competitions/${competition.id}/settings`); }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#3B82F6";
              (e.currentTarget as HTMLButtonElement).style.color = "#3B82F6";
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(59,130,246,0.08)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-tertiary)";
              (e.currentTarget as HTMLButtonElement).style.background = "none";
            }}
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-all"
            style={{ border: "1px solid var(--border)", background: "none", color: "var(--text-tertiary)" }}
            title={t("nav.pairs")}
            onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/competitions/${competition.id}/pairs`); }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#3B82F6";
              (e.currentTarget as HTMLButtonElement).style.color = "#3B82F6";
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(59,130,246,0.08)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-tertiary)";
              (e.currentTarget as HTMLButtonElement).style.background = "none";
            }}
          >
            <Users className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
