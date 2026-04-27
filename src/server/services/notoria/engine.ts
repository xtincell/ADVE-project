/**
 * NOTORIA Engine — Recommendation generation for all 5 mission types.
 *
 * Generates structured, schema-validated recommendations and persists them
 * as Recommendation entities (not JSON arrays in Pillar.pendingRecos).
 */

import { db } from "@/lib/db";
import { callLLM } from "@/server/services/llm-gateway";
import { extractJSON as _extractJSON } from "@/server/services/utils/llm";
import { PILLAR_SCHEMAS } from "@/lib/types/pillar-schemas";
import type { PillarKey } from "@/lib/types/advertis-vector";
import { getFormatInstructions } from "@/lib/types/variable-bible";
import { Prisma } from "@prisma/client";
import { applyQualityGates, validateFinancialReco } from "./gates";
import type {
  GenerateBatchInput,
  GenerateBatchResult,
  MissionType,
  RawLLMReco,
  RecoSource,
} from "./types";
import { MISSION_CONFIG } from "./types";

// ── Helpers ───────────────────────────────────────────────────────

function extractJSON(text: string): Record<string, unknown> {
  return _extractJSON(text) as Record<string, unknown>;
}

async function callNotoriaLLM(
  system: string,
  prompt: string,
  strategyId?: string,
): Promise<string> {
  const { text } = await callLLM({
    system,
    prompt,
    caller: "notoria:engine",
    strategyId,
    maxTokens: 8000,
  });
  return text;
}

async function loadPillars(
  strategyId: string,
): Promise<Record<string, unknown>> {
  const pillars = await db.pillar.findMany({ where: { strategyId } });
  const map: Record<string, unknown> = {};
  for (const p of pillars) map[p.key.toUpperCase()] = p.content;
  return map;
}

function serializePillar(key: string, content: unknown): string {
  if (!content || typeof content !== "object") return `[${key}] Vide`;
  return `[PILIER ${key}]\n${JSON.stringify(content, null, 2)}`;
}

function describeSchemaFields(key: string): string {
  const upperKey = key.toUpperCase() as keyof typeof PILLAR_SCHEMAS;
  const schema = PILLAR_SCHEMAS[upperKey];
  if (!schema) return `Schema non disponible pour ${key}`;
  const shape = schema.shape as Record<
    string,
    { _def?: { typeName?: string }; description?: string }
  >;
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
    else if (typeName.includes("ZodBoolean")) typeLabel = "boolean";
    else if (typeName.includes("ZodOptional")) typeLabel = "optional";
    lines.push(`  - ${fieldName}: ${typeLabel}`);
  }
  return lines.join("\n");
}

// ── System Prompts ────────────────────────────────────────────────

const SYSTEM_BASE = `Tu es Notoria, le moteur de recommandation des NETERU.
Tu produis des recommandations GRANULAIRES pour enrichir les fiches ADVERTIS des marques.
Chaque recommandation cible un champ precis et utilise l'operation la plus precise possible.`;

const RECO_SYSTEM = `${SYSTEM_BASE}

Pour CHAQUE modification, choisis l'operation la plus precise :
- SET : remplacer le champ entier (quand la valeur est nulle ou doit etre completement refaite)
- ADD : ajouter un element a un array existant
- MODIFY : modifier un element specifique d'un array (inclure targetMatch)
- REMOVE : supprimer un element specifique d'un array (inclure targetMatch)
- EXTEND : enrichir un objet existant avec de nouvelles cles

Pour chaque recommandation, tu DOIS fournir:
- explain: resume court (1-3 phrases) de pourquoi ce changement
- advantages: liste des avantages si on applique (2-4 items)
- disadvantages: liste des risques/inconvenients (1-3 items)
- urgency: NOW (critique) | SOON (recommande) | LATER (amelioration)
- confidence: 0.0-1.0 (ta certitude que c'est la bonne recommandation)

Retourne un JSON array:
[
  {
    "field": "nomDuChamp",
    "operation": "SET" | "ADD" | "MODIFY" | "REMOVE" | "EXTEND",
    "currentSummary": "resume court de la valeur actuelle (20 mots max)",
    "proposedValue": <valeur>,
    "targetMatch": { "key": "nom", "value": "..." } | null,
    "justification": "source et motivation (2-3 phrases)",
    "source": "R" | "T" | "R+T",
    "impact": "LOW" | "MEDIUM" | "HIGH",
    "confidence": 0.8,
    "advantages": ["avantage 1", "avantage 2"],
    "disadvantages": ["risque 1"],
    "urgency": "SOON",
    "sectionGroup": "groupName (optionnel, pour I/S)"
  }
]

Regles:
- PREFERE les operations granulaires (ADD/MODIFY/REMOVE/EXTEND) au SET pour arrays/objets
- Pour ADD : proposedValue = UN SEUL nouvel item
- Pour MODIFY : proposedValue = l'item modifie complet, targetMatch requis
- Pour REMOVE : proposedValue = null, targetMatch requis
- Si un champ est deja excellent, NE le mentionne PAS
- 5 a 20 recommandations par pilier, triees par impact decroissant`;

const SESHAT_SYSTEM = `${SYSTEM_BASE}

Tu recois une OBSERVATION de Seshat (surveillance externe) et tu dois la transformer
en recommandations structurees pour les piliers ADVERTIS impactes.

Pour chaque recommandation, explique:
- Pourquoi cette observation impacte ce champ
- Les avantages de reagir
- Les risques de ne pas reagir
- L'urgence (NOW/SOON/LATER)

Retourne le meme format JSON array que pour les recommandations ADVE.
Le champ "source" doit etre "SESHAT" pour toutes les recommandations.`;

// ── Core Generation ───────────────────────────────────────────────

async function generateRecosForPillar(
  strategyId: string,
  targetKey: PillarKey,
  missionType: MissionType,
  pillars: Record<string, unknown>,
  extraContext?: string,
): Promise<RawLLMReco[]> {
  const currentContent = (pillars[targetKey.toUpperCase()] ?? {}) as Record<
    string,
    unknown
  >;
  const schemaDesc = describeSchemaFields(targetKey);

  // Build source context based on mission type
  const config = MISSION_CONFIG[missionType];
  const sourceContext = config.sourcePillars
    .map((k) => serializePillar(k.toUpperCase(), pillars[k.toUpperCase()]))
    .join("\n\n");

  const sourceLabel =
    missionType === "SESHAT_OBSERVATION"
      ? "SESHAT"
      : missionType === "I_GENERATION"
        ? "ADVE+R+T"
        : missionType === "S_SYNTHESIS"
          ? "ADVE+R+T+I"
          : "R+T";

  // ── Detect empty/missing fields (PRIORITY for recos) ──
  const allSchemaKeys = Object.keys(
    (PILLAR_SCHEMAS[targetKey.toUpperCase() as keyof typeof PILLAR_SCHEMAS] as { shape?: Record<string, unknown> })?.shape ?? {},
  );
  const emptyFields = allSchemaKeys.filter((k) => {
    const v = currentContent[k];
    return v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
  });
  const filledFields = allSchemaKeys.filter((k) => !emptyFields.includes(k));

  // ── Inject Bible format rules for all fields ──
  const bibleInstructions = getFormatInstructions(targetKey, allSchemaKeys);

  const emptyFieldsSection = emptyFields.length > 0
    ? `\n⚠️ CHAMPS VIDES A REMPLIR EN PRIORITE (${emptyFields.length} champs):\n${emptyFields.map(f => `  - ${f}`).join("\n")}\n\nCes champs DOIVENT etre remplis via des operations SET. C'est la PRIORITE #1.`
    : "\nTous les champs sont remplis. Concentre-toi sur l'enrichissement et la correction.";

  const prompt = `SCHEMA du pilier ${targetKey.toUpperCase()} (types attendus):
${schemaDesc}

BIBLE DE FORMAT (regles de fond pour chaque champ):
${bibleInstructions}

Pilier ${targetKey.toUpperCase()} actuel (${filledFields.length}/${allSchemaKeys.length} champs remplis):
${JSON.stringify(currentContent, null, 2)}
${emptyFieldsSection}

Contexte source (${sourceLabel}):
${sourceContext}
${extraContext ? `\nContexte supplementaire:\n${extraContext}` : ""}

Produis les recommandations d'enrichissement GRANULAIRES pour le pilier ${targetKey.toUpperCase()}.
IMPORTANT:
1. PRIORITE #1 : remplir les champs VIDES (operation SET) — chaque champ vide = une reco obligatoire
2. PRIORITE #2 : enrichir/corriger les champs existants (ADD/MODIFY/EXTEND)
3. Chaque proposedValue DOIT respecter le format defini dans la BIBLE DE FORMAT
4. Respecter les regles min/max de la bible (ex: valeurs max 3, pas 7)`;

  const system =
    missionType === "SESHAT_OBSERVATION" ? SESHAT_SYSTEM : RECO_SYSTEM;
  const response = await callNotoriaLLM(system, prompt, strategyId);
  const parsed = extractJSON(response);

  const recos: RawLLMReco[] = Array.isArray(parsed)
    ? (parsed as RawLLMReco[])
    : (parsed as Record<string, unknown>).recommendations
      ? ((parsed as Record<string, unknown>).recommendations as RawLLMReco[])
      : [];

  // Validate proposedValues against schema
  const upperKey = targetKey.toUpperCase() as keyof typeof PILLAR_SCHEMAS;
  const schema = PILLAR_SCHEMAS[upperKey];
  if (schema) {
    const shape = schema.shape as Record<
      string,
      { safeParse?: (v: unknown) => { success: boolean } }
    >;
    for (const reco of recos) {
      const fieldSchema = shape[reco.field];
      if (fieldSchema?.safeParse) {
        const result = fieldSchema.safeParse(reco.proposedValue);
        if (!result.success) {
          (reco as unknown as Record<string, unknown>)._validationWarning = `Format ne correspond pas au schema pour "${reco.field}"`;
        }
      }
    }
  }

  // Auto-assign sectionGroup for I and S
  if (targetKey === "i") {
    for (const reco of recos) {
      if (!reco.sectionGroup && reco.field.startsWith("catalogueParCanal")) {
        const parts = reco.field.split(".");
        reco.sectionGroup = parts.length >= 2 ? parts.slice(0, 2).join(".") : reco.field;
      } else if (!reco.sectionGroup) {
        reco.sectionGroup = reco.field;
      }
    }
  }
  if (targetKey === "s") {
    for (const reco of recos) {
      if (!reco.sectionGroup) {
        reco.sectionGroup = reco.field.split(".")[0] ?? reco.field;
      }
    }
  }

  return recos;
}

// ── Persistence ───────────────────────────────────────────────────

async function persistBatch(
  strategyId: string,
  missionType: MissionType,
  recosByPillar: Map<string, RawLLMReco[]>,
): Promise<{ batchId: string; totalRecos: number; autoApplied: number }> {
  const config = MISSION_CONFIG[missionType];
  const allRecos = [...recosByPillar.entries()].flatMap(([key, recos]) =>
    recos.map((r) => ({ ...r, pillarKey: key })),
  );

  const batch = await db.recommendationBatch.create({
    data: {
      strategyId,
      missionType,
      sourcePillars: config.sourcePillars,
      targetPillars: [...recosByPillar.keys()],
      totalRecos: allRecos.length,
      pendingCount: allRecos.length,
      agent: "MESTOR",
    },
  });

  let autoApplied = 0;

  for (const reco of allRecos) {
    const gateResult = applyQualityGates(reco, reco.pillarKey);

    // Financial gate (async)
    const finResult = await validateFinancialReco(
      reco.pillarKey,
      reco.field,
      reco.proposedValue,
      strategyId,
    );
    if (!finResult.allowed) {
      gateResult.applyPolicy = "requires_review";
      gateResult.financialWarnings = finResult.warnings;
    }

    const validationWarning = [
      (reco as Record<string, unknown>)._validationWarning as string | undefined,
      ...(finResult.warnings ?? []),
    ]
      .filter(Boolean)
      .join("; ") || undefined;

    await db.recommendation.create({
      data: {
        strategyId,
        targetPillarKey: reco.pillarKey.toLowerCase(),
        targetField: reco.field,
        operation: reco.operation ?? "SET",
        currentSnapshot: reco.currentSummary
          ? (reco.currentSummary as unknown as Prisma.InputJsonValue)
          : Prisma.DbNull,
        proposedValue: reco.proposedValue != null ? (reco.proposedValue as Prisma.InputJsonValue) : Prisma.DbNull,
        targetMatch: reco.targetMatch
          ? (reco.targetMatch as unknown as Prisma.InputJsonValue)
          : Prisma.DbNull,
        agent: "MESTOR",
        source: reco.source ?? "R+T",
        confidence: reco.confidence ?? 0.6,
        explain: reco.justification ?? "Recommandation generee par Notoria",
        advantages: (Array.isArray(reco.advantages) ? reco.advantages : []) as Prisma.InputJsonValue,
        disadvantages: (Array.isArray(reco.disadvantages) ? reco.disadvantages : []) as Prisma.InputJsonValue,
        urgency: reco.urgency ?? "SOON",
        impact: reco.impact ?? "MEDIUM",
        destructive: false,
        applyPolicy: gateResult.applyPolicy,
        validationWarning: validationWarning ?? null,
        sectionGroup: reco.sectionGroup ?? null,
        status: "PENDING",
        batchId: batch.id,
        missionType,
      },
    });
  }

  return { batchId: batch.id, totalRecos: allRecos.length, autoApplied };
}

// ── Public API ────────────────────────────────────────────────────

export async function generateBatch(
  input: GenerateBatchInput,
): Promise<GenerateBatchResult> {
  const { strategyId, missionType, targetPillars, seshatObservation } = input;
  const pillars = await loadPillars(strategyId);

  // Determine target pillar keys
  const config = MISSION_CONFIG[missionType];
  const targets: PillarKey[] =
    targetPillars ?? (config.targetPillars as PillarKey[]);

  // Validate prerequisites
  if (
    missionType === "ADVE_UPDATE" &&
    !pillars["R"] &&
    !pillars["T"]
  ) {
    return {
      batchId: "",
      totalRecos: 0,
      recosByPillar: {},
      errors: [
        {
          pillarKey: "R+T",
          error: "R et T sont vides — lancez d'abord la cascade RTIS.",
        },
      ],
      autoApplied: 0,
    };
  }

  // Load extra context
  let extraContext = "";
  if (missionType === "SESHAT_OBSERVATION" && seshatObservation) {
    extraContext = `Observation Seshat:\n${seshatObservation}`;
  }

  // Load vault context for ADVE_UPDATE
  if (missionType === "ADVE_UPDATE") {
    const sources = await db.brandDataSource.findMany({
      where: {
        strategyId,
        processingStatus: { in: ["EXTRACTED", "PROCESSED"] },
      },
      select: { rawContent: true, fileName: true },
      take: 5,
    });
    if (sources.length > 0) {
      const vaultSummary = sources
        .map((s) => `[${s.fileName}] ${(s.rawContent ?? "").slice(0, 500)}`)
        .join("\n");
      extraContext += `\nDocuments Vault:\n${vaultSummary}`;
    }
  }

  // Generate recos per target pillar — PARALLEL
  const results = await Promise.allSettled(
    targets.map(async (key) => {
      const recos = await generateRecosForPillar(
        strategyId,
        key,
        missionType,
        pillars,
        extraContext,
      );
      return { key, recos };
    }),
  );

  const recosByPillar = new Map<string, RawLLMReco[]>();
  const errors: Array<{ pillarKey: string; error: string }> = [];
  const countByPillar: Record<string, number> = {};

  for (const result of results) {
    if (result.status === "fulfilled") {
      recosByPillar.set(result.value.key, result.value.recos);
      countByPillar[result.value.key] = result.value.recos.length;
    } else {
      const key =
        (result.reason as { pillarKey?: string })?.pillarKey ?? "unknown";
      errors.push({
        pillarKey: key,
        error:
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason),
      });
    }
  }

  if (recosByPillar.size === 0) {
    return {
      batchId: "",
      totalRecos: 0,
      recosByPillar: countByPillar,
      errors,
      autoApplied: 0,
    };
  }

  const { batchId, totalRecos, autoApplied } = await persistBatch(
    strategyId,
    missionType,
    recosByPillar,
  );

  // ── Emit Signal for Jehuty / notification system ──
  if (totalRecos > 0) {
    await db.signal.create({
      data: {
        strategyId,
        type: "NOTORIA_BATCH_READY",
        data: {
          batchId,
          missionType,
          totalRecos,
          autoApplied,
          targetPillars: [...recosByPillar.keys()],
          title: `Notoria: ${totalRecos} recommandation(s) ${missionType}`,
          content: `Batch ${missionType} genere avec ${totalRecos} recommandation(s) pour les piliers ${[...recosByPillar.keys()].map(k => k.toUpperCase()).join(", ")}.`,
          urgency: "SOON",
          severity: "info",
        },
      },
    }).catch(() => { /* non-blocking — signal is informational */ });
  }

  return {
    batchId,
    totalRecos,
    recosByPillar: countByPillar,
    errors,
    autoApplied,
  };
}
