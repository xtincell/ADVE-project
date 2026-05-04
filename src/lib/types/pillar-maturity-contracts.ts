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

import { z } from "zod";
import type { FieldRequirement, PillarMaturityContract, MaturityStage, FieldValidator } from "./pillar-maturity";
import { PILLAR_SCHEMAS } from "./pillar-schemas";

// ─── INTAKE Stage (minimum viable after Quick Intake) ───────────────────────

const INTAKE_A: FieldRequirement[] = [
  // Fondamentaux (migrés de Strategy — Chantier -1)
  { path: "nomMarque", validator: "non_empty", derivable: true, derivationSource: "cross_pillar", description: "Nom de la marque (derive de Strategy.name)" },
  { path: "description", validator: "min_length", validatorArg: 10, derivable: true, derivationSource: "cross_pillar", description: "Description de la marque" },
  { path: "secteur", validator: "non_empty", derivable: true, derivationSource: "cross_pillar", description: "Secteur d'activite (derive de Strategy)" },
  { path: "pays", validator: "non_empty", derivable: true, derivationSource: "cross_pillar", description: "Pays/marche d'origine (derive de Strategy)" },
  // Identité
  { path: "archetype", validator: "non_empty", derivable: false, description: "Archetype de marque" },
  { path: "noyauIdentitaire", validator: "min_length", validatorArg: 10, derivable: false, description: "Noyau identitaire (Q intake a_noyau, required)" },
  // ADR-0030 Axe 2 — fallback gracieux : si l'utilisateur n'a pas répondu à
  // a_citation (Q optional), l'auto-filler peut dériver depuis a_origin/a_mission
  // via cross_pillar. Le default reste l'explicite côté UI.
  { path: "citationFondatrice", validator: "min_length", validatorArg: 5, derivable: true, derivationSource: "cross_pillar", description: "Citation fondatrice (Q intake a_citation, optional)" },
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

// ─── COMPLETE Stage — Auto-derived from Zod schema + Glory Registry ────────

/**
 * Champs strictement non-inférables — saisie humaine OBLIGATOIRE car la
 * valeur est nominative-réelle (identités personnelles) et l'IA ne peut
 * pas l'inventer sans risquer de produire des fictions confondantes avec
 * le réel.
 *
 * RÈGLE — l'opérateur a tranché : "Enrichir" est exhaustif. Tout champ
 * structurel/conceptuel (archetype, positionnement, personas, catalogue,
 * etc.) est inférable par l'IA depuis les autres signaux disponibles ;
 * l'opérateur amende a posteriori via OPERATOR_AMEND_PILLAR si l'inférence
 * est insatisfaisante. Seules les identités nominales humaines/légales
 * restent needsHuman strict.
 */
const NEEDS_HUMAN_BY_PILLAR: Record<string, Set<string>> = {
  // Politique opérateur : "je vise 100%, infère tout, je ne veux rien savoir."
  // Aucun champ structurel n'est verrouillé needsHuman. Même equipeDirigeante
  // est inférable (l'IA propose un casting fictif aligné avec l'archetype +
  // secteur ; l'opérateur amend a posteriori si nominal réel disponible).
  a: new Set<string>(),
  d: new Set<string>(),
  v: new Set<string>(),
  e: new Set<string>(),
  r: new Set<string>(),
  t: new Set<string>(),
  i: new Set<string>(),
  s: new Set<string>(),
};

/**
 * Unwrap ZodOptional/ZodNullable/ZodDefault/ZodEffects/ZodPipe/ZodUnion to
 * reach the underlying schema. Zod 4 exposes constructor.name ("ZodOptional",
 * etc.) and `_def.innerType` for wrapper types.
 */
function unwrapZod(t: unknown): unknown {
  let cur: any = t;
  let safety = 0;
  while (cur && typeof cur === "object" && safety++ < 16) {
    const ctor = (cur.constructor && cur.constructor.name) ?? "";
    const def = cur._def ?? {};
    if (ctor === "ZodOptional" || ctor === "ZodNullable" || ctor === "ZodDefault") {
      cur = def.innerType ?? def.schema ?? cur;
    } else if (ctor === "ZodEffects" || ctor === "ZodTransform") {
      cur = def.schema ?? def.innerType ?? cur;
    } else if (ctor === "ZodPipe") {
      cur = def.in ?? def.out ?? cur;
    } else if (ctor === "ZodUnion") {
      const opts = (def.options ?? []) as any[];
      // Prefer ZodObject > ZodArray > ZodString to choose the most "structural" branch
      const ranked = opts
        .map((o) => ({ o, score: o?.constructor?.name === "ZodObject" ? 3 : o?.constructor?.name === "ZodArray" ? 2 : o?.constructor?.name === "ZodString" ? 1 : 0 }))
        .sort((a, b) => b.score - a.score);
      cur = ranked[0]?.o ?? opts[0] ?? cur;
      break;
    } else {
      break;
    }
  }
  return cur;
}

/** Map Zod type → FieldValidator + arg */
function inferValidatorFromZod(zod: unknown): { validator: FieldValidator; arg?: number } {
  const ctor = (zod as any)?.constructor?.name ?? "";
  if (ctor === "ZodObject" || ctor === "ZodRecord" || ctor === "ZodMap") return { validator: "is_object" };
  if (ctor === "ZodArray") return { validator: "min_items", arg: 1 };
  if (ctor === "ZodNumber" || ctor === "ZodBigInt") return { validator: "is_number" };
  // ZodString / ZodEnum / ZodLiteral / ZodBoolean / ZodDate / fallback
  return { validator: "non_empty" };
}

/**
 * Extrait les sub-keys d'un ZodObject. Distingue celles required (non-optional)
 * et celles optional. Pour les arrays de ZodObject, descend dans l'élément.
 */
function extractObjectKeys(zod: unknown): { required: string[]; optional: string[] } {
  const cur: any = unwrapZod(zod);
  const ctor = cur?.constructor?.name ?? "";
  if (ctor === "ZodArray") {
    const element = cur._def?.element ?? cur._def?.type ?? cur._def?.innerType;
    return extractObjectKeys(element);
  }
  if (ctor !== "ZodObject") return { required: [], optional: [] };
  const shape = (cur.shape ?? {}) as Record<string, any>;
  const required: string[] = [];
  const optional: string[] = [];
  for (const [k, v] of Object.entries(shape)) {
    const ctorV = (v as any)?.constructor?.name ?? "";
    if (ctorV === "ZodOptional" || ctorV === "ZodDefault" || ctorV === "ZodNullable") {
      optional.push(k);
    } else {
      required.push(k);
    }
  }
  return { required, optional };
}

/**
 * Récursivement construit un exemple JSON typé depuis un schema Zod.
 * Sert à montrer au LLM la SHAPE EXACTE attendue (sub-keys, types) pour
 * éviter qu'il invente des keys (ex: ikigai {good,love,paid,skill} au lieu
 * de {love,competence,worldNeed,remuneration}).
 *
 * Profondeur capée à 3 pour ne pas exploser le prompt sur des arborescences
 * profondes (directionArtistique a 10+ sous-objets imbriqués).
 */
export function buildExampleFromZod(zod: unknown, depth = 0, maxDepth = 3): unknown {
  if (depth > maxDepth) return "...";
  const cur = unwrapZod(zod) as any;
  const ctor = cur?.constructor?.name ?? "";
  const def = cur?._def ?? {};
  if (ctor === "ZodObject") {
    const shape = (cur.shape ?? {}) as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(shape)) {
      out[k] = buildExampleFromZod(v, depth + 1, maxDepth);
    }
    return out;
  }
  if (ctor === "ZodArray") {
    const element = def.element ?? def.type ?? def.innerType;
    return [buildExampleFromZod(element, depth + 1, maxDepth)];
  }
  if (ctor === "ZodRecord") return { "<key>": buildExampleFromZod(def.valueType ?? def.value, depth + 1, maxDepth) };
  if (ctor === "ZodEnum") {
    // Zod 4 expose les values via def.entries (object) ou def.values (array).
    const entries = def.entries;
    if (entries && typeof entries === "object") {
      const vals = Object.values(entries);
      if (vals.length > 0) return vals[0];
    }
    if (Array.isArray(def.values) && def.values.length > 0) return def.values[0];
    return "ENUM_VALUE";
  }
  if (ctor === "ZodLiteral") return def.value ?? def.values?.[0];
  if (ctor === "ZodNumber" || ctor === "ZodBigInt") return 0;
  if (ctor === "ZodBoolean") return true;
  if (ctor === "ZodDate") return "2025-01-01";
  if (ctor === "ZodString") return "<string>";
  return "<value>";
}

/**
 * Récupère le sub-schema Zod pour un path donné dans un pillar.
 * Pour `pillarKey="a"`, `path="ikigai"` → retourne PillarASchema.shape.ikigai.
 * Path imbriqué supporté : `path="directionArtistique.moodboard"`.
 */
export function getFieldZod(pillarKey: string, path: string): unknown | null {
  const upper = pillarKey.toUpperCase() as keyof typeof PILLAR_SCHEMAS;
  const schema = PILLAR_SCHEMAS[upper];
  if (!schema) return null;
  const parts = path.split(".");
  let cur: any = unwrapZod(schema);
  for (const part of parts) {
    if (!cur) return null;
    cur = unwrapZod(cur);
    const ctor = cur?.constructor?.name;
    if (ctor === "ZodObject") {
      const shape = cur.shape ?? {};
      cur = shape[part];
    } else if (ctor === "ZodArray") {
      const element = cur._def?.element ?? cur._def?.type ?? cur._def?.innerType;
      cur = unwrapZod(element);
      const innerCtor = (cur as any)?.constructor?.name;
      if (innerCtor === "ZodObject") {
        cur = (cur as any).shape?.[part];
      }
    } else {
      return null;
    }
  }
  return cur ?? null;
}

/**
 * Construit un exemple JSON pour un path précis d'un pillar.
 */
export function buildExampleForPath(pillarKey: string, path: string): unknown {
  const zod = getFieldZod(pillarKey, path);
  if (!zod) return null;
  return buildExampleFromZod(zod);
}

/**
 * Dérive un FieldRequirement[] depuis la shape top-level d'un PillarSchema Zod.
 * Tous les champs (required + optional) deviennent des requirements pour la
 * stage COMPLETE — c'est ce qui matérialise la promesse "100% = tous remplis".
 */
export function deriveSchemaRequirements(pillarKey: string): FieldRequirement[] {
  const upper = pillarKey.toUpperCase() as keyof typeof PILLAR_SCHEMAS;
  const schema = PILLAR_SCHEMAS[upper];
  if (!schema) return [];
  const shape = (schema as unknown as { shape?: Record<string, z.ZodTypeAny> }).shape ?? {};
  const needsHuman = NEEDS_HUMAN_BY_PILLAR[pillarKey.toLowerCase()] ?? new Set<string>();

  const reqs: FieldRequirement[] = [];
  for (const [path, fieldSchema] of Object.entries(shape)) {
    const inner = unwrapZod(fieldSchema);
    const { validator, arg } = inferValidatorFromZod(inner);
    const isHuman = needsHuman.has(path);
    // Pour les ZodObject + ZodArray<ZodObject>, on extrait les sub-keys
    // attendues afin que l'assessor détecte les shapes corrompues (ex:
    // ikigai {good,love,paid,skill} ne contient AUCUNE des keys
    // {love,competence,worldNeed,remuneration} → considéré missing,
    // forcera Enrichir à régénérer).
    const { required, optional } = extractObjectKeys(inner);
    const allKeys = [...required, ...optional];
    reqs.push({
      path,
      validator,
      validatorArg: arg,
      derivable: !isHuman,
      derivationSource: isHuman ? undefined : "ai_generation",
      description: `Schema ${pillarKey.toUpperCase()}.${path}`,
      ...(allKeys.length > 0 ? { expectedKeys: allKeys, requiredKeys: required } : {}),
    });
  }
  return reqs;
}

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
    const schemaDerived = deriveSchemaRequirements(key);
    const needsHuman = NEEDS_HUMAN_BY_PILLAR[key] ?? new Set<string>();

    // Override derivable selon NEEDS_HUMAN_BY_PILLAR (single source of truth).
    // Évite la dérive entre les `derivable: false` historiquement hardcodés
    // dans ENRICHED_A/D/V (héritage Phase 13) et la nouvelle politique
    // "Enrichir = exhaustif" décidée par l'opérateur.
    const overrideDerivable = (r: FieldRequirement): FieldRequirement => {
      const isHuman = needsHuman.has(r.path);
      if (isHuman) {
        return { ...r, derivable: false, derivationSource: undefined };
      }
      // Si pas needsHuman, on garde la derivationSource d'origine si elle existe,
      // sinon "ai_generation" par défaut.
      return {
        ...r,
        derivable: true,
        derivationSource: r.derivationSource ?? "ai_generation",
      };
    };

    // INTAKE / ENRICHED gardent leur structure mais avec derivable corrigé
    const intakeFixed = intake.map(overrideDerivable);
    const enrichedFixed = enriched.map(overrideDerivable);

    // COMPLETE = union (déduplication par path).
    // ENRICHED handcrafted donne le derivable/derivationSource (sémantique
    // riche). On ENRICHIT avec expectedKeys/requiredKeys du schemaDerived
    // quand disponibles — c'est ce qui permet à l'assessor de détecter les
    // shapes Zod corrompues (ikigai {good,love,paid,skill} au lieu de
    // {love,competence,worldNeed,remuneration}) et marquer le field comme
    // missing pour forcer la régénération via Enrichir.
    const schemaDerivedFixed = schemaDerived.map(overrideDerivable);
    const schemaByPath = new Map(schemaDerivedFixed.map((r) => [r.path, r]));
    const enrichWithKeys = (r: FieldRequirement): FieldRequirement => {
      const sd = schemaByPath.get(r.path);
      if (!sd) return r;
      return {
        ...r,
        ...(sd.expectedKeys ? { expectedKeys: sd.expectedKeys } : {}),
        ...(sd.requiredKeys ? { requiredKeys: sd.requiredKeys } : {}),
      };
    };
    const seen = new Set<string>();
    const merged: FieldRequirement[] = [];
    for (const r of enrichedFixed) {
      if (seen.has(r.path)) continue;
      seen.add(r.path);
      merged.push(enrichWithKeys(r));
    }
    for (const r of gloryDerived.map(overrideDerivable)) {
      if (seen.has(r.path)) continue;
      seen.add(r.path);
      merged.push(enrichWithKeys(r));
    }
    for (const r of schemaDerivedFixed) {
      if (seen.has(r.path)) continue;
      seen.add(r.path);
      merged.push(r);
    }

    contracts[key] = {
      pillarKey: key,
      stages: {
        INTAKE: intakeFixed,
        ENRICHED: enrichedFixed,
        COMPLETE: merged,
      },
    };
  }

  return contracts;
}
