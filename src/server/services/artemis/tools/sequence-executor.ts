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
import { createJournal } from "./execution-journal";
import {
  ALL_SEQUENCES,
  getSequence,
  type GlorySequenceKey,
  type GlorySequenceDef,
  type SequenceStep,
} from "./sequences";

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Phase 13 R1 — helper pur testable pour la décision de chainage Ptah.
 *
 * Logique :
 * - Si tool n'a pas de forgeOutput → no chain (toujours)
 * - Si tool a forgeOutput ET oracleEnrichmentMode === true → SKIP chain
 *   (Ptah à la demande, B8 forge buttons)
 * - Si tool a forgeOutput ET oracleEnrichmentMode === false/absent → CHAIN
 *   (cascade Glory→Brief→Forge hash-chain f9cd9de complète)
 *
 * Cette fonction est extraite pour permettre un test unitaire isolé du flag
 * `_oracleEnrichmentMode` sans avoir à mocker tout le sequence-executor.
 */
export function shouldChainPtahForge(args: {
  hasForgeOutput: boolean;
  oracleEnrichmentMode: boolean;
}): { shouldChain: boolean; reason: "no-forge-output" | "skipped-oracle-mode" | "chain-active" } {
  if (!args.hasForgeOutput) return { shouldChain: false, reason: "no-forge-output" };
  if (args.oracleEnrichmentMode === true) return { shouldChain: false, reason: "skipped-oracle-mode" };
  return { shouldChain: true, reason: "chain-active" };
}

/**
 * SequenceContext — état partagé entre steps d'une séquence Artemis.
 *
 * Les keys préfixées `_` sont **internes** (consommées par le sequence-executor
 * lui-même) ; les autres keys sont propagées comme inputs disponibles aux Glory
 * tools downstream.
 *
 * **Flags internes reconnus** (Phase 9 → Phase 13) :
 * - `_pillarSource` : `'A'|'D'|'V'|'E'|'R'|'T'|'I'|'S'` — pillar source par défaut
 *   pour la promotion BrandAsset (Phase 9 / ADR-0009).
 * - `_manipulationMode` : `'peddler'|'dealer'|'facilitator'|'entertainer'` —
 *   mode visé pour ce run. Le gate MANIPULATION_COHERENCE est appliqué
 *   pre-flight Mestor pour les Intents qui le portent (PTAH_MATERIALIZE_BRIEF) ;
 *   pour les sequences qui forgent N briefs, l'executor SHOULD invoquer
 *   `applyManipulationCoherenceGate` directement avant d'émettre les Intents
 *   downstream — cf. `src/server/services/mestor/gates/manipulation-coherence.ts`
 *   (ADR-0038, Phase 16-bis).
 * - `_campaignId` : id Campaign si la séquence est dans le contexte d'une campagne.
 * - `_briefId` : id CampaignBrief si applicable.
 * - **`_oracleEnrichmentMode`** : `true` (Phase 13, ADR-0014) — court-circuite
 *   `chainGloryToPtah` durant `enrichAllSectionsNeteru()`. Les forges Ptah des
 *   tools avec `forgeOutput` ne sont PAS déclenchées automatiquement ; elles
 *   restent disponibles via les boutons "Forge now" (B8) sur les sections
 *   Oracle qui exposent un forge manuel. Hors enrichissement Oracle, ce flag
 *   est `false` ou absent → cascade Glory→Brief→Forge hash-chain f9cd9de complète.
 */
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
  /** Vault: SequenceExecution ID (set after recording) */
  executionId?: string;
  /** Campaign ID if executed in campaign context */
  campaignId?: string;
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

/**
 * Global Common Bindings — resolves frequently-needed fields that many tools
 * use but don't each bind individually (sector, platforms, market, etc.).
 * These are resolved ONCE per sequence and injected as Layer 0.
 */
const GLOBAL_BINDINGS: Record<string, string> = {
  // Fondamentaux marque (maintenant dans les piliers — Chantier -1)
  brand_name: "a.nomMarque",
  sector: "a.secteur",
  market: "a.pays",
  language: "d.assetsLinguistiques.languePrincipale",
  // Canaux & engagement
  platforms: "e.touchpoints",
  platform: "e.touchpoints",
  channel: "e.touchpoints",
  channels: "e.touchpoints",
  usage_contexts: "d.directionArtistique",
  frequency: "e.kpis",
  // Planification
  deadline: "s.roadmap",
  timeline: "s.roadmap",
  references: "d.directionArtistique.moodboard",
  // Intelligence
  campaign_results: "t.traction",
  hourly_cost: "v.unitEconomics",
};

function resolveGlobalBindings(resolver: PillarResolver): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [field, path] of Object.entries(GLOBAL_BINDINGS)) {
    const value = resolver.resolve(path);
    if (value !== undefined && value !== null) {
      result[field] = typeof value === "string" ? value : JSON.stringify(value);
    }
  }
  return result;
}

async function executeGloryStep(
  ref: string,
  strategyId: string,
  context: SequenceContext,
  resolver: PillarResolver
): Promise<Record<string, unknown>> {
  const tool = getGloryTool(ref);

  // Layer 0 (GLOBAL): Common bindings for frequently-needed fields
  const globalValues = resolveGlobalBindings(resolver);

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

  // Merge priority: atomic > sequence > global (most specific wins)
  const input: Record<string, string> = { ...globalValues, ...sequenceValues, ...atomicValues };

  // Lazy import to avoid circular dependency (index.ts re-exports us)
  const { executeTool } = await import("./engine");
  const { outputId, output, intentId: gloryIntentId } = await executeTool(ref, strategyId, input);

  // Phase 10 (ADR-0012) — Auto-dépose dans le BrandVault après chaque Glory tool.
  // Mapping outputFormat → BrandAsset.kind via FORMAT_TO_KIND (brand-vault/engine).
  // Les outputs structurés (concepts_list, claims_list, etc.) deviennent
  // batch de candidats. Les outputs uniques (script, brand_audit_report)
  // deviennent un BrandAsset DRAFT unique.
  let brandAssetIds: string[] = [];
  if (tool && tool.outputFormat) {
    try {
      brandAssetIds = await depositInBrandVault({
        tool,
        toolOutput: output,
        gloryOutputId: outputId,
        gloryIntentId,
        strategyId,
        context,
      });
    } catch (err) {
      console.warn(
        `[sequence-executor] BrandVault deposit failed for ${ref}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  // Phase 9 (ADR-0009) — Brief-to-Forge handoff.
  // Si le tool déclare un forgeOutput, on chaîne automatiquement vers Ptah
  // via mestor.emitIntent({ kind: "PTAH_MATERIALIZE_BRIEF" }). Le sourceIntentId
  // pointe vers la row IntentEmission INVOKE_GLORY_TOOL créée par executeTool —
  // lineage hash-chain Mestor préservée (cf. Loi 1 conservation altitude).
  //
  // Phase 13 (B3, ADR-0014) — flag `_oracleEnrichmentMode` court-circuite
  // l'auto-trigger Ptah pendant `enrichAllSectionsNeteru()` : les forges sont
  // déclenchées MANUELLEMENT via boutons "Forge now" (B8) sur les sections
  // Oracle qui ont un forgeOutput. Le brief reste stocké dans le SuperAsset
  // BrandVault (B4 writeback) pour matérialisation ultérieure à la demande.
  // Hors enrichissement Oracle (cascade séquence normale), le flag est false
  // et la cascade Glory→Brief→Forge hash-chain f9cd9de complète est préservée.
  let forgeTaskId: string | undefined;
  const decision = shouldChainPtahForge({
    hasForgeOutput: !!tool?.forgeOutput,
    oracleEnrichmentMode: context._oracleEnrichmentMode === true,
  });
  if (decision.shouldChain && tool) {
    try {
      forgeTaskId = await chainGloryToPtah({
        tool,
        toolOutput: output,
        // sourceIntentId préfère la vraie IntentEmission row si dispo, fallback gloryOutput.id
        sourceIntentId: gloryIntentId ?? outputId,
        strategyId,
        context,
      });
    } catch (err) {
      // Forge failure should not break the sequence (Loi 1 — pas de régression)
      // Log via output, Seshat captera le signal via FORGE_TASK_FAILED
      console.warn(
        `[sequence-executor] Glory→Ptah handoff failed for ${ref}:`,
        err instanceof Error ? err.message : err,
      );
    }
  } else if (decision.reason === "skipped-oracle-mode") {
    // Phase 13 — log informatif : Ptah forge skipped, sera déclenché via bouton manuel
    console.info(
      `[sequence-executor] oracleEnrichmentMode=true — Ptah forge skipped for ${ref} (will be triggered manually via B8 forge button)`,
    );
  }

  return {
    ...output,
    _gloryOutputId: outputId,
    ...(gloryIntentId ? { _gloryIntentId: gloryIntentId } : {}),
    ...(forgeTaskId ? { _ptahTaskId: forgeTaskId } : {}),
    ...(brandAssetIds.length > 0 ? { _brandAssetIds: brandAssetIds } : {}),
  };
}

/**
 * Auto-dépose un output Glory tool dans le BrandVault.
 *
 * Heuristique :
 *   - Si output contient une liste structurée (concepts, claims, prompts, names) →
 *     créer un batch de N BrandAsset CANDIDATE.
 *   - Sinon → 1 BrandAsset DRAFT unique.
 *
 * Le mapping outputFormat → kind est stable via brand-vault/engine FORMAT_TO_KIND.
 */
async function depositInBrandVault(args: {
  tool: NonNullable<ReturnType<typeof getGloryTool>>;
  toolOutput: Record<string, unknown>;
  gloryOutputId: string;
  gloryIntentId: string | null;
  strategyId: string;
  context: SequenceContext;
}): Promise<string[]> {
  const { tool, toolOutput, gloryOutputId, gloryIntentId, strategyId, context } = args;
  const { kindFromFormat, createBrandAsset, createCandidateBatch } = await import(
    "@/server/services/brand-vault/engine"
  );

  const kind = kindFromFormat(tool.outputFormat);
  if (kind === "GENERIC" && !tool.forgeOutput) return [];

  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    select: { operatorId: true },
  });
  if (!strategy?.operatorId) return [];

  const pillarSource =
    (context._pillarSource as "A" | "D" | "V" | "E" | "R" | "T" | "I" | "S" | undefined) ??
    (tool.pillarKeys[0]?.toUpperCase() as "A" | "D" | "V" | "E" | "R" | "T" | "I" | "S" | undefined);
  const manipulationMode = context._manipulationMode as
    | "peddler" | "dealer" | "facilitator" | "entertainer" | undefined;
  const campaignId = context._campaignId as string | undefined;
  const briefId = context._briefId as string | undefined;

  // Détecter si output est un batch de candidats
  const candidates = extractCandidates(toolOutput);
  if (candidates.length > 1) {
    const batch = await createCandidateBatch({
      strategyId,
      operatorId: strategy.operatorId,
      kind,
      format: tool.outputFormat,
      candidates,
      pillarSource,
      manipulationMode,
      sourceIntentId: gloryIntentId ?? undefined,
      sourceGloryOutputId: gloryOutputId,
      campaignId,
      briefId,
    });
    return batch.candidates.map((a) => a.id);
  }

  // Sinon : 1 asset unique en DRAFT
  const asset = await createBrandAsset({
    strategyId,
    operatorId: strategy.operatorId,
    name: `${tool.name} output`,
    kind,
    format: tool.outputFormat,
    family: "INTELLECTUAL",
    content: toolOutput,
    summary: candidates[0]?.summary,
    pillarSource,
    manipulationMode,
    state: "DRAFT",
    sourceIntentId: gloryIntentId ?? undefined,
    sourceGloryOutputId: gloryOutputId,
    campaignId,
    briefId,
  });
  return [asset.id];
}

/**
 * Extrait les candidats depuis un output Glory tool.
 * Supporte les patterns : `concepts: [...]`, `claims: [...]`, `prompts: [...]`,
 * `names: [...]`, `propositions: [...]`, et tout array de longueur > 1.
 */
function extractCandidates(
  toolOutput: Record<string, unknown>,
): Array<{ name: string; content: Record<string, unknown>; summary?: string }> {
  const arrayKeys = ["concepts", "claims", "prompts", "names", "propositions", "ideas", "options"];
  for (const key of arrayKeys) {
    const arr = toolOutput[key];
    if (Array.isArray(arr) && arr.length > 0) {
      return arr.map((item, i) => {
        if (typeof item === "string") {
          return { name: `${key} ${i + 1}`, content: { value: item }, summary: item.slice(0, 200) };
        }
        if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;
          const name =
            (obj.title as string) ?? (obj.name as string) ?? (obj.headline as string) ?? `${key} ${i + 1}`;
          const summary =
            (obj.description as string) ?? (obj.summary as string) ?? (obj.tagline as string) ?? undefined;
          return { name, content: obj, summary };
        }
        return { name: `${key} ${i + 1}`, content: { value: item } };
      });
    }
  }
  // Pas de liste détectée : output unique
  return [
    {
      name: (toolOutput.title as string) ?? (toolOutput.name as string) ?? "output",
      content: toolOutput,
      summary: (toolOutput.summary as string) ?? (toolOutput.description as string) ?? undefined,
    },
  ];
}

/**
 * Chaîne un Glory tool brief-to-forge vers Ptah via mestor.emitIntent.
 * Cf. ADR-0009 + PANTHEON.md §2.5.
 *
 * Force la lineage : sourceIntentId = IntentEmission du Glory tool (lookup
 * par outputId pour reconstituer le lien dans Seshat).
 */
async function chainGloryToPtah(args: {
  tool: NonNullable<ReturnType<typeof getGloryTool>>;
  toolOutput: Record<string, unknown>;
  sourceIntentId: string;
  strategyId: string;
  context: SequenceContext;
}): Promise<string | undefined> {
  const { tool, toolOutput, sourceIntentId, strategyId, context } = args;
  if (!tool.forgeOutput) return undefined;

  // Extraire le briefText du tool output selon briefTextPath (default "prompt")
  const briefTextPath = tool.forgeOutput.briefTextPath ?? "prompt";
  const briefText = extractBriefText(toolOutput, briefTextPath);
  if (!briefText) {
    throw new Error(`Glory tool ${tool.slug} forgeOutput briefText path "${briefTextPath}" returned empty`);
  }

  const pillarSource =
    (context._pillarSource as "A" | "D" | "V" | "E" | "R" | "T" | "I" | "S" | undefined) ??
    tool.forgeOutput.defaultPillarSource ??
    "V";
  const manipulationMode =
    (context._manipulationMode as
      | "peddler"
      | "dealer"
      | "facilitator"
      | "entertainer"
      | undefined) ??
    tool.forgeOutput.manipulationProfile?.[0] ??
    "entertainer";

  // Strategy operatorId lookup
  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    select: { operatorId: true },
  });
  if (!strategy) {
    throw new Error(`chainGloryToPtah: strategy ${strategyId} not found`);
  }
  if (!strategy.operatorId) {
    throw new Error(`chainGloryToPtah: strategy ${strategyId} has no operatorId (Pilier 3 violation)`);
  }

  const { emitIntent } = await import("@/server/services/mestor/intents");
  const result = await emitIntent(
    {
      kind: "PTAH_MATERIALIZE_BRIEF",
      strategyId,
      operatorId: strategy.operatorId,
      // sourceIntentId = vraie IntentEmission INVOKE_GLORY_TOOL ID (hash-chain Mestor)
      sourceIntentId,
      brief: {
        briefText,
        forgeSpec: {
          kind: tool.forgeOutput.forgeKind,
          providerHint: tool.forgeOutput.providerHint,
          modelHint: tool.forgeOutput.modelHint,
          parameters: extractForgeParameters(toolOutput),
        },
        pillarSource,
        manipulationMode,
      },
    },
    { caller: `glory-tool:${tool.slug}` },
  );

  // Mestor renvoie IntentResult avec output.taskId
  const output = result.output as { taskId?: string } | undefined;
  return output?.taskId;
}

function extractBriefText(toolOutput: Record<string, unknown>, path: string): string {
  // Support paths like "prompts[0].prompt" or "prompt" or "kv_prompts.0.prompt"
  const segments = path.replace(/\[(\d+)\]/g, ".$1").split(".");
  let cur: unknown = toolOutput;
  for (const s of segments) {
    if (cur && typeof cur === "object") {
      cur = (cur as Record<string, unknown>)[s];
    } else {
      return "";
    }
  }
  return typeof cur === "string" ? cur : "";
}

function extractForgeParameters(toolOutput: Record<string, unknown>): Record<string, unknown> {
  // Default empty params — laisse Ptah utiliser les defaults provider.
  // Glory tools peuvent enrichir via field "_forgeParameters" si besoin.
  if (toolOutput._forgeParameters && typeof toolOutput._forgeParameters === "object") {
    return toolOutput._forgeParameters as Record<string, unknown>;
  }
  return {};
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
  const result = await actualizePillar(strategyId, pillarKey as "A" | "D" | "E" | "V" | "I" | "T" | "R" | "S");
  return result ?? {};
}

async function executeCalcStep(
  ref: string,
  strategyId: string,
  context: SequenceContext
): Promise<Record<string, unknown>> {
  // Phase 17 (ADR-0040) — section_draft generators pour les 7 sequences
  // ORACLE_DERIVED (executive-summary, plateforme, plan-activation,
  // production-livrables, budget, timeline-gouvernance, conditions-etapes).
  // Déterministe, pas d'IA. Le step GLORY suivant (synthesize-section)
  // polit le draft en narrative cohérente sans modifier les données.
  if (ref.startsWith("draft-")) {
    return executeSectionDraftCalc(ref, strategyId);
  }

  // Dynamic import — calculators may not exist yet (Phase 6)
  try {
    const calculators = await import("@/server/services/glory-tools/calculators");
    const calcFn = (calculators as unknown as Record<string, (ctx: SequenceContext) => Record<string, unknown>>)[ref];
    if (calcFn) return calcFn(context);
  } catch {
    // calculators.ts not yet built — return empty
  }
  return { _calcNotImplemented: ref };
}

/**
 * Phase 17 (ADR-0040) — Génère le `section_draft` JSON déterministe pour
 * les 7 sections Oracle dérivées via les `mapXxx` existants. Le step GLORY
 * `synthesize-section` consomme ensuite ce draft pour produire une narrative.
 *
 * Ces 7 sections étaient les seules de SECTION_REGISTRY sans entrée dans
 * SECTION_ENRICHMENT (F4 audit NEFER). Avec ce helper + les sequences
 * ORACLE_DERIVED, elles passent sous gouvernance Artemis : Intent émis,
 * audit hash chain, promotion BrandAsset.
 */
async function executeSectionDraftCalc(
  ref: string,
  strategyId: string,
): Promise<Record<string, unknown>> {
  const mappers = await import("@/server/services/strategy-presentation/section-mappers");
  const advertis = await import("@/lib/types/advertis-vector");

  // Charger la strategy avec includes minimaux nécessaires aux mappers.
  // Ne PAS reuse PRESENTATION_INCLUDE complet (qui est privé) — on charge
  // ce dont chaque mapper a besoin selon l'audit section-mappers.ts.
  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    include: {
      pillars: true,
      campaigns: {
        include: {
          actions: true,
          milestones: true,
          teamMembers: { include: { user: { select: { name: true, email: true, image: true } } } },
          budgetLines: true,
        },
      },
      missions: true,
      drivers: { where: { deletedAt: null } },
      brandVariables: true,
      cultIndexSnapshots: { orderBy: { measuredAt: "desc" }, take: 5 },
      devotionSnapshots: { orderBy: { measuredAt: "desc" }, take: 5 },
      superfanProfiles: true,
    },
  });
  if (!strategy) return { section_draft: "{}" };

  let draft: unknown;
  switch (ref) {
    case "draft-exec-summary": {
      const empty = advertis.createEmptyVector();
      const rawVector = { ...empty, ...((strategy.advertis_vector as Record<string, number> | null) ?? {}) };
      const composite = rawVector.composite ?? 0;
      const confidence = typeof rawVector.confidence === "number" && !Number.isNaN(rawVector.confidence)
        ? rawVector.confidence
        : composite > 0 ? Math.min(composite / 200, 1) : 0;
      const vector = { ...rawVector, confidence };
      const classification = advertis.classifyBrand(composite);
      draft = mappers.mapExecutiveSummary(strategy, vector, classification);
      break;
    }
    case "draft-plateforme":
      draft = mappers.mapPlateformeStrategique(strategy);
      break;
    case "draft-plan-act":
      draft = mappers.mapPlanActivation(strategy);
      break;
    case "draft-prod-liv":
      draft = mappers.mapProductionLivrables(strategy);
      break;
    case "draft-budget":
      draft = mappers.mapBudget(strategy);
      break;
    case "draft-timeline":
      draft = mappers.mapTimelineGouvernance(strategy);
      break;
    case "draft-conditions":
      draft = mappers.mapConditionsEtapes(strategy);
      break;
    default:
      return { _draftUnknown: ref };
  }

  return { section_draft: JSON.stringify(draft) };
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

// ─── Pre-flight Scan ─────────────────────────────────────────────────────────

export interface PreflightReport {
  sequenceKey: string;
  totalBindings: number;
  resolved: number;
  missing: number;
  /** Bindings that resolved to a non-empty value */
  available: Array<{ step: string; field: string; path: string }>;
  /** Bindings that resolved to empty/null — sequence can still run but output quality degrades */
  gaps: Array<{ step: string; field: string; path: string }>;
  /** Steps that have ALL bindings missing — these will produce garbage */
  blockers: Array<{ step: string; missingFields: string[] }>;
  /** Percentage of bindings satisfied (0-100) */
  readiness: number;
}

/**
 * Passive scan: check every pillarBinding of every GLORY step in a sequence.
 * Single DB read (PillarResolver already loaded), zero AI calls.
 * Returns a full report of what's available and what's missing.
 */
function preflightScan(seq: GlorySequenceDef, resolver: PillarResolver): PreflightReport {
  const available: PreflightReport["available"] = [];
  const gaps: PreflightReport["gaps"] = [];
  const blockers: PreflightReport["blockers"] = [];

  for (const step of seq.steps) {
    if (step.type !== "GLORY" || step.status !== "ACTIVE") continue;

    const tool = getGloryTool(step.ref);
    if (!tool?.pillarBindings) continue;

    const bindings = tool.pillarBindings;
    const missingFields: string[] = [];

    for (const [field, path] of Object.entries(bindings)) {
      if (!path) continue;

      if (resolver.has(path)) {
        available.push({ step: step.ref, field, path });
      } else {
        gaps.push({ step: step.ref, field, path });
        missingFields.push(field);
      }
    }

    // If ALL bindings of a tool are missing, it's a blocker
    const totalBindings = Object.keys(bindings).length;
    if (totalBindings > 0 && missingFields.length === totalBindings) {
      blockers.push({ step: step.ref, missingFields });
    }
  }

  const total = available.length + gaps.length;
  return {
    sequenceKey: seq.key,
    totalBindings: total,
    resolved: available.length,
    missing: gaps.length,
    available,
    gaps,
    blockers,
    readiness: total > 0 ? Math.round((available.length / total) * 100) : 100,
  };
}

/**
 * Public API: scan a sequence without executing it.
 * Returns the full readiness report — which variables are available,
 * which are missing, and which steps are blocked.
 *
 * This is a single DB read (loads all 8 pillars once), no AI calls.
 */
export async function scanSequence(
  key: GlorySequenceKey,
  strategyId: string,
): Promise<PreflightReport> {
  const seq = getSequence(key);
  if (!seq) throw new Error(`Sequence inconnue: ${key}`);

  const resolver = await PillarResolver.forStrategy(strategyId);
  return preflightScan(seq, resolver);
}

/**
 * Scan ALL 31 sequences for a strategy — full system readiness.
 */
export async function scanAllSequences(
  strategyId: string,
): Promise<PreflightReport[]> {
  const resolver = await PillarResolver.forStrategy(strategyId);
  const { ALL_SEQUENCES: seqs } = await import("./sequences");
  return seqs.map((seq) => preflightScan(seq, resolver));
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
export interface SequenceExecutionOptions {
  /** Campaign brief context — injected as layer between SYSTEM and SEQUENCE */
  briefContext?: Record<string, unknown>;
  /** Campaign ID — links outputs to a specific campaign */
  campaignId?: string;
  /**
   * Depth of execution:
   *   - "FULL"    : run every ACTIVE step (default behavior — unchanged)
   *   - "PREVIEW" : run only the FIRST step that produces a tangible output
   *                 (typically the lead GLORY tool of the sequence). Other
   *                 steps are SKIPPED with reason="preview-mode". Used for
   *                 cheap "teaser" deliverables post-intake.
   */
  depth?: "FULL" | "PREVIEW";
}

export async function executeSequence(
  key: GlorySequenceKey,
  strategyId: string,
  initialContext: SequenceContext = {},
  onProgress?: SequenceProgressCallback,
  options?: SequenceExecutionOptions,
): Promise<SequenceResult> {
  const seq = getSequence(key);
  if (!seq) {
    throw new Error(`Sequence inconnue: ${key}`);
  }

  const journal = createJournal();
  journal.begin(key, strategyId);

  const startTime = Date.now();

  // ── MATURITY GATE: Check pillar readiness before executing ────────────
  // Identify which pillars this sequence's tools bind to
  const seqPillarKeys = new Set<string>();
  for (const step of seq.steps) {
    const tool = step.type === "GLORY" ? getGloryTool(step.ref) : null;
    if (tool?.pillarBindings) {
      for (const bindPath of Object.values(tool.pillarBindings)) {
        if (typeof bindPath === "string") {
          const dot = bindPath.indexOf(".");
          if (dot > 0) seqPillarKeys.add(bindPath.slice(0, dot).toLowerCase());
        }
      }
    }
    // PILLAR steps also reference a pillar
    if (step.type === "PILLAR" && step.ref) seqPillarKeys.add(step.ref.toLowerCase());
  }

  // ── Phase 17 (ADR-0041, F6) — Cache sequence-level pour mode ENRICHMENT ──
  //
  // En mode ENRICHMENT (Oracle enrich, non-creative), un cache sequence-level
  // évite de re-tourner les Glory chains à coût LLM ~$5 quand pillars sources
  // n'ont pas changé. Les modes PRODUCTION/FORGE/AUDIT/PREVIEW ne sont PAS
  // cachés (toujours frais — l'opérateur veut un nouveau livrable). Cache
  // miss en cas de pillar.updatedAt > cachedAt (invalidation automatique
  // après OPERATOR_AMEND_PILLAR ou RTIS_CASCADE).
  const isEnrichmentMode = initialContext._oracleEnrichmentMode === true;
  if (isEnrichmentMode) {
    try {
      const { getCachedSequence } = await import("@/server/services/sequence-vault/cache");
      const cached = await getCachedSequence(strategyId, key, {
        maxAgeMs: 60 * 60 * 1000, // 1h TTL
        invalidateIfPillarsChanged: [...seqPillarKeys],
        mode: "ENRICHMENT",
      });
      if (cached) {
        journal.warn(`[cache:hit] sequence=${key} mode=ENRICHMENT — bypass execution`);
        const totalDurationMs = Date.now() - startTime;
        return {
          sequenceKey: key,
          strategyId,
          status: "COMPLETED",
          steps: [],
          finalContext: cached as SequenceContext,
          totalDurationMs,
          gloryOutputIds: [],
        };
      }
    } catch (err) {
      // Cache miss / error — non-bloquant, continue execution
      console.warn(`[cache] getCachedSequence failed for ${key}:`, err instanceof Error ? err.message : err);
    }
  }

  if (seqPillarKeys.size > 0) {
    try {
      const { assessStrategy } = await import("@/server/services/pillar-maturity/assessor");
      const maturityReport = await assessStrategy(strategyId);
      const blockingPillars: string[] = [];
      for (const pk of seqPillarKeys) {
        const assessment = maturityReport.pillars[pk];
        if (assessment && assessment.currentStage !== "COMPLETE" && assessment.missing.length > 0) {
          blockingPillars.push(`${pk.toUpperCase()}(${assessment.currentStage}, ${assessment.missing.length} missing)`);
        }
      }
      if (blockingPillars.length > 0) {
        journal.warn(`Maturity gate: ${blockingPillars.length} pillar(s) not COMPLETE: ${blockingPillars.join(", ")}. Proceeding with best-effort.`);
      }
    } catch (err) {
      journal.warn(`Maturity gate check failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Layer 1 (SYSTEM): Load full ADVE-RTIS context — general narrative for LLM system prompts.
  const strategyContext = await loadFullStrategyContext(strategyId);

  // Layer 2 (BRIEF): Campaign brief context — objectives, targeting, creative, budget.
  // Injected between SYSTEM and SEQUENCE layers. Brief fields take priority over SYSTEM
  // but are overridden by step-specific ATOMIC bindings.
  const briefContext = options?.briefContext ?? {};

  const context: SequenceContext = { ...strategyContext, ...briefContext, ...initialContext };

  // Layer 3 (ATOMIC): Create resolver for precise pillar variable extraction.
  // Loaded once, reused across all GLORY steps in the sequence.
  const resolver = await PillarResolver.forStrategy(strategyId);

  // PRE-FLIGHT SCAN: check every pillarBinding of every GLORY step.
  // This is a passive DB read (resolver is already loaded) — no AI calls.
  // If critical bindings are missing, we know BEFORE executing.
  const preflight = preflightScan(seq, resolver);
  journal.preflight(preflight.blockers.length, preflight.gaps.length, preflight.readiness);
  if (preflight.blockers.length > 0) {
    // Don't abort — execute anyway but attach the scan report.
    // Steps with missing bindings will use empty strings / fallbacks.
    context._preflightScan = preflight;
  }

  const stepResults: StepResult[] = [];
  const gloryOutputIds: string[] = [];
  let hasFailure = false;

  // PREVIEW depth: identify the first ACTIVE step that produces a deliverable
  // (GLORY > ARTEMIS > MESTOR > PILLAR > CALC). Other steps are skipped.
  const depth = options?.depth ?? "FULL";
  let previewActiveIndex = -1;
  if (depth === "PREVIEW") {
    const priority: Record<string, number> = {
      GLORY: 0,
      ARTEMIS: 1,
      MESTOR: 2,
      SESHAT: 3,
      PILLAR: 4,
      CALC: 5,
      ASSET: 6,
      SEQUENCE: 7,
    };
    let bestPriority = Infinity;
    for (let i = 0; i < seq.steps.length; i++) {
      const s = seq.steps[i]!;
      if (s.status !== "ACTIVE") continue;
      const p = priority[s.type] ?? 99;
      if (p < bestPriority) {
        bestPriority = p;
        previewActiveIndex = i;
      }
    }
  }

  for (let i = 0; i < seq.steps.length; i++) {
    const step = seq.steps[i]!;
    const stepStart = Date.now();

    onProgress?.(i, seq.steps.length, step.ref, step.type);

    // PREVIEW depth: skip everything except the chosen lead step
    if (depth === "PREVIEW" && i !== previewActiveIndex) {
      journal.stepSkip(i, step.ref, "Skipped (preview-mode — not the lead step)");
      stepResults.push({
        stepIndex: i,
        ref: step.ref,
        type: step.type,
        status: "SKIPPED",
        output: {},
        durationMs: 0,
        error: "preview-mode",
      });
      continue;
    }

    // Skip PLANNED steps — they don't exist yet
    if (step.status === "PLANNED") {
      journal.stepSkip(i, step.ref, "Tool not yet implemented (PLANNED)");
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

    journal.stepStart(i, step.ref, step.type);

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
        case "SEQUENCE": {
          // Encapsulate a sub-sequence — recursive call with current context
          const subResult = await executeSequence(
            step.ref as GlorySequenceKey,
            strategyId,
            { ...context }, // pass current context as initial
          );
          // Merge sub-sequence outputs into parent context
          output = subResult.finalContext;
          // Collect sub-sequence glory outputs
          gloryOutputIds.push(...subResult.gloryOutputIds);
          break;
        }
        case "ASSET": {
          // Inject accepted BrandAsset from vault
          // ref format: "SEQUENCE_KEY:asset_field" or just "SEQUENCE_KEY"
          const [seqKey, assetField] = step.ref.split(":");
          try {
            const { getAcceptedExecution } = await import("@/server/services/sequence-vault");
            const accepted = await getAcceptedExecution(strategyId, seqKey!);
            if (accepted) {
              // Inject all promoted assets + glory outputs into context
              output = {
                _sourceExecution: accepted.id,
                _assets: accepted.promotedAssets,
              };
              for (const a of accepted.promotedAssets) {
                output[a.name] = a.fileUrl ?? a.pillarTags;
              }
              // If specific field requested, extract from glory outputs
              if (assetField && accepted.gloryOutputs) {
                for (const go of accepted.gloryOutputs) {
                  const goOutput = go.output as Record<string, unknown> | null;
                  if (goOutput?.[assetField]) {
                    output[assetField] = goOutput[assetField];
                  }
                }
              }
            } else {
              output = { _warning: `No accepted execution found for ${seqKey}` };
            }
          } catch {
            output = { _warning: `Asset injection failed for ${step.ref}` };
          }
          break;
        }
        default:
          output = {};
      }

      const stepDuration = Date.now() - stepStart;
      const outputKeyCount = Object.keys(output).filter(k => !k.startsWith("_")).length;
      journal.stepOk(i, step.ref, step.type, stepDuration, { outputKeys: outputKeyCount });

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
        durationMs: stepDuration,
      });
    } catch (error) {
      const stepDuration = Date.now() - stepStart;
      const errMsg = error instanceof Error ? error.message : String(error);
      journal.stepFail(i, step.ref, step.type, stepDuration, errMsg);
      hasFailure = true;
      stepResults.push({
        stepIndex: i,
        ref: step.ref,
        type: step.type,
        status: "FAILED",
        output: {},
        durationMs: stepDuration,
        error: errMsg,
      });
      // Continue with remaining steps — partial execution is better than nothing
    }
  }

  // Recalculate ADVE vector after sequence completion
  try {
    const { scoreObject } = await import("@/server/services/advertis-scorer");
    const scoreResult = await scoreObject("strategy", strategyId);
    journal.score(scoreResult?.composite ?? null);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    journal.score(null, errMsg);
    console.warn("[sequence-executor] Score recalc failed:", errMsg);
  }

  const successCount = stepResults.filter((s) => s.status === "SUCCESS").length;
  const totalActive = seq.steps.filter((s) => s.status === "ACTIVE").length;
  const finalStatus = hasFailure ? (successCount > 0 ? "PARTIAL" : "FAILED") : "COMPLETED";

  journal.end(finalStatus, Date.now() - startTime, successCount, seq.steps.length);

  const result: SequenceResult = {
    sequenceKey: key,
    strategyId,
    status: finalStatus,
    steps: stepResults,
    finalContext: context,
    totalDurationMs: Date.now() - startTime,
    gloryOutputIds,
  };

  // ── Vault integration: record execution for review ──────────────────
  try {
    const { recordExecution } = await import("@/server/services/sequence-vault");
    const tier = (seq as { tier?: number }).tier ?? 0;
    result.executionId = await recordExecution({
      strategyId,
      sequenceKey: key,
      tier,
      status: finalStatus,
      stepResults: stepResults.map(s => ({ ref: s.ref, type: s.type, status: s.status, durationMs: s.durationMs, error: s.error })),
      finalContext: context,
      totalDurationMs: result.totalDurationMs,
      gloryOutputIds,
      campaignId: options?.campaignId,
    });
  } catch (err) {
    console.warn("[sequence-executor] Vault recording failed:", err instanceof Error ? err.message : err);
  }

  // ── Phase 17 (ADR-0041, F6) — Cache write si SUCCESS + ENRICHMENT mode ──
  // Stocke pour future re-run dans la même fenêtre TTL. Invalidation
  // automatique par pillar.updatedAt sur read.
  if (isEnrichmentMode && finalStatus === "COMPLETED") {
    try {
      const { cacheSequenceExecution } = await import("@/server/services/sequence-vault/cache");
      await cacheSequenceExecution(strategyId, key, context as Record<string, unknown>, {
        ttlMs: 60 * 60 * 1000, // 1h TTL
        mode: "ENRICHMENT",
      });
      journal.warn(`[cache:write] sequence=${key} mode=ENRICHMENT cached for 1h`);
    } catch (err) {
      console.warn(`[cache] cacheSequenceExecution failed for ${key}:`, err instanceof Error ? err.message : err);
    }
  }

  return result;
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
