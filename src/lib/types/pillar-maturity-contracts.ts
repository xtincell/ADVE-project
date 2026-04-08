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
  { path: "valeurs", validator: "min_items", validatorArg: 3, derivable: true, derivationSource: "ai_generation", description: "3+ valeurs Schwartz" },
  { path: "herosJourney", validator: "min_items", validatorArg: 3, derivable: true, derivationSource: "ai_generation", description: "3+ actes du parcours du heros" },
  { path: "ikigai", validator: "is_object", derivable: true, derivationSource: "ai_generation", description: "Ikigai de marque (4 quadrants)" },
  { path: "enemy", validator: "is_object", derivable: true, derivationSource: "rtis_cascade", description: "Ennemi identifie" },
  { path: "prophecy", validator: "is_object", derivable: true, derivationSource: "rtis_cascade", description: "Prophetie de marque" },
];

const ENRICHED_D: FieldRequirement[] = [
  ...INTAKE_D,
  { path: "personas", validator: "min_items", validatorArg: 2, derivable: true, derivationSource: "rtis_cascade", description: "2+ personas enrichis" },
  { path: "tonDeVoix", validator: "is_object", derivable: true, derivationSource: "ai_generation", description: "Ton de voix" },
  { path: "sousPromesses", validator: "min_items", validatorArg: 2, derivable: true, derivationSource: "ai_generation", description: "2+ sous-promesses" },
  { path: "paysageConcurrentiel", validator: "min_items", validatorArg: 1, derivable: true, derivationSource: "rtis_cascade", description: "Paysage concurrentiel" },
];

const ENRICHED_V: FieldRequirement[] = [
  ...INTAKE_V,
  { path: "unitEconomics", validator: "is_object", derivable: true, derivationSource: "rtis_cascade", description: "Unit economics" },
  { path: "productLadder", validator: "min_items", validatorArg: 1, derivable: true, derivationSource: "ai_generation", description: "Echelle produit" },
];

const ENRICHED_E: FieldRequirement[] = [
  ...INTAKE_E,
  { path: "touchpoints", validator: "min_items", validatorArg: 3, derivable: true, derivationSource: "rtis_cascade", description: "3+ touchpoints" },
  { path: "rituels", validator: "min_items", validatorArg: 1, derivable: true, derivationSource: "ai_generation", description: "1+ rituel de marque" },
  { path: "aarrr", validator: "is_object", derivable: true, derivationSource: "rtis_cascade", description: "Funnel AARRR" },
  { path: "kpis", validator: "min_items", validatorArg: 3, derivable: true, derivationSource: "ai_generation", description: "3+ KPIs" },
];

const ENRICHED_R: FieldRequirement[] = [
  { path: "globalSwot", validator: "is_object", derivable: true, derivationSource: "rtis_cascade", description: "SWOT global" },
  { path: "probabilityImpactMatrix", validator: "min_items", validatorArg: 3, derivable: true, derivationSource: "rtis_cascade", description: "3+ risques identifies" },
  { path: "mitigationPriorities", validator: "min_items", validatorArg: 3, derivable: true, derivationSource: "rtis_cascade", description: "3+ actions de mitigation" },
];

const ENRICHED_T: FieldRequirement[] = [
  { path: "triangulation", validator: "is_object", derivable: true, derivationSource: "rtis_cascade", description: "Triangulation marche" },
  { path: "hypothesisValidation", validator: "min_items", validatorArg: 2, derivable: true, derivationSource: "rtis_cascade", description: "2+ hypotheses" },
  { path: "tamSamSom", validator: "is_object", derivable: true, derivationSource: "rtis_cascade", description: "TAM/SAM/SOM" },
];

const ENRICHED_I: FieldRequirement[] = [
  { path: "catalogueActions", validator: "min_items", validatorArg: 5, derivable: true, derivationSource: "rtis_cascade", description: "5+ actions potentielles" },
  { path: "brandPlatform", validator: "is_object", derivable: true, derivationSource: "rtis_cascade", description: "Plateforme de marque" },
];

const ENRICHED_S: FieldRequirement[] = [
  { path: "visionStrategique", validator: "min_length", validatorArg: 20, derivable: true, derivationSource: "rtis_cascade", description: "Vision strategique" },
  { path: "axesStrategiques", validator: "min_items", validatorArg: 2, derivable: true, derivationSource: "rtis_cascade", description: "2+ axes strategiques" },
  { path: "facteursClesSucces", validator: "min_items", validatorArg: 3, derivable: true, derivationSource: "rtis_cascade", description: "3+ facteurs cles de succes" },
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
