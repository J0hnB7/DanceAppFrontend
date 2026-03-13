import type { PairFinalResultRow } from "@/lib/api/scoring";

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

function placementLabel(p: number): string {
  if (p === 1) return "1st Place";
  if (p === 2) return "2nd Place";
  if (p === 3) return "3rd Place";
  return `${p}th Place`;
}

function placementOrdinal(p: number): string {
  if (p === 1) return "1<sup>st</sup>";
  if (p === 2) return "2<sup>nd</sup>";
  if (p === 3) return "3<sup>rd</sup>";
  return `${p}<sup>th</sup>`;
}

export function generateDiplomaHtml(data: DiplomaData): string {
  const dancerLine = data.dancer2Name
    ? `${data.dancer1Name} &amp; ${data.dancer2Name}`
    : data.dancer1Name;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Diploma — ${data.dancer1Name}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;500&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    width: 297mm;
    height: 210mm;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
    font-family: 'Inter', sans-serif;
  }

  .diploma {
    width: 100%;
    height: 100%;
    padding: 20mm 24mm;
    border: 8px solid #c9a84c;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10mm;
  }

  .diploma::before {
    content: '';
    position: absolute;
    inset: 4mm;
    border: 1px solid #e8d5a3;
    pointer-events: none;
  }

  .logo-row {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #c9a84c;
    font-size: 11pt;
    letter-spacing: 4px;
    text-transform: uppercase;
    font-weight: 500;
  }

  h1 {
    font-family: 'Playfair Display', serif;
    font-size: 36pt;
    font-weight: 700;
    color: #1a1a1a;
    text-align: center;
    line-height: 1.15;
  }

  .subtitle {
    font-size: 10pt;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #888;
    font-weight: 300;
  }

  .divider {
    width: 80mm;
    height: 1px;
    background: linear-gradient(to right, transparent, #c9a84c, transparent);
  }

  .placement {
    font-family: 'Playfair Display', serif;
    font-size: 18pt;
    color: #c9a84c;
    font-weight: 700;
  }

  .section-name {
    font-size: 11pt;
    color: #555;
    text-align: center;
  }

  .meta {
    font-size: 9pt;
    color: #aaa;
    text-align: center;
  }

  .signature-row {
    display: flex;
    gap: 40mm;
    margin-top: 8mm;
  }

  .sig {
    text-align: center;
  }

  .sig-line {
    width: 45mm;
    height: 1px;
    background: #ccc;
    margin-bottom: 3mm;
  }

  .sig-label {
    font-size: 8pt;
    color: #aaa;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  @media print {
    body { margin: 0; }
  }
</style>
</head>
<body>
<div class="diploma">
  <div class="logo-row">
    &#9670; DanceApp &#9670;
  </div>

  <div>
    <p class="subtitle" style="text-align:center;margin-bottom:6mm">Certificate of Achievement</p>
    <h1>${dancerLine}</h1>
    ${data.club ? `<p class="meta" style="margin-top:2mm">${data.club}</p>` : ""}
  </div>

  <div class="divider"></div>

  <div style="text-align:center">
    <p class="subtitle">Achieved</p>
    <p class="placement">${placementOrdinal(data.placement)} Place</p>
    <p class="section-name" style="margin-top:3mm">${data.sectionName}</p>
  </div>

  <div class="divider"></div>

  <div class="meta">
    ${data.competitionName}<br/>
    ${data.competitionLocation} &bull; ${data.competitionDate}
  </div>

  <div class="signature-row">
    <div class="sig">
      <div class="sig-line"></div>
      <p class="sig-label">Chief Adjudicator</p>
    </div>
    <div class="sig">
      <div class="sig-line"></div>
      <p class="sig-label">Organizer</p>
    </div>
  </div>
</div>
</body>
</html>`;
}

export function printDiploma(data: DiplomaData) {
  const html = generateDiplomaHtml(data);
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

export function printAllDiplomas(
  rows: PairFinalResultRow[],
  competitionName: string,
  competitionDate: string,
  competitionLocation: string,
  sectionName: string
) {
  const diplomas = rows
    .filter((r) => r.finalPlacement <= 3)
    .sort((a, b) => a.finalPlacement - b.finalPlacement)
    .map((r) =>
      generateDiplomaHtml({
        competitionName,
        competitionDate,
        competitionLocation,
        sectionName,
        placement: r.finalPlacement,
        dancer1Name: `Start #${r.startNumber}`,
      })
    );

  const combined = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/>
<style>
  body { margin: 0; }
  .page { page-break-after: always; }
  .page:last-child { page-break-after: auto; }
</style>
</head>
<body>
${diplomas.map((d) => {
    const body = d.replace(/[\s\S]*<body>/, "").replace(/<\/body>[\s\S]*/, "");
    return `<div class="page">${body}</div>`;
  }).join("\n")}
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(combined);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
}
