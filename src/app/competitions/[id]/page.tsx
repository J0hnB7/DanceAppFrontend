"use client";

import { use, useState, useEffect } from "react";
import { LogoMark } from "@/components/ui/logo-mark";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import apiClient from "@/lib/api-client";
import type { CompetitionDto, CompetitionNewsItem } from "@/lib/api/competitions";
import { competitionKeys } from "@/hooks/queries/use-competitions";
import type { SectionDto } from "@/lib/api/sections";
import { ResultsSection } from "@/components/public/ResultsSection";
import { formatDate, formatCurrency } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useLocale } from "@/contexts/locale-context";
import { useAuthStore } from "@/store/auth-store";
import { selfRegistrationApi } from "@/lib/api/self-registration";
import type { SelfRegistrationResponse } from "@/lib/api/self-registration";
import axios from "axios";

const schema = z.object({
  sectionIds: z.array(z.string()).min(1),
  dancer1FirstName: z.string().min(1),
  dancer1LastName: z.string().min(1),
  dancer1Club: z.string().optional(),
  dancer2FirstName: z.string().optional(),
  dancer2LastName: z.string().optional(),
  dancer2Club: z.string().optional(),
  discountCode: z.string().optional(),
  email: z.string().email(),
  gdpr: z.literal(true, { message: "" }),
});
type RegisterForm = z.infer<typeof schema>;

interface RegistrationResult {
  pairId: string;
  startNumber: number;
  sectionName: string;
  amountDue: number;
  currency: string;
}

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
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  const t = (key: string, params?: Record<string, string | number>) => mounted ? _t(key, params) : "";
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
          <Link href="/login" style={{ fontSize: ".85rem", fontWeight: 600, color: "#4F46E5", textDecoration: "none" }}>{t("publicCompetition.organizerLogin")}</Link>
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
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
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

  const { data: newsItems = [] } = useQuery({
    queryKey: ["competition-news", id],
    queryFn: () => apiClient.get<CompetitionNewsItem[]>(`/competitions/${id}/news`).then((r) => r.data),
    staleTime: 0,
    retry: false,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: 10_000,
  });

  const { register, control, handleSubmit, watch, trigger, setError, reset, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      sectionIds: [], dancer1FirstName: "", dancer1LastName: "", dancer1Club: "",
      dancer2FirstName: "", dancer2LastName: "", dancer2Club: "", discountCode: "", email: "", gdpr: undefined,
    },
  });

  const selectedSectionIds = watch("sectionIds");
  const selectedSections = sections.filter((s) => selectedSectionIds.includes(s.id));
  const totalFee = selectedSections.reduce((sum, s) => sum + (s.entryFee ?? 0), 0);
  const totalCurrency = selectedSections[0]?.entryFeeCurrency ?? "EUR";
  const isCouple = selectedSections.some((s) => s.competitionType === "COUPLE");


  const onSubmit = async (values: RegisterForm) => {
    if (isCouple) {
      let hasError = false;
      if (!values.dancer2FirstName?.trim()) {
        setError("dancer2FirstName", { message: t("publicRegister.validation.required") });
        hasError = true;
      }
      if (!values.dancer2LastName?.trim()) {
        setError("dancer2LastName", { message: t("publicRegister.validation.required") });
        hasError = true;
      }
      if (hasError) return;
    }
    setSubmitting(true);
    try {
      const res = await apiClient.post<RegistrationResult>(`/competitions/${id}/pairs/public-registration`, values);
      setResult(res.data);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        toast({ title: t("publicCompetition.capacityFull"), variant: "destructive" });
      } else {
        const apiErr = err as { message?: string };
        toast({ title: apiErr?.message ?? t("publicRegister.failed"), variant: "destructive" });
      }
    } finally {
      setSubmitting(false);
    }
  };

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
  const spotsLeft = competition.maxPairs ? competition.maxPairs - (competition.registeredPairsCount ?? 0) : null;

  /* ── success screen ─────────────────────────── */
  if (result) {
    return (
      <div style={{ minHeight: "100vh", background: "#F9FAFB" }}>
        <PublicNav />
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "64px 24px", textAlign: "center" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#059669,#10B981)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", margin: "0 auto 20px" }}>✓</div>
          <h1 style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontWeight: 800, fontSize: "1.4rem", color: "#111827", marginBottom: 6 }}>{t("publicCompetition.registrationConfirmed")}</h1>
          <p style={{ fontSize: ".9rem", color: "#6B7280", marginBottom: 28 }}>{competition.name}</p>

          <div style={{ ...cardStyle, padding: 24, marginBottom: 16, textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: ".8rem", color: "#9CA3AF" }}>{t("publicCompetition.startNumber")}</span>
              <span style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: "2.4rem", fontWeight: 800, color: "#4F46E5", lineHeight: 1 }}>#{result.startNumber}</span>
            </div>
            <p style={{ fontSize: ".85rem", color: "#6B7280" }}>{result.sectionName}</p>
          </div>

          {result.amountDue > 0 && (
            <div style={{ ...cardStyle, padding: 18, marginBottom: 16, textAlign: "left", borderColor: "rgba(245,158,11,.3)", background: "#FFFBEB" }}>
              <p style={{ fontSize: ".875rem", fontWeight: 600, color: "#111827" }}>
                {t("publicCompetition.entryFee", { amount: formatCurrency(result.amountDue, result.currency) })}
              </p>
              <p style={{ fontSize: ".8rem", color: "#6B7280", marginTop: 2 }}>{t("publicCompetition.payBeforeDeadline")}</p>
            </div>
          )}

          <p style={{ fontSize: ".85rem", color: "#9CA3AF", marginBottom: 20 }}>{t("publicCompetition.confirmationSent")}</p>
          <Link href="/competitions" style={{ fontSize: ".875rem", color: "#4F46E5", fontWeight: 600, textDecoration: "none" }}>
            {t("publicCompetition.backToAllCompetitions")}
          </Link>
        </div>
      </div>
    );
  }

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
                    {sections.map((section) => {
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

          {/* Registration */}
          {isOpen ? (
            <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* heading */}
              <div>
                <h2 style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontWeight: 800, fontSize: "1.3rem", color: "#111827", marginBottom: 4 }}>
                  {t("publicCompetition.registerPair")}
                </h2>
                {spotsLeft !== null && spotsLeft > 0 && (
                  <p style={{ fontSize: ".875rem", color: "#6B7280" }}>{t("publicCompetition.spotsLeftCount", { count: spotsLeft })}</p>
                )}
              </div>

              {/* 5a — category */}
              <div style={cardStyle}>
                {sectionLabel("🏅", t("publicCompetition.selectCategory"))}
                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                  <Controller control={control} name="sectionIds" render={({ field }) => (
                    <>
                      {sections.map((section) => {
                        const sl = section.maxPairs ? section.maxPairs - (section.registeredPairsCount ?? 0) : null;
                        const isFull = sl !== null && sl <= 0;
                        const almostFull = sl !== null && sl > 0 && sl <= 5;
                        const isSelected = field.value.includes(section.id);
                        const toggle = () => {
                          if (isFull) return;
                          field.onChange(isSelected
                            ? field.value.filter((id: string) => id !== section.id)
                            : [...field.value, section.id]);
                        };
                        return (
                          <button key={section.id} type="button" disabled={isFull}
                            onClick={toggle}
                            aria-pressed={isSelected}
                            className="sec-btn"
                            style={{
                              display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                              borderRadius: 10, border: isSelected ? "1.5px solid #4F46E5" : "1px solid #E5E7EB",
                              background: isSelected ? "rgba(79,70,229,.04)" : "#fff",
                              padding: "12px 14px", textAlign: "left", cursor: isFull ? "not-allowed" : "pointer",
                              opacity: isFull ? .5 : 1,
                            }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: 1 }}>
                              <div style={{
                                width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 2,
                                border: isSelected ? "none" : "1.5px solid #D1D5DB",
                                background: isSelected ? "#4F46E5" : "#fff",
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}>
                                {isSelected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                              </div>
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                                  <p style={{ fontSize: ".9rem", fontWeight: 600, color: "#111827" }}>{section.name}</p>
                                  {isFull && <span style={{ fontSize: ".65rem", fontWeight: 700, color: "#DC2626", background: "#FEF2F2", padding: "1px 7px", borderRadius: 100 }}>{t("publicCompetition.full")}</span>}
                                  {almostFull && <span style={{ fontSize: ".65rem", fontWeight: 700, color: "#D97706", background: "#FFFBEB", padding: "1px 7px", borderRadius: 100 }}>{t("publicCompetition.almostFull")}</span>}
                                </div>
                                <p style={{ fontSize: ".78rem", color: "#6B7280" }}>
                                  {section.ageCategory} · {section.level} · {section.dances.map((d) => d.name).join(", ")}
                                </p>
                              </div>
                            </div>
                            <div style={{ marginLeft: 12, textAlign: "right", flexShrink: 0 }}>
                              {section.entryFee
                                ? <p style={{ fontSize: ".9rem", fontWeight: 700, color: isSelected ? "#4F46E5" : "#6B7280" }}>{formatCurrency(section.entryFee, section.entryFeeCurrency ?? "EUR")}</p>
                                : <span style={{ fontSize: ".78rem", color: "#9CA3AF" }}>{section.registeredPairsCount} párů</span>
                              }
                            </div>
                          </button>
                        );
                      })}
                    </>
                  )} />
                  {errors.sectionIds && (
                    <p style={{ fontSize: ".78rem", color: "#DC2626" }}>{t("publicRegister.validation.selectCategory")}</p>
                  )}
                  {selectedSectionIds.length > 0 && (
                    <div style={{ borderRadius: 9, background: "#EEF2FF", border: "1px solid rgba(79,70,229,.2)", padding: "10px 14px", fontSize: ".875rem" }}>
                      <span style={{ color: "#6B7280" }}>{t("publicCompetition.entryFeeDisplay")} </span>
                      <span style={{ fontWeight: 700, color: "#4F46E5" }}>{formatCurrency(totalFee, totalCurrency)}</span>
                      <span style={{ fontSize: ".78rem", color: "#9CA3AF" }}> {t("publicCompetition.perPair")}</span>
                      {selectedSectionIds.length > 1 && (
                        <span style={{ fontSize: ".75rem", color: "#6B7280", display: "block", marginTop: 3 }}>
                          {selectedSections.map((s) => s.entryFee ? `${s.name}: ${formatCurrency(s.entryFee, s.entryFeeCurrency ?? "EUR")}` : s.name).join(" + ")}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 5b — payment info */}
              {competition.paymentInfo && (
                <div style={{ ...cardStyle, borderColor: "rgba(79,70,229,.2)", background: "#FAFAFA" }}>
                  <div style={{ padding: "14px 20px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: "linear-gradient(135deg,#4F46E5,#7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".85rem", flexShrink: 0 }}>💳</div>
                    <div>
                      <p style={{ fontSize: ".75rem", fontWeight: 700, color: "#4F46E5", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 5 }}>{t("publicCompetition.paymentInfo")}</p>
                      <p style={{ fontSize: ".875rem", lineHeight: 1.65, color: "#374151", whiteSpace: "pre-line" }}>{competition.paymentInfo}</p>
                    </div>
                  </div>
                </div>
              )}

              {(() => {
                const pc = competition.paymentConfig != null && typeof competition.paymentConfig === "object"
                  ? competition.paymentConfig as Record<string, string>
                  : null;
                return pc?.iban ? (
                  <div style={cardStyle}>
                    {sectionLabel("💳", t("publicCompetition.paymentInfo"))}
                    <div style={{ padding: "0 20px 16px", display: "flex", gap: 20, alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        {[
                          pc.holder && [t("publicCompetition.accountHolder"), pc.holder],
                          ["IBAN", pc.iban],
                          pc.bic && ["BIC/SWIFT", pc.bic],
                        ].filter(Boolean).map((row) => (
                          <div key={row![0]} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid #F3F4F6", gap: 12 }}>
                            <span style={{ fontSize: ".85rem", color: "#6B7280", flexShrink: 0, paddingTop: 1 }}>{row![0]}</span>
                            <span style={{ fontSize: ".875rem", fontWeight: 600, color: "#111827", fontFamily: row![0] === "IBAN" || row![0] === "BIC/SWIFT" ? "monospace" : undefined, textAlign: "right", wordBreak: "break-all" }}>{row![1]}</span>
                          </div>
                        ))}
                      </div>
                      {pc.qrCode && (
                        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                          <img
                            src={pc.qrCode}
                            alt={t("publicCompetition.scanQrCode")}
                            style={{ width: 120, height: 120, borderRadius: 10, border: "1px solid #E5E7EB", objectFit: "contain", background: "#fff", padding: 4 }}
                          />
                          <span style={{ fontSize: ".7rem", color: "#9CA3AF", fontWeight: 500 }}>{t("publicCompetition.scanQrCode")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* 5c — dancer info */}
              <div style={{ ...cardStyle, ["--surface" as string]: "#fff", ["--text-primary" as string]: "#111827", ["--text-secondary" as string]: "#374151", ["--text-tertiary" as string]: "#6B7280", ["--border" as string]: "#E5E7EB", ["--accent" as string]: "#4F46E5", ["--radius-md" as string]: "8px", ["--destructive" as string]: "#DC2626" }}>
                {sectionLabel("💃", t("publicCompetition.dancerInfo"))}
                <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                  <p style={{ fontSize: ".71rem", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: ".08em" }}>{t("publicCompetition.firstDancer")}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Input label={t("publicRegister.firstNameLabel")} placeholder="Jana" error={errors.dancer1FirstName?.message} {...register("dancer1FirstName")} />
                    <Input label={t("publicRegister.lastNameLabel")} placeholder="Nováková" error={errors.dancer1LastName?.message} {...register("dancer1LastName")} />
                  </div>
                  <Input label={t("publicRegister.clubLabel")} placeholder="Taneční klub Praha" {...register("dancer1Club")} />

                  <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                      <p style={{ fontSize: ".71rem", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: ".08em" }}>
                        {t("publicCompetition.partner")}
                        {isCouple
                          ? <span style={{ color: "#DC2626", marginLeft: 4 }}>*</span>
                          : <span style={{ fontWeight: 400, color: "#9CA3AF", marginLeft: 6, textTransform: "none", letterSpacing: 0, fontSize: ".7rem" }}>({t("publicRegister.optional")})</span>
                        }
                      </p>
                      {isCouple && (
                        <span style={{ fontSize: ".68rem", fontWeight: 600, color: "#4F46E5", background: "#EEF2FF", padding: "2px 8px", borderRadius: 100 }}>
                          {t("publicRegister.requiredForCouple")}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                      <Input label={t("publicRegister.firstNameLabel")} placeholder="Peter"
                        error={errors.dancer2FirstName?.message}
                        {...register("dancer2FirstName")} />
                      <Input label={t("publicRegister.lastNameLabel")} placeholder="Kováč"
                        error={errors.dancer2LastName?.message}
                        {...register("dancer2LastName")} />
                    </div>
                    <Input label={t("publicRegister.clubLabel")} placeholder="Taneční klub Praha" {...register("dancer2Club")} />
                  </div>

                  <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: 16 }}>
                    <Input label={t("publicRegister.emailLabel")} type="email" placeholder="vas@email.cz"
                      hint={t("publicRegister.emailHint")}
                      error={errors.email?.message} {...register("email")} />
                  </div>
                </div>
              </div>

              {/* GDPR */}
              <div style={{ ...cardStyle, padding: "16px 20px", display: "flex", alignItems: "flex-start", gap: 12 }}>
                <Controller control={control} name="gdpr" render={({ field }) => (
                  <input type="checkbox" id="gdpr"
                    style={{ marginTop: 2, width: 16, height: 16, accentColor: "#4F46E5", cursor: "pointer" }}
                    checked={field.value === true}
                    onChange={(e) => field.onChange(e.target.checked ? true : undefined)} />
                )} />
                <label htmlFor="gdpr" style={{ fontSize: ".875rem", color: "#4B5563", cursor: "pointer", lineHeight: 1.6 }}>
                  {t("publicRegister.gdprText")}{" "}
                  <Link href="/privacy" style={{ color: "#4F46E5", textDecoration: "none", fontWeight: 600 }}>
                    {t("publicRegister.gdprLink")}
                  </Link>.
                </label>
              </div>
              {errors.gdpr && (
                <p style={{ marginTop: -8, fontSize: ".78rem", color: "#DC2626" }}>{t("publicRegister.validation.gdprRequired")}</p>
              )}

              <button type="submit" disabled={submitting || spotsLeft === 0} aria-label={submitting ? t("publicCompetition.submitting") : t("publicCompetition.submitRegistration")} style={{
                padding: "14px 28px", borderRadius: 10, fontSize: "1rem", fontWeight: 700,
                background: "linear-gradient(135deg,#4F46E5,#7C3AED)", color: "#fff",
                border: "2px solid transparent", cursor: (submitting || spotsLeft === 0) ? "not-allowed" : "pointer", opacity: (submitting || spotsLeft === 0) ? .7 : 1,
                boxShadow: "0 4px 14px rgba(79,70,229,.4)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "opacity .2s", outline: "none",
              }} onFocus={(e) => { e.currentTarget.style.boxShadow = "0 0 0 3px rgba(79,70,229,.4)"; }} onBlur={(e) => { e.currentTarget.style.boxShadow = "0 4px 14px rgba(79,70,229,.4)"; }}>
                {spotsLeft === 0 ? t("publicCompetition.capacityFull") : submitting ? t("publicCompetition.submitting") : t("publicCompetition.submitRegistration")}
                {!submitting && spotsLeft !== 0 && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                )}
              </button>
            </form>
          ) : (
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
