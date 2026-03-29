"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api-client";
import { useLocale } from "@/contexts/locale-context";

interface CompetitionListItem {
  id: string;
  name: string;
  venue?: string;
  eventDate?: string;
  registrationDeadline?: string;
  registeredPairsCount?: number;
  sectionsCount?: number;
  maxPairs?: number;
  registrationOpen?: boolean;
  status?: string;
  location?: string;
}

function getMonthKey(dateStr?: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthHeading(key: string, locale: string) {
  const [year, month] = key.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  const label = d.toLocaleDateString(locale === "en" ? "en-GB" : "cs-CZ", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const selectCls =
  "w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5] transition-colors";
const labelCls = "mb-1 block text-xs font-semibold text-[#6B7280] uppercase tracking-wide";

export default function PublicCompetitionsPage() {
  const router = useRouter();
  const { t, locale } = useLocale();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [competitorType, setCompetitorType] = useState("all");
  const [ageCategory, setAgeCategory] = useState("all");
  const [level, setLevel] = useState("all");
  const [danceStyle, setDanceStyle] = useState("all");
  const [competitionType, setCompetitionType] = useState("all");
  const [series, setSeries] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [activeFilters, setActiveFilters] = useState({
    search: "", status: "all", from: "", to: "",
  });

  const { data: competitions = [], isLoading } = useQuery({
    queryKey: ["public-competitions"],
    queryFn: async () => {
      try {
        const r = await apiClient.get("/competitions?size=200");
        const data = r.data;
        if (Array.isArray(data)) return data as CompetitionListItem[];
        if (data?.content && Array.isArray(data.content)) return data.content as CompetitionListItem[];
        return [] as CompetitionListItem[];
      } catch {
        return [] as CompetitionListItem[];
      }
    },
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    return competitions.filter((c) => {
      if (activeFilters.search && !c.name.toLowerCase().includes(activeFilters.search.toLowerCase())) return false;
      if (activeFilters.status === "open" && !c.registrationOpen) return false;
      if (activeFilters.status === "live" && c.status !== "IN_PROGRESS") return false;
      if (activeFilters.status === "archive" && c.status !== "COMPLETED") return false;
      if (activeFilters.from && c.eventDate && c.eventDate < activeFilters.from) return false;
      if (activeFilters.to && c.eventDate && c.eventDate > activeFilters.to) return false;
      return true;
    });
  }, [competitions, activeFilters]);

  const noDateKey = t("publicCompetitions.noDate");
  const grouped = useMemo(() => {
    const map = new Map<string, CompetitionListItem[]>();
    for (const c of filtered) {
      const key = getMonthKey(c.eventDate) || noDateKey;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return map;
  }, [filtered, noDateKey]);

  const today = new Date().toISOString().slice(0, 10);
  const inThreeMonths = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const handleFilter = () => {
    setActiveFilters({ search, status: statusFilter, from: dateFrom, to: dateTo });
  };

  return (
    <>
      <style>{`
        @keyframes orb{0%,100%{transform:translate(0,0)}33%{transform:translate(15px,-25px)}66%{transform:translate(-12px,18px)}}
        .comp-card{transition:box-shadow .2s,transform .2s,border-color .2s}
        .comp-card:hover{box-shadow:0 4px 6px rgba(0,0,0,.04),0 20px 48px rgba(0,0,0,.10)!important;transform:translateY(-2px);border-color:rgba(79,70,229,.3)!important}
      `}</style>

      <div style={{ minHeight: "100vh", background: "#F9FAFB" }}>

        {/* ── NAV ── */}
        <nav style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "rgba(255,255,255,.95)", backdropFilter: "blur(20px)",
          borderBottom: "1px solid #E5E7EB",
          height: 60, display: "flex", alignItems: "center",
        }}>
          <div style={{ maxWidth: 1160, margin: "0 auto", width: "100%", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <button
                onClick={() => router.back()}
                aria-label={t("publicCompetitions.back")}
                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: ".85rem", color: "#6B7280", background: "none", border: "none", cursor: "pointer", padding: "10px 8px", minHeight: 44, minWidth: 44 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
                {t("publicCompetitions.back")}
              </button>
              <span style={{ color: "#E5E7EB" }}>|</span>
              <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
                <div style={{ width: 24, height: 24, borderRadius: 7, background: "linear-gradient(135deg,#4F46E5,#06B6D4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".65rem", fontWeight: 900, color: "#fff" }}>DA</div>
                <span style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontWeight: 800, fontSize: "1rem", color: "#111827", letterSpacing: "-.02em" }}>DanceApp</span>
              </Link>
            </div>
            <Link href="/login" style={{ fontSize: ".85rem", fontWeight: 600, color: "#4F46E5", textDecoration: "none" }}>
              {t("publicCompetitions.organizerLogin")}
            </Link>
          </div>
        </nav>

        {/* ── HERO HEADER ── */}
        <div style={{
          background: "#0A1628", position: "relative", overflow: "hidden",
          padding: "56px 24px 60px", textAlign: "center",
        }}>
          {/* orbs */}
          <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", filter: "blur(90px)", pointerEvents: "none", background: "radial-gradient(circle,rgba(79,70,229,.28) 0%,transparent 65%)", top: -200, right: -60, animation: "orb 9s ease-in-out infinite" }} />
          <div style={{ position: "absolute", width: 380, height: 380, borderRadius: "50%", filter: "blur(90px)", pointerEvents: "none", background: "radial-gradient(circle,rgba(6,182,212,.18) 0%,transparent 65%)", bottom: -150, left: -40, animation: "orb 11s ease-in-out -4s infinite" }} />

          <div style={{ position: "relative", zIndex: 1, maxWidth: 640, margin: "0 auto" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 14px", borderRadius: 100, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.07)", fontSize: ".73rem", fontWeight: 500, color: "rgba(255,255,255,.7)", marginBottom: 20 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
              {t("publicCompetitions.badge")} · {new Date().getFullYear()}
            </div>
            <h1 style={{
              fontFamily: "var(--font-sora, Sora, sans-serif)", fontWeight: 800,
              fontSize: "clamp(2rem,5vw,3.2rem)", lineHeight: 1.08, letterSpacing: "-.04em",
              color: "#fff", marginBottom: 14,
            }}>
              {t("publicCompetitions.title")}
            </h1>
            <p style={{ fontSize: "1rem", color: "rgba(255,255,255,.75)", lineHeight: 1.7, marginBottom: 0 }}>
              {t("publicCompetitions.subtitle")}
            </p>
          </div>

          {/* wave */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 40, overflow: "hidden" }}>
            <svg viewBox="0 0 1440 40" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: "100%" }}>
              <path d="M0,20 C480,40 960,0 1440,20 L1440,40 L0,40 Z" fill="#F9FAFB" />
            </svg>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "40px 24px 80px" }}>

          {/* Filter panel */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: 24, marginBottom: 32, boxShadow: "0 1px 3px rgba(0,0,0,.07),0 8px 24px rgba(0,0,0,.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#4F46E5,#7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".85rem" }}>🔍</div>
              <span style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontWeight: 700, fontSize: ".97rem", color: "#111827" }}>{t("publicCompetitions.filterTitle")}</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px 16px" }} className="filter-grid">
              <div>
                <label htmlFor="filter-series" className={labelCls}>{t("publicCompetitions.series")}</label>
                <select id="filter-series" className={selectCls} value={series} onChange={(e) => setSeries(e.target.value)}>
                  <option value="all">{t("publicCompetitions.allOptions")}</option>
                  <option value="CZECH_CHAMPIONSHIP">Mistrovství ČR</option>
                  <option value="CZECH_CUP">Český pohár</option>
                  <option value="EXTRALIGA">Extraliga</option>
                  <option value="LIGA_I">Liga I</option>
                  <option value="LIGA_II">Liga II</option>
                  <option value="GRAND_PRIX">Grand Prix</option>
                  <option value="OPEN">Open</option>
                </select>
              </div>
              <div>
                <label htmlFor="filter-competitor-type" className={labelCls}>{t("publicCompetitions.competitors")}</label>
                <select id="filter-competitor-type" className={selectCls} value={competitorType} onChange={(e) => setCompetitorType(e.target.value)}>
                  <option value="all">{t("publicCompetitions.allOptions")}</option>
                  <option value="AMATEURS">Amatéři</option>
                  <option value="PROFESSIONALS">Profesionálové</option>
                </select>
              </div>
              <div>
                <label htmlFor="filter-age-category" className={labelCls}>{t("publicCompetitions.ageCategory")}</label>
                <select id="filter-age-category" className={selectCls} value={ageCategory} onChange={(e) => setAgeCategory(e.target.value)}>
                  <option value="all">{t("publicCompetitions.allOptions")}</option>
                  <option value="CHILDREN_I">Děti I</option>
                  <option value="CHILDREN_II">Děti II</option>
                  <option value="JUNIOR_I">Junioři I</option>
                  <option value="JUNIOR_II">Junioři II</option>
                  <option value="YOUTH">Mládež</option>
                  <option value="ADULT">Dospělí</option>
                  <option value="SENIOR_I">Senioři I</option>
                  <option value="SENIOR_II">Senioři II</option>
                </select>
              </div>
              <div>
                <label htmlFor="filter-level" className={labelCls}>{t("publicCompetitions.level")}</label>
                <select id="filter-level" className={selectCls} value={level} onChange={(e) => setLevel(e.target.value)}>
                  <option value="all">{t("publicCompetitions.allOptions")}</option>
                  <option value="D">D</option>
                  <option value="C">C</option>
                  <option value="B">B</option>
                  <option value="A">A</option>
                  <option value="S">S</option>
                  <option value="HOBBY">Hobby</option>
                  <option value="OPEN">Open</option>
                  <option value="CHAMPIONSHIP">Championship</option>
                </select>
              </div>
              <div>
                <label htmlFor="filter-dance-style" className={labelCls}>{t("publicCompetitions.discipline")}</label>
                <select id="filter-dance-style" className={selectCls} value={danceStyle} onChange={(e) => setDanceStyle(e.target.value)}>
                  <option value="all">{t("publicCompetitions.allOptions")}</option>
                  <option value="STANDARD">Standardní tance</option>
                  <option value="LATIN">Latinsko-americké tance</option>
                  <option value="TEN_DANCE">10 tanců</option>
                  <option value="COMBINATION">Kombinace</option>
                </select>
              </div>
              <div>
                <label htmlFor="filter-competition-type" className={labelCls}>{t("publicCompetitions.competitionType")}</label>
                <select id="filter-competition-type" className={selectCls} value={competitionType} onChange={(e) => setCompetitionType(e.target.value)}>
                  <option value="all">{t("publicCompetitions.allOptions")}</option>
                  <option value="COUPLE">Párové</option>
                  <option value="SOLO_STANDARD">Sólo standard</option>
                  <option value="SOLO_LATIN">Sólo latino</option>
                  <option value="FORMATION_STANDARD">Formace standard</option>
                  <option value="FORMATION_LATIN">Formace latino</option>
                  <option value="SHOW">Show</option>
                </select>
              </div>
              <div>
                <label htmlFor="filter-search" className={labelCls}>{t("publicCompetitions.eventName")}</label>
                <input
                  id="filter-search"
                  className={selectCls}
                  placeholder={t("publicCompetitions.allOptions")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleFilter()}
                />
              </div>
              <div>
                <label htmlFor="filter-date-from" className={labelCls}>{t("publicCompetitions.periodFrom")}</label>
                <input
                  id="filter-date-from"
                  type="date"
                  className={selectCls}
                  value={dateFrom || today}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="filter-date-to" className={labelCls}>{t("publicCompetitions.periodTo")}</label>
                <input
                  id="filter-date-to"
                  type="date"
                  className={selectCls}
                  value={dateTo || inThreeMonths}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 12 }}>
              <button
                onClick={handleFilter}
                style={{
                  padding: "9px 24px", borderRadius: 9, fontSize: ".875rem", fontWeight: 700,
                  background: "linear-gradient(135deg,#4F46E5,#7C3AED)", color: "#fff",
                  border: "none", cursor: "pointer", letterSpacing: ".02em",
                  boxShadow: "0 2px 8px rgba(79,70,229,.35)", transition: "opacity .2s",
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = ".88")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              >
                {t("publicCompetitions.filterButton")}
              </button>
              {filtered.length > 0 && (
                <span style={{ fontSize: ".8rem", color: "#9CA3AF" }}>
                  {filtered.length} {filtered.length === 1 ? t("publicCompetitions.competitions_one") : filtered.length < 5 ? t("publicCompetitions.competitions_few") : t("publicCompetitions.competitions_many")}
                </span>
              )}
            </div>
          </div>

          {/* Competition list */}
          {isLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ height: 24, width: 160, borderRadius: 6, background: "#E5E7EB", animation: "pulse 1.5s ease-in-out infinite" }} />
                  {[...Array(2)].map((_, j) => (
                    <div key={j} style={{ height: 88, borderRadius: 14, background: "#E5E7EB", animation: "pulse 1.5s ease-in-out infinite" }} />
                  ))}
                </div>
              ))}
            </div>
          ) : grouped.size === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "80px 0", textAlign: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg,#4F46E5,#7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.75rem" }}>🏆</div>
              <p style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontWeight: 700, fontSize: "1.1rem", color: "#111827" }}>{t("publicCompetitions.noCompetitions")}</p>
              <p style={{ fontSize: ".9rem", color: "#6B7280" }}>{t("publicCompetitions.noCompetitionsDesc")}</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
              {Array.from(grouped.entries()).map(([month, comps]) => (
                <div key={month}>
                  {/* Month heading */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <h2 style={{
                      fontFamily: "var(--font-sora, Sora, sans-serif)", fontWeight: 800,
                      fontSize: "1.25rem", letterSpacing: "-.02em",
                      background: "linear-gradient(105deg,#4F46E5 0%,#7C3AED 100%)",
                      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                    }}>
                      {month === noDateKey ? month : formatMonthHeading(month, locale)}
                    </h2>
                    <span style={{ fontSize: ".75rem", fontWeight: 600, padding: "2px 9px", borderRadius: 100, background: "#EEF2FF", color: "#4F46E5" }}>
                      {comps.length}
                    </span>
                    <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,#E5E7EB,transparent)" }} />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {comps.map((comp) => {
                      const d = comp.eventDate ? new Date(comp.eventDate) : null;
                      const dayShort = d ? d.toLocaleDateString(locale === "en" ? "en-GB" : "cs-CZ", { weekday: "short" }) : "";
                      const dayNum = d ? d.getDate() : null;
                      const timeStr = d
                        ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
                        : "";
                      const isLive = comp.status === "IN_PROGRESS";

                      return (
                        <Link
                          key={comp.id}
                          href={`/competitions/${comp.id}`}
                          className="comp-card"
                          style={{
                            display: "flex", alignItems: "center", gap: 16,
                            background: "#fff", border: "1px solid #E5E7EB",
                            borderRadius: 14, padding: "16px 20px",
                            textDecoration: "none",
                            boxShadow: "0 1px 3px rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.04)",
                          }}
                        >
                          {/* Date badge */}
                          {d ? (
                            <div style={{
                              width: 56, flexShrink: 0,
                              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                              borderRadius: 10,
                              background: isLive
                                ? "linear-gradient(135deg,#059669,#10B981)"
                                : "linear-gradient(135deg,#4F46E5,#7C3AED)",
                              padding: "8px 6px", textAlign: "center",
                            }}>
                              <span style={{ fontSize: "10px", fontWeight: 700, lineHeight: 1, color: "rgba(255,255,255,.8)", textTransform: "uppercase" }}>{dayShort}</span>
                              <span style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: "1.6rem", fontWeight: 800, lineHeight: 1.1, color: "#fff" }}>{dayNum}</span>
                            </div>
                          ) : (
                            <div style={{ width: 56, flexShrink: 0 }} />
                          )}

                          {/* Content */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                              {(comp.venue || comp.location) && (
                                <span style={{ fontSize: ".73rem", fontWeight: 500, color: "#9CA3AF", display: "flex", alignItems: "center", gap: 4 }}>
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                  {comp.venue ?? comp.location}
                                </span>
                              )}
                              {timeStr && timeStr !== "00:00" && (
                                <span style={{ fontSize: ".73rem", color: "#9CA3AF" }}>· {timeStr}</span>
                              )}
                              {isLive && (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".67rem", fontWeight: 700, color: "#059669", background: "#ECFDF5", padding: "2px 8px", borderRadius: 100, border: "1px solid rgba(5,150,105,.2)" }}>
                                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#059669", display: "inline-block" }} />
                                  {t("publicCompetitions.ongoing")}
                                </span>
                              )}
                            </div>

                            <p style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontWeight: 700, fontSize: ".97rem", color: "#111827", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {comp.name}
                            </p>

                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              {comp.registeredPairsCount !== undefined && (
                                <span style={{ fontSize: ".75rem", color: "#6B7280" }}>{comp.registeredPairsCount} {t("publicCompetitions.pairs")}</span>
                              )}
                              {comp.registeredPairsCount !== undefined && comp.sectionsCount !== undefined && (
                                <span style={{ fontSize: ".75rem", color: "#D1D5DB" }}>·</span>
                              )}
                              {comp.sectionsCount !== undefined && (
                                <span style={{ fontSize: ".75rem", color: "#6B7280" }}>
                                  {comp.sectionsCount} {comp.sectionsCount === 1 ? t("publicCompetitions.categories_one") : t("publicCompetitions.categories_many")}
                                </span>
                              )}
                              {comp.registrationOpen && (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".67rem", fontWeight: 700, color: "#fff", background: "#059669", padding: "2px 9px", borderRadius: 100 }}>
                                  {t("status.REGISTRATION_OPEN")}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Arrow */}
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C4B5FD" strokeWidth="2" style={{ flexShrink: 0 }}>
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer strip */}
        <div style={{ borderTop: "1px solid #E5E7EB", background: "#fff", padding: "24px", textAlign: "center" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: "linear-gradient(135deg,#4F46E5,#06B6D4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".6rem", fontWeight: 900, color: "#fff" }}>DA</div>
            <span style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontWeight: 800, fontSize: ".9rem", color: "#111827" }}>DanceApp</span>
          </Link>
          <p style={{ fontSize: ".73rem", color: "#9CA3AF", marginTop: 6 }}>© 2026 DanceApp. {t("publicCompetitions.footer")}</p>
        </div>

      </div>
    </>
  );
}
