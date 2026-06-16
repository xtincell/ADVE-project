/**
 * artemis/tools/tool-types.ts — Glory tool type vocabulary + HYBRID factory.
 *
 * Leaf module extracted from `registry.ts` to break the import cycles
 * `registry ⇄ {adops,higgsfield,market-research,phase13-oracle,phase14-imhotep,
 * phase15-anubis,phase19}-tools` (madge --circular). The tool files import their
 * `GloryToolDef` / `GloryToolNature` types and the `defineHybridTool` factory
 * from here (a dependency-free leaf) instead of from `registry.ts` (which
 * imports the tool arrays back). `registry.ts` re-exports everything here.
 */

import type { ZodType } from "zod";
import type { BrandAssetKind } from "@/domain/brand-asset-kinds";

export type GloryLayer = "CR" | "DC" | "HYBRID" | "BRAND";

/** How the tool executes:
 * - LLM: AI call needed (creative generation or subjective judgment)
 * - COMPOSE: Template + pillar data → formatted output (no AI)
 * - CALC: Math/formulas on numeric values (no AI, no templates)
 * - MCP: External MCP server tool invocation via Anubis (Phase 16, ADR-0048).
 *        Tool body delegates to `anubis.invokeExternalTool({serverName, toolName, ...})`.
 *        Used for Higgsfield, future Sora MCP / Runway MCP / etc.
 * - HYBRID: Phase 23 (ADR-0077 §P22-3, architecture D7) — LLM-or-manual peer paths.
 *        The LLM half is an ordinary structured LLM call (requires `outputSchema`);
 *        the manual half validates an operator-entered payload against
 *        `manualFormSchema` (which structurally equals `outputSchema`). Dispatched
 *        via `executeHybridTool(slug, input, { preferManual | fullAuto })` — the 3
 *        modes of the trichotomy: LLM fills / operator injects / `fullAuto`
 *        (« à mes risques » : bypass the manual fallback, accept the at-risk
 *        best-effort on Zod-fail). Manual-first parity (ADR-0060) is structural:
 *        a HYBRID tool cannot ship without a manual schema.
 */
export type GloryExecutionType = "LLM" | "COMPOSE" | "CALC" | "MCP" | "DELEGATE" | "HYBRID";

/**
 * MCP descriptor — Phase 16 / ADR-0048.
 *
 * Quand `executionType === "MCP"`, le tool ne génère pas via LLM mais délègue
 * l'appel à un MCP server externe registered dans `McpRegistry` (direction=INBOUND).
 * Anubis (mcp-client) gère le transport, les credentials (Credentials Vault, ADR-0021)
 * et l'éventuel OAuth device flow (Higgsfield).
 */
export interface GloryToolMcpDescriptor {
  /** McpRegistry.serverName — clé du server externe (ex: "higgsfield"). */
  serverName: string;
  /** Nom du tool tel qu'exposé par le MCP server distant. */
  toolName: string;
  /** Mapping inputField → MCP param key (default : identité, inputField=paramKey). */
  paramMap?: Record<string, string>;
}

export type GloryToolStatus = "ACTIVE" | "PLANNED";

/**
 * Phase 18-N6 (ADR-0061) — les 9 archétypes BrandNature applicables à un Glory tool.
 * Miroir de l'enum Prisma `BrandNature` (gardé inline pour préserver la frontière de
 * couche : `registry` est en `server/services`, pas de dépendance Prisma type-only requise).
 */
export type GloryToolNature =
  | "PRODUCT"
  | "SERVICE"
  | "CHARACTER_IP"
  | "FESTIVAL_IP"
  | "MEDIA_IP"
  | "RETAIL_SPACE"
  | "PLATFORM"
  | "INSTITUTION"
  | "PERSONAL";

/**
 * Maps a tool's inputField to a pillar path.
 * Path format: "pillarKey.fieldPath" using dot notation.
 * Examples:
 *   "a.archetype"              → pillar A, field archetype
 *   "d.tonDeVoix.personnalite" → pillar D, tonDeVoix.personnalite array
 *   "d.promesseMaitre"         → pillar D, promesse maître
 *   "r.globalSwot.strengths"   → pillar R, SWOT strengths
 *   "t.tamSamSom.tam.value"    → pillar T, TAM numeric value
 *   "i.catalogueParCanal"      → pillar I, full action catalogue
 *   "s.sprint90Days"           → pillar S, sprint 90 days array
 */
export type PillarPath = `${"a" | "d" | "v" | "e" | "r" | "t" | "i" | "s"}.${string}`;

/**
 * Brief-to-forge declaration — Phase 9 / ADR-0009.
 *
 * Quand un Glory tool produit un brief qui doit être matérialisé en asset
 * concret par Ptah (image / vidéo / audio / icône / refine / transform / etc.),
 * il déclare son forgeOutput. Le sequence-executor détecte ce field et chaîne
 * automatiquement vers `mestor.emitIntent({ kind: "PTAH_MATERIALIZE_BRIEF" })`
 * — chaque GenerativeTask hérite du sourceIntentId Glory tool (lineage hash-chain).
 *
 * Sans forgeOutput : tool brief-only (output texte consommé tel quel).
 */
export interface GloryToolForgeOutput {
  /** Type de forge à déclencher downstream Ptah. */
  forgeKind:
    | "image"
    | "video"
    | "audio"
    | "icon"
    | "refine"
    | "transform"
    | "classify"
    | "stock"
    | "design";
  /** Provider hint (Ptah peut override via routing/provider-selector). */
  providerHint?: "magnific" | "adobe" | "figma" | "canva";
  /** Modèle hint (ex: "nano-banana-pro", "kling-3", "tts-premium"). */
  modelHint?: string;
  /** Modes manipulation compatibles. Mestor pre-flight refuse si mode hors mix Strategy. */
  manipulationProfile?: ("peddler" | "dealer" | "facilitator" | "entertainer")[];
  /**
   * Field path dans output Glory tool qui contient le briefText à passer à Ptah.
   * Default: "prompt". Pour kv-banana-prompt-generator qui produit { prompts: [...] },
   * la prop "promptsPath" override (ex: "prompts[0].prompt").
   */
  briefTextPath?: string;
  /** Pillar source par défaut si caller n'override pas. Doit être un PILLAR_KEY uppercase. */
  defaultPillarSource?: "A" | "D" | "V" | "E" | "R" | "T" | "I" | "S";
  /**
   * Phase 17 (ADR-0037) — BrandAsset.kind upstream que ce Glory tool consomme
   * pour produire son brief.
   *
   * Lu par le resolver `deliverable-orchestrator` qui remonte le DAG des
   * dépendances depuis le BrandAsset.kind matériel cible (`/cockpit/operate/forge`).
   *
   * Sémantique : kinds que le founder doit avoir en `state=ACTIVE` dans son
   * vault pour que ce Glory tool produise un brief cohérent. Ne lister que
   * les BrandAsset upstream — PAS les données business externes (sector,
   * pricing, agency_strengths, etc.) qui sont fournies par le caller.
   *
   * `undefined` ou `[]` = tool autonome (peut être invoqué sans pré-requis vault).
   *
   * Validateur DAG dans le resolver : refuse les cycles (A requires B et B requires A)
   * avec erreur `RESOLVER_CYCLE_DETECTED`.
   */
  requires?: readonly BrandAssetKind[];
}

export interface GloryToolDef {
  slug: string;
  name: string;
  layer: GloryLayer;
  order: number;
  executionType: GloryExecutionType;
  pillarKeys: string[];
  requiredDrivers: string[];
  dependencies: string[];
  description: string;
  inputFields: string[];
  /** Maps each inputField to its source pillar variable (atomic binding).
   *  If an inputField is not bound, it must be provided by the caller or previous step. */
  pillarBindings: Partial<Record<string, PillarPath>>;
  outputFormat: string;
  /** For LLM tools: prompt template. For COMPOSE: compositing template. For CALC: formula description. */
  promptTemplate: string;
  status: GloryToolStatus;
  /**
   * Phase 9 (ADR-0009) — déclaration brief-to-forge.
   *
   * Si présent : le sequence-executor chaîne automatiquement vers Ptah après
   * exécution du tool. Si absent : tool brief-only (output texte consommé en l'état).
   *
   * Exemples :
   *   - `kv-banana-prompt-generator` : forgeOutput.forgeKind="image", modelHint="nano-banana-pro"
   *   - `video-script-generator` : forgeOutput.forgeKind="video", providerHint="magnific"
   *   - `concept-generator`, `brand-bible-extractor` : pas de forgeOutput (brief-only)
   */
  forgeOutput?: GloryToolForgeOutput;
  /**
   * Phase 16 (ADR-0048) — déclaration MCP delegation.
   *
   * Si `executionType === "MCP"`, ce champ est OBLIGATOIRE et indique à
   * `executeTool` de déléguer l'appel à `anubis.invokeExternalTool` au lieu
   * de `callLLM`. Permet d'exposer Higgsfield (DoP/Soul/Steal) et tout futur
   * MCP server externe sous forme de Glory tools optionnels.
   */
  mcpDescriptor?: GloryToolMcpDescriptor;
  /**
   * Phase 20 (ADR-0037 PR-I extension) — délégation à un service interne.
   *
   * Si `executionType === "DELEGATE"`, ce champ est OBLIGATOIRE et indique à
   * `executeTool` de déléguer l'invocation à un handler enregistré dans
   * `delegate-registry.ts` au lieu de `callLLM`. Pattern symétrique à MCP
   * mais pour services internes (pas externe).
   *
   * Cas d'usage : Glory tools qui wrappent une opération non-LLM (web fetch,
   * DB persist, transformation déterministe) et qui doivent rester
   * discoverable + tier-gateable + chaînables en `GlorySequence`.
   *
   * Le `handlerKey` doit exister dans `DELEGATE_HANDLERS` de
   * `delegate-registry.ts`. Mismatch → `executeTool` retourne FAILED.
   */
  delegateDescriptor?: { handlerKey: string };
  /**
   * Phase 16-A — Tier gate pour outils premium / coûteux / dépendants
   * d'un connecteur externe payant. Si `true`, `executeTool` vérifie via
   * `checkPaidTier(strategy.userId, paidTierAllowList)` qu'un abonnement
   * actif existe dans la liste des tiers payants. Sinon retourne
   * `TIER_GATE_DENIED` sans exécuter le tool.
   *
   * Default : `false` (free tier accessible).
   */
  requiresPaidTier?: boolean;
  /**
   * Override la liste des `Subscription.tierKey` autorisés pour ce tool
   * spécifique. Default : `PAID_TIER_KEYS_DEFAULT` du module tier-gate.
   */
  paidTierAllowList?: readonly string[];
  /**
   * Phase 18-N6 (ADR-0061) — BrandNature applicables pour ce tool. Le sequence-
   * executor + UI cockpit filtrent les tools selon la nodeNature du BrandNode
   * cible. Default `undefined` = tool universel (tous archétypes éligibles).
   *
   * Exemples :
   *   - "writers-room-outline" : ["MEDIA_IP", "CHARACTER_IP"]
   *   - "lineup-reveal-strategy" : ["FESTIVAL_IP"]
   *   - "shelf-share-strategy" : ["PRODUCT", "RETAIL_SPACE"]
   *   - "creative-brief" : undefined (universel)
   */
  applicableNatures?: readonly GloryToolNature[];
  /**
   * Phase 21 (ADR-0067) — Schéma Zod STRICT de la sortie LLM. Imposé par le
   * wrapper `executeStructuredLLMCall` au moment de l'invocation : le LLM
   * voit la JSON Schema dérivée + retry x2 sur échec validation + fail-fast
   * après. C'est la mécanique verrouillée qui remplace l'ancien
   * `JSON.parse(jsonMatch[0])` naïf de `engine.ts`.
   *
   * OBLIGATOIRE pour `executionType: "LLM"` SAUF si `_noSchemaJustification`
   * est documenté. Test anti-drift G2 vérifie l'invariant.
   *
   * `MCP` / `DELEGATE` / `COMPOSE` / `CALC` n'utilisent pas ce champ (pas
   * d'appel LLM côté tool).
   */
  outputSchema?: ZodType<unknown>;
  /**
   * Phase 21 (ADR-0067) — Opt-out documenté pour les rares cas où un tool LLM
   * ne peut pas avoir de schéma strict (output prose libre, multimédia,
   * critères créatifs subjectifs). Doit contenir une justification ≥ 30 char
   * lue par le test anti-drift et le code review.
   *
   * Préférer toujours `outputSchema` quand possible.
   */
  _noSchemaJustification?: string;
  /**
   * Phase 23 (ADR-0077 §P22-3, architecture D7) — Schéma Zod de la SAISIE MANUELLE
   * d'un tool `executionType: "HYBRID"`. OBLIGATOIRE quand HYBRID, interdit sinon
   * (invariant vérifié par `tests/unit/governance/phase22-glory-hybrid.test.ts`).
   *
   * Contrat de parité manual-first (ADR-0060) : `manualFormSchema` doit être
   * STRUCTURELLEMENT ÉGAL à `outputSchema` — la saisie manuelle produit exactement
   * la même forme que la sortie LLM, donc indistinguable downstream. Le factory
   * `defineHybridTool()` garantit cette égalité en réutilisant la même référence Zod.
   *
   * Consommé par `executeHybridTool` (dispatcher, `engine.ts`) pour la branche
   * manuelle, et par l'UI catalogue `/console/artemis/tools` (Story 5.5) pour
   * générer le formulaire schema-driven (UX-DR9) via `deriveJsonSchemaFromZod`.
   */
  manualFormSchema?: ZodType<unknown>;
}

/**
 * Phase 23 (Story 5.1) — Constructeur typé d'un Glory tool HYBRID.
 *
 * Enforce au niveau TYPE (compile-time) la parité manual-first : impossible de
 * déclarer un tool HYBRID sans `outputSchema` ni `applicableNatures` non vide.
 * Garantit au niveau RUNTIME l'égalité structurelle `manualFormSchema === outputSchema`
 * en réutilisant la même référence Zod (pas de second schéma divergent possible).
 *
 * Les tools non-HYBRID continuent d'être déclarés en littéral `GloryToolDef`.
 */
export type HybridToolInput = Omit<
  GloryToolDef,
  "executionType" | "manualFormSchema" | "outputSchema" | "applicableNatures"
> & {
  executionType: "HYBRID";
  /** Schéma Zod strict de la sortie. Sert AUSSI de `manualFormSchema` (même référence). */
  outputSchema: ZodType<unknown>;
  /** N6-bis (ADR-0061) — au moins un archétype applicable (tuple non vide enforced au type-level). */
  applicableNatures: readonly [GloryToolNature, ...GloryToolNature[]];
};

export function defineHybridTool(def: HybridToolInput): GloryToolDef {
  return {
    ...def,
    // Parité structurelle garantie par réutilisation de la MÊME référence Zod.
    manualFormSchema: def.outputSchema,
  };
}
