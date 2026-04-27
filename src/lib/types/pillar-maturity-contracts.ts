/**
 * Pillar Maturity Contracts — The Single Source of Truth
 *
 * Defines what fields each pillar MUST have at each maturity stage.
 *
 * INTAKE:   fields guaranteed after Quick Intake completes
 * ENRICHED: fields guaranteed after RTIS cascade runs
 * COMPLETE: auto-derived from Glory registry bindings — every path that
 *           ANY Glory tool binds to MUST be filled before sequences run
 *
 * The COMPLETE stage is NEVER hand-written. It's computed at module load
 * from ALL_GLORY_TOOLS pillarBindings. Adding a binding to a tool
 * automatically extends the contract.
 */

import type { FieldRequirement, PillarMaturityContract, MaturityStage } from "./pillar-maturity";

// ─── INTAKE Stage (minimum viable after Quick Intake) ───────────────────────

const INTAKE_A: FieldRequirement[] = [
  // Fondamentaux (migrés de Strategy — Chantier -1)
  { path: "nomMarque", validator: "non_empty", derivable: true, derivationSource: "cross_pillar", description: "Nom de la marque (derive de Strategy.name)" },
  { path: "description", validator: "min_length", validatorArg: 10, derivable: true, derivationSource: "cross_pillar", description: "Description de la marque" },
  { path: "secteur", validator: "non_empty", derivable: true, derivationSource: "cross_pillar", description: "Secteur d'activite (derive de Strategy)" },
  { path: "pays", validator: "non_empty", derivable: true, derivationSource: "cross_pillar", description: "Pays/marche d'origine (derive de Strategy)" },
  // Identité
  { path: "archetype", validator: "non_empty", derivable: false, description: "Archetype de marque" },
  { path: "noyauIdentitaire", validator: "min_length", validatorArg: 10, derivable: false, description: "Noyau identitaire" },
  { path: "citationFondatrice", validator: "min_length", validatorArg: 5, derivable: false, description: "Citation fondatrice" },
];

const INTAKE_D: FieldRequirement[] = [
  { path: "positionnement", validator: "min_length", validatorArg: 10, derivable: false, description: "Positionnement" },
  { path: "promesseMaitre", validator: "min_length", validatorArg: 5, derivable: false, description: "Promesse maitre" },
  { path: "personas", validator: "min_items", validatorArg: 1, derivable: false, description: "Au moins 1 persona" },
];

const INTAKE_V: FieldRequirement[] = [
  { path: "produitsCatalogue", validator: "min_items", validatorArg: 1, derivable: false, description: "Au moins 1 produit/service" },
  // Fondamentaux économiques (migrés de Strategy.businessContext)
  { path: "businessModel", validator: "non_empty", derivable: false, description: "Modele d'affaires" },
];

const INTAKE_E: FieldRequirement[] = [
  { path: "touchpoints", validator: "min_items", validatorArg: 1, derivable: true, derivationSource: "ai_generation", description: "Au moins 1 touchpoint" },
];

// R, T, I, S don't exist at INTAKE — they're created by the cascade
const INTAKE_R: FieldRequirement[] = [];
const INTAKE_T: FieldRequirement[] = [];
const INTAKE_I: FieldRequirement[] = [];
const INTAKE_S: FieldRequirement[] = [];

// ─── ENRICHED Stage (after RTIS cascade) ────────────────────────────────────

const ENRICHED_A: FieldRequirement[] = [
  ...INTAKE_A,
  { path: "valeurs", validator: "min_items", validatorArg: 1, derivable: true, derivationSource: "ai_generation", description: "1-3 valeurs Schwartz (max 3)" },
  { path: "herosJourney", validator: "min_items", validatorArg: 3, derivable: true, derivationSource: "ai_generation", description: "3+ actes du parcours du heros" },
  { path: "ikigai", validator: "is_object", derivable: true, derivationSource: "ai_generation", description: "Ikigai de marque (4 quadrants)" },
  { path: "enemy", validator: "is_object", derivable: true, derivationSource: "rtis_cascade", description: "Ennemi identifie" },
  { path: "prophecy", validator: "is_object", derivable: true, derivationSource: "rtis_cascade", description: "Prophetie de marque" },
  // Transition A→D
  { path: "publicCible", validator: "min_length", validatorArg: 5, derivable: true, derivationSource: "ai_generation", description: "Public cible general (D detaille en personas)" },
  { path: "promesseFondamentale", validator: "min_length", validatorArg: 10, derivable: true, derivationSource: "ai_generation", description: "Croyance fondamentale (D en derive le positionnement)" },
];

const ENRICHED_D: FieldRequirement[] = [
  ...INTAKE_D,
  { path: "personas", validator: "min_items", validatorArg: 2, derivable: true, derivationSource: "rtis_cascade", description: "2+ personas enrichis" },
  { path: "tonDeVoix", validator: "is_object", derivable: true, derivationSource: "ai_generation", description: "Ton de voix" },
  { path: "sousPromesses", validator: "min_items", validatorArg: 2, derivable: true, derivationSource: "ai_generation", description: "2+ sous-promesses" },
  { path: "paysageConcurrentiel", validator: "min_items", validatorArg: 1, derivable: true, derivationSource: "rtis_cascade", description: "Paysage concurrentiel" },
  // Transition A→D
  { path: "archetypalExpression", validator: "is_object", derivable: true, derivationSource: "ai_generation", description: "Expression visuelle/verbale de l'archetype A" },
  { path: "assetsLinguistiques.languePrincipale", validator: "non_empty", derivable: true, derivationSource: "cross_pillar", description: "Langue principale (derivee de A.langue)" },
];

const ENRICHED_V: FieldRequirement[] = [
  ...INTAKE_V,
  { path: "unitEconomics", validator: "is_object", derivable: true, derivationSource: "rtis_cascade", description: "Unit economics" },
  { path: "productLadder", validator: "min_items", validatorArg: 1, derivable: true, derivationSource: "ai_generation", description: "Echelle produit" },
  // Transition D→V
  { path: "pricingJustification", validator: "min_length", validatorArg: 10, derivable: true, derivationSource: "ai_generation", description: "Justification du pricing vs positionnement D" },
  { path: "personaSegmentMap", validator: "min_items", validatorArg: 1, derivable: true, derivationSource: "cross_pillar", description: "Mapping persona (D) → produit (V)" },
];

const ENRICHED_E: FieldRequirement[] = [
  ...INTAKE_E,
  { path: "touchpoints", validator: "min_items", validatorArg: 3, derivable: true, derivationSource: "rtis_cascade", description: "3+ touchpoints" },
  { path: "rituels", validator: "min_items", validatorArg: 1, derivable: true, derivationSource: "ai_generation", description: "1+ rituel de marque" },
  { path: "aarrr", validator: "is_object", derivable: true, derivationSource: "rtis_cascade", description: "Funnel AARRR" },
  { path: "kpis", validator: "min_items", validatorArg: 3, derivable: true, derivationSource: "ai_generation", description: "3+ KPIs" },
  // Fondamentaux engagement
  { path: "promesseExperience", validator: "min_length", validatorArg: 10, derivable: true, derivationSource: "ai_generation", description: "Promesse d'experience garantie" },
  { path: "superfanPortrait", validator: "is_object", derivable: true, derivationSource: "ai_generation", description: "Portrait du superfan cible" },
  // Transitions V→E
  { path: "ladderProductAlignment", validator: "min_items", validatorArg: 2, derivable: true, derivationSource: "cross_pillar", description: "Mapping Devotion Ladder ↔ Product Ladder" },
  { path: "conversionTriggers", validator: "min_items", validatorArg: 2, derivable: true, derivationSource: "ai_generation", description: "Triggers de conversion entre niveaux Devotion" },
];

const ENRICHED_R: FieldRequirement[] = [
  { path: "globalSwot", validator: "is_object", derivable: true, derivationSource: "rtis_cascade", description: "SWOT global" },
  { path: "probabilityImpactMatrix", validator: "min_items", validatorArg: 3, derivable: true, derivationSource: "rtis_cascade", description: "3+ risques identifies" },
  { path: "mitigationPriorities", validator: "min_items", validatorArg: 3, derivable: true, derivationSource: "rtis_cascade", description: "3+ actions de mitigation" },
  // Transition E→R (diagnostic ADVE)
  { path: "pillarGaps", validator: "is_object", derivable: true, derivationSource: "calculation", description: "Diagnostic par pilier ADVE (score + gaps)" },
  // Overton blockers
  { path: "overtonBlockers", validator: "min_items", validatorArg: 1, derivable: true, derivationSource: "rtis_cascade", description: "Risques qui bloquent le deplacement de la fenetre d'Overton" },
];

const ENRICHED_T: FieldRequirement[] = [
  { path: "triangulation", validator: "is_object", derivable: true, derivationSource: "rtis_cascade", description: "Triangulation marche" },
  { path: "hypothesisValidation", validator: "min_items", validatorArg: 2, derivable: true, derivationSource: "rtis_cascade", description: "2+ hypotheses" },
  { path: "tamSamSom", validator: "is_object", derivable: true, derivationSource: "rtis_cascade", description: "TAM/SAM/SOM" },
  // Transition R→T
  { path: "riskValidation", validator: "min_items", validatorArg: 1, derivable: true, derivationSource: "rtis_cascade", description: "Risques R confrontes au marche" },
  // Overton mesure
  { path: "overtonPosition", validator: "is_object", derivable: true, derivationSource: "rtis_cascade", description: "Position actuelle de la fenetre d'Overton" },
  { path: "perceptionGap", validator: "is_object", derivable: true, derivationSource: "cross_pillar", description: "Ecart perception actuelle (T) vs cible (A+D)" },
];

const ENRICHED_I: FieldRequirement[] = [
  { path: "catalogueParCanal", validator: "is_object", derivable: true, derivationSource: "rtis_cascade", description: "Catalogue d'actions par canal (DIGITAL, EVENEMENTIEL, MEDIA, etc.)" },
  { path: "assetsProduisibles", validator: "min_items", validatorArg: 5, derivable: true, derivationSource: "rtis_cascade", description: "5+ assets produisibles" },
  { path: "activationsPossibles", validator: "min_items", validatorArg: 3, derivable: true, derivationSource: "rtis_cascade", description: "3+ activations possibles" },
  { path: "formatsDisponibles", validator: "min_items", validatorArg: 5, derivable: true, derivationSource: "rtis_cascade", description: "5+ formats creatifs disponibles" },
  { path: "brandPlatform", validator: "is_object", derivable: true, derivationSource: "cross_pillar", description: "Plateforme de marque (derivee de A+D)" },
  // Transition T→I
  { path: "actionsByDevotionLevel", validator: "is_object", derivable: true, derivationSource: "rtis_cascade", description: "Catalogue trie par niveau Devotion Ladder" },
  { path: "riskMitigationActions", validator: "min_items", validatorArg: 1, derivable: true, derivationSource: "rtis_cascade", description: "Actions qui mitigent les risques R" },
  // Innovation
  { path: "innovationsProduit", validator: "min_items", validatorArg: 1, derivable: true, derivationSource: "ai_generation", description: "Innovations produit/marque possibles" },
];

const ENRICHED_S: FieldRequirement[] = [
  { path: "fenetreOverton", validator: "is_object", derivable: true, derivationSource: "rtis_cascade", description: "Fenetre d'Overton — COEUR DE S (perception actuelle/cible/ecart + strategie deplacement)" },
  { path: "axesStrategiques", validator: "min_items", validatorArg: 2, derivable: true, derivationSource: "rtis_cascade", description: "2+ axes strategiques" },
  { path: "sprint90Days", validator: "min_items", validatorArg: 5, derivable: true, derivationSource: "rtis_cascade", description: "5+ actions planifiees avec devotionImpact" },
  { path: "facteursClesSucces", validator: "min_items", validatorArg: 3, derivable: true, derivationSource: "rtis_cascade", description: "3+ facteurs cles de succes" },
  { path: "roadmap", validator: "min_items", validatorArg: 3, derivable: true, derivationSource: "rtis_cascade", description: "3+ phases de roadmap avec objectifDevotion" },
  // Transitions I→S
  { path: "selectedFromI", validator: "min_items", validatorArg: 3, derivable: true, derivationSource: "rtis_cascade", description: "3+ actions choisies depuis I.catalogue avec tracabilite" },
  { path: "devotionFunnel", validator: "min_items", validatorArg: 1, derivable: true, derivationSource: "rtis_cascade", description: "Objectifs Devotion quantifies par phase" },
  { path: "overtonMilestones", validator: "min_items", validatorArg: 1, derivable: true, derivationSource: "rtis_cascade", description: "Jalons de deplacement de la fenetre d'Overton" },
];

// ─── COMPLETE Stage — Auto-derived from Glory Registry ──────────────────────

/**
 * Derive COMPLETE stage requirements from the Glory tools registry.
 * Every pillarBinding path that ANY tool references becomes a COMPLETE requirement.
 *
 * This is called once at module load — the contract is immutable at runtime.
 * Adding a new pillarBinding to a tool automatically extends the contract.
 */
export function deriveCompleteRequirements(
  allTools: Array<{ pillarBindings?: Partial<Record<string, string>> }>
): Record<string, FieldRequirement[]> {
  const byPillar: Record<string, Set<string>> = {};

  for (const tool of allTools) {
    if (!tool.pillarBindings) continue;
    for (const [, bindingPath] of Object.entries(tool.pillarBindings)) {
      if (!bindingPath) continue;
      const dot = bindingPath.indexOf(".");
      if (dot < 0) continue;
      const pillarKey = bindingPath.slice(0, dot).toLowerCase();
      const fieldPath = bindingPath.slice(dot + 1);
      if (!byPillar[pillarKey]) byPillar[pillarKey] = new Set();
      byPillar[pillarKey].add(fieldPath);
    }
  }

  const result: Record<string, FieldRequirement[]> = {};
  for (const [pillarKey, paths] of Object.entries(byPillar)) {
    result[pillarKey] = Array.from(paths).map(path => ({
      path,
      validator: "non_empty" as const,
      derivable: true,
      derivationSource: "ai_generation" as const,
      description: `Required by Glory tools (${pillarKey}.${path})`,
    }));
  }
  return result;
}

// ─── Build Contracts ────────────────────────────────────────────────────────

const ENRICHED_MAP: Record<string, FieldRequirement[]> = {
  a: ENRICHED_A, d: ENRICHED_D, v: ENRICHED_V, e: ENRICHED_E,
  r: ENRICHED_R, t: ENRICHED_T, i: ENRICHED_I, s: ENRICHED_S,
};

const INTAKE_MAP: Record<string, FieldRequirement[]> = {
  a: INTAKE_A, d: INTAKE_D, v: INTAKE_V, e: INTAKE_E,
  r: INTAKE_R, t: INTAKE_T, i: INTAKE_I, s: INTAKE_S,
};

/**
 * Build the complete set of pillar maturity contracts.
 * Must be called after the Glory registry is loaded.
 *
 * @param allTools - ALL_GLORY_TOOLS from the registry
 */
export function buildContracts(
  allTools: Array<{ pillarBindings?: Partial<Record<string, string>> }>
): Record<string, PillarMaturityContract> {
  const completeMap = deriveCompleteRequirements(allTools);
  const pillarKeys = ["a", "d", "v", "e", "r", "t", "i", "s"];

  const contracts: Record<string, PillarMaturityContract> = {};

  for (const key of pillarKeys) {
    const intake = INTAKE_MAP[key] ?? [];
    const enriched = ENRICHED_MAP[key] ?? [];
    const gloryDerived = completeMap[key] ?? [];

    // COMPLETE = ENRICHED + all Glory-derived fields (deduplicated by path)
    const enrichedPaths = new Set(enriched.map(r => r.path));
    const completeExtras = gloryDerived.filter(r => !enrichedPaths.has(r.path));

    contracts[key] = {
      pillarKey: key,
      stages: {
        INTAKE: intake,
        ENRICHED: enriched,
        COMPLETE: [...enriched, ...completeExtras],
      },
    };
  }

  return contracts;
}
