/**
 * strategy-presentation/export-oracle.ts — Phase 7 (B6 Phase 13 fix).
 *
 * Two capabilities:
 *   - exportOracleAsPdf(strategyId, opts)  → returns a Buffer (PDF bytes)
 *   - exportOracleAsMarkdown(strategyId, opts) → returns a string
 *
 * The PDF rendering reuses jspdf (already in deps) so the function works
 * on Vercel-Node serverless without spinning up Chromium. The Markdown
 * variant is a deterministic template walk over the 35 sections of the
 * Oracle (Phase 13 ADR-0014 — was 21), optionally pulled from an
 * OracleSnapshot for time-travel replays.
 *
 * **Phase 13 (B6, ADR-0016)** — auto-snapshot pre-export :
 * - `loadOracle` live read appelle désormais `assemblePresentation` et map
 *   les sections du StrategyPresentationDocument → OracleSection[].
 *   Plus de retour vide (bug pré-Phase 13).
 * - `takeOracleSnapshot` calcule un SHA256 sur le content live ; si identique
 *   au dernier snapshot, retourne le snapshotId existant (idempotence).
 *
 * Both functions are governed: the Intent kind EXPORT_ORACLE routes here
 * via the strategy-presentation manifest.
 *
 * APOGEE — Sous-système Telemetry (Mission #3). Loi 1 (altitude) :
 * snapshot pre-export = preserve l'état exact ; idempotence SHA256 = pas
 * de duplication.
 */

import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { jsPDF } from "jspdf";
import { SECTION_REGISTRY } from "./types";

export interface ExportOpts {
  /** When set, the export pulls from this snapshot instead of the live state. */
  snapshotId?: string;
  /** Markdown localization. */
  lang?: "fr" | "en";
}

interface OracleSection {
  key: string;
  title: string;
  body: string;
}

/**
 * Humanise une clé camelCase/snake_case en libellé lisible.
 * `perceptionActuelle` → « Perception actuelle », `tam_sam_som` → « Tam sam som ».
 */
function humanizeKey(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase(); // sentence-case (« Perception actuelle »), pas title-case
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function isEmptyValue(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim().length === 0;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v as object).length === 0;
  return false;
}

/**
 * Rend une valeur arbitraire en lignes de texte LISIBLES (Markdown-flavored) —
 * remplace le `JSON.stringify` brut (audit 2026-07-13, T15). Récursif, borné en
 * profondeur. Titres de sous-objets en `## `, listes en `• `, clé-valeur en
 * `Label : valeur`. Les clés internes (préfixe `_`) sont ignorées.
 */
export function renderValue(value: unknown, indent = "", depth = 0): string[] {
  if (isEmptyValue(value)) return [];
  if (depth > 6) return [`${indent}…`];

  if (typeof value === "string") return [`${indent}${value}`];
  if (typeof value === "number" || typeof value === "boolean") {
    return [`${indent}${String(value)}`];
  }

  if (Array.isArray(value)) {
    const lines: string[] = [];
    for (const item of value) {
      if (isEmptyValue(item)) continue;
      if (item != null && typeof item === "object") {
        // Élément structuré → bloc puce + champs indentés.
        const inner = renderValue(item, `${indent}  `, depth + 1);
        if (inner.length > 0) {
          lines.push(`${indent}• ${inner[0]!.trim()}`);
          lines.push(...inner.slice(1));
        }
      } else {
        lines.push(`${indent}• ${String(item)}`);
      }
    }
    return lines;
  }

  // Objet : chaque champ non-vide, non-interne.
  const lines: string[] = [];
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (k.startsWith("_") || isEmptyValue(v)) continue;
    const label = humanizeKey(k);
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      lines.push(`${indent}${label} : ${String(v)}`);
    } else {
      lines.push(`${indent}## ${label}`);
      lines.push(...renderValue(v, `${indent}  `, depth + 1));
    }
  }
  return lines;
}

/**
 * Phase 13 (B6, ADR-0016) — sérialise une section data vers texte LISIBLE
 * (ADR-0138, T15) : plus de `JSON.stringify` brut, un rendu structuré
 * consommé à la fois par l'export Markdown et le PDF.
 */
export function sectionDataToBody(data: unknown): string {
  if (isEmptyValue(data)) return "(section vide)";
  if (typeof data === "string") return data;
  if (typeof data === "number" || typeof data === "boolean") return String(data);
  const lines = renderValue(data);
  return lines.length > 0 ? lines.join("\n") : "(section vide)";
}

async function loadOracle(strategyId: string, opts: ExportOpts): Promise<OracleSection[]> {
  if (opts.snapshotId) {
    const snap = await db.oracleSnapshot.findUnique({
      where: { id: opts.snapshotId },
    });
    if (!snap) throw new Error(`OracleSnapshot ${opts.snapshotId} not found`);
    if (snap.strategyId !== strategyId) {
      throw new Error("snapshot does not belong to the strategy");
    }
    return (snap.snapshotJson as { sections?: OracleSection[] }).sections ?? [];
  }
  // Phase 13 (B6, ADR-0016) — Live read via assemblePresentation.
  // Le legacy retournait `[]` ce qui produisait des PDFs/snapshots vides.
  // Désormais on assemble le document live et mappe les sections du
  // SECTION_REGISTRY vers OracleSection[]. Hors enrichissement Oracle, le
  // pipeline reste inchangé (cf. Loi 1 — pas de régression).
  const { assemblePresentation } = await import("./index");
  const doc = await assemblePresentation(strategyId);
  const sections: OracleSection[] = [];
  // Map sectionId → field path dans doc.sections (camelCase pour les 21 legacy,
  // sectionId direct pour les 14 Phase 13). Cf. presentation-layout.tsx
  // SECTION_DATA_MAP pour le shape canonique.
  const SECTION_DATA_MAP: Record<string, string> = {
    "executive-summary": "executiveSummary",
    "contexte-defi": "contexteDefi",
    "plateforme-strategique": "plateformeStrategique",
    "proposition-valeur": "propositionValeur",
    "territoire-creatif": "territoireCreatif",
    "experience-engagement": "experienceEngagement",
    "swot-interne": "swotInterne",
    "swot-externe": "swotExterne",
    "signaux-opportunites": "signaux",
    "catalogue-actions": "catalogueActions",
    "plan-activation": "planActivation",
    "fenetre-overton": "fenetreOverton",
    "medias-distribution": "mediasDistribution",
    "production-livrables": "productionLivrables",
    "profil-superfan": "profilSuperfan",
    "kpis-mesure": "kpisMesure",
    "croissance-evolution": "croissanceEvolution",
    "budget": "budget",
    "timeline-gouvernance": "timelineGouvernance",
    "equipe": "equipe",
    "conditions-etapes": "conditionsEtapes",
  };
  const docSections = doc.sections as unknown as Record<string, unknown>;
  for (const meta of SECTION_REGISTRY) {
    const dataKey = SECTION_DATA_MAP[meta.id] ?? meta.id;
    const data = docSections[dataKey];
    sections.push({
      key: meta.id,
      title: `${meta.number} — ${meta.title}`,
      body: sectionDataToBody(data),
    });
  }
  return sections;
}

/**
 * Phase 13 (B6, ADR-0016) — auto-snapshot pre-export wrapper.
 *
 * Si l'opts contient un snapshotId, retourne tel quel (replay deterministe).
 * Sinon, prend un snapshot live + retourne snapshotId. Idempotence SHA256 :
 * si content live identique au dernier snapshot, réutilise son id.
 */
async function ensureSnapshotForExport(
  strategyId: string,
  opts: ExportOpts,
): Promise<ExportOpts & { snapshotId: string }> {
  if (opts.snapshotId) return opts as ExportOpts & { snapshotId: string };
  const { snapshotId } = await takeOracleSnapshot({ strategyId, lang: opts.lang });
  return { ...opts, snapshotId };
}

/** Nom de marque pour les titres de livrable (jamais un CUID face client). */
async function loadBrandName(strategyId: string): Promise<string> {
  const row = await db.strategy.findUnique({ where: { id: strategyId }, select: { name: true } });
  return row?.name ?? "Marque";
}

export async function exportOracleAsMarkdown(
  strategyId: string,
  opts: ExportOpts = {},
): Promise<string> {
  // Phase 13 (B6) — auto-snapshot pre-export pour idempotence + traçabilité
  const ensured = await ensureSnapshotForExport(strategyId, opts);
  const sections = await loadOracle(strategyId, ensured);
  const lang = opts.lang ?? "fr";
  // Titre = NOM DE LA MARQUE — le CUID brut en titre d'un livrable client était
  // un gap d'exécution (audit 2026-07-16, `oracle-pdf-cuid-title`).
  const brandName = await loadBrandName(strategyId);
  const dateStr = new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { day: "numeric", month: "long", year: "numeric" });
  const lines: string[] = [];
  lines.push(`# ${lang === "fr" ? "Stratégie" : "Strategy"} — ${brandName}`);
  lines.push("");
  lines.push(lang === "fr" ? `_Version du ${dateStr}._` : `_Version of ${dateStr}._`);
  lines.push("");
  for (const s of sections) {
    lines.push(`## ${s.title}`);
    lines.push("");
    lines.push(s.body || "_(empty)_");
    lines.push("");
  }
  return lines.join("\n");
}

export async function exportOracleAsPdf(
  strategyId: string,
  opts: ExportOpts = {},
): Promise<Buffer> {
  // Phase 13 (B6) — auto-snapshot pre-export
  const ensured = await ensureSnapshotForExport(strategyId, opts);
  const sections = await loadOracle(strategyId, ensured);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const pageHeight = doc.internal.pageSize.getHeight();
  const lineHeight = 14;
  let y = margin;

  const brandName = await loadBrandName(strategyId);
  const lang = opts.lang ?? "fr";
  const dateStr = new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { day: "numeric", month: "long", year: "numeric" });
  doc.setFontSize(20);
  doc.text(`${lang === "fr" ? "Stratégie" : "Strategy"} — ${brandName}`, margin, y);
  y += lineHeight * 2;
  doc.setFontSize(10);
  doc.text(lang === "fr" ? `Version du ${dateStr}` : `Version of ${dateStr}`, margin, y);
  y += lineHeight * 2;

  for (const s of sections) {
    if (y > pageHeight - margin * 2) {
      doc.addPage();
      y = margin;
    }
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(s.title, margin, y);
    doc.setFont("helvetica", "normal");
    y += lineHeight * 1.5;
    doc.setFontSize(10);
    // ADR-0138 (T15) — rendu par ligne du corps structuré : `## ` = sous-titre
    // gras, `• ` = puce légèrement indentée, sinon paragraphe. Plus de dump JSON.
    for (const rawLine of (s.body || "(section vide)").split("\n")) {
      const isHeading = rawLine.startsWith("## ");
      const text = isHeading ? rawLine.slice(3) : rawLine;
      const lineIndent = rawLine.startsWith("  ") ? 12 : 0;
      const wrapped = doc.splitTextToSize(text, 500 - lineIndent);
      if (isHeading) doc.setFont("helvetica", "bold");
      for (const line of wrapped) {
        if (y > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin + lineIndent, y);
        y += lineHeight;
      }
      if (isHeading) doc.setFont("helvetica", "normal");
    }
    y += lineHeight;
  }

  const buf = doc.output("arraybuffer");
  return Buffer.from(buf as ArrayBuffer);
}

/**
 * Phase 7 + Phase 13 (B6, ADR-0016) — take a snapshot of the live Oracle.
 *
 * Idempotence SHA256 : si le content live est strictement identique au dernier
 * snapshot (même hash), retourne `{ snapshotId: existingId }` sans dupliquer.
 *
 * Appelé :
 * - À la fin d'un assemblage Oracle (ASSEMBLE_ORACLE / génération de sections
 *   — time-travel utilisateur ; legacy ENRICH_ORACLE déposé ADR-0125)
 * - Pre-export PDF/Markdown via `ensureSnapshotForExport` (B6)
 *
 * Loi 1 (Conservation altitude) : aucun snapshot vide ne peut être créé
 * (loadOracle live read assemble effectivement les sections post-Phase 13).
 */
export async function takeOracleSnapshot(args: {
  strategyId: string;
  parentIntentId?: string;
  lang?: "fr" | "en";
}): Promise<{ snapshotId: string; created: boolean; reusedFrom?: string }> {
  const live = await loadOracle(args.strategyId, {});
  const payload = { sections: live };
  // Phase 13 (B6) — SHA256 idempotence : compare au dernier snapshot
  const contentHash = createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");

  const lastSnapshot = await db.oracleSnapshot.findFirst({
    where: { strategyId: args.strategyId },
    orderBy: { takenAt: "desc" },
  });
  if (lastSnapshot) {
    const lastJson = lastSnapshot.snapshotJson as { sections?: OracleSection[]; _contentHash?: string };
    if (lastJson._contentHash === contentHash) {
      return { snapshotId: lastSnapshot.id, created: false, reusedFrom: lastSnapshot.id };
    }
  }

  const snap = await db.oracleSnapshot.create({
    data: {
      strategyId: args.strategyId,
      schemaVersion: 1,
      lang: args.lang ?? "fr",
      parentIntentId: args.parentIntentId ?? null,
      snapshotJson: { ...payload, _contentHash: contentHash } as unknown as Prisma.InputJsonValue,
    },
  });
  return { snapshotId: snap.id, created: true };
}
