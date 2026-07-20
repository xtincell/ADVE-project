import { ADVE_STORAGE_KEYS } from "@/domain";

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
import { writePillar } from "@/server/services/pillar-gateway";

const MODEL = "claude-sonnet-4-20250514";
const TIMEOUT_MS = 45_000;

/**
 * Benchmarks sectoriels DÉTERMINISTES (PR-K3-ter — dé-LLM des chiffrés).
 *
 * Avant : le prompt demandait au LLM d'"inventer" un benchmark sectoriel
 * plausible pour eNps / indexReputation / turnoverRate / esov / storyEvidence.
 * Ce ne sont PAS des champs llmables : un modèle faible (8B local) y dérive de
 * façon incohérente alors que ce sont des constantes sectorielles connues.
 * On les pose en code, marquées INFERRED comme avant (l'opérateur valide a
 * posteriori). Le LLM ne génère plus que du texte.
 */
interface SectorBenchmarks {
  eNps: number; // score moyen
  indexReputation: number; // /5 (Google Reviews moyen secteur)
  turnoverRate: number; // 0-1 (taux annuel)
  esov: number; // -1..+1 (part de voix excédentaire)
  storytellingPct: number; // 0-100 (evidencePct = 100 - storytellingPct)
}

const DEFAULT_BENCHMARKS: SectorBenchmarks = {
  eNps: 30,
  indexReputation: 4.2,
  turnoverRate: 0.15,
  esov: -0.05,
  storytellingPct: 50,
};

// Matching par mot-clé sur le secteur déclaré (texte libre). Première correspondance gagne.
const SECTOR_BENCHMARKS: Array<{ match: string[]; v: SectorBenchmarks }> = [
  { match: ["tech", "saas", "logiciel", "software", "b2b", "digital"], v: { eNps: 30, indexReputation: 4.4, turnoverRate: 0.13, esov: -0.1, storytellingPct: 30 } },
  { match: ["hotel", "hôtel", "hospitality", "restaur", "tourisme", "voyage"], v: { eNps: 50, indexReputation: 4.3, turnoverRate: 0.3, esov: -0.05, storytellingPct: 55 } },
  { match: ["retail", "commerce", "boutique", "magasin", "ecommerce", "e-commerce", "distribution"], v: { eNps: 25, indexReputation: 4.2, turnoverRate: 0.2, esov: -0.05, storytellingPct: 45 } },
  { match: ["mode", "lifestyle", "luxe", "fashion", "cosmet", "beaut", "parfum"], v: { eNps: 35, indexReputation: 4.3, turnoverRate: 0.18, esov: 0.0, storytellingPct: 60 } },
  { match: ["immobil", "real estate", "btp", "construction", "architecture"], v: { eNps: 20, indexReputation: 4.0, turnoverRate: 0.12, esov: -0.05, storytellingPct: 40 } },
  { match: ["sante", "santé", "health", "medical", "médical", "pharma", "bien-être"], v: { eNps: 40, indexReputation: 4.5, turnoverRate: 0.14, esov: -0.05, storytellingPct: 45 } },
  { match: ["finance", "banque", "assur", "fintech", "comptab"], v: { eNps: 25, indexReputation: 4.1, turnoverRate: 0.12, esov: 0.0, storytellingPct: 35 } },
  { match: ["food", "aliment", "agro", "boisson", "épicerie"], v: { eNps: 35, indexReputation: 4.2, turnoverRate: 0.22, esov: -0.05, storytellingPct: 55 } },
  { match: ["éduc", "educ", "formation", "school", "edtech"], v: { eNps: 45, indexReputation: 4.4, turnoverRate: 0.16, esov: -0.05, storytellingPct: 50 } },
];

function pickBenchmarks(sector: string | null): SectorBenchmarks {
  if (!sector) return DEFAULT_BENCHMARKS;
  const s = sector.toLowerCase();
  for (const row of SECTOR_BENCHMARKS) {
    if (row.match.some((m) => s.includes(m))) return row.v;
  }
  return DEFAULT_BENCHMARKS;
}

/**
 * Pose les chiffrés des piliers A et D de façon déterministe (benchmarks
 * sectoriels). Le LLM ne génère plus ces valeurs ; buildPillarPatch n'écrase
 * jamais une valeur déjà saisie par l'opérateur, donc les benchmarks ne
 * remplissent que les champs vides.
 */
function applyDeterministicBenchmarks(parsed: InferredAdveFields, sector: string | null): void {
  const b = pickBenchmarks(sector);
  const a = parsed.a ?? (parsed.a = {});
  a.eNps = { score: b.eNps, frequency: "ANNUAL" };
  a.indexReputation = { source: "GOOGLE_REVIEWS", score: b.indexReputation };
  a.turnoverRate = b.turnoverRate;
  const d = parsed.d ?? (parsed.d = {});
  d.esov = { value: b.esov, measurementMethod: "benchmark sectoriel à valider" };
  d.storyEvidenceRatio = { storytellingPct: b.storytellingPct, evidencePct: 100 - b.storytellingPct };
}

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
    // ADR-0037 PR-K3-bis — politique repo (ADR-0035 + NEEDS_HUMAN_BY_PILLAR
    // vide) : tout est inférable. Le LLM propose, marker INFERRED, opérateur
    // valide a posteriori. Les chiffres sont des HYPOTHÈSES sectorielles à
    // valider, pas des inventions.
    messieFondateur?: {
      nom?: string;
      role?: string;
      narrative?: string;
    };
    competencesDivines?: Array<{
      competence: string;
      justification?: string;
      exclusivityProof?: string;
    }>;
    preuvesAuthenticite?: Array<{
      type: "heritage" | "certification" | "recognition" | "press" | "datapoint";
      claim: string;
      evidence?: string;
      source?: string;
    }>;
    indexReputation?: {
      source: "GOOGLE_REVIEWS" | "TRUSTPILOT" | "NPS" | "YELP" | "TRIPADVISOR" | "OTHER";
      score?: number;
      sampleSize?: number;
    };
    eNps?: {
      score?: number;
      sampleSize?: number;
      frequency?: "QUARTERLY" | "ANNUAL";
    };
    turnoverRate?: number;
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
    // `esov` : jamais généré par le LLM (interdit au prompt) — posé en CODE
    // depuis le benchmark sectoriel déterministe, `measurementMethod:
    // "benchmark sectoriel à valider"` (étiquetage honnête).
    esov?: {
      value: number;
      measurementMethod?: string;
    };
    storyEvidenceRatio?: {
      storytellingPct: number;
      evidencePct: number;
      target?: string;
    };
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
    // `roiProofs` RETIRÉ de l'inférence (2026-07-20, ADR-0163) : une preuve
    // ROI chiffrée est de la DONNÉE RÉELLE (comme traction, exclue par
    // doctrine) — la drafter fabrique des « +300 % » et attestations fictives
    // qui gonflent le score V et s'affichent au client comme extraites.
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
    clergeStructure?: {
      communityManager?: { name: string; role: string; status: "FULL_TIME" | "PART_TIME" | "VOLUNTEER" } | null;
      ambassadeurs?: Array<{ name: string; tier?: "ALPHA" | "BETA" | "MICRO" }>;
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
N'invente JAMAIS de nationalité, secteur, modèle économique ou positionnement absent des faits fournis. Si la marque déclare "Pays = WK" (Wakanda), n'écris jamais "française". Si "Secteur = immobilier", n'écris jamais "cosmétique". Si un fait textuel est inconnu ET non déductible des faits déclarés, OMETS le champ (ne le remplis pas avec une valeur générique inventée).

CONTRAINTE — ADR-0037 PR-K3-bis (politique repo : tout est inférable) :
Le marqueur INFERRED dans Pillar.fieldCertainty (ADR-0032 + ADR-0035) est conçu précisément pour qu'un draft IA soit posé sur un champ, l'opérateur valide ou amend a posteriori. Tu DOIS donc inférer les champs TEXTUELS et NOMINAUX du framework ADVE (archetype, noyauIdentitaire, missionStatement, originMyth, messieFondateur, competencesDivines, positionnement, personas, produitsCatalogue, businessModel, etc.). Un draft imparfait + marker INFERRED + opérateur qui valide = mieux qu'un champ vide.

NE GÉNÈRE AUCUN CHIFFRE (eNps, indexReputation, esov, turnoverRate, storyEvidenceRatio) : ces valeurs sont posées automatiquement par le système à partir de benchmarks sectoriels déterministes — ne les inclus PAS dans ton JSON. Pour les nominaux non-déclarés (messieFondateur.nom), utilise "Founder de [marque]" en placeholder explicite.

FORMAT DE SORTIE — STRICT JSON, sans markdown :
{
  "a": {
    "archetype": "<un seul archétype Jung+Pearson : Innocent, Sage, Explorer, Outlaw, Magician, Hero, Lover, Jester, Everyman, Caregiver, Ruler, Creator>",
    "noyauIdentitaire": "<phrase 15-40 mots qui capture l'essence identitaire de la marque>",
    "missionStatement": "<phrase 12-25 mots commençant par un verbe d'action — comment la marque réalise sa Vision>",
    "originMyth": {
      "elevator": "<récit fondateur 30-50 mots — la lutte concrète qui a engendré la marque>"
    },
    "messieFondateur": {
      "nom": "<nom du fondateur si déclaré, sinon 'Founder de [marque]' en placeholder>",
      "role": "<CEO, Fondateur, Visionnaire, etc.>",
      "narrative": "<50+ chars : pourquoi cette personne incarne la marque>"
    },
    "competencesDivines": [
      { "competence": "<phrase 50+ chars : ce que SEULE la marque peut accomplir>", "justification": "<pourquoi nous seuls>", "exclusivityProof": "<preuve à valider, peut être à remplir par opérateur>" }
    ],
    "preuvesAuthenticite": [
      { "type": "heritage|certification|recognition|press|datapoint", "claim": "<phrase>", "evidence": "<référence à valider>", "source": "<source à compléter>" }
    ]
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
    },
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
    },
    "clergeStructure": {
      "communityManager": { "name": "<placeholder ou réel>", "role": "Community Manager", "status": "FULL_TIME|PART_TIME|VOLUNTEER" },
      "ambassadeurs": [{ "name": "<placeholder Ambassadeur 1>", "tier": "ALPHA|BETA|MICRO" }]
    }
  }
}

Si tu manques TOTALEMENT de contexte (sectoral + déclaratif) sur un champ, OMETS-le. Sinon, propose un draft INFERRED même imparfait — l'opérateur amend a posteriori (ADR-0035). JSON partiel accepté.`;

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
    // PR-K3-ter — chiffrés posés de façon déterministe (le LLM ne les génère plus).
    applyDeterministicBenchmarks(parsed, intake.sector);
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
    where: { strategyId, key: { in: [...ADVE_STORAGE_KEYS] } },
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

    // C2 reroute (PROPAGATION-MAP §6b) — content write goes through the gateway
    // (REPLACE_FULL, author AUTO_FILLER, targetStatus AI_PROPOSED) : Zod validation
    // + PillarVersion + staleness cascade + author trail. fieldCertainty is metadata
    // (not pillar content) — the gateway doesn't manage it, so it's written separately
    // (metadata-only update, not a content bypass). LOCKED pillars are now protected.
    const res = await writePillar({
      strategyId,
      pillarKey: key,
      operation: { type: "REPLACE_FULL", content: patch.content as unknown as Record<string, unknown> },
      author: { system: "AUTO_FILLER", reason: "Inférence needs-human fields (C2 reroute via gateway)" },
      options: { targetStatus: "AI_PROPOSED" },
    });
    if (!res.success) continue;
    await db.pillar.update({
      where: { id: pillar.id },
      data: { fieldCertainty: patch.fieldCertainty },
    });

    totalInferred += patch.count;
  }

  return { ok: true, fieldsInferred: totalInferred };
}
