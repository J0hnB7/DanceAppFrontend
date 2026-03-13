import { Suspense } from "react";
import type { Metadata } from "next";
import { Trophy, MapPin, Calendar, Users, Search } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Competitions",
  description: "Browse upcoming dance competitions and register your pairs.",
};

// Server component — fetched at request time for SEO
async function getPublicCompetitions() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/competitions?status=REGISTRATION_OPEN&size=20`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.content ?? [];
  } catch {
    return [];
  }
}

interface CompetitionListItem {
  id: string;
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  registeredPairsCount: number;
  maxPairs?: number;
  registrationDeadline?: string;
}

function CompetitionListCard({ comp }: { comp: CompetitionListItem }) {
  return (
    <Link
      href={`/competitions/${comp.id}`}
      className="group block rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition-all hover:shadow-md hover:border-[var(--accent)]/40"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
          {comp.name}
        </h2>
        <span className="shrink-0 rounded-full bg-[var(--success)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--success)]">
          Open
        </span>
      </div>
      <div className="flex flex-col gap-1.5 text-sm text-[var(--text-secondary)]">
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {comp.location}
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          {formatDate(comp.startDate)}
          {comp.startDate !== comp.endDate && ` – ${formatDate(comp.endDate)}`}
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 shrink-0" />
          {comp.registeredPairsCount} registered
          {comp.maxPairs && ` / ${comp.maxPairs} max`}
        </div>
        {comp.registrationDeadline && (
          <p className="mt-1 text-xs text-[var(--warning)]">
            Deadline: {formatDate(comp.registrationDeadline)}
          </p>
        )}
      </div>
    </Link>
  );
}

export default async function PublicCompetitionsPage() {
  const competitions = await getPublicCompetitions();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Nav */}
      <nav className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
            <Trophy className="h-5 w-5 text-[var(--accent)]" />
            DanceApp
          </Link>
          <Link href="/login" className="text-sm text-[var(--accent)] hover:underline">
            Organizer login →
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Open competitions</h1>
          <p className="mt-1 text-[var(--text-secondary)]">
            Register your pair for an upcoming competition.
          </p>
        </div>

        {competitions.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <Trophy className="h-12 w-12 text-[var(--text-tertiary)]" />
            <p className="font-medium text-[var(--text-primary)]">No open competitions right now</p>
            <p className="text-sm text-[var(--text-secondary)]">Check back soon for upcoming events.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {competitions.map((c: CompetitionListItem) => (
              <CompetitionListCard key={c.id} comp={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
