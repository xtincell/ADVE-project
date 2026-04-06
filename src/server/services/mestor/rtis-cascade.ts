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

import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { db } from "@/lib/db";
import { PILLAR_SCHEMAS, type PillarKey } from "@/lib/types/pillar-schemas";
import { scoreAllPillarsSemantic } from "@/server/services/advertis-scorer/semantic";
import { Prisma } from "@prisma/client";
import { runMarketIntelligence } from "@/server/services/market-intelligence";

const MODEL = "claude-sonnet-4-20250514";

// ── Helpers ────────────────────────────────────────────────────────────────

async function loadPillars(strategyId: string): Promise<Record<string, unknown>> {
  const pillars = await db.pillar.findMany({ where: { strategyId } });
  const map: Record<string, unknown> = {};
  for (const p of pillars) map[p.key.toUpperCase()] = p.content;
  return map;
}

async function savePillar(strategyId: string, key: string, content: Record<string, unknown>, confidence: number) {
  await db.pillar.upsert({
    where: { strategyId_key: { strategyId, key: key.toLowerCase() } },
    update: { content: content as Prisma.InputJsonValue, confidence, validationStatus: "DRAFT" },
    create: { strategyId, key: key.toLowerCase(), content: content as Prisma.InputJsonValue, confidence },
  });
}

async function recalcScores(strategyId: string) {
  const pillars = await db.pillar.findMany({ where: { strategyId } });
  const result = scoreAllPillarsSemantic(pillars.map((p) => ({ key: p.key, content: p.content })));
  const vec: Record<string, number> = { composite: result.composite };
  for (const ps of result.pillarScores) vec[ps.pillarKey.toLowerCase()] = ps.score;
  await db.strategy.update({ where: { id: strategyId }, data: { advertis_vector: vec as Prisma.InputJsonValue } });
  return result;
}

async function callLLM(system: string, prompt: string, strategyId?: string): Promise<string> {
  const { text, usage } = await generateText({
    model: anthropic(MODEL),
    system,
    prompt,
    maxTokens: 8000,
  });

  // Track cost
  if (strategyId) {
    await db.aICostLog.create({
      data: {
        strategyId,
        provider: "anthropic",
        model: MODEL,
        inputTokens: usage?.promptTokens ?? 0,
        outputTokens: usage?.completionTokens ?? 0,
        cost: ((usage?.promptTokens ?? 0) * 0.003 + (usage?.completionTokens ?? 0) * 0.015) / 1000,
        context: "rtis-cascade",
      },
    }).catch(() => {});
  }

  return text;
}

function extractJSON(text: string): Record<string, unknown> {
  // Try to find JSON block in response (objects or arrays)
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/)
    ?? text.match(/(\[[\s\S]*\])/)
    ?? text.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) throw new Error("No JSON found in LLM response");
  const raw = jsonMatch[1] ?? jsonMatch[0];
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return JSON.parse(raw.trim());
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

Tu analyses les piliers R (Risk) et T (Track) pour produire des recommandations concrètes
destinées à enrichir un pilier ADVE spécifique.

Pour CHAQUE champ du pilier que tu peux améliorer grâce aux insights R et/ou T, produis une recommandation.

Retourne un JSON array:
[
  {
    "field": "nomDuChamp",
    "currentSummary": "résumé court de la valeur actuelle (20 mots max)",
    "proposedValue": <la nouvelle valeur complète pour ce champ — même type que l'actuel>,
    "justification": "Pourquoi cette modification ? Quelle insight R ou T la motive ? (2-3 phrases)",
    "source": "R" | "T" | "R+T",
    "impact": "LOW" | "MEDIUM" | "HIGH"
  }
]

Règles:
- Ne propose QUE des modifications justifiées par des données R ou T concrètes
- CONSERVE le type de données de chaque champ (string→string, array→array, object→object)
- Pour les arrays, propose la version COMPLÈTE du tableau (items existants + ajouts)
- Pour les strings, propose le texte COMPLET de remplacement
- Si un champ est déjà excellent et R/T ne l'améliorent pas, NE le mentionne PAS
- Sois spécifique dans tes justifications — cite les données R/T qui motivent le changement
- 5 à 15 recommandations par pilier, triées par impact décroissant`;

// ── Public API ──────────────────────────────────────────────────────────────

export interface FieldRecommendation {
  field: string;
  currentSummary: string;
  proposedValue: unknown;
  justification: string;
  source: "R" | "T" | "R+T";
  impact: "LOW" | "MEDIUM" | "HIGH";
  accepted?: boolean;
}

export type ActualizeResult = {
  pillarKey: string;
  updated: boolean;
  scoreResult?: ReturnType<typeof scoreAllPillarsSemantic>;
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

      const response = await callLLM(
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
        const response = await callLLM(
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
      const response = await callLLM(
        RTIS_PROMPTS.I,
        `Voici les données ADVE + R + T actuelles:\n\n${context}\n\nProduis le pilier I (Implementation — catalogue exhaustif) en JSON.`,
        strategyId,
      );
      newContent = extractJSON(response);
      confidence = 0.70;

    } else if (pillarKey === "S") {
      // S = mise en forme(tout)
      const context = ["A", "D", "V", "E", "R", "T", "I"]
        .map((k) => serializePillar(k, pillars[k]))
        .join("\n\n");

      const response = await callLLM(
        RTIS_PROMPTS.S,
        `Voici les 7 piliers ADVE-RTI actuels:\n\n${context}\n\nProduis le pilier S (Synthèse) en JSON.`,
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

      const response = await callLLM(RTIS_PROMPTS.ADVE_UPDATE, prompt, strategyId);
      const generated = extractJSON(response);

      // Merge: keep existing, overlay AI-generated
      newContent = { ...currentContent, ...generated };
      confidence = 0.65;
    }

    // Save
    await savePillar(strategyId, pillarKey, newContent, confidence);

    // Recalc scores
    const scoreResult = await recalcScores(strategyId);

    return { pillarKey, updated: true, scoreResult };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { pillarKey, updated: false, error: msg };
  }
}

/**
 * Generate per-field recommendations for an ADVE pillar from R+T insights.
 * Does NOT modify the pillar — stores proposals in pendingRecos for operator review.
 */
export async function generateADVERecommendations(
  strategyId: string,
  pillarKey: "A" | "D" | "V" | "E",
): Promise<{ pillarKey: string; recommendations: FieldRecommendation[]; error?: string }> {
  try {
    const pillars = await loadPillars(strategyId);
    const currentContent = (pillars[pillarKey] ?? {}) as Record<string, unknown>;
    const rContent = pillars["R"] as Record<string, unknown> | undefined;
    const tContent = pillars["T"] as Record<string, unknown> | undefined;

    if (!rContent && !tContent) {
      return { pillarKey, recommendations: [], error: "R et T sont vides — lancez d'abord la cascade R→T." };
    }

    // Describe the schema fields so the LLM knows exact types
    const schemaDesc = describeSchemaFields(pillarKey);

    const prompt = `Voici le SCHEMA du pilier ${pillarKey} (types attendus pour chaque champ):
${schemaDesc}

Voici le pilier ${pillarKey} actuel:
${JSON.stringify(currentContent, null, 2)}

Voici le pilier R (Risk):
${rContent ? JSON.stringify(rContent, null, 2) : "Non disponible"}

Voici le pilier T (Track):
${tContent ? JSON.stringify(tContent, null, 2) : "Non disponible"}

Produis les recommandations d'enrichissement pour le pilier ${pillarKey}.
IMPORTANT: chaque proposedValue DOIT respecter EXACTEMENT le type et la structure du champ decrit dans le schema ci-dessus.
Pour les champs "array", propose le tableau COMPLET (items existants + ajouts), chaque item doit avoir TOUS les sous-champs requis.
Pour les champs "object", propose l'objet COMPLET avec tous les sous-champs.
Pour les champs "string", propose le texte COMPLET.`;

    const response = await callLLM(RECO_PROMPT, prompt, strategyId);
    const parsed = extractJSON(response);

    // The response should be an array
    const recos: FieldRecommendation[] = Array.isArray(parsed)
      ? parsed as FieldRecommendation[]
      : (parsed as Record<string, unknown>).recommendations
        ? (parsed as Record<string, unknown>).recommendations as FieldRecommendation[]
        : [];

    // Validate each reco's proposedValue against the schema field
    const schema = PILLAR_SCHEMAS[pillarKey];
    const shape = schema.shape as Record<string, { safeParse?: (v: unknown) => { success: boolean } }>;
    for (const reco of recos) {
      const fieldSchema = shape[reco.field];
      if (fieldSchema?.safeParse) {
        const result = fieldSchema.safeParse(reco.proposedValue);
        if (!result.success) {
          // Tag invalid recos so UI can warn the operator
          (reco as unknown as Record<string, unknown>).validationWarning = `Le format proposé ne correspond pas au schema attendu pour "${reco.field}"`;
        }
      }
    }

    // Store in DB as pendingRecos
    await db.pillar.update({
      where: { strategyId_key: { strategyId, key: pillarKey.toLowerCase() } },
      data: { pendingRecos: recos as unknown as Prisma.InputJsonValue },
    });

    return { pillarKey, recommendations: recos };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { pillarKey, recommendations: [], error: msg };
  }
}

/**
 * Apply accepted recommendations to an ADVE pillar.
 * Only applies recos where accepted === true.
 */
export async function applyAcceptedRecommendations(
  strategyId: string,
  pillarKey: "A" | "D" | "V" | "E",
  acceptedFields: string[],
): Promise<{ applied: number; error?: string }> {
  try {
    const pillar = await db.pillar.findUnique({
      where: { strategyId_key: { strategyId, key: pillarKey.toLowerCase() } },
    });
    if (!pillar) return { applied: 0, error: "Pillar not found" };

    const recos = (pillar.pendingRecos ?? []) as unknown as FieldRecommendation[];
    const content = (pillar.content ?? {}) as Record<string, unknown>;

    let applied = 0;
    for (const reco of recos) {
      if (acceptedFields.includes(reco.field)) {
        content[reco.field] = reco.proposedValue;
        reco.accepted = true;
        applied++;
      }
    }

    // Save updated content + mark recos as processed
    await db.pillar.update({
      where: { id: pillar.id },
      data: {
        content: content as Prisma.InputJsonValue,
        pendingRecos: recos as unknown as Prisma.InputJsonValue,
        confidence: Math.min((pillar.confidence ?? 0.5) + 0.05 * applied, 0.95),
        staleAt: null,
      },
    });

    // Recalc scores
    await recalcScores(strategyId);

    return { applied };
  } catch (err) {
    return { applied: 0, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Clear pending recommendations for a pillar (reject all remaining).
 */
export async function clearRecommendations(
  strategyId: string,
  pillarKey: "A" | "D" | "V" | "E",
): Promise<void> {
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
  finalScore?: ReturnType<typeof scoreAllPillarsSemantic>;
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
