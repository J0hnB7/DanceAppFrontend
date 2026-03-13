"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  competitions: "Competitions",
  sections: "Sections",
  rounds: "Rounds",
  results: "Results",
  judges: "Judges",
  pairs: "Pairs",
  new: "New",
  settings: "Settings",
  analytics: "Analytics",
  participants: "Participants",
  "my-registrations": "My Registrations",
  archive: "Archive",
  live: "Live",
  presentation: "Presentation",
  "dance-offs": "Dance-offs",
  fees: "Fees",
  payments: "Payments",
  schedule: "Schedule",
  diplomas: "Diplomas",
  notifications: "Notifications",
  seed: "Seeder",
};

function isUuid(s: string) {
  return /^[0-9a-f-]{32,}$/i.test(s) || /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(s);
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // Only show breadcrumbs when depth > 2 (e.g. /dashboard/competitions/[id]/...)
  if (segments.length <= 2) return null;

  const crumbs: { label: string; href: string }[] = [];
  let path = "";

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    path += `/${seg}`;

    // Skip UUIDs as standalone crumbs — they become part of the next named segment's context
    if (isUuid(seg)) continue;

    const label = SEGMENT_LABELS[seg] ?? seg;
    crumbs.push({ label, href: path });
  }

  if (crumbs.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.href} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" />}
            {isLast ? (
              <span className="font-medium text-[var(--text-secondary)]">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="hover:text-[var(--text-primary)] transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
