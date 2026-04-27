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
      const reco = fb.recommendBudget({
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

  // Inject financial benchmarks when generating financial fields
  let financialCtx = "";
  const hasFinancialFields = missingReqs.some(r => r.path.startsWith("unitEconomics"));
  if (hasFinancialFields) {
    try {
      const { getFinancialContext } = await import("@/server/services/financial-engine");
      const a = allPillars.a ?? {};
      const d = allPillars.d ?? {};
      financialCtx = "\n\n" + getFinancialContext(
        a.secteur as string, a.pays as string,
        d.positionnement as string, a.businessModel as string,
      );
    } catch { /* financial-engine not available — proceed without */ }
  }

  const prompt = `Tu es Mestor, l'intelligence strategique de marque.

Voici les 8 piliers actuels de la strategie:
${context}${financialCtx}

Le pilier ${pillarKey.toUpperCase()} a besoin des champs suivants (manquants):
${fieldList}

Genere UNIQUEMENT les champs manquants listes ci-dessus en JSON.
Le JSON doit etre un objet plat ou les cles sont les paths des champs.
Pour les paths imbriques (ex: "fenetreOverton"), genere l'objet complet.
Pour les arrays, genere le tableau complet avec les items requis.
Base-toi sur les donnees existantes des autres piliers. Sois specifique a cette marque.
${hasFinancialFields ? "\nPour les champs financiers, utilise les REFERENCES FINANCIERES ci-dessus. Ne mets PAS 0. Estime a partir des benchmarks sectoriels.\n" : ""}
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
        const bibleInstructions = getFormatInstructions(pillarKey, stillMissing);
        const aiExtracted = await callLLMAndParse({
          system: `Tu es un extracteur de données. On te donne du texte brut sur une marque et une liste de champs à remplir. Extrais UNIQUEMENT les informations présentes dans le texte. Si une information n'est pas dans le texte, ne l'invente pas — omets-la. Retourne un JSON avec les champs trouvés. RESPECTE les formats de la Bible de Variables pour chaque champ.`,
          prompt: `Texte source:\n${allText.slice(0, 8000)}\n\nChamps à extraire pour le pilier ${pillarKey.toUpperCase()}:\n${stillMissing.map(p => `- ${p}`).join("\n")}\n\nBIBLE DE FORMAT:\n${bibleInstructions}\n\nRetourne UNIQUEMENT les champs que tu TROUVES dans le texte. Respecte les regles de format de la Bible.`,
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
