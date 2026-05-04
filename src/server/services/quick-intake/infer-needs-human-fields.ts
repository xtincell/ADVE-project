/**
 * infer-needs-human-fields.ts — LLM inference pass for the 7 ADVE fields
 * marked `derivable: false` in pillar-maturity-contracts (PR-C, ADR-0035).
 *
 * Why this exists:
 * Before PR-C, the cockpit pillar pages displayed a "champs essentiels à
 * saisir" panel with 2-7 empty fields per ADVE pillar that the operator had
 * to fill manually. Friction killed adoption — most brands ended up with
 * incomplete A/D/V/E pillars and downstream forges (Notoria, Artemis)
 * starved on missing context.
 *
 * Decision: pre-fill these fields with LLM-inferred values at activateBrand
 * time, marked with `certainty="INFERRED"` (per-field, stored in
 * `Pillar.fieldCertainty`). The operator can then validate, edit, or replace
 * each value — but the document is no longer empty by default.
 *
 * 7 target fields:
 *   - a.archetype          (string, brand archetype like "Hero", "Magician", "Outlaw"…)
 *   - a.noyauIdentitaire   (string, 10+ chars — identity core)
 *   - d.positionnement     (string, 10+ chars — positioning)
 *   - d.promesseMaitre     (string, 5+ chars — master promise)
 *   - d.personas           (array of objects, ≥1 persona)
 *   - v.produitsCatalogue  (array, ≥1 product/service)
 *   - v.businessModel      (string, business model name like "SaaS", "B2B", "marketplace"…)
 *
 * The pass:
 *   1. Reads QuickIntake (responses + companyName + sector + country +
 *      businessModel + positioning + rawText).
 *   2. Calls Claude Sonnet 4 with a structured prompt that returns strict JSON.
 *   3. Validates the response shape (defensive — LLM can drift).
 *   4. Merges into the 3 affected Pillar.content rows (a, d, v) and writes
 *      Pillar.fieldCertainty = { <path>: "INFERRED" } for each filled field.
 *
 * Invocation:
 *   - Fire-and-forget from activateBrand AFTER pillar.create succeeds.
 *   - Wrapped in try/catch: a failed inference does NOT block activation.
 *
 * Non-goals:
 *   - Doesn't touch RTIS pillars (they're derived later).
 *   - Doesn't touch the `derivable: true` fields (auto-filler handles those
 *     from BrandDataSource extraction).
 */

import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

const MODEL = "claude-sonnet-4-20250514";
const TIMEOUT_MS = 45_000;

export interface InferenceResult {
  /** Whether the LLM call succeeded and at least one field was inferred. */
  ok: boolean;
  /** Number of fields actually populated (max 7). */
  fieldsInferred: number;
  /** Error message if ok=false. */
  error?: string;
}

interface InferredAdveFields {
  a?: {
    archetype?: string;
    noyauIdentitaire?: string;
    // ADR-0037 PR-K3 — fields canon manuel inférables narratifs
    missionStatement?: string;
    originMyth?: {
      elevator?: string;
      storytelling?: string;
    };
  };
  d?: {
    positionnement?: string;
    promesseMaitre?: string;
    personas?: Array<{ name: string; description: string }>;
    // ADR-0037 PR-K3
    positionnementEmotionnel?: string;
    swotFlash?: {
      strength?: string;
      weakness?: string;
      opportunity?: string;
      threat?: string;
    };
    barriersImitation?: Array<{
      barrier: string;
      defensibility?: "LOW" | "MEDIUM" | "HIGH";
      category?: "data" | "network" | "brand" | "process" | "cost";
    }>;
  };
  v?: {
    produitsCatalogue?: Array<{ name: string; description: string }>;
    businessModel?: string;
    // ADR-0037 PR-K3
    sacrificeRequis?: {
      prix?: string;
      temps?: string;
      effort?: string;
      justification?: string;
    };
    packagingExperience?: {
      sensoryNotes?: string;
      packagingMaterial?: "premium" | "standard" | "eco";
      deliveryMode?: "express" | "standard" | "event";
    };
  };
  e?: {
    // ADR-0037 PR-K3 — pilier E intégré au flux d'inférence (était exclu avant)
    pelerinages?: Array<{
      name: string;
      frequency?: "ANNUAL" | "BIANNUAL" | "QUARTERLY";
      location?: string;
    }>;
    programmeEvangelisation?: {
      referralProgram?: { incentive: string };
      brandAdvocacyProgram?: { tiers?: string[]; rewards?: string };
    };
    communityBuilding?: {
      platforms?: Array<{
        name: string;
        type: "DISCORD" | "SLACK" | "FACEBOOK_GROUP" | "FORUM" | "CIRCLE" | "OTHER";
      }>;
    };
  };
}

/**
 * Validate the LLM response shape. Defensive — the model can return partial
 * or malformed JSON. We accept partial responses (each field is independent).
 */
function isValidInferredFields(value: unknown): value is InferredAdveFields {
  if (!value || typeof value !== "object") return false;
  // Top-level shape: at most { a, d, v } objects. Extra keys ignored.
  return true;
}

/**
 * Build the Prisma update payload for one pillar:
 *   - merges new field values into existing content
 *   - marks each newly-set path as INFERRED in fieldCertainty
 * Returns null if no fields to set.
 */
function buildPillarPatch(
  existingContent: Record<string, unknown>,
  existingCertainty: Record<string, string>,
  pillarKey: "a" | "d" | "v" | "e",
  inferred: Record<string, unknown> | undefined,
): { content: Prisma.InputJsonValue; fieldCertainty: Prisma.InputJsonValue; count: number } | null {
  if (!inferred || Object.keys(inferred).length === 0) return null;

  const newContent = { ...existingContent };
  const newCertainty = { ...existingCertainty };
  let count = 0;

  for (const [field, value] of Object.entries(inferred)) {
    // Skip if operator already filled (INFERRED never overwrites DECLARED/OFFICIAL).
    const currentValue = newContent[field];
    if (currentValue !== undefined && currentValue !== null && currentValue !== "" &&
        !(Array.isArray(currentValue) && currentValue.length === 0)) {
      continue;
    }
    if (value === undefined || value === null) continue;
    newContent[field] = value;
    newCertainty[`${pillarKey}.${field}`] = "INFERRED";
    count++;
  }

  if (count === 0) return null;

  return {
    content: newContent as Prisma.InputJsonValue,
    fieldCertainty: newCertainty as Prisma.InputJsonValue,
    count,
  };
}

const SYSTEM_PROMPT = `Tu es un stratège marketing senior. Pour la marque décrite, tu produis un draft INITIAL des champs identitaires du framework ADVE (Authenticité / Distinction / Valeur / Engagement). Ces drafts seront ensuite validés ou réécrits par l'opérateur humain — tu n'as pas à être parfait, mais tu dois proposer des valeurs cohérentes, ancrées dans les faits déclarés, et utiles comme point de départ.

CONTRAINTE DURE — FAITS DÉCLARÉS :
N'invente JAMAIS de nationalité, secteur, modèle économique ou positionnement absent des faits fournis. Si la marque déclare "Pays = WK" (Wakanda), n'écris jamais "française". Si "Secteur = immobilier", n'écris jamais "cosmétique". Si un fait est inconnu, propose une valeur générique cohérente avec le sectoral mais explicite-le ("à valider", "hypothèse de travail").

CONTRAINTE — ADR-0037 PR-K3 (champs canon manuel ADVE) :
- Pour les champs CHIFFRÉS exigeant une mesure réelle (eNps, indexReputation, esov, turnoverRate, roiProofs avec lift quantifié) → NE PAS inférer. Ces champs nécessitent des données opérateur.
- Pour les champs NOMINAUX humains (messieFondateur.nom, equipeDirigeante[].nom, preuvesAuthenticite avec sources réelles) → NE PAS inférer.
- En revanche, infère les champs NARRATIFS / STRATÉGIQUES dont la valeur est dérivable du contexte sectoral + déclaratif (originMyth.elevator, missionStatement, positionnementEmotionnel, swotFlash, barriersImitation, sacrificeRequis, packagingExperience, pelerinages, programmeEvangelisation, communityBuilding).

FORMAT DE SORTIE — STRICT JSON, sans markdown :
{
  "a": {
    "archetype": "<un seul archétype Jung+Pearson : Innocent, Sage, Explorer, Outlaw, Magician, Hero, Lover, Jester, Everyman, Caregiver, Ruler, Creator>",
    "noyauIdentitaire": "<phrase 15-40 mots qui capture l'essence identitaire de la marque>",
    "missionStatement": "<phrase 12-25 mots commençant par un verbe d'action — comment la marque réalise sa Vision>",
    "originMyth": {
      "elevator": "<récit fondateur 30-50 mots — la lutte concrète qui a engendré la marque>"
    }
  },
  "d": {
    "positionnement": "<phrase 15-30 mots, format 'Pour [cible], [marque] est [catégorie] qui [bénéfice unique], parce que [raison de croire]'>",
    "promesseMaitre": "<phrase 8-15 mots qui exprime la promesse maître au client>",
    "personas": [
      { "name": "<prénom + adjectif identifiant>", "description": "<2-3 phrases qui campent le persona : âge, contexte, douleur, désir>" }
    ],
    "positionnementEmotionnel": "<phrase à la 1ère personne ≤200 chars : 'Je me sens X', l'émotion principale déclenchée chez l'audience>",
    "swotFlash": {
      "strength": "<1 phrase ≤120 chars>",
      "weakness": "<1 phrase ≤120 chars>",
      "opportunity": "<1 phrase ≤120 chars>",
      "threat": "<1 phrase ≤120 chars>"
    },
    "barriersImitation": [
      { "barrier": "<phrase ≥40 chars qui décrit la barrière>", "defensibility": "LOW|MEDIUM|HIGH", "category": "data|network|brand|process|cost" }
    ]
  },
  "v": {
    "produitsCatalogue": [
      { "name": "<nom du produit/service>", "description": "<1-2 phrases sur la valeur livrée>" }
    ],
    "businessModel": "<un terme canonique : SaaS, B2B services, B2C produit, Marketplace, Subscription, Transactional, Freemium, Hybride>",
    "sacrificeRequis": {
      "prix": "<fourchette de prix demandée — peut être null si non-pertinent>",
      "temps": "<temps d'onboarding/usage demandé>",
      "effort": "<effort cognitif/physique demandé>",
      "justification": "<pourquoi ce sacrifice vaut le coup pour le client>"
    },
    "packagingExperience": {
      "sensoryNotes": "<description courte de l'expérience d'unboxing/découverte>",
      "packagingMaterial": "premium|standard|eco",
      "deliveryMode": "express|standard|event"
    }
  },
  "e": {
    "pelerinages": [
      { "name": "<nom de l'événement majeur>", "frequency": "ANNUAL|BIANNUAL|QUARTERLY", "location": "<ville ou 'virtual'>" }
    ],
    "programmeEvangelisation": {
      "referralProgram": { "incentive": "<récompense pour parrainage>" }
    },
    "communityBuilding": {
      "platforms": [
        { "name": "<nom>", "type": "DISCORD|SLACK|FACEBOOK_GROUP|FORUM|CIRCLE|OTHER" }
      ]
    }
  }
}

Si tu manques de contexte sur un champ, OMETS-le plutôt que d'inventer. JSON partiel accepté. Ne propose pas eNps, indexReputation, esov, turnoverRate, messieFondateur.nom, competencesDivines, preuvesAuthenticite, roiProofs (champs needsHuman strict).`;

function buildUserPrompt(intake: {
  companyName: string;
  sector: string | null;
  country: string | null;
  businessModel: string | null;
  positioning: string | null;
  rawText: string | null;
  responses: unknown;
}): string {
  const lines: string[] = [];
  lines.push(`# Marque : ${intake.companyName}`);
  if (intake.sector) lines.push(`Secteur : ${intake.sector}`);
  if (intake.country) lines.push(`Pays : ${intake.country}`);
  if (intake.businessModel) lines.push(`Modèle business déclaré : ${intake.businessModel}`);
  if (intake.positioning) lines.push(`Positionnement déclaré : ${intake.positioning}`);

  if (intake.rawText && intake.rawText.trim()) {
    lines.push("\n## Texte libre fondateur");
    lines.push(intake.rawText.trim());
  }

  if (intake.responses && typeof intake.responses === "object") {
    lines.push("\n## Réponses au formulaire d'intake");
    const responses = intake.responses as Record<string, unknown>;
    for (const [pillarKey, pillarData] of Object.entries(responses)) {
      if (!pillarData || typeof pillarData !== "object") continue;
      lines.push(`\n### Pilier ${pillarKey.toUpperCase()}`);
      for (const [field, value] of Object.entries(pillarData as Record<string, unknown>)) {
        if (typeof value === "string" && value.trim()) {
          lines.push(`- ${field} : ${value.trim()}`);
        }
      }
    }
  }

  lines.push("\n# Génère le JSON ADVE conforme au format imposé. Aucun préambule, aucun markdown, juste le JSON.");
  return lines.join("\n");
}

export async function inferNeedsHumanFields(intakeId: string): Promise<InferenceResult> {
  const intake = await db.quickIntake.findUnique({
    where: { id: intakeId },
    select: {
      id: true,
      convertedToId: true,
      companyName: true,
      sector: true,
      country: true,
      businessModel: true,
      positioning: true,
      rawText: true,
      responses: true,
    },
  });

  if (!intake) return { ok: false, fieldsInferred: 0, error: "intake_not_found" };
  if (!intake.convertedToId) return { ok: false, fieldsInferred: 0, error: "intake_not_converted" };

  const strategyId = intake.convertedToId;

  // Call the LLM with a hard timeout — never let inference hang the activation.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let parsed: InferredAdveFields;
  try {
    const result = await generateText({
      model: anthropic(MODEL),
      system: SYSTEM_PROMPT,
      prompt: buildUserPrompt(intake),
      maxOutputTokens: 1500,
      temperature: 0.4,
      abortSignal: controller.signal,
    });
    clearTimeout(timer);

    // Strip any accidental markdown fence the model may add despite instructions.
    const raw = result.text.trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    const obj: unknown = JSON.parse(raw);
    if (!isValidInferredFields(obj)) {
      return { ok: false, fieldsInferred: 0, error: "invalid_llm_response_shape" };
    }
    parsed = obj;
  } catch (err) {
    clearTimeout(timer);
    return {
      ok: false,
      fieldsInferred: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // ADR-0037 PR-K3 — Load all 4 ADVE pillars (E now part of inference flow).
  const pillars = await db.pillar.findMany({
    where: { strategyId, key: { in: ["a", "d", "v", "e"] } },
    select: { id: true, key: true, content: true, fieldCertainty: true },
  });

  let totalInferred = 0;

  for (const pillar of pillars) {
    const key = pillar.key as "a" | "d" | "v" | "e";
    const existingContent = (pillar.content as Record<string, unknown> | null) ?? {};
    const existingCertainty = (pillar.fieldCertainty as Record<string, string> | null) ?? {};
    const inferredForKey = parsed[key] as Record<string, unknown> | undefined;

    const patch = buildPillarPatch(existingContent, existingCertainty, key, inferredForKey);
    if (!patch) continue;

    await db.pillar.update({
      where: { id: pillar.id },
      data: {
        content: patch.content,
        fieldCertainty: patch.fieldCertainty,
        // Bump validationStatus to AI_PROPOSED so the cockpit shows a hint
        // that something other than pure operator input is in there.
        validationStatus: "AI_PROPOSED",
      },
    });

    totalInferred += patch.count;
  }

  return { ok: true, fieldsInferred: totalInferred };
}
