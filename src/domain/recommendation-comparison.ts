import { z } from "zod";

/** Both options must use the same objective, unit, audience and period. The caller
 * resolves that scope from the brand's recorded decisions before comparing. */
export interface ObjectiveComparisonInput {
  objective: string;
  criterion: string;
  unit: string;
  direction: "higher" | "lower";
  candidate: number | null;
  incumbent?: { id: string; label: string; value: number | null };
  threshold?: number | null;
  duplicate?: boolean;
  exclusion?: string;
  evidence: string[];
  basis: "projection" | "measurement" | "structural";
}

export type ComparisonVerdict = "BETTER" | "EQUAL" | "THRESHOLD_MET" | "BELOW" | "DUPLICATE" | "UNASSESSED";
const numeric = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const format = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 4 });

export function compareObjective(input: ObjectiveComparisonInput) {
  const finish = (verdict: ComparisonVerdict, reason: string, delta: number | null = null) => ({
    ...input, verdict, reason, delta, shortlisted: verdict === "BETTER" || verdict === "EQUAL" || verdict === "THRESHOLD_MET",
  });
  if (input.duplicate) return finish("DUPLICATE", "Cette proposition reprend la décision en place.");
  if (input.exclusion) return finish("BELOW", input.exclusion);
  if (!input.objective.trim() || !input.criterion.trim() || !input.unit.trim() ||
      !input.evidence.some(ref => ref.trim()) || !numeric(input.candidate)) {
    return finish("UNASSESSED", "Il manque un critère comparable, sa valeur ou sa source.");
  }
  const sign = input.direction === "higher" ? 1 : -1;
  const display = (value: number) => format.format(value) + " " + input.unit;
  if (input.threshold != null) {
    if (!numeric(input.threshold)) return finish("UNASSESSED", "Le seuil doit pouvoir être vérifié.");
    if ((input.candidate - input.threshold) * sign < 0) {
      return finish("BELOW", "La proposition atteint " + display(input.candidate) + " pour un seuil de " + display(input.threshold) + ".");
    }
  }
  if (input.incumbent) {
    if (!input.incumbent.id.trim() || !numeric(input.incumbent.value)) {
      return finish("UNASSESSED", "La référence existe. Sa valeur sur ce critère reste à établir.");
    }
    const delta = input.candidate - input.incumbent.value;
    const reason = input.incumbent.label + " : " + display(input.incumbent.value) + " · Proposition : " + display(input.candidate) + ".";
    if (delta === 0) return finish("EQUAL", reason + " Alternative équivalente sur ce critère.", delta);
    return finish(delta * sign > 0 ? "BETTER" : "BELOW", reason, delta);
  }
  if (numeric(input.threshold)) {
    return finish("THRESHOLD_MET", "La proposition atteint " + display(input.candidate) + " pour un seuil de " + display(input.threshold) + ".");
  }
  return finish("UNASSESSED", "Aucune référence comparable ni seuil documenté pour cet objectif.");
}

export const FIELD_REPLACEMENT_MARGIN = 2;

export type ObjectiveComparison = ReturnType<typeof compareObjective>;

export function permitsReplacement(comparison: ObjectiveComparison) {
  return comparison.shortlisted && (!comparison.incumbent || comparison.basis !== "structural" ||
    (comparison.delta ?? 0) >= FIELD_REPLACEMENT_MARGIN);
}

export const objectiveComparisonInputSchema = z.object({
  objective: z.string(), criterion: z.string(), unit: z.string(),
  direction: z.enum(["higher", "lower"]), candidate: z.number().finite().nullable(),
  incumbent: z.object({ id: z.string(), label: z.string(), value: z.number().finite().nullable() }).optional(),
  threshold: z.number().finite().nullable().optional(), duplicate: z.boolean().optional(),
  exclusion: z.string().optional(), evidence: z.array(z.string()), basis: z.enum(["projection", "measurement", "structural"]),
});

/** Read the scoped article assessment. Never trust a stored display flag. */
export function readArticleComparison(row: { missionType: string; source: string; inputSnapshotId: string | null; rulerVerdict: unknown }) {
  if (row.missionType !== "SESHAT_OBSERVATION" || row.source !== "SESHAT" || !row.inputSnapshotId) return null;
  const record = z.object({ objectiveComparison: objectiveComparisonInputSchema }).safeParse(row.rulerVerdict);
  return record.success ? compareObjective(record.data.objectiveComparison) : {
    ...compareObjective({ objective: "Tirer une action de l’observation", criterion: "Apport par rapport à l’action retenue",
      unit: "pts", direction: "higher", candidate: null, basis: "projection", evidence: [] }),
    reason: "Cette proposition historique ne contient pas de comparaison stratégique étayée par l’observation.",
  };
}
