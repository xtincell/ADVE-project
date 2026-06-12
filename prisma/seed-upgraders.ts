/**
 * Seed UPgraders — la stratégie « La Fusée » de l'agence elle-même, ADVE 100 %.
 *
 * Méta-isomorphisme assumé (Cahier des charges Ch.7 §7.3) : UPgraders se
 * pilote comme une marque, dogfooding intégral. Chaque champ des contrats de
 * maturité COMPLETE (A/D/V/E) est rempli avec le contenu canon du corpus
 * blueprint (Livre de la Fusée + Livre de Bord + Cahier des charges détaillé).
 * RTIS seedé en dérivés cohérents (comme le seed Cimencam).
 *
 * Idempotent : upsert par (strategyId, key). Appelé par prisma/seed.ts.
 * Inclut le compte opérateur NEFER (full admin — chantier 7 validation UX).
 */

import type { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

// ── PILIER A — AUTHENTICITÉ (contrat COMPLETE : 35 champs) ─────────────

const PILLAR_A = {
  nomMarque: "La Fusée",
  accroche: "De la Poussière à l'Étoile",
  description:
    "La Fusée est l'Industry OS construit et opéré par UPgraders pour le marché créatif africain francophone : un système d'exploitation d'industrie qui structure, mesure et accélère toute la chaîne de valeur des marques, de l'intake gratuit au statut d'icône culturelle.",
  secteur: "Industry OS / Marketing technologique",
  pays: "CM",
  langue: "fr",
  brandNature: "PLATFORM",
  archetype: "Créateur",
  archetypeSecondary: "Magicien",
  publicCible:
    "Les founders de marques africaines francophones à fort potentiel et faible accès aux infrastructures marketing : entrepreneurs FMCG, marques personnelles, institutions et IP culturelles qui veulent une trajectoire mesurée plutôt que des prestations au feeling.",
  noyauIdentitaire:
    "Nous croyons que chaque marque organique porte un noyau ADVE qui mérite une trajectoire orbitale complète. La Fusée existe pour industrialiser cette ascension : pas de bon sens — du protocole. Le score /200 et la trace hash-chaînée transforment la promesse marketing en obligation d'effet prouvable.",
  citationFondatrice:
    "« On ne vend pas des moyens, on vend un état final mesuré. De la poussière à l'étoile. » — Alexandre Djengue, fondateur d'UPgraders",
  promesseFondamentale:
    "Transformer des marques en icônes culturelles en industrialisant l'accumulation de superfans qui font basculer la fenêtre d'Overton de leur secteur.",
  missionStatement:
    "Fournir au marché créatif africain l'infrastructure méthodologique et technologique (protocole ADVE/RTIS, 7 Neteru, score /200) qui remplace l'artisanat par une trajectoire prouvable, du palier LATENT au palier ICONE.",
  doctrine: {
    texte:
      "La Fusée satellise des marques organiques. Chaque marque garde son noyau ADVE et sa souveraineté ; l'OS fournit la propulsion, la guidance, la télémétrie et le maintien. L'opérateur décide — le système observe, propose, mais ne touche jamais au sang de la marque sans acte humain explicite.",
    dogmas: [
      "Le noyau ADVE ne mute que par OPERATOR_AMEND_PILLAR — jamais de cascade automatique.",
      "Tout échec se constate par le score /200 et la hash-chain, jamais à dire d'expert.",
      "L'altitude acquise reste acquise (Loi 1) — aucune issue ne fait régresser le patrimoine.",
      "Le LLM raconte, il ne calcule pas : prix, scores et gates sont déterministes.",
      "La flotte et la trace sont le moat — pas les outils.",
    ],
  },
  valeurs: [
    { valeur: "Excellence structurée", justification: "L'artisanat ne passe pas à l'échelle sans protocole : 8 phases NEFER, gates de cohérence, contrats de livrables.", rang: 1 },
    { valeur: "Preuve avant promesse", justification: "Score /200, hash-chain, Constat d'Altitude : l'effet devient contractualisable et auditable.", rang: 2 },
    { valeur: "Souveraineté du founder", justification: "La marque appartient au Founder — Brand Vault souverain, portabilité totale, aucune rétention en otage.", rang: 3 },
    { valeur: "Empowerment du talent", justification: "Tarif jour préservé net pour le freelance, progression APPRENTI→ASSOCIÉ via l'Académie.", rang: 4 },
  ],
  herosJourney: [
    { etape: "Appel", description: "Le founder reçoit son premier Oracle léger : sa marque est nommée, son palier LATENT acté." },
    { etape: "Seuil", description: "L'ignition — le paywall comme rituel d'engagement, le Cockpit s'ouvre, le noyau ADVE est formulé (aha moment J0)." },
    { etape: "Épreuves", description: "La cascade A→D→V→E→R→T→I→S, les campagnes, les paliers franchis un à un sous télémétrie Seshat." },
    { etape: "Transformation", description: "CULTE : la masse superfan se concentre, la marque devient gravitationnelle." },
    { etape: "Retour", description: "ICONE : référence patrimoniale du secteur, l'Overton a basculé, la marque rejoint la Coalition Stellaire." },
  ],
  ikigai: {
    love: "Construire des systèmes qui élèvent les créatifs et les marques africaines",
    competence: "Architecture de marque (méthode ADVERTIS) + ingénierie d'un Industry OS gouverné",
    worldNeed: "Le marché créatif africain francophone n'a ni benchmark structuré, ni infrastructure méthodologique, ni preuve d'effet",
    remuneration: "Product ladder par palier (Embarquement → Enterprise), commissions Hub-Escrow dégressives, API billable",
  },
  enemy: {
    nom: "Le marketing jetable",
    description:
      "L'agence à obligation de moyens qui facture de l'activité sans résultat mesuré : campagnes qui meurent à la fin du brief, audiences louées aux plateformes, aucune mémoire, aucune preuve.",
    incarnations: ["La prestation au feeling", "Le rapport PowerPoint sans baseline", "La dépendance Meta/TikTok sans communauté possédée"],
  },
  prophecy: {
    vision: "Le basculement Deloitte 2027 : le marché créatif africain francophone se pilote par la donnée et la preuve d'effet.",
    worldTransformed:
      "Un marché où chaque marque sérieuse connaît son score, possède sa communauté, prouve son histoire — et où les agences sont tenues à l'effet tracé, plus aux moyens allégués.",
    horizon: "2027-2030",
  },
  originMyth: {
    elevator:
      "UPgraders est né du constat d'un fixer : impossible de scaler une méthode au-delà de sa présence physique. La Fusée encode cette méthode — ADVERTIS — dans un OS que la machine opère et que l'humain gouverne.",
    storytelling:
      "D'abord une agence camerounaise qui transformait des marques à la main. Puis le manuel ADVE : quatre questions qui formulent un noyau de marque. Puis l'évidence : ce protocole méritait un système d'exploitation entier — 7 Neteru, un score, une trace infalsifiable. La Fusée est la méthode devenue infrastructure.",
    dateFondation: "2024",
    lieu: "Douala, Cameroun",
  },
  timelineNarrative: {
    jalons: [
      { date: "2024", evenement: "Fondation d'UPgraders, formalisation du manuel ADVE" },
      { date: "2025", evenement: "Premiers retainers structurés (Cimencam) — preuve de la méthode" },
      { date: "2026", evenement: "La Fusée v6 : 7 Neteru actifs, Oracle 35 sections, scoring déterministe /200" },
      { date: "2027", evenement: "Cap : basculement Deloitte — la flotte comme benchmark sectoriel vivant" },
    ],
  },
  livingMythology: {
    pantheon: "7 Neteru actifs (Mestor, Artemis, Seshat, Thot, Ptah, Imhotep, Anubis) — cap 7/7 strict",
    rituels: ["L'ignition (paywall rituel)", "Le Constat d'Altitude", "La Pesée des Intents"],
    vocabulaireSacre: ["palier", "noyau ADVE", "superfan", "fenêtre d'Overton", "la Sève", "hash-chain"],
  },
  equipeDirigeante: [
    { nom: "Alexandre Djengue (Xtincell)", role: "CEO / Concepteur de la méthode ADVERTIS", competences: ["stratégie de marque", "architecture produit", "business development Afrique"] },
    { nom: "NEFER", role: "Opérateur expert (LLM) — exécution des Intents, cohérence narrative et technique", competences: ["ingénierie logicielle", "gouvernance APOGEE", "production documentaire"] },
  ],
  equipeComplementarite: {
    analyse: "Binôme vision×exécution : le fondateur tient la doctrine et le marché ; l'opérateur NEFER tient le protocole et la profondeur d'exécution. Gap assumé : commercial terrain à recruter au palier Group.",
    score: 7.5,
  },
  messieFondateur: {
    nom: "Alexandre Djengue",
    legitimite: "Fixer reconnu du marché créatif camerounais ; la méthode ADVE est née de ses missions réelles, pas d'un framework importé.",
    roleNarratif: "Le bâtisseur qui transforme son artisanat en infrastructure pour tous.",
  },
  competencesDivines: [
    { competence: "Formulation de noyau de marque (ADVE)", preuve: "Manuel ADVE 4 piliers ; aha moment < 1 session à l'ignition" },
    { competence: "Industrialisation de la production créative", preuve: "139 Glory tools, 57 sequences, forge Ptah multi-providers" },
    { competence: "Mesure de l'effet culturel", preuve: "Score /200 8 dimensions, Cult Index, Devotion Ladder, Overton tracking" },
  ],
  hierarchieCommunautaire: {
    niveaux: ["Visiteur (intake)", "Founder embarqué (Cockpit)", "Talent de la Guilde (APPRENTI→ASSOCIÉ)", "Agence partenaire", "Membre de la Coalition Stellaire"],
    principe: "Chaque rang se gagne par la trace, jamais par déclaration.",
  },
  preuvesAuthenticite: [
    "Le repo et la doctrine sont gouvernés par les règles que l'OS vend (dogfooding intégral — méta-isomorphisme).",
    "Cimencam opéré en retainer réel avec pillars VALIDATED et score auditable.",
    "Tarifs publiés en FCFA, pensés mobile money d'abord — pas une copie de SaaS américain.",
  ],
  indexReputation: { score: 6.8, source: "Référents marché Douala/Abidjan + NPS clients pilotes", date: "2026-05" },
  eNps: { score: 45, sample: 11, date: "2026-05" },
  turnoverRate: 0.08,
} as const;

// ── PILIER D — DISTINCTION (contrat COMPLETE : 20 champs) ──────────────

const PILLAR_D = {
  positionnement:
    "Le premier Industry OS du marché créatif africain francophone : ni agence, ni SaaS marketing — un opérateur de mission à obligation d'effet tracé, qui pilote des marques du palier LATENT au palier ICONE sur un score /200 auditable.",
  positionnementEmotionnel:
    "La fierté de bâtir une icône africaine avec la rigueur d'un programme spatial : le founder cesse de subir le marketing, il pilote une trajectoire.",
  promesseMaitre:
    "Nous transformons votre marque en icône culturelle par l'accumulation industrialisée de superfans — et nous le prouvons : score /200, trace infalsifiable, Constat d'Altitude à l'horizon contractuel.",
  sousPromesses: [
    { promesse: "Votre noyau de marque formulé dès la première session", preuve: "Aha moment J0 : Identity/Positioning/Proposition/Engagement restitués à l'ignition" },
    { promesse: "Chaque franc CFA tracé vers l'effet", preuve: "Thot : cost gate, budgets runtime, fuel par campagne" },
    { promesse: "Votre communauté vous appartient", preuve: "Brand Vault souverain : la liste superfans est au Founder, portable, jamais à l'Agence" },
    { promesse: "Des délais opposables", preuve: "Table SLA par tier (brief 4h en Pro, Oracle complet 5j) avec pénalités d'avoir" },
  ],
  personas: [
    {
      nom: "Le Founder bâtisseur (FMCG/PME)",
      insightCle: "Il paie des agences depuis des années sans pouvoir prouver ce que sa marque a gagné.",
      motivations: ["score /200 et paliers lisibles", "preuve d'effet pour son board/banquier", "communauté possédée"],
      barriers: ["budget marketing irrégulier", "méfiance envers les promesses d'agence"],
    },
    {
      nom: "La marque personnelle en ascension",
      insightCle: "Son audience vit chez Meta/TikTok ; elle ne possède rien de sa propre gravité.",
      motivations: ["Devotion Ladder nominale", "drops pilotés", "patrimoine de contenu qui s'auto-entretient"],
      barriers: ["temps disponible", "peur de l'industrialisation qui lisse la voix"],
    },
    {
      nom: "Le directeur marketing corporate (basculement Deloitte)",
      insightCle: "Il doit justifier chaque budget devant un comité qui ne croit plus aux métriques de vanité.",
      motivations: ["benchmark sectoriel vivant", "due diligence marketing auditable", "SLA contractuels"],
      barriers: ["conformité données (RGPD/Malabo)", "processus achats"],
    },
  ],
  tonDeVoix: {
    personnalite: ["Autoritaire", "Visionnaire", "Précis", "Aéronautique"],
    onDit: ["palier", "trajectoire", "ignition", "score /200", "superfans", "obligation d'effet", "protocole"],
    onNeDitPas: ["buzz", "viral garanti", "petite agence", "feeling créatif", "best-in-class"],
  },
  assetsLinguistiques: {
    languePrincipale: "fr",
    slogan: "De la Poussière à l'Étoile",
    tagline: "L'Industry OS qui transforme des marques en icônes culturelles",
    naming: "Vocabulaire strict : aéronautique + divin égyptien + astrophysique (NAMING_CANON v3.3)",
    lexique: ["La Fusée", "le Cockpit", "la Console", "le Launchpad", "les Neteru", "la Sève", "l'Oracle"],
  },
  paysageConcurrentiel: [
    { nom: "Agences 360 locales", type: "Agence classique", faiblesse: "Obligation de moyens, zéro mémoire, zéro score — l'ennemi déclaré (marketing jetable)." },
    { nom: "SaaS marketing américains (HubSpot, Sprout…)", type: "Outil", faiblesse: "Pricing USD/Stripe inadapté, aucun opérateur, aucune méthode de marque, zéro ancrage FCFA/mobile money." },
    { nom: "Cabinets de conseil (Big4 locaux)", type: "Conseil", faiblesse: "Frameworks génériques en PowerPoint, pas d'exécution, pas de forge, pas de communauté." },
    { nom: "Freelances premium", type: "Talent isolé", faiblesse: "Talent réel mais sans télémétrie, sans escrow, sans continuité — La Fusée les enrôle dans la Guilde plutôt que de les combattre." },
  ],
  swotFlash: {
    forces: ["Méthode propriétaire ADVE/RTIS éprouvée en retainer réel", "Le seul score /200 + hash-chain du marché", "Pricing FCFA mobile-money natif"],
    faiblesses: ["Notoriété naissante hors Cameroun", "Équipe cœur réduite (scalabilité par le régime de confiance)"],
    opportunites: ["Vide total de benchmark sectoriel en Afrique francophone", "Basculement data des directions marketing (Deloitte 2027)"],
    menaces: ["Arrivée d'un acteur international localisé", "Coût des LLM (mitigé : 95 % des outils déterministes)"],
  },
  barriersImitation: [
    { barriere: "La flotte", explication: "Le miroir sectoriel exige N marques dans un substrat unifié — un concurrent part de zéro marque." },
    { barriere: "La trace", explication: "Hash-chain + score canonique : la preuve d'effet ne se rattrape pas rétroactivement (attesté ≠ prouvé)." },
    { barriere: "Le corpus doctrinal", explication: "90+ ADRs, 7 Neteru gouvernés, contrats de maturité : copier l'UI ne copie pas la gouvernance." },
  ],
  archetypalExpression: {
    createur: "L'OS forge des assets, des campagnes, des communautés — la création industrialisée sans perte d'âme (gates de cohérence ADVE).",
    magicien: "La transformation mesurable : poussière → étoile, LATENT → ICONE, déclaré → prouvé.",
  },
  directionArtistique: {
    univers: "Panda noir/bone + rouge fusée — sobriété technique ponctuée d'accents d'ignition",
    principes: ["Instrumentation avant décoration (le Cockpit est un poste de pilotage)", "Densité par portail (compact Console, editorial Argos)", "Tokens 4 tiers, zéro couleur brute"],
  },
  proofPoints: [
    "Oracle 35 sections généré et audité de bout en bout (v6.25.13) — compilable même sans LLM.",
    "Score déterministe /200 à variance nulle (ADR-0086 + ADR-0090).",
    "SLA chiffrés par tier avec barème de pénalités (Cahier des charges Ch.4).",
  ],
  sacredObjects: [
    { objet: "L'Oracle", role: "La carte stellaire complète de la marque — le livrable qui convertit" },
    { objet: "Le Constat d'Altitude", role: "La preuve contractuelle de l'EFR à l'horizon" },
    { objet: "Le Brand Vault", role: "Le coffre souverain du patrimoine de marque" },
  ],
  symboles: [
    { symbole: "La fusée", sens: "La trajectoire pilotée — jamais une montgolfière au vent" },
    { symbole: "L'étoile", sens: "Le palier ICONE : brillance propre, gravité culturelle" },
    { symbole: "L'œil égyptien", sens: "La télémétrie qui voit tout, la gouvernance qui pèse tout" },
  ],
  esov: { shareOfVoice: 4, shareOfMarket: 2, excess: 2, commentaire: "ESOV positif volontaire en phase capture-then-grow (The Upgrade + Argos)" },
  storyEvidenceRatio: { story: 0.45, evidence: 0.55, commentaire: "La preuve d'abord : score, SLA, trace — le récit cosmologique au service de la rigueur." },
} as const;

// ── PILIER V — VALEUR (contrat COMPLETE : 25 champs) ───────────────────

const PILLAR_V = {
  promesseDeValeur:
    "Un état final mesuré plutôt que des moyens : palier visé, score cible, horizon — avec recours contractuels si l'effet n'est pas au rendez-vous.",
  produitsCatalogue: [
    { nom: "Intake gratuit", description: "Reconnaissance et nomination de la marque (palier, archétype, manques)", prix: "0 FCFA" },
    { nom: "PDF Oracle léger", description: "Diagnostic structuré one-shot étalonné benchmarks sectoriels", prix: "5 000 – 25 000 FCFA" },
    { nom: "Embarquement", description: "Premier abonnement Cockpit — noyau ADVE formulé, J0→J7 garanti", prix: "15 000 – 25 000 FCFA/mois" },
    { nom: "Starter", description: "Cockpit + briefs sous SLA + rapports mensuels", prix: "50 000 – 75 000 FCFA/mois" },
    { nom: "Pro", description: "Forge d'assets, Oracle complet 35 sections, recommandations continues", prix: "200 000 – 300 000 FCFA/mois" },
    { nom: "Group", description: "Multi-marques, souveraineté renforcée, service apogée", prix: "500 000 – 1 000 000 FCFA/mois" },
    { nom: "Enterprise", description: "Sur devis — résidence stricte des données, SLA 1h, équipe dédiée", prix: "Sur devis" },
  ],
  productLadder: [
    { tier: "INTAKE_FREE", palier: "Tout visiteur", role: "capture" },
    { tier: "INTAKE_PDF", palier: "LATENT→FRAGILE", role: "conversion one-shot" },
    { tier: "COCKPIT_MONTHLY", palier: "FRAGILE", role: "embarquement" },
    { tier: "RETAINER_BASE", palier: "ORDINAIRE", role: "croissance" },
    { tier: "RETAINER_PRO", palier: "FORTE", role: "industrialisation" },
    { tier: "RETAINER_ENTERPRISE", palier: "CULTE/ICONE", role: "apogée" },
  ],
  businessModel:
    "Product ladder par palier (abonnements FCFA recalculés par zone) + commission Hub-Escrow dégressive (20 %→8 % avec la maturité) + API billable (MCP metering) + one-shots Oracle. Capture-then-grow : on capture l'ambition, pas la fortune.",
  economicModels: [
    { modele: "Abonnement (SaaS opéré)", part: 0.55 },
    { modele: "Commission marketplace (Hub-Escrow)", part: 0.25 },
    { modele: "One-shot (Oracle léger/complet)", part: 0.12 },
    { modele: "API usage (MCP billable)", part: 0.08 },
  ],
  unitEconomics: {
    cac: 18000,
    ltv: 540000,
    ltvCacRatio: 30,
    margeBrute: 0.78,
    paybackPeriodMois: 2,
    commentaire: "CAC FCFA faible (intake organique + Argos) ; LTV portée par la rétention retainer et la montée de palier.",
  },
  pricingJustification:
    "Prix de référence par tier (zone étalon Dakar/Abidjan) modulés runtime par l'indice de marché composite (coût de la vie 0.40 + pouvoir d'achat 0.40 + CPM sectoriel 0.20), plancher au coût de service, plafond de raison par tier, overlays TVA + frais mobile money. Jamais de grille statique : le devis fige et hash-chaîne les versions d'indices (Cahier des charges Ch.6).",
  personaSegmentMap: [
    { persona: "Founder bâtisseur", segment: "PME/FMCG Afrique centrale & ouest", tierCible: "Starter→Pro" },
    { persona: "Marque personnelle", segment: "Créateurs/figures publiques", tierCible: "Embarquement→Starter" },
    { persona: "Directeur marketing corporate", segment: "Groupes & institutions", tierCible: "Group→Enterprise" },
  ],
  sacrificeRequis: {
    founder: "Co-pilotage réel : statuer sur les amendements, tenir la cadence, maintenir le carburant (mesuré par l'ICP).",
    agence: "Renoncer aux marges de l'opacité : tout est tracé, les pénalités SLA sont automatiques.",
  },
  packagingExperience: {
    onboarding: "Séquence J0→J7 à livrables garantis (noyau ADVE J0, brief J1, asset J2-J3, score baseline J6, premier vol J7)",
    livraison: "Cockpit temps réel (NSP SSE) + rapports périodiques + Oracle vivant",
    rituelsCommerciaux: ["Constat d'Altitude à chaque horizon EFR", "Value Report trimestriel", "Revue de palier"],
  },
  positioningArchetype: "PREMIUM_ACCESSIBLE",
  salesChannel: "Direct (Launchpad public + équipe fondatrice) ; partenariats agences en Crew Quarters",
  freeLayer: {
    contenu: "Intake gratuit : nomination du palier, archétype, cartographie des manques",
    objectif: "Capturer l'ambition et alimenter le funnel PDF → Embarquement",
    limite: "Aucun accès Cockpit sans ignition (le seuil payant est constitutif)",
  },
  mvp: {
    statut: "DÉPASSÉ — v6.25 : OS gouverné 7 Neteru, Oracle 35 sections, scoring déterministe, paiements CinetPay/Stripe",
    perimetre: "Funnel intake→PDF→Cockpit + retainer opéré (Cimencam) + forge Ptah",
  },
  proprieteIntellectuelle: {
    methode: "ADVERTIS / ADVE-RTIS — marque et corpus propriétaires UPgraders",
    code: "La Fusée OS — propriétaire (licence SaaS aux founders, cession des livrables)",
    donnees: "La marque au Founder, l'apparatus à l'Agence, l'agrégat anonymisé k≥5 au pool (Ch.9)",
  },
  valeurMarqueTangible: [
    "MRR multi-tiers en FCFA",
    "Commission Hub-Escrow sur le GMV missions",
    "Base de connaissance sectorielle cross-brand (KnowledgeEntry country-scoped)",
  ],
  valeurMarqueIntangible: [
    "Position de catégorie : « le premier Industry OS africain »",
    "La trace accumulée — chaque mission renforce la preuve du modèle",
    "Le réseau Guilde + agences partenaires",
  ],
  valeurClientTangible: [
    "Score /200 et paliers auditables (due diligence marketing)",
    "Assets forgés cédés en propriété pleine",
    "SLA chiffrés avec pénalités d'avoir automatiques",
  ],
  valeurClientIntangible: [
    "Charge mentale rendue (régime de pilotage à 5 crans)",
    "Fierté d'une trajectoire d'icône documentée",
    "Communauté possédée — plus jamais locataire de son audience",
  ],
  coutMarqueTangible: ["Compute LLM (réduit : 95 % d'outils déterministes + Headroom)", "Infra Vercel/Supabase", "Commissions providers paiement"],
  coutMarqueIntangible: ["Exigence doctrinale permanente (zéro drift toléré)", "Responsabilité d'obligation d'effet"],
  coutClientTangible: ["Abonnement mensuel FCFA", "Carburant Thot des re-forges de caprice (Ch.5 §5.3)"],
  coutClientIntangible: ["Co-pilotage exigé (ICP tracé)", "Transparence : le score dit la vérité, même quand elle déplaît"],
  roiProofs: [
    { preuve: "Cimencam : 8 piliers VALIDATED, composite 126/200 (FORTE), retainer actif", type: "cas client" },
    { preuve: "Time-to-aha < 1 session mesuré sur le funnel d'ignition", type: "métrique produit" },
    { preuve: "LTV/CAC 30:1 sur la cohorte pilote", type: "unit economics" },
  ],
  experienceMultisensorielle: {
    visuel: "DS panda noir/bone + rouge fusée, instrumentation de cockpit",
    verbal: "Lexique aéronautique-divin strict (NAMING_CANON)",
    sonore: "Signature d'ignition sur les jalons franchis (NSP)",
  },
} as const;

// ── PILIER E — ENGAGEMENT (contrat COMPLETE : 23 champs) ───────────────

const PILLAR_E = {
  promesseExperience:
    "Piloter sa marque comme on pilote un vaisseau : chaque mouvement de sève visible en temps réel, chaque décision pesée, chaque palier célébré — la charge mentale devient un réglage.",
  primaryChannel: "Cockpit (web app) — le pont de pilotage du founder",
  touchpoints: [
    { canal: "Launchpad (intake public)", type: "Acquisition", stadeAarrr: "Acquisition" },
    { canal: "Cockpit", type: "Pilotage quotidien", stadeAarrr: "Retention" },
    { canal: "WhatsApp Business", type: "Relation opérateur + notifications", stadeAarrr: "Retention" },
    { canal: "Argos (média public)", type: "Références curées du secteur", stadeAarrr: "Acquisition" },
    { canal: "The Upgrade (newsletter)", type: "Éditorial stratégique", stadeAarrr: "Activation" },
    { canal: "Crew Quarters", type: "Portail talents & agences", stadeAarrr: "Referral" },
  ],
  channelTouchpointMap: [
    { canal: "Cockpit", touchpoints: ["dashboard score", "Notoria (propositions)", "Jehuty (actualité)", "vault d'assets", "rapports"] },
    { canal: "WhatsApp", touchpoints: ["alertes NSP", "relances J2/J4/J6", "validation de briefs"] },
    { canal: "Argos", touchpoints: ["dossiers de référence publiés", "cartographie des coalitions"] },
  ],
  rituels: [
    { nom: "L'ignition", frequence: "une fois", description: "Le paywall rituel : l'acte payant qui ouvre le Cockpit et formule le noyau (aha moment)" },
    { nom: "Le premier vol J0→J7", frequence: "une fois", description: "Sept jours, cinq plans ouverts, sept cases cochées hash-chaînées" },
    { nom: "La revue d'altitude", frequence: "mensuelle", description: "Score, trajectoire, recommandations — le founder à la barre" },
    { nom: "Le Constat d'Altitude", frequence: "par horizon EFR", description: "ATTEINT/PARTIEL/ÉCHEC calculé, recours déclenché mécaniquement" },
  ],
  sacredCalendar: {
    quotidien: "Télémétrie Seshat + feed Jehuty",
    hebdomadaire: "Digest NSP + revue des recos Notoria",
    mensuel: "Retainer Report + revue d'altitude",
    annuel: "Re-calibration EFR + cérémonie de palier",
  },
  aarrr: {
    acquisition: "Intake gratuit (3 portes) + Argos + The Upgrade",
    activation: "Aha moment J0 : noyau ADVE restitué en session d'ignition",
    retention: "J7 premier vol complet ; régime ASSISTÉ ; relances tracées J2/J4/J6",
    revenue: "Montée de tier au fil des paliers ; commission Hub-Escrow ; API billable",
    referral: "Superfans du programme d'évangélisation + cumulativité multi-rôle (−10/−15/−20 %)",
  },
  kpis: [
    { kpi: "Time-to-aha", cible: "< 1 session", famille: "activation" },
    { kpi: "Taux d'activation J7", cible: "> 60 %", famille: "activation" },
    { kpi: "Rétention J30", cible: "> 80 %", famille: "retention" },
    { kpi: "Taux de montée de palier (flotte)", cible: "> 25 %/an", famille: "effet" },
    { kpi: "Taux de succès EFR", cible: "ATTEINT+PARTIEL > 85 %", famille: "effet" },
    { kpi: "Coût par superfan recruté", cible: "décroissant par cohorte", famille: "comms" },
  ],
  superfanPortrait: {
    personaRef: "Le Founder bâtisseur",
    profile: "Founder qui a vécu sa montée de palier, parle en vocabulaire Fusée (« mon score », « mon palier ») et défend la méthode devant ses pairs.",
    motivations: ["fierté de la trajectoire prouvée", "appartenance à la flotte", "accès anticipé aux nouveaux instruments"],
    barriers: ["temps", "peur de l'outil au début (levée par le régime ASSISTÉ)"],
  },
  ladderProductAlignment: [
    { niveau: "Spectateur", produit: "Argos + The Upgrade (gratuit)" },
    { niveau: "Intéressé", produit: "Intake + PDF Oracle léger" },
    { niveau: "Participant", produit: "Embarquement (Cockpit)" },
    { niveau: "Engagé", produit: "Starter/Pro (retainer)" },
    { niveau: "Ambassadeur", produit: "Group + programme de référence" },
    { niveau: "Évangéliste", produit: "Coalition Stellaire + co-marketing" },
  ],
  conversionTriggers: [
    { fromLevel: "Spectateur", toLevel: "Intéressé", trigger: "Dossier Argos sectoriel pertinent + CTA diagnostic" },
    { fromLevel: "Intéressé", toLevel: "Participant", trigger: "PDF Oracle : la cartographie des manques rend l'ignition évidente" },
    { fromLevel: "Participant", toLevel: "Engagé", trigger: "Premier vol J7 réussi + première montée de score" },
    { fromLevel: "Engagé", toLevel: "Ambassadeur", trigger: "Constat d'Altitude ATTEINT + invitation flotte" },
    { fromLevel: "Ambassadeur", toLevel: "Évangéliste", trigger: "Co-publication du cas + rôle dans la Coalition" },
  ],
  programmeEvangelisation: {
    nom: "L'Équipage de Propagation",
    mecanique: "Chaque founder ATTEINT devient une preuve publique (avec consentement) : cas Argos, témoignage chiffré, parrainage à remise croisée.",
    recompenses: ["réduction multi-rôle", "visibilité Argos", "accès Coalition Stellaire"],
  },
  communityBuilding: {
    espaces: ["Upgraded Brands Club (founders)", "La Guilde (talents)", "Coalition Stellaire (marques non concurrentes)"],
    principe: "Connexion racinaire, pas fusion : chaque marque garde sa souveraineté, le pool partage l'abstrait anonymisé.",
  },
  principesCommunautaires: [
    "La preuve avant l'opinion (on débat données en main)",
    "Pas de concurrence intra-coalition (secteurs non rivaux)",
    "Réciprocité du miroir : on n'est dans le benchmark que si l'on y contribue",
  ],
  taboos: [
    "Acheter des followers ou toute métrique de vanité",
    "Toucher au noyau ADVE d'autrui",
    "Publier une donnée de marque identifiable sans opt-in",
  ],
  ritesDePassage: [
    { rite: "L'ignition", passage: "visiteur → pilote" },
    { rite: "Le premier vol complet (7 cases J7)", passage: "pilote → équipage" },
    { rite: "Le franchissement de palier", passage: "cérémonie de montée, badge tier" },
    { rite: "L'entrée en Coalition", passage: "marque → constellation" },
  ],
  productExperienceMap: [
    { produit: "PDF Oracle léger", experience: "La révélation : ma marque a un nom de famille stellaire et un palier" },
    { produit: "Cockpit", experience: "Le contrôle : je vois tout, je valide tout, rien ne bouge sans moi" },
    { produit: "Oracle complet", experience: "La carte : 35 sections qui font de ma stratégie un objet physique" },
    { produit: "Hub-Escrow", experience: "La confiance : talents qualifiés, jalons séquestrés, QC par les pairs" },
  ],
  barriersEngagement: [
    { barriere: "Littératie digitale variable", levee: "Régime ASSISTÉ par défaut + WhatsApp comme canal miroir" },
    { barriere: "Connectivité irrégulière", levee: "Rapports PDF téléchargeables + notifications asynchrones" },
    { barriere: "Méfiance contractuelle", levee: "EFR avec recours écrits + portabilité totale à la sortie" },
  ],
  gamification: {
    score: "Le /200 EST le jeu — chaque action montre son delta",
    badges: ["palier (LATENT→ICONE)", "premier vol", "streak de cadence", "rang Devotion"],
    classements: "Miroir sectoriel anonymisé (percentile, jamais le nom des pairs)",
  },
  commandments: [
    { commandement: "Tu ne mutileras pas ton noyau sur un caprice", source: "Pesée OPERATOR_AMEND_PILLAR" },
    { commandement: "Tu tiendras ta cadence ou ton ICP en témoignera", source: "Ch.1 co-responsabilité" },
    { commandement: "Tu posséderas ta communauté", source: "Brand Vault souverain" },
  ],
  sacraments: [
    { sacrement: "L'Oracle", moment: "L'entrée dans la connaissance de soi" },
    { sacrement: "Le premier asset forgé", moment: "La première chose que je peux montrer" },
    { sacrement: "Le Constat d'Altitude", moment: "Le jugement par la mesure" },
  ],
  clergeStructure: {
    operateurs: "Opérateurs UPgraders (Console) — gardiens du protocole",
    maitres: "Talents MAÎTRE/ASSOCIÉ de la Guilde — QC par les pairs",
    conseil: "Le fondateur + NEFER — gardiens de la doctrine",
  },
  pelerinages: [
    { evenement: "Salon des marques africaines (annuel)", role: "La flotte se rencontre physiquement" },
    { evenement: "Cérémonie des paliers (trimestrielle, en ligne)", role: "Les montées sont célébrées publiquement" },
  ],
} as const;

// ── RTIS dérivés (cohérents avec le seed Cimencam) ─────────────────────

const PILLAR_R = {
  globalSwot: {
    strengths: ["Méthode propriétaire prouvée en retainer réel", "Déterminisme radical (coût LLM marginal)", "Ancrage FCFA/mobile money natif"],
    weaknesses: ["Notoriété hors Cameroun naissante", "Dépendance au binôme fondateur"],
    opportunities: ["Marché sans benchmark structuré", "Basculement data des directions marketing", "API billable (MCP) comme second moteur de revenu"],
    threats: ["Acteur international localisé", "Cycle budgétaire des PME en zone CEMAC"],
  },
  probabilityImpactMatrix: [
    { id: "risk-upg-001", risk: "Concentration revenus sur peu de retainers", probability: "MEDIUM", impact: "HIGH", mitigation: "Product ladder bas (Embarquement) + API billable pour élargir la base", status: "MITIGATING" },
    { id: "risk-upg-002", risk: "Churn post-ignition si activation ratée", probability: "MEDIUM", impact: "HIGH", mitigation: "Séquence J0→J7 à livrables garantis + filet anti-abandon J2/J4/J6", status: "MITIGATED" },
    { id: "risk-upg-003", risk: "Dérive doctrinale du code (drift)", probability: "LOW", impact: "HIGH", mitigation: "1800+ tests anti-drift CI + protocole NEFER 8 phases", status: "MITIGATED" },
  ],
  resilienceScore: 72,
} as const;

const PILLAR_T = {
  triangulation: {
    customerInterviews: "Founders pilotes : le besoin n°1 est la preuve (score, trace) avant le volume de livrables.",
    competitiveAnalysis: "Aucun acteur ne combine méthode + OS + opérateur + marketplace en Afrique francophone — la catégorie est vide.",
    trendAnalysis: "Mobile money > 60 % des paiements digitaux en zone UEMOA/CEMAC ; directions marketing en bascule data.",
    financialBenchmarks: "Retainers agences locaux 150k–1M FCFA/mois ; SaaS importés inaccessibles (USD, CB).",
  },
  hypothesisValidation: [
    { hypothesis: "Un founder paie 5-25k FCFA pour un diagnostic structuré", validationMethod: "Funnel intake live", status: "VALIDATED", evidence: "Conversions PDF Oracle sur le funnel pilote" },
    { hypothesis: "Le score /200 est un argument de rétention", validationMethod: "Cohorte retainer", status: "TESTING", evidence: "Cimencam renouvelé ; échantillon à élargir" },
  ],
  marketReality: {
    macroTrends: ["Explosion création de marques locales", "Bascule mobile money", "Exigence de preuve dans les budgets marketing"],
    weakSignals: ["Premiers appels d'offres exigeant des KPIs auditables", "Talents seniors quittant les agences 360"],
  },
  tamSamSom: {
    tam: { value: 120000, description: "Marques actives Afrique francophone (toutes tailles)" },
    sam: { value: 18000, description: "Marques structurées CEMAC+UEMOA avec budget marketing régulier" },
    som: { value: 600, description: "Cible 3 ans : 0,5 % du SAM via capture-then-grow" },
  },
  brandMarketFitScore: 78,
} as const;

const PILLAR_I = {
  catalogueParCanal: {
    DIGITAL: [
      { id: "init-upg-001", action: "Programme éditorial The Upgrade (newsletter hebdo)", format: "newsletter", objectif: "Autorité + acquisition organique", status: "SELECTED_FOR_ROADMAP", timeframe: "SPRINT_90", budgetEstime: "LOW", pilierImpact: "E" },
      { id: "init-upg-002", action: "Publication des dossiers Argos (références curées)", format: "média public", objectif: "Preuve de regard sectoriel", status: "SELECTED_FOR_ROADMAP", timeframe: "SPRINT_90", budgetEstime: "LOW", pilierImpact: "D" },
    ],
    EVENT: [
      { id: "init-upg-003", action: "Cérémonie trimestrielle des paliers", format: "événement en ligne", objectif: "Rétention + évangélisation", status: "SELECTED_FOR_ROADMAP", timeframe: "PHASE_1", budgetEstime: "MEDIUM", pilierImpact: "E" },
    ],
    PARTENARIAT: [
      { id: "init-upg-004", action: "Programme agences partenaires (Crew Quarters)", format: "B2B2B", objectif: "Distribution via le réseau", status: "RECOMMENDED", timeframe: "PHASE_2", budgetEstime: "MEDIUM", pilierImpact: "V" },
    ],
  },
  innovationsProduit: [
    { nom: "MCP billable (API metering)", description: "Facturer la plateforme via les calls d'API", horizon: "H2" },
    { nom: "Miroir sectoriel vivant", description: "Benchmark temps réel cross-brand k-anonyme", horizon: "H3" },
  ],
  totalActions: 4,
} as const;

const PILLAR_S = {
  visionStrategique:
    "Faire de La Fusée l'infrastructure par défaut du marché créatif africain francophone : chaque marque sérieuse connaît son score, possède sa communauté, prouve sa trajectoire.",
  roadmap: [
    { phase: "Phase 1 — Preuve (2026)", objectif: "10 marques en retainer, funnel intake rentable, Oracle sans LLM", jalons: ["Cimencam ATTEINT", "5 cas publiés Argos"] },
    { phase: "Phase 2 — Flotte (2027)", objectif: "Miroir sectoriel actif (k≥5 par secteur clé), Coalition pilote", jalons: ["50 marques", "1ère Coalition Stellaire"] },
    { phase: "Phase 3 — Basculement (2028)", objectif: "Référence catégorie : le score /200 cité dans les appels d'offres", jalons: ["150 marques", "3 zones actives"] },
  ],
  sprint90Days: [
    { action: "Boucler le funnel paiement (CinetPay+Stripe) bout-en-bout", owner: "NEFER", priorite: 1 },
    { action: "Publier les pages conformité B2B (DPA/CGV/SLA/Trust Center)", owner: "NEFER", priorite: 2 },
    { action: "Lancer The Upgrade + 3 dossiers Argos", owner: "Alexandre", priorite: 3 },
  ],
  teamStructure: {
    actuel: "Fondateur (vision/commercial) + NEFER (opérateur expert) + Guilde freelance à la mission",
    cible: "Ajout : 1 opérateur de flotte + 1 officier Hub-Escrow au seuil de 20 marques",
  },
  fenetreOverton: {
    perceptionActuelle: "Une agence tech camerounaise ambitieuse parmi les agences",
    perceptionCible: "L'Industry OS de référence — la catégorie qu'on cite quand on parle de marques africaines pilotées par la preuve",
    ecart: "Passer du prestataire à l'infrastructure : la bascule se joue sur la flotte visible et les cas chiffrés publiés",
    strategieDeplacment: [
      { etape: "Prouver", action: "Publier les Constats d'Altitude des marques pilotes (avec consentement)" },
      { etape: "Outiller", action: "Ouvrir le miroir sectoriel aux contributeurs (réciprocité)" },
      { etape: "Normaliser", action: "Le score /200 dans les appels d'offres via les directions marketing converties" },
    ],
  },
} as const;

// ── Entrée principale ──────────────────────────────────────────────────

export async function seedUpgraders(prisma: PrismaClient): Promise<void> {
  const operator = await prisma.operator.findUnique({ where: { slug: "upgraders" } });
  if (!operator) throw new Error("Operator 'upgraders' must be seeded before seedUpgraders()");

  // ── Compte NEFER — opérateur expert full admin (chantier 7) ──
  const nefer = await prisma.user.upsert({
    where: { email: "nefer@upgraders.io" },
    update: { role: "ADMIN", operatorId: operator.id },
    create: {
      name: "NEFER",
      email: "nefer@upgraders.io",
      hashedPassword: await bcrypt.hash("imm0rtel", SALT_ROUNDS),
      role: "ADMIN",
      operatorId: operator.id,
    },
  });
  console.log(`[OK] User NEFER (full admin): ${nefer.email}`);

  // ── Client + Strategy UPgraders (méta-isomorphisme) ──
  let client = await prisma.client.findFirst({
    where: { operatorId: operator.id, name: "UPgraders" },
  });
  if (!client) {
    client = await prisma.client.create({
      data: {
        name: "UPgraders",
        sector: "Industry OS / Marketing technologique",
        country: "CM",
        contactName: "Alexandre Djengue",
        contactEmail: "alexandre@upgraders.com",
        operatorId: operator.id,
      },
    });
  }

  let strategy = await prisma.strategy.findFirst({
    where: { operatorId: operator.id, name: "La Fusée — Industry OS" },
  });
  if (!strategy) {
    strategy = await prisma.strategy.create({
      data: {
        name: "La Fusée — Industry OS",
        description:
          "La stratégie de marque d'UPgraders elle-même — dogfooding intégral (méta-isomorphisme, Cahier des charges Ch.7 §7.3).",
        status: "ACTIVE",
        clientId: client.id,
        userId: nefer.id,
        operatorId: operator.id,
        businessContext: {
          sector: "Industry OS / Marketing technologique",
          country: "CM",
          businessModel: "SAAS",
          positioningArchetype: "PREMIUM_ACCESSIBLE",
        } as Prisma.InputJsonValue,
      },
    });
  }
  console.log(`[OK] Strategy UPgraders: ${strategy.name} (${strategy.id})`);

  // ── 8 piliers ADVE 100 % + RTIS dérivés ──
  const pillars: Array<{ key: string; content: unknown; confidence: number }> = [
    { key: "a", content: PILLAR_A, confidence: 0.92 },
    { key: "d", content: PILLAR_D, confidence: 0.9 },
    { key: "v", content: PILLAR_V, confidence: 0.9 },
    { key: "e", content: PILLAR_E, confidence: 0.88 },
    { key: "r", content: PILLAR_R, confidence: 0.8 },
    { key: "t", content: PILLAR_T, confidence: 0.78 },
    { key: "i", content: PILLAR_I, confidence: 0.75 },
    { key: "s", content: PILLAR_S, confidence: 0.85 },
  ];

  for (const p of pillars) {
    const pillar = await prisma.pillar.upsert({
      where: { strategyId_key: { strategyId: strategy.id, key: p.key } },
      update: { content: p.content as Prisma.InputJsonValue, confidence: p.confidence, validationStatus: "VALIDATED" },
      create: {
        strategyId: strategy.id,
        key: p.key,
        content: p.content as Prisma.InputJsonValue,
        confidence: p.confidence,
        validationStatus: "VALIDATED",
      },
    });
    const existingVersion = await prisma.pillarVersion.findFirst({
      where: { pillarId: pillar.id, version: 1 },
    });
    if (!existingVersion) {
      await prisma.pillarVersion.create({
        data: {
          pillarId: pillar.id,
          version: 1,
          content: p.content as Prisma.InputJsonValue,
          author: "seed",
          reason: "Seed UPgraders — ADVERTIS 100 % (méta-isomorphisme)",
        },
      });
    }
  }
  console.log("[OK] UPgraders : 8 piliers ADVE/RTIS seedés (contrats COMPLETE couverts)");
}
