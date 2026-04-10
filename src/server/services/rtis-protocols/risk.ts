/**
 * PROTOCOLE RISK (R) — Agent spécialisé de l'essaim MESTOR
 *
 * Input  : Piliers A, D, V, E (atomiques uniquement)
 * Output : Pilier R complet (PillarRSchema)
 * Nature : DIAGNOSTIC — regarde l'intérieur, analyse les failles
 *
 * Logique hybride :
 *   1. Scan déterministe des vulnérabilités ADVE (CALC — zéro LLM)
 *   2. Enrichissement SWOT (MESTOR_ASSIST — Commandant fournit le jugement)
 *   3. Scoring riskScore (CALC — formule pure)
 *
 * Cascade ADVERTIS : R puise dans A + D + V + E
 */

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { PillarKey } from "@/lib/types/advertis-vector";
import { assessPillar } from "@/server/services/pillar-maturity/assessor";
import { getContract } from "@/server/services/pillar-maturity/contracts-loader";

// ── Types ──────────────────────────────────────────────────────────────

interface VulnerabilityFlag {
  pillar: string;
  field: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  reason: string;
}

interface PillarGap {
  score: number;
  gaps: string[];
}

interface CoherenceRisk {
  pillar1: string;
  pillar2: string;
  field1: string;
  field2: string;
  contradiction: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
}

interface OvertonBlocker {
  risk: string;
  blockingPerception: string;
  mitigation: string;
  devotionLevelBlocked?: string;
}

export interface ProtocoleRiskResult {
  pillarKey: "r";
  content: Record<string, unknown>;
  confidence: number;
  flags: VulnerabilityFlag[];
  error?: string;
}

// ── Step 1 : Scan déterministe des vulnérabilités ADVE (CALC) ─────────

function scanVulnerabilities(
  pillars: Record<string, Record<string, unknown> | null>,
): VulnerabilityFlag[] {
  const flags: VulnerabilityFlag[] = [];
  const a = pillars.a ?? {};
  const d = pillars.d ?? {};
  const v = pillars.v ?? {};
  const e = pillars.e ?? {};

  // A — Vulnérabilités identitaires
  if (!a.nomMarque) flags.push({ pillar: "a", field: "nomMarque", severity: "CRITICAL", reason: "Pas de nom de marque défini" });
  if (!a.archetype) flags.push({ pillar: "a", field: "archetype", severity: "HIGH", reason: "Archétype manquant — identité floue" });
  if (!a.noyauIdentitaire || (typeof a.noyauIdentitaire === "string" && a.noyauIdentitaire.length < 50))
    flags.push({ pillar: "a", field: "noyauIdentitaire", severity: "HIGH", reason: "Noyau identitaire vague ou trop court" });
  if (!a.prophecy) flags.push({ pillar: "a", field: "prophecy", severity: "MEDIUM", reason: "Pas de prophétie — vision de la marque non formalisée" });
  if (!a.enemy) flags.push({ pillar: "a", field: "enemy", severity: "MEDIUM", reason: "Pas d'ennemi identifié — différenciation affaiblie" });
  if (!a.valeurs || (Array.isArray(a.valeurs) && a.valeurs.length < 3))
    flags.push({ pillar: "a", field: "valeurs", severity: "MEDIUM", reason: "Moins de 3 valeurs — fondation insuffisante" });

  // D — Vulnérabilités de différenciation
  if (!d.positionnement) flags.push({ pillar: "d", field: "positionnement", severity: "HIGH", reason: "Positionnement non défini" });
  if (!d.personas || (Array.isArray(d.personas) && d.personas.length < 2))
    flags.push({ pillar: "d", field: "personas", severity: "HIGH", reason: "Moins de 2 personas — cible mal définie" });
  if (!d.paysageConcurrentiel || (Array.isArray(d.paysageConcurrentiel) && d.paysageConcurrentiel.length === 0))
    flags.push({ pillar: "d", field: "paysageConcurrentiel", severity: "HIGH", reason: "Pas de concurrents identifiés — positionnement dans le vide" });
  if (!d.tonDeVoix) flags.push({ pillar: "d", field: "tonDeVoix", severity: "MEDIUM", reason: "Ton de voix non défini" });

  // V — Vulnérabilités financières
  if (!v.produitsCatalogue || (Array.isArray(v.produitsCatalogue) && v.produitsCatalogue.length === 0))
    flags.push({ pillar: "v", field: "produitsCatalogue", severity: "CRITICAL", reason: "Aucun produit/service dans le catalogue" });
  const ue = (v.unitEconomics ?? {}) as Record<string, unknown>;
  if (!ue.cac && !ue.ltv) flags.push({ pillar: "v", field: "unitEconomics", severity: "HIGH", reason: "Pas de CAC ni LTV — viabilité financière inconnue" });
  if (typeof ue.ltv === "number" && typeof ue.cac === "number" && ue.cac > 0 && (ue.ltv as number) / (ue.cac as number) < 3)
    flags.push({ pillar: "v", field: "unitEconomics.ltvCacRatio", severity: "HIGH", reason: `LTV/CAC ratio < 3 (${((ue.ltv as number) / (ue.cac as number)).toFixed(1)}) — acquisition non rentable` });

  // E — Vulnérabilités d'engagement
  if (!e.touchpoints || (Array.isArray(e.touchpoints) && e.touchpoints.length < 3))
    flags.push({ pillar: "e", field: "touchpoints", severity: "MEDIUM", reason: "Moins de 3 touchpoints — engagement limité" });
  if (!e.rituels || (Array.isArray(e.rituels) && e.rituels.length === 0))
    flags.push({ pillar: "e", field: "rituels", severity: "MEDIUM", reason: "Aucun rituel de marque — pas de mécanisme de fidélisation" });
  if (!e.superfanPortrait) flags.push({ pillar: "e", field: "superfanPortrait", severity: "MEDIUM", reason: "Pas de portrait superfan — cible de conversion non définie" });

  return flags;
}

// ── Step 1b : Diagnostic par pilier ADVE (CALC) ───────────────────────

function assessPillarGaps(
  pillars: Record<string, Record<string, unknown> | null>,
): Record<string, PillarGap> {
  const result: Record<string, PillarGap> = {};

  for (const key of ["a", "d", "v", "e"] as const) {
    const content = pillars[key];
    const contract = getContract(key);
    if (!content || !contract) {
      result[key] = { score: 0, gaps: ["Pilier vide"] };
      continue;
    }
    const assessment = assessPillar(key, content, contract);
    result[key] = {
      score: assessment.completionPct,
      gaps: assessment.missing,
    };
  }

  return result;
}

// ── Step 1c : Détection de contradictions cross-pilier (CALC) ─────────

function detectCoherenceRisks(
  pillars: Record<string, Record<string, unknown> | null>,
): CoherenceRisk[] {
  const risks: CoherenceRisk[] = [];
  const a = pillars.a ?? {};
  const d = pillars.d ?? {};
  const v = pillars.v ?? {};
  const e = pillars.e ?? {};

  // A vs D : archétype vs ton de voix
  if (a.archetype && d.tonDeVoix) {
    const ton = d.tonDeVoix as Record<string, unknown>;
    const personnalite = (ton.personnalite ?? []) as string[];
    // Héros devrait avoir un ton audacieux, pas timide
    if (a.archetype === "INNOCENT" && personnalite.some(p => p.toLowerCase().includes("provocat")))
      risks.push({ pillar1: "a", pillar2: "d", field1: "archetype", field2: "tonDeVoix.personnalite", contradiction: "Archétype INNOCENT mais ton provocateur", severity: "HIGH" });
    if (a.archetype === "REBELLE" && personnalite.some(p => p.toLowerCase().includes("doux") || p.toLowerCase().includes("sage")))
      risks.push({ pillar1: "a", pillar2: "d", field1: "archetype", field2: "tonDeVoix.personnalite", contradiction: "Archétype REBELLE mais ton doux/sage", severity: "MEDIUM" });
  }

  // D vs V : positionnement vs pricing
  if (d.positionnement && v.positioningArchetype) {
    const pos = (typeof d.positionnement === "string" ? d.positionnement : "").toLowerCase();
    const arch = v.positioningArchetype as string;
    if ((pos.includes("premium") || pos.includes("luxe")) && (arch === "LOW_COST" || arch === "VALUE"))
      risks.push({ pillar1: "d", pillar2: "v", field1: "positionnement", field2: "positioningArchetype", contradiction: "Positionnement premium/luxe mais pricing low-cost/value", severity: "HIGH" });
    if (pos.includes("accessible") && (arch === "ULTRA_LUXE" || arch === "LUXE"))
      risks.push({ pillar1: "d", pillar2: "v", field1: "positionnement", field2: "positioningArchetype", contradiction: "Positionnement accessible mais pricing ultra-luxe", severity: "HIGH" });
  }

  // V vs E : sales channel vs touchpoints
  if (v.salesChannel === "DIRECT" && Array.isArray(e.touchpoints)) {
    const hasRetail = (e.touchpoints as Record<string, unknown>[]).some(
      t => (t.type as string)?.includes("PHYSICAL") || (t.canal as string)?.toLowerCase().includes("magasin")
    );
    if (hasRetail)
      risks.push({ pillar1: "v", pillar2: "e", field1: "salesChannel", field2: "touchpoints", contradiction: "Sales channel DIRECT mais touchpoints incluent des points de vente physiques tiers", severity: "LOW" });
  }

  return risks;
}

// ── Step 2 : Enrichissement SWOT (MESTOR_ASSIST) ──────────────────────

async function generateSWOT(
  pillars: Record<string, Record<string, unknown> | null>,
  flags: VulnerabilityFlag[],
  strategyId: string,
): Promise<{ globalSwot: Record<string, unknown>; probabilityImpactMatrix: unknown[]; mitigationPriorities: unknown[]; overtonBlockers: OvertonBlocker[] }> {
  const { anthropic } = await import("@ai-sdk/anthropic");
  const { generateText } = await import("ai");

  const adveContext = ["a", "d", "v", "e"]
    .map(k => {
      const c = pillars[k];
      if (!c || Object.keys(c).length === 0) return `[PILIER ${k.toUpperCase()}] Vide`;
      return `[PILIER ${k.toUpperCase()}]\n${JSON.stringify(c, null, 2)}`;
    })
    .join("\n\n");

  const flagsSummary = flags.length > 0
    ? `\n\nVULNÉRABILITÉS DÉTECTÉES (scan automatique):\n${flags.map(f => `- [${f.severity}] ${f.pillar.toUpperCase()}.${f.field}: ${f.reason}`).join("\n")}`
    : "\n\nAucune vulnérabilité critique détectée par le scan automatique.";

  const { text, usage } = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: `Tu es le Protocole Risk de l'essaim MESTOR. Tu analyses les piliers ADVE d'une marque pour identifier les risques stratégiques.
Tu reçois les données ADVE + un scan automatique de vulnérabilités. Tu dois :
1. Produire un SWOT global (3-5 items par quadrant, basé sur les DONNÉES RÉELLES pas des généralités)
2. Construire une matrice probabilité×impact (5+ risques, chacun avec mitigation)
3. Lister les priorités de mitigation (5+ actions concrètes)
4. Identifier les overtonBlockers : quels risques BLOQUENT le déplacement de la Fenêtre d'Overton vers le superfan ?
Retourne UNIQUEMENT du JSON valide.`,
    prompt: `Données ADVE de la stratégie:

${adveContext}
${flagsSummary}

Produis le pilier R en JSON avec les champs :
{
  "globalSwot": { "strengths": [], "weaknesses": [], "opportunities": [], "threats": [] },
  "probabilityImpactMatrix": [{ "risk": "", "probability": "LOW|MEDIUM|HIGH", "impact": "LOW|MEDIUM|HIGH", "mitigation": "" }],
  "mitigationPriorities": [{ "action": "", "owner": "", "timeline": "", "investment": "" }],
  "overtonBlockers": [{ "risk": "", "blockingPerception": "", "mitigation": "", "devotionLevelBlocked": "" }]
}`,
    maxTokens: 6000,
  });

  // Cost tracking
  await db.aICostLog.create({
    data: {
      strategyId,
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      inputTokens: usage?.promptTokens ?? 0,
      outputTokens: usage?.completionTokens ?? 0,
      cost: ((usage?.promptTokens ?? 0) * 0.003 + (usage?.completionTokens ?? 0) * 0.015) / 1000,
      context: "protocole-risk",
    },
  }).catch(() => {});

  // Parse with robust extractor (Chantier 10)
  try {
    const { extractJSON } = await import("@/server/services/utils/llm");
    return extractJSON(text) as { globalSwot: Record<string, unknown>; probabilityImpactMatrix: unknown[]; mitigationPriorities: unknown[]; overtonBlockers: OvertonBlocker[] };
  } catch {
    return { globalSwot: { strengths: [], weaknesses: [], opportunities: [], threats: [] }, probabilityImpactMatrix: [], mitigationPriorities: [], overtonBlockers: [] };
  }
}

// ── Step 3 : Scoring riskScore (CALC) ─────────────────────────────────

function calculateRiskScore(matrix: unknown[]): number {
  if (!Array.isArray(matrix) || matrix.length === 0) return 50; // Default moyen
  const weights: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };
  let total = 0;
  for (const entry of matrix) {
    const e = entry as Record<string, unknown>;
    total += (weights[e.probability as string] ?? 1) * (weights[e.impact as string] ?? 1);
  }
  return Math.round((total / (matrix.length * 9)) * 100);
}

// ── Public API ────────────────────────────────────────────────────────

/**
 * Exécute le Protocole Risk pour une stratégie.
 * Hybride : scan déterministe + enrichissement MESTOR_ASSIST + score CALC.
 */
export async function executeProtocoleRisk(strategyId: string): Promise<ProtocoleRiskResult> {
  try {
    // Load ADVE pillars
    const dbPillars = await db.pillar.findMany({
      where: { strategyId, key: { in: ["a", "d", "v", "e"] } },
    });
    const pillars: Record<string, Record<string, unknown> | null> = { a: null, d: null, v: null, e: null };
    for (const p of dbPillars) {
      pillars[p.key] = (p.content ?? null) as Record<string, unknown> | null;
    }

    // Step 1: Scan déterministe (CALC — zéro LLM)
    const flags = scanVulnerabilities(pillars);
    const pillarGaps = assessPillarGaps(pillars);
    const coherenceRisks = detectCoherenceRisks(pillars);

    // Step 2: Enrichissement SWOT (MESTOR_ASSIST)
    const swotResult = await generateSWOT(pillars, flags, strategyId);

    // Step 3: Scoring (CALC)
    const riskScore = calculateRiskScore(swotResult.probabilityImpactMatrix);

    // Devotion vulnerabilities from flags
    const devotionVulnerabilities = flags
      .filter(f => f.pillar === "e")
      .map(f => ({
        level: "SPECTATEUR" as const,
        churnCause: f.reason,
        mitigation: `Remplir ${f.field}`,
      }));

    // Assemble R content
    const content: Record<string, unknown> = {
      // Diagnostic ADVE (CALC results)
      pillarGaps,
      coherenceRisks,
      // SWOT (MESTOR_ASSIST results)
      globalSwot: swotResult.globalSwot,
      probabilityImpactMatrix: swotResult.probabilityImpactMatrix,
      mitigationPriorities: swotResult.mitigationPriorities,
      // Overton/Devotion (hybrid)
      overtonBlockers: swotResult.overtonBlockers,
      devotionVulnerabilities,
      // Score (CALC)
      riskScore,
    };

    // Confidence based on data quality
    const adveCompleteness = Object.values(pillarGaps).reduce((s, g) => s + g.score, 0) / 4;
    const confidence = Math.min(0.9, 0.4 + (adveCompleteness / 100) * 0.5);

    return { pillarKey: "r", content, confidence, flags };
  } catch (err) {
    return {
      pillarKey: "r",
      content: {},
      confidence: 0,
      flags: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
