"use client";

import Link from "next/link";
import { Calendar, MapPin, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { CompetitionDto, CompetitionStatus } from "@/lib/api/competitions";
import { useToggleRegistration } from "@/hooks/queries/use-competitions";
import { useLocale } from "@/contexts/locale-context";

const statusVariants: Record<CompetitionStatus, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  PUBLISHED: "outline",
  REGISTRATION_OPEN: "success",
  IN_PROGRESS: "success",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

// Statuses for which the registration toggle makes sense
const TOGGLEABLE_STATUSES: CompetitionStatus[] = ["DRAFT", "PUBLISHED", "REGISTRATION_OPEN"];

function RegistrationToggle({ competition }: { competition: CompetitionDto }) {
  const isOpen = competition.status === "REGISTRATION_OPEN";
  const isToggleable = TOGGLEABLE_STATUSES.includes(competition.status);
  const toggle = useToggleRegistration(competition.id, competition.status);
  const { t } = useLocale();

  if (!isToggleable) return null;

  return (
    <button
      type="button"
      aria-label={isOpen ? t("competition.toggleCloseAriaLabel") : t("competition.toggleOpenAriaLabel")}
      disabled={toggle.isPending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle.mutate();
      }}
      className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] px-2 py-1.5 text-xs transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-50"
    >
      <span
        className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
          isOpen ? "bg-[var(--success)]" : "bg-[var(--border)]"
        }`}
      >
        <span
          className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform duration-200 ${
            isOpen ? "translate-x-3.5" : "translate-x-0.5"
          }`}
        />
      </span>
      <span className={isOpen ? "font-medium text-[var(--success)]" : "text-[var(--text-secondary)]"}>
        {toggle.isPending ? "..." : isOpen ? t("competition.registrationOpenLabel") : t("competition.registrationOpenAction")}
      </span>
    </button>
  );
}

interface CompetitionCardProps {
  competition: CompetitionDto;
}

export function CompetitionCard({ competition }: CompetitionCardProps) {
  const { t } = useLocale();
  const variant = statusVariants[competition.status];
  const isLive = competition.status === "IN_PROGRESS";

  return (
    <Link href={`/dashboard/competitions/${competition.id}`} className="block">
      <Card className="flex flex-col cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2 text-sm">{competition.name}</CardTitle>
            {isLive ? (
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
                Live
              </span>
            ) : (
              <Badge variant={variant} className="shrink-0">
                {t(`status.${competition.status}`)}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-2 pb-4">
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{competition.location}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>
              {formatDate(competition.startDate)}
              {competition.startDate !== competition.endDate &&
                ` – ${formatDate(competition.endDate)}`}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span>
              {competition.registeredPairsCount} {t("common.pairs")}
              {competition.maxPairs && ` / ${competition.maxPairs}`}
            </span>
          </div>

          {/* One-click registration toggle */}
          <div className="mt-2 border-t border-[var(--border)] pt-2">
            <RegistrationToggle competition={competition} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
