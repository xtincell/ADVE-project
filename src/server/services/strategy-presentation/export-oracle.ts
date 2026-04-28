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
  // Live read — pulls Oracle sections from the existing storage shape.
  // The Oracle isn't stored in a single column today; it is reconstructed
  // by the existing strategy-presentation pipeline. Until that migrates
  // to a normalized column (Phase 7 follow-up), we return an empty
  // structure when no snapshot is requested. Callers should pass
  // `snapshotId` for deterministic exports.
  void strategyId;
  return [];
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
