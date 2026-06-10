/**
 * One-off: author full French Pillar I (Potentiel) + Pillar S (Stratégie) for
 * "UPgraders / La Fusée" (strategy cmq36gsmg0002fs01ds381c5f), with S.computed
 * (incl. the 3 roadmap routes) produced by the REAL computePillarS so it's
 * consistent with the app. Prints i.json + s.json for the DB INSERTs.
 *
 * Run: DATABASE_URL=postgresql://x:x@localhost:5432/x tsx scratch/gen-upgraders-is.ts
 */
import { computePillarS, computeRoadmapRoutes } from "../src/server/services/rtis-protocols/strategy";

// R risk ids (assigned by position to the existing R.probabilityImpactMatrix).
const R1 = "c1000000-0000-4000-8000-000000000001"; // Key person (Alexandre)
const R2 = "c1000000-0000-4000-8000-000000000002"; // Vol framework ADVE
const R3 = "c1000000-0000-4000-8000-000000000003"; // Engagement LinkedIn
const R4 = "c1000000-0000-4000-8000-000000000004"; // Incompréhension valeur (DAF)
const R5 = "c1000000-0000-4000-8000-000000000005"; // Substitution IA

const I = (n: number) => `d2000000-0000-4000-8000-00000000000${n}`;

const i = {
  totalActions: 7,
  catalogueParCanal: {
    DIGITAL: [
      { id: I(1), action: "Newsletter « Le Système » — capitaliser l'autorité ADVE hors LinkedIn", format: "Newsletter hebdomadaire", objectif: "Posséder l'audience (1ʳᵉ partie) plutôt que la louer à LinkedIn", status: "SELECTED_FOR_ROADMAP", budget: 800000, timeframe: "SPRINT_90", mitigatesRiskIds: [R3], devotionImpact: "PARTICIPANT", overtonShift: "De « gourou LinkedIn » à « média de référence de l'ingénierie de marque »" },
      { id: I(2), action: "Mini-documentaires de transformation client (preuve chiffrée)", format: "Vidéo 3-5 min", objectif: "Rendre tangible le ROI pour les directions financières", status: "SELECTED_FOR_ROADMAP", budget: 1200000, timeframe: "PHASE_1", mitigatesRiskIds: [R4], devotionImpact: "INTERESSE", overtonShift: "De « dépense intangible » à « investissement mesurable »" },
    ],
    PR_INFLUENCE: [
      { id: I(3), action: "Programme « Ambassadeurs Diplômés » — anciens clients certifiés ADVE", format: "Communauté + label", objectif: "Distribution par bouche-à-oreille, indépendante des algorithmes", status: "SELECTED_FOR_ROADMAP", budget: 600000, timeframe: "PHASE_2", mitigatesRiskIds: [R3], devotionImpact: "AMBASSADEUR" },
    ],
    PRODUCTION: [
      { id: I(4), action: "ADVE OS — productiser la méthode en plateforme self-serve", format: "Produit SaaS", objectif: "Réduire la dépendance à Alexandre (scalabilité)", status: "SELECTED_FOR_ROADMAP", budget: 1500000, timeframe: "PHASE_2", mitigatesRiskIds: [R1], devotionImpact: "ENGAGE", overtonShift: "De « cabinet d'une personne » à « système institutionnel »" },
      { id: I(5), action: "Dépôt INPI + marque déposée du framework ADVE/RTIS", format: "Propriété intellectuelle", objectif: "Protéger contre la copie low-cost", status: "SELECTED_FOR_ROADMAP", budget: 400000, timeframe: "SPRINT_90", mitigatesRiskIds: [R2], devotionImpact: "ENGAGE" },
      { id: I(7), action: "Académie ADVE — former et certifier des opérateurs", format: "Formation certifiante", objectif: "Démultiplier la capacité de delivery sans Alexandre", status: "RECOMMENDED", budget: 2000000, timeframe: "LONG_TERM", mitigatesRiskIds: [R1], devotionImpact: "EVANGELISTE" },
    ],
    EVENEMENTIEL: [
      { id: I(6), action: "Masterclass trimestrielle « Ingénierie de Marque » pour CEOs", format: "Événement présentiel", objectif: "Convertir les dirigeants visionnaires en haut de funnel", status: "SELECTED_FOR_ROADMAP", budget: 1000000, timeframe: "PHASE_1", mitigatesRiskIds: [R4], devotionImpact: "INTERESSE" },
    ],
  },
  innovationsProduit: [
    { name: "ADVE OS (self-serve)", type: "EXTENSION_GAMME", description: "Version logicielle de la méthode, accessible sans mission de conseil complète.", feasibility: "MEDIUM", horizon: "MOYEN", devotionImpact: "ENGAGE" },
    { name: "Certification « Brand Engineer »", type: "DIVERSIFICATION", description: "Label professionnel pour les opérateurs formés à ADVE.", feasibility: "HIGH", horizon: "COURT", devotionImpact: "AMBASSADEUR" },
    { name: "Indice ADVE sectoriel", type: "EXTENSION_MARQUE", description: "Benchmark public du score de marque par secteur — autorité + lead-gen.", feasibility: "MEDIUM", horizon: "LONG", devotionImpact: "INTERESSE" },
  ],
  bigIdea: { concept: "L'ingénierie de marque", mechanism: "Transformer un art subjectif (le branding) en système objectif et mesurable (ADVE/RTIS).", insight: "Les dirigeants ne font pas confiance à ce qu'ils ne peuvent pas mesurer.", adaptations: ["Le Score ADVE", "Le diagnostic en 8 piliers", "L'Oracle"] },
  brandPlatform: { name: "La Fusée", benefit: "Faire décoller la marque vers le statut d'icône culturelle", target: "Dirigeants et CMO de PME/scale-ups francophones", competitiveAdvantage: "La seule méthode mathématique de transformation de marque", emotionalBenefit: "La sérénité d'un système prouvé", functionalBenefit: "Un diagnostic et une roadmap chiffrés", supportedBy: "Le framework ADVE/RTIS + l'Oracle" },
  copyStrategy: { promise: "Votre marque, traitée comme un système d'ingénierie.", rtb: "8 piliers, un score, une trajectoire mesurable.", tonOfVoice: "Expert, rigoureux, un brin provocateur", keyMessages: ["Le branding n'est pas un art, c'est une ingénierie.", "Ce qui se mesure se pilote."], doNot: ["Jargon créatif vague", "Promesses non chiffrées"] },
  assetsProduisibles: [
    { asset: "Oracle (document stratégique 35 sections)", type: "DIGITAL", usage: "Livrable client maître" },
    { asset: "Mini-documentaires clients", type: "VIDEO", usage: "Preuve sociale" },
    { asset: "Carrousels LinkedIn pédagogiques", type: "DIGITAL", usage: "Acquisition organique" },
    { asset: "Livre Noir de l'ingénierie de marque", type: "PRINT", usage: "Autorité / lead magnet" },
    { asset: "Templates de diagnostic ADVE", type: "DIGITAL", usage: "Activation prospects" },
    { asset: "Podcast « Système »", type: "AUDIO", usage: "Rétention communauté" },
  ],
  activationsPossibles: [
    { activation: "Masterclass CEOs", canal: "Événementiel", cible: "Dirigeants visionnaires", budgetEstime: "MEDIUM" },
    { activation: "Audit ADVE gratuit (lead magnet)", canal: "Digital", cible: "CMO en quête de KPI", budgetEstime: "LOW" },
    { activation: "Webinaire trimestriel de résultats", canal: "Digital", cible: "Communauté", budgetEstime: "LOW" },
    { activation: "Partenariat incubateurs (Station F)", canal: "PR", cible: "Startups Série A+", budgetEstime: "MEDIUM" },
    { activation: "Remise de prix « Marque-Système de l'année »", canal: "Événementiel", cible: "Écosystème", budgetEstime: "HIGH" },
  ],
  formatsDisponibles: ["Oracle PDF", "Vidéo documentaire", "Carrousel LinkedIn", "Newsletter", "Podcast", "Masterclass", "Template diagnostic"],
  potentielBudget: { production: 2500000, media: 1500000, talent: 1000000, logistics: 500000, technology: 2000000, total: 7500000 },
  mediaPlan: { totalBudget: 1500000, channels: [
    { channel: "LinkedIn (organique + ads)", budget: 600000, percentage: 40, objectif: "Acquisition", kpi: "Leads qualifiés" },
    { channel: "Newsletter / Email", budget: 300000, percentage: 20, objectif: "Nurturing", kpi: "Taux d'ouverture" },
    { channel: "Événementiel", budget: 600000, percentage: 40, objectif: "Conversion CEOs", kpi: "Missions signées" },
  ] },
};

// Minimal R (with ids/status) for computePillarS riskCoverage.
const r = { probabilityImpactMatrix: [
  { id: R1, status: "UNMITIGATED" }, { id: R2, status: "MITIGATED" }, { id: R3, status: "UNMITIGATED" },
  { id: R4, status: "MITIGATED" }, { id: R5, status: "ACCEPTED" },
] };
const t = {
  overtonPosition: { currentPerception: "Consultants chers mais très pointus, perçus comme des designers stratégiques plutôt que des ingénieurs d'affaires." },
  perceptionGap: { targetPerception: "Cabinet d'ingénierie de marque (système objectif).", gapScore: 40 },
};

const roadmap = [
  { phase: "Phase 1 — Fondations", objectif: "Prouver et protéger", objectifDevotion: "spectateur → intéressé", actions: ["Mini-documentaires", "Dépôt INPI", "Newsletter"], duree: "Mois 1-3" },
  { phase: "Phase 2 — Engagement", objectif: "Bâtir la communauté", objectifDevotion: "intéressé → participant", actions: ["Masterclass CEOs", "Ambassadeurs Diplômés"], duree: "Mois 4-6" },
  { phase: "Phase 3 — Système", objectif: "Productiser (réduire la dépendance)", objectifDevotion: "participant → engagé", actions: ["ADVE OS", "Académie ADVE"], duree: "Mois 7-9" },
  { phase: "Phase 4 — Institution", objectif: "Devenir la référence catégorielle", objectifDevotion: "engagé → évangéliste", actions: ["Indice ADVE sectoriel", "Prix Marque-Système"], duree: "Mois 10-12" },
];

const computed = computePillarS({ i, r, t } as Record<string, Record<string, unknown>>, { baseRevenue: 30000000, baseCultIndex: 60, roadmap });

const s = {
  fenetreOverton: {
    perceptionActuelle: "Cabinet de design stratégique : chers mais pointus.",
    perceptionCible: "Cabinet d'ingénierie de marque : un système objectif et mesurable.",
    ecart: "Le marché francophone juge le mot « ingénierie » paradoxal appliqué à la marque — c'est le principal frein à l'achat. À combler par la preuve chiffrée et une communauté engagée.",
    strategieDeplacement: [
      { etape: "Prouver", action: "Diffuser des transformations clients chiffrées", canal: "Digital", horizon: "Q1", devotionTarget: "INTERESSE", riskId: R4 },
      { etape: "Posséder l'audience", action: "Migrer l'autorité de LinkedIn vers la newsletter", canal: "Digital", horizon: "Q1", devotionTarget: "PARTICIPANT", riskId: R3 },
      { etape: "Institutionnaliser", action: "Productiser la méthode (ADVE OS + Académie)", canal: "Produit", horizon: "Q3", devotionTarget: "ENGAGE", riskId: R1 },
    ],
  },
  visionStrategique: "Faire de l'ingénierie de marque une catégorie reconnue dans le monde francophone, et de La Fusée son institution de référence.",
  axesStrategiques: [
    { axe: "Autorité par la preuve", pillarsLinked: ["D", "R", "I"], kpis: ["Nombre de case studies chiffrés", "Score ADVE moyen des prospects"] },
    { axe: "Indépendance algorithmique", pillarsLinked: ["E", "I"], kpis: ["Taille de la newsletter", "% leads hors LinkedIn"] },
    { axe: "Scalabilité du système", pillarsLinked: ["V", "R", "I"], kpis: ["% revenu produit/formation", "Missions livrées sans Alexandre"] },
  ],
  facteursClesSucces: [
    "Transformer la preuve chiffrée en réflexe de communication",
    "Réduire la dépendance à la personne d'Alexandre par la productisation",
    "Diversifier la distribution au-delà de LinkedIn",
  ],
  sprint90Days: [
    { action: "Lancer la newsletter « Le Système »", owner: "Contenu", kpi: "1 000 abonnés", priority: 1, devotionImpact: "PARTICIPANT", sourceInitiativeId: I(1) },
    { action: "Produire 3 mini-documentaires clients", owner: "Studio", kpi: "3 vidéos publiées", priority: 1, devotionImpact: "INTERESSE", isRiskMitigation: true, sourceInitiativeId: I(2) },
    { action: "Déposer le framework ADVE à l'INPI", owner: "Direction", kpi: "Dépôt confirmé", priority: 2, devotionImpact: "ENGAGE", isRiskMitigation: true, sourceInitiativeId: I(5) },
    { action: "Organiser la 1ʳᵉ Masterclass CEOs", owner: "Événementiel", kpi: "20 dirigeants présents", priority: 2, devotionImpact: "INTERESSE", sourceInitiativeId: I(6) },
    { action: "Cadrer le MVP d'ADVE OS", owner: "Produit", kpi: "Specs validées", priority: 3, devotionImpact: "ENGAGE", sourceInitiativeId: I(4) },
  ],
  roadmap,
  budgetBreakdown: { production: 2500000, media: 1500000, talent: 1000000, technology: 2000000, contingency: 500000 },
  teamStructure: [
    { name: "Alexandre Djengue", title: "Fondateur / Brand Engineer", responsibility: "Vision, méthode, missions premium" },
    { name: "Opérateur ADVE (à recruter)", title: "Consultant certifié", responsibility: "Delivery des diagnostics" },
    { name: "Lead Contenu", title: "Éditeur", responsibility: "Newsletter + documentaires" },
  ],
  kpiDashboard: [
    { name: "Progression Devotion Ladder", pillar: "S", target: "+10%/trimestre", frequency: "MONTHLY" },
    { name: "Score ADVE moyen prospects", pillar: "A", target: "≥ 55/100", frequency: "QUARTERLY" },
    { name: "Part de voix « ingénierie de marque »", pillar: "D", target: "Top 1 francophone", frequency: "MONTHLY" },
    { name: "LTV/CAC", pillar: "V", target: "≥ 7", frequency: "MONTHLY" },
    { name: "Taille communauté propriétaire", pillar: "E", target: "5 000 abonnés", frequency: "WEEKLY" },
    { name: "Risques HIGH mitigés", pillar: "R", target: "100%", frequency: "MONTHLY" },
  ],
  northStarKPI: { name: "Progression Devotion Ladder", target: "+10% d'évangélistes/trimestre", frequency: "MONTHLY", currentValue: "À mesurer" },
  selectedFromI: [
    { sourceInitiativeId: I(1), sourceRef: "catalogueParCanal.DIGITAL[0]", action: "Newsletter « Le Système »", phase: "Phase 1", priority: 1 },
    { sourceInitiativeId: I(2), sourceRef: "catalogueParCanal.DIGITAL[1]", action: "Mini-documentaires clients", phase: "Phase 1", priority: 1 },
    { sourceInitiativeId: I(5), sourceRef: "catalogueParCanal.PRODUCTION[1]", action: "Dépôt INPI ADVE", phase: "Phase 1", priority: 2 },
    { sourceInitiativeId: I(6), sourceRef: "catalogueParCanal.EVENEMENTIEL[0]", action: "Masterclass CEOs", phase: "Phase 2", priority: 2 },
    { sourceInitiativeId: I(3), sourceRef: "catalogueParCanal.PR_INFLUENCE[0]", action: "Ambassadeurs Diplômés", phase: "Phase 2", priority: 3 },
    { sourceInitiativeId: I(4), sourceRef: "catalogueParCanal.PRODUCTION[0]", action: "ADVE OS", phase: "Phase 3", priority: 3 },
  ],
  coherenceScore: computed.coherenceScore,
  computed,
};

console.log("=== PILLAR_I ==="); console.log(JSON.stringify(i));
console.log("=== PILLAR_S ==="); console.log(JSON.stringify(s));
console.log("=== ROUTES_PREVIEW ==="); console.log(JSON.stringify(computeRoadmapRoutes({ riskCoverage: 80, selectedInitiativeCount: 6, baseRevenue: 30000000, baseCultIndex: 60 })));
