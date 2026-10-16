/**
 * pillar-reference-edges.ts — intégrité des arêtes de référence inter-piliers
 * (ADR-0174, Lot 3). Généralise le motif `danglingProductRefs` (ADR-0171, produits)
 * aux autres FK du backbone structuré (ADR-0088) + aux liens par NOM.
 *
 * `entityId = z.string().uuid()` mais rien ne validait qu'une référence RÉSOUD vers
 * sa cible → des dangles LIVE (personaSegmentMap.personaName ne matchant aucun persona,
 * mitigatesRiskIds pointant dans le vide…). Ce module DÉTECTE (il ne bloque pas — le
 * cross-validator est du scoring). Layer-0 pur, zéro LLM.
 *
 * Résolution tolérante : on matche par égalité de chaîne (donc les ids lisibles
 * `risk-m19-001` résolvent aussi bien que des UUID, tant que source et cible partagent
 * la même chaîne — cf. décision « persistance brute » ADR-0172).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Rec = Record<string, unknown>;
const arr = (v: unknown): Rec[] => (Array.isArray(v) ? (v as Rec[]).filter((x) => x && typeof x === "object") : []);
const asStr = (v: unknown): string => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
/** Clé de nom normalisée (accents/casse/espaces) pour un matching tolérant. */
const nameKey = (v: unknown): string => asStr(v).normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

export interface DanglingReference {
  edge: string;   // libellé de l'arête (« I.mitigatesRiskIds → R.risks[].id »)
  source: string; // chemin de la référence
  ref: string;    // valeur non résolue
}

export interface DeferredReference extends DanglingReference {
  reason: "TARGET_IDS_MISSING" | "INVALID_REFERENCE_SHAPE";
}

export interface ReferenceAssessment {
  dangling: DanglingReference[];
  deferred: DeferredReference[];
  /** Resolved and broken links that could actually be checked. */
  checkedCount: number;
}

/** Rassemble toutes les actions I depuis ses conteneurs (par palier / par phase / plat). */
function collectActions(i: Rec): Rec[] {
  const out: Rec[] = [];
  const byLevel = (i.actionsByDevotionLevel ?? {}) as Rec;
  for (const v of Object.values(byLevel)) out.push(...arr(v));
  for (const phase of arr(i.actionsByOvertonPhase)) out.push(...arr(phase.actions));
  // catalogueParCanal = record<canal, action[]> (catalogue PRIMAIRE, id/mitigatesRiskIds/
  // targetsPersonaIds/hypothesisId). Il était OMIS (audit 2026-07-22) → ses FK jamais
  // vérifiées + faux dangles S→I quand d'autres conteneurs étaient non vides. `i.actions`
  // n'existe pas au schéma (toujours vide) → retiré.
  const catalogue = (i.catalogueParCanal ?? {}) as Rec;
  for (const v of Object.values(catalogue)) out.push(...arr(v));
  out.push(...arr(i.riskMitigationActions), ...arr(i.hypothesisTestActions));
  return out;
}

export type PillarBag = Partial<Record<"A" | "D" | "V" | "E" | "R" | "T" | "I" | "S", Rec | null | undefined>>;

/**
 * One traversal distinguishes broken links from links that cannot yet be checked.
 * Missing ID pools keep the ADR-0174 deferral; legacy malformed references are not
 * guessed or silently counted as resolved. No references means no evidence either.
 * strictS keeps the existing stricter synthesis checks, including empty targets.
 */
export function assessPillarReferences(p: PillarBag, options: { strictS?: boolean } = {}): ReferenceAssessment {
  const D = (p.D ?? {}) as Rec, V = (p.V ?? {}) as Rec, E = (p.E ?? {}) as Rec;
  const R = (p.R ?? {}) as Rec, T = (p.T ?? {}) as Rec, I = (p.I ?? {}) as Rec, S = (p.S ?? {}) as Rec;
  const result: ReferenceAssessment = { dangling: [], deferred: [], checkedCount: 0 };
  const check = (edge: string, source: string, ref: string, pool: Set<string>, deferEmpty = true) => {
    if (!pool.size && deferEmpty) {
      result.deferred.push({ edge, source, ref, reason: "TARGET_IDS_MISSING" });
      return;
    }
    result.checkedCount++;
    if (!pool.has(ref)) result.dangling.push({ edge, source, ref });
  };
  const checkArray = (edge: string, source: string, value: unknown, pool: Set<string>) => {
    if (value == null) return;
    if (!Array.isArray(value)) {
      result.deferred.push({ edge, source, ref: asStr(value), reason: "INVALID_REFERENCE_SHAPE" });
      return;
    }
    for (const ref of value) {
      if (typeof ref !== "string" || !ref.trim()) {
        result.deferred.push({ edge, source, ref: asStr(ref), reason: "INVALID_REFERENCE_SHAPE" });
      } else {
        check(edge, source, ref, pool);
      }
    }
  };

  // ── Pools de cibles ──
  const personaNames = new Set(arr(D.personas).map((x) => nameKey(x.name ?? x.nom)).filter(Boolean));
  const personaIds = new Set(arr(D.personas).map((x) => asStr(x.id)).filter(Boolean));
  const riskIds = new Set(arr(R.probabilityImpactMatrix).map((x) => asStr(x.id)).filter(Boolean));
  const blockerIds = new Set(arr(R.overtonBlockers).map((x) => asStr(x.id)).filter(Boolean));
  const hypothesisIds = new Set(arr(T.hypothesisValidation).map((x) => asStr(x.id)).filter(Boolean));
  const actions = collectActions(I);
  const actionIds = new Set(actions.map((x) => asStr(x.id)).filter(Boolean));

  // ── Liens par NOM (dangles LIVE confirmés à l'audit) ──
  arr(V.personaSegmentMap).forEach((m, i) => {
    const nk = nameKey(m.personaName);
    if (nk) {
      result.checkedCount++;
      if (!personaNames.has(nk)) result.dangling.push({ edge: "V.personaSegmentMap.personaName → D.personas[].name", source: `V.personaSegmentMap[${i}].personaName`, ref: asStr(m.personaName) });
    }
  });
  const sp = (E.superfanPortrait ?? {}) as Rec;
  if (sp.personaRef) {
    result.checkedCount++;
    const nk = nameKey(sp.personaRef);
    if (!personaNames.has(nk) && !personaIds.has(asStr(sp.personaRef))) {
      result.dangling.push({ edge: "E.superfanPortrait.personaRef → D.personas[].name", source: "E.superfanPortrait.personaRef", ref: asStr(sp.personaRef) });
    }
  }

  // ── FK UUID : actions I → R / D / T ──
  actions.forEach((a, i) => {
    checkArray("I.mitigatesRiskIds → R.probabilityImpactMatrix[].id", `I.actions[${i}].mitigatesRiskIds`, a.mitigatesRiskIds, riskIds);
    checkArray("I.targetsPersonaIds → D.personas[].id", `I.actions[${i}].targetsPersonaIds`, a.targetsPersonaIds, personaIds);
    if (a.hypothesisId) check("I.hypothesisId → T.hypothesisValidation[].id", `I.actions[${i}].hypothesisId`, asStr(a.hypothesisId), hypothesisIds);
  });

  // ── FK UUID : S → I / R ──
  for (const key of options.strictS ? ["selectedFromI", "rejectedFromI", "sprint90Days"] : ["selectedFromI", "rejectedFromI"]) {
    arr(S[key]).forEach((s, i) => {
      if (s.sourceInitiativeId) {
        check(`S.${key}.sourceInitiativeId → I.actions[].id`, `S.${key}[${i}].sourceInitiativeId`, asStr(s.sourceInitiativeId), actionIds, !options.strictS);
      }
    });
  }
  // S.fenetreOverton.strategieDeplacement est un ARRAY d'étapes {riskId} (schéma:1320) —
  // PAS un objet à `S.strategieDeplacement` (toujours undefined). L'arête ne se déclenchait
  // JAMAIS (false negative — le but même de l' id ADR-0174). Corrigé : chemin + itération.
  const fenetreOverton = (S.fenetreOverton ?? {}) as Rec;
  arr(fenetreOverton.strategieDeplacement).forEach((step, i) => {
    if (step.riskId) {
      check("S.fenetreOverton.strategieDeplacement[].riskId → R.overtonBlockers[].id",
        `S.fenetreOverton.strategieDeplacement[${i}].riskId`, asStr(step.riskId), blockerIds, !options.strictS);
    }
    if (options.strictS && step.hypothesisId) {
      check("S.fenetreOverton.strategieDeplacement[].hypothesisId → T.hypothesisValidation[].id",
        `S.fenetreOverton.strategieDeplacement[${i}].hypothesisId`, asStr(step.hypothesisId), hypothesisIds, false);
    }
  });

  return result;
}

/** Backward-compatible dangling-only view. Deferred is never a broken-link assertion. */
export function findDanglingReferences(p: PillarBag, options: { strictS?: boolean } = {}): DanglingReference[] {
  return assessPillarReferences(p, options).dangling;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
