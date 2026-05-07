/**
 * MarketResearch — PDF renderer.
 *
 * Génère un PDF lisible à partir d'une `MarketStudyExtraction` validée.
 * Pattern calqué sur `strategy-presentation/export-oracle.ts` (jsPDF,
 * pas de Puppeteer — pas besoin de Chromium côté serveur). 10 sections
 * mappées 1:1 sur le template `structured-market-study/v1`. Les tables
 * sont rendues en colonnes texte (pas de plugin autotable — moins de
 * dépendances, contrôle précis du wrap).
 */

import { jsPDF } from "jspdf";
import type { MarketStudyExtraction } from "@/server/services/seshat/market-study-ingestion/types";

export interface RenderMarketStudyPdfInput {
  extraction: MarketStudyExtraction;
  countryCode: string;
  sector: string;
  generatedAt: string;
  sourcesUrls?: string[];
  memoryOnlyWarning?: boolean;
}

export function renderMarketStudyPdf(input: RenderMarketStudyPdfInput): Buffer {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  const lineHeight = 13;

  let cursor = margin;

  function ensureRoom(spaceNeeded: number): void {
    if (cursor + spaceNeeded > pageHeight - margin) {
      doc.addPage();
      cursor = margin;
    }
  }

  function writeHeading(text: string, size = 14): void {
    ensureRoom(size + lineHeight);
    doc.setFontSize(size);
    doc.setFont("helvetica", "bold");
    doc.text(text, margin, cursor);
    cursor += size + 4;
    doc.setFont("helvetica", "normal");
  }

  function writeBody(text: string, size = 10): void {
    doc.setFontSize(size);
    const wrapped = doc.splitTextToSize(text, contentWidth);
    for (const line of wrapped) {
      ensureRoom(lineHeight);
      doc.text(line, margin, cursor);
      cursor += lineHeight;
    }
  }

  function writeSpacer(amount = 10): void {
    cursor += amount;
  }

  function writeKv(label: string, value: string | undefined | null): void {
    if (value === undefined || value === null || value === "") return;
    doc.setFontSize(10);
    const labelWidth = 110;
    const labelLines = doc.splitTextToSize(`${label}:`, labelWidth);
    const valueLines = doc.splitTextToSize(value, contentWidth - labelWidth - 8);
    const maxLines = Math.max(labelLines.length, valueLines.length);
    ensureRoom(maxLines * lineHeight);
    for (let i = 0; i < maxLines; i++) {
      if (labelLines[i]) {
        doc.setFont("helvetica", "bold");
        doc.text(labelLines[i], margin, cursor);
      }
      if (valueLines[i]) {
        doc.setFont("helvetica", "normal");
        doc.text(valueLines[i], margin + labelWidth + 8, cursor);
      }
      cursor += lineHeight;
    }
  }

  function writeRow(cells: string[], widths: number[]): void {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const wrapped = cells.map((c, i) => doc.splitTextToSize(c || "—", widths[i] ?? contentWidth / cells.length));
    const maxLines = Math.max(...wrapped.map((w) => w.length));
    ensureRoom(maxLines * lineHeight + 2);
    let x = margin;
    for (let i = 0; i < wrapped.length; i++) {
      const lines = wrapped[i] ?? [""];
      for (let l = 0; l < lines.length; l++) {
        const line = lines[l] ?? "";
        doc.text(line, x, cursor + l * lineHeight);
      }
      x += widths[i] ?? contentWidth / cells.length;
    }
    cursor += maxLines * lineHeight + 2;
  }

  function writeTableHeader(headers: string[], widths: number[]): void {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    ensureRoom(lineHeight + 4);
    let x = margin;
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i] ?? "", x, cursor);
      x += widths[i] ?? contentWidth / headers.length;
    }
    cursor += lineHeight;
    doc.setLineWidth(0.5);
    doc.line(margin, cursor - 3, pageWidth - margin, cursor - 3);
    cursor += 2;
    doc.setFont("helvetica", "normal");
  }

  // ── Cover ─────────────────────────────────────────────────────────
  writeHeading("Market research report", 22);
  writeSpacer(6);
  writeBody(`${input.extraction.study.title}`, 14);
  writeSpacer(8);
  writeKv("Country", input.countryCode);
  writeKv("Sector", input.sector);
  writeKv("Publisher", input.extraction.study.publisher);
  writeKv("Methodology", input.extraction.study.methodology);
  writeKv("Sample size", input.extraction.study.sampleSize?.toString());
  writeKv("Geography", input.extraction.study.geography);
  writeKv("Generated", input.generatedAt);

  if (input.memoryOnlyWarning) {
    writeSpacer(8);
    doc.setTextColor(180, 60, 60);
    writeBody(
      "⚠ Mode mémoire-modèle : aucune source URL n'a été fournie. " +
        "Les chiffres ci-dessous proviennent de la mémoire d'entraînement " +
        "du LLM (cutoff connaissance) et NE sont PAS sourcés en temps réel. " +
        "Pour une fiche de marque opérationnelle, l'opérateur doit fournir " +
        "des sources et regénérer.",
      9,
    );
    doc.setTextColor(0, 0, 0);
  }

  if (input.sourcesUrls && input.sourcesUrls.length > 0) {
    writeSpacer(8);
    writeHeading("Sources fetched", 11);
    for (const url of input.sourcesUrls) writeBody(`• ${url}`, 9);
  }

  // ── §1 TAM / SAM / SOM ────────────────────────────────────────────
  writeSpacer(14);
  writeHeading("§1 TAM / SAM / SOM");
  const tamRows: Array<{ metric: string; v: typeof input.extraction.tam }> = [
    { metric: "TAM", v: input.extraction.tam ?? null },
    { metric: "SAM", v: input.extraction.sam ?? null },
    { metric: "SOM", v: input.extraction.som ?? null },
  ];
  const tamHeaders = ["Metric", "Value", "Currency", "Year", "Source"];
  const tamWidths = [60, 90, 80, 60, contentWidth - 290];
  writeTableHeader(tamHeaders, tamWidths);
  for (const r of tamRows) {
    if (!r.v) {
      writeRow([r.metric, "—", "—", "—", "—"], tamWidths);
    } else {
      writeRow(
        [r.metric, fmtNum(r.v.value), r.v.currency ?? "—", r.v.year.toString(), r.v.source ?? "—"],
        tamWidths,
      );
    }
  }

  // ── §2 Croissance ────────────────────────────────────────────────
  writeSpacer(10);
  writeHeading("§2 Croissance & saisonnalité");
  if (input.extraction.growthRates.length === 0) {
    writeBody("Aucune donnée de croissance.", 9);
  } else {
    const w = [contentWidth * 0.4, 80, 90, contentWidth * 0.4 - 170];
    writeTableHeader(["Segment", "CAGR", "Period", "Source"], w);
    for (const g of input.extraction.growthRates) {
      writeRow([g.segment, fmtPct(g.cagr), g.period, g.source ?? "—"], w);
    }
  }

  // ── §3 Concurrents ───────────────────────────────────────────────
  writeSpacer(10);
  writeHeading("§3 Concurrents");
  if (input.extraction.competitorShares.length === 0) {
    writeBody("Aucune donnée concurrence.", 9);
  } else {
    const w = [contentWidth * 0.35, 90, 60, contentWidth * 0.65 - 150];
    writeTableHeader(["Name", "Share %", "Year", "Source"], w);
    for (const c of input.extraction.competitorShares) {
      writeRow(
        [c.name, c.marketSharePct != null ? fmtNum(c.marketSharePct) : "—", c.year.toString(), c.source ?? "—"],
        w,
      );
    }
  }

  // ── §4 Segments ──────────────────────────────────────────────────
  writeSpacer(10);
  writeHeading("§4 Segments consommateur");
  if (input.extraction.consumerSegments.length === 0) {
    writeBody("Aucune donnée segments.", 9);
  } else {
    for (const s of input.extraction.consumerSegments) {
      writeKv("Segment", `${s.segment} (${fmtNum(s.sizePct)}%)`);
      if (s.demographics && Object.keys(s.demographics).length > 0) {
        writeKv("Demographics", Object.entries(s.demographics).map(([k, v]) => `${k}=${String(v)}`).join(", "));
      }
      if (s.behaviors.length > 0) writeKv("Behaviors", s.behaviors.join(" ; "));
      if (s.painPoints.length > 0) writeKv("Pain points", s.painPoints.join(" ; "));
      writeSpacer(4);
    }
  }

  // ── §5 Prix ──────────────────────────────────────────────────────
  writeSpacer(6);
  writeHeading("§5 Prix");
  if (input.extraction.pricePoints.length === 0) {
    writeBody("Aucune donnée prix.", 9);
  } else {
    const w = [contentWidth * 0.25, contentWidth * 0.3, 80, contentWidth * 0.45 - 80];
    writeTableHeader(["Tier", "Range", "ASP", "Source"], w);
    for (const p of input.extraction.pricePoints) {
      writeRow([p.tier, p.range ?? "—", p.asp != null ? fmtNum(p.asp) : "—", p.source ?? "—"], w);
    }
  }

  // ── §6 Canaux ────────────────────────────────────────────────────
  writeSpacer(10);
  writeHeading("§6 Mix canaux");
  if (input.extraction.channelMix.length === 0) {
    writeBody("Aucune donnée canaux.", 9);
  } else {
    const w = [contentWidth * 0.4, 80, contentWidth * 0.6 - 80];
    writeTableHeader(["Channel", "Share %", "Trend"], w);
    for (const c of input.extraction.channelMix) {
      writeRow([c.channel, fmtNum(c.sharePct), c.growthTrend ?? "—"], w);
    }
  }

  // ── §7 Réglementaire ─────────────────────────────────────────────
  writeSpacer(10);
  writeHeading("§7 Réglementaire");
  if (input.extraction.regulatorySignals.length === 0) {
    writeBody("Aucun signal réglementaire.", 9);
  } else {
    const w = [contentWidth * 0.55, 90, contentWidth * 0.45 - 90];
    writeTableHeader(["Regulation", "Severity", "Timeline"], w);
    for (const r of input.extraction.regulatorySignals) {
      writeRow([r.regulation, r.impactSeverity, r.timeline ?? "—"], w);
    }
  }

  // ── §8 Macro signals ─────────────────────────────────────────────
  writeSpacer(10);
  writeHeading("§8 Macro signals");
  if (input.extraction.macroSignals.length === 0) {
    writeBody("Aucun signal macro.", 9);
  } else {
    const w = [contentWidth * 0.35, contentWidth * 0.45, contentWidth * 0.2];
    writeTableHeader(["Trend", "Evidence", "Horizon"], w);
    for (const m of input.extraction.macroSignals) {
      writeRow([m.trend, m.evidence, m.timeHorizon ?? "—"], w);
    }
  }

  // ── §9 Signaux faibles ───────────────────────────────────────────
  writeSpacer(10);
  writeHeading("§9 Signaux faibles");
  if (input.extraction.weakSignals.length === 0) {
    writeBody("Aucun signal faible identifié.", 9);
  } else {
    for (const w of input.extraction.weakSignals) {
      writeKv("Event", w.event);
      if (w.causalChain.length > 0) writeKv("Causal chain", w.causalChain.join(" → "));
      writeKv("Impact category", w.impactCategory);
      if (w.urgency) writeKv("Urgency", w.urgency);
      writeSpacer(4);
    }
  }

  // ── §10 Trend Tracker ────────────────────────────────────────────
  writeSpacer(6);
  writeHeading("§10 Trend Tracker (49 codes)");
  const tracker = input.extraction.trendTracker;
  if (!tracker || Object.keys(tracker).length === 0) {
    writeBody("Aucun code Trend Tracker chiffré.", 9);
  } else {
    const w = [60, contentWidth * 0.4, 80, 60, contentWidth * 0.6 - 200];
    writeTableHeader(["Code", "Value", "Year", "Conf.", "Source"], w);
    const codes = Object.keys(tracker).sort();
    for (const code of codes) {
      const v = tracker[code];
      if (!v) continue;
      writeRow(
        [
          code,
          typeof v.value === "number" ? fmtNum(v.value) : String(v.value ?? "—"),
          v.year?.toString() ?? "—",
          v.confidence?.toFixed(2) ?? "—",
          v.source ?? "—",
        ],
        w,
      );
    }
  }

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `${input.countryCode} × ${input.sector} — generated ${input.generatedAt} — page ${i}/${pageCount}`,
      margin,
      pageHeight - 18,
    );
    doc.setTextColor(0);
  }

  const buf = doc.output("arraybuffer");
  return Buffer.from(buf as ArrayBuffer);
}

function fmtNum(n: number): string {
  if (Math.abs(n) >= 1000) return n.toLocaleString("en-US");
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(2);
}

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}
