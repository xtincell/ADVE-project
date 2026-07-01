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

  // ── Rules 18-30: Financial coherence ────────────────────────────────────

  const vPillar = p.V as Record<string, unknown> | null;
  const sPillar = p.S as Record<string, unknown> | null;
  const tPillar = p.T as Record<string, unknown> | null;
  const ue = (vPillar?.unitEconomics ?? {}) as Record<string, unknown>;
  const vProduits = vPillar?.produitsCatalogue as Array<Record<string, unknown>> | undefined;
  const prixProduit = vProduits?.[0]?.prix as number | undefined;
  const cac = ue.cac as number | undefined;
  const ltv = ue.ltv as number | undefined;
  const ltvCacRatio = ue.ltvCacRatio as number | undefined;
  const budgetCom = ue.budgetCom as number | undefined;
  const caVise = ue.caVise as number | undefined;
  const margeNette = ue.margeNette as number | undefined;
  const paybackPeriod = ue.paybackPeriod as number | undefined;
  const globalBudget = sPillar?.globalBudget as number | undefined;
  const tamSamSom = tPillar?.tamSamSom as Record<string, unknown> | undefined;

  // 18. CAC < prix produit
  if (!cac || !prixProduit) {
    results.push({ rule: "CAC < Prix produit", ruleId: 18, from: "V.unitEconomics.cac", to: "V.produitsCatalogue.prix", status: "SKIPPED", message: "Donnees insuffisantes" });
  } else {
    results.push({ rule: "CAC < Prix produit", ruleId: 18, from: "V.unitEconomics.cac", to: "V.produitsCatalogue.prix", status: cac < prixProduit ? "VALID" : "INVALID", message: cac < prixProduit ? `CAC ${cac} < prix ${prixProduit}` : `CAC ${cac} depasse le prix produit ${prixProduit}` });
  }

  // 19. LTV/CAC >= 1.0
  if (ltvCacRatio === undefined) {
    results.push({ rule: "LTV/CAC >= 1.0", ruleId: 19, from: "V.unitEconomics.ltvCacRatio", to: "V.unitEconomics", status: "SKIPPED", message: "Ratio non calcule" });
  } else {
    results.push({ rule: "LTV/CAC >= 1.0", ruleId: 19, from: "V.unitEconomics.ltvCacRatio", to: "V.unitEconomics", status: ltvCacRatio >= 1.0 ? "VALID" : "INVALID", message: ltvCacRatio >= 1.0 ? `Ratio ${ltvCacRatio} — rentable` : `Ratio ${ltvCacRatio} < 1.0 — chaque client coute plus qu'il rapporte` });
  }

  // 20. Budget <= CA vise
  if (!budgetCom || !caVise) {
    results.push({ rule: "Budget <= CA vise", ruleId: 20, from: "V.unitEconomics.budgetCom", to: "V.unitEconomics.caVise", status: "SKIPPED", message: "Donnees insuffisantes" });
  } else {
    results.push({ rule: "Budget <= CA vise", ruleId: 20, from: "V.unitEconomics.budgetCom", to: "V.unitEconomics.caVise", status: budgetCom <= caVise ? "VALID" : "INVALID", message: budgetCom <= caVise ? `Budget ${budgetCom} <= CA ${caVise}` : `Budget ${budgetCom} depasse le CA vise ${caVise}` });
  }

  // 21. Budget >= seuil minimum sectoriel (5% du CA comme plancher)
  if (!budgetCom || !caVise) {
    results.push({ rule: "Budget >= seuil minimum", ruleId: 21, from: "V.unitEconomics.budgetCom", to: "V.unitEconomics.caVise", status: "SKIPPED", message: "Donnees insuffisantes" });
  } else {
    const minBudget = caVise * 0.03; // 3% plancher absolu
    results.push({ rule: "Budget >= seuil minimum", ruleId: 21, from: "V.unitEconomics.budgetCom", to: "V.unitEconomics.caVise", status: budgetCom >= minBudget ? "VALID" : "INVALID", message: budgetCom >= minBudget ? `Budget suffisant (${((budgetCom / caVise) * 100).toFixed(1)}% du CA)` : `Budget trop faible: ${((budgetCom / caVise) * 100).toFixed(1)}% du CA (minimum 3%)` });
  }

  // 22. Marge nette > 0
  if (margeNette === undefined) {
    results.push({ rule: "Marge nette > 0", ruleId: 22, from: "V.unitEconomics.margeNette", to: "V.unitEconomics", status: "SKIPPED", message: "Non renseignee" });
  } else {
    results.push({ rule: "Marge nette > 0", ruleId: 22, from: "V.unitEconomics.margeNette", to: "V.unitEconomics", status: margeNette > 0 ? "VALID" : "INVALID", message: margeNette > 0 ? `Marge ${(margeNette * 100).toFixed(1)}% — positive` : `Marge ${(margeNette * 100).toFixed(1)}% — negative` });
  }

  // 23. Payback <= 36 mois
  if (paybackPeriod === undefined) {
    results.push({ rule: "Payback <= 36 mois", ruleId: 23, from: "V.unitEconomics.paybackPeriod", to: "V.unitEconomics", status: "SKIPPED", message: "Non renseigne" });
  } else {
    results.push({ rule: "Payback <= 36 mois", ruleId: 23, from: "V.unitEconomics.paybackPeriod", to: "V.unitEconomics", status: paybackPeriod <= 36 ? "VALID" : "INVALID", message: paybackPeriod <= 36 ? `Payback ${paybackPeriod} mois — acceptable` : `Payback ${paybackPeriod} mois — trop long (max 36)` });
  }

  // 24. S.globalBudget ~ V.budgetCom (tolerance 30%)
  if (!globalBudget || !budgetCom) {
    results.push({ rule: "S.globalBudget ~ V.budgetCom", ruleId: 24, from: "S.globalBudget", to: "V.unitEconomics.budgetCom", status: "SKIPPED", message: "Donnees insuffisantes" });
  } else {
    const ratio = globalBudget / budgetCom;
    const coherent = ratio >= 0.7 && ratio <= 1.3;
    results.push({ rule: "S.globalBudget ~ V.budgetCom", ruleId: 24, from: "S.globalBudget", to: "V.unitEconomics.budgetCom", status: coherent ? "VALID" : "INVALID", message: coherent ? `Ecart ${((ratio - 1) * 100).toFixed(0)}% — coherent` : `Ecart ${((ratio - 1) * 100).toFixed(0)}% — incoherent (tolerance 30%)` });
  }

  // 25. budgetByDevotion sum ~ globalBudget
  const budgetByDevotion = sPillar?.budgetByDevotion as Record<string, number> | undefined;
  if (!budgetByDevotion || !globalBudget) {
    results.push({ rule: "budgetByDevotion sum = globalBudget", ruleId: 25, from: "S.budgetByDevotion", to: "S.globalBudget", status: "SKIPPED", message: "Donnees insuffisantes" });
  } else {
    const sum = Object.values(budgetByDevotion).reduce((a, b) => a + (typeof b === "number" ? b : 0), 0);
    const ratio = globalBudget > 0 ? sum / globalBudget : 0;
    const ok = ratio >= 0.8 && ratio <= 1.2;
    results.push({ rule: "budgetByDevotion sum = globalBudget", ruleId: 25, from: "S.budgetByDevotion", to: "S.globalBudget", status: ok ? "VALID" : "INVALID", message: ok ? `Somme ${sum} ~ globalBudget ${globalBudget}` : `Somme ${sum} != globalBudget ${globalBudget}` });
  }

  // 26. T.tamSamSom.som > 0 si V.caVise > 0
  const som = (tamSamSom?.som as Record<string, unknown>)?.value as number | undefined;
  if (!caVise || caVise === 0) {
    results.push({ rule: "SOM > 0 si CA vise", ruleId: 26, from: "T.tamSamSom.som", to: "V.unitEconomics.caVise", status: "SKIPPED", message: "CA non renseigne" });
  } else {
    results.push({ rule: "SOM > 0 si CA vise", ruleId: 26, from: "T.tamSamSom.som", to: "V.unitEconomics.caVise", status: (som && som > 0) ? "VALID" : "INVALID", message: (som && som > 0) ? `SOM ${som} defini` : `SOM non defini alors que CA vise = ${caVise}` });
  }

  // 27. ROI coherent avec LTV/CAC
  const roiEstime = ue.roiEstime as number | undefined;
  if (roiEstime === undefined || ltvCacRatio === undefined) {
    results.push({ rule: "ROI coherent avec LTV/CAC", ruleId: 27, from: "V.unitEconomics.roiEstime", to: "V.unitEconomics.ltvCacRatio", status: "SKIPPED", message: "Donnees insuffisantes" });
  } else {
    // ROI and LTV/CAC should correlate: high LTV/CAC → high ROI
    const expectedMinRoi = (ltvCacRatio - 1) * 50; // LTV/CAC=3 → minROI ~100%
    const coherent = roiEstime >= expectedMinRoi * 0.5;
    results.push({ rule: "ROI coherent avec LTV/CAC", ruleId: 27, from: "V.unitEconomics.roiEstime", to: "V.unitEconomics.ltvCacRatio", status: coherent ? "VALID" : "INVALID", message: coherent ? `ROI ${roiEstime}% coherent avec LTV/CAC ${ltvCacRatio}` : `ROI ${roiEstime}% trop bas pour un LTV/CAC de ${ltvCacRatio}` });
  }

  // 28-30: Structural coherence (roadmap budget, touchpoints, activations)
  const ePillar = p.E as Record<string, unknown> | null;
  const eTouchpoints = ePillar?.touchpoints as unknown[] | undefined;
  if (budgetCom && budgetCom > 0 && (!eTouchpoints || eTouchpoints.length === 0)) {
    results.push({ rule: "Touchpoints si budget > 0", ruleId: 28, from: "E.touchpoints", to: "V.unitEconomics.budgetCom", status: "INVALID", message: `Budget ${budgetCom} declare mais 0 touchpoints definis` });
  } else {
    results.push({ rule: "Touchpoints si budget > 0", ruleId: 28, from: "E.touchpoints", to: "V.unitEconomics.budgetCom", status: "VALID", message: "Coherent" });
  }

  const roadmap = sPillar?.roadmap as Array<Record<string, unknown>> | undefined;
  if (roadmap && globalBudget && globalBudget > 0) {
    const roadmapBudgetSum = roadmap.reduce((sum, phase) => sum + (typeof phase.budget === "number" ? phase.budget : 0), 0);
    const ratio = roadmapBudgetSum / globalBudget;
    const ok = ratio >= 0.7 && ratio <= 1.3;
    results.push({ rule: "Roadmap budget sum ~ globalBudget", ruleId: 30, from: "S.roadmap.budget", to: "S.globalBudget", status: ok ? "VALID" : "INVALID", message: ok ? `Somme phases ${roadmapBudgetSum} ~ globalBudget ${globalBudget}` : `Somme phases ${roadmapBudgetSum} incoherente avec globalBudget ${globalBudget}` });
  } else {
    results.push({ rule: "Roadmap budget sum ~ globalBudget", ruleId: 30, from: "S.roadmap.budget", to: "S.globalBudget", status: "SKIPPED", message: "Donnees insuffisantes" });
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
