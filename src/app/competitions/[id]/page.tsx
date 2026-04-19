"use client";

import { use, useState, useEffect } from "react";
import { LogoMark } from "@/components/ui/logo-mark";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import apiClient from "@/lib/api-client";
import type { CompetitionDto, CompetitionNewsItem } from "@/lib/api/competitions";
import { competitionKeys } from "@/hooks/queries/use-competitions";
import type { SectionDto } from "@/lib/api/sections";
import { sectionsApi } from "@/lib/api/sections";
import { ResultsSection } from "@/components/public/ResultsSection";
import { formatDate, formatCurrency } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useLocale } from "@/contexts/locale-context";
import { useAuthStore } from "@/store/auth-store";
import { selfRegistrationApi } from "@/lib/api/self-registration";
import type { SelfRegistrationResponse } from "@/lib/api/self-registration";
import { dancerApi } from "@/lib/api/dancer";
import axios from "axios";

/* ── shared style helpers ──────────────────────────────── */
const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #E5E7EB",
  borderRadius: 14,
  boxShadow: "0 1px 3px rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.04)",
  overflow: "hidden",
};

const sectionLabel = (icon: string, text: string) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", borderBottom: "1px solid #F3F4F6" }}>
    <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#4F46E5,#7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".8rem" }}>{icon}</div>
    <span style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontWeight: 700, fontSize: ".9rem", color: "#111827" }}>{text}</span>
  </div>
);

/* ── Nav ───────────────────────────────────────────────── */
function PublicNav() {
  const { t: _t, locale, setLocale } = useLocale();
  const { isAuthenticated, user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  const t = (key: string, params?: Record<string, string | number>) => mounted ? _t(key, params) : "";

  const dashboardHref = user?.role === "DANCER" ? "/profile/settings" : "/dashboard";

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "rgba(255,255,255,.95)", backdropFilter: "blur(20px)",
      borderBottom: "1px solid #E5E7EB", height: 60,
      display: "flex", alignItems: "center",
    }}>
      <div style={{ maxWidth: 860, margin: "0 auto", width: "100%", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/competitions" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" style={{ marginRight: 2 }}><polyline points="15 18 9 12 15 6"/></svg>
          <LogoMark size={24} />
          <span style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontWeight: 800, fontSize: "1rem", color: "#111827", letterSpacing: "-.02em" }}>ProPodium</span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {mounted && (
            <button
              onClick={() => setLocale(locale === "en" ? "cs" : "en")}
              title={locale === "en" ? "Přepnout do češtiny" : "Switch to English"}
              style={{ padding: "4px 10px", borderRadius: 6, fontSize: ".75rem", fontWeight: 500, letterSpacing: ".04em", color: "#6b7280", background: "#f3f4f6", border: "1px solid #e5e7eb", cursor: "pointer", fontFamily: "inherit" }}
            >
              {locale === "en" ? "CZ" : "EN"}
            </button>
          )}
          {mounted && isAuthenticated ? (
            <Link href={dashboardHref} style={{ fontSize: ".85rem", fontWeight: 600, color: "#4F46E5", textDecoration: "none" }}>
              {user?.name ? `${user.name.split(" ")[0]} →` : t("publicCompetition.myAccount")}
            </Link>
          ) : (
            <Link href="/login" style={{ fontSize: ".85rem", fontWeight: 600, color: "#4F46E5", textDecoration: "none" }}>{t("publicCompetition.organizerLogin")}</Link>
          )}
        </div>
      </div>
    </nav>
  );
}

/* ── Page ──────────────────────────────────────────────── */
export default function PublicCompetitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useLocale();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [selfRegResult, setSelfRegResult] = useState<SelfRegistrationResponse | null>(null);
  const [selfRegSubmitting, setSelfRegSubmitting] = useState<string | null>(null); // sectionId being submitted

  const { data: competition, isLoading } = useQuery({
    queryKey: competitionKeys.detail(id),
    queryFn: () => apiClient.get<CompetitionDto>(`/competitions/${id}`).then((r) => r.data),
    staleTime: 60_000,
  });

  const { data: sections = [] } = useQuery({
    queryKey: ["sections", "public", id],
    queryFn: () => apiClient.get<SectionDto[]>(`/competitions/${id}/sections`).then((r) => r.data),
    staleTime: 60_000,
  });

  const isDancer = isAuthenticated && user?.role === "DANCER";

  const { data: dancerProfile } = useQuery({
    queryKey: ["dancer-profile"],
    queryFn: () => dancerApi.getProfile(),
    enabled: isDancer,
    staleTime: 60_000,
  });

  const { data: eligibleSections = [] } = useQuery({
    queryKey: ["sections", "eligible", id, dancerProfile?.birthYear],
    queryFn: () => sectionsApi.getEligible(id, dancerProfile?.birthYear ?? undefined),
    enabled: isDancer && dancerProfile !== undefined,
    staleTime: 60_000,
  });

  const { data: newsItems = [] } = useQuery({
    queryKey: ["competition-news", id],
    queryFn: () => apiClient.get<CompetitionNewsItem[]>(`/competitions/${id}/news`).then((r) => r.data),
    staleTime: 0,
    retry: false,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: 10_000,
  });

  /* loading */
  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#F9FAFB" }}>
        <PublicNav />
        <div style={{ height: 240, background: "#0A1628" }} />
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <Skeleton className="h-12" /><Skeleton className="h-40" /><Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  /* not found */
  if (!competition) {
    return (
      <div style={{ minHeight: "100vh", background: "#F9FAFB" }}>
        <PublicNav />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "96px 24px", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg,#4F46E5,#7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.75rem" }}>🏆</div>
          <p style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontWeight: 700, fontSize: "1.1rem", color: "#111827" }}>{t("publicCompetition.notFound")}</p>
          <Link href="/competitions" style={{ padding: "9px 22px", borderRadius: 9, border: "1px solid #E5E7EB", fontSize: ".875rem", fontWeight: 600, color: "#4F46E5", textDecoration: "none" }}>{t("publicCompetition.allCompetitions")}</Link>
        </div>
      </div>
    );
  }

  const STATUS_LABEL: Record<string, string> = {
    DRAFT: t("publicCompetition.statusLabels.DRAFT"),
    PUBLISHED: t("publicCompetition.statusLabels.PUBLISHED"),
    IN_PROGRESS: t("publicCompetition.statusLabels.IN_PROGRESS"),
    COMPLETED: t("publicCompetition.statusLabels.COMPLETED"),
    CANCELLED: t("publicCompetition.statusLabels.CANCELLED"),
  };

  const isOpen = competition.registrationOpen === true;
  const isLive = competition.status === "IN_PROGRESS";
  const isCompleted = competition.status === "COMPLETED";
  const capacityPct = competition.maxPairs
    ? Math.round(((competition.registeredPairsCount ?? 0) / competition.maxPairs) * 100) : null;

  /* ── main ────────────────────────────────────── */
  return (
    <>
      <style>{`
        @keyframes orb{0%,100%{transform:translate(0,0)}33%{transform:translate(15px,-25px)}66%{transform:translate(-12px,18px)}}
        .sec-btn{transition:box-shadow .15s,border-color .15s,background .15s}
        .sec-btn:hover:not(:disabled){border-color:rgba(79,70,229,.4)!important;background:rgba(79,70,229,.03)!important}
      `}</style>

      <div style={{ minHeight: "100vh", background: "#F9FAFB" }}>
        <PublicNav />

        {/* ── HERO ── */}
        <div style={{ background: "#0A1628", position: "relative", overflow: "hidden", padding: "52px 24px 56px" }}>
          <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", filter: "blur(90px)", pointerEvents: "none", background: "radial-gradient(circle,rgba(79,70,229,.28) 0%,transparent 65%)", top: -200, right: -40, animation: "orb 9s ease-in-out infinite" }} />
          <div style={{ position: "absolute", width: 360, height: 360, borderRadius: "50%", filter: "blur(90px)", pointerEvents: "none", background: "radial-gradient(circle,rgba(6,182,212,.18) 0%,transparent 65%)", bottom: -140, left: -40, animation: "orb 11s ease-in-out -4s infinite" }} />

          <div style={{ position: "relative", zIndex: 1, maxWidth: 860, margin: "0 auto" }}>
            {/* status badge */}
            <div style={{ marginBottom: 16 }}>
              {isLive ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: ".73rem", fontWeight: 700, color: "#4ade80", background: "rgba(74,222,128,.12)", border: "1px solid rgba(74,222,128,.25)", padding: "4px 12px", borderRadius: 100 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
                  {STATUS_LABEL["IN_PROGRESS"] ?? "Probíhá"}
                </span>
              ) : isOpen ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: ".73rem", fontWeight: 700, color: "#6ee7b7", background: "rgba(110,231,183,.1)", border: "1px solid rgba(110,231,183,.2)", padding: "4px 12px", borderRadius: 100 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
                  {t("publicCompetition.registrationOpen")}
                </span>
              ) : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: ".73rem", fontWeight: 600, color: "rgba(255,255,255,.5)", background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", padding: "4px 12px", borderRadius: 100 }}>
                  {STATUS_LABEL[competition.status] ?? competition.status}
                </span>
              )}
            </div>

            {/* title */}
            <h1 style={{
              fontFamily: "var(--font-sora, Sora, sans-serif)", fontWeight: 800,
              fontSize: "clamp(1.6rem,4vw,2.8rem)", lineHeight: 1.1, letterSpacing: "-.03em",
              color: "#fff", marginBottom: 16, maxWidth: 680,
            }}>
              {competition.name}
            </h1>

            {/* meta row */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
              {competition.eventDate && (
                <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: ".875rem", color: "rgba(255,255,255,.85)" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  {formatDate(competition.eventDate)}
                </div>
              )}
              {competition.venue && (
                <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: ".875rem", color: "rgba(255,255,255,.85)" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {competition.venue}
                </div>
              )}
              {competition.registrationDeadline && (
                <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: ".875rem", color: "rgba(253,211,77,.95)" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {t("publicCompetition.registrationDeadline")}: {formatDate(competition.registrationDeadline)}
                </div>
              )}
              {competition.contactEmail && (
                <a href={`mailto:${competition.contactEmail}`} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: ".875rem", color: "rgba(255,255,255,.85)", textDecoration: "none" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  {competition.contactEmail}
                </a>
              )}
            </div>

            {/* stats chips */}
            <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
              <div style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, padding: "10px 16px" }}>
                <div style={{ fontSize: ".65rem", color: "rgba(255,255,255,.7)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 3 }}>{t("publicCompetition.statsRegistered")}</div>
                <div style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontWeight: 700, fontSize: "1.25rem", color: "#fff" }}>
                  {competition.registeredPairsCount ?? 0}
                  {competition.maxPairs && <span style={{ fontSize: ".75rem", fontWeight: 400, color: "rgba(255,255,255,.65)" }}> / {competition.maxPairs}</span>}
                </div>
              </div>
              {sections.length > 0 && (
                <div style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, padding: "10px 16px" }}>
                  <div style={{ fontSize: ".65rem", color: "rgba(255,255,255,.7)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 3 }}>{t("publicCompetition.categories")}</div>
                  <div style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontWeight: 700, fontSize: "1.25rem", color: "#fff" }}>{sections.length}</div>
                </div>
              )}
              {capacityPct !== null && (
                <div style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, padding: "10px 16px", minWidth: 160 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".65rem", color: "rgba(255,255,255,.7)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>
                    <span>{t("publicCompetition.capacity")}</span><span style={{ color: "#a5b4fc" }}>{capacityPct}%</span>
                  </div>
                  <div style={{ background: "rgba(255,255,255,.12)", borderRadius: 100, height: 5 }}>
                    <div style={{ height: 5, borderRadius: 100, background: "linear-gradient(90deg,#818CF8,#a5b4fc)", width: `${Math.min(capacityPct, 100)}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* wave */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 40, overflow: "hidden" }}>
            <svg viewBox="0 0 1440 40" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: "100%" }}>
              <path d="M0,20 C480,40 960,0 1440,20 L1440,40 L0,40 Z" fill="#F9FAFB" />
            </svg>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px 80px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* General description */}
          {competition.contentDescription && (
            <div style={cardStyle}>
              {sectionLabel("📝", t("publicCompetition.generalDescription"))}
              <div style={{ padding: 20 }}>
                <p style={{ fontSize: ".9rem", lineHeight: 1.75, color: "#374151", whiteSpace: "pre-line" }}>
                  {competition.contentDescription}
                </p>
              </div>
            </div>
          )}

          {/* Regulations */}
          {competition.propozice && (
            <div style={cardStyle}>
              {sectionLabel("📋", t("publicCompetition.rulesAndRegulations"))}
              <div style={{ padding: 20 }}>
                <p style={{ fontSize: ".9rem", lineHeight: 1.75, color: "#374151", whiteSpace: "pre-line" }}>
                  {competition.propozice}
                </p>
              </div>
            </div>
          )}

          {/* News */}
          {newsItems.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <h2 style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontWeight: 800, fontSize: "1.05rem", color: "#111827" }}>
                  {t("publicCompetition.news")}
                </h2>
                <span style={{ fontSize: ".75rem", fontWeight: 600, padding: "2px 9px", borderRadius: 100, background: "#EEF2FF", color: "#4F46E5" }}>{newsItems.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {newsItems.map((item) => (
                  <div key={item.id} style={cardStyle}>
                    <div style={{ padding: "16px 20px" }}>
                      <p style={{ fontSize: ".71rem", color: "#9CA3AF", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".06em" }}>
                        {new Date(item.publishedAt).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                      <p style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontWeight: 700, fontSize: ".95rem", color: "#111827", marginBottom: 6 }}>{item.title}</p>
                      <p style={{ fontSize: ".875rem", lineHeight: 1.65, color: "#4B5563" }}>{item.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results — only when COMPLETED */}
          {isCompleted && sections.length > 0 && (
            <ResultsSection sections={sections} />
          )}

          {/* Divider */}
          <div style={{ height: 1, background: "linear-gradient(90deg,transparent,#E5E7EB,transparent)" }} />

          {/* Auth-gated self-registration (dancer accounts) */}
          {isOpen && sections.length > 0 && (
            <div style={cardStyle}>
              {sectionLabel("🩰", isAuthenticated ? t("publicCompetition.selfRegister") : t("publicCompetition.loginToRegister"))}
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                {!isAuthenticated ? (
                  <div style={{ padding: "12px 0", textAlign: "center" }}>
                    <a href={`/login?returnTo=/competitions/${id}`} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 9, background: "linear-gradient(135deg,#4F46E5,#7C3AED)", color: "#fff", fontWeight: 700, fontSize: ".875rem", textDecoration: "none" }}>
                      {t("publicCompetition.loginToRegister")}
                    </a>
                    <p style={{ fontSize: ".78rem", color: "#9CA3AF", marginTop: 8 }}>
                      {t("publicCompetition.selfRegister")} — {t("publicCompetition.loginToRegister")}
                    </p>
                  </div>
                ) : (
                  <>
                    {selfRegResult && (
                      <div style={{ padding: "12px 14px", borderRadius: 9, background: "#ECFDF5", border: "1px solid #6EE7B7", marginBottom: 8 }}>
                        <p style={{ fontSize: ".875rem", fontWeight: 600, color: "#047857" }}>
                          {selfRegResult.status === "PENDING_PARTNER"
                            ? t("publicCompetition.selfRegisterPendingMsg", { number: String(selfRegResult.startNumber) })
                            : t("publicCompetition.selfRegisterSuccess", { number: String(selfRegResult.startNumber) })}
                        </p>
                      </div>
                    )}
                    {dancerProfile && !dancerProfile.onboardingCompleted && (
                      <div style={{ padding: "12px 14px", borderRadius: 9, background: "#FEF3C7", border: "1px solid #FCD34D" }}>
                        <p style={{ fontSize: ".875rem", fontWeight: 600, color: "#92400E", marginBottom: 6 }}>
                          {t("publicCompetition.completeProfileFirst")}
                        </p>
                        <a href="/onboarding" style={{ fontSize: ".8rem", color: "#4F46E5", fontWeight: 600, textDecoration: "underline" }}>
                          {t("publicCompetition.goToProfile")}
                        </a>
                      </div>
                    )}
                    {dancerProfile && dancerProfile.onboardingCompleted && !dancerProfile.birthYear && (
                      <div style={{ padding: "12px 14px", borderRadius: 9, background: "#FEF3C7", border: "1px solid #FCD34D" }}>
                        <p style={{ fontSize: ".875rem", fontWeight: 600, color: "#92400E", marginBottom: 6 }}>
                          {t("publicCompetition.missingBirthYear")}
                        </p>
                        <a href="/profile/settings" style={{ fontSize: ".8rem", color: "#4F46E5", fontWeight: 600, textDecoration: "underline" }}>
                          {t("publicCompetition.goToProfile")}
                        </a>
                      </div>
                    )}
                    {dancerProfile && dancerProfile.onboardingCompleted && !!dancerProfile.birthYear && eligibleSections.length === 0 && (
                      <div style={{ padding: "12px 14px", borderRadius: 9, background: "#F3F4F6", border: "1px solid #E5E7EB", textAlign: "center" }}>
                        <p style={{ fontSize: ".85rem", color: "#6B7280" }}>
                          {t("publicCompetition.noEligibleSections")}
                        </p>
                      </div>
                    )}
                    {eligibleSections.map((section) => {
                      const isBusy = selfRegSubmitting === section.id;
                      return (
                        <div key={section.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: 9, border: "1px solid #E5E7EB", padding: "10px 14px", background: "#fff" }}>
                          <div>
                            <p style={{ fontSize: ".875rem", fontWeight: 600, color: "#111827" }}>{section.name}</p>
                            <p style={{ fontSize: ".78rem", color: "#6B7280" }}>{section.ageCategory} · {section.level}</p>
                          </div>
                          <button
                            disabled={isBusy || !!selfRegResult}
                            onClick={async () => {
                              setSelfRegSubmitting(section.id);
                              try {
                                const res = await selfRegistrationApi.register(id, section.id);
                                setSelfRegResult(res);
                                toast({ title: t("publicCompetition.selfRegisterSuccess", { number: String(res.startNumber) }) });
                              } catch (err: unknown) {
                                const detail = axios.isAxiosError(err) ? err.response?.data?.message : undefined;
                                if (axios.isAxiosError(err) && err.response?.status === 409) {
                                  toast({ title: t("publicCompetition.registrationNotOpen"), variant: "destructive" });
                                } else if (detail?.includes("complete your profile")) {
                                  toast({ title: t("publicCompetition.completeProfileFirst"), variant: "destructive" });
                                } else if (detail?.includes("Birth year")) {
                                  toast({ title: t("publicCompetition.ageNotEligible"), variant: "destructive" });
                                } else {
                                  toast({ title: detail ?? t("publicRegister.failed"), variant: "destructive" });
                                }
                              } finally {
                                setSelfRegSubmitting(null);
                              }
                            }}
                            style={{ padding: "8px 16px", borderRadius: 8, fontSize: ".825rem", fontWeight: 700, background: "#4F46E5", color: "#fff", border: "none", cursor: (isBusy || !!selfRegResult) ? "not-allowed" : "pointer", opacity: (isBusy || !!selfRegResult) ? 0.6 : 1, whiteSpace: "nowrap", minHeight: 36 }}
                          >
                            {isBusy ? t("publicCompetition.submitting") : t("publicCompetition.selfRegister")}
                          </button>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Registration closed notice for dancers */}
          {!isOpen && isDancer && (
            <div style={{ ...cardStyle, padding: "48px 24px", textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: "#FFFBEB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", margin: "0 auto 16px" }}>⚠️</div>
              <p style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontWeight: 700, fontSize: "1rem", color: "#111827", marginBottom: 8 }}>{t("publicCompetition.registrationNotOpen")}</p>
              <p style={{ fontSize: ".875rem", color: "#6B7280", lineHeight: 1.6 }}>
                {t("publicCompetition.registrationNotOpenDesc")}
                {competition.contactEmail && (
                  <> <a href={`mailto:${competition.contactEmail}`} style={{ color: "#4F46E5", fontWeight: 600, textDecoration: "none" }}>{competition.contactEmail}</a></>
                )}
              </p>
            </div>
          )}


        </div>

        {/* Footer */}
        <div style={{ borderTop: "1px solid #E5E7EB", background: "#fff", padding: "24px", textAlign: "center" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <LogoMark size={22} />
            <span style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontWeight: 800, fontSize: ".9rem", color: "#111827" }}>ProPodium</span>
          </Link>
          <p style={{ fontSize: ".73rem", color: "#9CA3AF", marginTop: 6 }}>© 2026 ProPodium. Navrženo pro tanec.</p>
        </div>
      </div>
    </>
  );
}
