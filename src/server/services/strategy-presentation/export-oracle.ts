/**
 * strategy-presentation/export-oracle.ts — Phase 7.
 *
 * Two capabilities:
 *   - exportOracleAsPdf(strategyId, opts)  → returns a Buffer (PDF bytes)
 *   - exportOracleAsMarkdown(strategyId, opts) → returns a string
 *
 * The PDF rendering reuses jspdf (already in deps) so the function works
 * on Vercel-Node serverless without spinning up Chromium. The Markdown
 * variant is a deterministic template walk over the 21 sections of the
 * Oracle, optionally pulled from an OracleSnapshot for time-travel
 * replays.
 *
 * Both functions are governed: the Intent kind EXPORT_ORACLE routes here
 * via the strategy-presentation manifest.
 */

import { db } from "@/lib/db";
import { jsPDF } from "jspdf";
import { assemblePresentation } from "./index";
import { SECTION_REGISTRY } from "./types";
import { DORMANT_NETERU_SECTIONS, renderDormantSectionBody } from "./dormant-neteru-sections";

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
 * Stringify a section payload (object/array/string) into a body suitable for
 * Markdown / PDF. Section payloads are heterogeneous JSON shapes from the
 * 21 typed mappers — we render each top-level field as a labeled block.
 */
function formatSectionBody(payload: unknown): string {
  if (payload == null) return "(vide)";
  if (typeof payload === "string") return payload;
  if (Array.isArray(payload)) {
    if (payload.length === 0) return "(vide)";
    return payload
      .map((item, i) =>
        typeof item === "string"
          ? `- ${item}`
          : `- (${i + 1}) ${JSON.stringify(item, null, 2)}`,
      )
      .join("\n");
  }
  if (typeof payload === "object") {
    const entries = Object.entries(payload as Record<string, unknown>).filter(
      ([, v]) => v !== null && v !== undefined && v !== "",
    );
    if (entries.length === 0) return "(vide)";
    return entries
      .map(([k, v]) => {
        if (typeof v === "string") return `**${k}** : ${v}`;
        if (Array.isArray(v) && v.every((x) => typeof x === "string"))
          return `**${k}** :\n${v.map((s) => `  - ${s}`).join("\n")}`;
        return `**${k}** : ${JSON.stringify(v, null, 2)}`;
      })
      .join("\n\n");
  }
  return String(payload);
}

/**
 * Map section id (kebab-case in SECTION_REGISTRY) to camelCase key used in
 * StrategyPresentationDocument.sections (Oracle 21 sections — see types.ts).
 */
const SECTION_ID_TO_KEY: Record<string, string> = {
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
  budget: "budget",
  "timeline-gouvernance": "timelineGouvernance",
  equipe: "equipe",
  "conditions-etapes": "conditionsEtapes",
};

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
  // Live assembly — assemblePresentation() pulls every pillar / Glory
  // output / framework result via the canonical PRESENTATION_INCLUDE,
  // typed by section. We render each registry entry into a flat
  // {key, title, body} triple so the PDF / Markdown export is
  // deterministic and matches what the cockpit UI displays.
  const doc = await assemblePresentation(strategyId);
  const sections: OracleSection[] = [];
  for (const meta of SECTION_REGISTRY) {
    const camelKey = SECTION_ID_TO_KEY[meta.id];
    const payload = camelKey
      ? (doc.sections as Record<string, unknown>)[camelKey]
      : null;
    sections.push({
      key: meta.id,
      title: `${meta.number} — ${meta.title}`,
      body: formatSectionBody(payload),
    });
  }

  // Espaces réservés pour les Neteru en sommeil (Imhotep, Anubis).
  // Foreshadowing client + anti-drift narratif (cf. dormant-neteru-sections.ts).
  for (const dormant of DORMANT_NETERU_SECTIONS) {
    sections.push({
      key: dormant.id,
      title: `${dormant.number} — ${dormant.title}`,
      body: renderDormantSectionBody(dormant),
    });
  }

  return sections;
}

export async function exportOracleAsMarkdown(
  strategyId: string,
  opts: ExportOpts = {},
): Promise<string> {
  const sections = await loadOracle(strategyId, opts);
  const lang = opts.lang ?? "fr";
  const lines: string[] = [];
  lines.push(`# Oracle — ${strategyId}`);
  lines.push("");
  lines.push(
    lang === "fr"
      ? `_Généré ${opts.snapshotId ? `depuis le snapshot ${opts.snapshotId}` : "à partir de l'état courant"}._`
      : `_Generated ${opts.snapshotId ? `from snapshot ${opts.snapshotId}` : "from the live state"}._`,
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
  const sections = await loadOracle(strategyId, opts);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const pageHeight = doc.internal.pageSize.getHeight();
  const lineHeight = 14;
  let y = margin;

  doc.setFontSize(20);
  doc.text(`Oracle — ${strategyId}`, margin, y);
  y += lineHeight * 2;
  doc.setFontSize(10);
  doc.text(
    opts.snapshotId ? `Snapshot ${opts.snapshotId}` : "Live state",
    margin,
    y,
  );
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

/** Phase 7 — take a snapshot of the live Oracle. Called at the end of every
 *  ENRICH_ORACLE intent so the user can time-travel. */
export async function takeOracleSnapshot(args: {
  strategyId: string;
  parentIntentId?: string;
  lang?: "fr" | "en";
}): Promise<{ snapshotId: string }> {
  const live = await loadOracle(args.strategyId, {});
  const snap = await db.oracleSnapshot.create({
    data: {
      strategyId: args.strategyId,
      schemaVersion: 1,
      lang: args.lang ?? "fr",
      parentIntentId: args.parentIntentId ?? null,
      snapshotJson: { sections: live } as never,
    },
  });
  return { snapshotId: snap.id };
}
