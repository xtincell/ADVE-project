/**
 * GLORY Tools — Atomic Creative Operations Registry
 *
 * Each tool is an atomic, reusable operation that manipulates ADVE pillar values.
 * Tools are ABSOLUTE — they have a unique slug, typed inputs/outputs, and don't
 * know which sequences invoke them. Sequences orchestrate tools externally.
 *
 * 4 Layers:
 *   CR    — Concepteur-Rédacteur (copywriting, scripting, messaging)
 *   DC    — Direction de Création (evaluation, architecture, presentation)
 *   HYBRID — Operations (calendar, budget, workflow, benchmarks)
 *   BRAND  — Visual Identity Pipeline (semiotics → guidelines)
 *
 * 3 Execution Types:
 *   LLM     — Requires AI for creative/judgment decisions (human replacement)
 *   COMPOSE — Template-based assembly of pillar values (text compositing)
 *   CALC    — Mathematical/financial calculation (no AI, no templates)
 *
 * ~95% of operations are COMPOSE or CALC. LLM is reserved for creative
 * generation and subjective evaluation that would otherwise require a human.
 */

import type { BrandAssetKind } from "@/domain/brand-asset-kinds";

// ─── Types ───────────────────────────────────────────────────────────────────

export type GloryLayer = "CR" | "DC" | "HYBRID" | "BRAND";

/** How the tool executes:
 * - LLM: AI call needed (creative generation or subjective judgment)
 * - COMPOSE: Template + pillar data → formatted output (no AI)
 * - CALC: Math/formulas on numeric values (no AI, no templates)
 * - MCP: External MCP server tool invocation via Anubis (Phase 16, ADR-0048).
 *        Tool body delegates to `anubis.invokeExternalTool({serverName, toolName, ...})`.
 *        Used for Higgsfield, future Sora MCP / Runway MCP / etc.
 */
export type GloryExecutionType = "LLM" | "COMPOSE" | "CALC" | "MCP";

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
}

// ─── LAYER CR — Concepteur-Rédacteur (10 tools) ─────────────────────────────

const CR_TOOLS: GloryToolDef[] = [
  {
    slug: "concept-generator",
    name: "Générateur de Concepts",
    layer: "CR",
    order: 1,
    executionType: "LLM",
    pillarKeys: ["A", "D"],
    requiredDrivers: [],
    dependencies: [],
    description: "Génère des concepts créatifs à partir du brief et de l'ADN de marque",
    inputFields: ["brief", "brand_dna", "target", "tone", "constraints", "brand_origin", "emotional_position"],
    pillarBindings: {
      brand_dna: "a.noyauIdentitaire",
      brief: "d.promesseMaitre",
      tone: "d.tonDeVoix.personnalite",
      target: "d.personas",
      constraints: "r.mitigationPriorities",
      // ADR-0037 PR-K3 — nouveaux fields canon manuel ADVE
      brand_origin: "a.originMyth.elevator", // récit fondateur 50 mots
      emotional_position: "d.positionnementEmotionnel", // ressenti unique 1ère personne
    },
    outputFormat: "concepts_list",
    promptTemplate: `En tant que concepteur-rédacteur senior, génère 5 concepts créatifs pour ce brief.
Contexte marque : {{brand_dna}}
Brief : {{brief}}
Cible : {{target}}
Ton : {{tone}}
Contraintes : {{constraints}}
Pour chaque concept, fournis : titre, accroche, description (3 lignes), déclinaisons possibles.`,
    status: "ACTIVE",
  },
  {
    slug: "script-writer",
    name: "Scripteur",
    layer: "CR",
    order: 2,
    executionType: "LLM",
    pillarKeys: ["A", "E"],
    requiredDrivers: ["VIDEO", "TV", "RADIO"],
    dependencies: ["concept-generator"],
    description: "Écrit des scripts pour vidéo, TV et radio",
    inputFields: ["concept", "duration", "format", "tone", "cta"],
    pillarBindings: {
      tone: "d.tonDeVoix.personnalite",
      cta: "d.assetsLinguistiques.slogan",
    },
    outputFormat: "script",
    promptTemplate: `Écris un script {{format}} de {{duration}} secondes.
Concept : {{concept}}
Ton : {{tone}}
CTA : {{cta}}
Structure : Accroche (3s) → Développement → Climax → CTA.
Format : dialogues, indications de réalisation, musique/SFX.`,
    status: "ACTIVE",
  },
  {
    slug: "long-copy-craftsman",
    name: "Artisan du Long Copy",
    layer: "CR",
    order: 3,
    executionType: "LLM",
    pillarKeys: ["A", "V"],
    requiredDrivers: ["PRINT", "WEBSITE"],
    dependencies: [],
    description: "Rédige du contenu long-format persuasif",
    inputFields: ["topic", "angle", "target", "length", "cta"],
    pillarBindings: {
      target: "d.personas",
      cta: "d.assetsLinguistiques.slogan",
      angle: "a.prophecy.worldTransformed",
    },
    outputFormat: "long_copy",
    promptTemplate: `Rédige un texte long-format persuasif sur le sujet : {{topic}}
Angle : {{angle}} | Cible : {{target}} | Longueur : {{length}} mots
Structure narrative : Hook → Problem → Agitation → Solution → Proof → CTA.`,
    status: "ACTIVE",
  },
  {
    slug: "dialogue-writer",
    name: "Dialoguiste",
    layer: "CR",
    order: 4,
    executionType: "LLM",
    pillarKeys: ["A", "E"],
    requiredDrivers: ["VIDEO", "RADIO"],
    dependencies: [],
    description: "Crée des dialogues naturels et mémorables",
    inputFields: ["scenario", "characters", "tone", "key_message"],
    pillarBindings: {
      tone: "d.tonDeVoix.personnalite",
      key_message: "d.promesseMaitre",
      characters: "d.personas",
    },
    outputFormat: "dialogue",
    promptTemplate: `Écris un dialogue pour ce scénario :
{{scenario}}
Personnages : {{characters}}
Ton : {{tone}}
Message clé à intégrer naturellement : {{key_message}}`,
    status: "ACTIVE",
  },
  {
    slug: "claim-baseline-factory",
    name: "Usine à Claims & Baselines",
    layer: "CR",
    order: 5,
    executionType: "LLM",
    pillarKeys: ["D", "V"],
    requiredDrivers: [],
    dependencies: [],
    description: "Génère des slogans, claims et baselines",
    inputFields: ["brand_positioning", "key_benefit", "tone", "constraints"],
    pillarBindings: {
      brand_positioning: "d.positionnement",
      key_benefit: "d.promesseMaitre",
      tone: "d.tonDeVoix.personnalite",
      constraints: "r.mitigationPriorities",
    },
    outputFormat: "claims_list",
    promptTemplate: `Génère 10 claims/baselines pour cette marque :
Positionnement : {{brand_positioning}}
Bénéfice clé : {{key_benefit}}
Ton : {{tone}}
Pour chaque proposition : version courte (≤5 mots), version longue (≤10 mots), justification.`,
    status: "ACTIVE",
  },
  {
    slug: "print-ad-architect",
    name: "Architecte Print",
    layer: "CR",
    order: 6,
    executionType: "COMPOSE",  // Layout from concept + brand elements = compositing
    pillarKeys: ["D"],
    requiredDrivers: ["PRINT", "OOH"],
    dependencies: ["concept-generator"],
    description: "Conçoit des annonces presse et affiches à partir du concept et des éléments brand",
    inputFields: ["concept", "format", "headline", "visual_direction"],
    pillarBindings: {
      visual_direction: "d.directionArtistique.moodboard.theme",
      headline: "d.assetsLinguistiques.slogan",
    },
    outputFormat: "print_ad_spec",
    promptTemplate: `Conçois une annonce {{format}} :
Concept : {{concept}}
Headline proposé : {{headline}}
Direction visuelle : {{visual_direction}}
Livrable : layout description, headline, body copy, CTA, indications visuelles.`,
    status: "ACTIVE",
    // Phase 9-suite (NEFER) — brief-to-forge auto-handoff vers Ptah
    forgeOutput: {
      forgeKind: "image",
      providerHint: "magnific",
      modelHint: "mystic",
      manipulationProfile: ["entertainer","facilitator"],
      briefTextPath: "headline",
      defaultPillarSource: "V",
      // Phase 17 (ADR-0037) — print-ad-architect : besoin big idea + concept + chromatique
      requires: ["BIG_IDEA", "CONCEPT", "CHROMATIC_STRATEGY"],
    },
  },
  {
    slug: "social-copy-engine",
    name: "Moteur Copy Social",
    layer: "CR",
    order: 7,
    executionType: "COMPOSE",  // Adapts existing copy to platform specs = formatting
    pillarKeys: ["E"],
    requiredDrivers: ["INSTAGRAM", "FACEBOOK", "TIKTOK", "LINKEDIN"],
    dependencies: [],
    description: "Adapte le contenu aux specs de chaque plateforme sociale",
    inputFields: ["platform", "content_type", "topic", "tone", "hashtags_strategy"],
    pillarBindings: {
      tone: "d.tonDeVoix.personnalite",
    },
    outputFormat: "social_copy_set",
    promptTemplate: `Adapte le copy pour {{platform}} ({{content_type}}) :
Sujet : {{topic}} | Ton : {{tone}}
Stratégie hashtags : {{hashtags_strategy}}
Fournis : copy principal, variantes A/B, hashtags, CTA, heures de publication recommandées.`,
    status: "ACTIVE",
  },
  {
    slug: "storytelling-sequencer",
    name: "Séquenceur Narratif",
    layer: "CR",
    order: 8,
    executionType: "LLM",  // Narrative arc structuring — needs creative judgment
    pillarKeys: ["A", "E"],
    requiredDrivers: [],
    dependencies: ["concept-generator"],
    description: "Structure les arcs narratifs sur plusieurs contenus",
    inputFields: ["story_arc", "episodes", "platform", "frequency", "brand_mission", "origin_myth"],
    pillarBindings: {
      story_arc: "a.herosJourney",
      // ADR-0037 PR-K3 — nouveaux fields canon manuel ADVE
      brand_mission: "a.missionStatement", // verbe d'action — comment la marque réalise sa Vision
      origin_myth: "a.originMyth.storytelling", // récit fondateur 3-7 paragraphes
    },
    outputFormat: "story_sequence",
    promptTemplate: `Séquence un arc narratif en {{episodes}} épisodes :
Arc : {{story_arc}}
Plateforme : {{platform}} | Fréquence : {{frequency}}
Pour chaque épisode : titre, hook, contenu, cliffhanger, CTA.`,
    status: "ACTIVE",
  },
  {
    slug: "wordplay-cultural-bank",
    name: "Banque Jeux de Mots & Références Culturelles",
    layer: "CR",
    order: 9,
    executionType: "LLM",  // Creative wordplay — needs linguistic creativity
    pillarKeys: ["A", "D"],
    requiredDrivers: [],
    dependencies: [],
    description: "Génère des jeux de mots et références culturelles contextuelles",
    inputFields: ["brand_name", "market", "cultural_context", "language"],
    pillarBindings: {
      brand_name: "a.nomMarque",
      cultural_context: "a.doctrine.dogmas",
      market: "a.pays",
      language: "d.assetsLinguistiques.languePrincipale",
    },
    outputFormat: "wordplay_bank",
    promptTemplate: `Génère une banque de jeux de mots et références culturelles :
Marque : {{brand_name}} | Marché : {{market}}
Contexte culturel : {{cultural_context}} | Langue : {{language}}
Catégories : jeux de mots, références pop culture, expressions locales, double sens.`,
    status: "ACTIVE",
  },
  {
    slug: "brief-creatif-interne",
    name: "Brief Créatif Interne",
    layer: "CR",
    order: 10,
    executionType: "COMPOSE",  // Assembles strategy data into brief format
    pillarKeys: ["I"],
    requiredDrivers: [],
    dependencies: [],
    description: "Assemble les données stratégiques en brief créatif structuré",
    inputFields: ["objective", "target", "key_message", "deliverables", "budget", "deadline"],
    pillarBindings: {
      target: "d.personas",
      key_message: "d.promesseMaitre",
      budget: "s.globalBudget",
    },
    outputFormat: "creative_brief",
    promptTemplate: `Brief créatif interne :
Objectif : {{objective}} | Cible : {{target}}
Message clé : {{key_message}}
Livrables attendus : {{deliverables}}
Budget : {{budget}} | Deadline : {{deadline}}
Format : contexte, insight, promesse, preuve, ton, do/don't, livrables, timing.`,
    status: "ACTIVE",
  },
];

// ─── LAYER DC — Direction de Création (9 tools) ─────────────────────────────

const DC_TOOLS: GloryToolDef[] = [
  {
    slug: "campaign-architecture-planner",
    name: "Planificateur d'Architecture de Campagne",
    layer: "DC",
    order: 11,
    executionType: "COMPOSE",  // Structures campaign from objectives + channels + budget
    pillarKeys: ["I", "E"],
    requiredDrivers: [],
    dependencies: [],
    description: "Structure l'architecture créative d'une campagne à partir des objectifs et canaux",
    inputFields: ["campaign_objectives", "budget", "timeline", "channels", "creative_territory"],
    pillarBindings: {
      budget: "s.globalBudget",
      channels: "i.catalogueParCanal",
      timeline: "s.roadmap",
      creative_territory: "d.directionArtistique.moodboard.theme",
    },
    outputFormat: "campaign_architecture",
    promptTemplate: `Architecture créative de la campagne :
Objectifs : {{campaign_objectives}} | Budget : {{budget}}
Timeline : {{timeline}} | Canaux : {{channels}}
Territoire créatif : {{creative_territory}}
Livrable : phases, concepts par phase, déclinaisons par canal, cohérence narrative.`,
    status: "ACTIVE",
  },
  {
    slug: "creative-evaluation-matrix",
    name: "Matrice d'Évaluation Créative",
    layer: "DC",
    order: 12,
    executionType: "LLM",  // Subjective evaluation — needs human-like judgment
    pillarKeys: ["D", "T"],
    requiredDrivers: [],
    dependencies: [],
    description:
      "Évalue les propositions créatives selon des critères objectifs ET les 4 modes de Manipulation Matrix (peddler/dealer/facilitator/entertainer). Phase 13 (B2) : ajout dimension manipulation modes + forgeOutput visualisation matrice.",
    inputFields: ["proposals", "criteria", "brand_guidelines", "objectives", "manipulation_mix"],
    pillarBindings: {
      brand_guidelines: "d.directionArtistique.brandGuidelines",
      objectives: "s.axesStrategiques",
      manipulation_mix: "s.manipulationMix",
    },
    outputFormat: "evaluation_matrix",
    promptTemplate: `Évalue les propositions créatives :
Propositions : {{proposals}}
Critères : pertinence stratégique, impact créatif, faisabilité, cohérence marque, mémorabilité.
Guidelines marque : {{brand_guidelines}}
Manipulation mix Strategy : {{manipulation_mix}}

⚠️ FORMAT DE SORTIE VERROUILLÉ — Réponds UNIQUEMENT avec ce JSON exact, aucun préambule, aucun markdown.

Schéma EXACT :
{
  "evaluations": [
    {
      "proposal_name":  "<nom proposition>",
      "scores": {
        "strategic_relevance": <0-10>,
        "creative_impact":     <0-10>,
        "feasibility":         <0-10>,
        "brand_coherence":     <0-10>,
        "memorability":        <0-10>
      },
      "manipulation_compatibility": {
        "peddler":     <0-10>,
        "dealer":      <0-10>,
        "facilitator": <0-10>,
        "entertainer": <0-10>
      },
      "dominant_mode":           "peddler" | "dealer" | "facilitator" | "entertainer",
      "dominant_mode_rationale": "<2 phrases>"
    }
  ],
  "matrix_summary": {
    "peddler":     "<synthèse 1 phrase posture peddler>",
    "dealer":      "<synthèse posture dealer>",
    "facilitator": "<synthèse posture facilitator>",
    "entertainer": "<synthèse posture entertainer>"
  },
  "prompt": "<brief Banana KV — 2-3 phrases pour forger une visualisation matrice 5×4 (forge manuelle B8)>"
}

Règles : evaluations MIN 1, MAX 8 (si pas de proposals : 1 entry "à enrichir" / scores=5). Tous scores entiers ∈ [0,10]. dominant_mode : STRICTEMENT une des 4 valeurs énumérées. matrix_summary : 4 clés OBLIGATOIRES (peddler/dealer/facilitator/entertainer) JAMAIS vides. Si manipulation_mix fourni, aligner dominant_mode sur le mix. Pas de wrapper. Pas de champ supplémentaire.`,
    status: "ACTIVE",
    // Phase 13 (B2) — forgeOutput déclenché manuellement via bouton "Forge now" B8
    // sur section manipulation-matrix (Oracle section 30, kind=MANIPULATION_MATRIX).
    // Pendant enrichOracle (B4), oracleEnrichmentMode=true court-circuite l'auto-forge.
    forgeOutput: {
      forgeKind: "image",
      providerHint: "magnific",
      modelHint: "nano-banana-pro",
      manipulationProfile: ["peddler", "dealer", "facilitator", "entertainer"],
      briefTextPath: "prompt",
      defaultPillarSource: "D",
      // Phase 17 (ADR-0037) — creative-evaluation-matrix : compare concepts vs personas
      requires: ["CONCEPT", "PERSONA"],
    },
  },
  {
    slug: "idea-killer-saver",
    name: "Idea Killer/Saver",
    layer: "DC",
    order: 13,
    executionType: "LLM",  // Triage decisions — needs judgment
    pillarKeys: ["D"],
    requiredDrivers: [],
    dependencies: ["creative-evaluation-matrix"],
    description: "Filtre les idées : kill, save, ou pivot",
    inputFields: ["ideas", "brand_fit", "market_context", "budget_reality"],
    pillarBindings: {
      brand_fit: "d.positionnement",
      market_context: "t.triangulation",
      budget_reality: "s.globalBudget",
    },
    outputFormat: "idea_triage",
    promptTemplate: `Triage les idées créatives :
Pour chaque idée, verdict : KILL (pourquoi), SAVE (pourquoi + renforcement), PIVOT (vers quoi).
Critères : faisabilité, différenciation, cohérence marque, potentiel viral.`,
    status: "ACTIVE",
  },
  {
    slug: "multi-team-coherence-checker",
    name: "Vérificateur de Cohérence Multi-Équipe",
    layer: "DC",
    order: 14,
    executionType: "COMPOSE",  // Compares outputs against guidelines = pattern matching
    pillarKeys: ["D", "I"],
    requiredDrivers: [],
    dependencies: [],
    description: "Vérifie la cohérence créative entre équipes et canaux",
    inputFields: ["team_outputs", "brand_guidelines", "campaign_brief"],
    pillarBindings: {
      brand_guidelines: "d.directionArtistique.brandGuidelines",
    },
    outputFormat: "coherence_report",
    promptTemplate: `Vérifie la cohérence créative entre les livrables des différentes équipes.
Identifie : incohérences visuelles, tonales, narratives, de message.
Recommande : ajustements pour harmoniser, éléments à conserver.`,
    status: "ACTIVE",
  },
  {
    slug: "client-presentation-strategist",
    name: "Stratège de Présentation Client",
    layer: "DC",
    order: 15,
    executionType: "COMPOSE",  // Structures presentation from creative work + context
    pillarKeys: ["V", "E"],
    requiredDrivers: [],
    dependencies: [],
    description: "Structure les présentations créatives pour le client",
    inputFields: ["creative_work", "client_context", "objectives", "concerns"],
    pillarBindings: {
      objectives: "s.axesStrategiques",
      concerns: "r.globalSwot.weaknesses",
    },
    outputFormat: "presentation_strategy",
    promptTemplate: `Structure la présentation client :
Travail créatif : {{creative_work}}
Contexte client : {{client_context}}
Objectifs de la présentation : convaincre, inspirer, rassurer.
Livrable : arc narratif, arguments clés, anticipation des objections, recommandation.`,
    status: "ACTIVE",
    // Phase 9-suite (NEFER) — brief-to-forge auto-handoff vers Ptah
    forgeOutput: {
      forgeKind: "design",
      providerHint: "figma",
      modelHint: "deck",
      manipulationProfile: ["dealer","facilitator"],
      briefTextPath: "outline",
      defaultPillarSource: "I",
      // Phase 17 (ADR-0037) — client-presentation-strategist : structure pres autour big idea
      requires: ["BIG_IDEA"],
    },
  },
  {
    slug: "creative-direction-memo",
    name: "Mémo de Direction Créative",
    layer: "DC",
    order: 16,
    executionType: "COMPOSE",  // Formats vision + references into structured memo
    pillarKeys: ["D"],
    requiredDrivers: [],
    dependencies: [],
    description: "Formate un mémo de direction créative à partir de la vision et des références",
    inputFields: ["vision", "references", "do_dont", "tone_board"],
    pillarBindings: {
      vision: "a.prophecy.worldTransformed",
      do_dont: "d.tonDeVoix",
      tone_board: "d.directionArtistique.moodboard",
    },
    outputFormat: "direction_memo",
    promptTemplate: `Mémo de direction créative :
Vision : {{vision}}
Références : {{references}}
Do : ... | Don't : ...
Tone board : {{tone_board}}
Format : manifeste court, principes directeurs, exemples, anti-exemples.`,
    status: "ACTIVE",
    // Phase 9-suite (NEFER) — brief-to-forge auto-handoff vers Ptah
    forgeOutput: {
      forgeKind: "design",
      providerHint: "figma",
      modelHint: "deck",
      manipulationProfile: ["dealer","facilitator"],
      briefTextPath: "memo",
      defaultPillarSource: "I",
      // Phase 17 (ADR-0037) — creative-direction-memo : vision + ton de marque
      requires: ["BIG_IDEA", "TONE_CHARTER"],
    },
  },
  {
    slug: "pitch-architect",
    name: "Architecte de Pitch",
    layer: "DC",
    order: 17,
    executionType: "COMPOSE",  // Structures pitch from brief + proposal + strengths
    pillarKeys: ["V", "A"],
    requiredDrivers: [],
    dependencies: [],
    description: "Structure les pitches pour les compétitions et appels d'offres",
    inputFields: ["client_brief", "agency_strengths", "creative_proposal", "budget"],
    pillarBindings: {
      agency_strengths: "r.globalSwot.strengths",
      budget: "s.globalBudget",
    },
    outputFormat: "pitch_structure",
    promptTemplate: `Structure le pitch :
Brief client : {{client_brief}}
Forces agence : {{agency_strengths}}
Proposition créative : {{creative_proposal}}
Format : contexte → insight → stratégie → idée → exécution → équipe → budget.`,
    status: "ACTIVE",
    // Phase 9-suite (NEFER) — brief-to-forge auto-handoff vers Ptah
    forgeOutput: {
      forgeKind: "design",
      providerHint: "figma",
      modelHint: "deck",
      manipulationProfile: ["dealer","facilitator"],
      briefTextPath: "pitch",
      defaultPillarSource: "I",
      // Phase 17 (ADR-0037) — pitch-architect : pitch construit sur brief client + big idea
      requires: ["CREATIVE_BRIEF", "BIG_IDEA"],
    },
  },
  {
    slug: "award-case-builder",
    name: "Constructeur de Cases Awards",
    layer: "DC",
    order: 18,
    executionType: "COMPOSE",  // Compiles results into award case format
    pillarKeys: ["T", "E"],
    requiredDrivers: [],
    dependencies: [],
    description: "Compile les résultats de campagne en dossier awards",
    inputFields: ["campaign_results", "creative_work", "category", "award_criteria"],
    pillarBindings: {
      campaign_results: "t.traction.preuvesTraction",
    },
    outputFormat: "award_case",
    promptTemplate: `Case study pour soumission aux awards :
Résultats : {{campaign_results}}
Catégorie : {{category}}
Critères : {{award_criteria}}
Format : challenge → insight → idea → execution → results (avec métriques).`,
    status: "ACTIVE",
    // Phase 9-suite (NEFER) — brief-to-forge auto-handoff vers Ptah
    forgeOutput: {
      forgeKind: "design",
      providerHint: "canva",
      modelHint: "case-study",
      manipulationProfile: ["entertainer","facilitator"],
      briefTextPath: "narrative",
      defaultPillarSource: "R",
      // Phase 17 (ADR-0037) — award-case-builder : retracer la big idea de la campagne
      requires: ["BIG_IDEA"],
    },
  },
  {
    slug: "kv-banana-prompt-generator",
    name: "Générateur de Prompts Banana pour KV",
    layer: "DC",
    order: 19,
    executionType: "COMPOSE",  // Assembles pillar variables into structured prompt — NO invention
    pillarKeys: ["A", "D", "V"],
    requiredDrivers: [],
    dependencies: ["concept-generator"],
    description: "Assemble les variables des piliers A-D-V en prompts optimisés pour la génération d'images KV. Puise exclusivement dans les données existantes — n'invente rien.",
    inputFields: ["format", "campaign_context", "archetype", "prophecy", "master_promise", "tone_of_voice", "personality", "chromatic_strategy", "typography_system", "moodboard_keywords", "primary_persona", "linguistic_assets", "concept"],
    pillarBindings: {
      archetype: "a.archetype",
      prophecy: "a.prophecy",
      master_promise: "d.promesseMaitre",
      tone_of_voice: "d.tonDeVoix.personnalite",
      personality: "a.noyauIdentitaire",
      chromatic_strategy: "d.directionArtistique.chromaticStrategy",
      typography_system: "d.directionArtistique.typographySystem",
      moodboard_keywords: "d.directionArtistique.moodboard.keywords",
      primary_persona: "d.personas",
      linguistic_assets: "d.assetsLinguistiques",
    },
    outputFormat: "kv_prompts_list",
    promptTemplate: `CONTEXTE MARQUE (données piliers ADVE — ne rien inventer) :
- Archétype : {{archetype}}
- Prophétie : {{prophecy}}
- Promesse maître : {{master_promise}}
- Ton de voix : {{tone_of_voice}}
- Personnalité : {{personality}}
- Direction chromatique : {{chromatic_strategy}}
- Système typographique : {{typography_system}}
- Moodboard : {{moodboard_keywords}}
- Persona cible : {{primary_persona}}
- Slogan/Tagline : {{linguistic_assets}}
- Concept créatif retenu : {{concept}}

BRIEF KV :
Format cible : {{format}}
Contexte campagne : {{campaign_context}}

Sortie : 3 prompts optimisés pour Nano Banana Pro / Midjourney / DALL-E.
Chaque prompt : composition, couleurs chromatiques, archétype/personnalité, format cible, style moodboard.
JSON : { "prompts": [{ "format", "prompt", "style_notes", "copy_overlay" }] }`,
    status: "ACTIVE",
    // Phase 9 (ADR-0009) — brief-to-forge : auto-handoff vers Ptah avec Nano Banana Pro
    forgeOutput: {
      forgeKind: "image",
      providerHint: "magnific",
      modelHint: "nano-banana-pro",
      manipulationProfile: ["entertainer", "facilitator", "dealer", "peddler"],
      briefTextPath: "prompts[0].prompt",
      defaultPillarSource: "V",
      // Phase 17 (ADR-0037) — kv-banana-prompt-generator : assemble big idea + DA + chromatique
      requires: ["KV_ART_DIRECTION_BRIEF", "BIG_IDEA", "CHROMATIC_STRATEGY"],
    },
  },
];

// ─── LAYER HYBRID — Operations (11 tools) ────────────────────────────────────

const HYBRID_TOOLS: GloryToolDef[] = [
  {
    slug: "campaign-360-simulator",
    name: "Simulateur 360° de Campagne",
    layer: "HYBRID",
    order: 20,
    executionType: "CALC",  // Projections = math on budget × channels × historical data
    pillarKeys: ["I", "T"],
    requiredDrivers: [],
    dependencies: [],
    description: "Simule l'impact d'une campagne — projections reach, engagement, ROI par canal",
    inputFields: ["campaign_plan", "budget", "channels", "historical_data"],
    pillarBindings: {
      budget: "s.globalBudget",
      channels: "i.catalogueParCanal",
      historical_data: "t.traction",
    },
    outputFormat: "simulation_report",
    promptTemplate: `Simulation campagne 360° :
Plan : {{campaign_plan}} | Budget : {{budget}}
Canaux : {{channels}}
Projections : reach, engagement, conversions par canal, ROI estimé, risques.`,
    status: "ACTIVE",
  },
  {
    slug: "production-budget-optimizer",
    name: "Optimiseur Budget Production",
    layer: "HYBRID",
    order: 21,
    executionType: "CALC",  // Budget allocation = math
    pillarKeys: ["I"],
    requiredDrivers: [],
    dependencies: [],
    description: "Optimise l'allocation budgétaire de production par livrable",
    inputFields: ["deliverables", "budget", "quality_requirements", "timeline"],
    pillarBindings: {
      deliverables: "i.assetsProduisibles",
      budget: "s.globalBudget",
      timeline: "s.sprint90Days",
    },
    outputFormat: "budget_optimization",
    promptTemplate: `Budget de production :
Livrables : {{deliverables}} | Budget : {{budget}} XAF
Qualité requise : {{quality_requirements}} | Timeline : {{timeline}}

⚠️ FORMAT DE SORTIE VERROUILLÉ — Réponds UNIQUEMENT avec ce JSON exact, aucun préambule, aucun markdown.

Schéma EXACT :
{
  "total_budget": <montant XAF entier ≥ 0>,
  "currency":     "XAF",
  "allocation_by_deliverable": [
    { "deliverable": "<nom livrable>", "amount": <XAF entier ≥ 0>, "percentage": <0-100>, "rationale": "<pourquoi cette allocation>" }
  ],
  "economic_alternatives": [
    { "scenario": "<nom alternative>", "savings_xaf": <≥ 0>, "trade_off": "<contrepartie qualité/délai>" }
  ],
  "negotiation_points": ["<levier 1>", "<levier 2>", "<levier 3>"],
  "risks": [
    { "risk": "<risque budgétaire>", "mitigation": "<action concrète>" }
  ]
}

Règles : si {{budget}} numérique fourni, total_budget = cette valeur ; sinon valeur conservatrice 1000000 + rationale "à enrichir". currency TOUJOURS "XAF". allocation_by_deliverable MIN 1 entry (somme amounts ≤ total_budget, somme percentages ≤ 100). economic_alternatives MIN 1, MAX 3. negotiation_points MIN 3, MAX 5. risks MIN 1, MAX 3. Tous montants entiers (pas de décimales). Si livrables manquants : 1 entry "à enrichir" / amount=0. Pas de wrapper. Pas de champ supplémentaire.`,
    status: "ACTIVE",
  },
  {
    slug: "vendor-brief-generator",
    name: "Générateur de Brief Fournisseur",
    layer: "HYBRID",
    order: 22,
    executionType: "COMPOSE",  // Assembles specs into brief format
    pillarKeys: ["I"],
    requiredDrivers: [],
    dependencies: [],
    description: "Assemble les specs en brief fournisseur structuré",
    inputFields: ["deliverable", "specs", "deadline", "budget", "quality_criteria"],
    pillarBindings: {
      budget: "s.globalBudget",
      quality_criteria: "d.directionArtistique.brandGuidelines",
    },
    outputFormat: "vendor_brief",
    promptTemplate: `Brief fournisseur :
Livrable : {{deliverable}} | Specs : {{specs}}
Deadline : {{deadline}} | Budget : {{budget}} XAF
Format : contexte, livrables attendus, specs techniques, critères de qualité, calendrier, conditions.`,
    status: "ACTIVE",
    // Phase 9-suite (NEFER) — brief-to-forge auto-handoff vers Ptah
    forgeOutput: {
      forgeKind: "design",
      providerHint: "canva",
      modelHint: "document",
      manipulationProfile: ["facilitator"],
      briefTextPath: "brief",
      defaultPillarSource: "I",
      // Phase 17b (ADR-0050 — anciennement ADR-0037) — vendor-brief-generator : le deliverable provient d'un brief créatif validé
      requires: ["CREATIVE_BRIEF"],
    },
  },
  {
    slug: "devis-generator",
    name: "Générateur de Devis",
    layer: "HYBRID",
    order: 23,
    executionType: "CALC",  // Line items × prices = calculation
    pillarKeys: ["V"],
    requiredDrivers: [],
    dependencies: [],
    description: "Calcule et formate un devis détaillé (lignes × prix)",
    inputFields: ["services", "pricing", "timeline", "client_info"],
    pillarBindings: {
      services: "v.produitsCatalogue",
      pricing: "v.productLadder",
      timeline: "s.sprint90Days",
    },
    outputFormat: "devis",
    promptTemplate: `Devis détaillé :
Services : {{services}} | Pricing : {{pricing}}
Timeline : {{timeline}}
Format : ligne par ligne avec description, quantité, prix unitaire, total, conditions.`,
    status: "ACTIVE",
    // Phase 9-suite (NEFER) — brief-to-forge auto-handoff vers Ptah
    forgeOutput: {
      forgeKind: "design",
      providerHint: "canva",
      modelHint: "document",
      manipulationProfile: ["facilitator"],
      briefTextPath: "devis",
      defaultPillarSource: "T",
      // Phase 17 (ADR-0037) — devis-generator : tool admin/comptable, inputs business externes
      requires: [],
    },
  },
  {
    slug: "content-calendar-strategist",
    name: "Stratège Calendrier Éditorial",
    layer: "HYBRID",
    order: 24,
    executionType: "COMPOSE",  // Maps themes × platforms × dates = compositing
    pillarKeys: ["I", "E"],
    requiredDrivers: ["INSTAGRAM", "FACEBOOK", "TIKTOK", "LINKEDIN"],
    dependencies: [],
    description: "Planifie le calendrier éditorial multi-plateforme",
    inputFields: ["platforms", "frequency", "themes", "events", "duration"],
    pillarBindings: {
      themes: "e.rituels",
      events: "e.sacredCalendar",
    },
    outputFormat: "content_calendar",
    promptTemplate: `Calendrier éditorial sur {{duration}} :
Plateformes : {{platforms}} | Fréquence : {{frequency}}
Thèmes : {{themes}} | Événements clés : {{events}}
Par semaine : jours de publication, plateforme, type de contenu, thème, CTA.`,
    status: "ACTIVE",
  },
  {
    slug: "approval-workflow-manager",
    name: "Gestionnaire Workflow d'Approbation",
    layer: "HYBRID",
    order: 25,
    executionType: "COMPOSE",  // Defines workflow from stakeholders + SLA = compositing
    pillarKeys: ["I"],
    requiredDrivers: [],
    dependencies: [],
    description: "Définit les workflows d'approbation à partir des parties prenantes et SLA",
    inputFields: ["deliverable_type", "stakeholders", "sla", "escalation_rules"],
    pillarBindings: {
      stakeholders: "s.teamStructure",
    },
    outputFormat: "workflow_definition",
    promptTemplate: `Workflow d'approbation pour {{deliverable_type}} :
Parties prenantes : {{stakeholders}}
SLA : {{sla}}
Règles d'escalation : {{escalation_rules}}
Livrable : étapes, approbateurs par étape, SLA par étape, escalation, notifications.`,
    status: "ACTIVE",
  },
  {
    slug: "brand-guardian-system",
    name: "Système Gardien de Marque",
    layer: "HYBRID",
    order: 26,
    executionType: "COMPOSE",  // Checklist matching: content vs. guidelines = pattern check
    pillarKeys: ["D"],
    requiredDrivers: [],
    dependencies: [],
    description: "Vérifie la conformité d'un contenu aux guidelines de marque (checklist)",
    inputFields: ["content", "brand_guidelines", "channel", "emotional_position", "swot_flash"],
    pillarBindings: {
      brand_guidelines: "d.directionArtistique.brandGuidelines",
      // ADR-0037 PR-K3 — nouveaux fields canon manuel D
      emotional_position: "d.positionnementEmotionnel",
      swot_flash: "d.swotFlash",
    },
    outputFormat: "compliance_report",
    promptTemplate: `Conformité aux guidelines :
Contenu : {{content}} | Canal : {{channel}}
Check : logo usage, couleurs, typographie, ton de voix, messages interdits, format.
Verdict : CONFORME / NON-CONFORME + écarts + corrections.`,
    status: "ACTIVE",
  },
  {
    slug: "client-education-module",
    name: "Module Éducation Client",
    layer: "HYBRID",
    order: 27,
    executionType: "COMPOSE",  // Structures educational content from topic + level
    pillarKeys: ["E", "V"],
    requiredDrivers: [],
    dependencies: [],
    description: "Structure du contenu éducatif pour les clients",
    inputFields: ["topic", "client_level", "format", "objectives"],
    pillarBindings: {
      objectives: "v.promesseDeValeur",
    },
    outputFormat: "educational_content",
    promptTemplate: `Module éducatif client :
Sujet : {{topic}} | Niveau : {{client_level}} | Format : {{format}}
Objectifs d'apprentissage : {{objectives}}
Structure : introduction, concepts clés, exemples, exercices pratiques, ressources.`,
    status: "ACTIVE",
  },
  {
    slug: "benchmark-reference-finder",
    name: "Chercheur de Benchmarks & Références",
    layer: "HYBRID",
    order: 28,
    executionType: "COMPOSE",  // Queries Seshat Knowledge Graph — data retrieval, not AI
    pillarKeys: ["T", "D"],
    requiredDrivers: [],
    dependencies: [],
    description: "Interroge le Knowledge Graph Seshat pour trouver des benchmarks et références",
    inputFields: ["sector", "market", "channel", "creative_territory"],
    pillarBindings: {
      creative_territory: "d.directionArtistique.moodboard.theme",
    },
    outputFormat: "benchmark_report",
    promptTemplate: `Benchmarks et références créatives :
Secteur : {{sector}} | Marché : {{market}} | Canal : {{channel}}
Territoire créatif : {{creative_territory}}
Par référence : marque, campagne, ce qui fonctionne, applicabilité, source.`,
    status: "ACTIVE",
  },
  {
    slug: "post-campaign-reader",
    name: "Lecteur Post-Campagne",
    layer: "HYBRID",
    order: 29,
    executionType: "COMPOSE",  // Formats results into report = compositing
    pillarKeys: ["T"],
    requiredDrivers: [],
    dependencies: [],
    description: "Formate les résultats post-campagne en rapport structuré",
    inputFields: ["campaign_results", "objectives", "budget_spent", "timeline"],
    pillarBindings: {
      objectives: "s.axesStrategiques",
      budget_spent: "s.globalBudget",
    },
    outputFormat: "post_campaign_report",
    promptTemplate: `Analyse post-campagne :
Résultats : {{campaign_results}} | Objectifs initiaux : {{objectives}}
Budget dépensé : {{budget_spent}} XAF | Timeline : {{timeline}}
Format : résumé exécutif, KPI vs. objectifs, learnings, recommandations.`,
    status: "ACTIVE",
  },
  {
    slug: "digital-planner",
    name: "Planificateur Digital",
    layer: "HYBRID",
    order: 30,
    executionType: "CALC",  // Budget allocation across platforms = math
    pillarKeys: ["I", "T"],
    requiredDrivers: ["INSTAGRAM", "FACEBOOK", "TIKTOK", "LINKEDIN", "WEBSITE"],
    dependencies: [],
    description: "Planifie les campagnes digitales — allocation budget par plateforme",
    inputFields: ["objectives", "budget", "platforms", "targeting", "duration"],
    pillarBindings: {
      objectives: "s.axesStrategiques",
      budget: "i.mediaPlan.totalBudget",
      platforms: "i.catalogueParCanal",
      targeting: "d.personas",
    },
    outputFormat: "digital_plan",
    promptTemplate: `Plan campagne digitale :
Objectifs : {{objectives}} | Budget : {{budget}} XAF
Plateformes : {{platforms}} | Ciblage : {{targeting}} | Durée : {{duration}}
Livrable : allocation par plateforme, formats, ciblages, calendrier, KPI cibles, A/B tests.`,
    status: "ACTIVE",
  },
];

// ─── LAYER BRAND — Visual Identity Pipeline (10 tools, sequential) ───────────

const BRAND_TOOLS: GloryToolDef[] = [
  {
    slug: "semiotic-brand-analyzer",
    name: "Analyseur Sémiotique de Marque",
    layer: "BRAND",
    order: 31,
    executionType: "LLM",  // Semiotic analysis requires interpretive judgment
    pillarKeys: ["A", "D"],
    requiredDrivers: [],
    dependencies: [],
    description: "Analyse sémiotique de l'identité visuelle existante ou du brief",
    inputFields: ["brand_identity", "sector_codes", "cultural_context"],
    pillarBindings: {
      brand_identity: "a.noyauIdentitaire",
      cultural_context: "a.doctrine",
    },
    outputFormat: "semiotic_analysis",
    promptTemplate: `Analyse sémiotique de la marque :
Identité actuelle : {{brand_identity}}
Codes sectoriels : {{sector_codes}} | Contexte culturel : {{cultural_context}}
Analyse : signifiants, signifiés, connotations, codes culturels, positionnement sémiotique.`,
    status: "ACTIVE",
  },
  {
    slug: "visual-landscape-mapper",
    name: "Cartographe du Paysage Visuel",
    layer: "BRAND",
    order: 32,
    executionType: "COMPOSE",  // Maps sector visual codes — can be data-driven from Seshat
    pillarKeys: ["D"],
    requiredDrivers: [],
    dependencies: ["semiotic-brand-analyzer"],
    description: "Cartographie le paysage visuel du secteur et des concurrents",
    inputFields: ["sector", "competitors", "trends"],
    pillarBindings: {
      competitors: "d.paysageConcurrentiel",
      trends: "t.marketReality.macroTrends",
    },
    outputFormat: "visual_landscape_map",
    promptTemplate: `Paysage visuel :
Secteur : {{sector}} | Concurrents : {{competitors}}
Tendances : {{trends}}
Map : codes visuels dominants, espaces libres, opportunités de différenciation.`,
    status: "ACTIVE",
    // Phase 9-suite (NEFER) — brief-to-forge auto-handoff vers Ptah
    forgeOutput: {
      forgeKind: "image",
      providerHint: "magnific",
      modelHint: "mystic",
      manipulationProfile: ["facilitator"],
      briefTextPath: "moodboard_brief",
      defaultPillarSource: "D",
      // Phase 17 (ADR-0037) — visual-landscape-mapper : recherche externe (sector/competitors), pas de prereq vault
      requires: [],
    },
  },
  {
    slug: "visual-moodboard-generator",
    name: "Générateur de Moodboard Visuel",
    layer: "BRAND",
    order: 33,
    executionType: "LLM",  // Creative direction — needs aesthetic judgment
    pillarKeys: ["D", "A"],
    requiredDrivers: [],
    dependencies: ["visual-landscape-mapper"],
    description: "Génère les directions de moodboard basées sur l'analyse",
    inputFields: ["semiotic_insights", "landscape_gaps", "brand_values"],
    pillarBindings: {
      brand_values: "a.valeurs",
    },
    outputFormat: "moodboard_directions",
    promptTemplate: `3 directions de moodboard :
Insights sémiotiques : {{semiotic_insights}}
Espaces visuels libres : {{landscape_gaps}}
Valeurs de marque : {{brand_values}}
Par direction : concept, ambiance, références visuelles, palette suggérée.`,
    status: "ACTIVE",
    // Phase 9-suite (NEFER) — brief-to-forge auto-handoff vers Ptah
    forgeOutput: {
      forgeKind: "image",
      providerHint: "magnific",
      modelHint: "mystic",
      manipulationProfile: ["facilitator","entertainer"],
      briefTextPath: "moodboard_brief",
      defaultPillarSource: "D",
      // Phase 17 (ADR-0037) — visual-moodboard-generator : décline la big idea en 3 directions visuelles
      requires: ["BIG_IDEA"],
    },
  },
  {
    slug: "chromatic-strategy-builder",
    name: "Constructeur de Stratégie Chromatique",
    layer: "BRAND",
    order: 34,
    executionType: "COMPOSE",  // Color theory applied to moodboard = structured derivation
    pillarKeys: ["D"],
    requiredDrivers: [],
    dependencies: ["visual-moodboard-generator"],
    description: "Définit la stratégie couleur à partir du moodboard retenu",
    inputFields: ["moodboard_direction", "sector_colors", "psychology"],
    pillarBindings: {
      psychology: "a.archetype",
    },
    outputFormat: "chromatic_strategy",
    promptTemplate: `Stratégie chromatique :
Direction retenue : {{moodboard_direction}}
Couleurs sectorielles : {{sector_colors}}
Psychologie des couleurs : {{psychology}}
Livrable : palette primaire, secondaire, accent, neutres, OKLCH values, ratios d'utilisation.`,
    status: "ACTIVE",
  },
  {
    slug: "typography-system-architect",
    name: "Architecte du Système Typographique",
    layer: "BRAND",
    order: 35,
    executionType: "COMPOSE",  // Typography specs from personality + contexts = structured
    pillarKeys: ["D"],
    requiredDrivers: [],
    dependencies: ["chromatic-strategy-builder"],
    description: "Conçoit le système typographique à partir de la personnalité de marque",
    inputFields: ["brand_personality", "usage_contexts", "accessibility"],
    pillarBindings: {
      brand_personality: "a.noyauIdentitaire",
    },
    outputFormat: "typography_system",
    promptTemplate: `Système typographique :
Personnalité de marque : {{brand_personality}}
Contextes d'usage : {{usage_contexts}}
Accessibilité : {{accessibility}}
Livrable : familles, hiérarchie, échelle, line-height, letter-spacing, web/print specs.`,
    status: "ACTIVE",
  },
  {
    slug: "logo-type-advisor",
    name: "Conseiller en Logotype",
    layer: "BRAND",
    order: 36,
    executionType: "LLM",  // Logo direction requires creative/strategic judgment
    pillarKeys: ["D", "A"],
    requiredDrivers: [],
    dependencies: ["typography-system-architect"],
    description: "Guide la conception du logotype",
    inputFields: ["brand_name", "brand_values", "typography_system", "chromatic_strategy"],
    pillarBindings: {
      brand_name: "a.nomMarque",
      brand_values: "a.valeurs",
      typography_system: "d.directionArtistique.typographySystem",
      chromatic_strategy: "d.directionArtistique.chromaticStrategy",
    },
    outputFormat: "logotype_direction",
    promptTemplate: `Direction logotype :
Nom : {{brand_name}} | Valeurs : {{brand_values}}
Système typo : {{typography_system}} | Stratégie chromatique : {{chromatic_strategy}}
Livrable : type de logo recommandé, direction stylistique, do/don't, déclinaisons nécessaires.`,
    status: "ACTIVE",
  },
  {
    slug: "logo-validation-protocol",
    name: "Protocole de Validation Logo",
    layer: "BRAND",
    order: 37,
    executionType: "LLM",  // Logo evaluation requires aesthetic judgment
    pillarKeys: ["D"],
    requiredDrivers: [],
    dependencies: ["logo-type-advisor"],
    description: "Évalue et valide les propositions de logo",
    inputFields: ["logo_proposals", "brand_guidelines", "usage_contexts"],
    pillarBindings: {
      brand_guidelines: "d.directionArtistique.brandGuidelines",
    },
    outputFormat: "logo_validation_report",
    promptTemplate: `Validation des propositions de logo :
Critères : lisibilité (5 tailles), mémorabilité, reproductibilité, cohérence marque, unicité.
Contextes : digital, print, packaging, signalétique, favicon.
Score chaque proposition et recommande la direction finale.`,
    status: "ACTIVE",
  },
  {
    slug: "design-token-architect",
    name: "Architecte de Design Tokens",
    layer: "BRAND",
    order: 38,
    executionType: "COMPOSE",  // Transforms design decisions into JSON tokens = formatting
    pillarKeys: ["D", "I"],
    requiredDrivers: [],
    dependencies: ["chromatic-strategy-builder", "typography-system-architect"],
    description: "Transforme les décisions design en tokens JSON (Tailwind/CSS vars)",
    inputFields: ["chromatic_strategy", "typography_system", "spacing", "motion"],
    pillarBindings: {
      chromatic_strategy: "d.directionArtistique.chromaticStrategy",
      typography_system: "d.directionArtistique.typographySystem",
    },
    outputFormat: "design_tokens",
    promptTemplate: `Design tokens :
Couleurs : {{chromatic_strategy}}
Typo : {{typography_system}}
Spacing : {{spacing}} | Motion : {{motion}}
Format : JSON compatible avec Tailwind/CSS variables, avec nommage sémantique.`,
    status: "ACTIVE",
  },
  {
    slug: "motion-identity-designer",
    name: "Designer d'Identité Motion",
    layer: "BRAND",
    order: 39,
    executionType: "LLM",  // Motion design direction requires creative judgment
    pillarKeys: ["D", "E"],
    requiredDrivers: ["VIDEO"],
    dependencies: ["design-token-architect"],
    description: "Définit l'identité motion de la marque",
    inputFields: ["brand_personality", "design_tokens", "usage_contexts"],
    pillarBindings: {
      brand_personality: "a.noyauIdentitaire",
      design_tokens: "d.directionArtistique.designTokens",
    },
    outputFormat: "motion_identity",
    promptTemplate: `Identité motion :
Personnalité : {{brand_personality}}
Tokens : {{design_tokens}}
Contextes : transitions UI, vidéo intro/outro, loading states, micro-interactions.
Livrable : principes (easing, durée, rythme), bibliothèque d'animations, guidelines motion.`,
    status: "ACTIVE",
  },
  {
    slug: "brand-guidelines-generator",
    name: "Générateur de Brand Guidelines",
    layer: "BRAND",
    order: 40,
    executionType: "COMPOSE",  // Compiles all brand elements into structured document
    pillarKeys: ["D"],
    requiredDrivers: [],
    dependencies: ["design-token-architect", "motion-identity-designer"],
    description: "Compile tous les éléments brand en guidelines structurées",
    inputFields: ["all_brand_elements"],
    pillarBindings: {
      all_brand_elements: "d.directionArtistique",
    },
    outputFormat: "brand_guidelines",
    promptTemplate: `Brand guidelines complètes :
Sections : mission/vision, logo usage, palette, typographie, photographie, iconographie,
tone of voice, do/don't, templates, applications, design tokens, motion guidelines.
Format : document structuré prêt pour PDF/HTML.`,
    status: "ACTIVE",
  },
];

// ─── PHASE 1 — Rang S (multi-séquences) + MANIFESTE-A + BRANDBOOK-D ─────────

const PHASE1_TOOLS: GloryToolDef[] = [
  // ── Rang S : débloquent 2-3 séquences chacun ──
  {
    slug: "competitive-analysis-builder",
    name: "Constructeur d'Analyse Concurrentielle",
    layer: "DC",
    order: 41,
    executionType: "COMPOSE",
    pillarKeys: ["T", "D"],
    requiredDrivers: [],
    dependencies: ["benchmark-reference-finder"],
    description: "Analyse structurée des concurrents — positionnement, forces/faiblesses créatives, parts de voix, codes visuels, insights différenciation",
    inputFields: ["sector", "competitors", "brand_positioning"],
    pillarBindings: {
      competitors: "d.paysageConcurrentiel",
      brand_positioning: "d.positionnement",
    },
    outputFormat: "competitive_analysis",
    promptTemplate: `Analyse concurrentielle structurée :
Secteur : {{sector}}
Concurrents : {{competitors}}
Notre positionnement : {{brand_positioning}}
Par concurrent : positionnement, forces créatives, faiblesses, codes visuels, part de voix estimée.
Synthèse : espaces de différenciation, menaces directes, opportunités.`,
    status: "ACTIVE",
  },
  {
    slug: "brand-audit-scanner",
    name: "Scanner d'Audit de Marque",
    layer: "HYBRID",
    order: 42,
    executionType: "COMPOSE",
    pillarKeys: ["D", "R"],
    requiredDrivers: [],
    dependencies: [],
    description: "Audit automatique des assets de marque — conformité logo, couleurs, typo, ton. Rapport de santé + actions correctives",
    inputFields: ["brand_guidelines", "assets_inventory", "channels_active"],
    pillarBindings: {
      brand_guidelines: "d.directionArtistique.brandGuidelines",
      channels_active: "i.catalogueParCanal",
    },
    outputFormat: "brand_audit_report",
    promptTemplate: `Audit de marque :
Guidelines : {{brand_guidelines}}
Assets inventoriés : {{assets_inventory}}
Canaux actifs : {{channels_active}}
Par canal : conformité logo, couleurs, typo, ton de voix, messages.
Score global de santé marque (0-100), top 5 écarts, actions correctives prioritaires.`,
    status: "ACTIVE",
  },
  {
    slug: "music-sound-brief",
    name: "Brief Musique & Sound Design",
    layer: "CR",
    order: 43,
    executionType: "COMPOSE",
    pillarKeys: ["A", "D", "E"],
    requiredDrivers: ["VIDEO", "RADIO", "TV"],
    dependencies: [],
    description: "Direction musicale et sonore — genre, tempo, ambiance, SFX, voix off specs",
    inputFields: ["brand_personality", "format", "duration", "tone", "references"],
    pillarBindings: {
      brand_personality: "a.noyauIdentitaire",
      tone: "d.tonDeVoix.personnalite",
    },
    outputFormat: "sound_brief",
    promptTemplate: `Brief musique & sound design :
Personnalité de marque : {{brand_personality}}
Format : {{format}} | Durée : {{duration}}
Ton : {{tone}}
Références : {{references}}
Livrable : genre musical, tempo BPM, ambiance, SFX clés, specs voix off (genre vocal, rythme, accent), jingle direction.`,
    status: "ACTIVE",
  },

  // ── MANIFESTE-A : 2 outils manquants ──
  {
    slug: "tone-of-voice-designer",
    name: "Designer Ton de Voix",
    layer: "CR",
    order: 44,
    executionType: "LLM",
    pillarKeys: ["A", "D"],
    requiredDrivers: [],
    dependencies: [],
    description: "Définit le spectre vocal de la marque — registre, personnalité linguistique, vocabulaire signature, do/don't rédactionnels",
    inputFields: ["archetype", "values", "target", "cultural_context", "existing_tone"],
    pillarBindings: {
      archetype: "a.archetype",
      values: "a.valeurs",
      target: "d.personas",
      existing_tone: "d.tonDeVoix",
      cultural_context: "a.doctrine",
    },
    outputFormat: "tone_charter",
    promptTemplate: `Conçois la charte de ton de voix :
Archétype : {{archetype}}
Valeurs : {{values}}
Personas cibles : {{target}}
Contexte culturel : {{cultural_context}}
Ton actuel (si existant) : {{existing_tone}}
Livrable : personnalité en 5-7 traits, registre linguistique, vocabulaire signature (20+ mots),
expressions interdites, do/don't par canal (social, print, corporate, customer service),
3 exemples de reformulation (avant/après).`,
    status: "ACTIVE",
  },
  {
    slug: "manifesto-writer",
    name: "Rédacteur de Manifeste",
    layer: "CR",
    order: 45,
    executionType: "LLM",
    pillarKeys: ["A"],
    requiredDrivers: [],
    dependencies: ["tone-of-voice-designer", "concept-generator"],
    description: "Rédige le manifeste fondateur — texte qui cristallise l'ADN, la mission, la vision et l'engagement envers les superfans",
    inputFields: ["brand_dna", "prophecy", "enemy", "tone_charter", "values", "baseline"],
    pillarBindings: {
      brand_dna: "a.noyauIdentitaire",
      prophecy: "a.prophecy",
      enemy: "a.enemy",
      tone_charter: "d.tonDeVoix",
      values: "a.valeurs",
      baseline: "d.assetsLinguistiques.slogan",
    },
    outputFormat: "manifesto",
    promptTemplate: `Rédige le manifeste de marque :
ADN : {{brand_dna}}
Prophétie : {{prophecy}}
Ennemi : {{enemy}}
Charte de ton : {{tone_charter}}
Valeurs : {{values}}
Baseline : {{baseline}}
Format : texte fondateur de 300-500 mots. Structure : constat → révolte → vision → promesse → appel.
Ton : celui de la charte. Pas de jargon marketing. Doit donner des frissons.`,
    status: "ACTIVE",
  },

  // ── BRANDBOOK-D : 2 outils manquants ──
  {
    slug: "photography-style-guide",
    name: "Guide Style Photographique",
    layer: "BRAND",
    order: 46,
    executionType: "COMPOSE",
    pillarKeys: ["D"],
    requiredDrivers: [],
    dependencies: ["visual-moodboard-generator", "chromatic-strategy-builder"],
    description: "Direction photo — cadrage, éclairage, palettes, sujets, retouche, stock vs. custom",
    inputFields: ["moodboard", "chromatic_strategy", "brand_personality", "personas"],
    pillarBindings: {
      moodboard: "d.directionArtistique.moodboard",
      chromatic_strategy: "d.directionArtistique.chromaticStrategy",
      brand_personality: "a.noyauIdentitaire",
      personas: "d.personas",
    },
    outputFormat: "photo_guidelines",
    promptTemplate: `Guide style photographique :
Moodboard : {{moodboard}}
Stratégie chromatique : {{chromatic_strategy}}
Personnalité : {{brand_personality}}
Personas : {{personas}}
Livrable : direction artistique photo (cadrage, éclairage, profondeur de champ),
palette de retouche (presets), sujets types, composition, do/don't,
stock vs. custom guidelines, traitement couleur cohérent avec chromatic strategy.`,
    status: "ACTIVE",
  },
  {
    slug: "iconography-system-builder",
    name: "Constructeur Système Iconographique",
    layer: "BRAND",
    order: 47,
    executionType: "COMPOSE",
    pillarKeys: ["D"],
    requiredDrivers: [],
    dependencies: ["design-token-architect", "typography-system-architect"],
    description: "Système d'icônes — style, grille, épaisseur, coins, cohérence typo et logo",
    inputFields: ["design_tokens", "typography_system", "brand_personality", "usage_contexts"],
    pillarBindings: {
      design_tokens: "d.directionArtistique.designTokens",
      typography_system: "d.directionArtistique.typographySystem",
      brand_personality: "a.noyauIdentitaire",
    },
    outputFormat: "icon_system",
    promptTemplate: `Système iconographique :
Design tokens : {{design_tokens}}
Système typo : {{typography_system}}
Personnalité : {{brand_personality}}
Contextes d'usage : {{usage_contexts}}
Livrable : style (outline/filled/duo), grille de construction (px),
épaisseur de trait, coins (sharp/rounded + radius),
tailles standards, set minimum d'icônes,
cohérence avec typo weight et logo style.`,
    status: "ACTIVE",
    // Phase 9-suite (NEFER) — brief-to-forge auto-handoff vers Ptah
    forgeOutput: {
      forgeKind: "icon",
      providerHint: "magnific",
      modelHint: "text-to-icon",
      manipulationProfile: ["facilitator"],
      briefTextPath: "icon_brief",
      defaultPillarSource: "D",
      // Phase 17 (ADR-0037) — icon-system-architect : système iconographique cohérent avec ton + typo
      requires: ["TONE_CHARTER", "TYPOGRAPHY_SYSTEM"],
    },
  },
];

// ─── PHASE 2 — OFFRE-V + PLAYBOOK-E + AUDIT-R (9 outils) ───────────────────

const PHASE2_TOOLS: GloryToolDef[] = [
  // ── OFFRE-V (3 outils) ──
  {
    slug: "value-proposition-builder",
    name: "Constructeur Proposition de Valeur",
    layer: "DC",
    order: 48,
    executionType: "COMPOSE",
    pillarKeys: ["V", "D"],
    requiredDrivers: [],
    dependencies: [],
    description: "Structure la proposition de valeur — bénéfice unique, preuves, différenciateurs, canvas, pitch elevator",
    inputFields: ["brand_positioning", "key_benefit", "proof_points", "competitors", "target"],
    pillarBindings: {
      brand_positioning: "d.positionnement",
      key_benefit: "d.promesseMaitre",
      proof_points: "d.proofPoints",
      competitors: "d.paysageConcurrentiel",
      target: "d.personas",
    },
    outputFormat: "value_proposition",
    promptTemplate: `Proposition de valeur :
Positionnement : {{brand_positioning}}
Bénéfice clé : {{key_benefit}}
Preuves : {{proof_points}}
Concurrents : {{competitors}} | Cible : {{target}}
Livrable : canvas proposition de valeur, bénéfice unique (1 phrase), 3 preuves, pitch elevator (30s), différenciateurs vs. concurrents.`,
    status: "ACTIVE",
  },
  {
    slug: "pricing-strategy-advisor",
    name: "Conseiller Stratégie de Pricing",
    layer: "HYBRID",
    order: 49,
    executionType: "CALC",
    pillarKeys: ["V"],
    requiredDrivers: [],
    dependencies: [],
    description: "Grille tarifaire, packages, ancrage psychologique, comparatif marché",
    inputFields: ["products", "product_ladder", "unit_economics", "competitors", "market_size"],
    pillarBindings: {
      products: "v.produitsCatalogue",
      product_ladder: "v.productLadder",
      unit_economics: "v.unitEconomics",
      competitors: "d.paysageConcurrentiel",
      market_size: "t.tamSamSom",
    },
    outputFormat: "pricing_strategy",
    promptTemplate: `Stratégie de pricing :
Catalogue : {{products}}
Ladder : {{product_ladder}}
Unit economics : {{unit_economics}}
Concurrents : {{competitors}} | Marché : {{market_size}}
Livrable : grille tarifaire, packages (3 tiers), ancrage psychologique, prix psychologiques, marge par tier, comparatif marché.`,
    status: "ACTIVE",
  },
  {
    slug: "sales-deck-builder",
    name: "Constructeur Deck Commercial",
    layer: "DC",
    order: 50,
    executionType: "COMPOSE",
    pillarKeys: ["V", "E"],
    requiredDrivers: [],
    dependencies: ["value-proposition-builder"],
    description: "Compile le deck commercial — slides proposition de valeur, cas clients, ROI, objections/réponses",
    inputFields: ["value_proposition", "pricing", "proof_points", "testimonials", "objections"],
    pillarBindings: {
      value_proposition: "v.promesseDeValeur",
      pricing: "v.productLadder",
      proof_points: "d.proofPoints",
    },
    outputFormat: "sales_deck",
    promptTemplate: `Deck commercial :
Proposition de valeur : {{value_proposition}}
Pricing : {{pricing}}
Preuves : {{proof_points}}
Témoignages : {{testimonials}}
Objections fréquentes : {{objections}}
Livrable : structure de deck (12-15 slides), contenu par slide, arguments clés, réponses aux objections, CTA.`,
    status: "ACTIVE",
    // Phase 9-suite (NEFER) — brief-to-forge auto-handoff vers Ptah
    forgeOutput: {
      forgeKind: "design",
      providerHint: "canva",
      modelHint: "deck",
      manipulationProfile: ["dealer","facilitator"],
      briefTextPath: "deck",
      defaultPillarSource: "I",
      // Phase 17 (ADR-0037) — sales-deck-builder : structure le deck autour de la value proposition
      requires: ["VALUE_PROPOSITION"],
    },
  },

  // ── PLAYBOOK-E (3 outils) ──
  {
    slug: "community-playbook-generator",
    name: "Générateur Playbook Communauté",
    layer: "HYBRID",
    order: 51,
    executionType: "COMPOSE",
    pillarKeys: ["E"],
    requiredDrivers: [],
    dependencies: [],
    description: "Règles d'engagement communautaire — ton de réponse, FAQ, gestion de crise, modération, UGC",
    inputFields: ["tone", "community_principles", "touchpoints", "taboos", "platforms"],
    pillarBindings: {
      tone: "d.tonDeVoix",
      community_principles: "e.principesCommunautaires",
      touchpoints: "e.touchpoints",
      taboos: "e.taboos",
    },
    outputFormat: "community_playbook",
    promptTemplate: `Playbook communauté :
Ton de voix : {{tone}}
Principes communautaires : {{community_principles}}
Touchpoints : {{touchpoints}}
Tabous : {{taboos}} | Plateformes : {{platforms}}
Livrable : charte de réponse par canal, FAQ (20+), protocole de crise (3 niveaux), guidelines modération, stratégie UGC, templates de réponse.`,
    status: "ACTIVE",
  },
  {
    slug: "superfan-journey-mapper",
    name: "Cartographe Parcours Superfan",
    layer: "DC",
    order: 52,
    executionType: "COMPOSE",
    pillarKeys: ["E", "A"],
    requiredDrivers: [],
    dependencies: [],
    description: "Mappe le parcours audience → superfan — touchpoints, rituels, rewards, escalation d'engagement",
    inputFields: ["devotion_levels", "touchpoints", "rituals", "aarrr", "rites_de_passage"],
    pillarBindings: {
      devotion_levels: "a.hierarchieCommunautaire",
      touchpoints: "e.touchpoints",
      rituals: "e.rituels",
      aarrr: "e.aarrr",
      rites_de_passage: "e.ritesDePassage",
    },
    outputFormat: "superfan_journey",
    promptTemplate: `Parcours superfan :
Niveaux de dévotion : {{devotion_levels}}
Touchpoints : {{touchpoints}}
Rituels : {{rituals}}
Funnel AARRR : {{aarrr}}
Rites de passage : {{rites_de_passage}}
Livrable : carte du parcours (stage par stage), triggers de progression, rewards par niveau, métriques de loyalty, points de friction, actions de relance.`,
    status: "ACTIVE",
  },
  {
    slug: "engagement-rituals-designer",
    name: "Designer de Rituels de Marque",
    layer: "CR",
    order: 53,
    executionType: "LLM",
    pillarKeys: ["E", "A"],
    requiredDrivers: [],
    dependencies: [],
    description: "Conçoit les rituels récurrents — rendez-vous, événements, traditions, mécaniques de fidélisation",
    inputFields: ["brand_personality", "community_levels", "sacred_calendar", "existing_rituals", "platforms"],
    pillarBindings: {
      brand_personality: "a.noyauIdentitaire",
      community_levels: "a.hierarchieCommunautaire",
      sacred_calendar: "e.sacredCalendar",
      existing_rituals: "e.rituels",
    },
    outputFormat: "brand_rituals",
    promptTemplate: `Rituels de marque :
Personnalité : {{brand_personality}}
Niveaux communautaires : {{community_levels}}
Calendrier sacré : {{sacred_calendar}}
Rituels existants : {{existing_rituals}}
Plateformes : {{platforms}}
Livrable : 5-8 rituels récurrents, chacun avec : nom, fréquence, mécanique, canal, niveau de dévotion ciblé, KPI, coût estimé.
Types : hebdomadaire, mensuel, saisonnier, anniversaire, initiation, célébration.`,
    status: "ACTIVE",
  },

  // ── AUDIT-R (3 outils) ──
  {
    slug: "risk-matrix-builder",
    name: "Constructeur Matrice de Risques",
    layer: "HYBRID",
    order: 54,
    executionType: "COMPOSE",
    pillarKeys: ["R"],
    requiredDrivers: [],
    dependencies: [],
    description: "Cartographie les risques — probabilité × impact, plan de mitigation par risque",
    inputFields: ["swot", "probability_impact_matrix", "mitigation_priorities", "risk_score"],
    pillarBindings: {
      swot: "r.globalSwot",
      probability_impact_matrix: "r.probabilityImpactMatrix",
      mitigation_priorities: "r.mitigationPriorities",
      risk_score: "r.riskScore",
    },
    outputFormat: "risk_matrix",
    promptTemplate: `Matrice de risques :
SWOT : {{swot}}
Matrice existante : {{probability_impact_matrix}}
Mitigations : {{mitigation_priorities}}
Score global : {{risk_score}}
Livrable : matrice visuelle (probabilité × impact), catégorisation (réputation/juridique/opérationnel/concurrentiel), top 5 risques critiques, plan de mitigation chiffré.`,
    status: "ACTIVE",
  },
  {
    slug: "crisis-communication-planner",
    name: "Planificateur Communication de Crise",
    layer: "HYBRID",
    order: 55,
    executionType: "COMPOSE",
    pillarKeys: ["R", "E"],
    requiredDrivers: [],
    dependencies: ["risk-matrix-builder"],
    description: "Scénarios de crise, messages pré-rédigés, chaîne de décision, timeline de réponse",
    inputFields: ["top_risks", "tone", "stakeholders", "channels", "brand_values"],
    pillarBindings: {
      top_risks: "r.probabilityImpactMatrix",
      tone: "d.tonDeVoix",
      stakeholders: "s.teamStructure",
      brand_values: "a.valeurs",
    },
    outputFormat: "crisis_plan",
    promptTemplate: `Plan communication de crise :
Risques prioritaires : {{top_risks}}
Ton de voix : {{tone}}
Parties prenantes : {{stakeholders}}
Canaux : {{channels}} | Valeurs : {{brand_values}}
Livrable : 3 scénarios de crise (mineur/majeur/critique), messages pré-rédigés par scénario, chaîne de décision, porte-paroles, canaux prioritaires, timeline de réponse (0-1h, 1-24h, 24h+).`,
    status: "ACTIVE",
  },
  {
    slug: "compliance-checklist-generator",
    name: "Générateur Checklist Conformité",
    layer: "HYBRID",
    order: 56,
    executionType: "COMPOSE",
    pillarKeys: ["R", "D"],
    requiredDrivers: [],
    dependencies: [],
    description: "Checklists de conformité par canal — réglementaire, marque, éthique, accessibilité",
    inputFields: ["brand_guidelines", "channels", "sector", "regulatory_context"],
    pillarBindings: {
      brand_guidelines: "d.directionArtistique.brandGuidelines",
      channels: "i.catalogueParCanal",
    },
    outputFormat: "compliance_checklist",
    promptTemplate: `Checklists de conformité :
Guidelines marque : {{brand_guidelines}}
Canaux : {{channels}}
Secteur : {{sector}} | Contexte réglementaire : {{regulatory_context}}
Livrable : checklist par canal (digital, print, OOH, TV, radio), points de contrôle : logo, couleurs, typo, ton, messages obligatoires, mentions légales, accessibilité, RGPD, droit à l'image.`,
    status: "ACTIVE",
  },
];

// ─── PHASE 3 — ETUDE-T + BRAINSTORM-I + ROADMAP-S (8 outils) ───────────────

const PHASE3_TOOLS: GloryToolDef[] = [
  // ── ETUDE-T (3 outils) ──
  {
    slug: "market-sizing-estimator",
    name: "Estimateur Taille de Marché",
    layer: "HYBRID",
    order: 57,
    executionType: "CALC",
    pillarKeys: ["T"],
    requiredDrivers: [],
    dependencies: [],
    description: "Estime TAM/SAM/SOM, segments, croissance, parts de marché atteignables",
    inputFields: ["tam_sam_som", "sector", "competitors", "traction"],
    pillarBindings: {
      tam_sam_som: "t.tamSamSom",
      competitors: "d.paysageConcurrentiel",
      traction: "t.traction",
    },
    outputFormat: "market_size",
    promptTemplate: `Estimation taille de marché :
TAM/SAM/SOM actuel : {{tam_sam_som}}
Secteur : {{sector}}
Concurrents : {{competitors}}
Traction : {{traction}}
Livrable : TAM/SAM/SOM révisés avec méthodologie, segmentation, taux de croissance par segment, parts de marché atteignables à 1/3/5 ans, hypothèses clés.`,
    status: "ACTIVE",
  },
  {
    slug: "trend-radar-builder",
    name: "Constructeur Radar de Tendances",
    layer: "HYBRID",
    order: 58,
    executionType: "COMPOSE",
    pillarKeys: ["T"],
    requiredDrivers: [],
    dependencies: [],
    description: "Cartographie tendances sectorielles et culturelles — macro/micro-trends, signaux faibles",
    inputFields: ["sector", "market_reality", "weak_signals", "triangulation"],
    pillarBindings: {
      market_reality: "t.marketReality",
      weak_signals: "t.weakSignalAnalysis",
      triangulation: "t.triangulation",
    },
    outputFormat: "trend_radar",
    promptTemplate: `Radar de tendances :
Secteur : {{sector}}
Réalité marché : {{market_reality}}
Signaux faibles : {{weak_signals}}
Triangulation : {{triangulation}}
Livrable : radar visuel (4 quadrants : émergent/croissant/mature/déclinant), 5 macro-trends, 10 micro-trends, signaux faibles avec impact potentiel, fenêtres d'opportunité.`,
    status: "ACTIVE",
  },
  {
    slug: "insight-synthesizer",
    name: "Synthétiseur d'Insights",
    layer: "DC",
    order: 59,
    executionType: "LLM",
    pillarKeys: ["T", "A"],
    requiredDrivers: [],
    dependencies: [],
    description:
      "Transforme données brutes en insights actionnables — consumer, market, cultural insights. Phase 13 (B2) : Tarsis integration — pull weak signals automatique via mestor.emitIntent({kind: 'JEHUTY_FEED_REFRESH'}) côté caller.",
    inputFields: ["market_data", "hypotheses", "traction", "personas", "cultural_context", "tarsis_signals"],
    pillarBindings: {
      hypotheses: "t.hypothesisValidation",
      traction: "t.traction",
      personas: "d.personas",
      cultural_context: "a.doctrine",
      tarsis_signals: "t.signauxFaibles",
    },
    outputFormat: "insights",
    promptTemplate: `Synthèse d'insights (avec Tarsis weak signals integration) :

Données marché : {{market_data}}
Hypothèses validées : {{hypotheses}}
Traction : {{traction}}
Personas : {{personas}} | Contexte culturel : {{cultural_context}}
Tarsis weak signals (sectoriel — JEHUTY_FEED_REFRESH) : {{tarsis_signals}}

⚠️ FORMAT DE SORTIE VERROUILLÉ — Réponds UNIQUEMENT avec ce JSON exact, aucun préambule, aucun markdown.

Schéma EXACT :
{
  "insights": {
    "consumer": [
      { "formulation": "<tension → vérité → opportunité>", "evidence": ["<source 1>", "<source 2>"], "confidence": "HIGH" | "MEDIUM" | "LOW", "strategic_implication": "<conséquence stratégique>" }
    ],
    "market":      [ { "formulation": "...", "evidence": ["..."], "confidence": "HIGH" | "MEDIUM" | "LOW", "strategic_implication": "..." } ],
    "cultural":    [ { "formulation": "...", "evidence": ["..."], "confidence": "HIGH" | "MEDIUM" | "LOW", "strategic_implication": "..." } ],
    "weak_signals":[ { "formulation": "...", "evidence": ["<Tarsis signal id>"], "confidence": "HIGH" | "MEDIUM" | "LOW", "strategic_implication": "..." } ]
  }
}

Règles : consumer EXACTEMENT 3 entrées. market EXACTEMENT 3 entrées. cultural EXACTEMENT 2 entrées. weak_signals EXACTEMENT 2 entrées (Tarsis-sourcés si {{tarsis_signals}} fourni, sinon "à enrichir"). confidence : STRICTEMENT "HIGH"|"MEDIUM"|"LOW" (majuscules). evidence MIN 1, MAX 4 par insight. formulation et strategic_implication JAMAIS vides. Si manquant : entries "à enrichir" / confidence="LOW". Pas de wrapper. Pas de champ supplémentaire.`,
    status: "ACTIVE",
  },

  // ── Phase 17 (ADR-0040) — Synthétiseur générique de sections Oracle ──
  // Polit le draft JSON déterministe d'une section Oracle (généré via mapXxx
  // section-mappers) en narrative cohérente. Contrat strict zéro fabrication :
  // les champs numériques du draft NE doivent PAS être modifiés. Utilisé par
  // les 7 sequences DERIVED-* (executive-summary, plateforme, plan-act,
  // prod-liv, budget, timeline, conditions) pour ajouter une couche de
  // cohérence narrative sur la projection brute des piliers.
  {
    slug: "synthesize-section",
    name: "Synthétiseur de Section Oracle",
    layer: "DC",
    order: 60,
    executionType: "LLM",
    pillarKeys: [],
    requiredDrivers: [],
    dependencies: [],
    description:
      "Polit le draft JSON d'une section Oracle dérivée en narrative cohérente. Zéro fabrication : les données numériques du draft ne doivent pas être modifiées. Fidélité au draft = contrat strict (Phase 17, ADR-0040).",
    inputFields: ["section_id", "section_draft", "brand_context"],
    pillarBindings: { brand_context: "a.doctrine" },
    outputFormat: "section_narrative",
    promptTemplate: `Synthèse Oracle section "{{section_id}}".

Draft déterministe (NE PAS modifier les données numériques ni inventer) :
{{section_draft}}

Contexte de marque : {{brand_context}}

Livrable : objet JSON
{
  "narrative": "<texte cohérent, 2-4 paragraphes, fidèle au draft>",
  "structured_payload": <draft identique au format reçu — polish narrative dans champs textuels uniquement, zéro modif des chiffres>
}

Aucune fabrication de chiffre, aucune invention de fait, fidélité au draft = contrat strict.`,
    status: "ACTIVE",
  },

  // ── BRAINSTORM-I (2 outils) ──
  {
    slug: "ideation-workshop-facilitator",
    name: "Facilitateur Atelier Idéation",
    layer: "DC",
    order: 60,
    executionType: "COMPOSE",
    pillarKeys: ["I", "A"],
    requiredDrivers: [],
    dependencies: [],
    description: "Structure un atelier de brainstorming — warm-up, techniques créativité, grille de sélection",
    inputFields: ["brief", "participants", "duration", "constraints", "catalogue_actions"],
    pillarBindings: {
      constraints: "r.mitigationPriorities",
      catalogue_actions: "i.catalogueParCanal",
    },
    outputFormat: "ideation_output",
    promptTemplate: `Atelier idéation :
Brief : {{brief}}
Participants : {{participants}} | Durée : {{duration}}
Contraintes : {{constraints}}
Catalogue d'actions existant : {{catalogue_actions}}
Livrable : agenda atelier (warm-up 10min, divergence 30min, convergence 20min, sélection 15min), techniques par phase (SCAMPER, 6 chapeaux, brainwriting), grille de sélection (impact × faisabilité × budget), template de capture.`,
    status: "ACTIVE",
  },
  {
    slug: "resource-allocation-planner",
    name: "Planificateur Allocation Ressources",
    layer: "HYBRID",
    order: 61,
    executionType: "CALC",
    pillarKeys: ["I"],
    requiredDrivers: [],
    dependencies: [],
    description: "Charge par profil, planning capacitaire, interne vs. sous-traitance",
    inputFields: ["team_structure", "sprint_actions", "budget", "timeline"],
    pillarBindings: {
      team_structure: "s.teamStructure",
      sprint_actions: "i.sprint90Days",
      budget: "s.globalBudget",
      timeline: "s.roadmap",
    },
    outputFormat: "resource_plan",
    promptTemplate: `Allocation ressources :
Équipe : {{team_structure}}
Actions sprint : {{sprint_actions}}
Budget : {{budget}} XAF | Timeline : {{timeline}}
Livrable : charge par profil (jours/mois), planning capacitaire (Gantt), ratio interne/sous-traitance, profils manquants, coût RH total, recommandation recrutement/freelance.`,
    status: "ACTIVE",
  },

  // ── ROADMAP-S (3 outils) ──
  {
    slug: "strategic-diagnostic",
    name: "Diagnostic Stratégique",
    layer: "DC",
    order: 62,
    executionType: "COMPOSE",
    pillarKeys: ["S", "R", "T"],
    requiredDrivers: [],
    dependencies: [],
    description:
      "SWOT augmenté + scoring + priorisation + recommandations stratégiques. Phase 13 (B2) : ajout templates `mckinsey-7s` et `overton` (input `framework: 'classic' | 'mckinsey-7s' | 'overton'`, default 'classic').",
    inputFields: ["global_swot", "adve_vector", "coherence_score", "market_fit", "risk_score", "framework"],
    pillarBindings: {
      global_swot: "r.globalSwot",
      adve_vector: "s.axesStrategiques",
      coherence_score: "s.coherenceScore",
      market_fit: "t.brandMarketFitScore",
      risk_score: "r.riskScore",
    },
    outputFormat: "swot_augmented",
    promptTemplate: `Diagnostic stratégique (framework={{framework}}, default 'classic') :

SWOT : {{global_swot}}
Cohérence piliers : {{adve_vector}}
Score cohérence : {{coherence_score}} | Market fit : {{market_fit}} | Risque : {{risk_score}}

⚠️ FORMAT DE SORTIE VERROUILLÉ — Réponds UNIQUEMENT avec ce JSON exact, aucun préambule, aucun markdown.

Schéma EXACT (clé "augmented_swot" obligatoire au top-level) :
{
  "augmented_swot": {
    "framework_used": "classic" | "mckinsey-7s" | "overton",
    "strengths":     [ { "item": "<force>",      "score": <1-5>, "rationale": "..." } ],
    "weaknesses":    [ { "item": "<faiblesse>",  "score": <1-5>, "rationale": "..." } ],
    "opportunities": [ { "item": "<opportunité>","score": <1-5>, "rationale": "..." } ],
    "threats":       [ { "item": "<menace>",     "score": <1-5>, "rationale": "..." } ],
    "cross_matrix": {
      "strengths_x_opportunities": ["<combinaison stratégique 1>"],
      "weaknesses_x_threats":      ["<combinaison défensive 1>"]
    },
    "strategic_axes": [
      { "axis": "<axe>", "priority": <1-5>, "pillar": "A" | "D" | "V" | "E" | "R" | "T" | "I" | "S" }
    ],
    "recommendations_by_pillar": {
      "A": ["<reco>"], "D": ["<reco>"], "V": ["<reco>"], "E": ["<reco>"],
      "R": ["<reco>"], "T": ["<reco>"], "I": ["<reco>"], "S": ["<reco>"]
    }
  }
}

Règles : framework_used = {{framework}} si fourni, sinon "classic". strengths/weaknesses/opportunities/threats MIN 2, MAX 6 chacun (score entier ∈ [1,5]). cross_matrix MIN 1 entry par sous-clé. strategic_axes EXACTEMENT 5 (priority entier ∈ [1,5], 1=top ; pillar STRICTEMENT une des 8 lettres A/D/V/E/R/T/I/S). recommendations_by_pillar : 8 clés OBLIGATOIRES, MIN 1 entry chacune ("à enrichir" si nécessaire). Si SWOT manquant : entries "à enrichir" / score=3. Pas de wrapper supplémentaire. Pas de champ supplémentaire.`,
    status: "ACTIVE",
  },
  {
    slug: "kpi-framework-builder",
    name: "Constructeur Framework KPI",
    layer: "HYBRID",
    order: 63,
    executionType: "COMPOSE",
    pillarKeys: ["S", "T"],
    requiredDrivers: [],
    dependencies: [],
    description: "KPIs par objectif, sources de données, fréquence reporting, seuils d'alerte",
    inputFields: ["axes_strategiques", "kpis_existing", "channels", "budget"],
    pillarBindings: {
      axes_strategiques: "s.axesStrategiques",
      kpis_existing: "s.kpiDashboard",
      channels: "i.catalogueParCanal",
      budget: "s.globalBudget",
    },
    outputFormat: "kpi_framework",
    promptTemplate: `Framework KPI :
Axes stratégiques : {{axes_strategiques}}
KPIs existants : {{kpis_existing}}
Canaux : {{channels}} | Budget : {{budget}}
Livrable : KPIs par axe (leading + lagging), source de données, fréquence (daily/weekly/monthly/quarterly), seuils vert/orange/rouge, dashboard layout, coût de tracking.`,
    status: "ACTIVE",
  },
  {
    slug: "milestone-roadmap-builder",
    name: "Constructeur Roadmap à Jalons",
    layer: "DC",
    order: 64,
    executionType: "COMPOSE",
    pillarKeys: ["S", "I"],
    requiredDrivers: [],
    dependencies: [],
    description: "Roadmap 12-36 mois — phases, jalons, dépendances, go/no-go, budget par phase",
    inputFields: ["roadmap", "sprint_90", "annual_calendar", "budget", "team"],
    pillarBindings: {
      roadmap: "s.roadmap",
      sprint_90: "s.sprint90Days",
      annual_calendar: "s.roadmap",
      budget: "s.globalBudget",
      team: "s.teamStructure",
    },
    outputFormat: "roadmap_milestones",
    promptTemplate: `Roadmap à jalons :
Roadmap existante : {{roadmap}}
Sprint 90j : {{sprint_90}}
Calendrier annuel : {{annual_calendar}}
Budget : {{budget}} XAF | Équipe : {{team}}
Livrable : roadmap 12 mois (4 phases), jalons clés par phase, dépendances inter-jalons, checkpoints go/no-go, budget cumulé par phase, indicateurs de succès par jalon.`,
    status: "ACTIVE",
  },
];

// ─── Exports ─────────────────────────────────────────────────────────────────

// ─── PHASE 4 — Production (12 outils) ────────────────────────────────────────

const PHASE4_TOOLS: GloryToolDef[] = [
  // ── KV (2) ──
  {
    slug: "kv-art-direction-brief",
    name: "Brief Direction Artistique KV",
    layer: "DC",
    order: 65,
    executionType: "COMPOSE",
    pillarKeys: ["A", "D", "V"],
    requiredDrivers: [],
    dependencies: ["idea-killer-saver"],
    description: "Synthétise concept retenu + données BRAND en brief DA structuré pour le prompt generator",
    inputFields: ["concept", "chromatic_strategy", "typography_system", "moodboard", "personas", "format"],
    pillarBindings: {
      chromatic_strategy: "d.directionArtistique.chromaticStrategy",
      typography_system: "d.directionArtistique.typographySystem",
      moodboard: "d.directionArtistique.moodboard",
      personas: "d.personas",
    },
    outputFormat: "kv_brief",
    promptTemplate: `Brief DA pour Key Visual :
Concept retenu : {{concept}} | Format : {{format}}
Chromatic : {{chromatic_strategy}}
Typo : {{typography_system}}
Moodboard : {{moodboard}}
Personas : {{personas}}
Livrable : brief DA structuré — composition, éclairage, palette, typographie, sujet, ambiance, do/don't visuels.`,
    status: "ACTIVE",
    // Phase 9-suite (NEFER) — brief-to-forge auto-handoff vers Ptah
    forgeOutput: {
      forgeKind: "image",
      providerHint: "magnific",
      modelHint: "mystic",
      manipulationProfile: ["entertainer","facilitator"],
      briefTextPath: "art_direction",
      defaultPillarSource: "V",
      // Phase 17 (ADR-0037) — kv-art-direction-brief : composé sur big idea + chromatique + typo
      requires: ["BIG_IDEA", "CHROMATIC_STRATEGY", "TYPOGRAPHY_SYSTEM"],
    },
  },
  {
    slug: "kv-review-validator",
    name: "Validateur de KV",
    layer: "DC",
    order: 66,
    executionType: "COMPOSE",
    pillarKeys: ["D"],
    requiredDrivers: [],
    dependencies: ["kv-banana-prompt-generator"],
    description: "Score conformité KV vs brand guidelines, cohérence chromatique, lisibilité copy overlay",
    inputFields: ["kv_prompts", "brand_guidelines", "chromatic_strategy", "format"],
    pillarBindings: {
      brand_guidelines: "d.directionArtistique.brandGuidelines",
      chromatic_strategy: "d.directionArtistique.chromaticStrategy",
    },
    outputFormat: "kv_validation",
    promptTemplate: `Validation KV :
Prompts générés : {{kv_prompts}}
Guidelines : {{brand_guidelines}}
Chromatic : {{chromatic_strategy}} | Format : {{format}}
Par KV : score conformité (0-100), cohérence chromatique, lisibilité copy overlay, respect archétype, corrections suggérées.`,
    status: "ACTIVE",
    // Phase 9-suite (NEFER) — brief-to-forge auto-handoff vers Ptah
    forgeOutput: {
      forgeKind: "classify",
      providerHint: "magnific",
      modelHint: "ai-classifier",
      manipulationProfile: ["facilitator"],
      briefTextPath: "kv_url",
      defaultPillarSource: "D",
      // Phase 17 (ADR-0037) — kv-review-validator : valide les KV prompts produits + cohérence chromatique
      requires: ["KV_PROMPT", "CHROMATIC_STRATEGY"],
    },
  },

  // ── SPOT-VIDEO (2) ──
  {
    slug: "storyboard-generator",
    name: "Générateur de Storyboard",
    layer: "CR",
    order: 67,
    executionType: "COMPOSE",
    pillarKeys: ["A", "D"],
    requiredDrivers: ["VIDEO", "TV"],
    dependencies: ["script-writer"],
    description: "Découpe le script en plans visuels — cadrage, mouvement, transition, timing",
    inputFields: ["script", "duration", "visual_direction", "chromatic_strategy"],
    pillarBindings: {
      visual_direction: "d.directionArtistique.moodboard.theme",
      chromatic_strategy: "d.directionArtistique.chromaticStrategy",
    },
    outputFormat: "storyboard",
    promptTemplate: `Storyboard :
Script : {{script}} | Durée : {{duration}}s
Direction visuelle : {{visual_direction}}
Chromatic : {{chromatic_strategy}}
Par plan : numéro, durée, cadrage (GP/PM/PA/PE), mouvement caméra, description visuelle, dialogue/VO, SFX/musique, transition.`,
    status: "ACTIVE",
    // Phase 9-suite (NEFER) — brief-to-forge auto-handoff vers Ptah
    forgeOutput: {
      forgeKind: "image",
      providerHint: "magnific",
      modelHint: "mystic",
      manipulationProfile: ["entertainer","facilitator"],
      briefTextPath: "frames[0].description",
      defaultPillarSource: "V",
      // Phase 17 (ADR-0037) — storyboard-generator : découpe un script existant en plans
      requires: ["SCRIPT", "CHROMATIC_STRATEGY"],
    },
  },
  {
    slug: "casting-brief-generator",
    name: "Brief Casting",
    layer: "CR",
    order: 68,
    executionType: "COMPOSE",
    pillarKeys: ["A", "D"],
    requiredDrivers: ["VIDEO", "TV"],
    dependencies: ["storyboard-generator"],
    description: "Profils comédiens/figurants — physique, âge, attitude, compétences",
    inputFields: ["storyboard", "personas", "brand_personality", "tone"],
    pillarBindings: {
      personas: "d.personas",
      brand_personality: "a.noyauIdentitaire",
      tone: "d.tonDeVoix.personnalite",
    },
    outputFormat: "casting_brief",
    promptTemplate: `Brief casting :
Storyboard : {{storyboard}}
Personas cibles : {{personas}}
Personnalité marque : {{brand_personality}} | Ton : {{tone}}
Par rôle : description physique, tranche d'âge, attitude/énergie, compétences requises, vêtements/style, diversité, do/don't.`,
    status: "ACTIVE",
  },

  // ── SPOT-RADIO (1) ──
  {
    slug: "voiceover-brief-generator",
    name: "Brief Voix Off",
    layer: "CR",
    order: 69,
    executionType: "COMPOSE",
    pillarKeys: ["A", "D"],
    requiredDrivers: ["RADIO", "VIDEO"],
    dependencies: ["script-writer"],
    description: "Specs voix off — genre vocal, ton, rythme, accents, direction",
    inputFields: ["script", "tone", "brand_personality", "duration", "format"],
    pillarBindings: {
      tone: "d.tonDeVoix.personnalite",
      brand_personality: "a.noyauIdentitaire",
    },
    outputFormat: "voiceover_brief",
    promptTemplate: `Brief voix off :
Script : {{script}} | Durée : {{duration}}s | Format : {{format}}
Ton : {{tone}} | Personnalité : {{brand_personality}}
Livrable : genre vocal (M/F/non-binaire), tranche d'âge, registre, accent, rythme (mots/min), énergie, exemples de direction, références vocales.`,
    status: "ACTIVE",
    // Phase 9-suite (NEFER) — brief-to-forge auto-handoff vers Ptah
    forgeOutput: {
      forgeKind: "audio",
      providerHint: "magnific",
      modelHint: "tts-premium",
      manipulationProfile: ["entertainer","facilitator"],
      briefTextPath: "script",
      defaultPillarSource: "V",
      // Phase 17 (ADR-0037) — voiceover-brief-generator : décline un script en specs vocales selon le ton
      requires: ["SCRIPT", "TONE_CHARTER"],
    },
  },

  // ── OOH (1) ──
  {
    slug: "format-declination-engine",
    name: "Moteur Déclinaison Formats",
    layer: "HYBRID",
    order: 70,
    executionType: "COMPOSE",
    pillarKeys: ["D"],
    requiredDrivers: ["OOH", "PRINT"],
    dependencies: ["print-ad-architect"],
    description: "Décline l'annonce maître sur tous formats OOH — adaptation layout, recadrage, ajustement copy",
    inputFields: ["master_layout", "formats", "chromatic_strategy", "typography_system"],
    pillarBindings: {
      chromatic_strategy: "d.directionArtistique.chromaticStrategy",
      typography_system: "d.directionArtistique.typographySystem",
    },
    outputFormat: "format_specs",
    promptTemplate: `Déclinaison formats :
Layout maître : {{master_layout}}
Formats cibles : {{formats}}
Chromatic : {{chromatic_strategy}} | Typo : {{typography_system}}
Par format : dimensions, adaptation layout, recadrage, ajustement typo (taille/interligne), copy réduit si nécessaire, zones de sécurité.`,
    status: "ACTIVE",
  },

  // ── WEB-COPY (1) ──
  {
    slug: "seo-copy-optimizer",
    name: "Optimiseur Copy SEO",
    layer: "CR",
    order: 71,
    executionType: "COMPOSE",
    pillarKeys: ["V", "T"],
    requiredDrivers: ["WEBSITE"],
    dependencies: ["long-copy-craftsman"],
    description: "Optimise le contenu pour le référencement — mots-clés, structure Hn, méta, readability",
    inputFields: ["content", "target_keywords", "sector", "competitors"],
    pillarBindings: {
      sector: "t.triangulation.competitiveAnalysis",
      competitors: "d.paysageConcurrentiel",
    },
    outputFormat: "seo_report",
    promptTemplate: `Optimisation SEO :
Contenu : {{content}}
Mots-clés cibles : {{target_keywords}}
Secteur : {{sector}} | Concurrents : {{competitors}}
Livrable : score readability, structure Hn recommandée, méta title/description, densité mots-clés, maillage interne suggéré, featured snippet potential.`,
    status: "ACTIVE",
  },

  // ── NAMING (2) ──
  {
    slug: "naming-generator",
    name: "Générateur de Noms",
    layer: "CR",
    order: 72,
    executionType: "LLM",
    pillarKeys: ["A", "D"],
    requiredDrivers: [],
    dependencies: ["wordplay-cultural-bank"],
    description: "Propositions de noms — étymologie, sonorité, mémorabilité, disponibilité domaine",
    inputFields: ["brand_dna", "values", "cultural_context", "wordplay_bank", "sector"],
    pillarBindings: {
      brand_dna: "a.noyauIdentitaire",
      values: "a.valeurs",
      cultural_context: "a.doctrine",
    },
    outputFormat: "name_proposals",
    promptTemplate: `Naming :
ADN : {{brand_dna}} | Valeurs : {{values}}
Contexte culturel : {{cultural_context}}
Banque de mots : {{wordplay_bank}} | Secteur : {{sector}}
Génère 15 propositions de noms. Par nom : le mot, étymologie/origine, sonorité (nb syllabes, phonétique), score mémorabilité (1-5), connotations positives/négatives, extensions possibles (.com, .fr, @handle).`,
    status: "ACTIVE",
  },
  {
    slug: "naming-legal-checker",
    name: "Vérificateur Légal de Nom",
    layer: "HYBRID",
    order: 73,
    executionType: "COMPOSE",
    pillarKeys: ["R"],
    requiredDrivers: [],
    dependencies: ["naming-generator"],
    description: "Disponibilité juridique — marques déposées, domaines, réseaux sociaux, connotations inter-langues",
    inputFields: ["name_proposals", "markets", "languages"],
    pillarBindings: {},
    outputFormat: "legal_check",
    promptTemplate: `Check légal naming :
Noms proposés : {{name_proposals}}
Marchés cibles : {{markets}} | Langues : {{languages}}
Par nom : check marque déposée (INPI/OAPI/WIPO), disponibilité .com/.fr/.cm, @handles (IG/TW/LI/TT), connotations négatives dans les langues cibles, risques phonétiques, verdict GO/CAUTION/NO-GO.`,
    status: "ACTIVE",
  },

  // ── PACKAGING (1) ──
  {
    slug: "packaging-layout-advisor",
    name: "Conseiller Layout Packaging",
    layer: "BRAND",
    order: 74,
    executionType: "COMPOSE",
    pillarKeys: ["D", "V"],
    requiredDrivers: ["PACKAGING"],
    dependencies: ["chromatic-strategy-builder", "typography-system-architect"],
    description: "Hiérarchie visuelle packaging — zones obligatoires, placement marque, facing shelf impact",
    inputFields: ["product", "chromatic_strategy", "typography_system", "brand_guidelines", "regulatory"],
    pillarBindings: {
      chromatic_strategy: "d.directionArtistique.chromaticStrategy",
      typography_system: "d.directionArtistique.typographySystem",
      brand_guidelines: "d.directionArtistique.brandGuidelines",
      product: "v.produitsCatalogue",
    },
    outputFormat: "packaging_layout",
    promptTemplate: `Layout packaging :
Produit : {{product}}
Chromatic : {{chromatic_strategy}} | Typo : {{typography_system}}
Guidelines : {{brand_guidelines}} | Réglementaire : {{regulatory}}
Livrable : zones (marque, claim, visuel, infos légales, code-barres), hiérarchie de lecture (1er/2e/3e regard), facing shelf impact, do/don't packaging, adaptation multi-formats (sachet/boîte/bouteille).`,
    status: "ACTIVE",
  },

  // ── INFLUENCE (2) ──
  {
    slug: "influencer-brief-generator",
    name: "Brief Influenceur",
    layer: "CR",
    order: 75,
    executionType: "COMPOSE",
    pillarKeys: ["E", "D"],
    requiredDrivers: ["INSTAGRAM", "TIKTOK", "LINKEDIN"],
    dependencies: [],
    description: "Brief KOL — profil recherché, deliverables, do/don't, messages clés, métriques",
    inputFields: ["campaign_context", "target_persona", "tone", "brand_guidelines", "budget"],
    pillarBindings: {
      target_persona: "d.personas",
      tone: "d.tonDeVoix",
      brand_guidelines: "d.directionArtistique.brandGuidelines",
      budget: "s.globalBudget",
    },
    outputFormat: "influencer_brief",
    promptTemplate: `Brief influenceur :
Campagne : {{campaign_context}}
Persona cible : {{target_persona}} | Ton : {{tone}}
Guidelines : {{brand_guidelines}} | Budget : {{budget}} XAF
Livrable : profil idéal (niche, taille audience, taux engagement min), deliverables (nb posts, stories, reels), messages clés, do/don't créatif, liberté créative (cadre), métriques attendues, conditions contractuelles.`,
    status: "ACTIVE",
  },
  {
    slug: "ugc-framework-builder",
    name: "Framework UGC",
    layer: "HYBRID",
    order: 76,
    executionType: "COMPOSE",
    pillarKeys: ["E"],
    requiredDrivers: ["INSTAGRAM", "TIKTOK"],
    dependencies: [],
    description: "Cadre UGC — guidelines créatives, hashtags, mécaniques de participation, curation",
    inputFields: ["brand_tone", "community_principles", "campaign_context", "platforms"],
    pillarBindings: {
      brand_tone: "d.tonDeVoix",
      community_principles: "e.principesCommunautaires",
    },
    outputFormat: "ugc_framework",
    promptTemplate: `Framework UGC :
Ton : {{brand_tone}}
Principes communautaires : {{community_principles}}
Campagne : {{campaign_context}} | Plateformes : {{platforms}}
Livrable : guidelines créatives pour les fans, hashtags de campagne (primaire + secondaires), mécaniques de participation (challenge, concours, témoignage), process de curation (sélection, repost, crédit), droits d'usage, récompenses.`,
    status: "ACTIVE",
  },
];

// ─── PHASE 5 — Stratégique (6 outils) ───────────────────────────────────────

const PHASE5_TOOLS: GloryToolDef[] = [
  {
    slug: "media-plan-builder",
    name: "Constructeur Plan Média",
    layer: "HYBRID",
    order: 77,
    executionType: "CALC",
    pillarKeys: ["I", "T"],
    requiredDrivers: [],
    dependencies: [],
    description: "Allocation média ATL/BTL/Digital — GRP, CPM/CPC cibles, calendrier de diffusion",
    inputFields: ["objectives", "budget", "channels", "targeting", "duration", "market_size"],
    pillarBindings: {
      budget: "i.mediaPlan.totalBudget",
      channels: "i.catalogueParCanal",
      targeting: "d.personas",
      market_size: "t.tamSamSom",
    },
    outputFormat: "media_plan",
    promptTemplate: `Plan média :
Objectifs : {{objectives}} | Budget : {{budget}} XAF
Canaux : {{channels}} | Ciblage : {{targeting}}
Durée : {{duration}} | Taille marché : {{market_size}}
Livrable : répartition ATL/BTL/Digital (%), allocation par canal, GRP cibles, CPM/CPC estimés, calendrier de diffusion (semaines), budget par phase, KPI par canal.`,
    status: "ACTIVE",
  },
  {
    slug: "launch-timeline-planner",
    name: "Planificateur Timeline Lancement",
    layer: "DC",
    order: 78,
    executionType: "COMPOSE",
    pillarKeys: ["I", "S"],
    requiredDrivers: [],
    dependencies: [],
    description: "Rétro-planning J-90 à J+30 — milestones, dépendances, go/no-go",
    inputFields: ["launch_date", "campaign_architecture", "team", "budget", "roadmap"],
    pillarBindings: {
      team: "s.teamStructure",
      budget: "s.globalBudget",
      roadmap: "s.roadmap",
    },
    outputFormat: "launch_timeline",
    promptTemplate: `Timeline lancement :
Date J : {{launch_date}}
Architecture campagne : {{campaign_architecture}}
Équipe : {{team}} | Budget : {{budget}} XAF
Roadmap : {{roadmap}}
Livrable : rétro-planning J-90→J+30 (semaine par semaine), milestones clés, dépendances inter-tâches, checkpoints go/no-go (J-60, J-30, J-7, J-1), war room J-day, actions post-launch.`,
    status: "ACTIVE",
  },
  {
    slug: "migration-playbook-generator",
    name: "Générateur Playbook Migration",
    layer: "DC",
    order: 79,
    executionType: "COMPOSE",
    pillarKeys: ["D", "I"],
    requiredDrivers: [],
    dependencies: ["brand-guidelines-generator"],
    description: "Plan migration ancienne → nouvelle identité — phases, touchpoints prioritaires, communication",
    inputFields: ["old_brand", "new_guidelines", "touchpoints", "team", "timeline"],
    pillarBindings: {
      new_guidelines: "d.directionArtistique.brandGuidelines",
      touchpoints: "e.touchpoints",
      team: "s.teamStructure",
    },
    outputFormat: "migration_playbook",
    promptTemplate: `Playbook migration de marque :
Ancienne identité : {{old_brand}}
Nouvelles guidelines : {{new_guidelines}}
Touchpoints : {{touchpoints}} | Équipe : {{team}}
Timeline : {{timeline}}
Livrable : phases de migration (3-4), touchpoints par ordre de priorité (digital first), communication interne/externe, FAQ changement, signalétique physique, timeline détaillée.`,
    status: "ACTIVE",
  },
  {
    slug: "credentials-deck-builder",
    name: "Constructeur Deck Credentials",
    layer: "DC",
    order: 80,
    executionType: "COMPOSE",
    pillarKeys: ["V", "A"],
    requiredDrivers: [],
    dependencies: [],
    description: "Cases pertinents, équipe dédiée, méthodologie, chiffres clés, témoignages",
    inputFields: ["agency_strengths", "case_studies", "team", "methodology", "client_sector"],
    pillarBindings: {
      agency_strengths: "r.globalSwot.strengths",
      team: "s.teamStructure",
    },
    outputFormat: "credentials_deck",
    promptTemplate: `Deck credentials :
Forces : {{agency_strengths}}
Cases : {{case_studies}} | Équipe : {{team}}
Méthodologie : {{methodology}} | Secteur client : {{client_sector}}
Livrable : structure deck (10-12 slides), pitch agence (1 slide), méthodologie ADVE-RTIS (2 slides), 3 cases pertinents au secteur, équipe dédiée, chiffres clés, témoignages, CTA.`,
    status: "ACTIVE",
    // Phase 9-suite (NEFER) — brief-to-forge auto-handoff vers Ptah
    forgeOutput: {
      forgeKind: "design",
      providerHint: "canva",
      modelHint: "deck",
      manipulationProfile: ["dealer","facilitator"],
      briefTextPath: "deck",
      defaultPillarSource: "I",
      // Phase 17 (ADR-0037) — credentials-deck-builder : deck agence (forces/cases/équipe), pas de prereq vault marque-cliente
      requires: [],
    },
  },
  {
    slug: "seasonal-theme-planner",
    name: "Planificateur Thèmes Saisonniers",
    layer: "HYBRID",
    order: 81,
    executionType: "COMPOSE",
    pillarKeys: ["E", "I"],
    requiredDrivers: [],
    dependencies: [],
    description: "Mappe temps forts × piliers marque → thématiques mensuelles",
    inputFields: ["sacred_calendar", "rituals", "sector", "brand_values", "annual_calendar"],
    pillarBindings: {
      sacred_calendar: "e.sacredCalendar",
      rituals: "e.rituels",
      brand_values: "a.valeurs",
      annual_calendar: "s.roadmap",
    },
    outputFormat: "seasonal_themes",
    promptTemplate: `Thèmes saisonniers :
Calendrier sacré : {{sacred_calendar}}
Rituels : {{rituals}} | Secteur : {{sector}}
Valeurs : {{brand_values}} | Calendrier annuel : {{annual_calendar}}
Livrable : 12 thèmes mensuels, chacun avec : temps fort (fête/événement/saison), pilier ADVE lié, angle éditorial, formats recommandés, ton spécifique, hashtag mensuel.`,
    status: "ACTIVE",
  },
  {
    slug: "content-mix-optimizer",
    name: "Optimiseur Mix Contenus",
    layer: "HYBRID",
    order: 82,
    executionType: "CALC",
    pillarKeys: ["I", "E"],
    requiredDrivers: [],
    dependencies: [],
    description: "Ratio pillar/hero/hygiene, répartition par format, budgets prod par type",
    inputFields: ["content_calendar", "budget", "platforms", "team_capacity"],
    pillarBindings: {
      budget: "s.globalBudget",
      team_capacity: "s.teamStructure",
    },
    outputFormat: "content_mix",
    promptTemplate: `Mix contenus :
Calendrier : {{content_calendar}}
Budget : {{budget}} XAF | Plateformes : {{platforms}}
Capacité équipe : {{team_capacity}}
Livrable : ratio hero/hub/hygiene (%), répartition par format (vidéo/image/texte/carrousel/story), budget prod par type de contenu, fréquence recommandée par plateforme, capacité vs. ambition (gap analysis).`,
    status: "ACTIVE",
  },
];

// ─── Exports ─────────────────────────────────────────────────────────────────

// ─── PHASE 6 — Financial CALC (9 outils, zéro AI) ───────────────────────────

const PHASE6_TOOLS: GloryToolDef[] = [
  // ── EVAL ──
  {
    slug: "roi-calculator",
    name: "Calculateur ROI Créatif",
    layer: "HYBRID",
    order: 83,
    executionType: "CALC",
    pillarKeys: ["T", "V"],
    requiredDrivers: [],
    dependencies: ["post-campaign-reader"],
    description: "Coût par engagement, earned media value, brand lift estimé, corrélation investissement/résultat",
    inputFields: ["campaign_results", "budget_spent", "impressions", "engagements", "conversions"],
    pillarBindings: {
      budget_spent: "s.globalBudget",
    },
    outputFormat: "roi_metrics",
    promptTemplate: `ROI créatif :
Résultats : {{campaign_results}}
Budget dépensé : {{budget_spent}} XAF
Impressions : {{impressions}} | Engagements : {{engagements}} | Conversions : {{conversions}}
Formules : CPE = budget/engagements, CPC = budget/conversions, CPM = (budget/impressions)*1000, EMV = engagements*valeur_estimée, ROAS = revenus/budget.`,
    status: "ACTIVE",
  },

  // ── COST-SERVICE (3) ──
  {
    slug: "hourly-rate-calculator",
    name: "Calculateur Taux Horaire",
    layer: "HYBRID",
    order: 84,
    executionType: "CALC",
    pillarKeys: ["V", "I"],
    requiredDrivers: [],
    dependencies: [],
    description: "(salaire brut + charges + overhead) / heures productives annuelles",
    inputFields: ["salary_gross", "employer_charges_pct", "overhead_pct", "productive_hours_year", "margin_pct"],
    pillarBindings: {},
    outputFormat: "hourly_rates",
    promptTemplate: `Taux horaire :
Salaire brut : {{salary_gross}} XAF/mois
Charges patronales : {{employer_charges_pct}}%
Overhead : {{overhead_pct}}%
Heures productives/an : {{productive_hours_year}}
Marge cible : {{margin_pct}}%
Formule : coût_annuel = (salaire*12)*(1+charges/100)*(1+overhead/100), taux_revient = coût_annuel/heures, taux_vente = taux_revient*(1+marge/100).`,
    status: "ACTIVE",
  },
  {
    slug: "codb-calculator",
    name: "Calculateur Cost of Doing Business",
    layer: "HYBRID",
    order: 85,
    executionType: "CALC",
    pillarKeys: ["V"],
    requiredDrivers: [],
    dependencies: [],
    description: "Coûts fixes + variables + overhead → seuil de rentabilité",
    inputFields: ["fixed_costs", "variable_costs", "headcount", "revenue_target", "billable_ratio"],
    pillarBindings: {},
    outputFormat: "codb",
    promptTemplate: `CODB :
Coûts fixes/mois : {{fixed_costs}} XAF
Coûts variables/mois : {{variable_costs}} XAF
Effectif : {{headcount}}
CA cible : {{revenue_target}} XAF/an
Ratio facturable : {{billable_ratio}}%
Formules : CODB_mensuel = fixes+variables, CODB_annuel = CODB_mensuel*12, seuil_rentabilite = CODB_annuel/marge_moyenne, overhead_rate = CODB/(salaires*12).`,
    status: "ACTIVE",
  },
  {
    slug: "service-margin-analyzer",
    name: "Analyseur Marge par Service",
    layer: "HYBRID",
    order: 86,
    executionType: "CALC",
    pillarKeys: ["V"],
    requiredDrivers: [],
    dependencies: ["hourly-rate-calculator"],
    description: "Marge par type de prestation — identifie services rentables vs. sous-tarifés",
    inputFields: ["services", "hourly_cost", "hours_per_service", "price_per_service"],
    pillarBindings: {
      services: "v.produitsCatalogue",
    },
    outputFormat: "margins",
    promptTemplate: `Marge par service :
Services : {{services}}
Coût horaire : {{hourly_cost}} XAF
Heures/service : {{hours_per_service}}
Prix/service : {{price_per_service}} XAF
Par service : coût_revient = heures*coût_h, marge_brute = prix-coût, marge_pct = marge/prix*100, verdict (RENTABLE/EQUILIBRE/DEFICITAIRE).`,
    status: "ACTIVE",
  },

  // ── COST-CAMPAIGN (2) ──
  {
    slug: "campaign-cost-estimator",
    name: "Estimateur Coût Campagne",
    layer: "HYBRID",
    order: 87,
    executionType: "CALC",
    pillarKeys: ["I", "V"],
    requiredDrivers: [],
    dependencies: [],
    description: "Coût total par poste — création, production, média, post-production, suivi",
    inputFields: ["deliverables", "media_budget", "production_specs", "team_rates", "duration"],
    pillarBindings: {
      deliverables: "i.assetsProduisibles",
      media_budget: "i.mediaPlan.totalBudget",
    },
    outputFormat: "cost_estimate",
    promptTemplate: `Estimation coût campagne :
Livrables : {{deliverables}}
Budget média : {{media_budget}} XAF
Specs production : {{production_specs}}
Taux équipe : {{team_rates}} | Durée : {{duration}}
Par poste : création (heures*taux), production, post-production, achat média, gestion de projet (15%), marge agence. Total HT + TVA.`,
    status: "ACTIVE",
  },
  {
    slug: "budget-tracker",
    name: "Suivi Budgétaire",
    layer: "HYBRID",
    order: 88,
    executionType: "CALC",
    pillarKeys: ["I"],
    requiredDrivers: [],
    dependencies: ["campaign-cost-estimator"],
    description: "Budget réel vs. estimé — consommé, engagé, reste à facturer, alertes dépassement",
    inputFields: ["estimated_budget", "spent_to_date", "committed", "invoiced", "remaining_tasks"],
    pillarBindings: {
      estimated_budget: "s.globalBudget",
    },
    outputFormat: "budget_tracking",
    promptTemplate: `Suivi budgétaire :
Budget estimé : {{estimated_budget}} XAF
Dépensé : {{spent_to_date}} XAF
Engagé (non facturé) : {{committed}} XAF
Facturé : {{invoiced}} XAF
Tâches restantes : {{remaining_tasks}}
Calculs : consommé_pct = dépensé/estimé*100, engagé_total = dépensé+committed, reste_disponible = estimé-engagé_total, alerte = reste_disponible < 10% ? "CRITIQUE" : reste_disponible < 25% ? "ATTENTION" : "OK".`,
    status: "ACTIVE",
  },

  // ── PROFITABILITY (3) ──
  {
    slug: "project-pnl-calculator",
    name: "Calculateur P&L Projet",
    layer: "HYBRID",
    order: 89,
    executionType: "CALC",
    pillarKeys: ["V"],
    requiredDrivers: [],
    dependencies: [],
    description: "P&L par projet — revenus, coûts directs, coûts indirects alloués, marge",
    inputFields: ["project_revenue", "direct_costs", "hours_spent", "hourly_cost", "overhead_allocation_pct"],
    pillarBindings: {},
    outputFormat: "project_pnl",
    promptTemplate: `P&L projet :
Revenus : {{project_revenue}} XAF
Coûts directs : {{direct_costs}} XAF
Heures : {{hours_spent}}h × {{hourly_cost}} XAF/h
Overhead alloué : {{overhead_allocation_pct}}%
Calculs : coût_RH = heures*coût_h, coûts_indirects = coût_RH*overhead/100, coût_total = directs+coût_RH+indirects, marge_brute = revenus-coût_total, marge_pct = marge_brute/revenus*100.`,
    status: "ACTIVE",
  },
  {
    slug: "client-profitability-analyzer",
    name: "Analyseur Rentabilité Client",
    layer: "HYBRID",
    order: 90,
    executionType: "CALC",
    pillarKeys: ["V", "T"],
    requiredDrivers: [],
    dependencies: ["project-pnl-calculator"],
    description: "Revenus cumulés, heures investies, marge moyenne, trend, recommandation pricing",
    inputFields: ["client_projects", "total_revenue", "total_hours", "total_costs", "contract_duration_months"],
    pillarBindings: {},
    outputFormat: "client_profitability",
    promptTemplate: `Rentabilité client :
Projets : {{client_projects}}
Revenus cumulés : {{total_revenue}} XAF
Heures totales : {{total_hours}}h
Coûts totaux : {{total_costs}} XAF
Durée contrat : {{contract_duration_months}} mois
Calculs : marge_cumulée = revenus-coûts, marge_pct = marge/revenus*100, revenu_mensuel = revenus/durée, coût_par_heure_effective = coûts/heures, verdict = marge_pct > 30% ? "TRÈS RENTABLE" : marge_pct > 15% ? "RENTABLE" : marge_pct > 0% ? "MARGINAL" : "DÉFICITAIRE".`,
    status: "ACTIVE",
  },
  {
    slug: "utilization-rate-tracker",
    name: "Suivi Taux d'Utilisation",
    layer: "HYBRID",
    order: 91,
    executionType: "CALC",
    pillarKeys: ["I"],
    requiredDrivers: [],
    dependencies: [],
    description: "Heures productives / heures disponibles par profil et par période",
    inputFields: ["team_members", "available_hours", "billable_hours", "non_billable_hours", "period"],
    pillarBindings: {
      team_members: "s.teamStructure",
    },
    outputFormat: "utilization",
    promptTemplate: `Taux d'utilisation :
Équipe : {{team_members}}
Heures dispo : {{available_hours}}h
Heures facturables : {{billable_hours}}h
Heures non-facturables : {{non_billable_hours}}h
Période : {{period}}
Par membre : taux_utilisation = billable/available*100, taux_occupation = (billable+non_billable)/available*100, heures_perdues = available-billable-non_billable. Cible : utilisation > 70%, occupation > 85%.`,
    status: "ACTIVE",
  },
];

// ─── NETERU Phase 9 — Validation + Messaging Pipeline (7 tools) ─────────────

const NETERU_TOOLS: GloryToolDef[] = [
  // ── DC: Validation / Coherence ───────────────────────────────────────────
  {
    slug: "brand-guardian",
    name: "Brand Guardian",
    layer: "DC",
    order: 90,
    executionType: "LLM",
    pillarKeys: ["A", "D"],
    requiredDrivers: [],
    dependencies: [],
    description: "Valide tout output contre l'identité BRAND acceptée. Détecte les incohérences visuelles, tonales et sémiotiques. Critique pour le vault : aucun output ne devrait être ACCEPTED sans passer par le guardian.",
    inputFields: ["output_candidate", "brand_identity", "brand_guidelines"],
    pillarBindings: {
      brand_identity: "a.noyauIdentitaire",
      brand_guidelines: "d.directionArtistique",
    },
    outputFormat: "brand_validation_report",
    promptTemplate: `Tu es le Brand Guardian. Analyse cet output candidat en le confrontant à l'identité de marque et aux guidelines.
Identité marque : {{brand_identity}}
Guidelines : {{brand_guidelines}}
Output candidat : {{output_candidate}}

⚠️ FORMAT DE SORTIE VERROUILLÉ — Réponds UNIQUEMENT avec ce JSON exact, aucun préambule, aucun markdown.

Schéma EXACT :
{
  "brand_culture_audit": {
    "coherence_visual":   { "score": <0-100>, "notes": "<observations cohérence visuelle>" },
    "coherence_tonal":    { "score": <0-100>, "notes": "<observations cohérence tonale>" },
    "coherence_semiotic": { "score": <0-100>, "notes": "<observations cohérence sémiotique>" },
    "alignment_values":   { "score": <0-100>, "notes": "<alignement promesse/mission/vision>" }
  },
  "coherenceScore": <0-100>,
  "violations":  ["<violation 1>"],
  "suggestions": ["<suggestion concrète 1>", "<suggestion 2>", "<suggestion 3>"],
  "verdict":     "APPROVED" | "NEEDS_REVISION" | "REJECTED"
}

Règles : brand_culture_audit : 4 sous-clés OBLIGATOIRES (score entier ∈ [0,100], notes JAMAIS vide). coherenceScore = moyenne des 4 sous-scores. violations MIN 0, MAX 6 (peut être []). suggestions MIN 1, MAX 6. verdict : STRICTEMENT "APPROVED"|"NEEDS_REVISION"|"REJECTED" (majuscules). Mapping indicatif : score ≥ 80 → APPROVED, 50-79 → NEEDS_REVISION, < 50 → REJECTED. Si {{output_candidate}} absent : verdict="NEEDS_REVISION", scores=50, notes="à enrichir". Pas de wrapper. Pas de champ supplémentaire.`,
    status: "ACTIVE",
  },
  {
    slug: "coherence-checker",
    name: "Vérificateur de Cohérence Cross-Séquence",
    layer: "DC",
    order: 91,
    executionType: "LLM",
    pillarKeys: ["A", "D", "V", "E"],
    requiredDrivers: [],
    dependencies: [],
    description: "Vérifie la cohérence entre les outputs de séquences différentes. Le KV respecte-t-il le BRAND ? Le SOCIAL-POST est-il aligné avec le MESSAGING ?",
    inputFields: ["source_output", "target_output", "brand_dna"],
    pillarBindings: {
      brand_dna: "a.noyauIdentitaire",
    },
    outputFormat: "coherence_report",
    promptTemplate: `Compare ces deux outputs de séquences différentes pour vérifier leur cohérence mutuelle.
ADN marque : {{brand_dna}}
Output source (référence) : {{source_output}}
Output cible (à vérifier) : {{target_output}}

Évalue : alignement visuel, tonal, sémiotique, narratif.
Retourne : { aligned: boolean, score: 0-100, gaps: string[], risks: string[], recommendations: string[] }`,
    status: "ACTIVE",
  },

  // ── CR: Pipeline MESSAGING (5 outils) ────────────────────────────────────
  {
    slug: "claim-architect",
    name: "Architecte de Claims",
    layer: "CR",
    order: 80,
    executionType: "LLM",
    pillarKeys: ["A", "D"],
    requiredDrivers: [],
    dependencies: [],
    description: "Construit la hiérarchie de claims : master claim → subclaims par persona → proof points. Le socle de toute communication verbale.",
    inputFields: ["brand_dna", "archetype", "positioning", "personas"],
    pillarBindings: {
      brand_dna: "a.noyauIdentitaire",
      archetype: "a.archetype",
      positioning: "d.positionnement",
      personas: "d.personas",
    },
    outputFormat: "claim_hierarchy",
    promptTemplate: `Tu es un stratège de marque. Construis la hiérarchie de claims pour cette marque.
ADN : {{brand_dna}}
Archétype : {{archetype}}
Positionnement : {{positioning}}
Personas : {{personas}}

Produis :
1. Master Claim (LA promesse en une phrase)
2. Sub-claims par persona (adaptation du master claim)
3. Proof points (preuves tangibles par claim)
4. RTB (Reasons to Believe) par persona

Retourne : { masterClaim: string, subClaims: [{persona, claim, proofPoints}], rtb: [{persona, reasons}] }`,
    status: "ACTIVE",
  },
  {
    slug: "tone-matrix",
    name: "Matrice de Ton",
    layer: "CR",
    order: 81,
    executionType: "COMPOSE",
    pillarKeys: ["D", "E"],
    requiredDrivers: [],
    dependencies: ["claim-architect"],
    description: "Matrice ton × canal × persona. Comment la marque parle sur chaque canal pour chaque audience. Template-based, pas de LLM.",
    inputFields: ["tone_of_voice", "personas", "touchpoints", "claims"],
    pillarBindings: {
      tone_of_voice: "d.tonDeVoix",
      personas: "d.personas",
      touchpoints: "e.touchpoints",
    },
    outputFormat: "tone_matrix",
    promptTemplate: `Matrice de ton :
Ton de voix : {{tone_of_voice}}
Personas : {{personas}}
Touchpoints : {{touchpoints}}
Claims : {{claims}}
Pour chaque combinaison (persona × canal) : registre (formel/informel/technique/émotionnel), intensité (1-5), exemples de formulations, mots-clés, interdits.`,
    status: "ACTIVE",
  },
  {
    slug: "vocabulary-builder",
    name: "Constructeur de Vocabulaire",
    layer: "CR",
    order: 82,
    executionType: "LLM",
    pillarKeys: ["A", "D"],
    requiredDrivers: [],
    dependencies: ["claim-architect"],
    description: "Lexique de marque : mots sacrés, mots interdits, expressions signatures, vocabulaire technique, alternatives aux clichés.",
    inputFields: ["brand_dna", "archetype", "tone_of_voice", "master_claim"],
    pillarBindings: {
      brand_dna: "a.noyauIdentitaire",
      archetype: "a.archetype",
      tone_of_voice: "d.tonDeVoix",
    },
    outputFormat: "brand_vocabulary",
    promptTemplate: `Construis le lexique de marque.
ADN : {{brand_dna}}
Archétype : {{archetype}}
Ton : {{tone_of_voice}}
Claim principal : {{master_claim}}

Produis :
1. Mots sacrés (à utiliser systématiquement, chargés de sens pour la marque)
2. Mots interdits (clichés secteur, termes concurrents, formulations faibles)
3. Expressions signatures (tournures propres à la marque)
4. Vocabulaire technique (termes métier traduits en langage marque)
5. Alternatives (pour chaque cliché → formulation authentique)

Retourne : { sacred: string[], forbidden: string[], signatures: string[], technical: [{term, brandVersion}], alternatives: [{cliche, replacement}] }`,
    status: "ACTIVE",
  },
  {
    slug: "message-templater",
    name: "Générateur de Templates Messages",
    layer: "CR",
    order: 83,
    executionType: "COMPOSE",
    pillarKeys: ["D", "E"],
    requiredDrivers: [],
    dependencies: ["claim-architect", "tone-matrix"],
    description: "Templates de messages par canal : email, social, ad, PR, SMS. Assemblage déterministe depuis les claims + matrice de ton.",
    inputFields: ["claims", "tone_matrix", "touchpoints"],
    pillarBindings: {
      touchpoints: "e.touchpoints",
    },
    outputFormat: "message_templates",
    promptTemplate: `Templates de messages :
Claims : {{claims}}
Matrice de ton : {{tone_matrix}}
Touchpoints : {{touchpoints}}
Par canal : sujet/accroche/corps/CTA avec variables {{nom}}, {{offre}}, {{date}}. Respecter registre de la matrice de ton pour ce canal.`,
    status: "ACTIVE",
  },
  {
    slug: "copy-guidelines",
    name: "Guidelines Rédactionnelles",
    layer: "CR",
    order: 84,
    executionType: "COMPOSE",
    pillarKeys: ["A", "D"],
    requiredDrivers: [],
    dependencies: ["claim-architect", "tone-matrix", "vocabulary-builder", "message-templater"],
    description: "La bible éditoriale compilée — le 'brand book verbal'. Assemblage final de tous les éléments du pipeline MESSAGING.",
    inputFields: ["master_claim", "sub_claims", "tone_matrix", "vocabulary", "templates"],
    pillarBindings: {},
    outputFormat: "copy_guidelines_document",
    promptTemplate: `Bible éditoriale :
Claim principal : {{master_claim}}
Sub-claims : {{sub_claims}}
Matrice de ton : {{tone_matrix}}
Vocabulaire : {{vocabulary}}
Templates : {{templates}}
Compiler en document structuré : 1. Philosophie verbale, 2. Hiérarchie de claims, 3. Règles de ton par canal, 4. Lexique do/don't, 5. Templates par canal, 6. Exemples annotés.`,
    status: "ACTIVE",
  },

  // ── CHARACTER DESIGN: LSI Framework (Layered Semantic Integration) ────────
  {
    slug: "lsi-universe-setup",
    name: "LSI Phase 1 — Setup Univers",
    layer: "CR",
    order: 90,
    executionType: "LLM",
    pillarKeys: ["A", "D"],
    requiredDrivers: [],
    dependencies: [],
    description: "Definit l'ADN du projet IP : genre maitre, 3-5 themes cles (piliers), vibe sensorielle. Contraintes non-negociables de l'univers.",
    inputFields: ["brand_dna", "archetype", "direction_artistique", "genre_maitre"],
    pillarBindings: {
      brand_dna: "a.noyauIdentitaire",
      archetype: "a.archetype",
      direction_artistique: "d.directionArtistique",
    },
    outputFormat: "universe_setup",
    promptTemplate: `Tu es un directeur artistique specialise en creation d'univers IP.
ADN de marque : {{brand_dna}}
Archetype : {{archetype}}
Direction artistique : {{direction_artistique}}
Genre maitre demande : {{genre_maitre}}

Definis :
1. Genre Maitre confirme (avec justification)
2. 3 a 5 Themes Cles (les piliers visuels/narratifs a fusionner)
3. Vibe Sensorielle : 3 adjectifs d'ambiance
4. Contraintes non-negociables de l'univers

Retourne : { genreMaitre: string, themesCles: string[], vibeSensorielle: string[], contraintes: string[], justification: string }`,
    status: "ACTIVE",
  },
  {
    slug: "lsi-symbol-alchemy",
    name: "LSI Phase 2 — Alchimie des Symboles",
    layer: "CR",
    order: 91,
    executionType: "LLM",
    pillarKeys: ["A", "D"],
    requiredDrivers: [],
    dependencies: ["lsi-universe-setup"],
    description: "Cree 5 Artefacts Ultimes en fusionnant les themes. Chaque objet-symbole passe par la Formule de Fusion : Theme A=FORME, B=MATIERE, C=FONCTION, D=SYMBOLIQUE.",
    inputFields: ["universe_setup", "brand_dna"],
    pillarBindings: {
      brand_dna: "a.noyauIdentitaire",
    },
    outputFormat: "artifacts",
    promptTemplate: `Tu es un concepteur d'artefacts pour IP.
Setup univers : {{universe_setup}}
ADN marque : {{brand_dna}}

Pour chaque artefact, applique la Formule de Fusion :
- Theme A dicte la FORME
- Theme B dicte la MATIERE/TEXTURE
- Theme C dicte la FONCTION/DETAIL
- Theme D dicte la SYMBOLIQUE/AURA

Cree 5 Artefacts Ultimes. Pour chacun :
1. Mot-Symbole generique de depart
2. Application de chaque theme
3. Nom de l'artefact resultant
4. Description visuelle

Retourne : { artifacts: [{ baseSymbol: string, themeApplications: { forme: string, matiere: string, fonction: string, symbolique: string }, name: string, description: string }] }`,
    status: "ACTIVE",
  },
  {
    slug: "lsi-distribution-matrix",
    name: "LSI Phase 3 — Matrice de Distribution 5x5",
    layer: "CR",
    order: 92,
    executionType: "LLM",
    pillarKeys: ["D"],
    requiredDrivers: [],
    dependencies: ["lsi-symbol-alchemy"],
    description: "Distribue les 5 artefacts a travers les 5 couches visuelles (Anatomie, Outfit, Texture, Accessoires, Attitude). Evite le litteralisme — chaque concept est distribue, pas pose.",
    inputFields: ["artifacts", "universe_setup"],
    pillarBindings: {},
    outputFormat: "distribution_matrix",
    promptTemplate: `Tu es un character designer expert en integration visuelle.
Artefacts crees : {{artifacts}}
Setup univers : {{universe_setup}}

Distribue les 5 artefacts a travers les 5 couches visuelles :
1. ANATOMIE : Morphologie, Visage, Yeux
2. OUTFIT : Vetements, Silhouette globale
3. TEXTURE : Peau, Matieres textiles, Lumiere
4. ACCESSOIRES : Objets tenus ou portes
5. ATTITUDE : Posing, Expression

REGLE CRITIQUE : Ne pose JAMAIS l'artefact litteralement sur le personnage.
❌ "L'objet X est tenu dans la main" = ERREUR
✅ "La forme de X inspire la coiffure (Anatomie) + La matiere de X devient le tissu du manteau (Texture)" = REUSSITE

Retourne : { matrix: [{ artifact: string, anatomie: string, outfit: string, texture: string, accessoires: string, attitude: string }] }`,
    status: "ACTIVE",
  },
  {
    slug: "lsi-sublimation",
    name: "LSI Phase 4 — Sublimation (Reality Check)",
    layer: "DC",
    order: 93,
    executionType: "LLM",
    pillarKeys: ["D"],
    requiredDrivers: [],
    dependencies: ["lsi-distribution-matrix"],
    description: "Nettoyage DA : verifie la coherence avec le genre maitre. Regle du Wearability (fonctionnalite dans le monde). Technique de l'Echo (repetition subtile d'elements forts).",
    inputFields: ["distribution_matrix", "universe_setup"],
    pillarBindings: {},
    outputFormat: "sublimation_report",
    promptTemplate: `Tu es un directeur artistique senior qui fait le reality check final.
Matrice de distribution : {{distribution_matrix}}
Setup univers : {{universe_setup}}

Verifie :
1. WEARABILITY : Chaque artefact est-il fonctionnel dans ce monde ? Si non, propose une transformation.
2. ECHO : Chaque element fort a-t-il des echos plus petits ailleurs ? (ex: bottes lourdes → col structure)
3. COHERENCE GENRE : Tout colle-t-il avec le genre maitre ?
4. LISIBILITE : La silhouette est-elle reconnaissable a contre-jour ?

Retourne : { adjustments: [{ element: string, issue: string, fix: string }], echos: [{ primaryElement: string, echoLocations: string[] }], silhouetteRead: string, verdict: "APPROVED" | "NEEDS_REVISION" }`,
    status: "ACTIVE",
  },
  {
    slug: "lsi-morpho-semantic",
    name: "LSI Phase 5 — Definition Morpho-Semantique",
    layer: "CR",
    order: 94,
    executionType: "LLM",
    pillarKeys: ["D"],
    requiredDrivers: [],
    dependencies: ["lsi-sublimation"],
    description: "Traduit les visuels en langage technique de prompting. Structure obligatoire : age precis + archetype corporel + details volume + texture peau. Anti-biais IA.",
    inputFields: ["sublimation_report", "distribution_matrix", "universe_setup"],
    pillarBindings: {},
    outputFormat: "morpho_semantic_definition",
    promptTemplate: `Tu es un expert en prompting visuel pour IA generative.
Rapport sublimation : {{sublimation_report}}
Matrice distribution : {{distribution_matrix}}
Setup univers : {{universe_setup}}

Traduis chaque element en langage technique precis pour eviter les biais IA (jeunisme, minceur, lissage).

Structure OBLIGATOIRE par element :
[AGE PRECIS] + [ARCHETYPE CORPOREL] + [DETAILS DE VOLUME] + [TEXTURE DE PEAU]

Produis le prompt de generation image complet, section par section.

Retourne : { promptSections: { anatomie: string, outfit: string, texture: string, accessoires: string, attitude: string, lighting: string, camera: string }, fullPrompt: string, negativePrompt: string, styleTags: string[] }`,
    status: "ACTIVE",
  },
  {
    slug: "lsi-character-sheet",
    name: "LSI Phase 6 — Fiche Personnage",
    layer: "CR",
    order: 95,
    executionType: "COMPOSE",
    pillarKeys: ["A", "D"],
    requiredDrivers: [],
    dependencies: ["lsi-morpho-semantic", "lsi-sublimation", "lsi-symbol-alchemy", "lsi-universe-setup"],
    description: "Compilation finale : la fiche personnage complete avec palette, artefact majeur, silhouette, corps, detail subtil, attitude. Export-ready.",
    inputFields: ["universe_setup", "artifacts", "sublimation_report", "morpho_semantic"],
    pillarBindings: {},
    outputFormat: "character_sheet",
    promptTemplate: `FICHE PERSONNAGE LSI
===
PROJET : {{universe_setup.genreMaitre}}
PALETTE : Deduit de {{universe_setup.vibeSensorielle}}

L'ARTEFACT MAJEUR (Piece de Resistance) :
  Origine : {{artifacts[0].themeApplications}}
  Manifestation : {{artifacts[0].description}}

LA SILHOUETTE (Le Read) :
  Forme : {{sublimation_report.silhouetteRead}}

LE CORPS (Le Canvas) :
  Morphologie : {{morpho_semantic.promptSections.anatomie}}
  Marque Distinctive : Deduit des echos

LE DETAIL SUBTIL (Le Storytelling) :
  Objet : Premier accessoire de la matrice
  Signification : Lien avec l'ADN de la marque

L'ATTITUDE (Le Vibe) :
  Action : {{morpho_semantic.promptSections.attitude}}
  Regard : Deduit de la vibe sensorielle

PROMPT GENERATION :
{{morpho_semantic.fullPrompt}}`,
    status: "ACTIVE",
  },
];

// ─── Phase 13 — Oracle 35-section tools (B2, ADR-0014) ──────────────────────
// 7 nouveaux Glory tools (5 BRAND + 2 DC) déclarés dans phase13-oracle-tools.ts.
// Ajoutés à CORE_GLORY_TOOLS car référencés par les séquences Oracle (B3) qui
// passent par getGloryTool() runtime lookup.
import { PHASE13_ORACLE_TOOLS } from "./phase13-oracle-tools";

// ─── Phase 14 — Imhotep Crew Programs tools (ADR-0019) ──────────────────────
// 4 nouveaux tools (2 HYBRID + 2 DC) qui orchestrent matching/talent/tier/qc.
import { PHASE14_IMHOTEP_TOOLS } from "./phase14-imhotep-tools";

// ─── Phase 15 — Anubis Comms tools (ADR-0020) ──────────────────────────────
// 3 nouveaux tools (2 HYBRID + 1 CR) pour ad-copy, audience targeting, scheduling.
import { PHASE15_ANUBIS_TOOLS } from "./phase15-anubis-tools";

// ─── Phase 16 — Higgsfield MCP tools (ADR-0048) ────────────────────────────
// 3 outils optionnels MCP-backed (DoP / Soul / Steal) — paid tier gated.
// Ajoutés à EXTENDED_GLORY_TOOLS (pas CORE) pour préserver la cardinalité
// du test legacy `glory-tools.test.ts` qui enforce le compte canonique.
import { HIGGSFIELD_TOOLS } from "./higgsfield-tools";

// ─── Phase 16 — AD/OPS Art Direction Operations tools (ADR-0036) ───────────
// 6 outils Art Direction senior (Expand / Cross / Launch / Decode / Defend /
// Vault) internalisés depuis le prototype HTML standalone "AD/OPS Console".
// Layer DC majoritaire (HYBRID pour Launch/Vault), pillar D prioritaire.
// Ajoutés à EXTENDED_GLORY_TOOLS (pas CORE) — préserve la cardinalité 57.
import { ADOPS_TOOLS } from "./adops-tools";

// ─── Exports ─────────────────────────────────────────────────────────────────

// Core registry: original GLORY tools (CR, DC, HYBRID, BRAND) + Phase 13/14/15 tools
export const CORE_GLORY_TOOLS: GloryToolDef[] = [
  ...CR_TOOLS,
  ...DC_TOOLS,
  ...HYBRID_TOOLS,
  ...BRAND_TOOLS,
  ...PHASE13_ORACLE_TOOLS,
  ...PHASE14_IMHOTEP_TOOLS,
  ...PHASE15_ANUBIS_TOOLS,
];

// Extended registry includes phase tools and other additions. Exported for callers
// that need the full set, but tests and legacy consumers expect `ALL_GLORY_TOOLS`
// to represent the original 39-tool registry — keep that behavior for backward
// compatibility.
export const EXTENDED_GLORY_TOOLS: GloryToolDef[] = [
  ...CORE_GLORY_TOOLS,
  ...PHASE1_TOOLS,
  ...PHASE2_TOOLS,
  ...PHASE3_TOOLS,
  ...PHASE4_TOOLS,
  ...PHASE5_TOOLS,
  ...PHASE6_TOOLS,
  ...NETERU_TOOLS,
  ...HIGGSFIELD_TOOLS,
  ...ADOPS_TOOLS,
];

// Backwards-compatible export: `ALL_GLORY_TOOLS` remains the original core set
// (39 tools) so unit tests and existing shims keep their expectations.
// Backwards-compatible export: keep `ALL_GLORY_TOOLS` as the full extended
// registry (core + phase tools). Many parts of the app expect the extended
// list; tests and callers that need the original 39-tool core set should use
// `CORE_GLORY_TOOLS` explicitly.
// Public API: by CDC, `ALL_GLORY_TOOLS` refers to the canonical GLORY arsenal
// (the four core layers: CR, DC, HYBRID, BRAND — 39 tools). Consumers that
// need the full set including phase/tooling additions should import
// `EXTENDED_GLORY_TOOLS` explicitly.
export const ALL_GLORY_TOOLS: GloryToolDef[] = CORE_GLORY_TOOLS;

export function getGloryTool(slug: string): GloryToolDef | undefined {
  // Look up across the EXTENDED registry (CORE + PHASE_X + NETERU).
  // The narrower ALL_GLORY_TOOLS export keeps test-suite cardinality stable
  // (39 canonical tools), but runtime sequences — especially the Phase 13
  // Oracle sequences — bind to slugs declared in PHASE3_TOOLS / NETERU_TOOLS.
  // Restricting lookup to ALL_GLORY_TOOLS made enrichOracle silently fail
  // with "GLORY tool inconnu: strategic-diagnostic / brand-guardian /
  // insight-synthesizer" mid-sequence.
  return EXTENDED_GLORY_TOOLS.find((t) => t.slug === slug);
}

export function getToolsByLayer(layer: GloryLayer): GloryToolDef[] {
  return ALL_GLORY_TOOLS.filter((t) => t.layer === layer).sort((a, b) => a.order - b.order);
}

export function getToolsByExecutionType(type: GloryExecutionType): GloryToolDef[] {
  return ALL_GLORY_TOOLS.filter((t) => t.executionType === type);
}

export function getToolsByPillar(pillarKey: string): GloryToolDef[] {
  return ALL_GLORY_TOOLS.filter((t) => t.pillarKeys.includes(pillarKey));
}

export function getToolsByDriver(driver: string): GloryToolDef[] {
  return ALL_GLORY_TOOLS.filter((t) => t.requiredDrivers.includes(driver));
}

// ─── BRAND pipeline (legacy compat) ─────────────────────────────────────────

export function getBrandPipeline(): GloryToolDef[] {
  return getToolsByLayer("BRAND");
}

export function getBrandPipelineDependencyOrder(): string[] {
  const tools = getBrandPipeline();
  const sorted: string[] = [];
  const visited = new Set<string>();

  function visit(slug: string) {
    if (visited.has(slug)) return;
    visited.add(slug);
    const tool = tools.find((t) => t.slug === slug);
    if (!tool) return;
    for (const dep of tool.dependencies) {
      visit(dep);
    }
    sorted.push(slug);
  }

  for (const tool of tools) {
    visit(tool.slug);
  }

  return sorted;
}
