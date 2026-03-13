"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Archive, Trophy, Calendar, MapPin, ChevronRight } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { competitionsApi, type CompetitionDto } from "@/lib/api/competitions";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

type GroupKey = string; // year string

function groupByYear(competitions: CompetitionDto[]): Record<GroupKey, CompetitionDto[]> {
  return competitions.reduce<Record<GroupKey, CompetitionDto[]>>((acc, c) => {
    const year = new Date(c.startDate).getFullYear().toString();
    (acc[year] ??= []).push(c);
    return acc;
  }, {});
}

function ArchiveCard({ comp }: { comp: CompetitionDto }) {
  return (
    <Link href={`/dashboard/competitions/${comp.id}`} className="block group">
      <div className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 transition-colors hover:bg-[var(--surface-secondary)]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-secondary)] group-hover:bg-[var(--accent)]/10 transition-colors">
          <Trophy className="h-5 w-5 text-[var(--text-tertiary)] group-hover:text-[var(--accent)] transition-colors" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[var(--text-primary)] truncate">{comp.name}</p>
          <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] mt-0.5">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(comp.startDate)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {comp.location}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-[var(--text-tertiary)]">{comp.registeredPairsCount} pairs</span>
          <Badge variant="default" className="text-xs">{comp.status.replace(/_/g, " ")}</Badge>
          <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)]" />
        </div>
      </div>
    </Link>
  );
}

export default function ArchivePage() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["competitions-archive"],
    queryFn: () => competitionsApi.list({ size: 200, status: "COMPLETED" }),
  });

  const competitions = data?.content ?? [];

  const filtered = search.trim()
    ? competitions.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.location.toLowerCase().includes(search.toLowerCase())
      )
    : competitions;

  const byYear = groupByYear(filtered);
  const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a));

  const totalPairs = competitions.reduce((s, c) => s + c.registeredPairsCount, 0);

  return (
    <AppShell title="Archive">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">Archive</h1>
            <p className="text-sm text-[var(--text-secondary)]">All past competitions</p>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-[var(--text-primary)]">{competitions.length}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Competitions</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-[var(--text-primary)]">{years.length}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Years</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-[var(--text-primary)]">{totalPairs.toLocaleString()}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Total pairs</p>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search competitions…"
            className="pl-9"
          />
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 py-20 text-center">
            <Archive className="h-10 w-10 text-[var(--text-tertiary)]" />
            <p className="text-sm text-[var(--text-secondary)]">
              {search ? "No competitions match your search." : "No completed competitions yet."}
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {years.map((year) => (
              <div key={year} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{year}</h2>
                  <span className="text-xs text-[var(--text-tertiary)]">{byYear[year].length} events</span>
                </div>
                {byYear[year].map((comp) => (
                  <ArchiveCard key={comp.id} comp={comp} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
