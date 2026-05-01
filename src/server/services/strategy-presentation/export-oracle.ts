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
 * Phase 13 (B6, ADR-0016) — sérialise une section data vers texte.
 * Heuristique simple : si string, retourne ; sinon JSON.stringify pretty.
 */
function sectionDataToBody(data: unknown): string {
  if (data == null) return "(empty)";
  if (typeof data === "string") return data;
  if (typeof data === "number" || typeof data === "boolean") return String(data);
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return "(unserializable)";
  }
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

export async function exportOracleAsMarkdown(
  strategyId: string,
  opts: ExportOpts = {},
): Promise<string> {
  // Phase 13 (B6) — auto-snapshot pre-export pour idempotence + traçabilité
  const ensured = await ensureSnapshotForExport(strategyId, opts);
  const sections = await loadOracle(strategyId, ensured);
  const lang = opts.lang ?? "fr";
  const lines: string[] = [];
  lines.push(`# Oracle — ${strategyId}`);
  lines.push("");
  lines.push(
    lang === "fr"
      ? `_Généré depuis le snapshot ${ensured.snapshotId} (Phase 13 auto-snapshot pre-export)._`
      : `_Generated from snapshot ${ensured.snapshotId} (Phase 13 auto-snapshot pre-export)._`,
  );
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

  doc.setFontSize(20);
  doc.text(`Oracle — ${strategyId}`, margin, y);
  y += lineHeight * 2;
  doc.setFontSize(10);
  doc.text(`Snapshot ${ensured.snapshotId}`, margin, y);
  y += lineHeight * 2;

  for (const s of sections) {
    if (y > pageHeight - margin * 2) {
      doc.addPage();
      y = margin;
    }
    doc.setFontSize(14);
    doc.text(s.title, margin, y);
    y += lineHeight * 1.5;
    doc.setFontSize(10);
    const wrapped = doc.splitTextToSize(s.body || "(empty)", 500);
    for (const line of wrapped) {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
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
 * - À la fin de chaque ENRICH_ORACLE intent (time-travel utilisateur)
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
      snapshotJson: { ...payload, _contentHash: contentHash } as never,
    },
  });
  return { snapshotId: snap.id, created: true };
}
