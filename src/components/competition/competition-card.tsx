"use client";

import { useRouter } from "next/navigation";
import { Calendar, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { CompetitionSummary, CompetitionStatus } from "@/lib/api/competitions";
import { useToggleRegistration } from "@/hooks/queries/use-competitions";
import { useLocale } from "@/contexts/locale-context";

const statusVariants: Record<CompetitionStatus, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  PUBLISHED: "outline",
  IN_PROGRESS: "success",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

interface CompetitionCardProps {
  competition: CompetitionSummary;
  registrationOpen?: boolean;
}

function RegistrationToggle({ competition, registrationOpen }: { competition: CompetitionSummary; registrationOpen: boolean }) {
  const canToggle = competition.status === "DRAFT" || competition.status === "PUBLISHED";
  const toggle = useToggleRegistration(competition.id, registrationOpen);
  const { t } = useLocale();

  if (!canToggle) return null;

  return (
    <button
      type="button"
      disabled={toggle.isPending}
      onClick={(e) => { e.stopPropagation(); toggle.mutate(); }}
      className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-50"
    >
      <span className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors duration-200 ${registrationOpen ? "bg-[var(--success)]" : "bg-[var(--border)]"}`}>
        <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform duration-200 ${registrationOpen ? "translate-x-3.5" : "translate-x-0.5"}`} />
      </span>
      <span className={registrationOpen ? "text-[var(--success-text)]" : "text-[var(--text-secondary)]"}>
        {toggle.isPending ? "..." : t("competitionDetail.pairsForRegistration")}
      </span>
    </button>
  );
}

export function CompetitionCard({ competition, registrationOpen }: CompetitionCardProps) {
  const regOpen = registrationOpen ?? competition.registrationOpen ?? false;
  const router = useRouter();
  const { t } = useLocale();
  const isLive = competition.status === "IN_PROGRESS";

  return (
    <div
      className="cursor-pointer rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-md"
      onClick={() => router.push(`/dashboard/competitions/${competition.id}`)}
    >
      {/* Name + badge */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <p className="font-semibold text-[var(--text-primary)] leading-tight">{competition.name}</p>
        {isLive ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--success-subtle)] px-2.5 py-0.5 text-xs font-semibold text-[var(--success-text)]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
        ) : (
          <Badge variant={statusVariants[competition.status]} className="shrink-0 text-xs">
            {t(`status.${competition.status}`)}
          </Badge>
        )}
      </div>

      {/* Meta */}
      <div className="mb-1 flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
        <Calendar className="h-3.5 w-3.5 shrink-0" />
        <span>{formatDate(competition.eventDate)}</span>
      </div>
      <div className="mb-4 flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
        <Users className="h-3.5 w-3.5 shrink-0" />
        <span>{t("competition.pairsCount", { count: competition.pairCount })} · {competition.sectionCount} {t("section.title").toLowerCase()}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <RegistrationToggle competition={competition} registrationOpen={regOpen} />
        <Button
          size="sm"
          variant="outline"
          className="text-xs"
          onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/competitions/${competition.id}`); }}
        >
          {t("common.view")}
        </Button>
      </div>
    </div>
  );
}
