/**
 * GLORY Sequence Executor — Orchestration Engine
 *
 * Architecture (3 layers):
 *   HYPERVISEUR  → decides which sequences to run based on strategy state
 *   SUPERVISEUR  → maintains coherence within a sequence (this file)
 *   ORCHESTRATEUR → executes steps, resolves atomic bindings
 *
 * Each tool receives 3 context layers:
 *   1. SYSTEM (constant)  — full strategy narrative (loadStrategyContext → system prompt)
 *   2. SEQUENCE (accumulated) — outputs from previous steps in the chain
 *   3. ATOMIC (resolved)  — specific pillar values from pillarBindings (PillarResolver)
 *
 * The resolver ensures that atomic ADVE-RTIS variables irrigate every tool.
 * General context (system prompt) ensures the LLM understands the WHY.
 * Atomic bindings ensure the {{template_vars}} have the RIGHT values.
 *
 * Step routing:
 *   GLORY   → executeTool() with resolved atomic bindings
 *   ARTEMIS → executeFramework() from artemis
 *   SESHAT  → queryReferences() from seshat-bridge
 *   MESTOR  → actualizePillar() from mestor/rtis-cascade
 *   PILLAR  → db.pillar.findUnique() (pure data injection)
 *   CALC    → calculators[ref]() (pure math)
 */

import { db } from "@/lib/db";
// Import directly from source files to avoid circular dependency (index.ts re-exports us)
import { getGloryTool } from "./registry";
import { PillarResolver } from "./pillar-resolver";
import {
  ALL_SEQUENCES,
  getSequence,
  type GlorySequenceKey,
  type GlorySequenceDef,
  type SequenceStep,
} from "./sequences";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SequenceContext {
  [key: string]: unknown;
}

export interface StepResult {
  stepIndex: number;
  ref: string;
  type: SequenceStep["type"];
  status: "SUCCESS" | "SKIPPED" | "FAILED";
  output: Record<string, unknown>;
  durationMs: number;
  error?: string;
}

export interface SequenceResult {
  sequenceKey: GlorySequenceKey;
  strategyId: string;
  status: "COMPLETED" | "PARTIAL" | "FAILED";
  steps: StepResult[];
  finalContext: SequenceContext;
  totalDurationMs: number;
  gloryOutputIds: string[];
}

export type SequenceProgressCallback = (
  stepIndex: number,
  totalSteps: number,
  stepRef: string,
  stepType: SequenceStep["type"]
) => void;

// ─── Step Executors ──────────────────────────────────────────────────────────

async function executePillarStep(
  ref: string,
  strategyId: string,
  _context: SequenceContext
): Promise<Record<string, unknown>> {
  const pillar = await db.pillar.findUnique({
    where: { strategyId_key: { strategyId, key: ref } },
  });
  if (!pillar) return {};
  const content = (pillar.content as Record<string, unknown>) ?? {};
  return { [`pillar_${ref}`]: content, ...content };
}

async function executeGloryStep(
  ref: string,
  strategyId: string,
  context: SequenceContext,
  resolver: PillarResolver
): Promise<Record<string, unknown>> {
  const tool = getGloryTool(ref);

  // Layer 3 (ATOMIC): Resolve pillarBindings to concrete values
  // These are the precise ADVE-RTIS variables each tool needs.
  const atomicValues: Record<string, string> = {};
  if (tool?.pillarBindings) {
    const resolved = resolver.resolveBindingsAsStrings(tool.pillarBindings);
    Object.assign(atomicValues, resolved);
  }

  // Layer 2 (SEQUENCE): Context from previous steps
  const sequenceValues: Record<string, string> = {};
  for (const [key, value] of Object.entries(context)) {
    if (key.startsWith("_")) continue; // Skip internal keys
    if (value !== null && value !== undefined) {
      sequenceValues[key] = typeof value === "string" ? value : JSON.stringify(value);
    }
  }

  // Merge: atomic bindings take precedence over sequence context
  // (specific pillar values override generic accumulated data)
  const input: Record<string, string> = { ...sequenceValues, ...atomicValues };

  // Lazy import to avoid circular dependency (index.ts re-exports us)
  const { executeTool } = await import("./index");
  const { outputId, output } = await executeTool(ref, strategyId, input);
  return { ...output, _gloryOutputId: outputId };
}

async function executeArtemisStep(
  ref: string,
  strategyId: string,
  context: SequenceContext
): Promise<Record<string, unknown>> {
  // Dynamic import to avoid circular deps
  const { executeFramework } = await import("@/server/services/artemis");

  const input: Record<string, string> = {};
  for (const [key, value] of Object.entries(context)) {
    if (typeof value === "string") input[key] = value;
  }

  const result = await executeFramework(ref, strategyId, input);
  return {
    analysis: result.output?.analysis,
    score: result.output?.score,
    prescriptions: result.output?.prescriptions,
    confidence: result.output?.confidence,
    ...((result.output?.outputFields as Record<string, unknown>) ?? {}),
  };
}

async function executeSeshatStep(
  ref: string,
  strategyId: string,
  context: SequenceContext
): Promise<Record<string, unknown>> {
  const { queryReferences } = await import("@/server/services/seshat-bridge");

  const refs = await queryReferences({
    topic: (context.topic as string) ?? (context.brand_name as string) ?? "",
    sector: (context.sector as string) ?? "",
    market: (context.market as string) ?? "",
    pillarFocus: (context.pillarFocus as string) ?? "",
  });

  return { references: refs, referenceCount: refs.length };
}

async function executeMestorStep(
  ref: string,
  strategyId: string,
  _context: SequenceContext
): Promise<Record<string, unknown>> {
  const { actualizePillar } = await import("@/server/services/mestor/rtis-cascade");

  // ref format: "actualize-r" → pillar key = "r"
  const pillarKey = ref.replace("actualize-", "");
  const result = await actualizePillar(strategyId, pillarKey);
  return result ?? {};
}

async function executeCalcStep(
  ref: string,
  _strategyId: string,
  context: SequenceContext
): Promise<Record<string, unknown>> {
  // Dynamic import — calculators may not exist yet (Phase 6)
  try {
    const calculators = await import("./calculators");
    const calcFn = (calculators as Record<string, (ctx: SequenceContext) => Record<string, unknown>>)[ref];
    if (calcFn) return calcFn(context);
  } catch {
    // calculators.ts not yet built — return empty
  }
  return { _calcNotImplemented: ref };
}

// ─── RTIS Auto-Injection ─────────────────────────────────────────────────────

/**
 * Load ALL 8 ADVE-RTIS pillars + strategy metadata into context.
 * This ensures every step in every sequence has access to the full strategic
 * picture — not just scores but actual pillar CONTENT (SWOT, TAM/SAM, catalogue, roadmap).
 */
async function loadFullStrategyContext(strategyId: string): Promise<SequenceContext> {
  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    include: {
      pillars: true,
      drivers: { where: { deletedAt: null, status: "ACTIVE" } },
    },
  });
  if (!strategy) return {};

  const ctx: SequenceContext = {
    _strategyId: strategyId,
    _strategyName: strategy.name,
    _strategyDescription: strategy.description,
  };

  // Inject ADVE vector scores
  const vec = strategy.advertis_vector as Record<string, number> | null;
  if (vec) {
    ctx._adveVector = vec;
    for (const key of ["a", "d", "v", "e", "r", "t", "i", "s"]) {
      ctx[`score_${key}`] = vec[key] ?? 0;
    }
    ctx.score_composite = vec.composite ?? 0;
  }

  // Inject business context
  const biz = strategy.businessContext as Record<string, unknown> | null;
  if (biz) {
    ctx._businessContext = biz;
    ctx.businessModel = biz.businessModel;
    ctx.positioningArchetype = biz.positioningArchetype;
  }

  // Inject FULL content of ALL 8 pillars — every atomic field surfaced.
  // The PillarResolver handles deep dot-notation access for pillarBindings.
  // This surfacing ensures the SequenceContext has flat access to every field.
  for (const pillar of strategy.pillars) {
    const c = (pillar.content as Record<string, unknown>) ?? {};
    ctx[`pillar_${pillar.key}`] = c;
    ctx[`pillar_${pillar.key}_confidence`] = pillar.confidence;

    // Surface ALL fields from each pillar at top level with pillar prefix
    // This guarantees 100% irrigation of all atomic ADVE-RTIS variables.
    for (const [field, value] of Object.entries(c)) {
      if (value !== undefined && value !== null) {
        ctx[`${pillar.key}_${field}`] = value;
      }
    }

    // Also surface commonly used fields WITHOUT prefix for backward compat
    // and template substitution ({{archetype}}, {{personas}}, etc.)
    if (pillar.key === "a") {
      ctx.archetype = c.archetype;
      ctx.archetypeSecondary = c.archetypeSecondary;
      ctx.prophecy = c.prophecy;
      ctx.brand_dna = c.brandDna ?? c.adn ?? c.noyauIdentitaire;
      ctx.noyauIdentitaire = c.noyauIdentitaire;
      ctx.citationFondatrice = c.citationFondatrice;
      ctx.tone_of_voice = c.tonDeVoix;
      ctx.personality = (c.tonDeVoix as Record<string, unknown>)?.personnalite ?? c.personnalite;
      ctx.values = c.valeurs;
      ctx.ikigai = c.ikigai;
      ctx.herosJourney = c.herosJourney;
      ctx.enemy = c.enemy;
      ctx.doctrine = c.doctrine;
      ctx.livingMythology = c.livingMythology;
      ctx.equipeDirigeante = c.equipeDirigeante;
      ctx.hierarchieCommunautaire = c.hierarchieCommunautaire;
    }
    if (pillar.key === "d") {
      ctx.personas = c.personas;
      ctx.promesseMaitre = c.promesseMaitre;
      ctx.sousPromesses = c.sousPromesses;
      ctx.positionnement = c.positionnement;
      ctx.tonDeVoix = c.tonDeVoix;
      ctx.assetsLinguistiques = c.assetsLinguistiques;
      ctx.directionArtistique = c.directionArtistique;
      ctx.paysageConcurrentiel = c.paysageConcurrentiel;
      const da = c.directionArtistique as Record<string, unknown> | undefined;
      if (da) {
        ctx.chromatic_strategy = da.chromaticStrategy;
        ctx.typography_system = da.typographySystem;
        ctx.moodboard = da.moodboard;
        ctx.semioticAnalysis = da.semioticAnalysis;
        ctx.visualLandscape = da.visualLandscape;
        ctx.logoTypeRecommendation = da.logoTypeRecommendation;
        ctx.designTokens = da.designTokens;
        ctx.motionIdentity = da.motionIdentity;
        ctx.brandGuidelines = da.brandGuidelines;
      }
      ctx.sacredObjects = c.sacredObjects;
      ctx.symboles = c.symboles;
    }
    if (pillar.key === "v") {
      ctx.produitsCatalogue = c.produitsCatalogue;
      ctx.productLadder = c.productLadder;
      ctx.unitEconomics = c.unitEconomics;
      ctx.promesseDeValeur = c.promesseDeValeur;
      ctx.pricing = c.pricing;
      ctx.proofPoints = c.proofPoints;
      ctx.guarantees = c.guarantees;
      ctx.mvp = c.mvp;
      ctx.proprieteIntellectuelle = c.proprieteIntellectuelle;
    }
    if (pillar.key === "e") {
      ctx.touchpoints = c.touchpoints;
      ctx.rituels = c.rituels;
      ctx.aarrr = c.aarrr;
      ctx.kpis = c.kpis;
      ctx.devotionLadder = c.devotionLadder;
      ctx.community = c.communityStrategy ?? c.principesCommunautaires;
      ctx.gamification = c.gamification;
      ctx.sacredCalendar = c.sacredCalendar;
      ctx.commandments = c.commandments;
      ctx.ritesDePassage = c.ritesDePassage;
      ctx.sacraments = c.sacraments;
      ctx.taboos = c.taboos;
    }
    if (pillar.key === "r") {
      ctx.globalSwot = c.globalSwot;
      ctx.microSWOTs = c.microSWOTs;
      ctx.riskScore = c.riskScore;
      ctx.mitigationPriorities = c.mitigationPriorities;
      ctx.probabilityImpactMatrix = c.probabilityImpactMatrix;
    }
    if (pillar.key === "t") {
      ctx.triangulation = c.triangulation;
      ctx.hypothesisValidation = c.hypothesisValidation;
      ctx.marketReality = c.marketReality;
      ctx.tamSamSom = c.tamSamSom;
      ctx.brandMarketFitScore = c.brandMarketFitScore;
      ctx.weakSignalAnalysis = c.weakSignalAnalysis;
      ctx.traction = c.traction;
      ctx.marketDataSources = c.marketDataSources;
    }
    if (pillar.key === "i") {
      ctx.syntheses = c.syntheses;
      ctx.sprint90Days_i = c.sprint90Days; // prefixed to avoid S collision
      ctx.annualCalendar = c.annualCalendar;
      ctx.globalBudget_i = c.globalBudget; // prefixed
      ctx.budgetBreakdown = c.budgetBreakdown;
      ctx.teamStructure = c.teamStructure;
      ctx.brandPlatform = c.brandPlatform;
      ctx.copyStrategy = c.copyStrategy;
      ctx.bigIdea = c.bigIdea;
      ctx.mediaPlan = c.mediaPlan;
      ctx.catalogueParCanal = c.catalogueParCanal;
      ctx.assetsProduisibles = c.assetsProduisibles;
      ctx.activationsPossibles = c.activationsPossibles;
      ctx.totalActions = c.totalActions;
    }
    if (pillar.key === "s") {
      ctx.syntheseExecutive = c.syntheseExecutive;
      ctx.visionStrategique = c.visionStrategique;
      ctx.coherencePiliers = c.coherencePiliers;
      ctx.facteursClesSucces = c.facteursClesSucces;
      ctx.recommandationsPrioritaires = c.recommandationsPrioritaires;
      ctx.axesStrategiques = c.axesStrategiques;
      ctx.sprint90Days = c.sprint90Days ?? c.sprint90Recap;
      ctx.kpiDashboard = c.kpiDashboard;
      ctx.coherenceScore = c.coherenceScore;
      ctx.fenetreOverton = c.fenetreOverton;
      ctx.roadmap = c.roadmap;
      ctx.globalBudget = c.globalBudget;
    }
  }

  // Inject active drivers
  if (strategy.drivers.length > 0) {
    ctx._activeDrivers = strategy.drivers.map((d) => ({ name: d.name, channel: d.channel }));
    ctx.activeChannels = strategy.drivers.map((d) => d.channel);
  }

  return ctx;
}

// ─── Main Executor ───────────────────────────────────────────────────────────

/**
 * Execute a complete sequence, routing each step to the correct service.
 *
 * Context is ACCUMULATIVE and PRE-LOADED with full ADVE-RTIS data:
 * - All 8 pillar contents (not just scores)
 * - RTIS key fields surfaced at top level (globalSwot, tamSamSom, catalogueParCanal, roadmap...)
 * - Business context, active drivers
 * - Each step output merges into this shared context
 */
export async function executeSequence(
  key: GlorySequenceKey,
  strategyId: string,
  initialContext: SequenceContext = {},
  onProgress?: SequenceProgressCallback
): Promise<SequenceResult> {
  const seq = getSequence(key);
  if (!seq) {
    throw new Error(`Sequence inconnue: ${key}`);
  }

  const startTime = Date.now();

  // Layer 1 (SYSTEM): Load full ADVE-RTIS context — general narrative for LLM system prompts.
  const strategyContext = await loadFullStrategyContext(strategyId);
  const context: SequenceContext = { ...strategyContext, ...initialContext };

  // Layer 3 (ATOMIC): Create resolver for precise pillar variable extraction.
  // Loaded once, reused across all GLORY steps in the sequence.
  const resolver = await PillarResolver.forStrategy(strategyId);

  const stepResults: StepResult[] = [];
  const gloryOutputIds: string[] = [];
  let hasFailure = false;

  for (let i = 0; i < seq.steps.length; i++) {
    const step = seq.steps[i]!;
    const stepStart = Date.now();

    onProgress?.(i, seq.steps.length, step.ref, step.type);

    // Skip PLANNED steps — they don't exist yet
    if (step.status === "PLANNED") {
      stepResults.push({
        stepIndex: i,
        ref: step.ref,
        type: step.type,
        status: "SKIPPED",
        output: {},
        durationMs: 0,
        error: "Tool not yet implemented (PLANNED)",
      });
      continue;
    }

    try {
      let output: Record<string, unknown>;

      switch (step.type) {
        case "PILLAR":
          output = await executePillarStep(step.ref, strategyId, context);
          break;
        case "GLORY":
          output = await executeGloryStep(step.ref, strategyId, context, resolver);
          if (output._gloryOutputId) {
            gloryOutputIds.push(output._gloryOutputId as string);
          }
          break;
        case "ARTEMIS":
          output = await executeArtemisStep(step.ref, strategyId, context);
          break;
        case "SESHAT":
          output = await executeSeshatStep(step.ref, strategyId, context);
          break;
        case "MESTOR":
          output = await executeMestorStep(step.ref, strategyId, context);
          break;
        case "CALC":
          output = await executeCalcStep(step.ref, strategyId, context);
          break;
        default:
          output = {};
      }

      // Merge step output into accumulative context
      for (const key of step.outputKeys) {
        if (output[key] !== undefined) {
          context[key] = output[key];
        }
      }
      // Also merge all output for flexible downstream access
      Object.assign(context, output);

      stepResults.push({
        stepIndex: i,
        ref: step.ref,
        type: step.type,
        status: "SUCCESS",
        output,
        durationMs: Date.now() - stepStart,
      });
    } catch (error) {
      hasFailure = true;
      stepResults.push({
        stepIndex: i,
        ref: step.ref,
        type: step.type,
        status: "FAILED",
        output: {},
        durationMs: Date.now() - stepStart,
        error: error instanceof Error ? error.message : String(error),
      });
      // Continue with remaining steps — partial execution is better than nothing
    }
  }

  // Recalculate ADVE vector after sequence completion
  try {
    const { scoreObject } = await import("@/server/services/advertis-scorer");
    await scoreObject("strategy", strategyId);
  } catch (err) {
    console.warn("[sequence-executor] Score recalc failed:", err instanceof Error ? err.message : err);
  }

  const successCount = stepResults.filter((s) => s.status === "SUCCESS").length;
  const totalActive = seq.steps.filter((s) => s.status === "ACTIVE").length;

  return {
    sequenceKey: key,
    strategyId,
    status: hasFailure ? (successCount > 0 ? "PARTIAL" : "FAILED") : "COMPLETED",
    steps: stepResults,
    finalContext: context,
    totalDurationMs: Date.now() - startTime,
    gloryOutputIds,
  };
}

/**
 * Execute multiple sequences in order (e.g., all 8 pillar sequences).
 */
export async function executeSequenceBatch(
  keys: GlorySequenceKey[],
  strategyId: string,
  initialContext: SequenceContext = {},
  onProgress?: (seqIndex: number, totalSeqs: number, seqKey: GlorySequenceKey) => void
): Promise<SequenceResult[]> {
  const results: SequenceResult[] = [];
  const sharedContext: SequenceContext = { ...initialContext };

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]!;
    onProgress?.(i, keys.length, key);

    const result = await executeSequence(key, strategyId, sharedContext);
    results.push(result);

    // Merge successful context forward so next sequence benefits
    Object.assign(sharedContext, result.finalContext);
  }

  return results;
}

/**
 * Execute all 8 pillar sequences in order A→D→V→E→R→T→I→S.
 * This is the primary "fill the Oracle" operation.
 */
export async function executeAllPillarSequences(
  strategyId: string,
  onProgress?: (seqIndex: number, totalSeqs: number, seqKey: GlorySequenceKey) => void
): Promise<SequenceResult[]> {
  const pillarOrder: GlorySequenceKey[] = [
    "MANIFESTE-A",
    "BRANDBOOK-D",
    "OFFRE-V",
    "PLAYBOOK-E",
    "AUDIT-R",
    "ETUDE-T",
    "BRAINSTORM-I",
    "ROADMAP-S",
  ];

  return executeSequenceBatch(pillarOrder, strategyId, {}, onProgress);
}
