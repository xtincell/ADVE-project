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
import { getFormatInstructions } from "@/lib/types/variable-bible";

// ─── Main API ───────────────────────────────────────────────────────────────

/**
 * Fill missing fields to advance a pillar toward a target maturity stage.
 * Returns a detailed report of what was filled, what failed, and the new stage.
 *
 * Boucle interne (max 3 passes) : tant qu'il reste des champs `derivable`
 * non satisfaits, on relance l'AI avec le contenu mis à jour. Garantit que
 * l'opérateur n'a pas à re-cliquer "Enrichir" 3 fois pour atteindre 100%.
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

  const aggregateFilled: string[] = [];
  const aggregateFailed: Array<{ path: string; reason: string }> = [];
  const aggregateNeedsHuman = new Set<string>();
  const MAX_PASSES = 3;

  for (let pass = 1; pass <= MAX_PASSES; pass++) {
    const passResult = await runFillPass(strategyId, key, content, targetStage, contract);
    for (const p of passResult.filled) if (!aggregateFilled.includes(p)) aggregateFilled.push(p);
    for (const f of passResult.failed) {
      // Only keep latest failure reason per path
      const existing = aggregateFailed.findIndex(x => x.path === f.path);
      if (existing >= 0) aggregateFailed[existing] = f; else aggregateFailed.push(f);
    }
    for (const h of passResult.needsHuman) aggregateNeedsHuman.add(h);

    // Stop early if nothing left derivable
    const after = assessPillar(key, content, contract);
    if (after.derivable.length === 0) break;
    // Stop if this pass didn't fill anything new (avoid infinite retries)
    if (passResult.filled.length === 0) break;
  }

  // Persist + clean up dot-notation artefacts ONCE at the end
  for (const k of Object.keys(content)) {
    if (k.includes(".")) delete content[k];
  }

  if (aggregateFilled.length > 0) {
    const { writePillarAndScore } = await import("@/server/services/pillar-gateway");
    await writePillarAndScore({
      strategyId,
      pillarKey: key as import("@/lib/types/advertis-vector").PillarKey,
      operation: { type: "REPLACE_FULL", content },
      author: { system: "AUTO_FILLER", reason: `fillToStage(${targetStage}) — ${aggregateFilled.length} fields filled across ${MAX_PASSES} max passes` },
      options: { confidenceDelta: 0.03 * aggregateFilled.length },
    });
  }

  // Re-assess
  const after = assessPillar(key, content, contract);
  // After all passes, anything still missing AND non-derivable goes to needsHuman
  for (const path of after.needsHuman) aggregateNeedsHuman.add(path);

  // Drop fields from `failed` that ended up filled in a later pass
  const finalFailed = aggregateFailed.filter(f => !aggregateFilled.includes(f.path) && !after.satisfied.includes(f.path));

  return {
    pillarKey: key,
    targetStage,
    filled: aggregateFilled,
    failed: finalFailed,
    needsHuman: Array.from(aggregateNeedsHuman),
    newStage: after.currentStage as MaturityStage ?? "EMPTY",
    durationMs: Date.now() - start,
  };
}

/**
 * Single pass: try to fill all missing derivable fields once. Mutates `content`
 * in place. Caller decides whether to retry. NO DB write here — the caller
 * persists once after all passes converge.
 */
async function runFillPass(
  strategyId: string,
  key: string,
  content: Record<string, unknown>,
  targetStage: MaturityStage,
  contract: import("@/lib/types/pillar-maturity").PillarMaturityContract,
): Promise<{ filled: string[]; failed: Array<{ path: string; reason: string }>; needsHuman: string[] }> {
  // Assess current state
  const before = assessPillar(key, content, contract);

  // Get target requirements
  const targetReqs = contract.stages[targetStage];
  const missingReqs = targetReqs.filter(r => before.missing.includes(r.path));

  if (missingReqs.length === 0) {
    return { filled: [], failed: [], needsHuman: [] };
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
      const value = await deriveByCalculation(req.path, content, pillarMap);
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

  // ── 4. Post-validation: reject BLOCK-level financial incoherences ──────
  if (key === "v" && content.unitEconomics) {
    try {
      const { validateFinancials } = await import("@/server/services/financial-brain");
      const ue = content.unitEconomics as Record<string, unknown>;
      const a = pillarMap.a ?? {};
      const report = validateFinancials({
        actorType: "ADVERTISER",
        sector: a.secteur as string,
        country: a.pays as string,
        cac: ue.cac as number | undefined,
        ltv: ue.ltv as number | undefined,
        ltvCacRatio: ue.ltvCacRatio as number | undefined,
        budgetCom: ue.budgetCom as number | undefined,
        caVise: ue.caVise as number | undefined,
        margeNette: ue.margeNette as number | undefined,
        roiEstime: ue.roiEstime as number | undefined,
        paybackPeriod: ue.paybackPeriod as number | undefined,
      });
      if (report.blockers.length > 0) {
        console.warn(`[auto-filler] Financial validation BLOCKED for ${strategyId}/${key}:`,
          report.blockers.map(b => `${b.ruleId}: ${b.message}`));
        // Remove the invalid financial values — they'll need human input
        for (const blocker of report.blockers) {
          const fieldPath = `unitEconomics.${blocker.field}`;
          if (filled.includes(fieldPath)) {
            filled.splice(filled.indexOf(fieldPath), 1);
            failed.push({ path: fieldPath, reason: `Validation BLOCK: ${blocker.message}` });
          }
        }
      }
    } catch { /* financial-brain not available — skip validation */ }
  }

  return { filled, failed, needsHuman };
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

async function deriveByCalculation(
  path: string,
  content: Record<string, unknown>,
  _allPillars: Record<string, Record<string, unknown>>,
): Promise<unknown> {
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

  // ── Pillar V: Deterministic unit economics via Financial Brain ─────────
  // These calculations replace LLM generation for financial fields.
  // Context: sector/country/positioning from pillar A/D, benchmarks from financial-brain.
  if (path.startsWith("unitEconomics.")) {
    const a = _allPillars.a ?? {};
    const d = _allPillars.d ?? {};
    const sector = (a.secteur as string ?? "SERVICES").toUpperCase();
    const country = a.pays as string ?? "Cameroun";
    const positioning = (d.positionnement as string ?? "MAINSTREAM").toUpperCase();
    const businessModel = (a.businessModel as string ?? "B2C").toUpperCase();
    const ue = (content.unitEconomics ?? {}) as Record<string, unknown>;

    // Lazy-import to avoid circular deps and keep zero-cost when not needed
    const fb = await import("@/server/services/financial-brain");

    const COUNTRY_MULT: Record<string, number> = {
      Cameroun: 1.0, "Cote d'Ivoire": 1.05, Senegal: 0.95, RDC: 0.6, Gabon: 2.0,
      "Afrique du Sud": 3.0,
      Congo: 1.1, Nigeria: 0.8, Ghana: 0.9, France: 8.0, USA: 10.0, Maroc: 1.5, Tunisie: 1.3,
    };
    const BIZ_MODEL_CAC: Record<string, number> = { B2C: 1.0, B2B: 2.5, B2B2C: 1.8, D2C: 0.7, MARKETPLACE: 0.5 };
    const POS_MULT: Record<string, number> = { ULTRA_LUXE: 10.0, LUXE: 5.0, PREMIUM: 2.5, MASSTIGE: 1.5, MAINSTREAM: 1.0, VALUE: 0.6, LOW_COST: 0.3 };
    const cm = COUNTRY_MULT[country] ?? 1.0;
    const bm = BIZ_MODEL_CAC[businessModel] ?? 1.0;
    const pm = POS_MULT[positioning] ?? 1.0;

    // Sector benchmarks (mid-range)
    const SECTORS: Record<string, { cacMid: number; ltvMid: number; grossMargin: number; revMid: number }> = {
      FMCG: { cacMid: 2750, ltvMid: 82500, grossMargin: 0.35, revMid: 275_000_000 },
      TECH: { cacMid: 55000, ltvMid: 2550000, grossMargin: 0.65, revMid: 510_000_000 },
      SERVICES: { cacMid: 110000, ltvMid: 5250000, grossMargin: 0.55, revMid: 165_000_000 },
      RETAIL: { cacMid: 11000, ltvMid: 275000, grossMargin: 0.40, revMid: 110_000_000 },
      HOSPITALITY: { cacMid: 27500, ltvMid: 1050000, grossMargin: 0.45, revMid: 275_000_000 },
      EDUCATION: { cacMid: 55000, ltvMid: 2600000, grossMargin: 0.50, revMid: 105_000_000 },
      BANQUE: { cacMid: 275000, ltvMid: 10250000, grossMargin: 0.60, revMid: 5_250_000_000 },
      MODE: { cacMid: 27500, ltvMid: 525000, grossMargin: 0.55, revMid: 255_000_000 },
      GAMING: { cacMid: 15500, ltvMid: 255000, grossMargin: 0.70, revMid: 502_500_000 },
      STARTUP: { cacMid: 52500, ltvMid: 1025000, grossMargin: 0.60, revMid: 102_500_000 },
    };
    const sd = SECTORS[sector] ?? SECTORS.SERVICES!;

    if (path === "unitEconomics.ltvCacRatio") {
      if (ue?.ltv && ue?.cac && typeof ue.ltv === "number" && typeof ue.cac === "number" && ue.cac > 0) {
        return Math.round((ue.ltv / ue.cac) * 100) / 100;
      }
      return undefined;
    }
    if (path === "unitEconomics.cac") {
      return Math.round(sd.cacMid * cm * bm);
    }
    if (path === "unitEconomics.ltv") {
      return Math.round(sd.ltvMid * cm * pm);
    }
    if (path === "unitEconomics.caVise") {
      return Math.round(sd.revMid * cm * pm);
    }
    if (path === "unitEconomics.budgetCom") {
      const caVise = typeof ue.caVise === "number" ? ue.caVise : Math.round(sd.revMid * cm * pm);
      const reco = await fb.recommendBudget({
        sector, country, positioning, businessModel,
        estimatedRevenue: caVise,
      });
      return reco.recommended;
    }
    if (path === "unitEconomics.margeNette") {
      return Math.round(sd.grossMargin * 0.65 * 100) / 100;
    }
    if (path === "unitEconomics.roiEstime") {
      const cac = typeof ue.cac === "number" ? ue.cac : Math.round(sd.cacMid * cm * bm);
      const ltv = typeof ue.ltv === "number" ? ue.ltv : Math.round(sd.ltvMid * cm * pm);
      return cac > 0 ? Math.round(((ltv - cac) / cac) * 100) : 0;
    }
    if (path === "unitEconomics.paybackPeriod") {
      const cac = typeof ue.cac === "number" ? ue.cac : Math.round(sd.cacMid * cm * bm);
      const margin = sd.grossMargin * 0.65;
      const monthlyRev = typeof ue.caVise === "number" ? ue.caVise / 12 / 100 : sd.revMid * cm / 12 / 100;
      return monthlyRev > 0 && margin > 0 ? Math.min(36, Math.round(cac / (monthlyRev * margin))) : 24;
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
    // ADR-0030 Axe 2 — fallback citationFondatrice via mission/vision/origin
    // si l'utilisateur a sauté la Q a_citation (optional). Concatène les bouts
    // les plus narratifs disponibles. Approximatif mais utile pour franchir le
    // gate INTAKE quand l'opérateur a fourni vision/mission mais pas citation.
    if (path === "citationFondatrice" && !a.citationFondatrice) {
      const candidate =
        (typeof a.mission === "string" && a.mission.length >= 5 ? a.mission : null) ??
        (typeof a.vision === "string" && a.vision.length >= 5 ? a.vision : null) ??
        (typeof a.origin === "string" && a.origin.length >= 5 ? a.origin : null);
      if (candidate) return String(candidate).slice(0, 200);
    }
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

  // Surface the validator + arg so the LLM produces the *shape* the
  // assessor expects, not just the right semantic. Without this hint Claude
  // tends to invent a natural shape (e.g. an `enemy` description string)
  // that fails an `is_object` contract, looping forever.
  function shapeHint(r: FieldRequirement): string {
    switch (r.validator) {
      case "is_object":
        return "OBJECT — JSON object with named fields (NOT a plain string)";
      case "is_number":
        return "NUMBER — finite numeric value";
      case "non_empty":
        return "non-empty string OR non-empty array";
      case "min_length":
        return `STRING of at least ${r.validatorArg ?? 10} characters (paragraph, NOT an object)`;
      case "min_items":
        return `ARRAY with at least ${r.validatorArg ?? 1} ITEM(S) — each item should be an object with named fields`;
      case "nested_complete":
        return "OBJECT where every leaf has a non-empty value";
      default:
        return r.validator;
    }
  }
  // Build per-field JSON examples extracted from the Zod schema — gives the
  // LLM the EXACT sub-keys to use instead of inventing aliases (the root
  // cause of {good,love,paid,skill} for ikigai, etc.). Capped at 1.5kB per
  // field to keep the prompt manageable.
  const { buildExampleForPath } = await import("@/lib/types/pillar-maturity-contracts");
  function fieldExampleBlock(r: FieldRequirement): string {
    try {
      const ex = buildExampleForPath(pillarKey, r.path);
      if (ex == null) return "";
      const json = JSON.stringify(ex, null, 2);
      const trimmed = json.length > 1500 ? json.slice(0, 1500) + "\n  // ...truncated" : json;
      return `\n  SHAPE EXACTE attendue (sous-clés OBLIGATOIRES — n'utilise PAS d'autres noms) :\n  ${trimmed.split("\n").join("\n  ")}`;
    } catch {
      return "";
    }
  }
  const fieldList = missingReqs.map(r => `- ${r.path} [${shapeHint(r)}]: ${r.description ?? ""}${fieldExampleBlock(r)}`).join("\n\n");
  // Token budget — Sonnet 4.5 caps at 200k input; once Oracle enrichment
  // has written back nested SuperAsset payloads into pillars, raw
  // JSON.stringify of all 8 pillars routinely overflows. Per-pillar cap
  // (~6 000 chars ≈ 1 500 tokens) keeps the total prompt well under 50k
  // tokens regardless of how rich the pillars have become. Truncated
  // pillars get a marker so the LLM knows the context is partial.
  const PILLAR_CHAR_BUDGET = 6_000;
  function summarizePillar(content: Record<string, unknown>): string {
    const json = JSON.stringify(content, null, 2);
    if (json.length <= PILLAR_CHAR_BUDGET) return json;
    // Keep top-level keys with brief summaries instead of full subtrees.
    const summary: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(content)) {
      if (v === null || v === undefined) continue;
      if (typeof v === "string") {
        summary[k] = v.length > 240 ? v.slice(0, 240) + "…" : v;
      } else if (Array.isArray(v)) {
        summary[k] = `[Array×${v.length}]`;
      } else if (typeof v === "object") {
        const keys = Object.keys(v as object);
        summary[k] = `{${keys.slice(0, 6).join(", ")}${keys.length > 6 ? "…" : ""}}`;
      } else {
        summary[k] = v;
      }
    }
    const summaryJson = JSON.stringify(summary, null, 2);
    return summaryJson.length <= PILLAR_CHAR_BUDGET
      ? `${summaryJson}\n[…contenu condensé : ${(json.length / 1000).toFixed(0)}k chars de détails omis…]`
      : summaryJson.slice(0, PILLAR_CHAR_BUDGET) + "\n[…tronqué…]";
  }
  const context = Object.entries(allPillars)
    .filter(([, v]) => v && Object.keys(v).length > 0)
    .map(([k, v]) => `[PILIER ${k.toUpperCase()}]\n${summarizePillar(v)}`)
    .join("\n\n");

  // Inject financial benchmarks when generating financial fields
  let financialCtx = "";
  const hasFinancialFields = missingReqs.some(r => r.path.startsWith("unitEconomics"));
  if (hasFinancialFields) {
    try {
      const { getFinancialContext } = await import("@/server/services/financial-engine");
      const a = allPillars.a ?? {};
      const d = allPillars.d ?? {};
      financialCtx = "\n\n" + (await getFinancialContext(
        a.secteur as string, a.pays as string,
        d.positionnement as string, a.businessModel as string,
      ));
    } catch { /* financial-engine not available — proceed without */ }
  }

  const prompt = `Tu es Mestor, l'intelligence strategique de marque.

Voici les 8 piliers actuels de la strategie:
${context}${financialCtx}

Le pilier ${pillarKey.toUpperCase()} a besoin des champs suivants (manquants):
${fieldList}

CONSIGNES STRICTES:
1. Tu DOIS générer une valeur pour CHACUN des ${missingReqs.length} champs ci-dessus. Aucune omission tolérée — l'opérateur a explicitement demandé une auto-complétion exhaustive.
2. Le JSON doit être un objet plat où les clés sont EXACTEMENT les paths listés (ex: "${missingReqs[0]?.path ?? "exemple"}", "${missingReqs[Math.min(1, missingReqs.length - 1)]?.path ?? "autre"}", …).
3. Respecte STRICTEMENT le shape annoncé entre crochets [SHAPE] pour chaque path :
   - "OBJECT" → JSON object avec sous-clés nommées (PAS une string).
   - "ARRAY ≥N items" → tableau de N+ entrées (chaque entrée = objet avec sous-clés nommées).
   - "STRING ≥N chars" → string ≥N caractères, PAS un objet ni un tableau.
   - "NUMBER" → number fini (pas string).
4. Base-toi sur le contenu existant des autres piliers. Sois SPÉCIFIQUE à cette marque, jamais générique.
5. Si tu n'es vraiment pas sûr d'un champ, propose la meilleure inférence possible — un placeholder narratif vaut mieux qu'une omission.
${hasFinancialFields ? "6. Pour les champs financiers, utilise les RÉFÉRENCES FINANCIÈRES ci-dessus. Ne mets PAS 0. Estime à partir des benchmarks sectoriels.\n" : ""}
Retourne UNIQUEMENT le JSON, rien d'autre. Pas de markdown, pas de commentaire.`;

  const { text, usage } = await generateText({
    model: anthropic("claude-sonnet-4-5"),
    prompt,
    maxOutputTokens: 6000,
  });

  // Track cost
  await db.aICostLog.create({
    data: {
      strategyId,
      provider: "anthropic",
      model: "claude-sonnet-4-5",
      inputTokens: usage?.inputTokens ?? 0,
      outputTokens: usage?.outputTokens ?? 0,
      cost: ((usage?.inputTokens ?? 0) * 0.003 + (usage?.outputTokens ?? 0) * 0.015) / 1000,
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
        const bibleInstructions = getFormatInstructions(pillarKey, stillMissing);
        const aiExtracted = await callLLMAndParse({
          system: `Tu es un extracteur de données. On te donne du texte brut sur une marque et une liste de champs à remplir. Extrais UNIQUEMENT les informations présentes dans le texte. Si une information n'est pas dans le texte, ne l'invente pas — omets-la. Retourne un JSON avec les champs trouvés. RESPECTE les formats de la Bible de Variables pour chaque champ.`,
          prompt: `Texte source:\n${allText.slice(0, 8000)}\n\nChamps à extraire pour le pilier ${pillarKey.toUpperCase()}:\n${stillMissing.map(p => `- ${p}`).join("\n")}\n\nBIBLE DE FORMAT:\n${bibleInstructions}\n\nRetourne UNIQUEMENT les champs que tu TROUVES dans le texte. Respecte les regles de format de la Bible.`,
          maxOutputTokens: 3000,
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
