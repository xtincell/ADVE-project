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
const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.length > 0) : []);
const asStr = (v: unknown): string => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
/** Clé de nom normalisée (accents/casse/espaces) pour un matching tolérant. */
const nameKey = (v: unknown): string => asStr(v).normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

export interface DanglingReference {
  edge: string;   // libellé de l'arête (« I.mitigatesRiskIds → R.risks[].id »)
  source: string; // chemin de la référence
  ref: string;    // valeur non résolue
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
 * Retourne toutes les références qui ne résolvent PAS vers leur cible. Une arête
 * n'est vérifiée que si la cible existe (sinon on ne peut pas juger — pool vide toléré,
 * cf. `pool.size` gardé) SAUF pour les liens par nom, où l'absence de cible EST le dangle.
 */
export function findDanglingReferences(p: PillarBag): DanglingReference[] {
  const D = (p.D ?? {}) as Rec, V = (p.V ?? {}) as Rec, E = (p.E ?? {}) as Rec;
  const R = (p.R ?? {}) as Rec, T = (p.T ?? {}) as Rec, I = (p.I ?? {}) as Rec, S = (p.S ?? {}) as Rec;
  const out: DanglingReference[] = [];

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
    if (nk && !personaNames.has(nk)) out.push({ edge: "V.personaSegmentMap.personaName → D.personas[].name", source: `V.personaSegmentMap[${i}].personaName`, ref: asStr(m.personaName) });
  });
  const sp = (E.superfanPortrait ?? {}) as Rec;
  if (sp.personaRef) {
    const nk = nameKey(sp.personaRef);
    if (!personaNames.has(nk) && !personaIds.has(asStr(sp.personaRef))) {
      out.push({ edge: "E.superfanPortrait.personaRef → D.personas[].name", source: "E.superfanPortrait.personaRef", ref: asStr(sp.personaRef) });
    }
  }

  // ── FK UUID : actions I → R / D / T ──
  actions.forEach((a, i) => {
    if (riskIds.size) strArr(a.mitigatesRiskIds).forEach((ref) => { if (!riskIds.has(ref)) out.push({ edge: "I.mitigatesRiskIds → R.probabilityImpactMatrix[].id", source: `I.actions[${i}].mitigatesRiskIds`, ref }); });
    if (personaIds.size) strArr(a.targetsPersonaIds).forEach((ref) => { if (!personaIds.has(ref)) out.push({ edge: "I.targetsPersonaIds → D.personas[].id", source: `I.actions[${i}].targetsPersonaIds`, ref }); });
    if (hypothesisIds.size && a.hypothesisId && !hypothesisIds.has(asStr(a.hypothesisId))) out.push({ edge: "I.hypothesisId → T.hypothesisValidation[].id", source: `I.actions[${i}].hypothesisId`, ref: asStr(a.hypothesisId) });
  });

  // ── FK UUID : S → I / R ──
  for (const key of ["selectedFromI", "rejectedFromI"] as const) {
    arr(S[key]).forEach((s, i) => {
      if (actionIds.size && s.sourceInitiativeId && !actionIds.has(asStr(s.sourceInitiativeId))) {
        out.push({ edge: `S.${key}.sourceInitiativeId → I.actions[].id`, source: `S.${key}[${i}].sourceInitiativeId`, ref: asStr(s.sourceInitiativeId) });
      }
    });
  }
  // S.fenetreOverton.strategieDeplacement est un ARRAY d'étapes {riskId} (schéma:1320) —
  // PAS un objet à `S.strategieDeplacement` (toujours undefined). L'arête ne se déclenchait
  // JAMAIS (false negative — le but même de l' id ADR-0174). Corrigé : chemin + itération.
  if (blockerIds.size) {
    const fenetreOverton = (S.fenetreOverton ?? {}) as Rec;
    arr(fenetreOverton.strategieDeplacement).forEach((step, i) => {
      if (step.riskId && !blockerIds.has(asStr(step.riskId))) {
        out.push({
          edge: "S.fenetreOverton.strategieDeplacement[].riskId → R.overtonBlockers[].id",
          source: `S.fenetreOverton.strategieDeplacement[${i}].riskId`,
          ref: asStr(step.riskId),
        });
      }
    });
  }

  return out;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
