import type { PairFinalResultRow } from "@/lib/api/scoring";

// ── Template config types ────────────────────────────────────────────────────

export interface DiplomaTextField {
  id: string;
  variable: DiplomaVariable;
  label: string;
  /** Position as percentage of page (0–100) */
  x: number;
  y: number;
  fontSize: number;
  fontWeight: "normal" | "bold";
  color: string;
  textAlign: "left" | "center" | "right";
  fontFamily: "serif" | "sans-serif";
}

export type DiplomaVariable =
  | "competitionName"
  | "competitionDate"
  | "competitionLocation"
  | "sectionName"
  | "placement"
  | "placementOrdinal"
  | "dancer1Name"
  | "dancer2Name"
  | "dancerNames"
  | "club";

export interface DiplomaTemplate {
  backgroundImage: string;
  fields: DiplomaTextField[];
}

export const VARIABLE_LABELS: Record<DiplomaVariable, string> = {
  competitionName: "Název soutěže",
  competitionDate: "Datum",
  competitionLocation: "Místo",
  sectionName: "Kategorie",
  placement: "Umístění (1, 2, 3)",
  placementOrdinal: "Umístění (1. místo)",
  dancer1Name: "Tanečník 1",
  dancer2Name: "Tanečník 2",
  dancerNames: "Oba tanečníci",
  club: "Klub",
};

export const DEFAULT_FIELDS: DiplomaTextField[] = [
  { id: "f1", variable: "competitionName", label: "Název soutěže", x: 50, y: 12, fontSize: 22, fontWeight: "bold", color: "#1a1a1a", textAlign: "center", fontFamily: "serif" },
  { id: "f2", variable: "sectionName", label: "Kategorie", x: 50, y: 20, fontSize: 14, fontWeight: "normal", color: "#555555", textAlign: "center", fontFamily: "sans-serif" },
  { id: "f3", variable: "placementOrdinal", label: "Umístění", x: 50, y: 38, fontSize: 32, fontWeight: "bold", color: "#c9a84c", textAlign: "center", fontFamily: "serif" },
  { id: "f4", variable: "dancerNames", label: "Tanečníci", x: 50, y: 52, fontSize: 26, fontWeight: "bold", color: "#1a1a1a", textAlign: "center", fontFamily: "serif" },
  { id: "f5", variable: "club", label: "Klub", x: 50, y: 60, fontSize: 12, fontWeight: "normal", color: "#888888", textAlign: "center", fontFamily: "sans-serif" },
  { id: "f6", variable: "competitionLocation", label: "Místo", x: 50, y: 88, fontSize: 11, fontWeight: "normal", color: "#999999", textAlign: "center", fontFamily: "sans-serif" },
  { id: "f7", variable: "competitionDate", label: "Datum", x: 50, y: 92, fontSize: 11, fontWeight: "normal", color: "#999999", textAlign: "center", fontFamily: "sans-serif" },
];

// ── Storage ─────────────────────────────────────────────────────────────────

export function loadTemplate(competitionId: string): DiplomaTemplate | null {
  try {
    const raw = localStorage.getItem(`diploma_template_${competitionId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveTemplate(competitionId: string, template: DiplomaTemplate): void {
  localStorage.setItem(`diploma_template_${competitionId}`, JSON.stringify(template));
}

// ── Data types ──────────────────────────────────────────────────────────────

export interface DiplomaData {
  competitionName: string;
  competitionDate: string;
  competitionLocation: string;
  sectionName: string;
  placement: number;
  dancer1Name: string;
  dancer2Name?: string;
  club?: string;
}

function placementOrdinalCz(p: number): string {
  return `${p}. místo`;
}

export function resolveVariable(variable: DiplomaVariable, data: DiplomaData): string {
  switch (variable) {
    case "competitionName": return data.competitionName;
    case "competitionDate": return data.competitionDate;
    case "competitionLocation": return data.competitionLocation;
    case "sectionName": return data.sectionName;
    case "placement": return String(data.placement);
    case "placementOrdinal": return placementOrdinalCz(data.placement);
    case "dancer1Name": return data.dancer1Name;
    case "dancer2Name": return data.dancer2Name ?? "";
    case "dancerNames":
      return data.dancer2Name
        ? `${data.dancer1Name} & ${data.dancer2Name}`
        : data.dancer1Name;
    case "club": return data.club ?? "";
  }
}

// ── HTML builders (safe — no user HTML, only text content) ──────────────────

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildFieldDiv(f: DiplomaTextField, text: string): string {
  if (!text) return "";
  const posStyle = f.textAlign === "center"
    ? `left: ${f.x}%; transform: translateX(-50%);`
    : f.textAlign === "right"
    ? `right: ${100 - f.x}%;`
    : `left: ${f.x}%;`;
  const fontFam = f.fontFamily === "serif"
    ? "'Playfair Display', 'Georgia', serif"
    : "'Inter', 'Arial', sans-serif";
  return `<div style="position:absolute;top:${f.y}%;${posStyle}font-size:${f.fontSize}pt;font-weight:${f.fontWeight};color:${escapeHtml(f.color)};text-align:${f.textAlign};font-family:${fontFam};white-space:nowrap;">${escapeHtml(text)}</div>`;
}

function buildDiplomaPage(template: DiplomaTemplate, data: DiplomaData): string {
  const fields = template.fields.map((f) => buildFieldDiv(f, resolveVariable(f.variable, data))).join("\n");
  return `<div class="diploma" style="width:210mm;height:297mm;position:relative;overflow:hidden;background:#fff;">
  <img style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;" src="${escapeHtml(template.backgroundImage)}" />
  ${fields}
</div>`;
}

function buildFallbackPage(data: DiplomaData): string {
  const dancerLine = data.dancer2Name
    ? `${escapeHtml(data.dancer1Name)} &amp; ${escapeHtml(data.dancer2Name)}`
    : escapeHtml(data.dancer1Name);
  return `<div style="width:210mm;height:297mm;padding:25mm 20mm;border:6px solid #c9a84c;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8mm;box-sizing:border-box;background:#fff;font-family:'Inter',sans-serif;">
  <div style="position:absolute;inset:4mm;border:1px solid #e8d5a3;pointer-events:none;"></div>
  <p style="font-size:10pt;letter-spacing:3px;text-transform:uppercase;color:#888;">Diplom</p>
  <h1 style="font-family:'Playfair Display',serif;font-size:28pt;font-weight:700;color:#1a1a1a;text-align:center;">${dancerLine}</h1>
  ${data.club ? `<p style="font-size:9pt;color:#aaa;">${escapeHtml(data.club)}</p>` : ""}
  <div style="width:60mm;height:1px;background:linear-gradient(to right,transparent,#c9a84c,transparent);"></div>
  <p style="font-family:'Playfair Display',serif;font-size:22pt;color:#c9a84c;font-weight:700;">${escapeHtml(placementOrdinalCz(data.placement))}</p>
  <p style="font-size:12pt;color:#555;">${escapeHtml(data.sectionName)}</p>
  <div style="width:60mm;height:1px;background:linear-gradient(to right,transparent,#c9a84c,transparent);"></div>
  <div style="font-size:9pt;color:#aaa;text-align:center;">${escapeHtml(data.competitionName)}<br/>${escapeHtml(data.competitionLocation)} &bull; ${escapeHtml(data.competitionDate)}</div>
</div>`;
}

function wrapInDocument(bodyContent: string, multiPage: boolean): string {
  const pageBreakCss = multiPage
    ? ".page{page-break-after:always;}.page:last-child{page-break-after:auto;}"
    : "";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;500;700&display=swap"/><style>*{margin:0;padding:0;box-sizing:border-box;}@page{size:210mm 297mm;margin:0;}body{margin:0;}${pageBreakCss}</style></head><body>${bodyContent}</body></html>`;
}

function openAndPrint(html: string) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.open();
  win.document.writeln(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
}

// ── Public API ───────────────────────────────────────────────────────────────

export function printDiploma(data: DiplomaData, template?: DiplomaTemplate | null) {
  const page = template
    ? buildDiplomaPage(template, data)
    : buildFallbackPage(data);
  openAndPrint(wrapInDocument(page, false));
}

export function printAllDiplomas(
  rows: PairFinalResultRow[],
  competitionName: string,
  competitionDate: string,
  competitionLocation: string,
  sectionName: string,
  pairLookup?: Map<number, { dancer1Name: string; dancer2Name?: string; club?: string }>,
  template?: DiplomaTemplate | null,
) {
  const top3 = rows
    .filter((r) => r.finalPlacement <= 3)
    .sort((a, b) => a.finalPlacement - b.finalPlacement);

  const pages = top3.map((r) => {
    const pair = pairLookup?.get(r.startNumber);
    const data: DiplomaData = {
      competitionName, competitionDate, competitionLocation, sectionName,
      placement: r.finalPlacement,
      dancer1Name: pair?.dancer1Name ?? `Pár #${r.startNumber}`,
      dancer2Name: pair?.dancer2Name,
      club: pair?.club,
    };
    const content = template ? buildDiplomaPage(template, data) : buildFallbackPage(data);
    return `<div class="page">${content}</div>`;
  });

  openAndPrint(wrapInDocument(pages.join("\n"), true));
}
