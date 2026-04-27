/**
 * NOTORIA Console Intake — Schema-driven ADVE wizard for console operators.
 *
 * Unlike QuickIntake (landing page, Q&A libre, LLM transforms → INCOMPLET),
 * this is a structured wizard that walks through every Zod schema field
 * and produces Recommendation(SET, source=INTAKE, confidence=1.0, applyPolicy=auto).
 *
 * Result: pillar completionLevel → COMPLET (all fields filled).
 */

import { db } from "@/lib/db";
import { PILLAR_SCHEMAS } from "@/lib/types/pillar-schemas";
import { normalizePillarForIntake } from "@/server/services/pillar-normalizer";
import { writePillar } from "@/server/services/pillar-gateway";
import type { PillarKey } from "@/lib/types/advertis-vector";
import type { Prisma } from "@prisma/client";

// ── Types ─────────────────────────────────────────────────────────

export interface IntakeState {
  strategyId: string;
  currentPillar: PillarKey;
  fields: Array<{
    key: string;
    type: string;
    filled: boolean;
    current?: unknown;
  }>;
  progress: { filled: number; total: number };
}

const ADVE_KEYS: PillarKey[] = ["a", "d", "v", "e"];

// ── Schema field introspection ────────────────────────────────────

function getFieldsForPillar(pillarKey: PillarKey): Array<{ key: string; type: string }> {
  const upperKey = pillarKey.toUpperCase() as keyof typeof PILLAR_SCHEMAS;
  const schema = PILLAR_SCHEMAS[upperKey];
  if (!schema) return [];

  const shape = schema.shape as Record<
    string,
    { _def?: { typeName?: string } }
  >;

  return Object.entries(shape).map(([key, fieldSchema]) => {
    const typeName = fieldSchema?._def?.typeName ?? "unknown";
    let type = "text";
    if (typeName.includes("ZodArray")) type = "array";
    else if (typeName.includes("ZodObject")) type = "object";
    else if (typeName.includes("ZodNumber")) type = "number";
    else if (typeName.includes("ZodEnum")) type = "enum";
    else if (typeName.includes("ZodBoolean")) type = "boolean";
    return { key, type };
  });
}

// ── Start ─────────────────────────────────────────────────────────

export async function startConsoleIntake(
  strategyId: string,
): Promise<IntakeState> {
  const pillarKey: PillarKey = "a"; // Start with Authenticite
  const pillar = await db.pillar.findUnique({
    where: { strategyId_key: { strategyId, key: pillarKey } },
    select: { content: true },
  });
  const content = (pillar?.content ?? {}) as Record<string, unknown>;

  const fields = getFieldsForPillar(pillarKey).map((f) => ({
    ...f,
    filled: content[f.key] != null && content[f.key] !== "",
    current: content[f.key],
  }));

  const filled = fields.filter((f) => f.filled).length;

  return {
    strategyId,
    currentPillar: pillarKey,
    fields,
    progress: { filled, total: fields.length },
  };
}

// ── Advance ───────────────────────────────────────────────────────

export async function advanceConsoleIntake(
  strategyId: string,
  pillarKey: PillarKey,
  data: Record<string, unknown>,
): Promise<IntakeState> {
  // Normalize the data
  const normalized = normalizePillarForIntake(pillarKey, data);

  // Write via Gateway
  await writePillar({
    strategyId,
    pillarKey,
    operation: { type: "MERGE_DEEP", patch: normalized },
    author: { system: "OPERATOR", reason: "Console intake wizard" },
    options: { targetStatus: "VALIDATED", confidenceDelta: 0.1 },
  });

  // Create Recommendation records for audit trail
  const batch = await db.recommendationBatch.create({
    data: {
      strategyId,
      missionType: "ADVE_INTAKE",
      sourcePillars: [],
      targetPillars: [pillarKey.toUpperCase()],
      totalRecos: Object.keys(normalized).length,
      pendingCount: 0,
      appliedCount: Object.keys(normalized).length,
      agent: "HUMAN",
    },
  });

  for (const [field, value] of Object.entries(normalized)) {
    if (value == null || value === "") continue;
    await db.recommendation.create({
      data: {
        strategyId,
        targetPillarKey: pillarKey,
        targetField: field,
        operation: "SET",
        proposedValue: value as Prisma.InputJsonValue,
        agent: "HUMAN",
        source: "INTAKE",
        confidence: 1.0,
        explain: "Saisie manuelle via wizard console",
        urgency: "NOW",
        impact: "HIGH",
        applyPolicy: "auto",
        status: "APPLIED",
        appliedAt: new Date(),
        reviewedBy: "OPERATOR",
        reviewedAt: new Date(),
        batchId: batch.id,
        missionType: "ADVE_INTAKE",
      },
    });
  }

  // Determine next pillar
  const currentIdx = ADVE_KEYS.indexOf(pillarKey);
  const nextPillar = currentIdx < ADVE_KEYS.length - 1 ? ADVE_KEYS[currentIdx + 1]! : pillarKey;

  // Load next pillar state
  const nextContent = await db.pillar.findUnique({
    where: { strategyId_key: { strategyId, key: nextPillar } },
    select: { content: true },
  });
  const content = (nextContent?.content ?? {}) as Record<string, unknown>;

  const fields = getFieldsForPillar(nextPillar).map((f) => ({
    ...f,
    filled: content[f.key] != null && content[f.key] !== "",
    current: content[f.key],
  }));

  const filled = fields.filter((f) => f.filled).length;

  // Update completion level
  await db.pillar.update({
    where: { strategyId_key: { strategyId, key: pillarKey } },
    data: { completionLevel: "COMPLET" },
  });

  return {
    strategyId,
    currentPillar: nextPillar,
    fields,
    progress: { filled, total: fields.length },
  };
}

// ── Complete ──────────────────────────────────────────────────────

export async function completeConsoleIntake(
  strategyId: string,
): Promise<{ applied: number }> {
  // Mark all ADVE pillars as COMPLET
  let total = 0;
  for (const key of ADVE_KEYS) {
    const pillar = await db.pillar.findUnique({
      where: { strategyId_key: { strategyId, key } },
      select: { content: true },
    });
    const content = (pillar?.content ?? {}) as Record<string, unknown>;
    const filled = Object.values(content).filter(
      (v) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0),
    ).length;

    await db.pillar.update({
      where: { strategyId_key: { strategyId, key } },
      data: {
        completionLevel: filled > 0 ? "COMPLET" : "INCOMPLET",
      },
    });
    total += filled;
  }

  // Recalc scores
  const { scoreObject } = await import("@/server/services/advertis-scorer");
  await scoreObject("strategy", strategyId);

  return { applied: total };
}
