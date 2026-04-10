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

  // ── 0. Extract from BrandDataSource (zero-cost — source of truth) ───────
  try {
    const sourceExtracted = await extractFromSources(strategyId, key, missingReqs.map(r => r.path));
    for (const [path, value] of Object.entries(sourceExtracted)) {
      if (value !== undefined && value !== null && value !== "") {
        setNestedValue(content, path, value);
        filled.push(path);
        // Remove from other groups — already filled
        const removeFrom = (arr: FieldRequirement[]) => {
          const idx = arr.findIndex(r => r.path === path);
          if (idx >= 0) arr.splice(idx, 1);
        };
        removeFrom(calcFields);
        removeFrom(crossFields);
        removeFrom(aiFields);
      }
    }
  } catch (err) {
    console.warn("[auto-filler] source extraction failed:", err instanceof Error ? err.message : err);
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

  // ── Clean up: remove any dot-notation flat keys (auto-filler artifact) ──
  for (const k of Object.keys(content)) {
    if (k.includes(".")) delete content[k];
  }

  // ── Save via Gateway — LOI 1 ─────────────────────────────────────────
  if (filled.length > 0) {
    const { writePillarAndScore } = await import("@/server/services/pillar-gateway");
    await writePillarAndScore({
      strategyId,
      pillarKey: key as import("@/lib/types/advertis-vector").PillarKey,
      operation: { type: "REPLACE_FULL", content },
      author: { system: "AUTO_FILLER", reason: `fillToStage(${targetStage}) — ${filled.length} fields filled` },
      options: { confidenceDelta: 0.03 * filled.length },
    });
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

  // Foundational fields — derive from other pillar content or known data
  if (pillarKey === "a") {
    if (path === "nomMarque" && a.nomMarque) return a.nomMarque;
    if (path === "description" && a.description) return a.description;
    if (path === "secteur" && a.secteur) return a.secteur;
    if (path === "pays" && a.pays) return a.pays;
    // These might not be in pillar A yet if migration didn't run — try to derive from V
    const v = allPillars.v ?? {};
    if (path === "secteur" && !a.secteur && v.businessModel) return "A definir"; // Placeholder
    if (path === "pays" && !a.pays) return "CM"; // Default Cameroun
  }

  if (pillarKey === "d") {
    if (path === "assetsLinguistiques.languePrincipale" && a.langue) return a.langue;
    if (path === "archetypalExpression" && a.archetype) {
      return { visualTranslation: `Expression visuelle de l'archetype ${a.archetype}`, verbalTranslation: `Ton verbal aligne avec ${a.archetype}`, emotionalRegister: "A definir" };
    }
  }

  if (pillarKey === "v") {
    if (path === "pricingJustification" && d.positionnement) return `Pricing justifie par le positionnement : ${d.positionnement}`;
    if (path === "personaSegmentMap" && Array.isArray(d.personas) && d.personas.length > 0) {
      const v = allPillars.v ?? {};
      const produits = Array.isArray(v.produitsCatalogue) ? v.produitsCatalogue : [];
      return (d.personas as Array<Record<string, unknown>>).slice(0, 3).map((p, i) => ({
        personaName: p.name ?? `Persona ${i + 1}`,
        productNames: produits.slice(0, 2).map((pr: any) => pr.nom ?? "Produit"),
        devotionLevel: p.devotionPotential ?? "SPECTATEUR",
      }));
    }
  }

  if (pillarKey === "r") {
    if (path === "pillarGaps") {
      // Derive from maturity assessment of ADVE
      const gaps: Record<string, { score: number; gaps: string[] }> = {};
      for (const k of ["a", "d", "v", "e"]) {
        const content = allPillars[k] ?? {};
        const filled = Object.entries(content).filter(([, v]) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0)).length;
        const total = Math.max(Object.keys(content).length, 1);
        gaps[k] = { score: Math.round((filled / total) * 100), gaps: [] };
      }
      return gaps;
    }
  }

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

  // Parse with robust extractor (Chantier 10)
  try {
    const { extractJSON } = await import("@/server/services/utils/llm");
    return extractJSON(text) as Record<string, unknown>;
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

// ── Source Extraction (Step 0 — BrandDataSource) ───────────────────────

/**
 * Extract field values from BrandDataSource for a specific pillar.
 *
 * Priority chain:
 *   1. extractedFields (structured data already parsed by ingestion pipeline)
 *   2. rawData (JSON-structured raw input)
 *   3. rawContent + LLM extraction (text content → targeted field extraction via Mestor)
 *
 * Returns: { fieldPath: extractedValue } for each field that was found in sources.
 */
async function extractFromSources(
  strategyId: string,
  pillarKey: string,
  missingPaths: string[],
): Promise<Record<string, unknown>> {
  if (missingPaths.length === 0) return {};

  // Load all processed sources for this strategy
  const sources = await db.brandDataSource.findMany({
    where: {
      strategyId,
      processingStatus: { in: ["EXTRACTED", "PROCESSED"] },
    },
    select: {
      extractedFields: true,
      rawData: true,
      rawContent: true,
      pillarMapping: true,
      sourceType: true,
    },
  });

  if (sources.length === 0) return {};

  const extracted: Record<string, unknown> = {};

  // ── Step 0a: Check extractedFields (structured, highest confidence) ──
  for (const source of sources) {
    const fields = (source.extractedFields ?? {}) as Record<string, unknown>;
    const mapping = (source.pillarMapping ?? {}) as Record<string, boolean>;

    // Only use sources mapped to this pillar (or unmapped sources)
    if (Object.keys(mapping).length > 0 && !mapping[pillarKey]) continue;

    for (const path of missingPaths) {
      if (extracted[path] !== undefined) continue; // Already found

      // Direct field match
      if (fields[path] !== undefined && fields[path] !== null && fields[path] !== "") {
        extracted[path] = fields[path];
        continue;
      }

      // Try nested path (e.g., "unitEconomics.cac" → fields.unitEconomics?.cac)
      const value = resolveNestedPath(fields, path);
      if (value !== undefined && value !== null && value !== "") {
        extracted[path] = value;
      }
    }
  }

  // ── Step 0b: Check rawData (JSON, medium confidence) ─────────────────
  for (const source of sources) {
    const raw = (source.rawData ?? {}) as Record<string, unknown>;
    if (Object.keys(raw).length === 0) continue;

    for (const path of missingPaths) {
      if (extracted[path] !== undefined) continue;

      const value = resolveNestedPath(raw, path);
      if (value !== undefined && value !== null && value !== "") {
        extracted[path] = value;
      }
    }
  }

  // ── Step 0c: If rawContent exists and many fields still missing, ──────
  //    use Mestor (LLM) to extract specific fields from the text.
  //    This is a targeted extraction, not a full regeneration.
  const stillMissing = missingPaths.filter(p => extracted[p] === undefined);
  if (stillMissing.length > 3) {
    // Gather all rawContent
    const allText = sources
      .map(s => s.rawContent)
      .filter(Boolean)
      .join("\n\n---\n\n");

    if (allText.length > 50) {
      try {
        const { callLLMAndParse } = await import("@/server/services/utils/llm");
        const aiExtracted = await callLLMAndParse({
          system: `Tu es un extracteur de données. On te donne du texte brut sur une marque et une liste de champs à remplir. Extrais UNIQUEMENT les informations présentes dans le texte. Si une information n'est pas dans le texte, ne l'invente pas — omets-la. Retourne un JSON avec les champs trouvés.`,
          prompt: `Texte source:\n${allText.slice(0, 8000)}\n\nChamps à extraire pour le pilier ${pillarKey.toUpperCase()}:\n${stillMissing.map(p => `- ${p}`).join("\n")}\n\nRetourne UNIQUEMENT les champs que tu TROUVES dans le texte.`,
          maxTokens: 3000,
          strategyId,
          caller: `source-extraction:${pillarKey}`,
        });

        for (const path of stillMissing) {
          if (aiExtracted[path] !== undefined && aiExtracted[path] !== null) {
            extracted[path] = aiExtracted[path];
          }
        }
      } catch {
        // Non-fatal — continue without source extraction
      }
    }
  }

  return extracted;
}

function resolveNestedPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}
