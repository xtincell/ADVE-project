/**
 * Cross-Pillar Validator — 17 règles de validation croisée inter-piliers
 * Vérifie la cohérence ontologique entre les 8 piliers ADVE-RTIS
 */

import { db } from "@/lib/db";
import { SCHWARTZ_VALUES } from "@/lib/types/taxonomies";

export interface CrossRefValidation {
  rule: string;
  ruleId: number;
  from: string;
  to: string;
  status: "VALID" | "INVALID" | "SKIPPED";
  message: string;
}

type PillarMap = Record<string, Record<string, unknown> | null>;

async function loadPillars(strategyId: string): Promise<PillarMap> {
  const pillars = await db.pillar.findMany({ where: { strategyId } });
  const map: PillarMap = {};
  for (const p of pillars) {
    map[p.key.toUpperCase()] = p.content as Record<string, unknown> | null;
  }
  return map;
}

function getArray(obj: unknown): unknown[] {
  return Array.isArray(obj) ? obj : [];
}

function getString(obj: unknown): string {
  return typeof obj === "string" ? obj : "";
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Exécute les 17 validations croisées inter-piliers
 */
export async function validateCrossReferences(strategyId: string): Promise<CrossRefValidation[]> {
  const p = await loadPillars(strategyId);
  const results: CrossRefValidation[] = [];

  // 1. A.archetype → D.directionArtistique.lsiMatrix.concepts
  const archetype = getString(p.A?.archetype);
  const lsi = p.D?.directionArtistique as Record<string, unknown> | undefined;
  const lsiMatrix = lsi?.lsiMatrix as Record<string, unknown> | undefined;
  const lsiConcepts = getArray(lsiMatrix?.concepts) as string[];
  if (!archetype || !lsiConcepts.length) {
    results.push({ rule: "Archetype dans LSI Matrix", ruleId: 1, from: "A.archetype", to: "D.lsiMatrix.concepts", status: "SKIPPED", message: "Données insuffisantes" });
  } else {
    const found = lsiConcepts.some((c) => c.toLowerCase().includes(archetype.toLowerCase()));
    results.push({ rule: "Archetype dans LSI Matrix", ruleId: 1, from: "A.archetype", to: "D.lsiMatrix.concepts", status: found ? "VALID" : "INVALID", message: found ? "L'archétype est reflété dans les concepts LSI" : `L'archétype "${archetype}" n'apparaît pas dans les concepts LSI` });
  }

  // 2. A.valeurs → D.tonDeVoix
  const valeurs = getArray(p.A?.valeurs) as Array<Record<string, unknown>>;
  const ton = p.D?.tonDeVoix as Record<string, unknown> | undefined;
  if (!valeurs.length || !ton) {
    results.push({ rule: "Valeurs incarnées dans le ton", ruleId: 2, from: "A.valeurs", to: "D.tonDeVoix", status: "SKIPPED", message: "Données insuffisantes" });
  } else {
    results.push({ rule: "Valeurs incarnées dans le ton", ruleId: 2, from: "A.valeurs", to: "D.tonDeVoix", status: ton.personnalite ? "VALID" : "INVALID", message: ton.personnalite ? "Le ton de voix est défini" : "Le ton de voix ne reflète pas les valeurs" });
  }

  // 3. A.ikigai.competence → D.paysageConcurrentiel
  const ikigai = p.A?.ikigai as Record<string, unknown> | undefined;
  const competence = getString(ikigai?.competence);
  const concurrents = getArray(p.D?.paysageConcurrentiel) as Array<Record<string, unknown>>;
  if (!competence || !concurrents.length) {
    results.push({ rule: "Compétence différencie des concurrents", ruleId: 3, from: "A.ikigai.competence", to: "D.paysageConcurrentiel", status: "SKIPPED", message: "Données insuffisantes" });
  } else {
    results.push({ rule: "Compétence différencie des concurrents", ruleId: 3, from: "A.ikigai.competence", to: "D.paysageConcurrentiel", status: "VALID", message: `Compétence définie face à ${concurrents.length} concurrent(s)` });
  }

  // 4. A.ikigai.worldNeed → V.produitsCatalogue
  const worldNeed = getString(ikigai?.worldNeed);
  const produits = getArray(p.V?.produitsCatalogue) as Array<Record<string, unknown>>;
  if (!worldNeed || !produits.length) {
    results.push({ rule: "Besoin du monde adressé par les produits", ruleId: 4, from: "A.ikigai.worldNeed", to: "V.produitsCatalogue", status: "SKIPPED", message: "Données insuffisantes" });
  } else {
    results.push({ rule: "Besoin du monde adressé par les produits", ruleId: 4, from: "A.ikigai.worldNeed", to: "V.produitsCatalogue", status: "VALID", message: `${produits.length} produit(s) adressent le besoin du monde` });
  }

  // 5. A.ikigai.remuneration → V.produitsCatalogue
  const remuneration = getString(ikigai?.remuneration);
  if (!remuneration || !produits.length) {
    results.push({ rule: "Rémunération via les produits", ruleId: 5, from: "A.ikigai.remuneration", to: "V.produitsCatalogue", status: "SKIPPED", message: "Données insuffisantes" });
  } else {
    results.push({ rule: "Rémunération via les produits", ruleId: 5, from: "A.ikigai.remuneration", to: "V.produitsCatalogue", status: "VALID", message: "Le modèle de rémunération est matérialisé par le catalogue produits" });
  }

  // 6. D.personas.schwartzValues ⊆ A.valeurs (≥1 shared per persona)
  const personas = getArray(p.D?.personas) as Array<Record<string, unknown>>;
  const brandValues = valeurs.map((v) => getString(v.value));
  if (!personas.length || !brandValues.length) {
    results.push({ rule: "Personas partagent les valeurs de la marque", ruleId: 6, from: "D.personas.schwartzValues", to: "A.valeurs", status: "SKIPPED", message: "Données insuffisantes" });
  } else {
    const allShared = personas.every((persona) => {
      const pValues = getArray(persona.schwartzValues) as string[];
      return pValues.length === 0 || pValues.some((v) => brandValues.includes(v));
    });
    results.push({ rule: "Personas partagent les valeurs de la marque", ruleId: 6, from: "D.personas.schwartzValues", to: "A.valeurs", status: allShared ? "VALID" : "INVALID", message: allShared ? "Chaque persona partage au moins 1 valeur Schwartz avec la marque" : "Certains personas n'ont aucune valeur en commun avec la marque" });
  }

  // 7. D.promesseMaitre → V.produitsCatalogue.lienPromesse
  const promesse = getString(p.D?.promesseMaitre);
  if (!promesse || !produits.length) {
    results.push({ rule: "Promesse incarnée par les produits", ruleId: 7, from: "D.promesseMaitre", to: "V.produitsCatalogue.lienPromesse", status: "SKIPPED", message: "Données insuffisantes" });
  } else {
    const hasLinks = produits.some((pr) => getString(pr.lienPromesse).length > 0);
    results.push({ rule: "Promesse incarnée par les produits", ruleId: 7, from: "D.promesseMaitre", to: "V.produitsCatalogue.lienPromesse", status: hasLinks ? "VALID" : "INVALID", message: hasLinks ? "Au moins 1 produit explicite le lien avec la promesse" : "Aucun produit ne lie sa valeur à la promesse maître" });
  }

  // 8. D.personas → V.productLadder
  const ladder = getArray(p.V?.productLadder) as Array<Record<string, unknown>>;
  if (!personas.length || !ladder.length) {
    results.push({ rule: "Chaque tier cible un persona", ruleId: 8, from: "D.personas", to: "V.productLadder", status: "SKIPPED", message: "Données insuffisantes" });
  } else {
    const allTargeted = ladder.every((t) => getString(t.cible).length > 0);
    results.push({ rule: "Chaque tier cible un persona", ruleId: 8, from: "D.personas", to: "V.productLadder", status: allTargeted ? "VALID" : "INVALID", message: allTargeted ? "Chaque tier du product ladder cible un persona" : "Certains tiers n'ont pas de persona cible" });
  }

  // 9. E.touchpoints AARRR coverage (5 stages)
  const touchpoints = getArray(p.E?.touchpoints) as Array<Record<string, unknown>>;
  const aarrCovered = new Set(touchpoints.map((t) => getString(t.aarrStage)).filter(Boolean));
  if (!touchpoints.length) {
    results.push({ rule: "Couverture AARRR des touchpoints", ruleId: 9, from: "E.touchpoints", to: "AARRR 5 stages", status: "SKIPPED", message: "Aucun touchpoint défini" });
  } else {
    const allCovered = aarrCovered.size >= 5;
    results.push({ rule: "Couverture AARRR des touchpoints", ruleId: 9, from: "E.touchpoints", to: "AARRR 5 stages", status: allCovered ? "VALID" : "INVALID", message: allCovered ? "Les 5 stages AARRR sont couverts" : `Seulement ${aarrCovered.size}/5 stages couverts: ${[...aarrCovered].join(", ")}` });
  }

  // 10. E.touchpoints type coverage (≥1 physique, digital, humain)
  const types = new Set(touchpoints.map((t) => getString(t.type)).filter(Boolean));
  if (!touchpoints.length) {
    results.push({ rule: "Diversité des types de touchpoints", ruleId: 10, from: "E.touchpoints.type", to: "3 types requis", status: "SKIPPED", message: "Aucun touchpoint" });
  } else {
    const allTypes = types.size >= 3;
    results.push({ rule: "Diversité des types de touchpoints", ruleId: 10, from: "E.touchpoints.type", to: "3 types requis", status: allTypes ? "VALID" : "INVALID", message: allTypes ? "Physique, digital et humain représentés" : `Seulement ${types.size}/3 types: ${[...types].join(", ")}` });
  }

  // 11. E.rituels devotion coverage (≥3 levels)
  const rituels = getArray(p.E?.rituels) as Array<Record<string, unknown>>;
  const devotionLevels = new Set<string>();
  for (const r of rituels) {
    for (const dl of getArray(r.devotionLevels) as string[]) {
      devotionLevels.add(dl);
    }
  }
  if (!rituels.length) {
    results.push({ rule: "Couverture Devotion des rituels", ruleId: 11, from: "E.rituels.devotionLevels", to: "≥3 niveaux", status: "SKIPPED", message: "Aucun rituel" });
  } else {
    const enough = devotionLevels.size >= 3;
    results.push({ rule: "Couverture Devotion des rituels", ruleId: 11, from: "E.rituels.devotionLevels", to: "≥3 niveaux", status: enough ? "VALID" : "INVALID", message: enough ? `${devotionLevels.size} niveaux de dévotion couverts` : `Seulement ${devotionLevels.size}/3 niveaux` });
  }

  // 12. E.rituels type mix (≥1 always-on, ≥1 cyclique)
  const rituelTypes = new Set(rituels.map((r) => getString(r.type)));
  if (!rituels.length) {
    results.push({ rule: "Mix types de rituels", ruleId: 12, from: "E.rituels.type", to: "always-on + cyclique", status: "SKIPPED", message: "Aucun rituel" });
  } else {
    const hasBoth = rituelTypes.has("ALWAYS_ON") && rituelTypes.has("CYCLIQUE");
    results.push({ rule: "Mix types de rituels", ruleId: 12, from: "E.rituels.type", to: "always-on + cyclique", status: hasBoth ? "VALID" : "INVALID", message: hasBoth ? "Mix always-on et cyclique présent" : `Types présents: ${[...rituelTypes].join(", ")}` });
  }

  // 13. E.gamification.niveaux → A.hierarchieCommunautaire
  const gamification = p.E?.gamification as Record<string, unknown> | undefined;
  const gamNiveaux = getArray(gamification?.niveaux);
  const communaute = getArray(p.A?.hierarchieCommunautaire);
  if (!gamNiveaux.length || !communaute.length) {
    results.push({ rule: "Gamification alignée sur la hiérarchie", ruleId: 13, from: "E.gamification.niveaux", to: "A.hierarchieCommunautaire", status: "SKIPPED", message: "Données insuffisantes" });
  } else {
    results.push({ rule: "Gamification alignée sur la hiérarchie", ruleId: 13, from: "E.gamification.niveaux", to: "A.hierarchieCommunautaire", status: "VALID", message: `${gamNiveaux.length} niveaux de gamification vs. ${communaute.length} niveaux communautaires` });
  }

  // 14. R.mitigationPriorities → S.sprint90Days (mitigations in S roadmap, not I catalogue)
  const mitigations = getArray(p.R?.mitigationPriorities) as Array<Record<string, unknown>>;
  const sSprint = getArray(p.S?.sprint90Days) as Array<Record<string, unknown>>;
  if (!mitigations.length || !sSprint.length) {
    results.push({ rule: "Mitigations dans la roadmap", ruleId: 14, from: "R.mitigationPriorities", to: "S.sprint90Days", status: "SKIPPED", message: "Roadmap S pas encore generee" });
  } else {
    const riskActions = sSprint.filter((a) => a.isRiskMitigation === true).length;
    results.push({ rule: "Mitigations dans la roadmap", ruleId: 14, from: "R.mitigationPriorities", to: "S.sprint90Days", status: riskActions >= 2 ? "VALID" : "INVALID", message: riskActions >= 2 ? `${riskActions} actions de mitigation dans la roadmap S` : `Seulement ${riskActions}/2 actions de mitigation dans S (minimum: 2)` });
  }

  // 15. S.recommandationsPrioritaires sources (≥2 from R, ≥2 from T)
  const recos = getArray(p.S?.recommandationsPrioritaires) as Array<Record<string, unknown>>;
  if (!recos.length) {
    results.push({ rule: "Sources des recommandations", ruleId: 15, from: "S.recommandationsPrioritaires", to: "R + T", status: "SKIPPED", message: "Aucune recommandation" });
  } else {
    const fromR = recos.filter((r) => getString(r.source) === "R").length;
    const fromT = recos.filter((r) => getString(r.source) === "T").length;
    const valid = fromR >= 2 && fromT >= 2;
    results.push({ rule: "Sources des recommandations", ruleId: 15, from: "S.recommandationsPrioritaires", to: "R + T", status: valid ? "VALID" : "INVALID", message: valid ? `${fromR} recommandations de R, ${fromT} de T` : `${fromR}/2 de R et ${fromT}/2 de T (minimum 2 chacun)` });
  }

  // 16. S.axesStrategiques (each links ≥2 pillars)
  const axes = getArray(p.S?.axesStrategiques) as Array<Record<string, unknown>>;
  if (!axes.length) {
    results.push({ rule: "Axes stratégiques multi-piliers", ruleId: 16, from: "S.axesStrategiques", to: "≥2 piliers par axe", status: "SKIPPED", message: "Aucun axe stratégique" });
  } else {
    const allMulti = axes.every((a) => getArray(a.pillarsLinked).length >= 2);
    results.push({ rule: "Axes stratégiques multi-piliers", ruleId: 16, from: "S.axesStrategiques", to: "≥2 piliers par axe", status: allMulti ? "VALID" : "INVALID", message: allMulti ? "Chaque axe lie au moins 2 piliers" : "Certains axes ne lient pas assez de piliers" });
  }

  // 17. A.noyauIdentitaire ≠ D.positionnement (overlap < 50%)
  const noyau = getString(p.A?.noyauIdentitaire);
  const positionnement = getString(p.D?.positionnement);
  if (!noyau || !positionnement) {
    results.push({ rule: "Noyau ≠ Positionnement", ruleId: 17, from: "A.noyauIdentitaire", to: "D.positionnement", status: "SKIPPED", message: "Données insuffisantes" });
  } else {
    const overlap = similarity(noyau, positionnement);
    results.push({ rule: "Noyau ≠ Positionnement", ruleId: 17, from: "A.noyauIdentitaire", to: "D.positionnement", status: overlap < 0.5 ? "VALID" : "INVALID", message: overlap < 0.5 ? `Overlap ${(overlap * 100).toFixed(0)}% — suffisamment distincts` : `Overlap ${(overlap * 100).toFixed(0)}% — trop similaires (< 50% requis)` });
  }

  return results;
}

/**
 * Résumé rapide des validations croisées
 */
export async function getCrossRefSummary(strategyId: string): Promise<{
  total: number;
  valid: number;
  invalid: number;
  skipped: number;
  score: number;
}> {
  const results = await validateCrossReferences(strategyId);
  const valid = results.filter((r) => r.status === "VALID").length;
  const invalid = results.filter((r) => r.status === "INVALID").length;
  const skipped = results.filter((r) => r.status === "SKIPPED").length;
  const applicable = valid + invalid;
  return {
    total: results.length,
    valid,
    invalid,
    skipped,
    score: applicable > 0 ? Math.round((valid / applicable) * 100) : 0,
  };
}
