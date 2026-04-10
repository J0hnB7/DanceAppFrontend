"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { roundsApi, type PairDetail } from "@/lib/api/rounds";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  sectionId: string;
  pairId: string | null;
  onClose: () => void;
  /**
   * When true, uses CSS variables (dashboard theme).
   * When false (default), uses hardcoded light colors (public page theme).
   */
  useThemeVars?: boolean;
}

export function PairDetailModal({ open, sectionId, pairId, onClose, useThemeVars = false }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const { data, isLoading, isError } = useQuery<PairDetail>({
    queryKey: ["pair-detail", sectionId, pairId],
    queryFn: () => roundsApi.getPairDetail(sectionId, pairId!),
    enabled: open && !!pairId,
  });

  if (!open) return null;

  const bg = useThemeVars ? "var(--surface, #fff)" : "#fff";
  const border = useThemeVars ? "var(--border, #E5E7EB)" : "#E5E7EB";
  const textPrimary = useThemeVars ? "var(--text-primary, #111827)" : "#111827";
  const textSecondary = useThemeVars ? "var(--text-secondary, #6B7280)" : "#6B7280";
  const surfaceAlt = useThemeVars ? "var(--surface-secondary, #F9FAFB)" : "#F9FAFB";
  const accent = useThemeVars ? "var(--accent, #4F46E5)" : "#4F46E5";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Detail páru"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: bg,
          borderRadius: 16,
          border: `1px solid ${border}`,
          maxWidth: 1000,
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,.35)",
        }}
      >
        {/* Header */}
        <div
          style={{
            position: "sticky",
            top: 0,
            background: bg,
            borderBottom: `1px solid ${border}`,
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            zIndex: 1,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            {data ? (
              <>
                <div
                  style={{
                    fontFamily: "var(--font-sora, Sora, sans-serif)",
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    color: textPrimary,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      background: accent,
                      color: "#fff",
                      borderRadius: 10,
                      padding: "4px 10px",
                      fontSize: "0.95rem",
                      fontWeight: 700,
                    }}
                  >
                    č. {data.startNumber}
                  </span>
                  <span>{data.dancerName}</span>
                </div>
                {data.club && (
                  <div style={{ fontSize: "0.875rem", color: textSecondary, marginTop: 2 }}>
                    {data.club}
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: textSecondary }}>Načítám…</div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Zavřít"
            style={{
              width: 44,
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              color: textSecondary,
            }}
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20 }}>
          {isLoading && (
            <div style={{ textAlign: "center", padding: 40, color: textSecondary }}>
              Načítám detail páru…
            </div>
          )}
          {isError && (
            <div style={{ textAlign: "center", padding: 40, color: "#B91C1C" }}>
              Nepodařilo se načíst detail.
            </div>
          )}
          {data && data.rounds.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: textSecondary }}>
              Pro tento pár nejsou dostupné detaily kol.
            </div>
          )}
          {data &&
            data.rounds.map((block) => (
              <section
                key={block.roundId}
                style={{
                  marginBottom: 24,
                  border: `1px solid ${border}`,
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <header
                  style={{
                    background: surfaceAlt,
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <div style={{ fontWeight: 700, color: textPrimary }}>{block.roundLabel}</div>
                  <div style={{ fontSize: "0.85rem", color: textSecondary }}>
                    {block.placementRound
                      ? `Umístění: ${block.place}${block.totalSum != null ? " · Součet: " + block.totalSum : ""}`
                      : `Místo: ${block.place}${block.totalSum != null ? " · Křížků: " + block.totalSum : ""}`}
                  </div>
                </header>
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "0.875rem",
                    }}
                  >
                    <thead>
                      <tr style={{ background: surfaceAlt, borderTop: `1px solid ${border}` }}>
                        <th
                          scope="col"
                          style={{
                            textAlign: "left",
                            padding: "8px 12px",
                            color: textSecondary,
                            fontWeight: 600,
                            borderBottom: `1px solid ${border}`,
                            minWidth: 100,
                          }}
                        >
                          Tanec
                        </th>
                        {block.judges.map((j) => (
                          <th
                            key={j.tokenId}
                            scope="col"
                            title={j.label}
                            style={{
                              textAlign: "center",
                              padding: "8px 10px",
                              color: textSecondary,
                              fontWeight: 600,
                              borderBottom: `1px solid ${border}`,
                              minWidth: 38,
                            }}
                          >
                            {j.label}
                          </th>
                        ))}
                        {block.placementRound && (
                          <th
                            scope="col"
                            style={{
                              textAlign: "center",
                              padding: "8px 12px",
                              color: textSecondary,
                              fontWeight: 600,
                              borderBottom: `1px solid ${border}`,
                            }}
                          >
                            Umístění
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {block.dances.map((dance) => {
                        const d = block.marksByDance[dance];
                        const marks = d?.marks ?? "";
                        return (
                          <tr key={dance} style={{ borderBottom: `1px solid ${border}` }}>
                            <th
                              scope="row"
                              style={{
                                textAlign: "left",
                                padding: "10px 12px",
                                fontWeight: 600,
                                color: textPrimary,
                              }}
                            >
                              {dance}
                            </th>
                            {block.judges.map((j, idx) => {
                              const ch = marks[idx] ?? "-";
                              const isX = ch === "x";
                              const isDash = ch === "-";
                              return (
                                <td
                                  key={j.tokenId}
                                  style={{
                                    textAlign: "center",
                                    padding: "10px 10px",
                                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                                    fontWeight: 700,
                                    color: isX ? "#059669" : isDash ? "#9CA3AF" : textPrimary,
                                  }}
                                >
                                  {ch}
                                </td>
                              );
                            })}
                            {block.placementRound && (
                              <td
                                style={{
                                  textAlign: "center",
                                  padding: "10px 12px",
                                  fontWeight: 700,
                                  color: accent,
                                }}
                              >
                                {d?.calculatedPlacement ?? "—"}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Judge roster */}
                <div
                  style={{
                    padding: "10px 16px",
                    borderTop: `1px solid ${border}`,
                    fontSize: "0.75rem",
                    color: textSecondary,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <strong style={{ color: textPrimary }}>Porota:</strong>
                  {block.judges.map((j) => (
                    <span key={j.tokenId}>{j.label}</span>
                  ))}
                </div>
              </section>
            ))}
        </div>
      </div>
    </div>
  );
}
