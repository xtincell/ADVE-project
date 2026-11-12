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

import { isUsableGeneration } from "@/domain/generation-result";
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
    generatedAt: string | null;
    sequenceName: string;
    totalSteps: number;
    completedSteps: number;
  };
  /** Whether all required outputs are present */
  isComplete: boolean;
  /** Missing tool outputs (sequence steps without GloryOutput) */
  missingOutputs: string[];
  history: Array<{ id: string; toolSlug: string; title: string; version: number | null; createdAt: string; usable: boolean; author: string; engine: string | null }>;
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
  version?: { id: string; number: number; createdAt: string; author: string; engine: string | null; approval?: string; executionId?: string };
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

const editionFields = { id: true, version: true, sequenceKey: true, status: true, approval: true, isCurrent: true } as const;
type EditionOutput = { toolSlug: string; execution?: { id: string; version: number; sequenceKey: string; status: string } | null };

/** When the producing tools belong to recorded editions, read a coherent set of sections.
 * Historical, ungrouped outputs remain readable when there is no complete recorded edition. */
function editionOutputs<T extends EditionOutput>(usable: T[], sequenceKey: string, steps: ReadonlyArray<{ type: string; ref: string }>): T[] {
  if (!steps.length || steps.some(step => step.type !== "GLORY" && step.type !== "ARTEMIS" && step.type !== "CALC")) return usable;
  const editions = new Map<string, T[]>();
  for (const output of usable) {
    const run = output.execution;
    if (run?.sequenceKey !== sequenceKey) continue;
    const group = editions.get(run.id) ?? [];
    group.push(output);
    editions.set(run.id, group);
  }
  const ordered = [...editions.values()].sort((a, b) => b[0]!.execution!.version - a[0]!.execution!.version);
  const complete = ordered.find(group => group[0]!.execution!.status === "COMPLETED" && steps.every(step => group.some(o => o.toolSlug === step.ref)));
  if (complete) return complete;
  if (!ordered.length || usable.some(output => !output.execution && steps.some(step => step.ref === output.toolSlug))) return usable;
  return ordered[0]!;
}

/** FrameworkResult has no execution FK. Only the exact result id recorded in the step receipt establishes attribution. */
async function frameworkOutputs(strategyId: string, refs?: string[], sequenceKey?: GlorySequenceKey) {
  if (refs && !refs.length) return [];
  const rows = await db.frameworkResult.findMany({
    where: { strategyId, ...(refs ? { framework: { slug: { in: refs } } } : {}) },
    select: { id: true, output: true, createdAt: true, framework: { select: { slug: true } } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  if (!rows.length) return [];
  const runs = await db.sequenceExecution.findMany({ where: { strategyId, sequenceKey }, select: { ...editionFields, stepResults: true } });
  const byResultId = new Map<string, { ref: string; run: typeof runs[number] }>();
  for (const run of runs) {
    if (!Array.isArray(run.stepResults)) continue;
    for (const step of run.stepResults) {
      if (step && typeof step === "object" && !Array.isArray(step) && step.type === "ARTEMIS" && step.status === "SUCCESS" &&
          typeof step.ref === "string" && typeof step.frameworkResultId === "string") {
        byResultId.set(step.frameworkResultId, { ref: step.ref, run });
      }
    }
  }
  return rows.map(row => {
    const receipt = byResultId.get(row.id);
    return { ...row, toolSlug: row.framework.slug, execution: receipt?.ref === row.framework.slug ? receipt.run : null };
  });
}

/**
 * Build a deliverable manifest for a completed sequence.
 * The manifest describes what the final document will contain.
 * Actual rendering (PDF/HTML/JSON) happens downstream.
 */
export async function compileDeliverable(
  strategyId: string,
  sequenceKey: GlorySequenceKey,
  selectedVersions: Record<string, string> = {},
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
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: { execution: { select: editionFields } },
  });
  const usable = outputs.filter(o => isUsableGeneration(o.output));
  const producingSteps = seq.steps.filter(step => step.status === "ACTIVE" && ["GLORY", "CALC", "ARTEMIS"].includes(step.type));
  const frameworks = await frameworkOutputs(strategyId, producingSteps.filter(step => step.type === "ARTEMIS").map(step => step.ref), seq.key);
  const accessible = [...usable, ...frameworks.filter(row => isUsableGeneration(row.output))];
  const outputMap = new Map(editionOutputs(accessible, seq.key, producingSteps).map(row => [row.toolSlug, row]));
  for (const [slug, outputId] of Object.entries(selectedVersions)) {
    const selected = accessible.find(row => row.toolSlug === slug && row.id === outputId);
    if (selected) outputMap.set(slug, selected);
    else outputMap.delete(slug);
  }
  const authorOf = (value: unknown) => {
    const meta = (value && typeof value === "object" ? (value as Record<string, unknown>)._meta : null) as Record<string, unknown> | null;
    const engine = typeof meta?.model === "string" ? meta.model : null;
    const label = typeof meta?.author === "string" ? meta.author : meta?.manualEntry ? "Saisie humaine · auteur historique non enregistré" : meta?.deterministic ? "Moteur de calcul" : engine?.includes("luna") ? "Luna" : engine ? "Moteur génératif" : "Auteur historique non enregistré";
    return { author: label, engine };
  };
  const relevant = new Map(seq.steps.filter(step => step.status === "ACTIVE").map(step => [step.ref, step.name]));
  const history = outputs.filter(o => relevant.has(o.toolSlug)).map(o => ({ id: o.id, toolSlug: o.toolSlug, title: relevant.get(o.toolSlug)!, createdAt: o.createdAt.toISOString(), usable: isUsableGeneration(o.output), version: isUsableGeneration(o.output) ? usable.filter(v => v.toolSlug === o.toolSlug).findIndex(v => v.id === o.id) + 1 : null, ...authorOf(o.output) }));

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
          version: { id: output.id, number: usable.filter(o => o.toolSlug === step.ref).findIndex(o => o.id === output.id) + 1, createdAt: output.createdAt.toISOString(), approval: output.execution?.approval ?? "PENDING", executionId: output.execution?.id, ...authorOf(output.output) },
        });
      } else {
        missingOutputs.push(step.ref);
      }
    } else if (step.type === "ARTEMIS") {
      // Check FrameworkResult
      const fwRows = frameworks.filter(row => row.toolSlug === step.ref);
      const fwUsable = fwRows.filter(row => isUsableGeneration(row.output));
      const fwResult = outputMap.get(step.ref);
      history.push(...fwRows.map(row => ({ id: row.id, toolSlug: step.ref, title: step.name, createdAt: row.createdAt.toISOString(), usable: isUsableGeneration(row.output), version: isUsableGeneration(row.output) ? fwUsable.findIndex(v => v.id === row.id) + 1 : null, ...authorOf(row.output) })));
      if (fwResult && isUsableGeneration(fwResult.output)) {
        sections.push({
          sourceToolSlug: step.ref,
          title: step.name,
          content: (fwResult.output as Record<string, unknown>) ?? {},
          sourceType: "ARTEMIS",
          version: { id: fwResult.id, number: fwUsable.findIndex(row => row.id === fwResult.id) + 1, createdAt: fwResult.createdAt.toISOString(), approval: fwResult.execution?.approval ?? "PENDING", executionId: fwResult.execution?.id, ...authorOf(fwResult.output) },
        });
      } else {
        // Sans ce push, `isComplete` (missingOutputs.length === 0) mentait :
        // une étape ARTEMIS active sans FrameworkResult était comptée comme
        // complète (parité avec la branche GLORY/CALC ci-dessus).
        missingOutputs.push(step.ref);
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
      generatedAt: sections.flatMap(section => section.version ? [section.version.createdAt] : []).sort().at(-1) ?? null,
      sequenceName: seq.name,
      totalSteps: seq.steps.filter((s) => s.status === "ACTIVE" && ["GLORY", "CALC", "ARTEMIS"].includes(s.type)).length,
      completedSteps: sections.length,
    },
    isComplete: sections.length > 0 && missingOutputs.length === 0,
    missingOutputs,
    history,
  };
}

/**
 * List all compilable deliverables for a strategy
 * (sequences with at least 1 GloryOutput).
 */
export async function listCompilableDeliverables(
  strategyId: string
): Promise<Array<{ sequenceKey: GlorySequenceKey; name: string; format: DeliverableFormat; completeness: number; isComplete: boolean; generatedAt: string | null }>> {
  // Get all outputs for this strategy
  const outputs = await db.gloryOutput.findMany({
    where: { strategyId },
    select: { toolSlug: true, output: true, createdAt: true, execution: { select: editionFields } },
  });
  const usable = outputs.filter(row => isUsableGeneration(row.output));

  // ARTEMIS steps resolve against FrameworkResult (par slug), pas GloryOutput.
  // Sans ça, la complétude ne comptait que GLORY/CALC → `isComplete` mentait de
  // la même manière que `compileDeliverable` (parité de comptage des étapes).
  const fwResults = await frameworkOutputs(strategyId);
  const allUsable = [...usable, ...fwResults.filter(row => isUsableGeneration(row.output))];

  const { ALL_SEQUENCES } = await import("./sequences");
  const results: Array<{ sequenceKey: GlorySequenceKey; name: string; format: DeliverableFormat; completeness: number; isComplete: boolean; generatedAt: string | null }> = [];

  for (const seq of ALL_SEQUENCES) {
    const producingSteps = seq.steps.filter(
      (s) => (s.type === "GLORY" || s.type === "CALC" || s.type === "ARTEMIS") && s.status === "ACTIVE",
    );
    if (producingSteps.length === 0) continue;

    const selected = editionOutputs(allUsable, seq.key, producingSteps);
    const executedSlugs = new Set(selected.map(row => row.toolSlug));
    const completed = producingSteps.filter(step => executedSlugs.has(step.ref)).length;
    if (completed === 0) continue; // No outputs at all — skip

    // lafusee:allow-adhoc-completion: deliverable compilation progress metric (sections processed ratio)
    const completeness = Math.round((completed / producingSteps.length) * 100);
    const format = SEQUENCE_FORMATS[seq.key] ?? "JSON";

    results.push({
      sequenceKey: seq.key,
      name: seq.name,
      format,
      completeness,
      isComplete: completeness === 100,
      generatedAt: selected.filter(row => producingSteps.some(step => step.ref === row.toolSlug)).map(row => row.createdAt.toISOString()).sort().at(-1) ?? null,
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
