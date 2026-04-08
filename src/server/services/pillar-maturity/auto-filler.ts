/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Auto-Filler — Targeted field completion to advance pillar maturity.
 *
 * Unlike actualizePillar() which regenerates entire pillars, this fills
 * ONLY the missing fields identified by the maturity contract.
 *
 * Priority chain:
 *   1. calculation    → pure math from existing fields (zero-cost)
 *   2. cross_pillar   → derive from other pillar content (zero-cost)
 *   3. rtis_cascade   → delegate to actualizePillar for this pillar (1 LLM call)
 *   4. ai_generation  → targeted Claude call for ONLY the missing fields (1 LLM call)
 */

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { MaturityStage, AutoFillResult, FieldRequirement } from "@/lib/types/pillar-maturity";
import { assessPillar } from "./assessor";
import { getContract } from "./contracts-loader";

// ─── Main API ───────────────────────────────────────────────────────────────

/**
 * Fill missing fields to advance a pillar toward a target maturity stage.
 * Returns a detailed report of what was filled, what failed, and the new stage.
 */
export async function fillToStage(
  strategyId: string,
  pillarKey: string,
  targetStage: MaturityStage = "COMPLETE",
): Promise<AutoFillResult> {
  const start = Date.now();
  const key = pillarKey.toLowerCase();
  const contract = getContract(key);

  if (!contract) {
    return { pillarKey: key, targetStage, filled: [], failed: [{ path: "*", reason: "No contract found" }], needsHuman: [], newStage: "EMPTY", durationMs: 0 };
  }

  // Load current pillar content
  const pillar = await db.pillar.findUnique({
    where: { strategyId_key: { strategyId, key } },
  });
  const content = ((pillar?.content ?? {}) as Record<string, unknown>);

  // Assess current state
  const before = assessPillar(key, content, contract);

  // Get target requirements
  const targetReqs = contract.stages[targetStage];
  const missingReqs = targetReqs.filter(r => before.missing.includes(r.path));

  if (missingReqs.length === 0) {
    return { pillarKey: key, targetStage, filled: [], failed: [], needsHuman: [], newStage: before.currentStage as MaturityStage, durationMs: Date.now() - start };
  }

  // Sort by derivation priority: calculation → cross_pillar → rtis_cascade → ai_generation
  const PRIORITY: Record<string, number> = { calculation: 0, cross_pillar: 1, rtis_cascade: 2, ai_generation: 3 };
  const sorted = [...missingReqs].sort((a, b) =>
    (PRIORITY[a.derivationSource ?? "ai_generation"] ?? 3) - (PRIORITY[b.derivationSource ?? "ai_generation"] ?? 3)
  );

  const filled: string[] = [];
  const failed: Array<{ path: string; reason: string }> = [];
  const needsHuman: string[] = [];

  // Load all pillars for cross-pillar derivation
  const allPillars = await db.pillar.findMany({ where: { strategyId } });
  const pillarMap: Record<string, Record<string, unknown>> = {};
  for (const p of allPillars) {
    pillarMap[p.key] = (p.content ?? {}) as Record<string, unknown>;
  }

  // Group by derivation source to batch AI calls
  const calcFields: FieldRequirement[] = [];
  const crossFields: FieldRequirement[] = [];
  const aiFields: FieldRequirement[] = [];

  for (const req of sorted) {
    if (!req.derivable) {
      needsHuman.push(req.path);
      continue;
    }
    switch (req.derivationSource) {
      case "calculation": calcFields.push(req); break;
      case "cross_pillar": crossFields.push(req); break;
      default: aiFields.push(req); break;
    }
  }

  // ── 1. Calculations (zero-cost) ─────────────────────────────────────────
  for (const req of calcFields) {
    try {
      const value = deriveByCalculation(req.path, content, pillarMap);
      if (value !== undefined) {
        setNestedValue(content, req.path, value);
        filled.push(req.path);
      } else {
        failed.push({ path: req.path, reason: "Calculation returned undefined" });
      }
    } catch (err) {
      failed.push({ path: req.path, reason: err instanceof Error ? err.message : String(err) });
    }
  }

  // ── 2. Cross-pillar derivation (zero-cost) ──────────────────────────────
  for (const req of crossFields) {
    try {
      const value = deriveCrossPillar(req.path, key, pillarMap);
      if (value !== undefined) {
        setNestedValue(content, req.path, value);
        filled.push(req.path);
      } else {
        // Downgrade to AI
        aiFields.push(req);
      }
    } catch {
      aiFields.push(req);
    }
  }

  // ── 3. AI generation (batched — single LLM call for all remaining) ──────
  if (aiFields.length > 0) {
    try {
      const aiResults = await generateMissingFields(strategyId, key, content, pillarMap, aiFields);
      for (const req of aiFields) {
        if (aiResults[req.path] !== undefined) {
          setNestedValue(content, req.path, aiResults[req.path]);
          filled.push(req.path);
        } else {
          failed.push({ path: req.path, reason: "AI did not generate this field" });
        }
      }
    } catch (err) {
      for (const req of aiFields) {
        failed.push({ path: req.path, reason: `AI error: ${err instanceof Error ? err.message : String(err)}` });
      }
    }
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  if (filled.length > 0) {
    const newConfidence = Math.min((pillar?.confidence ?? 0.5) + 0.03 * filled.length, 0.95);
    await db.pillar.upsert({
      where: { strategyId_key: { strategyId, key } },
      update: { content: content as Prisma.InputJsonValue, confidence: newConfidence, staleAt: null },
      create: { strategyId, key, content: content as Prisma.InputJsonValue, confidence: newConfidence },
    });

    // Re-score
    try {
      const { scoreObject } = await import("@/server/services/advertis-scorer");
      await scoreObject("strategy", strategyId);
    } catch { /* non-fatal */ }
  }

  // Re-assess
  const after = assessPillar(key, content, contract);

  return {
    pillarKey: key,
    targetStage,
    filled,
    failed,
    needsHuman,
    newStage: after.currentStage as MaturityStage ?? "EMPTY",
    durationMs: Date.now() - start,
  };
}

/**
 * Fill ALL pillars toward a target stage. Processes one pillar at a time.
 */
export async function fillStrategyToStage(
  strategyId: string,
  targetStage: MaturityStage = "COMPLETE",
): Promise<AutoFillResult[]> {
  const results: AutoFillResult[] = [];
  for (const key of ["a", "d", "v", "e", "r", "t", "i", "s"]) {
    const result = await fillToStage(strategyId, key, targetStage);
    results.push(result);
  }
  return results;
}

// ─── Derivation Engines ─────────────────────────────────────────────────────

function deriveByCalculation(
  path: string,
  content: Record<string, unknown>,
  _allPillars: Record<string, Record<string, unknown>>,
): unknown {
  // r.riskScore = weighted average of probability × impact
  if (path === "riskScore") {
    const matrix = content.probabilityImpactMatrix;
    if (!Array.isArray(matrix) || matrix.length === 0) return undefined;
    const weights: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };
    let total = 0;
    for (const entry of matrix) {
      const e = entry as Record<string, unknown>;
      total += (weights[e.probability as string] ?? 1) * (weights[e.impact as string] ?? 1);
    }
    return Math.round((total / (matrix.length * 9)) * 100);
  }

  // v.unitEconomics.ltvCacRatio
  if (path === "unitEconomics.ltvCacRatio") {
    const ue = content.unitEconomics as Record<string, unknown> | undefined;
    if (ue?.ltv && ue?.cac && typeof ue.ltv === "number" && typeof ue.cac === "number" && ue.cac > 0) {
      return Math.round((ue.ltv / ue.cac) * 100) / 100;
    }
    return undefined;
  }

  // i.totalActions = count all actions in catalogueParCanal
  if (path === "totalActions") {
    const catalogue = content.catalogueParCanal;
    if (typeof catalogue === "object" && catalogue !== null) {
      let count = 0;
      for (const arr of Object.values(catalogue)) {
        if (Array.isArray(arr)) count += arr.length;
      }
      return count;
    }
    return undefined;
  }

  return undefined;
}

function deriveCrossPillar(
  path: string,
  pillarKey: string,
  allPillars: Record<string, Record<string, unknown>>,
): unknown {
  const a = allPillars.a ?? {};
  const d = allPillars.d ?? {};
  const t = allPillars.t ?? {};
  const e = allPillars.e ?? {};

  // Brand-level cross-pillar derivations
  if (pillarKey === "i") {
    if (path === "brandPlatform") {
      return {
        name: a.noyauIdentitaire ?? d.positionnement ?? "",
        benefit: d.promesseMaitre ?? "",
        target: Array.isArray(d.personas) ? (d.personas[0] as any)?.nom ?? "" : "",
        competitiveAdvantage: d.positionnement ?? "",
      };
    }
  }

  if (pillarKey === "s") {
    if (path === "visionStrategique" && a.prophecy) {
      const p = a.prophecy as Record<string, unknown>;
      return typeof p === "string" ? p : p.worldTransformed ?? p.vision ?? JSON.stringify(p);
    }
  }

  if (pillarKey === "t") {
    if (path === "brandMarketFitScore") {
      const hyp = t.hypothesisValidation;
      if (Array.isArray(hyp)) {
        const validated = hyp.filter((h: any) => h.status === "VALIDATED").length;
        return Math.round((validated / Math.max(hyp.length, 1)) * 100);
      }
    }
  }

  return undefined;
}

// ─── AI Field Generator (batched) ───────────────────────────────────────────

async function generateMissingFields(
  strategyId: string,
  pillarKey: string,
  currentContent: Record<string, unknown>,
  allPillars: Record<string, Record<string, unknown>>,
  missingReqs: FieldRequirement[],
): Promise<Record<string, unknown>> {
  const { anthropic } = await import("@ai-sdk/anthropic");
  const { generateText } = await import("ai");

  const fieldList = missingReqs.map(r => `- ${r.path}: ${r.description ?? r.validator}`).join("\n");
  const context = Object.entries(allPillars)
    .filter(([, v]) => v && Object.keys(v).length > 0)
    .map(([k, v]) => `[PILIER ${k.toUpperCase()}]\n${JSON.stringify(v, null, 2)}`)
    .join("\n\n");

  const prompt = `Tu es Mestor, l'intelligence strategique de marque.

Voici les 8 piliers actuels de la strategie:
${context}

Le pilier ${pillarKey.toUpperCase()} a besoin des champs suivants (manquants):
${fieldList}

Genere UNIQUEMENT les champs manquants listes ci-dessus en JSON.
Le JSON doit etre un objet plat ou les cles sont les paths des champs.
Pour les paths imbriques (ex: "fenetreOverton"), genere l'objet complet.
Pour les arrays, genere le tableau complet avec les items requis.
Base-toi sur les donnees existantes des autres piliers. Sois specifique a cette marque.

Retourne UNIQUEMENT le JSON, rien d'autre.`;

  const { text, usage } = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    prompt,
    maxTokens: 6000,
  });

  // Track cost
  await db.aICostLog.create({
    data: {
      strategyId,
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      inputTokens: usage?.promptTokens ?? 0,
      outputTokens: usage?.completionTokens ?? 0,
      cost: ((usage?.promptTokens ?? 0) * 0.003 + (usage?.completionTokens ?? 0) * 0.015) / 1000,
      context: `auto-filler:${pillarKey}`,
    },
  }).catch(() => {});

  // Parse response
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) return {};
  try {
    return JSON.parse(jsonMatch[1] ?? jsonMatch[0]);
  } catch {
    return {};
  }
}

// ─── Utilities ──────────────────────────────────────────────────────────────

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  if (parts.length === 1) {
    obj[parts[0]!] = value;
    return;
  }
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    if (current[part] === undefined || current[part] === null || typeof current[part] !== "object") {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]!] = value;
}
