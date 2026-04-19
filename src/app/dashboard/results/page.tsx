"use client";

import { AppShell } from "@/components/layout/app-shell";
import { useQuery } from "@tanstack/react-query";
import { dancerApi, type MyCompetitionEntry } from "@/lib/api/dancer";
import { useLocale } from "@/contexts/locale-context";
import { Medal, MapPin, Calendar, Hash, ExternalLink } from "lucide-react";
import Link from "next/link";

const ROUND_LABELS: Record<string, { cs: string; en: string; color: string }> = {
  FINAL:        { cs: "Finále",          en: "Final",          color: "#F59E0B" },
  SEMIFINAL:    { cs: "Semifinále",      en: "Semifinal",      color: "#0A84FF" },
  QUARTER_FINAL:{ cs: "Čtvrtfinále",     en: "Quarter-final",  color: "#0A84FF" },
  PRELIMINARY:  { cs: "Předkolo",        en: "Preliminary",    color: "var(--text-tertiary)" },
  HEAT:         { cs: "Skupinová kola",  en: "Heats",          color: "var(--text-tertiary)" },
  SINGLE_ROUND: { cs: "Jednokolo",       en: "Single round",   color: "#0A84FF" },
};

function RoundBadge({ round, locale }: { round: string | null; locale: string }) {
  if (!round) return null;
  const info = ROUND_LABELS[round] ?? { cs: round, en: round, color: "var(--text-tertiary)" };
  const label = locale === "en" ? info.en : info.cs;
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: 20,
      fontSize: ".75rem",
      fontWeight: 600,
      color: info.color,
      background: `${info.color}18`,
      border: `1px solid ${info.color}44`,
    }}>
      {label}
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg, 12px)",
      padding: "20px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 4,
    }}>
      <span style={{ fontSize: ".75rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: ".06em" }}>
        {label}
      </span>
      <span style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-sora)" }}>
        {value}
      </span>
    </div>
  );
}

function CompetitionCard({ entry, locale }: { entry: MyCompetitionEntry; locale: string }) {
  const dateStr = entry.date
    ? new Date(entry.date).toLocaleDateString(locale === "cs" ? "cs-CZ" : "en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "—";

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg, 12px)",
      padding: "20px 24px",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              {entry.competitionName}
            </h3>
            <Link
              href={`/competitions/${entry.competitionId}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={locale === "cs" ? "Výsledky soutěže" : "Competition results"}
              style={{ color: "var(--text-tertiary)", display: "flex", alignItems: "center" }}
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", fontSize: ".82rem", color: "var(--text-secondary)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              {dateStr}
            </span>
            {entry.venue && (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {entry.venue}
              </span>
            )}
          </div>
        </div>

        <RoundBadge round={entry.reachedRound} locale={locale} />
      </div>

      <div style={{
        marginTop: 14,
        paddingTop: 14,
        borderTop: "1px solid var(--border)",
        display: "flex",
        flexWrap: "wrap",
        gap: "6px 24px",
        fontSize: ".82rem",
        color: "var(--text-secondary)",
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Medal className="h-3.5 w-3.5" aria-hidden="true" />
          {entry.sectionName}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Hash className="h-3.5 w-3.5" aria-hidden="true" />
          {locale === "cs" ? "Startovní číslo" : "Start number"}: <strong style={{ color: "var(--text-primary)" }}>{entry.startNumber}</strong>
        </span>
      </div>
    </div>
  );
}

export default function MyResultsPage() {
  const { t, locale } = useLocale();

  const { data: entries = [], isLoading, isError } = useQuery({
    queryKey: ["dancer-competitions"],
    queryFn: () => dancerApi.getMyCompetitions(),
    staleTime: 60_000,
  });

  const sorted = [...entries].sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const finalCount = entries.filter((e) => e.reachedRound === "FINAL").length;

  return (
    <AppShell>
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "32px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{
            fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)",
            fontFamily: "var(--font-sora)", marginBottom: 4,
          }}>
            {t("nav.myResults")}
          </h1>
          <p style={{ fontSize: ".88rem", color: "var(--text-secondary)" }}>
            {locale === "cs" ? "Vaše soutěžní historie a dosažené výsledky" : "Your competition history and results"}
          </p>
        </div>

        {/* Stats */}
        {!isLoading && !isError && entries.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 28 }}>
            <StatCard
              label={locale === "cs" ? "Soutěže celkem" : "Competitions"}
              value={entries.length}
            />
            <StatCard
              label={locale === "cs" ? "Finálových účastí" : "Finals reached"}
              value={finalCount}
            />
          </div>
        )}

        {/* Content */}
        {isLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{
                height: 120, borderRadius: "var(--radius-lg, 12px)",
                background: "var(--surface)", border: "1px solid var(--border)",
                animation: "pulse 1.5s ease-in-out infinite",
              }} />
            ))}
          </div>
        )}

        {isError && (
          <div style={{
            padding: "24px", borderRadius: "var(--radius-lg, 12px)",
            background: "var(--surface)", border: "1px solid var(--border)",
            textAlign: "center", color: "var(--text-secondary)", fontSize: ".9rem",
          }}>
            {locale === "cs" ? "Nepodařilo se načíst výsledky." : "Failed to load results."}
          </div>
        )}

        {!isLoading && !isError && sorted.length === 0 && (
          <div style={{
            padding: "48px 24px", borderRadius: "var(--radius-lg, 12px)",
            background: "var(--surface)", border: "1px solid var(--border)",
            textAlign: "center",
          }}>
            <Medal className="mx-auto h-10 w-10 mb-4" style={{ color: "var(--text-tertiary)" }} aria-hidden="true" />
            <p style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
              {locale === "cs" ? "Zatím žádné soutěže" : "No competitions yet"}
            </p>
            <p style={{ fontSize: ".85rem", color: "var(--text-secondary)" }}>
              {locale === "cs"
                ? "Vaše výsledky se zobrazí po přihlášení na první soutěž."
                : "Your results will appear after registering for your first competition."}
            </p>
          </div>
        )}

        {!isLoading && !isError && sorted.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sorted.map((entry, i) => (
              <CompetitionCard key={`${entry.competitionId}-${entry.sectionName}-${i}`} entry={entry} locale={locale} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
