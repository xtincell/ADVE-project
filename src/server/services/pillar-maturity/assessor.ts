import { PILLAR_STORAGE_KEYS } from "@/domain";

/**
 * Maturity Assessor — Evaluates pillar content against the completion contract.
 *
 * Pure functions: no side effects, no DB writes, no AI calls.
 * Loads pillars once via PillarResolver, then computes everything in memory.
 */

import { db } from "@/lib/db";
import { resolvePillarPath } from "@/lib/pillar-path";
import type {
  MaturityStage,
  FieldRequirement,
  PillarMaturityContract,
  PillarAssessment,
  StrategyMaturityReport,
} from "@/lib/types/pillar-maturity";
import { MATURITY_ORDER } from "@/lib/types/pillar-maturity";
import { findEmptyLeafPaths } from "@/lib/types/pillar-maturity-contracts";
import { getContracts } from "./contracts-loader";

// ─── Field Validation ───────────────────────────────────────────────────────
//
// La résolution de chemin (dot-path + array-index, ex. `produitsCatalogue[2].nom`)
// vient de la feuille partagée `@/lib/pillar-path` — l'ex-`resolvePath` local était
// object-only (`split(".")`), aveugle aux cellules de matrice.

/**
 * Check if a field requirement is satisfied by the pillar content.
 */
function isFieldSatisfied(content: Record<string, unknown>, req: FieldRequirement): boolean {
  const value = resolvePillarPath(content, req.path);

  switch (req.validator) {
    case "non_empty":
      if (value === null || value === undefined) return false;
      if (typeof value === "string" && value.trim() === "") return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;

    case "min_length":
      return typeof value === "string" && value.length >= (req.validatorArg ?? 1);

    case "min_items": {
      if (!Array.isArray(value) || value.length < (req.validatorArg ?? 1)) return false;
      // Si on connaît la shape des items (ZodArray<ZodObject>), on rejette
      // les items qui ne contiennent AUCUNE des sub-keys attendues. Sans
      // ça, herosJourney/valeurs avec items {description,defis,...} (au
      // lieu de {actNumber,title,narrative}) passent et restent invisibles
      // dans l'UI.
      if (req.expectedKeys && req.expectedKeys.length > 0) {
        const validItems = value.filter((item) => {
          if (typeof item !== "object" || item === null) return false;
          const itemKeys = Object.keys(item as Record<string, unknown>);
          if (itemKeys.length === 0) return false;
          const intersection = itemKeys.filter((k) => req.expectedKeys!.includes(k));
          if (intersection.length === 0) return false;
          // Au moins une required key doit être présente si requiredKeys est fourni
          if (req.requiredKeys && req.requiredKeys.length > 0) {
            const hasAtLeastOneRequired = itemKeys.some((k) => req.requiredKeys!.includes(k));
            if (!hasAtLeastOneRequired) return false;
          }
          return true;
        });
        return validItems.length >= (req.validatorArg ?? 1);
      }
      return true;
    }

    case "array_items_complete": {
      // Profondeur matrice : le tableau doit avoir ≥1 item ET CHAQUE item doit
      // avoir TOUTES ses feuilles requises renseignées (non vides). C'est ce qui
      // fait qu'une matrice `produitsCatalogue` = [{nom}] compte comme INCOMPLÈTE
      // (les cellules gainClientConcret/… manquent) → la notoria les cible.
      // On n'exige que les `requiredItemKeys` (sous-clés non-optionnelles du
      // schema) — jamais les cellules `.optional()` (pas de fabrication forcée).
      //
      // Champ union tableau|record (ex. sacredCalendar = z.union([array, record])) :
      // la forme record (objet non vide) est une forme VALIDE. `requiredItemKeys`
      // provient de la branche tableau du schema, mais la valeur peut être un
      // record → un objet non vide compte comme satisfait (on n'impose la
      // profondeur par item que sur la forme tableau).
      if (!Array.isArray(value)) {
        return typeof value === "object" && value !== null && Object.keys(value).length > 0;
      }
      if (value.length < 1) return false;
      const required = req.requiredItemKeys ?? [];
      if (required.length === 0) return true; // dégrade en "≥1 item"
      const cellFilled = (v: unknown): boolean => {
        if (v === null || v === undefined) return false;
        if (typeof v === "string" && v.trim() === "") return false;
        if (Array.isArray(v) && v.length === 0) return false;
        return true; // 0 / false sont des valeurs légitimes
      };
      return value.every((item) => {
        // Item primitif (string) : forme raccourcie valide des schemas
        // `listOfStringOr(z.object(...))` (principesCommunautaires, taboos…).
        // Une string non vide EST un item rempli — on n'exige les feuilles que
        // lorsque l'item est un objet.
        if (typeof item !== "object" || item === null) return cellFilled(item);
        const rec = item as Record<string, unknown>;
        return required.every((k) => cellFilled(rec[k]));
      });
    }

    case "nested_complete": {
      if (typeof value !== "object" || value === null) return false;
      const obj = value as Record<string, unknown>;
      // Un objet VIDE n'est PAS « complet » : `Object.values({}).every()` est
      // vacuously `true` → il gonflerait `atomesValides`/le score structurel si
      // un contrat câblait un jour `nested_complete` (dormant aujourd'hui — audit
      // round-9). Rejet explicite.
      if (Object.keys(obj).length === 0) return false;
      return Object.values(obj).every(
        v => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)
      );
    }

    case "is_number":
      return typeof value === "number" && !isNaN(value);

    case "is_object": {
      if (typeof value !== "object" || value === null) return false;
      const keys = Object.keys(value as Record<string, unknown>);
      if (keys.length === 0) return false;
      // Si le contrat connaît la shape Zod attendue (expectedKeys), on
      // détecte les shapes corrompues : aucune des keys présentes ne
      // matche la shape attendue → le LLM a inventé des aliases (ex: ikigai
      // {good,love,paid,skill}) → on considère le field comme missing
      // pour forcer la régénération via Enrichir.
      if (req.expectedKeys && req.expectedKeys.length > 0) {
        const intersection = keys.filter((k) => req.expectedKeys!.includes(k));
        if (intersection.length === 0) return false;
        // Mode strict : si la moitié des keys présentes sont hors-shape, on
        // considère la shape corrompue.
        const offShape = keys.length - intersection.length;
        if (offShape > intersection.length) return false;
      }
      return true;
    }

    default:
      return false;
  }
}

// ─── Pillar Assessment ──────────────────────────────────────────────────────

/**
 * Assess a single pillar's maturity against its contract.
 */
export function assessPillar(
  pillarKey: string,
  content: Record<string, unknown> | null,
  contract?: PillarMaturityContract,
): PillarAssessment {
  const ct = contract ?? getContracts()[pillarKey.toLowerCase()];
  if (!ct || !content) {
    return {
      pillarKey,
      currentStage: "EMPTY",
      nextStage: "INTAKE",
      satisfied: [],
      missing: ct?.stages.COMPLETE.map(r => r.path) ?? [],
      derivable: ct?.stages.COMPLETE.filter(r => r.derivable).map(r => r.path) ?? [],
      needsHuman: ct?.stages.COMPLETE.filter(r => !r.derivable).map(r => r.path) ?? [],
      completionPct: 0,
      readyForGlory: false,
    };
  }

  // Check each stage from highest to lowest
  let currentStage: MaturityStage | "EMPTY" = "EMPTY";

  for (const stage of MATURITY_ORDER) {
    const requirements = ct.stages[stage];
    const allSatisfied = requirements.every(req => isFieldSatisfied(content, req));
    if (allSatisfied) {
      currentStage = stage;
    } else {
      break; // Stages are cumulative — if ENRICHED fails, COMPLETE can't pass
    }
  }

  // Compute missing fields against COMPLETE
  const completeReqs = ct.stages.COMPLETE;
  const satisfied: string[] = [];
  const missing: string[] = [];
  const derivable: string[] = [];
  const needsHuman: string[] = [];

  for (const req of completeReqs) {
    if (isFieldSatisfied(content, req)) {
      satisfied.push(req.path);
    } else {
      missing.push(req.path);
      if (req.derivable) derivable.push(req.path);
      else needsHuman.push(req.path);
    }
  }

  // ── Profondeur HONNÊTE (réconciliation UI ↔ détecteur) ────────────────────
  // Le contrat valide un objet imbriqué avec `is_object` (« présent + ≥1 clé »)
  // → il est STRUCTURELLEMENT AVEUGLE aux sous-feuilles REQUISES vides
  // (`tonDeVoix.onNeditPas`, `ikigai.love`, `aarrr.*`…). D'où le symptôme récurrent
  // « 100 % Complet + tout rempli + champ visiblement vide » (22 feuilles / 6
  // piliers à l'audit). On réconcilie ICI l'assessment UI (%, stage, missing,
  // derivable) avec la source canonique de « feuille vide » = `findEmptyLeafPaths`.
  //
  // INVARIANT DE DÉCOUPLAGE (ADR-0102) : on NE touche NI `satisfied` NI le contrat
  // (`completeReqs`). Le score structurel les lit (`advertis-scorer/structural`) et
  // reste GELÉ — la maturité (chip/% honnête) et le score (palier) sont deux axes
  // distincts (cf. CLAUDE.md). Anti-fabrication (interdit n°3) : un NOMBRE requis
  // vide → `needsHuman` (donnée réelle/dérivée, jamais fabriquée par LLM), jamais
  // `derivable`. `findEmptyLeafPaths` exclut déjà NEEDS_HUMAN + COMPLETE_OPTIONAL.
  const deepSeen = new Set<string>();
  for (const leaf of findEmptyLeafPaths(pillarKey, content)) {
    if (leaf.optional || !leaf.path.includes(".")) continue; // feuille profonde REQUISE seulement
    if (missing.includes(leaf.topKey)) continue;             // parent déjà signalé manquant
    if (deepSeen.has(leaf.path)) continue;
    deepSeen.add(leaf.path);
    missing.push(leaf.path);
    if (leaf.scalarKind === "number") needsHuman.push(leaf.path);
    else derivable.push(leaf.path);
  }
  const deepGapCount = deepSeen.size;

  // Total HONNÊTE = atomes du contrat + feuilles profondes requises manquantes.
  // deepGapCount === 0 → `satisfied / completeReqs` (comportement inchangé) ;
  // deepGapCount > 0 → dénominateur gonflé → % < 100 (honnête).
  const honestTotal = completeReqs.length + deepGapCount;
  const completionPct = honestTotal > 0
    ? Math.round((satisfied.length / honestTotal) * 100)
    : 100;

  // Un pilier avec une feuille REQUISE vide n'est PAS COMPLETE — le pill
  // « Complet », `readyForGlory` et le gate DISPLAY_AS_COMPLETE le reflètent.
  // (On ne rétrograde que COMPLETE→ENRICHED ; les stages inférieurs sont déjà honnêtes.)
  const effectiveStage: MaturityStage | "EMPTY" =
    deepGapCount > 0 && currentStage === "COMPLETE" ? "ENRICHED" : currentStage;

  // Determine next stage
  let nextStage: MaturityStage | null = null;
  if (effectiveStage === "EMPTY") nextStage = "INTAKE";
  else if (effectiveStage === "INTAKE") nextStage = "ENRICHED";
  else if (effectiveStage === "ENRICHED") nextStage = "COMPLETE";
  // effectiveStage === "COMPLETE" → nextStage = null (already at max)

  return {
    pillarKey,
    currentStage: effectiveStage,
    nextStage,
    satisfied,
    missing,
    derivable,
    needsHuman,
    completionPct,
    readyForGlory: effectiveStage === "COMPLETE",
  };
}

// ─── Strategy Assessment ────────────────────────────────────────────────────

/**
 * Assess all 8 pillars of a strategy in one DB query.
 */
export async function assessStrategy(strategyId: string): Promise<StrategyMaturityReport> {
  const pillars = await db.pillar.findMany({
    where: { strategyId },
    select: { key: true, content: true },
  });

  const pillarMap = new Map(pillars.map(p => [p.key.toLowerCase(), p.content as Record<string, unknown> | null]));
  const contracts = getContracts();

  const assessments: Record<string, PillarAssessment> = {};
  let minStage: MaturityStage | "EMPTY" = "COMPLETE";
  let totalMissing = 0;
  let totalDerivable = 0;
  let autoCompletable = 0;

  for (const key of [...PILLAR_STORAGE_KEYS]) {
    const content = pillarMap.get(key) ?? null;
    const contract = contracts[key];
    const assessment = assessPillar(key, content, contract);
    assessments[key] = assessment;

    // Track overall stage (minimum)
    const stageOrder = { EMPTY: 0, INTAKE: 1, ENRICHED: 2, COMPLETE: 3 };
    if (stageOrder[assessment.currentStage] < stageOrder[minStage]) {
      minStage = assessment.currentStage;
    }

    totalMissing += assessment.missing.length;
    totalDerivable += assessment.derivable.length;
    if (assessment.derivable.length > 0 && !assessment.readyForGlory) {
      autoCompletable++;
    }
  }

  return {
    strategyId,
    overallStage: minStage,
    pillars: assessments,
    gloryReady: Object.values(assessments).every(a => a.readyForGlory),
    autoCompletable,
    totalMissing,
    totalDerivable,
  };
}
