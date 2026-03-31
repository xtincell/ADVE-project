/**
 * GLORY Tools — 39 Creative Tools Registry
 * 4 Layers: CR (Copywriter), DC (Creative Direction), HYBRID (Operations), BRAND (Visual Identity Pipeline)
 */

export type GloryLayer = "CR" | "DC" | "HYBRID" | "BRAND";

export interface GloryToolDef {
  slug: string;
  name: string;
  layer: GloryLayer;
  order: number;
  pillarKeys: string[];
  requiredDrivers: string[];
  dependencies: string[];
  description: string;
  inputFields: string[];
  outputFormat: string;
  promptTemplate: string;
}

// ==================== LAYER CR — Concepteur-Rédacteur (10 tools) ====================
const CR_TOOLS: GloryToolDef[] = [
  {
    slug: "concept-generator",
    name: "Générateur de Concepts",
    layer: "CR",
    order: 1,
    pillarKeys: ["A", "D"],
    requiredDrivers: [],
    dependencies: [],
    description: "Génère des concepts créatifs à partir du brief et de l'ADN de marque",
    inputFields: ["brief", "brand_dna", "target", "tone", "constraints"],
    outputFormat: "concepts_list",
    promptTemplate: `En tant que concepteur-rédacteur senior, génère 5 concepts créatifs pour ce brief.
Contexte marque : {{brand_dna}}
Brief : {{brief}}
Cible : {{target}}
Ton : {{tone}}
Contraintes : {{constraints}}
Pour chaque concept, fournis : titre, accroche, description (3 lignes), déclinaisons possibles.`,
  },
  {
    slug: "script-writer",
    name: "Scripteur",
    layer: "CR",
    order: 2,
    pillarKeys: ["A", "E"],
    requiredDrivers: ["VIDEO", "TV", "RADIO"],
    dependencies: ["concept-generator"],
    description: "Écrit des scripts pour vidéo, TV et radio",
    inputFields: ["concept", "duration", "format", "tone", "cta"],
    outputFormat: "script",
    promptTemplate: `Écris un script {{format}} de {{duration}} secondes.
Concept : {{concept}}
Ton : {{tone}}
CTA : {{cta}}
Structure : Accroche (3s) → Développement → Climax → CTA.
Format : dialogues, indications de réalisation, musique/SFX.`,
  },
  {
    slug: "long-copy-craftsman",
    name: "Artisan du Long Copy",
    layer: "CR",
    order: 3,
    pillarKeys: ["A", "V"],
    requiredDrivers: ["PRINT", "WEBSITE"],
    dependencies: [],
    description: "Rédige du contenu long-format persuasif",
    inputFields: ["topic", "angle", "target", "length", "cta"],
    outputFormat: "long_copy",
    promptTemplate: `Rédige un texte long-format persuasif sur le sujet : {{topic}}
Angle : {{angle}} | Cible : {{target}} | Longueur : {{length}} mots
Structure narrative : Hook → Problem → Agitation → Solution → Proof → CTA.`,
  },
  {
    slug: "dialogue-writer",
    name: "Dialoguiste",
    layer: "CR",
    order: 4,
    pillarKeys: ["A", "E"],
    requiredDrivers: ["VIDEO", "RADIO"],
    dependencies: [],
    description: "Crée des dialogues naturels et mémorables",
    inputFields: ["scenario", "characters", "tone", "key_message"],
    outputFormat: "dialogue",
    promptTemplate: `Écris un dialogue pour ce scénario :
{{scenario}}
Personnages : {{characters}}
Ton : {{tone}}
Message clé à intégrer naturellement : {{key_message}}`,
  },
  {
    slug: "claim-baseline-factory",
    name: "Usine à Claims & Baselines",
    layer: "CR",
    order: 5,
    pillarKeys: ["D", "V"],
    requiredDrivers: [],
    dependencies: [],
    description: "Génère des slogans, claims et baselines",
    inputFields: ["brand_positioning", "key_benefit", "tone", "constraints"],
    outputFormat: "claims_list",
    promptTemplate: `Génère 10 claims/baselines pour cette marque :
Positionnement : {{brand_positioning}}
Bénéfice clé : {{key_benefit}}
Ton : {{tone}}
Pour chaque proposition : version courte (≤5 mots), version longue (≤10 mots), justification.`,
  },
  {
    slug: "print-ad-architect",
    name: "Architecte Print",
    layer: "CR",
    order: 6,
    pillarKeys: ["D"],
    requiredDrivers: ["PRINT", "OOH"],
    dependencies: ["concept-generator"],
    description: "Conçoit des annonces presse et affiches",
    inputFields: ["concept", "format", "headline", "visual_direction"],
    outputFormat: "print_ad_spec",
    promptTemplate: `Conçois une annonce {{format}} :
Concept : {{concept}}
Headline proposé : {{headline}}
Direction visuelle : {{visual_direction}}
Livrable : layout description, headline, body copy, CTA, indications visuelles.`,
  },
  {
    slug: "social-copy-engine",
    name: "Moteur Copy Social",
    layer: "CR",
    order: 7,
    pillarKeys: ["E"],
    requiredDrivers: ["INSTAGRAM", "FACEBOOK", "TIKTOK", "LINKEDIN"],
    dependencies: [],
    description: "Rédige du contenu optimisé pour chaque plateforme sociale",
    inputFields: ["platform", "content_type", "topic", "tone", "hashtags_strategy"],
    outputFormat: "social_copy_set",
    promptTemplate: `Rédige le copy pour {{platform}} ({{content_type}}) :
Sujet : {{topic}} | Ton : {{tone}}
Stratégie hashtags : {{hashtags_strategy}}
Fournis : copy principal, variantes A/B, hashtags, CTA, heures de publication recommandées.`,
  },
  {
    slug: "storytelling-sequencer",
    name: "Séquenceur Narratif",
    layer: "CR",
    order: 8,
    pillarKeys: ["A", "E"],
    requiredDrivers: [],
    dependencies: ["concept-generator"],
    description: "Structure les arcs narratifs sur plusieurs contenus",
    inputFields: ["story_arc", "episodes", "platform", "frequency"],
    outputFormat: "story_sequence",
    promptTemplate: `Séquence un arc narratif en {{episodes}} épisodes :
Arc : {{story_arc}}
Plateforme : {{platform}} | Fréquence : {{frequency}}
Pour chaque épisode : titre, hook, contenu, cliffhanger, CTA.`,
  },
  {
    slug: "wordplay-cultural-bank",
    name: "Banque Jeux de Mots & Références Culturelles",
    layer: "CR",
    order: 9,
    pillarKeys: ["A", "D"],
    requiredDrivers: [],
    dependencies: [],
    description: "Génère des jeux de mots et références culturelles contextuelles",
    inputFields: ["brand_name", "market", "cultural_context", "language"],
    outputFormat: "wordplay_bank",
    promptTemplate: `Génère une banque de jeux de mots et références culturelles :
Marque : {{brand_name}} | Marché : {{market}}
Contexte culturel : {{cultural_context}} | Langue : {{language}}
Catégories : jeux de mots, références pop culture, expressions locales, double sens.`,
  },
  {
    slug: "brief-creatif-interne",
    name: "Brief Créatif Interne",
    layer: "CR",
    order: 10,
    pillarKeys: ["I"],
    requiredDrivers: [],
    dependencies: [],
    description: "Génère des briefs créatifs structurés pour l'équipe",
    inputFields: ["objective", "target", "key_message", "deliverables", "budget", "deadline"],
    outputFormat: "creative_brief",
    promptTemplate: `Rédige un brief créatif interne :
Objectif : {{objective}} | Cible : {{target}}
Message clé : {{key_message}}
Livrables attendus : {{deliverables}}
Budget : {{budget}} | Deadline : {{deadline}}
Format : contexte, insight, promesse, preuve, ton, do/don't, livrables, timing.`,
  },
];

// ==================== LAYER DC — Direction de Création (8 tools) ====================
const DC_TOOLS: GloryToolDef[] = [
  {
    slug: "campaign-architecture-planner",
    name: "Planificateur d'Architecture de Campagne",
    layer: "DC",
    order: 1,
    pillarKeys: ["I", "E"],
    requiredDrivers: [],
    dependencies: [],
    description: "Planifie l'architecture créative globale d'une campagne",
    inputFields: ["campaign_objectives", "budget", "timeline", "channels", "creative_territory"],
    outputFormat: "campaign_architecture",
    promptTemplate: `Planifie l'architecture créative de la campagne :
Objectifs : {{campaign_objectives}} | Budget : {{budget}}
Timeline : {{timeline}} | Canaux : {{channels}}
Territoire créatif : {{creative_territory}}
Livrable : phases, concepts par phase, déclinaisons par canal, cohérence narrative.`,
  },
  {
    slug: "creative-evaluation-matrix",
    name: "Matrice d'Évaluation Créative",
    layer: "DC",
    order: 2,
    pillarKeys: ["D", "T"],
    requiredDrivers: [],
    dependencies: [],
    description: "Évalue les propositions créatives selon des critères objectifs",
    inputFields: ["proposals", "criteria", "brand_guidelines", "objectives"],
    outputFormat: "evaluation_matrix",
    promptTemplate: `Évalue les propositions créatives :
Propositions : {{proposals}}
Critères : pertinence stratégique, impact créatif, faisabilité, cohérence marque, mémorabilité.
Guidelines marque : {{brand_guidelines}}
Score chaque proposition sur 10 par critère, avec justification.`,
  },
  {
    slug: "idea-killer-saver",
    name: "Idea Killer/Saver",
    layer: "DC",
    order: 3,
    pillarKeys: ["D"],
    requiredDrivers: [],
    dependencies: ["creative-evaluation-matrix"],
    description: "Filtre les idées : kill, save, ou pivot",
    inputFields: ["ideas", "brand_fit", "market_context", "budget_reality"],
    outputFormat: "idea_triage",
    promptTemplate: `Triage les idées créatives :
Pour chaque idée, verdict : KILL (pourquoi), SAVE (pourquoi + renforcement), PIVOT (vers quoi).
Critères : faisabilité, différenciation, cohérence marque, potentiel viral.`,
  },
  {
    slug: "multi-team-coherence-checker",
    name: "Vérificateur de Cohérence Multi-Équipe",
    layer: "DC",
    order: 4,
    pillarKeys: ["D", "I"],
    requiredDrivers: [],
    dependencies: [],
    description: "Vérifie la cohérence créative entre équipes et canaux",
    inputFields: ["team_outputs", "brand_guidelines", "campaign_brief"],
    outputFormat: "coherence_report",
    promptTemplate: `Vérifie la cohérence créative entre les livrables des différentes équipes.
Identifie : incohérences visuelles, tonales, narratives, de message.
Recommande : ajustements pour harmoniser, éléments à conserver.`,
  },
  {
    slug: "client-presentation-strategist",
    name: "Stratège de Présentation Client",
    layer: "DC",
    order: 5,
    pillarKeys: ["V", "E"],
    requiredDrivers: [],
    dependencies: [],
    description: "Structure les présentations créatives pour le client",
    inputFields: ["creative_work", "client_context", "objectives", "concerns"],
    outputFormat: "presentation_strategy",
    promptTemplate: `Structure la présentation client :
Travail créatif : {{creative_work}}
Contexte client : {{client_context}}
Objectifs de la présentation : convaincre, inspirer, rassurer.
Livrable : arc narratif, arguments clés, anticipation des objections, recommandation.`,
  },
  {
    slug: "creative-direction-memo",
    name: "Mémo de Direction Créative",
    layer: "DC",
    order: 6,
    pillarKeys: ["D"],
    requiredDrivers: [],
    dependencies: [],
    description: "Rédige des mémos de direction créative pour guider les équipes",
    inputFields: ["vision", "references", "do_dont", "tone_board"],
    outputFormat: "direction_memo",
    promptTemplate: `Rédige un mémo de direction créative :
Vision : {{vision}}
Références : {{references}}
Do : ... | Don't : ...
Tone board : {{tone_board}}
Format : manifeste court, principes directeurs, exemples, anti-exemples.`,
  },
  {
    slug: "pitch-architect",
    name: "Architecte de Pitch",
    layer: "DC",
    order: 7,
    pillarKeys: ["V", "A"],
    requiredDrivers: [],
    dependencies: [],
    description: "Structure les pitches pour les compétitions et appels d'offres",
    inputFields: ["client_brief", "agency_strengths", "creative_proposal", "budget"],
    outputFormat: "pitch_structure",
    promptTemplate: `Structure le pitch :
Brief client : {{client_brief}}
Forces agence : {{agency_strengths}}
Proposition créative : {{creative_proposal}}
Format : contexte → insight → stratégie → idée → exécution → équipe → budget.`,
  },
  {
    slug: "award-case-builder",
    name: "Constructeur de Cases Awards",
    layer: "DC",
    order: 8,
    pillarKeys: ["T", "E"],
    requiredDrivers: [],
    dependencies: [],
    description: "Construit des dossiers pour les concours publicitaires",
    inputFields: ["campaign_results", "creative_work", "category", "award_criteria"],
    outputFormat: "award_case",
    promptTemplate: `Construis le case study pour soumission aux awards :
Résultats : {{campaign_results}}
Catégorie : {{category}}
Critères : {{award_criteria}}
Format : challenge → insight → idea → execution → results (avec métriques).`,
  },
];

// ==================== LAYER HYBRID — Operations (11 tools) ====================
const HYBRID_TOOLS: GloryToolDef[] = [
  {
    slug: "campaign-360-simulator",
    name: "Simulateur 360° de Campagne",
    layer: "HYBRID",
    order: 1,
    pillarKeys: ["I", "T"],
    requiredDrivers: [],
    dependencies: [],
    description: "Simule l'impact d'une campagne avant lancement",
    inputFields: ["campaign_plan", "budget", "channels", "historical_data"],
    outputFormat: "simulation_report",
    promptTemplate: `Simule la campagne 360° :
Plan : {{campaign_plan}} | Budget : {{budget}}
Canaux : {{channels}}
Projections : reach, engagement, conversions par canal, ROI estimé, risques.`,
  },
  {
    slug: "production-budget-optimizer",
    name: "Optimiseur Budget Production",
    layer: "HYBRID",
    order: 2,
    pillarKeys: ["I"],
    requiredDrivers: [],
    dependencies: [],
    description: "Optimise l'allocation budgétaire de production",
    inputFields: ["deliverables", "budget", "quality_requirements", "timeline"],
    outputFormat: "budget_optimization",
    promptTemplate: `Optimise le budget de production :
Livrables : {{deliverables}} | Budget : {{budget}} XAF
Qualité requise : {{quality_requirements}} | Timeline : {{timeline}}
Recommande : allocation par livrable, alternatives économiques, points de négociation.`,
  },
  {
    slug: "vendor-brief-generator",
    name: "Générateur de Brief Fournisseur",
    layer: "HYBRID",
    order: 3,
    pillarKeys: ["I"],
    requiredDrivers: [],
    dependencies: [],
    description: "Génère des briefs pour les fournisseurs externes",
    inputFields: ["deliverable", "specs", "deadline", "budget", "quality_criteria"],
    outputFormat: "vendor_brief",
    promptTemplate: `Génère un brief fournisseur :
Livrable : {{deliverable}} | Specs : {{specs}}
Deadline : {{deadline}} | Budget : {{budget}} XAF
Format : contexte, livrables attendus, specs techniques, critères de qualité, calendrier, conditions.`,
  },
  {
    slug: "devis-generator",
    name: "Générateur de Devis",
    layer: "HYBRID",
    order: 4,
    pillarKeys: ["V"],
    requiredDrivers: [],
    dependencies: [],
    description: "Génère des devis détaillés pour les clients",
    inputFields: ["services", "pricing", "timeline", "client_info"],
    outputFormat: "devis",
    promptTemplate: `Génère un devis détaillé :
Services : {{services}} | Pricing : {{pricing}}
Timeline : {{timeline}}
Format : ligne par ligne avec description, quantité, prix unitaire, total, conditions.`,
  },
  {
    slug: "content-calendar-strategist",
    name: "Stratège Calendrier Éditorial",
    layer: "HYBRID",
    order: 5,
    pillarKeys: ["I", "E"],
    requiredDrivers: ["INSTAGRAM", "FACEBOOK", "TIKTOK", "LINKEDIN"],
    dependencies: [],
    description: "Planifie le calendrier éditorial multi-plateforme",
    inputFields: ["platforms", "frequency", "themes", "events", "duration"],
    outputFormat: "content_calendar",
    promptTemplate: `Planifie le calendrier éditorial sur {{duration}} :
Plateformes : {{platforms}} | Fréquence : {{frequency}}
Thèmes : {{themes}} | Événements clés : {{events}}
Pour chaque semaine : jours de publication, plateforme, type de contenu, thème, CTA.`,
  },
  {
    slug: "approval-workflow-manager",
    name: "Gestionnaire Workflow d'Approbation",
    layer: "HYBRID",
    order: 6,
    pillarKeys: ["I"],
    requiredDrivers: [],
    dependencies: [],
    description: "Définit et gère les workflows d'approbation",
    inputFields: ["deliverable_type", "stakeholders", "sla", "escalation_rules"],
    outputFormat: "workflow_definition",
    promptTemplate: `Définis le workflow d'approbation pour {{deliverable_type}} :
Parties prenantes : {{stakeholders}}
SLA : {{sla}}
Règles d'escalation : {{escalation_rules}}
Livrable : étapes, approbateurs par étape, SLA par étape, escalation, notifications.`,
  },
  {
    slug: "brand-guardian-system",
    name: "Système Gardien de Marque",
    layer: "HYBRID",
    order: 7,
    pillarKeys: ["D"],
    requiredDrivers: [],
    dependencies: [],
    description: "Vérifie la conformité d'un contenu aux guidelines de marque",
    inputFields: ["content", "brand_guidelines", "channel"],
    outputFormat: "compliance_report",
    promptTemplate: `Vérifie la conformité aux guidelines de marque :
Contenu : {{content}} | Canal : {{channel}}
Vérifie : logo usage, couleurs, typographie, ton de voix, messages interdits, format.
Verdict : CONFORME / NON-CONFORME avec détail des écarts et corrections suggérées.`,
  },
  {
    slug: "client-education-module",
    name: "Module Éducation Client",
    layer: "HYBRID",
    order: 8,
    pillarKeys: ["E", "V"],
    requiredDrivers: [],
    dependencies: [],
    description: "Crée du contenu éducatif pour les clients",
    inputFields: ["topic", "client_level", "format", "objectives"],
    outputFormat: "educational_content",
    promptTemplate: `Crée un module éducatif client :
Sujet : {{topic}} | Niveau : {{client_level}} | Format : {{format}}
Objectifs d'apprentissage : {{objectives}}
Structure : introduction, concepts clés, exemples, exercices pratiques, ressources.`,
  },
  {
    slug: "benchmark-reference-finder",
    name: "Chercheur de Benchmarks & Références",
    layer: "HYBRID",
    order: 9,
    pillarKeys: ["T", "D"],
    requiredDrivers: [],
    dependencies: [],
    description: "Trouve des benchmarks et références créatives pertinents (SESHAT fallback)",
    inputFields: ["sector", "market", "channel", "creative_territory"],
    outputFormat: "benchmark_report",
    promptTemplate: `Trouve des benchmarks et références créatives :
Secteur : {{sector}} | Marché : {{market}} | Canal : {{channel}}
Territoire créatif : {{creative_territory}}
Pour chaque référence : marque, campagne, ce qui fonctionne, applicabilité, source.`,
  },
  {
    slug: "post-campaign-reader",
    name: "Lecteur Post-Campagne",
    layer: "HYBRID",
    order: 10,
    pillarKeys: ["T"],
    requiredDrivers: [],
    dependencies: [],
    description: "Analyse les résultats post-campagne et génère les learnings",
    inputFields: ["campaign_results", "objectives", "budget_spent", "timeline"],
    outputFormat: "post_campaign_report",
    promptTemplate: `Analyse post-campagne :
Résultats : {{campaign_results}} | Objectifs initiaux : {{objectives}}
Budget dépensé : {{budget_spent}} XAF | Timeline : {{timeline}}
Format : résumé exécutif, KPI vs. objectifs, learnings, recommandations next steps.`,
  },
  {
    slug: "digital-planner",
    name: "Planificateur Digital",
    layer: "HYBRID",
    order: 11,
    pillarKeys: ["I", "T"],
    requiredDrivers: ["INSTAGRAM", "FACEBOOK", "TIKTOK", "LINKEDIN", "WEBSITE"],
    dependencies: [],
    description: "Planifie les campagnes digitales (paid + organic)",
    inputFields: ["objectives", "budget", "platforms", "targeting", "duration"],
    outputFormat: "digital_plan",
    promptTemplate: `Planifie la campagne digitale :
Objectifs : {{objectives}} | Budget : {{budget}} XAF
Plateformes : {{platforms}} | Ciblage : {{targeting}} | Durée : {{duration}}
Livrable : allocation par plateforme, formats, ciblages, calendrier, KPI cibles, A/B tests.`,
  },
];

// ==================== LAYER BRAND — Visual Identity Pipeline (10 tools, sequential) ====================
const BRAND_TOOLS: GloryToolDef[] = [
  {
    slug: "semiotic-brand-analyzer",
    name: "Analyseur Sémiotique de Marque",
    layer: "BRAND",
    order: 1,
    pillarKeys: ["A", "D"],
    requiredDrivers: [],
    dependencies: [],
    description: "Analyse sémiotique de l'identité visuelle existante ou du brief",
    inputFields: ["brand_identity", "sector_codes", "cultural_context"],
    outputFormat: "semiotic_analysis",
    promptTemplate: `Analyse sémiotique de la marque :
Identité actuelle : {{brand_identity}}
Codes sectoriels : {{sector_codes}} | Contexte culturel : {{cultural_context}}
Analyse : signifiants, signifiés, connotations, codes culturels, positionnement sémiotique.`,
  },
  {
    slug: "visual-landscape-mapper",
    name: "Cartographe du Paysage Visuel",
    layer: "BRAND",
    order: 2,
    pillarKeys: ["D"],
    requiredDrivers: [],
    dependencies: ["semiotic-brand-analyzer"],
    description: "Cartographie le paysage visuel du secteur et des concurrents",
    inputFields: ["sector", "competitors", "trends"],
    outputFormat: "visual_landscape_map",
    promptTemplate: `Cartographie le paysage visuel :
Secteur : {{sector}} | Concurrents : {{competitors}}
Tendances : {{trends}}
Map : codes visuels dominants, espaces libres, opportunités de différenciation.`,
  },
  {
    slug: "visual-moodboard-generator",
    name: "Générateur de Moodboard Visuel",
    layer: "BRAND",
    order: 3,
    pillarKeys: ["D", "A"],
    requiredDrivers: [],
    dependencies: ["visual-landscape-mapper"],
    description: "Génère les directions de moodboard basées sur l'analyse",
    inputFields: ["semiotic_insights", "landscape_gaps", "brand_values"],
    outputFormat: "moodboard_directions",
    promptTemplate: `Génère 3 directions de moodboard :
Insights sémiotiques : {{semiotic_insights}}
Espaces visuels libres : {{landscape_gaps}}
Valeurs de marque : {{brand_values}}
Pour chaque direction : concept, ambiance, références visuelles, palette suggérée.`,
  },
  {
    slug: "chromatic-strategy-builder",
    name: "Constructeur de Stratégie Chromatique",
    layer: "BRAND",
    order: 4,
    pillarKeys: ["D"],
    requiredDrivers: [],
    dependencies: ["visual-moodboard-generator"],
    description: "Définit la stratégie couleur de la marque",
    inputFields: ["moodboard_direction", "sector_colors", "psychology"],
    outputFormat: "chromatic_strategy",
    promptTemplate: `Construis la stratégie chromatique :
Direction retenue : {{moodboard_direction}}
Couleurs sectorielles : {{sector_colors}}
Psychologie des couleurs : {{psychology}}
Livrable : palette primaire, secondaire, accent, neutres, OKLCH values, ratios d'utilisation.`,
  },
  {
    slug: "typography-system-architect",
    name: "Architecte du Système Typographique",
    layer: "BRAND",
    order: 5,
    pillarKeys: ["D"],
    requiredDrivers: [],
    dependencies: ["chromatic-strategy-builder"],
    description: "Conçoit le système typographique de la marque",
    inputFields: ["brand_personality", "usage_contexts", "accessibility"],
    outputFormat: "typography_system",
    promptTemplate: `Conçois le système typographique :
Personnalité de marque : {{brand_personality}}
Contextes d'usage : {{usage_contexts}}
Accessibilité : {{accessibility}}
Livrable : familles, hiérarchie, échelle, line-height, letter-spacing, web/print specs.`,
  },
  {
    slug: "logo-type-advisor",
    name: "Conseiller en Logotype",
    layer: "BRAND",
    order: 6,
    pillarKeys: ["D", "A"],
    requiredDrivers: [],
    dependencies: ["typography-system-architect"],
    description: "Guide la conception du logotype",
    inputFields: ["brand_name", "brand_values", "typography_system", "chromatic_strategy"],
    outputFormat: "logotype_direction",
    promptTemplate: `Guide la conception du logotype :
Nom : {{brand_name}} | Valeurs : {{brand_values}}
Système typo : {{typography_system}} | Stratégie chromatique : {{chromatic_strategy}}
Livrable : type de logo recommandé, direction stylistique, do/don't, déclinaisons nécessaires.`,
  },
  {
    slug: "logo-validation-protocol",
    name: "Protocole de Validation Logo",
    layer: "BRAND",
    order: 7,
    pillarKeys: ["D"],
    requiredDrivers: [],
    dependencies: ["logo-type-advisor"],
    description: "Évalue et valide les propositions de logo",
    inputFields: ["logo_proposals", "brand_guidelines", "usage_contexts"],
    outputFormat: "logo_validation_report",
    promptTemplate: `Valide les propositions de logo :
Critères : lisibilité (5 tailles), mémorabilité, reproductibilité, cohérence marque, unicité.
Contextes : digital, print, packaging, signalétique, favicon.
Score chaque proposition et recommande la direction finale.`,
  },
  {
    slug: "design-token-architect",
    name: "Architecte de Design Tokens",
    layer: "BRAND",
    order: 8,
    pillarKeys: ["D", "I"],
    requiredDrivers: [],
    dependencies: ["chromatic-strategy-builder", "typography-system-architect"],
    description: "Définit les design tokens pour l'implémentation technique",
    inputFields: ["chromatic_strategy", "typography_system", "spacing", "motion"],
    outputFormat: "design_tokens",
    promptTemplate: `Définis les design tokens :
Couleurs : {{chromatic_strategy}}
Typo : {{typography_system}}
Spacing : {{spacing}} | Motion : {{motion}}
Format : JSON compatible avec Tailwind/CSS variables, avec nommage sémantique.`,
  },
  {
    slug: "motion-identity-designer",
    name: "Designer d'Identité Motion",
    layer: "BRAND",
    order: 9,
    pillarKeys: ["D", "E"],
    requiredDrivers: ["VIDEO"],
    dependencies: ["design-token-architect"],
    description: "Définit l'identité motion de la marque",
    inputFields: ["brand_personality", "design_tokens", "usage_contexts"],
    outputFormat: "motion_identity",
    promptTemplate: `Conçois l'identité motion :
Personnalité : {{brand_personality}}
Tokens : {{design_tokens}}
Contextes : transitions UI, vidéo intro/outro, loading states, micro-interactions.
Livrable : principes (easing, durée, rythme), bibliothèque d'animations, guidelines motion.`,
  },
  {
    slug: "brand-guidelines-generator",
    name: "Générateur de Brand Guidelines",
    layer: "BRAND",
    order: 10,
    pillarKeys: ["D"],
    requiredDrivers: [],
    dependencies: ["design-token-architect", "motion-identity-designer"],
    description: "Compile les guidelines de marque complètes",
    inputFields: ["all_brand_elements"],
    outputFormat: "brand_guidelines",
    promptTemplate: `Compile les brand guidelines complètes :
Sections : mission/vision, logo usage, palette, typographie, photographie, iconographie,
tone of voice, do/don't, templates, applications, design tokens, motion guidelines.
Format : document structuré prêt pour PDF/HTML.`,
  },
];

export const ALL_GLORY_TOOLS: GloryToolDef[] = [...CR_TOOLS, ...DC_TOOLS, ...HYBRID_TOOLS, ...BRAND_TOOLS];

export function getGloryTool(slug: string): GloryToolDef | undefined {
  return ALL_GLORY_TOOLS.find((t) => t.slug === slug);
}

export function getToolsByLayer(layer: GloryLayer): GloryToolDef[] {
  return ALL_GLORY_TOOLS.filter((t) => t.layer === layer).sort((a, b) => a.order - b.order);
}

export function getToolsByPillar(pillarKey: string): GloryToolDef[] {
  return ALL_GLORY_TOOLS.filter((t) => t.pillarKeys.includes(pillarKey));
}

export function getToolsByDriver(driver: string): GloryToolDef[] {
  return ALL_GLORY_TOOLS.filter((t) => t.requiredDrivers.includes(driver));
}

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
