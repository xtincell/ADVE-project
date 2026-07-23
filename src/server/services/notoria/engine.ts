/**
 * NOTORIA Engine — Recommendation generation for all 5 mission types.
 *
 * Generates structured, schema-validated recommendations and persists them
 * as Recommendation entities (not JSON arrays in Pillar.pendingRecos).
 */

import { db } from "@/lib/db";
import { callLLM } from "@/server/services/llm-gateway";
import { wrapUntrusted, UNTRUSTED_NOTICE } from "@/server/services/utils/untrusted-content";
import { extractJSON as _extractJSON } from "@/server/services/utils/llm";
import { PILLAR_SCHEMAS } from "@/lib/types/pillar-schemas";
import { findEmptyLeafPaths, buildExampleFromZod, getFieldZod } from "@/lib/types/pillar-maturity-contracts";
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
    system: `${UNTRUSTED_NOTICE}\n\n${system}`,
    prompt,
    caller: "notoria:engine",
    strategyId,
    maxOutputTokens: 8000,
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
  // LOT 1b — contenu pilier (donnée non fiable) balisé anti-injection.
  return wrapUntrusted(`PILIER ${key}`, JSON.stringify(content, null, 2), { max: 8000 });
}

function describeSchemaFields(key: string): string {
  const upperKey = key.toUpperCase() as keyof typeof PILLAR_SCHEMAS;
  const schema = PILLAR_SCHEMAS[upperKey];
  if (!schema) return `Schema non disponible pour ${key}`;
  // Shape EXACTE et PROFONDE — MÊME machinerie que l'auto-filler (`buildExampleFromZod`).
  // L'ancienne version listait des types PLATS (`- prophecy: object`) : le LLM se
  // voyait demander de remplir `prophecy.pioneers` sans jamais voir les sous-clés ni
  // les vraies valeurs d'enum → il inventait des clés (`pioneer` vs `pioneers`,
  // `good/love/paid/skill` vs `love/competence/worldNeed/remuneration`). Ici il reçoit
  // l'arborescence complète avec enums réels → il EXTEND/remplit en profondeur juste.
  return JSON.stringify(buildExampleFromZod(schema), null, 2);
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
          : missionType === "ADVE_INTAKE_PARTIAL"
            ? "INTAKE_RESPONSES"
            : missionType === "ADVE_BOOT_FILL"
              ? "ADVE+ (R+T optional)"
              : "R+T";

  // ── FEW-SHOT block: accepted/applied recos from similar brands ──
  // The ranker (Seshat) returns top-K matches across other strategies.
  // We use them as inspiration only — clearly labeled "do not copy verbatim".
  // Graceful: empty when no embeddings populated yet → block absent, no error.
  let fewShotBlock = "";
  try {
    const { findSimilarAcrossStrategies } = await import(
      "@/server/services/seshat/context-store",
    );
    const similar = await findSimilarAcrossStrategies(strategyId, {
      kinds: ["RECO", "PILLAR_FIELD"],
      topK: 6,
    });
    const relevant = similar.filter(
      (n) => n.pillarKey === targetKey || n.kind === "RECO",
    );
    if (relevant.length > 0) {
      const lines = relevant.slice(0, 6).map((n) => {
        const p = (n.payload ?? {}) as Record<string, unknown>;
        const snippet =
          (typeof p.explain === "string" && p.explain) ||
          (typeof p.value === "string" && p.value) ||
          (typeof p.full === "string" && p.full) ||
          JSON.stringify(p).slice(0, 200);
        return `  · [${n.pillarKey?.toUpperCase() ?? "?"}.${n.field ?? n.kind}] ${String(snippet).slice(0, 220)} (sim=${n.similarity.toFixed(2)})`;
      });
      fewShotBlock = `\n\nINSPIRATION — patterns chez d'autres marques voisines (NE PAS copier verbatim, juste pour calibrer le niveau de détail attendu) :\n${lines.join("\n")}`;
    }
  } catch {
    /* graceful: no ranker / no embeddings → no few-shot, no error */
  }

  // ── Detect empty/missing fields (PRIORITY for recos) — EN PROFONDEUR ──
  // L'ancienne détection ne regardait que le PREMIER niveau du schema
  // (`currentContent[k]`) : un objet `prophecy = {worldTransformed}` comptait
  // « rempli » alors que `pioneers`/`urgency`/`horizon` étaient vides, et une
  // matrice `produitsCatalogue = [{nom}]` masquait ses cellules vides → « la
  // notoria ignore les champs vides ». `findEmptyLeafPaths` (inventaire canonique)
  // descend dans les objets imbriqués, saute les formes union-string legacy, et
  // exclut les champs NEEDS_HUMAN (traction… — jamais fabriqués, interdit n°3).
  const allSchemaKeys = Object.keys(
    (PILLAR_SCHEMAS[targetKey.toUpperCase() as keyof typeof PILLAR_SCHEMAS] as { shape?: Record<string, unknown> })?.shape ?? {},
  );
  const emptyLeaves = findEmptyLeafPaths(targetKey, currentContent);
  const filledFields = allSchemaKeys.filter((k) => {
    const v = currentContent[k];
    return !(v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0));
  });

  // Sépare feuilles de PREMIER niveau (SET) des sous-feuilles imbriquées vides,
  // groupées par objet parent IMMÉDIAT (EXTEND — préserve les sous-champs déjà
  // remplis). CRITIQUE : on groupe par le DERNIER point (`lastIndexOf`), pas le
  // premier — le parent doit être l'objet DIRECT (`pillarGaps.a`), pas le
  // grand-parent (`pillarGaps`). Un EXTEND sur le grand-parent ferait une fusion
  // SUPERFICIELLE d'un niveau (`{...existing, ...proposed}`) qui ÉCRASERAIT un
  // sous-objet frère déjà rempli (`pillarGaps.a.gaps` écrit par l'opérateur) →
  // destruction silencieuse de donnée réelle (interdit n°3). L'EXTEND profond
  // (`field = pillarGaps.a`) fusionne à la bonne feuille via `setNestedValue` et
  // préserve tous les frères. Audit adversarial 2026-07-23.
  const topLevelEmpty = emptyLeaves.filter((l) => !l.path.includes(".")).map((l) => l.path);
  const nestedByParent = new Map<string, string[]>();
  for (const l of emptyLeaves) {
    if (!l.path.includes(".")) continue;
    const dot = l.path.lastIndexOf(".");
    const parent = l.path.slice(0, dot);
    const leaf = l.path.slice(dot + 1);
    if (!nestedByParent.has(parent)) nestedByParent.set(parent, []);
    nestedByParent.get(parent)!.push(leaf);
  }

  // ── Inject Bible format rules for all fields ──
  const bibleInstructions = getFormatInstructions(targetKey, allSchemaKeys);

  const emptyFieldsSection = emptyLeaves.length > 0
    ? `\n⚠️ CHAMPS VIDES A REMPLIR EN PRIORITE (${emptyLeaves.length} feuille(s)):\n` +
      (topLevelEmpty.length > 0
        ? `\nChamps de premier niveau (operation SET, une reco par champ) :\n${topLevelEmpty.map((f) => `  - ${f}`).join("\n")}\n`
        : "") +
      (nestedByParent.size > 0
        ? `\nSous-champs imbriques vides (operation EXTEND sur l'objet parent — preserve les sous-champs deja remplis, une reco EXTEND par parent) :\n${[...nestedByParent.entries()].map(([p, leaves]) => `  - ${p} : ${leaves.join(", ")}`).join("\n")}\n`
        : "") +
      `\nToutes ces feuilles DOIVENT etre remplies. C'est la PRIORITE #1 — ne laisse AUCUNE feuille vide listee ci-dessus.`
    : "\nTous les champs sont remplis en profondeur. Concentre-toi sur l'enrichissement et la correction.";

  const prompt = `SHAPE EXACTE du pilier ${targetKey.toUpperCase()} (arborescence complète, sous-clés + valeurs d'enum RÉELLES — respecte EXACTEMENT cette structure, n'invente aucune clé):
${schemaDesc}

BIBLE DE FORMAT (regles de fond pour chaque champ):
${bibleInstructions}

Pilier ${targetKey.toUpperCase()} actuel (${filledFields.length}/${allSchemaKeys.length} champs remplis):
${JSON.stringify(currentContent, null, 2)}
${emptyFieldsSection}

Contexte source (${sourceLabel}):
${sourceContext}
${extraContext ? `\nContexte supplementaire:\n${extraContext}` : ""}${fewShotBlock}

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

  const recosRaw: RawLLMReco[] = Array.isArray(parsed)
    ? (parsed as RawLLMReco[])
    : (parsed as Record<string, unknown>).recommendations
      ? ((parsed as Record<string, unknown>).recommendations as RawLLMReco[])
      : [];

  // F3 (round-11) : le LLM peut omettre `field` (sortie malformée) — les boucles
  // `reco.field.startsWith(...)`/`.split(...)` plus bas planteraient alors TOUT le
  // batch. On écarte honnêtement les recos sans `field` exploitable (une reco sans
  // cible n'est pas persistable) au lieu de crasher — jamais de champ fabriqué.
  const recos = recosRaw.filter(
    (r): r is RawLLMReco => !!r && typeof r.field === "string" && r.field.trim().length > 0,
  );

  // Validate proposedValues against schema — PROFOND. `getFieldZod` résout les
  // chemins imbriqués (`prophecy.pioneers`) ET les cellules de matrice
  // (`produitsCatalogue[2].gainClientConcret`), là où l'ancien `shape[reco.field]`
  // ne voyait que le premier niveau (une reco profonde n'était jamais validée). On
  // ne valide que les SET (remplacement de champ entier) : ADD/MODIFY portent un
  // ITEM et EXTEND un objet PARTIEL fusionné → les valider contre le schema du champ
  // entier produisait de faux avertissements (bug pré-existant corrigé en passant).
  for (const reco of recos) {
    const op = (reco as { operation?: string }).operation ?? "SET";
    if (op !== "SET") continue;
    const fieldSchema = getFieldZod(targetKey, reco.field) as { safeParse?: (v: unknown) => { success: boolean } } | null;
    if (fieldSchema?.safeParse) {
      const result = fieldSchema.safeParse(reco.proposedValue);
      if (!result.success) {
        (reco as unknown as Record<string, unknown>)._validationWarning = `Format ne correspond pas au schema pour "${reco.field}"`;
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

  // ── ADR-0090 — contexte de simulation chargé UNE fois par batch ──
  // Ruler déterministe par champ + preview d'impact score, zéro LLM.
  const { loadContentsAndWeights, previewCandidateImpact } = await import("./preview-impact");
  const { evaluateField, computeRecoWeightedScore, compareForReplacement } = await import("./rulers");
  const simCtx = await loadContentsAndWeights(strategyId).catch(() => null);

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

    // ── ADR-0090 — verdict ruler + impact simulé + score pondéré ──
    const pillarKeyLower = reco.pillarKey.toLowerCase();
    const operation = reco.operation ?? "SET";
    const rulerVerdict = evaluateField(pillarKeyLower, reco.field, reco.proposedValue);
    const scoreImpactEstimate = simCtx
      ? previewCandidateImpact(simCtx.contents, simCtx.weights, {
          targetPillarKey: pillarKeyLower,
          targetField: reco.field,
          operation,
          proposedValue: reco.proposedValue,
        })
      : null;
    const weightedScore = computeRecoWeightedScore({
      rulerScore: rulerVerdict.score,
      scoreImpactEstimate,
      confidence: reco.confidence ?? 0.6,
    });

    // Gate de remplacement à la génération : si la valeur EN PLACE bat la
    // proposition, on ne bloque pas le catalogue (Notoria catalogue tout)
    // mais on force requires_review + warning visible. Le blocage dur vit
    // dans lifecycle.applyRecos.
    let rulerWarning: string | undefined;
    if (simCtx && (operation === "SET" || operation === "MODIFY")) {
      const currentValue = (simCtx.contents[pillarKeyLower as keyof typeof simCtx.contents] as Record<string, unknown> | null | undefined)?.[
        reco.field.split(".")[0] ?? reco.field
      ];
      const cmp = compareForReplacement({
        pillarKey: pillarKeyLower,
        field: reco.field,
        oldValue: currentValue,
        newValue: reco.proposedValue,
        confidence: reco.confidence ?? 0.6,
        scoreImpactEstimate,
      });
      if (!cmp.replaceAllowed) {
        gateResult.applyPolicy = "requires_review";
        rulerWarning = cmp.reason;
      }
    }

    const validationWarning = [
      (reco as Record<string, unknown>)._validationWarning as string | undefined,
      rulerWarning,
      ...(finResult.warnings ?? []),
    ]
      .filter(Boolean)
      .join("; ") || undefined;

    await db.recommendation.create({
      data: {
        strategyId,
        targetPillarKey: reco.pillarKey.toLowerCase(),
        targetField: reco.field,
        operation,
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
        rulerScore: rulerVerdict.score,
        rulerVerdict: rulerVerdict as unknown as Prisma.InputJsonValue,
        scoreImpactEstimate,
        weightedScore,
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

  // Validate prerequisites — ADVE_UPDATE is the ONLY mission that requires R+T.
  // ADVE_INTAKE_PARTIAL and ADVE_BOOT_FILL are explicitly designed to run
  // without R+T and source from intake responses + extracted pillar values.
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
          error: "R et T sont vides — lancez d'abord la cascade RTIS, ou utilisez ADVE_INTAKE_PARTIAL / ADVE_BOOT_FILL selon la phase.",
        },
      ],
      autoApplied: 0,
    };
  }

  // Load extra context — ALWAYS start with country/currency so the LLM never
  // produces recommendations in EUR for an African market (the historical
  // bug). The country lookup is canonical (DB-backed via country-registry);
  // a missing country throws — no silent fallback.
  let extraContext = "";
  {
    const strategy = await db.strategy.findUnique({
      where: { id: strategyId },
      select: { countryCode: true, currencyCode: true, businessContext: true, brandNature: true },
    });
    const bc = (strategy?.businessContext ?? {}) as {
      country?: string;
      sector?: string;
      businessModel?: string;
      positioning?: string;
      economicModel?: string;
    };
    const ctxCountry = bc.country ?? undefined;
    const codeOrName = strategy?.countryCode ?? ctxCountry;

    // ADR-0030 PR-Fix-2 — bloc "FAITS DÉCLARÉS — CONTRAINTE DURE" avant
    // toute autre injection de contexte. Empêche l'AI d'halluciner une
    // nationalité, un business model ou un secteur qui contredit la
    // déclaration d'intake (ex: "marque française" sur strategy WK).
    // Cohérent avec quick-intake/extractStructuredPillarContent §7.
    const facts: string[] = [];
    if (bc.sector) facts.push(`SECTEUR        : ${bc.sector}`);
    if (codeOrName) facts.push(`PAYS / MARCHÉ  : ${codeOrName}`);
    if (bc.businessModel) facts.push(`MODÈLE BUSINESS: ${bc.businessModel}`);
    if (bc.positioning) facts.push(`POSITIONNEMENT : ${bc.positioning}`);
    if (bc.economicModel) facts.push(`MODÈLE ÉCO     : ${bc.economicModel}`);
    if (strategy?.brandNature) facts.push(`NATURE DE MARQUE: ${strategy.brandNature}`);
    if (facts.length > 0) {
      extraContext += `FAITS DÉCLARÉS — CONTRAINTE DURE :\n${facts.join("\n")}\n\nCONTRAINTE : la marque opère dans le secteur, pays, modèle business et positionnement déclarés ci-dessus. Toute proposition (description, persona, concurrent, exemple, narrative) DOIT être cohérente avec ces faits. JAMAIS générer "française" pour une marque WK, "cosmétique" pour un secteur IMMOBILIER, ou inventer une nationalité/modèle économique absent des faits. Si une réponse libre suggère un autre univers, IGNORE-LA — les faits déclarés priment toujours.\n\n`;
    }

    if (codeOrName) {
      try {
        const { lookupCountry } = await import("@/server/services/country-registry");
        const c = await lookupCountry(codeOrName);
        if (c) {
          extraContext += `MARCHE CIBLE: ${c.name} (${c.code}). MONNAIE: ${c.currency.code} (${c.currency.symbol}). Indice de pouvoir d'achat: ${c.purchasingPowerIndex}/100 (Cameroun=100). Langue dominante: ${c.primaryLanguage.toUpperCase()}.\nIMPORTANT: tous les montants/prix/budgets dans tes recommandations DOIVENT etre exprimes en ${c.currency.code} (${c.currency.symbol}). Ne jamais proposer en EUR ou USD si le marche cible utilise une autre monnaie.\n\n`;
        }
      } catch {
        // country-registry unavailable in this build path — leave extraContext untouched.
      }
    }
  }
  if (missionType === "SESHAT_OBSERVATION" && seshatObservation) {
    // round-15a : fencé (parité avec serializePillar l.59) — observation externe non
    // fiable (OWASP LLM01). Sink = queue Recommendation gatée, mais l'input reste non fiable.
    extraContext += wrapUntrusted("Observation Seshat", seshatObservation, { max: 4000 });
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
      // round-15a : contenu de documents opérateur-uploadés → fencé (parité avec
      // serializePillar). `rawContent` est non fiable (OWASP LLM01).
      extraContext += `\n${wrapUntrusted("Documents Vault", vaultSummary, { max: 4000 })}`;
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

  // ── Emit Signal for Jehuty feed + notify recipients via Anubis (ADR-0031) ──
  if (totalRecos > 0) {
    const targetPillars = [...recosByPillar.keys()];
    const title = `Notoria: ${totalRecos} recommandation(s) ${missionType}`;
    const content = `Batch ${missionType} genere avec ${totalRecos} recommandation(s) pour les piliers ${targetPillars.map(k => k.toUpperCase()).join(", ")}.`;

    const signal = await db.signal.create({
      data: {
        strategyId,
        type: "NOTORIA_BATCH_READY",
        data: {
          batchId,
          missionType,
          totalRecos,
          autoApplied,
          targetPillars,
          title,
          content,
          urgency: "SOON",
          severity: "info",
        },
      },
    }).catch(() => null);

    if (signal) {
      const { notifyOnFeedSignal } = await import("@/server/services/anubis/feed-bridge");
      await notifyOnFeedSignal({
        signalId: signal.id,
        signalType: "NOTORIA_BATCH_READY",
        strategyId,
        title,
        body: content,
        link: `/cockpit/notoria?batch=${batchId}`,
      }).catch(() => { /* non-blocking — feed-bridge swallows its own errors */ });
    }
  }

  return {
    batchId,
    totalRecos,
    recosByPillar: countByPillar,
    errors,
    autoApplied,
  };
}
