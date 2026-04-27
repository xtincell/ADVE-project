/**
 * RTIS Cascade — Mestor-driven pillar actualization
 *
 * Architecture:
 *   ADVE (données brutes, manuelles ou intake)
 *     → R = analyse(ADVE)            → risques, SWOT, mitigations
 *     → T = analyse(ADVE + R)        → triangulation, validation hypothèses
 *     → R + T → recommandations      → actualisent ADVE ↻ (feedback loop)
 *     → I = produit(ADVE, R, T)      → plan d'implémentation
 *     → S = mise en forme(tout)      → synthèse exécutive
 *
 * Chaque pilier peut être actualisé individuellement via Mestor,
 * ou la cascade complète peut être déclenchée.
 */

import { callLLM } from "@/server/services/llm-gateway";
import { db } from "@/lib/db";
import { PILLAR_SCHEMAS, type PillarKey } from "@/lib/types/pillar-schemas";
import { scoreObject } from "@/server/services/advertis-scorer";
import type { AdvertisVector } from "@/lib/types/advertis-vector";
import { Prisma } from "@prisma/client";
import { runMarketIntelligence } from "@/server/services/market-intelligence";
import { getFormatInstructions } from "@/lib/types/variable-bible";

// ── Helpers ────────────────────────────────────────────────────────────────

async function loadPillars(strategyId: string): Promise<Record<string, unknown>> {
  const pillars = await db.pillar.findMany({ where: { strategyId } });
  const map: Record<string, unknown> = {};
  for (const p of pillars) map[p.key.toUpperCase()] = p.content;
  return map;
}

async function savePillar(strategyId: string, key: string, content: Record<string, unknown>, confidence: number) {
  // Migrated to Pillar Gateway — LOI 1
  const { writePillar } = await import("@/server/services/pillar-gateway");
  await writePillar({
    strategyId,
    pillarKey: key.toLowerCase() as import("@/lib/types/advertis-vector").PillarKey,
    operation: { type: "MERGE_DEEP", patch: content },
    author: { system: "MESTOR", reason: "RTIS cascade — actualizePillar" },
    options: { targetStatus: "AI_PROPOSED", confidenceDelta: confidence * 0.1 },
  });
}

async function recalcScores(strategyId: string) {
  // Chantier 2: unified scorer — scoreObject handles persist + snapshot internally
  return scoreObject("strategy", strategyId);
}

/** Thin wrapper: adapts old positional (system, prompt, strategyId?) signature to gateway */
async function callCascadeLLM(system: string, prompt: string, strategyId?: string): Promise<string> {
  const { text } = await callLLM({
    system,
    prompt,
    caller: "mestor:rtis-cascade",
    strategyId,
    maxTokens: 8000,
  });
  return text;
}

// Re-export robust extractJSON from shared utils (Chantier 10)
import { extractJSON as _extractJSON } from "@/server/services/utils/llm";
function extractJSON(text: string): Record<string, unknown> {
  return _extractJSON(text) as Record<string, unknown>;
}

function serializePillar(key: string, content: unknown): string {
  if (!content || typeof content !== "object") return `[${key}] Vide`;
  return `[PILIER ${key}]\n${JSON.stringify(content, null, 2)}`;
}

/**
 * Extract a human-readable field map from a Zod schema for LLM context.
 * Returns lines like: "prophecy: string | object (optional)"
 */
function describeSchemaFields(key: "A" | "D" | "V" | "E"): string {
  const schema = PILLAR_SCHEMAS[key];
  const shape = schema.shape as Record<string, { _def?: { typeName?: string; innerType?: unknown }; description?: string }>;
  const lines: string[] = [];

  for (const [fieldName, fieldSchema] of Object.entries(shape)) {
    const def = fieldSchema?._def;
    const typeName = def?.typeName ?? "unknown";

    let typeLabel = "unknown";
    if (typeName.includes("ZodString")) typeLabel = "string";
    else if (typeName.includes("ZodNumber")) typeLabel = "number";
    else if (typeName.includes("ZodArray")) typeLabel = "array";
    else if (typeName.includes("ZodObject")) typeLabel = "object";
    else if (typeName.includes("ZodEnum")) typeLabel = "enum";
    else if (typeName.includes("ZodUnion")) typeLabel = "string | object";
    else if (typeName.includes("ZodOptional")) {
      const inner = def?.innerType as { _def?: { typeName?: string } } | undefined;
      const innerType = inner?._def?.typeName ?? "";
      if (innerType.includes("ZodArray")) typeLabel = "array (optional)";
      else if (innerType.includes("ZodObject")) typeLabel = "object (optional)";
      else if (innerType.includes("ZodString")) typeLabel = "string (optional)";
      else if (innerType.includes("ZodUnion")) typeLabel = "string | object (optional)";
      else typeLabel = `${innerType.replace("Zod", "").toLowerCase()} (optional)`;
    }

    lines.push(`  - ${fieldName}: ${typeLabel}`);
  }
  return lines.join("\n");
}

// ── RTIS System Prompts ────────────────────────────────────────────────────

const SYSTEM_BASE = `Tu es Mestor, le moteur d'intelligence stratégique du framework ADVE-RTIS (Authenticité, Distinction, Valeur, Engagement, Risk, Track, Implementation, Synthèse).
Tu analyses les données des piliers de marque et produis des actualisations structurées en JSON.
TOUJOURS répondre en JSON valide uniquement, sans commentaire ni explication autour.`;

const RTIS_PROMPTS: { R: string; T: string; I: string; S: string; ADVE_UPDATE: string } = {
  // R — Risk: analyse les données ADVE pour produire risques, SWOT, mitigations
  R: `${SYSTEM_BASE}

Tu actualises le PILIER R (RISK) à partir de l'analyse des piliers ADVE.

Ton rôle: identifier les risques stratégiques, les forces/faiblesses, les opportunités/menaces.
Analyse les données ADVE fournies et produis un JSON avec ces champs:

{
  "globalSwot": {
    "strengths": ["string 3-5 items, max 200 chars chacun"],
    "weaknesses": ["string 3-5 items"],
    "opportunities": ["string 3-5 items"],
    "threats": ["string 3-5 items"]
  },
  "probabilityImpactMatrix": [
    { "risk": "string", "probability": "LOW|MEDIUM|HIGH", "impact": "LOW|MEDIUM|HIGH", "mitigation": "string 40+ chars" }
  ] (5+ items),
  "mitigationPriorities": [
    { "action": "string 40+ chars", "owner": "string?", "timeline": "string?", "investment": "string?" }
  ] (5+ items),
  "riskScore": number 0-100
}

Base ton analyse sur les DONNÉES RÉELLES des piliers ADVE fournis. Sois spécifique, pas générique.`,

  // T — Track: analyse ADVE + R pour trianguler et valider les hypothèses
  T: `${SYSTEM_BASE}

Tu actualises le PILIER T (TRACK) à partir de l'analyse des piliers ADVE + R.

Ton rôle: trianguler les données marché, valider/invalider les hypothèses, évaluer le brand-market fit.
Utilise les données des piliers ADVE comme source primaire et R comme contexte de risques.

Produis un JSON avec ces champs:

{
  "triangulation": {
    "customerInterviews": "string 100+ chars — synthèse des données clients extraites de ADVE",
    "competitiveAnalysis": "string 100+ chars — analyse concurrentielle déduite de D",
    "trendAnalysis": "string 100+ chars — tendances déduites du positionnement",
    "financialBenchmarks": "string 100+ chars — benchmarks financiers déduits de V"
  },
  "hypothesisValidation": [
    { "hypothesis": "string", "validationMethod": "string", "status": "HYPOTHESIS|TESTING|VALIDATED|INVALIDATED", "evidence": "string?" }
  ] (5+ items),
  "tamSamSom": {
    "tam": { "value": number, "description": "string" },
    "sam": { "value": number, "description": "string" },
    "som": { "value": number, "description": "string" }
  },
  "brandMarketFitScore": number 0-100
}

Base-toi UNIQUEMENT sur les données réelles fournies. Pas d'invention.`,

  // I — Implementation: CATALOGUE EXHAUSTIF de tout le potentiel d'action
  I: `${SYSTEM_BASE}

Tu actualises le PILIER I (IMPLEMENTATION) — le CATALOGUE EXHAUSTIF de tout ce que la marque peut faire.

I n'est PAS un plan d'action ni une roadmap. I est l'INVENTAIRE COMPLET de toutes les actions,
assets, formats, canaux, et activations possibles pour cette marque. C'est le potentiel brut.

A partir des piliers ADVE (identite), R (risques) et T (marche), liste TOUT ce qui est faisable.

Produis un JSON avec ces champs:

{
  "catalogueParCanal": {
    "DIGITAL": [{ "action": "string", "format": "string", "objectif": "string", "pilierImpact": "A|D|V|E" }],
    "EVENEMENTIEL": [{ "action": "string", "format": "string", "objectif": "string", "pilierImpact": "A|D|V|E" }],
    "MEDIA_TRADITIONNEL": [{ "action": "string", "format": "string", "objectif": "string", "pilierImpact": "A|D|V|E" }],
    "PR_INFLUENCE": [{ "action": "string", "format": "string", "objectif": "string", "pilierImpact": "A|D|V|E" }],
    "PRODUCTION": [{ "action": "string", "format": "string", "objectif": "string", "pilierImpact": "A|D|V|E" }],
    "RETAIL_DISTRIBUTION": [{ "action": "string", "format": "string", "objectif": "string", "pilierImpact": "A|D|V|E" }]
  } (5+ actions par canal minimum),
  "assetsProduisibles": [
    { "asset": "string", "type": "VIDEO|PRINT|DIGITAL|PHOTO|AUDIO|PACKAGING|EXPERIENCE", "usage": "string" }
  ] (15+ items),
  "activationsPossibles": [
    { "activation": "string", "canal": "string", "cible": "string", "budgetEstime": "LOW|MEDIUM|HIGH" }
  ] (10+ items),
  "formatsDisponibles": ["string"] (10+ items — tous les formats possibles: reels, billboards, podcasts, etc.),
  "totalActions": number
}

Sois EXHAUSTIF. Liste TOUT ce qui est possible, pas juste ce qui est prioritaire. Le tri viendra dans S.`,

  // S — Strategy: FENÊTRE D'OVERTON + plan d'action + roadmap superfan
  S: `${SYSTEM_BASE}

Tu actualises le PILIER S (STRATEGY) — la fenêtre d'Overton, le plan d'action et la roadmap.

S est le pilier FINAL qui prend tout le potentiel de I et le transforme en plan concret.
S repond a: "Comment deplacer les perceptions du marche pour creer des superfans?"

A partir de ADVE (identite), R (risques), T (marche) et I (catalogue d'actions):
1. Definis la fenetre d'Overton (perception actuelle vs cible)
2. Selectionne les actions de I les plus pertinentes
3. Organise-les en roadmap avec budget et timeline

Produis un JSON avec ces champs:

{
  "fenetreOverton": {
    "perceptionActuelle": "string 100+ chars — comment le marche percoit la marque aujourd'hui",
    "perceptionCible": "string 100+ chars — comment la marque veut etre percue",
    "ecart": "string 100+ chars — ce qui doit changer dans les perceptions",
    "strategieDeplacement": [
      { "etape": "string", "action": "string", "canal": "string", "horizon": "Q1|Q2|Q3|Q4" }
    ] (5+ items)
  },
  "roadmap": [
    { "phase": "string", "objectif": "string", "actions": ["string"], "budget": number, "duree": "string" }
  ] (4 phases minimum),
  "sprint90Days": [
    { "action": "string 100+ chars", "owner": "string?", "kpi": "string", "priority": number, "isRiskMitigation": boolean? }
  ] (8+ items),
  "globalBudget": number,
  "kpiDashboard": [
    { "name": "string", "pillar": "A|D|V|E|R|T|I|S", "target": "string", "frequency": "DAILY|WEEKLY|MONTHLY|QUARTERLY" }
  ] (7+ items),
  "syntheseExecutive": "string 400+ chars — resume executif de la strategie complete"
}

Le plan d'action doit prioriser les actions qui deplacent la fenetre d'Overton vers le superfan.`,

  // ADVE actualization: R+T recommendations → update a specific pillar
  ADVE_UPDATE: `${SYSTEM_BASE}

Tu actualises un pilier ADVE spécifique en utilisant les recommandations issues de l'analyse Risk (R) et Track (T).

Le cycle RTIS fonctionne ainsi:
1. R analyse ADVE → identifie risques, forces, faiblesses
2. T analyse ADVE+R → triangule, valide, évalue le fit marché
3. R+T produisent des recommandations
4. Ces recommandations ACTUALISENT les piliers ADVE (c'est ce que tu fais maintenant)

Tu dois:
- Lire le contenu actuel du pilier
- Lire les recommandations R et T
- Produire une version AMÉLIORÉE du pilier qui intègre les insights R+T
- CONSERVER toutes les données existantes — ne supprimer aucun champ
- ENRICHIR avec les recommandations applicables
- Retourner le pilier complet en JSON`,
};

// ── ADVE Recommendation Prompt ─────────────────────────────────────────────

const RECO_PROMPT = `${SYSTEM_BASE}

Tu analyses les piliers R (Risk) et T (Track) pour produire des recommandations GRANULAIRES
destinées à enrichir un pilier ADVE spécifique.

Pour CHAQUE modification necessaire, choisis l'operation la plus precise :
- SET : remplacer le champ entier (quand la valeur actuelle est nulle, incoherente ou doit etre completement refaite)
- ADD : ajouter un element a un array existant (nouveau persona, nouveau risque, nouvelle valeur)
- MODIFY : modifier un element specifique d'un array existant (inclure targetMatch pour l'identifier)
- REMOVE : supprimer un element specifique d'un array (inclure targetMatch pour l'identifier)
- EXTEND : enrichir un objet existant avec de nouvelles cles sans ecraser les existantes

Tu peux produire PLUSIEURS operations sur le meme champ. Exemple pour "personas":
- ADD un persona "Architecte Junior"
- MODIFY le persona "Architecte Senior" (nouvelles motivations)
- REMOVE le persona "Client Industriel" (mal cible)

Retourne un JSON array:
[
  {
    "field": "nomDuChamp",
    "operation": "SET" | "ADD" | "MODIFY" | "REMOVE" | "EXTEND",
    "currentSummary": "resume court de la valeur actuelle ou de l'item cible (20 mots max)",
    "proposedValue": <la valeur proposee — pour ADD: le nouvel item, pour MODIFY: l'item modifie complet, pour REMOVE: null, pour SET: la valeur complete, pour EXTEND: les cles a ajouter>,
    "targetMatch": { "key": "nom", "value": "Architecte Senior" } | null,
    "justification": "Pourquoi ? Quelle insight R ou T motive ce changement ? (2-3 phrases)",
    "source": "R" | "T" | "R+T",
    "impact": "LOW" | "MEDIUM" | "HIGH"
  }
]

Regles:
- Ne propose QUE des modifications justifiees par des donnees R ou T concretes
- PREFERE les operations granulaires (ADD/MODIFY/REMOVE/EXTEND) au SET quand le champ est un array ou objet
- Utilise SET uniquement pour les champs string ou quand le champ entier doit etre remplace
- Pour ADD sur un array : proposedValue = le SEUL nouvel item a ajouter (pas le tableau complet)
- Pour MODIFY : proposedValue = l'item modifie complet, targetMatch = comment identifier l'item a modifier
- Pour REMOVE : proposedValue = null, targetMatch = comment identifier l'item a supprimer
- Pour EXTEND : proposedValue = les nouvelles cles/valeurs a merger dans l'objet existant
- Si un champ est deja excellent et R/T ne l'ameliorent pas, NE le mentionne PAS
- Sois specifique dans tes justifications — cite les donnees R/T qui motivent le changement
- 5 a 20 recommandations par pilier, triees par impact decroissant`;

// ── Public API ──────────────────────────────────────────────────────────────

export type RecoOperation = "SET" | "ADD" | "MODIFY" | "REMOVE" | "EXTEND";

export interface FieldRecommendation {
  field: string;
  /** Operation type — defaults to SET for backward compat with existing recos */
  operation?: RecoOperation;
  currentSummary: string;
  proposedValue: unknown;
  /** For MODIFY/REMOVE on arrays: index of the targeted item */
  targetIndex?: number;
  /** For MODIFY/REMOVE on arrays: match by key/value instead of index */
  targetMatch?: { key: string; value: string };
  justification: string;
  source: "R" | "T" | "R+T";
  impact: "LOW" | "MEDIUM" | "HIGH";
  accepted?: boolean;
}

export type ActualizeResult = {
  pillarKey: string;
  updated: boolean;
  scoreResult?: AdvertisVector;
  maturityStage?: string;
  maturityCompletionPct?: number;
  maturityMissing?: string[];
  error?: string;
};

/**
 * Actualize a single pillar via Mestor.
 * For R/T/I/S: generates from other pillars.
 * For A/D/V/E: enriches from R+T recommendations.
 */
export async function actualizePillar(
  strategyId: string,
  pillarKey: PillarKey,
): Promise<ActualizeResult> {
  try {
    const pillars = await loadPillars(strategyId);

    let newContent: Record<string, unknown>;
    let confidence: number;

    if (pillarKey === "R") {
      // R = analyse(ADVE)
      const adveContext = ["A", "D", "V", "E"]
        .map((k) => serializePillar(k, pillars[k]))
        .join("\n\n");

      const response = await callCascadeLLM(
        RTIS_PROMPTS.R,
        `Voici les données ADVE actuelles de la stratégie:\n\n${adveContext}\n\nProduis le pilier R (Risk) en JSON.`,
        strategyId,
      );
      newContent = extractJSON(response);
      confidence = 0.75;

    } else if (pillarKey === "T") {
      // T = Market Intelligence Engine (data-first, not pure LLM)
      try {
        const miResult = await runMarketIntelligence(strategyId);
        newContent = miResult.pillarContent;
        confidence = miResult.confidence;
      } catch (err) {
        // Fallback: pure LLM if market intelligence fails
        console.warn("[rtis-cascade] Market intelligence failed, falling back to LLM:", err instanceof Error ? err.message : err);
        const context = ["A", "D", "V", "E", "R"]
          .map((k) => serializePillar(k, pillars[k]))
          .join("\n\n");
        const response = await callCascadeLLM(
          RTIS_PROMPTS.T,
          `Voici les données ADVE + R actuelles:\n\n${context}\n\nProduis le pilier T (Track) en JSON.`,
          strategyId,
        );
        newContent = extractJSON(response);
        confidence = 0.65;
      }

    } else if (pillarKey === "I") {
      // I = Catalogue exhaustif (LLM prompt produces new format)
      const context = ["A", "D", "V", "E", "R", "T"]
        .map((k) => serializePillar(k, pillars[k]))
        .join("\n\n");
      const iBibleKeys = Object.keys((PILLAR_SCHEMAS.I as { shape?: Record<string, unknown> })?.shape ?? {});
      const iBible = getFormatInstructions("i", iBibleKeys);
      const response = await callCascadeLLM(
        RTIS_PROMPTS.I,
        `Voici les données ADVE + R + T actuelles:\n\n${context}\n\nBIBLE DE FORMAT pour le pilier I:\n${iBible}\n\nProduis le pilier I (Implementation — catalogue exhaustif) en JSON. Respecte les regles de la Bible.`,
        strategyId,
      );
      newContent = extractJSON(response);
      confidence = 0.70;

    } else if (pillarKey === "S") {
      // S = mise en forme(tout)
      const context = ["A", "D", "V", "E", "R", "T", "I"]
        .map((k) => serializePillar(k, pillars[k]))
        .join("\n\n");

      const sBibleKeys = Object.keys((PILLAR_SCHEMAS.S as { shape?: Record<string, unknown> })?.shape ?? {});
      const sBible = getFormatInstructions("s", sBibleKeys);
      const response = await callCascadeLLM(
        RTIS_PROMPTS.S,
        `Voici les 7 piliers ADVE-RTI actuels:\n\n${context}\n\nBIBLE DE FORMAT pour le pilier S:\n${sBible}\n\nProduis le pilier S (Synthèse) en JSON. Respecte les regles de la Bible.`,
        strategyId,
      );
      newContent = extractJSON(response);
      confidence = 0.70;

    } else {
      // A, D, V, E — enrichissement via recommandations R+T
      const currentContent = (pillars[pillarKey] ?? {}) as Record<string, unknown>;
      const rContent = pillars["R"] as Record<string, unknown> | undefined;
      const tContent = pillars["T"] as Record<string, unknown> | undefined;

      if (!rContent && !tContent) {
        return { pillarKey, updated: false, error: "R et T sont vides — lancez d'abord la cascade R→T avant d'actualiser ADVE." };
      }

      const prompt = `Voici le pilier ${pillarKey} actuel:
${serializePillar(pillarKey, currentContent)}

Voici les recommandations du pilier R (Risk):
${rContent ? JSON.stringify(rContent, null, 2) : "Non disponible"}

Voici les recommandations du pilier T (Track):
${tContent ? JSON.stringify(tContent, null, 2) : "Non disponible"}

Actualise le pilier ${pillarKey} en intégrant les insights de R et T.
CONSERVE toutes les données existantes. ENRICHIS avec les recommandations applicables.
Retourne le pilier ${pillarKey} complet en JSON.`;

      const response = await callCascadeLLM(RTIS_PROMPTS.ADVE_UPDATE, prompt, strategyId);
      const generated = extractJSON(response);

      // Merge: keep existing, overlay AI-generated
      newContent = { ...currentContent, ...generated };
      confidence = 0.65;
    }

    // Save
    await savePillar(strategyId, pillarKey, newContent, confidence);

    // Recalc scores
    const scoreResult = await recalcScores(strategyId);

    // Assess maturity after update
    let maturityStage: string | undefined;
    let maturityCompletionPct: number | undefined;
    let maturityMissing: string[] | undefined;
    try {
      const { assessPillar: assess } = await import("@/server/services/pillar-maturity/assessor");
      const { getContract } = await import("@/server/services/pillar-maturity/contracts-loader");
      const assessment = assess(pillarKey.toLowerCase(), newContent, getContract(pillarKey.toLowerCase()) ?? undefined);
      maturityStage = assessment.currentStage;
      maturityCompletionPct = assessment.completionPct;
      maturityMissing = assessment.missing;
    } catch { /* non-fatal */ }

    return { pillarKey, updated: true, scoreResult, maturityStage, maturityCompletionPct, maturityMissing };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { pillarKey, updated: false, error: msg };
  }
}

/**
 * Generate per-field recommendations for an ADVE pillar from R+T insights.
 *
 * MIGRATED TO NOTORIA — delegates to notoria/engine.generateBatch().
 * Keeps backward-compatible signature for Hyperviseur COMMANDANT step.
 */
export async function generateADVERecommendations(
  strategyId: string,
  pillarKey: "A" | "D" | "V" | "E",
): Promise<{ pillarKey: string; recommendations: FieldRecommendation[]; error?: string }> {
  try {
    const { generateBatch } = await import("@/server/services/notoria/engine");
    const result = await generateBatch({
      strategyId,
      missionType: "ADVE_UPDATE",
      targetPillars: [pillarKey.toLowerCase() as "a" | "d" | "v" | "e"],
    });

    if (result.errors.length > 0 && result.totalRecos === 0) {
      return { pillarKey, recommendations: [], error: result.errors[0]?.error };
    }

    // Load the created Recommendation rows to return as FieldRecommendation (backward compat)
    const recos = await db.recommendation.findMany({
      where: { batchId: result.batchId, targetPillarKey: pillarKey.toLowerCase() },
    });

    const mapped: FieldRecommendation[] = recos.map((r) => ({
      field: r.targetField,
      operation: r.operation as RecoOperation,
      currentSummary: typeof r.currentSnapshot === "string" ? r.currentSnapshot : "",
      proposedValue: r.proposedValue,
      targetMatch: r.targetMatch as { key: string; value: string } | undefined,
      justification: r.explain,
      source: r.source as "R" | "T" | "R+T",
      impact: r.impact as "LOW" | "MEDIUM" | "HIGH",
    }));

    return { pillarKey, recommendations: mapped };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { pillarKey, recommendations: [], error: msg };
  }
}

/** Resolve target index for MODIFY/REMOVE: by explicit index or key/value match */
function resolveTargetIndex(arr: unknown[], reco: FieldRecommendation): number {
  if (reco.targetIndex !== undefined && reco.targetIndex >= 0) return reco.targetIndex;
  if (reco.targetMatch) {
    return arr.findIndex(item =>
      typeof item === "object" && item !== null &&
      (item as Record<string, unknown>)[reco.targetMatch!.key] === reco.targetMatch!.value
    );
  }
  return -1;
}

/**
 * Apply accepted recommendations to an ADVE pillar.
 *
 * MIGRATED TO NOTORIA — delegates to notoria/lifecycle.
 * Keeps backward-compatible signature for existing callers.
 *
 * New callers should use notoria.acceptRecos() + notoria.applyRecos() directly.
 */
export async function applyAcceptedRecommendations(
  strategyId: string,
  pillarKey: "A" | "D" | "V" | "E",
  acceptedFields?: string[],
  recoIndices?: number[],
): Promise<{ applied: number; error?: string }> {
  try {
    const { acceptRecos, applyRecos } = await import("@/server/services/notoria/lifecycle");

    // Find PENDING Notoria recos for this pillar
    const pending = await db.recommendation.findMany({
      where: {
        strategyId,
        targetPillarKey: pillarKey.toLowerCase(),
        status: "PENDING",
      },
      select: { id: true, targetField: true },
    });

    if (pending.length === 0) return { applied: 0 };

    // Resolve which recos to select
    let selectedIds: string[];
    if (recoIndices && recoIndices.length > 0) {
      // Map legacy indices to Notoria IDs (best effort: indices match creation order)
      selectedIds = recoIndices
        .filter((idx) => idx >= 0 && idx < pending.length)
        .map((idx) => pending[idx]!.id);
    } else if (acceptedFields && acceptedFields.length > 0) {
      selectedIds = pending
        .filter((r) => acceptedFields.includes(r.targetField))
        .map((r) => r.id);
    } else {
      selectedIds = pending.map((r) => r.id);
    }

    if (selectedIds.length === 0) return { applied: 0 };

    // Accept then apply through Notoria lifecycle
    await acceptRecos(strategyId, selectedIds, "MESTOR");
    const result = await applyRecos(strategyId, selectedIds);

    return { applied: result.applied };
  } catch (err) {
    return { applied: 0, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Clear pending recommendations for a pillar (reject all remaining).
 */
/**
 * Clear (reject) all pending recommendations for a pillar.
 *
 * MIGRATED TO NOTORIA — rejects via Recommendation table instead of clearing pendingRecos JSON.
 */
export async function clearRecommendations(
  strategyId: string,
  pillarKey: "A" | "D" | "V" | "E",
): Promise<void> {
  // Reject all PENDING Notoria recommendations for this pillar
  await db.recommendation.updateMany({
    where: {
      strategyId,
      targetPillarKey: pillarKey.toLowerCase(),
      status: "PENDING",
    },
    data: {
      status: "REJECTED",
      reviewedBy: "MESTOR",
      reviewedAt: new Date(),
      revertReason: "Bulk rejection via clearRecommendations",
    },
  });

  // Also clear legacy pendingRecos JSON if it still has data (backward compat cleanup)
  await db.pillar.update({
    where: { strategyId_key: { strategyId, key: pillarKey.toLowerCase() } },
    data: { pendingRecos: Prisma.DbNull },
  });
}

/**
 * Run the full RTIS cascade:
 * 1. R = analyse(ADVE)
 * 2. T = analyse(ADVE + R)
 * 3. R+T → generate ADVE recommendations (proposals, not auto-merge)
 * 4. I = produit(ADVE, R, T)
 * 5. S = mise en forme(tout)
 */
export async function runRTISCascade(
  strategyId: string,
  options: { updateADVE?: boolean; skipT?: boolean } = {},
): Promise<{
  results: ActualizeResult[];
  finalScore?: AdvertisVector;
}> {
  const results: ActualizeResult[] = [];

  // Step 1: R = analyse(ADVE) — toujours exécuté
  const rResult = await actualizePillar(strategyId, "R");
  results.push(rResult);
  if (!rResult.updated) return { results };

  // Step 2: T = analyse(ADVE + R) — FACULTATIF
  if (!options.skipT) {
    const tResult = await actualizePillar(strategyId, "T");
    results.push(tResult);
    // T peut échouer sans bloquer la cascade — R seul suffit pour les recos
  }

  // Step 3 (optional): R(+T) → generate ADVE recommendations (proposals for operator review)
  if (options.updateADVE) {
    for (const key of ["A", "D", "V", "E"] as ("A" | "D" | "V" | "E")[]) {
      const recoResult = await generateADVERecommendations(strategyId, key);
      results.push({
        pillarKey: key,
        updated: recoResult.recommendations.length > 0,
        error: recoResult.error,
      });
    }
  }

  // Step 4: I = produit(ADVE, R, T si disponible)
  const iResult = await actualizePillar(strategyId, "I");
  results.push(iResult);

  // Step 5: S = mise en forme(tout)
  const sResult = await actualizePillar(strategyId, "S");
  results.push(sResult);

  // Final score
  const finalScore = await recalcScores(strategyId);

  return { results, finalScore };
}
