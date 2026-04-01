"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { User, Trophy, ChevronDown, ChevronUp, LogOut } from "lucide-react";
import { dancerApi, type MyCompetitionEntry } from "@/lib/api/dancer";
import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";
import { useLocale } from "@/contexts/locale-context";

const ROUND_LABELS: Record<string, string> = {
  HEAT: "Skupiny",
  PRELIMINARY: "Předkolo",
  QUARTER_FINAL: "Čtvrtfinále",
  SEMIFINAL: "Semifinále",
  FINAL: "Finále",
  SINGLE_ROUND: "Jedno kolo",
};

const PAYMENT_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  PAID: { label: "Zaplaceno", color: "#15803D", bg: "#F0FDF4" },
  PENDING: { label: "Čeká", color: "#92400E", bg: "#FFFBEB" },
  UNPAID: { label: "Nezaplaceno", color: "#991B1B", bg: "#FEF2F2" },
};

function CompetitionCard({ entry }: { entry: MyCompetitionEntry }) {
  const [expanded, setExpanded] = useState(true);
  const { t } = useLocale();

  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB", overflow: "hidden" }}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%", padding: "18px 24px", display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          background: "none", border: "none", cursor: "pointer", textAlign: "left", gap: 12,
        }}
        aria-expanded={expanded}
        aria-label={entry.competitionName}
      >
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontWeight: 700, fontSize: "1rem", color: "#111827", marginBottom: 4 }}>
            {entry.competitionName}
          </p>
          <p style={{ fontSize: ".83rem", color: "#6B7280" }}>
            {new Date(entry.date).toLocaleDateString("cs-CZ", { year: "numeric", month: "long", day: "numeric" })}
            {entry.venue && ` · ${entry.venue}`}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <span style={{ fontSize: ".8rem", color: "#6B7280" }}>
            {entry.sections.length} {t("dancer.competitions.sectionCount")}
          </span>
          {expanded
            ? <ChevronUp className="h-5 w-5 text-gray-400" aria-hidden="true" />
            : <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />}
        </div>
      </button>

      {/* Sections */}
      {expanded && (
        <div style={{ borderTop: "1px solid #F3F4F6" }}>
          {entry.sections.map((section, i) => {
            const payment = PAYMENT_LABELS[section.paymentStatus] ?? { label: section.paymentStatus, color: "#6B7280", bg: "#F9FAFB" };
            return (
              <div
                key={section.sectionId}
                style={{
                  padding: "14px 24px",
                  borderTop: i > 0 ? "1px solid #F9FAFB" : undefined,
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: "0 16px",
                  alignItems: "center",
                }}
              >
                {/* Start number */}
                <div style={{
                  width: 40, height: 40, borderRadius: 8, background: "linear-gradient(135deg,#4F46E5,#6D28D9)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font-sora, Sora, sans-serif)", fontWeight: 800, fontSize: ".9rem", color: "#fff",
                }}>
                  {section.startNumber}
                </div>

                {/* Section info */}
                <div>
                  <p style={{ fontWeight: 600, fontSize: ".9rem", color: "#111827", marginBottom: 3 }}>{section.sectionName}</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: ".75rem", padding: "2px 8px", borderRadius: 100, background: payment.bg, color: payment.color, fontWeight: 600 }}>
                      {payment.label}
                    </span>
                    {section.reachedRound && (
                      <span style={{ fontSize: ".75rem", padding: "2px 8px", borderRadius: 100, background: "#EEF2FF", color: "#4338CA", fontWeight: 500 }}>
                        {ROUND_LABELS[section.reachedRound] ?? section.reachedRound}
                      </span>
                    )}
                  </div>
                </div>

                {/* Placement */}
                <div style={{ textAlign: "right" }}>
                  {section.finalPlacement != null ? (
                    <div>
                      <p style={{ fontSize: "1.1rem", fontWeight: 800, fontFamily: "var(--font-sora, Sora, sans-serif)", color: section.finalPlacement <= 3 ? "#D97706" : "#111827" }}>
                        #{section.finalPlacement}
                      </p>
                      <p style={{ fontSize: ".73rem", color: "#9CA3AF" }}>{t("dancer.competitions.placement")}</p>
                    </div>
                  ) : (
                    <p style={{ fontSize: ".8rem", color: "#9CA3AF" }}>—</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function MyCompetitionsPage() {
  const { t } = useLocale();
  const router = useRouter();
  const { logout } = useAuthStore();
  const [competitions, setCompetitions] = useState<MyCompetitionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dancerApi.getMyCompetitions().then((data) => {
      setCompetitions(data);
      setLoading(false);
    }).catch((err: unknown) => {
      const apiErr = err as { message?: string };
      setError(apiErr?.message ?? t("dancer.competitions.loadError"));
      setLoading(false);
    });
  }, [t]);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        .mycomp-fade{animation:fadeUp .4s ease both}
        .prof-nav-link{padding:8px 16px;border-radius:8px;font-size:.87rem;font-weight:500;color:#6B7280;text-decoration:none;transition:background .15s}
        .prof-nav-link:hover{background:#F3F4F6;color:#111827}
        .prof-nav-link.active{background:#EEF2FF;color:#4F46E5;font-weight:600}
      `}</style>

      <div style={{ minHeight: "100vh", background: "#F3F4F6", fontFamily: "var(--font-inter, Inter, sans-serif)" }}>
        {/* Top nav */}
        <nav style={{ background: "#fff", borderBottom: "1px solid #E5E7EB", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg,#4F46E5,#06B6D4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".6rem", fontWeight: 900, color: "#fff" }}>PP</div>
              <span style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontWeight: 800, fontSize: ".95rem", color: "#111827" }}>ProPodium</span>
            </Link>
            <div style={{ display: "flex", gap: 4 }}>
              <Link href="/profile" className="prof-nav-link">
                <User className="inline h-4 w-4 mr-1" aria-hidden="true" />{t("dancer.profile.navProfile")}
              </Link>
              <Link href="/profile/my-competitions" className="prof-nav-link active">
                <Trophy className="inline h-4 w-4 mr-1" aria-hidden="true" />{t("dancer.profile.navCompetitions")}
              </Link>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: ".85rem", color: "#6B7280", background: "none", border: "none", cursor: "pointer", padding: "6px 10px", borderRadius: 7 }}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />{t("nav.logout")}
          </button>
        </nav>

        <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: "1.4rem", fontWeight: 800, color: "#111827", marginBottom: 6 }}>
              {t("dancer.competitions.title")}
            </h1>
            <p style={{ fontSize: ".9rem", color: "#6B7280" }}>{t("dancer.competitions.subtitle")}</p>
          </div>

          {loading && (
            <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #E5E7EB", borderTopColor: "#4F46E5", animation: "spin .8s linear infinite" }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {error && (
            <div style={{ padding: "16px 20px", borderRadius: 10, background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", fontSize: ".9rem" }}>
              {error}
            </div>
          )}

          {!loading && !error && competitions.length === 0 && (
            <div style={{ textAlign: "center", padding: "64px 16px" }}>
              <Trophy className="h-12 w-12 mx-auto mb-4" style={{ color: "#D1D5DB" }} aria-hidden="true" />
              <p style={{ fontSize: "1rem", fontWeight: 600, color: "#374151", marginBottom: 8 }}>{t("dancer.competitions.emptyTitle")}</p>
              <p style={{ fontSize: ".88rem", color: "#9CA3AF" }}>{t("dancer.competitions.emptyDesc")}</p>
            </div>
          )}

          <div className="mycomp-fade" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {competitions.map((entry) => (
              <CompetitionCard key={entry.competitionId} entry={entry} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
