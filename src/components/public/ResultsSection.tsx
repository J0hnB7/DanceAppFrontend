"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import type { SectionDto } from "@/lib/api/sections";
import { PairDetailModal } from "@/components/results/pair-detail-modal";

interface PairResultRow {
  pairId: string;
  startNumber: number;
  totalSum: number;
  finalPlacement: number;
  tieResolution: string | null;
  perDance: Record<string, number>;
  dancerName?: string;
  club?: string;
  reachedRound?: string;
}

const ROUND_ORDER: Record<string, number> = {
  FINAL: 0,
  SINGLE_ROUND: 0,
  SEMIFINAL: 1,
  QUARTER_FINAL: 2,
  PRELIMINARY: 3,
};
const ROUND_LABEL: Record<string, string> = {
  FINAL: "Finále",
  SINGLE_ROUND: "Finále",
  SEMIFINAL: "Semifinále",
  QUARTER_FINAL: "Čtvrtfinále",
  PRELIMINARY: "Základní kolo",
};
const isPlacementRound = (r: string) => r === "FINAL" || r === "SINGLE_ROUND";

type TiedRow = PairResultRow & { placeLabel: string; placeRank: number };

function assignTiedPlaces(rows: PairResultRow[], offset: number, isFinal: boolean): TiedRow[] {
  // Skating System Rule 7: in a final round, each couple gets their specific finalPlacement
  // from the backend (tie-resolved). Range notation is only valid in preliminary rounds.
  if (isFinal) {
    return rows.map(row => ({
      ...row,
      placeLabel: `${row.finalPlacement}.`,
      placeRank: row.finalPlacement,
    }));
  }
  // Non-final: group by totalSum → range notation is correct for prelims
  const out: TiedRow[] = [];
  let i = 0;
  while (i < rows.length) {
    let j = i + 1;
    if (rows[i].totalSum > 0) {
      while (j < rows.length && rows[j].totalSum === rows[i].totalSum) j++;
    }
    const startRank = offset + i + 1;
    const endRank = offset + j;
    const label = j - i === 1 ? `${startRank}.` : `${startRank}.-${endRank}.`;
    for (let k = i; k < j; k++) {
      out.push({ ...rows[k], placeLabel: label, placeRank: startRank });
    }
    i = j;
  }
  return out;
}

function segmentByRound(rows: PairResultRow[]): { round: string; rows: TiedRow[] }[] {
  const sorted = [...rows].sort((a, b) => {
    const ra = ROUND_ORDER[a.reachedRound ?? "PRELIMINARY"] ?? 99;
    const rb = ROUND_ORDER[b.reachedRound ?? "PRELIMINARY"] ?? 99;
    if (ra !== rb) return ra - rb;
    return a.finalPlacement - b.finalPlacement;
  });
  const raw: { round: string; rows: PairResultRow[] }[] = [];
  for (const row of sorted) {
    const key = row.reachedRound ?? "PRELIMINARY";
    const last = raw[raw.length - 1];
    if (!last || last.round !== key) raw.push({ round: key, rows: [row] });
    else last.rows.push(row);
  }
  const out: { round: string; rows: TiedRow[] }[] = [];
  let offset = 0;
  for (const s of raw) {
    out.push({ round: s.round, rows: assignTiedPlaces(s.rows, offset, isPlacementRound(s.round)) });
    offset += s.rows.length;
  }
  return out;
}

interface SectionSummary {
  sectionId: string;
  rankings: PairResultRow[];
}

const RANK_STYLES: Record<number, { bg: string; color: string; border: string; label: string }> = {
  1: { bg: "linear-gradient(135deg,#FEF9C3,#FDE68A)", color: "#78350F", border: "#FCD34D", label: "🥇" },
  2: { bg: "linear-gradient(135deg,#F3F4F6,#E5E7EB)", color: "#374151", border: "#D1D5DB", label: "🥈" },
  3: { bg: "linear-gradient(135deg,#FFF7ED,#FFEDD5)", color: "#7C2D12", border: "#FDBA74", label: "🥉" },
};

function matchesSearch(r: PairResultRow, q: string): boolean {
  if (!q) return true;
  if (String(r.startNumber).includes(q)) return true;
  if (r.dancerName?.toLowerCase().includes(q)) return true;
  if (r.club?.toLowerCase().includes(q)) return true;
  return false;
}

function SectionResultCard({ section, searchQuery }: { section: SectionDto; searchQuery: string }) {
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [detailPairId, setDetailPairId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<SectionSummary>({
    queryKey: ["section-summary", section.id],
    queryFn: () =>
      apiClient.get<SectionSummary>(`/sections/${section.id}/final-summary`).then((r) => r.data),
    enabled: manualOpen === true,
    staleTime: 60_000,
  });

  const rankings = data?.rankings ?? [];
  const sorted = [...rankings].sort((a, b) => a.finalPlacement - b.finalPlacement);
  const top3 = sorted.filter((r) => r.finalPlacement <= 3);

  // Auto-open when search matches something in this section
  const hasMatch = searchQuery ? sorted.some((r) => matchesSearch(r, searchQuery)) : false;
  const open = manualOpen !== null ? manualOpen : (hasMatch || false);
  const danceNames = sorted[0] ? Object.keys(sorted[0].perDance) : [];

  const sectionLabel = [section.ageCategory, section.level, section.danceStyle]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E5E7EB",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,.05)",
        transition: "box-shadow .2s",
      }}
    >
      {/* Accordion header */}
      <button
        onClick={() => setManualOpen((v) => !(v !== null ? v : open))}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          gap: 12,
          minHeight: 44,
        }}
        aria-expanded={open}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-sora, Sora, sans-serif)",
              fontWeight: 700,
              fontSize: "1rem",
              color: "#111827",
              marginBottom: 2,
            }}
          >
            {section.name}
          </div>
          {sectionLabel && (
            <div style={{ fontSize: ".78rem", color: "#6B7280" }}>{sectionLabel}</div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {!open && rankings.length === 0 && (
            <span
              style={{
                fontSize: ".72rem",
                fontWeight: 600,
                color: "#fff",
                background: "#4F46E5",
                borderRadius: 6,
                padding: "2px 8px",
              }}
            >
              Zobrazit výsledky
            </span>
          )}
          {!open && top3.length > 0 && (
            <div style={{ display: "flex", gap: 6 }}>
              {top3.map((r) => {
                const rs = RANK_STYLES[r.finalPlacement];
                return (
                  <div
                    key={r.pairId}
                    style={{
                      background: rs.bg,
                      border: `1px solid ${rs.border}`,
                      borderRadius: 8,
                      padding: "3px 8px",
                      fontSize: ".72rem",
                      fontWeight: 700,
                      color: rs.color,
                    }}
                  >
                    #{r.startNumber}
                  </div>
                );
              })}
            </div>
          )}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9CA3AF"
            strokeWidth="2.5"
            style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }}
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div style={{ borderTop: "1px solid #F3F4F6" }}>
          {isLoading ? (
            <div style={{ padding: "32px 20px", textAlign: "center" }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  border: "3px solid #E5E7EB",
                  borderTopColor: "#4F46E5",
                  margin: "0 auto",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : rankings.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "#9CA3AF", fontSize: ".875rem" }}>
              Výsledky nejsou k dispozici.
            </div>
          ) : (
            <div style={{ padding: "16px 20px" }}>
              {/* Top 3 podium */}
              {top3.length >= 2 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "center",
                    gap: 10,
                    marginBottom: 20,
                  }}
                >
                  {/* Reorder: 2nd left, 1st center, 3rd right */}
                  {[top3[1], top3[0], top3[2]].filter(Boolean).map((r, i) => {
                    const placement = r.finalPlacement;
                    const rs = RANK_STYLES[placement];
                    const heights = [52, 72, 40];
                    const podiumHeights = [40, 56, 28];
                    return (
                      <div key={r.pairId} style={{ textAlign: "center", flex: 1, maxWidth: 120 }}>
                        <div
                          style={{
                            background: rs.bg,
                            border: `1px solid ${rs.border}`,
                            borderRadius: 10,
                            padding: "10px 8px",
                            height: heights[i],
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 2,
                          }}
                        >
                          <div style={{ fontSize: ".72rem", fontWeight: 800, color: rs.color }}>
                            #{r.startNumber}
                          </div>
                          <div style={{ fontSize: ".6rem", color: rs.color, opacity: 0.8 }}>
                            {r.totalSum.toFixed(1)} b.
                          </div>
                        </div>
                        <div
                          style={{
                            background: placement === 1 ? "#EAB308" : placement === 2 ? "#9CA3AF" : "#CD7F32",
                            height: podiumHeights[i],
                            borderRadius: "0 0 6px 6px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontFamily: "var(--font-sora, Sora, sans-serif)",
                            fontWeight: 900,
                            fontSize: placement === 1 ? "1.1rem" : ".9rem",
                            color: "#fff",
                          }}
                        >
                          {placement}.
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Full rankings table */}
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: ".85rem",
                    minWidth: danceNames.length > 0 ? 360 : 260,
                  }}
                  aria-label={`Výsledky — ${section.name}`}
                >
                  <thead>
                    <tr style={{ background: "#F9FAFB" }}>
                      <th
                        style={{
                          padding: "8px 10px",
                          textAlign: "left",
                          fontWeight: 700,
                          color: "#6B7280",
                          fontSize: ".72rem",
                          letterSpacing: ".04em",
                          textTransform: "uppercase",
                          borderBottom: "1px solid #E5E7EB",
                          width: 40,
                        }}
                      >
                        Místo
                      </th>
                      <th
                        style={{
                          padding: "8px 10px",
                          textAlign: "left",
                          fontWeight: 700,
                          color: "#6B7280",
                          fontSize: ".72rem",
                          letterSpacing: ".04em",
                          textTransform: "uppercase",
                          borderBottom: "1px solid #E5E7EB",
                        }}
                      >
                        Pár
                      </th>
                      <th
                        style={{
                          padding: "8px 10px",
                          textAlign: "right",
                          fontWeight: 700,
                          color: "#6B7280",
                          fontSize: ".72rem",
                          letterSpacing: ".04em",
                          textTransform: "uppercase",
                          borderBottom: "1px solid #E5E7EB",
                          width: 60,
                        }}
                      >
                        Body
                      </th>
                      {danceNames.length > 0 && (
                        <th
                          style={{
                            padding: "8px 10px",
                            textAlign: "center",
                            fontWeight: 700,
                            color: "#6B7280",
                            fontSize: ".72rem",
                            letterSpacing: ".04em",
                            textTransform: "uppercase",
                            borderBottom: "1px solid #E5E7EB",
                            width: 36,
                          }}
                        >
                          Tance
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {segmentByRound(sorted).flatMap((segment) => [
                      <tr key={`seg-${segment.round}`} style={{ background: "#F9FAFB" }}>
                        <td colSpan={danceNames.length > 0 ? 4 : 3} style={{ padding: "10px 12px", borderTop: "1px solid #E5E7EB", borderBottom: "1px solid #E5E7EB" }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontWeight: 700, fontSize: ".85rem", color: "#111827" }}>
                              {ROUND_LABEL[segment.round] ?? segment.round}
                            </span>
                            <span style={{ fontSize: ".7rem", color: "#6B7280" }}>
                              {isPlacementRound(segment.round)
                                ? "součet umístění (nižší = lepší)"
                                : "počet křížků (vyšší = lepší)"}
                            </span>
                          </div>
                        </td>
                      </tr>,
                      ...segment.rows.map((r) => {
                      const segIsPlacement = isPlacementRound(segment.round);
                      const rs = segIsPlacement ? RANK_STYLES[r.placeRank] : undefined;
                      const isExpanded = expandedRow === r.pairId;
                      const isTop = segIsPlacement && r.placeRank <= 3;
                      const isMatch = searchQuery ? matchesSearch(r, searchQuery) : false;
                      return (
                        <React.Fragment key={r.pairId}>
                          <tr
                            onClick={() => setDetailPairId(r.pairId)}
                            style={{
                              background: isMatch
                                ? "rgba(79,70,229,.06)"
                                : isTop ? (rs?.bg ?? "transparent") : "transparent",
                              borderBottom: isExpanded ? "none" : "1px solid #F3F4F6",
                              outline: isMatch ? "2px solid rgba(79,70,229,.2)" : "none",
                              cursor: "pointer",
                            }}
                          >
                            <td style={{ padding: "10px 10px", verticalAlign: "middle" }}>
                              <div
                                style={{
                                  minWidth: 40,
                                  height: 28,
                                  borderRadius: 14,
                                  padding: "0 10px",
                                  background: segIsPlacement && r.placeRank === 1
                                    ? "#EAB308"
                                    : segIsPlacement && r.placeRank === 2
                                    ? "#9CA3AF"
                                    : segIsPlacement && r.placeRank === 3
                                    ? "#CD7F32"
                                    : "#F3F4F6",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: ".75rem",
                                  fontWeight: 800,
                                  color: isTop ? "#fff" : "#6B7280",
                                  flexShrink: 0,
                                }}
                              >
                                {r.placeLabel}
                              </div>
                            </td>
                            <td style={{ padding: "10px 10px", color: "#111827", fontWeight: isTop ? 700 : 500, verticalAlign: "middle" }}>
                              <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                                <span style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontWeight: 700, fontSize: ".8rem", color: "#9CA3AF", flexShrink: 0 }}>
                                  #{r.startNumber}
                                </span>
                                {r.dancerName && (
                                  <span style={{ fontFamily: "var(--font-sora, Sora, sans-serif)" }}>
                                    {r.dancerName}
                                  </span>
                                )}
                                {r.club && (
                                  <span style={{ fontSize: ".72rem", color: "#9CA3AF" }}>{r.club}</span>
                                )}
                                {r.tieResolution && r.tieResolution !== "NONE" && (
                                  <span
                                    style={{
                                      fontSize: ".65rem",
                                      color: "#6B7280",
                                      background: "#F3F4F6",
                                      borderRadius: 4,
                                      padding: "1px 5px",
                                    }}
                                    title="Výsledek rozhodnut dance-off"
                                  >
                                    D/O
                                  </span>
                                )}
                              </div>
                            </td>
                            <td
                              style={{
                                padding: "10px 10px",
                                textAlign: "right",
                                color: isTop ? (rs?.color ?? "#374151") : "#374151",
                                fontWeight: 700,
                                fontVariantNumeric: "tabular-nums",
                                verticalAlign: "middle",
                              }}
                            >
                              {r.totalSum.toFixed(1)}
                            </td>
                            {danceNames.length > 0 && (
                              <td style={{ padding: "10px 10px", textAlign: "center", verticalAlign: "middle" }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedRow(isExpanded ? null : r.pairId);
                                  }}
                                  style={{
                                    background: "none",
                                    border: "1px solid #E5E7EB",
                                    borderRadius: 6,
                                    padding: "3px 7px",
                                    cursor: "pointer",
                                    fontSize: ".7rem",
                                    color: "#6B7280",
                                    minHeight: 28,
                                    minWidth: 28,
                                    transition: "border-color .15s, color .15s",
                                  }}
                                  aria-label={isExpanded ? "Skrýt per-dance" : "Zobrazit per-dance"}
                                  aria-expanded={isExpanded}
                                >
                                  <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform .15s" }}
                                    aria-hidden="true"
                                  >
                                    <polyline points="6 9 12 15 18 9" />
                                  </svg>
                                </button>
                              </td>
                            )}
                          </tr>
                          {isExpanded && danceNames.length > 0 && (
                            <tr style={{ borderBottom: "1px solid #F3F4F6" }}>
                              <td colSpan={4} style={{ padding: "0 10px 10px 48px" }}>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                  {danceNames.map((dance) => (
                                    <div
                                      key={dance}
                                      style={{
                                        background: "#F9FAFB",
                                        border: "1px solid #E5E7EB",
                                        borderRadius: 8,
                                        padding: "4px 10px",
                                        fontSize: ".75rem",
                                      }}
                                    >
                                      <span style={{ color: "#6B7280" }}>{dance}</span>
                                      <span style={{ fontWeight: 700, color: "#111827", marginLeft: 6 }}>
                                        {(r.perDance[dance] ?? 0).toFixed(1)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    }),
                    ])}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
      <PairDetailModal
        open={detailPairId !== null}
        sectionId={section.id}
        pairId={detailPairId}
        onClose={() => setDetailPairId(null)}
      />
    </div>
  );
}

interface Props {
  sections: SectionDto[];
}

export function ResultsSection({ sections }: Props) {
  const [search, setSearch] = useState("");
  if (sections.length === 0) return null;

  const q = search.trim().toLowerCase();

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E5E7EB",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.04)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "16px 20px",
          borderBottom: "1px solid #F3F4F6",
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: "linear-gradient(135deg,#EAB308,#F59E0B)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>
        <div>
          <div
            style={{
              fontFamily: "var(--font-sora, Sora, sans-serif)",
              fontWeight: 700,
              fontSize: ".9rem",
              color: "#111827",
            }}
          >
            Výsledky soutěže
          </div>
          <div style={{ fontSize: ".75rem", color: "#6B7280", marginTop: 1 }}>
            {sections.length} {sections.length === 1 ? "kategorie" : sections.length < 5 ? "kategorie" : "kategorií"}
          </div>
        </div>
        <div
          style={{
            marginLeft: "auto",
            fontSize: ".72rem",
            fontWeight: 600,
            color: "#059669",
            background: "rgba(5,150,105,.08)",
            border: "1px solid rgba(5,150,105,.2)",
            borderRadius: 6,
            padding: "3px 9px",
          }}
        >
          Finalizováno
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: "12px 12px 0" }}>
        <div style={{ position: "relative" }}>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="#9CA3AF" strokeWidth="2.5"
            style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hledat podle jména nebo čísla…"
            style={{
              width: "100%",
              padding: "8px 12px 8px 32px",
              border: "1px solid #E5E7EB",
              borderRadius: 8,
              fontSize: ".875rem",
              color: "#111827",
              background: "#F9FAFB",
              outline: "none",
              boxSizing: "border-box",
            }}
            aria-label="Hledat soutěžící"
          />
        </div>
      </div>

      {/* Section list */}
      <div style={{ padding: "12px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        {sections.map((s) => (
          <SectionResultCard key={s.id} section={s} searchQuery={q} />
        ))}
      </div>
    </div>
  );
}
