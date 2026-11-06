import { isDeepStrictEqual } from "node:util";
import { compareObjective, permitsReplacement, readArticleComparison, type ObjectiveComparisonInput } from "@/domain/recommendation-comparison";
import { assertSafePillarPath, resolvePillarPath, tokenizePillarPath } from "@/domain/pillar-path";
import { PILLAR_KEYS, type PillarKey } from "@/lib/types/advertis-vector";
import { parseRecommendationPayload } from "@/lib/types/recommendation-payload";
import { getFieldZod } from "@/lib/types/pillar-maturity-contracts";
import { applyResolvedRecoOps } from "../pillar-gateway/apply-resolved-ops";
import { compareForReplacement, RULER_PASS_THRESHOLD } from "./rulers";
import { weightedPillarScore, type PillarContentMap } from "./preview-impact";

interface Candidate {
  targetPillarKey: string; targetField: string; proposedValue: unknown; operation: string;
  targetMatch?: unknown; confidence: number; unverifiedCitations?: string[];
}

/** Compare against the live scoped pillar, including historical recommendations.
 * A missing cited source or an uncomparable strategic action belongs in review. */
export function fieldComparator(contents: PillarContentMap, weights: Record<PillarKey, number>) {
  const baselineScores = new Map<PillarKey, number>();
  return (row: Candidate) => {
    const typed = parseRecommendationPayload(row.proposedValue);
    const field = typed?.kind === "UPDATE_ADVE_FIELD" ? typed.field : row.targetField;
    const key = (typed?.kind === "UPDATE_ADVE_FIELD" ? typed.pillar : row.targetPillarKey).toLowerCase() as PillarKey;
    const criterion: ObjectiveComparisonInput = {
      objective: "Qualité du champ en place", criterion: "Qualité du champ, impact structurel simulé et confiance",
      unit: "pts/100", direction: "higher", candidate: null, evidence: [], basis: "structural",
    };
    const undecided = (reason: string) => ({ ...compareObjective(criterion), reason });
    if (typed && typed.kind !== "UPDATE_ADVE_FIELD") return undecided("Cette décision demande le critère de son objectif stratégique.");
    if (!PILLAR_KEYS.includes(key) || !contents[key]) return undecided("Le pilier de référence doit être disponible.");
    const prior = contents[key];
    try { assertSafePillarPath(tokenizePillarPath(field)); }
    catch { return undecided("Le champ demandé ne peut pas être lu."); }
    const old = resolvePillarPath(prior, field);
    const schema = getFieldZod(key, field) as { safeParse: (value: unknown) => { success: boolean } } | null;
    if (!schema && old === undefined) return undecided("Le champ demandé ne figure pas dans le référentiel.");
    const match = row.targetMatch as { key?: unknown; value?: unknown } | null;
    const operation = typed ? "SET" : row.operation;
    const candidate = typed?.kind === "UPDATE_ADVE_FIELD" ? typed.value : row.proposedValue;
    const targetMatch = typeof match?.key === "string" && typeof match.value === "string" ? { key: match.key, value: match.value } : undefined;
    const applied = applyResolvedRecoOps(prior, [{ recoId: "comparison", field, operation, proposedValue: candidate, targetMatch }]);
    if (!applied.appliedCount || applied.warnings.length) return undecided("La proposition ne s’applique plus à cette cible.");
    const next = resolvePillarPath(applied.content, field);
    const ref = key.toUpperCase() + "." + field;
    criterion.evidence = [ref, "ADR-0090"];
    if (isDeepStrictEqual(old, next) || (operation === "ADD" && Array.isArray(old) && old.some(v => isDeepStrictEqual(v, candidate)))) {
      return compareObjective({ ...criterion, duplicate: true });
    }
    if (row.unverifiedCitations?.length) return undecided("La justification cite une source qui reste à vérifier.");
    if (schema && !schema.safeParse(next).success) return compareObjective({ ...criterion, exclusion: "Le format proposé ne respecte pas la définition de ce champ." });
    const base = baselineScores.get(key) ?? weightedPillarScore(key, prior, weights[key]);
    baselineScores.set(key, base);
    const impact = Math.round((weightedPillarScore(key, applied.content, weights[key]) - base) * 100) / 100;
    const assessment = compareForReplacement({ pillarKey: key, field, oldValue: old, newValue: next, confidence: row.confidence, scoreImpactEstimate: impact });
    if (!assessment.newVerdict.pass) return compareObjective({ ...criterion, exclusion: "La valeur proposée ne passe pas les exigences de qualité du champ." });
    const missing = old == null || (typeof old === "string" && !old.trim()) ||
      (typeof old === "object" && Object.keys(old).length === 0);
    if (missing) {
      return compareObjective({ ...criterion, criterion: "Qualité intrinsèque du champ", candidate: assessment.newVerdict.score, threshold: RULER_PASS_THRESHOLD });
    }
    return compareObjective({ ...criterion, candidate: assessment.newWeightedScore, incumbent: { id: ref, label: "Valeur en place", value: assessment.oldWeightedScore } });
  };
}


type ReviewRow = Candidate & Parameters<typeof readArticleComparison>[0] & {id:string; batchId:string|null};

/** Load the reference once when filtering several storage pages for the same brand. */
export async function reviewComparator(strategyId: string) {
  const { loadContentsAndWeights } = await import("./preview-impact");
  const state = await loadContentsAndWeights(strategyId);
  const compare = fieldComparator(state.contents, state.weights);
  return <T extends ReviewRow>(rows: T[]) => rows.map(row => {
    const comparison = readArticleComparison(row) ?? compare(row);
    return { ...row, comparison, eligibleForApplication: permitsReplacement(comparison) };
  });
}

export async function compareReviewRows<T extends ReviewRow>(strategyId: string, rows: T[]) {
  if (!rows.length) return [];
  const compare=await reviewComparator(strategyId);
  const {readArticleEvidenceForReview} = await import("../jehuty/article-notoria");
  const evidence=await readArticleEvidenceForReview(strategyId,rows);
  return compare(rows).map((row,index)=>({...row,articleEvidence:evidence[index]}));
}

/** A single operator decision may select a known item or route directly.
 * Unbenchmarked content changes and article-derived initiatives require a comparison.
 * Bulk commands always exclude equivalent alternatives and every unassessed row. */
export async function reviewedIds<T extends ReviewRow>(strategyId: string, rows: T[], singleDecision: boolean) {
  if (!rows.length) return new Set<string>();
  const compared=(await reviewComparator(strategyId))(rows);
  const ids=new Set<string>();
  for(const row of compared) {
    const typed=parseRecommendationPayload(row.proposedValue);
    const directChoice=singleDecision && !readArticleComparison(row) && typed
      && ["SELECT_INITIATIVE","REJECT_INITIATIVE","SET_RISK_STATUS","LINK_RISK","SELECT_ROADMAP_ROUTE"].includes(typed.kind);
    if(directChoice || (row.eligibleForApplication && (singleDecision || row.comparison.verdict !== "EQUAL"))) ids.add(row.id);
  }
  return ids;
}
