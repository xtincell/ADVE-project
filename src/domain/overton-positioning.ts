/** Shared Overton contract. Planning postulates never become measured popularity. */
import { z } from "zod";
import { OVERTON_ZONES, OvertonZoneSchema, type OvertonZone } from "./overton-graph";

/** Product adaptation of the six acceptance zones; criteria, not numeric thresholds. */
export const OVERTON_MILESTONES = [
  { zone: "UNTHINKABLE", label: "Impensable", meaning: "La proposition est rejetée comme illégitime.", proof: "Relever des refus explicites de discuter la proposition, dans le public visé.", next: "Obtenir que la proposition puisse être discutée, même avec une forte opposition." },
  { zone: "RADICAL", label: "Radical", meaning: "La proposition se discute mais reste portée par une minorité.", proof: "Identifier ses premiers défenseurs et les objections exprimées publiquement.", next: "Montrer des cas crédibles qui rendent la proposition envisageable." },
  { zone: "ACCEPTABLE", label: "Acceptable", meaning: "La proposition devient une option légitime.", proof: "Recueillir des avis qui reconnaissent sa légitimité et des essais documentés.", next: "Démontrer son utilité dans des situations comparables et répétées." },
  { zone: "SENSIBLE", label: "Raisonnable", meaning: "La proposition paraît utile et justifiée.", proof: "Documenter les bénéfices, les objections restantes et les choix motivés en sa faveur.", next: "Vérifier qu’elle est préférée au-delà des premiers convaincus." },
  { zone: "POPULAR", label: "Populaire", meaning: "La proposition est largement soutenue dans le public défini.", proof: "Mesurer le soutien et la préférence sur un échantillon décrit, avec période et dénominateur.", next: "Vérifier son installation dans les habitudes, règles ou standards du milieu." },
  { zone: "POLICY", label: "Institué", meaning: "La proposition est intégrée aux habitudes, règles ou standards.", proof: "Citer des pratiques durables ou des règles adoptées et vérifier leur application.", next: "Surveiller sa pérennité et les preuves d’un éventuel recul." },
] as const satisfies ReadonlyArray<{ zone: OvertonZone; label: string; meaning: string; proof: string; next: string }>;

export const OvertonConceptSchema = z.object({
  id: z.string().min(1).max(120),
  kind: z.enum(["CONVICTION", "CATEGORY", "BRAND"]),
  statement: z.string().min(1),
  audience: z.string().min(1),
  countryCode: z.string().length(2).optional(),
  editorialRole: z.string().min(1).optional(),
  opposedStatement: z.string().min(1).optional(),
  baseline: z.object({
    zone: OvertonZoneSchema,
    basis: z.enum(["DECLARED", "INFERRED"]),
    reason: z.string().min(1),
    sourceRefs: z.array(z.string().min(1)).min(1),
    verification: z.string().min(1),
  }),
  targetZone: OvertonZoneSchema,
});
export type OvertonConcept = z.infer<typeof OvertonConceptSchema>;

export const EntryOvertonClaimSchema = z.object({
  statement: z.string().trim().min(1).max(600),
  audience: z.string().trim().min(1).max(300),
  baselineZone: OvertonZoneSchema,
  targetZone: OvertonZoneSchema,
});
export type EntryOvertonClaim = z.infer<typeof EntryOvertonClaimSchema>;
export function entryOvertonConcept(claim: EntryOvertonClaim): OvertonConcept {
  const rubric = OVERTON_MILESTONES.find(m => m.zone === claim.baselineZone)!;
  return { id: "entry-conviction", kind: "CONVICTION", statement: claim.statement, audience: claim.audience,
    baseline: { zone: claim.baselineZone, basis: "DECLARED",
      reason: "Position de départ déclarée dans le diagnostic d’entrée ; à confronter au terrain.",
      sourceRefs: ["intake.declaration.overton"], verification: rubric.proof }, targetZone: claim.targetZone };
}

export interface OvertonPositionReadout {
  id: string;
  kind: OvertonConcept["kind"];
  statement: string;
  audience: string;
  countryCode?: string;
  editorialRole?: string;
  sourceRefs: string[];
  baseline?: OvertonConcept["baseline"];
  targetZone?: OvertonZone;
  /** A result must carry an independent, dated observation. Never filled from baseline. */
  observation?: { zone: OvertonZone; observedAt: string; sources: string[]; positionId: string };
  nextCheck: string;
}
export interface OvertonPositioning {
  positions: OvertonPositionReadout[];
  status: "FRAMED" | "PARTIAL";
  missing: string[];
}

const object = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const text = (v: unknown): string => typeof v === "string" ? v.trim() : "";

/** Legacy ADVE remains useful: quote its actual claims, without silently assigning a zone. */
export function readOvertonPositioning(pillars: { a?: unknown; d?: unknown; t?: unknown }): OvertonPositioning {
  const a = object(pillars.a), d = object(pillars.d);
  const raw = Array.isArray(a.overtonPositions) ? a.overtonPositions : [];
  const positions: OvertonPositionReadout[] = raw.flatMap(value => {
    const parsed = OvertonConceptSchema.safeParse(value);
    if (!parsed.success) return [];
    const item = parsed.data;
    return [{ ...item, sourceRefs: [...new Set([`A.overtonPositions.${item.id}`, ...item.baseline.sourceRefs])], nextCheck: item.baseline.verification }];
  });
  const audience = text(a.publicCible) || "Public à préciser dans les fondations";
  const add = (kind: OvertonConcept["kind"], candidates: Array<[unknown, string]>) => {
    if (positions.some(p => p.kind === kind)) return;
    const candidate = candidates.find(([value]) => text(value));
    if (!candidate) return;
    positions.push({ id: `adve-${kind.toLowerCase()}`, kind, statement: text(candidate[0]), audience,
      sourceRefs: [candidate[1]], nextCheck: "Qualifier une position de départ et une cible dans les fondations, puis confronter ce postulat à des avis datés du public visé." });
  };
  const enemy = object(a.enemy), map = object(enemy.overtonMap);
  add("CONVICTION", [[map.ourPosition, "A.enemy.overtonMap.ourPosition"], [a.promesseFondamentale, "A.promesseFondamentale"], [a.citationFondatrice, "A.citationFondatrice"]]);
  add("CATEGORY", [[a.secteur, "A.secteur"]]);
  add("BRAND", [[d.positionnement, "D.positionnement"], [a.description, "A.description"], [a.nomMarque, "A.nomMarque"]]);
  const missing = (["CONVICTION", "CATEGORY", "BRAND"] as const).filter(kind => !positions.some(p => p.kind === kind && p.baseline && p.targetZone));
  return { positions, status: missing.length ? "PARTIAL" : "FRAMED", missing: [...missing] };
}

/** Enumerate every crossed zone in either direction. No invented dates or outcomes. */
export function overtonPath(from: OvertonZone, to: OvertonZone): OvertonZone[] {
  const start = OVERTON_ZONES.indexOf(from), end = OVERTON_ZONES.indexOf(to);
  const direction = end >= start ? 1 : -1;
  return Array.from({ length: Math.abs(end - start) + 1 }, (_, i) => OVERTON_ZONES[start + i * direction]!);
}

export function overtonPlanningMilestones(positioning: OvertonPositioning) {
  return positioning.positions.flatMap(p => p.baseline && p.targetZone
    ? overtonPath(p.baseline.zone, p.targetZone).map(zone => {
      const rubric = OVERTON_MILESTONES.find(m => m.zone === zone)!;
      return { conceptId: p.id, phase: rubric.label, currentPerception: p.statement,
        targetPerception: `${rubric.meaning} Public : ${p.audience}.`,
        measurementMethod: rubric.proof, zone, basis: "PLANNING" as const };
    }) : []);
}
