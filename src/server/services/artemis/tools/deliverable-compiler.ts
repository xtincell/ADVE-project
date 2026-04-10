/**
 * Deliverable Compiler — Assembles GloryOutputs into exportable documents
 *
 * When a sequence completes, its GloryOutputs are raw JSON blobs in DB.
 * The compiler takes those outputs and assembles them into a final deliverable
 * in the appropriate format (PDF, HTML, or JSON).
 *
 * Flow:
 *   Sequence DONE → getCompletedSequences() → compile(sequenceKey) → export
 *
 * Format routing:
 *   PDF  → Formal documents (manifeste, brandbook, offre, audit)
 *   HTML → Presentations, interactive dashboards
 *   JSON → Structured data (design tokens, KPI frameworks, calendars)
 */

import { db } from "@/lib/db";
import { getSequence, type GlorySequenceKey } from "./sequences";
import { getTemplate, type MissionTemplate } from "@/server/services/mission-templates";

// ─── Types ───────────────────────────────────────────────────────────────────

export type DeliverableFormat = "PDF" | "HTML" | "JSON";

export interface DeliverableManifest {
  sequenceKey: GlorySequenceKey;
  name: string;
  format: DeliverableFormat;
  /** Ordered sections of the deliverable */
  sections: DeliverableSection[];
  /** Metadata for the cover/header */
  meta: {
    strategyName: string;
    generatedAt: string;
    sequenceName: string;
    totalSteps: number;
    completedSteps: number;
  };
  /** Whether all required outputs are present */
  isComplete: boolean;
  /** Missing tool outputs (sequence steps without GloryOutput) */
  missingOutputs: string[];
}

export interface DeliverableSection {
  /** Tool slug that produced this section */
  sourceToolSlug: string;
  /** Section title */
  title: string;
  /** The actual output data */
  content: Record<string, unknown>;
  /** Step type that produced it (GLORY, ARTEMIS, CALC, etc.) */
  sourceType: string;
}

// ─── Format Routing ──────────────────────────────────────────────────────────

/** Default export format per sequence key */
const SEQUENCE_FORMATS: Partial<Record<GlorySequenceKey, DeliverableFormat>> = {
  // PDF — formal documents
  "MANIFESTE-A": "PDF",
  "BRANDBOOK-D": "PDF",
  "OFFRE-V": "PDF",
  "PLAYBOOK-E": "PDF",
  "AUDIT-R": "PDF",
  "ETUDE-T": "PDF",
  "ROADMAP-S": "PDF",
  "BRAND": "PDF",
  "PRINT-AD": "PDF",
  "OOH": "PDF",
  "PITCH": "PDF",
  "REBRAND": "PDF",

  // HTML — presentations, interactive
  "KV": "HTML",
  "SPOT-VIDEO": "HTML",
  "SPOT-RADIO": "HTML",
  "SOCIAL-POST": "HTML",
  "STORY-ARC": "HTML",
  "WEB-COPY": "HTML",
  "NAMING": "HTML",
  "CAMPAIGN-360": "HTML",
  "LAUNCH": "HTML",
  "INFLUENCE": "HTML",

  // JSON — structured data
  "BRAINSTORM-I": "JSON",
  "ANNUAL-PLAN": "JSON",
  "OPS": "JSON",
  "GUARD": "JSON",
  "EVAL": "JSON",
  "COST-SERVICE": "JSON",
  "COST-CAMPAIGN": "JSON",
  "PROFITABILITY": "JSON",
  "PACKAGING": "JSON",
};

// ─── Compiler ────────────────────────────────────────────────────────────────

/**
 * Build a deliverable manifest for a completed sequence.
 * The manifest describes what the final document will contain.
 * Actual rendering (PDF/HTML/JSON) happens downstream.
 */
export async function compileDeliverable(
  strategyId: string,
  sequenceKey: GlorySequenceKey
): Promise<DeliverableManifest> {
  const seq = getSequence(sequenceKey);
  if (!seq) throw new Error(`Sequence inconnue: ${sequenceKey}`);

  // Load strategy name
  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    select: { name: true },
  });

  // Load all GloryOutputs for this strategy
  const outputs = await db.gloryOutput.findMany({
    where: { strategyId },
    orderBy: { createdAt: "asc" },
  });
  const outputMap = new Map(outputs.map((o) => [o.toolSlug, o]));

  // Build sections from sequence steps
  const sections: DeliverableSection[] = [];
  const missingOutputs: string[] = [];

  for (const step of seq.steps) {
    if (step.status !== "ACTIVE") continue;

    if (step.type === "GLORY" || step.type === "CALC") {
      const output = outputMap.get(step.ref);
      if (output) {
        sections.push({
          sourceToolSlug: step.ref,
          title: step.name,
          content: (output.output as Record<string, unknown>) ?? {},
          sourceType: step.type,
        });
      } else {
        missingOutputs.push(step.ref);
      }
    } else if (step.type === "ARTEMIS") {
      // Check FrameworkResult
      const fwResult = await db.frameworkResult.findFirst({
        where: { strategyId, framework: { slug: step.ref } },
        orderBy: { createdAt: "desc" },
      });
      if (fwResult) {
        sections.push({
          sourceToolSlug: step.ref,
          title: step.name,
          content: (fwResult.output as Record<string, unknown>) ?? {},
          sourceType: "ARTEMIS",
        });
      }
    }
    // PILLAR, SESHAT, MESTOR steps don't produce direct sections —
    // their data is already in the pillar content / context
  }

  const format = SEQUENCE_FORMATS[sequenceKey] ?? "JSON";

  return {
    sequenceKey,
    name: seq.name,
    format,
    sections,
    meta: {
      strategyName: strategy?.name ?? "Unknown",
      generatedAt: new Date().toISOString(),
      sequenceName: seq.name,
      totalSteps: seq.steps.filter((s) => s.status === "ACTIVE").length,
      completedSteps: sections.length,
    },
    isComplete: missingOutputs.length === 0,
    missingOutputs,
  };
}

/**
 * List all compilable deliverables for a strategy
 * (sequences with at least 1 GloryOutput).
 */
export async function listCompilableDeliverables(
  strategyId: string
): Promise<Array<{ sequenceKey: GlorySequenceKey; name: string; format: DeliverableFormat; completeness: number; isComplete: boolean }>> {
  // Get all outputs for this strategy
  const outputs = await db.gloryOutput.findMany({
    where: { strategyId },
    select: { toolSlug: true },
  });
  const executedSlugs = new Set(outputs.map((o) => o.toolSlug));

  const { ALL_SEQUENCES } = await import("./sequences");
  const results: Array<{ sequenceKey: GlorySequenceKey; name: string; format: DeliverableFormat; completeness: number; isComplete: boolean }> = [];

  for (const seq of ALL_SEQUENCES) {
    const glorySteps = seq.steps.filter((s) => (s.type === "GLORY" || s.type === "CALC") && s.status === "ACTIVE");
    if (glorySteps.length === 0) continue;

    const completed = glorySteps.filter((s) => executedSlugs.has(s.ref)).length;
    if (completed === 0) continue; // No outputs at all — skip

    const completeness = Math.round((completed / glorySteps.length) * 100);
    const format = SEQUENCE_FORMATS[seq.key] ?? "JSON";

    results.push({
      sequenceKey: seq.key,
      name: seq.name,
      format,
      completeness,
      isComplete: completeness === 100,
    });
  }

  // Sort: complete first, then by completeness
  results.sort((a, b) => {
    if (a.isComplete !== b.isComplete) return a.isComplete ? -1 : 1;
    return b.completeness - a.completeness;
  });

  return results;
}

/**
 * Export a compiled deliverable as the target format.
 * Returns the raw content — actual PDF/HTML rendering is done by the client or a dedicated renderer.
 */
export async function exportDeliverable(
  strategyId: string,
  sequenceKey: GlorySequenceKey
): Promise<{ manifest: DeliverableManifest; exported: Record<string, unknown> }> {
  const manifest = await compileDeliverable(strategyId, sequenceKey);

  switch (manifest.format) {
    case "JSON":
      return {
        manifest,
        exported: {
          format: "JSON",
          data: Object.fromEntries(manifest.sections.map((s) => [s.sourceToolSlug, s.content])),
        },
      };

    case "HTML":
      return {
        manifest,
        exported: {
          format: "HTML",
          sections: manifest.sections.map((s) => ({
            id: s.sourceToolSlug,
            title: s.title,
            content: s.content,
          })),
          // Actual HTML rendering happens client-side with these structured sections
        },
      };

    case "PDF":
      return {
        manifest,
        exported: {
          format: "PDF",
          documentTitle: `${manifest.meta.strategyName} — ${manifest.name}`,
          generatedAt: manifest.meta.generatedAt,
          sections: manifest.sections.map((s) => ({
            heading: s.title,
            body: s.content,
          })),
          // Actual PDF rendering happens via React-PDF or Puppeteer server-side
        },
      };
  }
}
