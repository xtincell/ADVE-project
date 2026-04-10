/**
 * Seed SPAWT — Documentation ADVE-RTIS Complète (Schema-Compliant)
 *
 * Source: SPAWT_Presentation_Fevrier_2026_V2-2.docx + FORMULAIRE ADVE SPAWT REVISE-3.xlsx
 * Ingestion LLM-in-the-middle : Claude agit en LLM, toutes les données sont pré-calculées.
 * Mission 1 terrain: COMPLÉTÉE (mars 2026)
 *
 * Tous les champs suivent les Zod schemas de pillar-schemas.ts avec les enums taxonomies.ts
 *
 * Usage: npx tsx scripts/seed-spawt-complete.ts
 */

import { PrismaClient, type Prisma } from "@prisma/client";

const db = new PrismaClient();

// Semantic scorer — try dynamic import, fallback to inline if @/ paths don't resolve
type ScorerResult = { pillarScores: Array<{ pillarKey: string; score: number }>; composite: number; classification: string };
type ScorerFn = (pillars: Array<{ key: string; content: unknown }>) => ScorerResult;

function fallbackScorer(pillars: Array<{ key: string; content: unknown }>): ScorerResult {
  const scores = pillars.map((p) => {
    const content = p.content as Record<string, unknown>;
    const fieldCount = Object.keys(content).length;
    const score = Math.min(25, Math.round(fieldCount * 1.5 * 10) / 10);
    return { pillarKey: p.key.toUpperCase(), score };
  });
  const composite = scores.reduce((sum, s) => sum + s.score, 0);
  const classification = composite >= 160 ? "CULTE" : composite >= 120 ? "LEGENDAIRE" : composite >= 80 ? "REMARQUABLE" : "ORDINAIRE";
  return { pillarScores: scores, composite, classification };
}

async function loadScorer(): Promise<ScorerFn> {
  try {
    const mod = require("../src/server/services/advertis-scorer/semantic");
    return mod.scoreAllPillarsSemantic;
  } catch {
    console.warn("⚠  Semantic scorer not importable — using fallback scorer");
    return fallbackScorer;
  }
}

const ADMIN_USER_ID = "cmnduezi0000201hwddl1qwvr";

// ── Pilier A — Authenticité ────────────────────────────────────────────────
// Schema: PillarASchema (pillar-schemas.ts)
// Enums: ARCHETYPES, SCHWARTZ_VALUES, DEVOTION_LEVELS

const PILLAR_A = {
  // Identité — archetype must be from ARCHETYPES enum
  archetype: "EXPLORATEUR" as const,
  archetypeSecondary: "CREATEUR" as const,
  citationFondatrice: "\"Ne plus jamais regretter un restaurant. Spawté.\" — Stéphanie Bidje, fondatrice SPAWT, 2020. Le fichier Excel de 47 spots est devenu un système d'identité culinaire.",
  noyauIdentitaire: "SPAWT est né d'un moment de frustration réel : Stéphanie Bidje, Camerounaise fraîchement arrivée à Abidjan en plein COVID, crée un fichier Excel de 47 spots pour ne plus gaspiller un repas. Ce fichier devient une app. SPAWT n'est pas un guide restaurant — c'est un système d'identité culinaire. L'app ne te dit pas où aller, elle révèle qui tu es à travers ce que tu manges, où tu vas, comment tu vis. Le chat mascotte ne suit pas — il renifle.",

  // Hero's Journey — HeroJourneyActSchema: { actNumber, title, narrative (100+ chars), emotionalArc, causalLink? }
  herosJourney: [
    {
      actNumber: 1 as const,
      title: "Le Fichier — Abidjan, COVID 2020",
      narrative: "Stéphanie arrive à Abidjan en plein COVID dans une ville inconnue avec 15 000+ restaurants et aucun filtre intelligent. Elle crée un fichier Excel de 47 spots pour elle et ses amies. Pas de vision entrepreneuriale — de la survie culinaire pure. Ce fichier deviendra la première version de SPAWT, avant même que le nom existe.",
      emotionalArc: "Frustration → Débrouillardise → Satisfaction discrète",
    },
    {
      actNumber: 2 as const,
      title: "Le Message WhatsApp — L'anniversaire 2021",
      narrative: "Une amie envoie un message de remerciement pour une recommandation de restaurant le jour de son anniversaire. Stéphanie réalise que ce fichier Excel a une valeur pour les autres. Le prototype informel devient une intention de produit. Le moment 'aha' n'est pas technologique — il est humain et émotionnel.",
      emotionalArc: "Surprise → Révélation → Ambition naissante",
      causalLink: "Le feedback positif inattendu transforme un outil personnel en opportunité de produit",
    },
    {
      actNumber: 3 as const,
      title: "La Construction du Système — 2022-2024",
      narrative: "Tests avec le réseau proche, validation du problème (>2x/semaine pour 70%+ des foodies Abidjan, frustration 7+/10). Construction du Système Palais des Saveurs (5 axes bipolaires, 13 archétypes, 5 stades de maturité). Résolution des 8 tensions fondatrices (identité vs utilité, badges vs titres, paywall géo vs accessibilité). La vision s'impose : SPAWT n'est pas un guide, c'est un révélateur d'identité.",
      emotionalArc: "Doute → Persévérance → Conviction croissante",
      causalLink: "La validation terrain confirme le problème et justifie la complexité du système Palais",
    },
    {
      actNumber: 4 as const,
      title: "Mission 1 Terrain — Février-Mars 2026",
      narrative: "20-30 interviews foodies qualifiés, 20 restaurants validés en 6 catégories (Date Night, Dabali, Boys, Nouveaux, Hype, Réticents). Planning terrain 7 jours. Go/No-Go data-driven. 26 interviews réalisées. 78% confirment fréquence >2x/semaine. Frustration moyenne 7.8/10. 72% intention usage. 14/20 restaurants intéressés B2B. Le Bo Zinc prêt à signer Gold. MISSION COMPLÉTÉE AVEC SUCCÈS.",
      emotionalArc: "Tension → Validation → Euphorie contrôlée",
      causalLink: "Tous les seuils de validation dépassés — Go confirmé, le concept devient réalité commerciale",
    },
    {
      actNumber: 5 as const,
      title: "Le Lancement — 2026 et au-delà",
      narrative: "MVP badges en développement (8-12 jours), beta privé 100 Spawters prévu avril 2026, premiers archétypes Palais révélés. ARR M12 cible 30M FCFA. Expansion multi-villes en horizon 2027 (Dakar, Douala, Lagos). Vision : SPAWT comme OS de la vie sociale culinaire africaine premium. Le fichier Excel de 47 spots est devenu une langue.",
      emotionalArc: "Confiance → Ambition mesurée → Vision à long terme",
      causalLink: "Le succès de Mission 1 débloque le financement et le lancement public",
    },
  ],

  // Ikigai — BrandIkigaiSchema: { love, competence, worldNeed, remuneration } (each 50+ chars)
  ikigai: {
    love: "SPAWT aime révéler l'identité culinaire des gens — pas leur noter des restaurants, mais leur montrer qui ils sont à travers leurs choix alimentaires. Le chat qui renifle plutôt que de suivre : une philosophie de l'instinct contre la conformité.",
    competence: "SPAWT excelle dans la curation contextuelle et le matching instinctif : un algorithme 4 dimensions (Palais×ADN, historique, profils similaires/colonie, contexte) qui génère des scores de correspondance à 92%. Pas de note en étoiles — une révélation d'identité.",
    worldNeed: "Abidjan a 15 000+ restaurants, zéro filtre intelligent basé sur l'identité. Google Maps traite les utilisateurs comme des consommateurs anonymes. Les foodies 18-39 ans veulent appartenir à une tribu culinaire, pas remplir un formulaire. SPAWT répond au besoin de reconnaissance et de communauté dans l'acte de manger.",
    remuneration: "Modèle freemium B2C (0 → 2500 FCFA/mois, 24000/an) + B2B 3 paliers (Libre 0 / Pro 15K / Gold 65K FCFA/mois). Marges brutes 70-80%. ARR M12 cible 30M FCFA (~45K EUR). Network effects : plus de Spawters = meilleur algo = plus de valeur B2B.",
  },

  // Valeurs Schwartz — BrandValueSchema: { value: SCHWARTZ_VALUES, customName, rank, justification (50+), costOfHolding (30+), tensionWith? }
  valeurs: [
    {
      value: "SECURITE" as const,
      customName: "Simplicité radicale",
      rank: 1,
      justification: "Le manifeste SPAWT : 'Nous tuons le temps perdu à chercher où sortir manger.' 3 taps, 1 spot. L'interface ne demande pas — elle propose. La simplicité n'est pas une contrainte UX, c'est la promesse centrale. Stéphanie Bidje est The Simplifier avant d'être The Curator.",
      costOfHolding: "Sacrifier des fonctionnalités puissantes mais complexes au nom de la simplicité. Chaque feature ajoutée doit passer le test : 'est-ce que ça reste 3 taps ?'",
      tensionWith: ["STIMULATION" as const],
    },
    {
      value: "UNIVERSALISME" as const,
      customName: "Honnêteté culinaire",
      rank: 2,
      justification: "Le Code Spawter règle 2 : 'Partager honnêtement.' Le système à 3 couches (Nom public / Palais Radar personnel / Voix du Chat intime) garantit que les avis reflètent la réalité, pas la pression sociale. Fake Review = Faux-Pas #1, expulsion de la communauté.",
      costOfHolding: "Modération constante requise. Risque de perdre des Spawters qui préfèrent le consensus social à la vérité culinaire.",
      tensionWith: ["POUVOIR" as const],
    },
    {
      value: "BIENVEILLANCE" as const,
      customName: "Partage communautaire",
      rank: 3,
      justification: "SPAWT sans Meute n'existe pas. La Colonie (colonie de chats) est le modèle social fondateur. Les Coups de Cœur sont une monnaie sociale rare indexée sur la maturité. Le viral coefficient B2C cible 1.4 grâce au partage organique. Spawter en squad est une règle du Code, pas une option.",
      costOfHolding: "La communauté demande de l'entretien constant. Les dynamiques de groupe peuvent créer du gatekeeping ou de l'exclusion si mal gérées.",
      tensionWith: ["ACCOMPLISSEMENT" as const],
    },
    {
      value: "TRADITION" as const,
      customName: "Authenticité des lieux",
      rank: 4,
      justification: "La Pépite Vérifiée, le badge Institution, la Table Diverse — SPAWT certifie les restaurants qui méritent leur réputation, pas ceux qui achètent leur visibilité. Les 5 signaux spéciaux (Coup de Cœur, Pépite, Institution, Fidélité, Découverte) ne s'achètent pas — ils se gagnent.",
      costOfHolding: "Le refus de la monétisation des badges limite les revenus court terme. Chaque certification demande une validation terrain coûteuse.",
    },
    {
      value: "AUTONOMIE" as const,
      customName: "Identité avant utilité",
      rank: 5,
      justification: "La 8ème tension résolue dans le document fondateur : 'Utilité vs Identité — L'IDENTITÉ GAGNE.' SPAWT aurait pu être un outil utilitaire. Il a choisi d'être un miroir. Le nom calculé (pas choisi), le titre mérité (pas acheté), le Palais révélé (pas configuré) : chaque fonctionnalité renforce l'identité.",
      costOfHolding: "L'identité est plus complexe à vendre que l'utilité. Le message marketing doit constamment éduquer le marché sur la différence.",
      tensionWith: ["CONFORMITE" as const],
    },
  ],

  // Hiérarchie — CommunityLevelSchema: { level: DEVOTION_LEVELS, description (30+), privileges (30+), entryCriteria? }
  hierarchieCommunautaire: [
    {
      level: "EVANGELISTE" as const,
      description: "Pioneer — Stéphanie Bidje, fondatrice, 33 ans, Camerounaise expatriée Abidjan. Background BD/Tech/E-commerce (Jumia, Auchan). PRINCE2 certifiée. The Simplifier + The Curator. La vision et la voix de SPAWT.",
      privileges: "Contrôle total sur la direction produit, le dialecte, les partenariats stratégiques. Droit de veto sur toute décision qui compromet l'identité SPAWT.",
      entryCriteria: "Fondatrice unique — non-réplicable",
    },
    {
      level: "AMBASSADEUR" as const,
      description: "Co-Pilots — Kidam (Tech/Dev) et Alexandre (Ops/Marketing). Bras droits opérationnels. Présents terrain Mission 1 (D4 Texas Grillz/Kayser Diamond avec Kidam, D3 Sam's avec Alexandre). Exécution quotidienne.",
      privileges: "Accès admin complet, décisions opérationnelles autonomes, représentation SPAWT en terrain. Participation aux décisions stratégiques avec la Pioneer.",
      entryCriteria: "Sélection directe par la Pioneer — confiance absolue requise",
    },
    {
      level: "ENGAGE" as const,
      description: "Alliés Stratégiques — KB (conseil stratégique), Bridge Factory (production contenu/marketing). Partenaires externes qui amplifient la mission sans être dans l'opérationnel quotidien.",
      privileges: "Accès premium gratuit, co-branding autorisé, participation aux workshops stratégiques. Visibilité dans les crédits SPAWT.",
      entryCriteria: "Valeur ajoutée démontrée + alignement avec les valeurs SPAWT",
    },
    {
      level: "PARTICIPANT" as const,
      description: "Spawters actifs — les foodies B2C (18-39 ans, Abidjan) et restaurants B2B (Pro/Gold). Ceux qui construisent la colonie au quotidien par leurs avis, partages et check-ins. Le cœur battant de SPAWT.",
      privileges: "Accès aux rituels, accumulation de Paws, progression dans les niveaux de maturité (Touriste→Guide). Les Spawters construisent le réseau de valeur auto-renforçant.",
      entryCriteria: "Téléchargement app + onboarding Palais des Saveurs complété (3-5 min)",
    },
  ],

  // Timeline narrative — { origine, transformation, present, futur } (each 50+ chars)
  timelineNarrative: {
    origine: "2020, Abidjan. Stéphanie arrive en plein COVID dans une ville inconnue. 15 000 restaurants, aucun filtre intelligent. Elle crée un fichier Excel de 47 spots pour elle et ses amies. Ce fichier devient la première version de SPAWT — avant même que le nom existe.",
    transformation: "2021 : un message WhatsApp d'anniversaire révèle que le fichier a une valeur réelle. Pivot de 'outil personnel' à 'produit'. 2022-2024 : construction du Système Palais (5 axes bipolaires, 13 archétypes, 5 stades de maturité), résolution des 8 tensions fondatrices. La vision s'impose : SPAWT n'est pas un guide, c'est un révélateur d'identité.",
    present: "Mars 2026 : Mission 1 COMPLÉTÉE — 26 interviews foodies réalisées, 20 restaurants validés (6 catégories : Date Night, Dabali, Boys, Nouveaux, Hype, Réticents). Go/No-Go = GO. 78% fréquence >2x/sem, frustration 7.8/10, 72% intention usage. 14/20 restaurants intéressés B2B. MVP badges en développement.",
    futur: "Expansion multi-villes design portable 'zéro énergie' (les archetypes et le système Palais s'exportent sans reconfiguration). Dakar, Douala, Lagos dans l'horizon 2027. Nouveau BU hébergement (club/loisirs) identifié en workshop. Vision : SPAWT comme OS de la vie sociale culinaire africaine premium.",
  },

  // Extensions mouvement — prophecy, enemy, doctrine, livingMythology
  prophecy: {
    worldTransformed: "Dans un monde SPAWT, chaque foodie africain urbain connaît son archétype culinaire. 'Je suis un Djidji' sera aussi naturel que 'j'ai 4.8 sur Uber.' Les 13 archétypes du Palais des Saveurs seront le Myers-Briggs de la gastronomie africaine. Chaque ville aura sa carte de saveurs vivante, alimentée par sa communauté.",
    pioneers: "Les 100 premiers Spawters beta d'Abidjan — des foodies passionnés qui mangent dehors >2x/semaine et veulent transformer leur instinct culinaire en identité. Stéphanie Bidje, Alexandre/Kidam, KB de Bridge Factory.",
    urgency: "La scène food africaine explose (Instagram, TikTok) mais aucun système ne structure l'identité culinaire. Google Maps commoditise. Si SPAWT ne prend pas la place maintenant, un acteur tech occidental le fera sans la sensibilité culturelle africaine.",
    horizon: "3 ans pour Abidjan. 5 ans pour 5 villes africaines. 10 ans pour devenir le standard continental.",
  },
  enemy: {
    name: "Le Goumin",
    manifesto: "Le Goumin est le regret post-mauvais restaurant. Le temps gaspillé à hésiter. Le repas décevant qui ruine une soirée. L'argent perdu sur un restaurant surfait. La confiance trahie par un avis Google bidonné. Le Goumin prospère dans l'ignorance, l'indécision et le conformisme culinaire.",
    narrative: "Chaque jour à Abidjan, des milliers de foodies vivent le Goumin. 45 minutes dans un groupe WhatsApp pour choisir un restaurant. Un spot Instagram qui déçoit à l'arrivée. Un maquis fermé sans préavis. Le Goumin ne dort jamais — il attend chaque repas pour frapper. SPAWT est né pour le tuer.",
    enemySchwartzValues: ["CONFORMITE" as const, "TRADITION" as const],
    overtonMap: {
      ourPosition: "L'identité culinaire est un droit — chaque foodie mérite un système qui le connaît, pas un moteur de recherche anonyme",
      enemyPosition: "Les notes en étoiles et les avis anonymes suffisent pour choisir un restaurant — pas besoin de personnalisation",
      battleground: "La confiance dans les recommandations food : algorithme identitaire vs agrégation d'avis",
      shiftDirection: "De 'je cherche un bon restaurant' vers 'mon chat a trouvé un spot qui me correspond' — shift de la recherche passive vers la révélation active",
    },
    enemyBrands: [
      { name: "Google Maps", howTheyFight: "Commoditise la recherche food — traite chaque utilisateur comme un point GPS anonyme, pas comme une identité culinaire" },
      { name: "TripAdvisor/Yelp", howTheyFight: "Notes moyennes qui récompensent la conformité — les 5 étoiles vont aux spots génériques, pas aux pépites de niche" },
      { name: "Influenceurs food Instagram", howTheyFight: "Hype éphémère sans profondeur — un post viral ne garantit pas la compatibilité avec ton palais" },
    ],
    activeOpposition: [
      "Google Maps investit massivement dans les avis locaux en Afrique — chaque avis anonyme renforce le Goumin",
      "Les influenceurs food créent des files d'attente artificielles dans des spots surfaits — déconnexion hype/qualité",
      "Les restaurateurs achètent des avis positifs — corruption du signal de confiance",
    ],
    passiveOpposition: [
      "L'habitude du bouche-à-oreille WhatsApp est profondément ancrée — 'mon groupe me suffit'",
      "La résistance culturelle à partager ses spots secrets — 'si tout le monde y va, ça sera gâté'",
      "L'absence d'infrastructure de données food structurées en Afrique de l'Ouest",
    ],
    counterStrategy: {
      marketingCounter: "Le matching à 92% de SPAWT bat le bouche-à-oreille WhatsApp. 3 taps au lieu de 45 minutes de débat. L'archétype calculé au lieu de l'avis biaisé d'un influenceur. Chaque Spawt réussi est un Goumin tué. Le système Palais des Saveurs crée une taxonomie que Google ne peut pas répliquer — elle est culturellement ancrée.",
      alliances: [
        "Les Spawters eux-mêmes — chaque avis honnête renforce le système contre le Goumin",
        "Bridge Factory — contenu authentique vs hype vide",
        "Les restaurants partenaires — visibilité méritée vs achetée",
        "Les collectifs food locaux (Abidjan Bouffe, etc.) — validation communautaire",
      ],
    },
    fraternityFuel: {
      sharedHatred: "La haine commune du Goumin soude les Spawters. Chaque mauvaise expérience partagée ('j'ai failli me faire gouminer') renforce le lien tribal. Le vocabulaire anti-Goumin est un ciment identitaire.",
      bondingRituals: [
        "Le #AntiGoumin challenge — partager son pire fail restaurant et comment SPAWT l'aurait évité",
        "Le Goumin du Mois — vote communautaire du pire spot surfait, suivi du vrai bon plan SPAWT",
        "Le Spawn de Secours — quand un Spawter sauve un ami du Goumin en temps réel via l'app",
      ],
    },
  },
  doctrine: {
    dogmas: [
      "Nous croyons que ton palais a une identité mesurable — 13 archétypes, pas des notes en étoiles. Si tu ne connais pas ton archétype, tu ne te connais pas encore.",
      "Nous croyons que la recommandation anonyme est morte. Un bon restaurant pour toi n'est pas un bon restaurant pour tout le monde. La personnalisation bat l'agrégation.",
      "Nous croyons que le titre se mérite, pas s'achète. De Touriste à Guide, chaque stade est gagné par l'exploration authentique, pas par l'argent.",
      "Nous croyons que l'instinct culinaire est un sixième sens — SPAWT ne le remplace pas, il le révèle et l'affûte.",
    ],
    principles: [
      "Le chat renifle, il ne suit pas — l'algorithme propose, l'utilisateur décide",
      "Spawté n'est pas une action, c'est un état — le moment où le matching est si juste que tu ne cherches plus",
      "L'honnêteté avant la croissance — un avis faux détruit plus qu'il ne construit",
      "Le système respire — les archétypes évoluent avec l'utilisateur, ils ne sont pas figés",
    ],
    practices: [
      "Chaque avis qualitatif passe par le filtre Palais avant publication",
      "Le matching 4 dimensions (Palais×ADN, historique, colonie, contexte) est recalculé en temps réel",
      "Les Spawters votent sur les nouveaux badges et titres — la communauté co-crée le système",
    ],
  },
  livingMythology: {
    canon: "Le Mythe Fondateur de SPAWT commence dans un appartement d'Abidjan en 2020. Une femme camerounaise, seule dans une ville inconnue en plein COVID, crée un fichier Excel de 47 restaurants. Ce fichier n'est pas un outil — c'est un acte de survie culinaire. De ce fichier naît une vérité : on ne note pas un restaurant, on le ressent. Le chat errant de SPAWT renifle cette vérité dans chaque recommandation. Il ne suit jamais — il précède.",
    extensionRules: "Tout Spawter peut proposer un chapitre au canon SPAWT (une histoire de découverte culinaire qui incarne un dogme). Les chapitres validés par la communauté (>100 votes) entrent dans le canon officiel. Le mythe grandit avec la communauté.",
    captureSystem: "Le #MonSpawt — format story Instagram/TikTok de 60 secondes où un Spawter raconte sa découverte via le matching SPAWT. Les meilleures sont archivées dans le Mur des Légendes (app).",
  },

  // ── Champs fondamentaux (Chantier -1 : migration depuis Strategy) ──────
  nomMarque: "SPAWT",
  accroche: "Ton chat a trouve. Spawte.",
  description: "Plateforme de decouverte culinaire identitaire pour Abidjan. SPAWT ne recommande pas des restaurants — il revele qui tu es a travers ce que tu manges via le Systeme Palais des Saveurs (5 axes bipolaires, 13 archetypes, 5 stades de maturite).",
  brandNature: "Application mobile d'identite culinaire — pas un guide restaurant, pas du delivery, mais un systeme de revelation identitaire via la gastronomie. Le chat mascotte ne recommande pas, il renifle ta verite culinaire.",
  secteur: "FoodTech / Decouverte culinaire",
  pays: "CI",
  langue: "fr-CI", // Francais ivoirien (nouchi, argot Abidjan)
  publicCible: "Jeunes professionnels urbains d'Abidjan (22-40 ans) passionnes par la gastronomie locale — foodies, organisateurs sociaux, influenceurs food, expatries curieux",
  promesseFondamentale: "Chaque repas est une expression de qui tu es. SPAWT te revele ton identite culinaire et te connecte aux lieux qui te ressemblent, en 3 taps.",
  equipeDirigeante: [
    { nom: "Stephanie Bidje", role: "Pioneer / CEO", bio: "Camerounaise a Abidjan depuis 2020. PRINCE2 certifiee, ex-Jumia/Auchan. A cree le fichier Excel de 47 spots qui est devenu SPAWT.", experiencePasse: ["Jumia — e-commerce operations", "Auchan — supply chain management"], competencesCles: ["Vision produit", "Validation terrain", "BD strategique"], credentials: ["PRINCE2 Practitioner", "4 ans de terrain Abidjan food scene"] },
    { nom: "Kidam", role: "Co-Pilot Tech / CTO", bio: "Developpeur full-stack iOS/Android. Architecte du systeme Palais des Saveurs et de l'algo de matching.", experiencePasse: ["Dev mobile freelance 5 ans"], competencesCles: ["React Native", "Backend Node.js", "Integration paiement mobile"], credentials: ["Portfolio 10+ apps livrees"] },
    { nom: "Alexandre Djengue", role: "Co-Pilot Ops / CMO", bio: "Brand strategist et community manager. Responsable terrain B2B, ambassadeurs, et strategie de marque SPAWT.", experiencePasse: ["UPgraders SARL — creative direction", "Brand consulting Cameroun/CI"], competencesCles: ["Strategie de marque ADVE", "Community management", "Relations B2B"], credentials: ["Fondateur UPgraders", "Expertise marche africain"] },
  ],
  equipeComplementarite: {
    scoreGlobal: 7.8,
    couvertureTechnique: true,
    couvertureCommerciale: true,
    couvertureOperationnelle: true,
    capaciteExecution: "forte" as const,
    lacunes: ["Pas de data scientist dedie", "Pas de designer UI/UX a temps plein", "Pas de CFO"],
    verdict: "Equipe fondatrice credible et complementaire pour le MVP et les 12 premiers mois. Recrutement data + design necessaire pour scaler au-dela de 10K users.",
  },
};

// ── Pilier D — Distinction ─────────────────────────────────────────────────
// Schema: PillarDSchema — PersonaSchema, CompetitorSchema

const PILLAR_D = {
  // Personas — { name, age?, csp?, location?, income?, tensionProfile?, lf8Dominant?, schwartzValues?, lifestyle?, mediaConsumption?, brandRelationships?, motivations (50+), fears?, hiddenDesire?, whatTheyActuallyBuy?, jobsToBeDone?, decisionProcess?, devotionPotential?, rank }
  personas: [
    {
      name: "Betsy Diomandé",
      age: 30,
      csp: "Cadre moyen / Organisatrice sociale",
      location: "Assinie / Cocody, Abidjan",
      income: "250-350K FCFA/mois",
      familySituation: "Célibataire, cercle social très actif",
      tensionProfile: { segmentId: "REL-05", category: "RELATION", position: "Partage dominant — elle veut ÊTRE la source de recommandation pour son cercle" },
      lf8Dominant: ["APPROBATION_SOCIALE" as const, "NOURRITURE_PLAISIR" as const],
      schwartzValues: ["STIMULATION" as const, "HEDONISME" as const],
      lifestyle: "Instagram MAX. Organise des sorties groupe chaque weekend. Veut être la référence culinaire de son cercle. Photographie chaque plat. Partage activement les spots via stories et DMs.",
      mediaConsumption: "Instagram 3h/jour, TikTok 1h/jour, WhatsApp groupes constants. Suit les food bloggers Abidjan. Ne lit pas les avis Google — fait confiance à son réseau.",
      brandRelationships: "Fidèle aux marques qui lui donnent du statut social. Premium quand ça se voit (badge doré, accès VIP). Recommande activement ses découvertes — NPS propagateur naturel.",
      motivations: "Devenir LA référence culinaire de son cercle social. Chaque sortie doit être un succès partagé. Elle ne cherche pas un restaurant — elle cherche une victoire sociale à partager sur Instagram.",
      fears: "Recommander un mauvais restaurant et perdre sa crédibilité sociale. Le Goumin est son ennemi personnel — chaque échec culinaire est un échec de réputation devant son cercle.",
      hiddenDesire: "Être reconnue comme une autorité culinaire légitime, pas juste une fille qui poste des photos de plats. Le titre Djidji SPAWT formaliserait son statut informel actuel.",
      whatTheyActuallyBuy: "Du statut social et de la validation. Le badge doré Gold n'est pas un accès — c'est un symbole. Elle achète le droit de dire 'mon app dit que c'est là qu'il faut aller.'",
      jobsToBeDone: ["Organiser une sortie groupe réussie en moins de 5 minutes", "Découvrir des spots avant les autres pour maintenir son statut", "Partager des recommandations vérifiées qui renforcent sa crédibilité"],
      decisionProcess: "Impulsive sur les tendances, fidèle sur les classiques. Décide en 30 secondes si un spot mérite d'être testé.",
      devotionPotential: "AMBASSADEUR" as const,
      rank: 1,
    },
    {
      name: "Brice Konan",
      age: 35,
      csp: "Cadre supérieur / Professionnel établi",
      location: "Cocody, Abidjan",
      income: "500K FCFA/mois",
      familySituation: "Marié, 1 enfant",
      tensionProfile: { segmentId: "MON-03", category: "MONEY", position: "Expérientiel dominant — il paie pour la qualité, pas pour la quantité" },
      lf8Dominant: ["CONDITIONS_CONFORT" as const, "SUPERIORITE_STATUT" as const],
      schwartzValues: ["ACCOMPLISSEMENT" as const, "SECURITE" as const],
      lifestyle: "Facebook/LinkedIn. Gère son temps précieusement. Veut la qualité sans effort de recherche. Sorties planifiées, pas impulsives. Préfère 1 excellent restaurant à 5 moyens.",
      mediaConsumption: "LinkedIn quotidien, Facebook pour les events, WhatsApp business. Consulte les avis uniquement quand il cherche activement. Ne suit pas les influenceurs food.",
      brandRelationships: "Fidèle et silencieux. Forte LTV mais faible viralité. Paie premium sans hésiter si la valeur est claire. Ne recommande qu'à 2-3 personnes de confiance — mais avec un poids immense.",
      motivations: "Optimiser son temps limité : chaque sortie restaurant doit être une réussite garantie. Il ne veut pas explorer — il veut que quelqu'un explore pour lui et lui serve le résultat.",
      fears: "Perdre du temps dans un restaurant médiocre quand il pourrait être avec sa famille ou travailler. Le coût d'opportunité d'un mauvais repas est plus élevé que le prix du repas.",
      hiddenDesire: "Avoir un concierge culinaire personnel qui anticipe ses goûts. SPAWT Gold = le concierge qu'il n'a pas les moyens de payer en physique.",
      whatTheyActuallyBuy: "Du temps. Chaque recommandation précise lui économise 30 minutes de recherche et lui évite 1 mauvaise expérience sur 3. Le LTV/CAC >3.5x est justifié par lui.",
      jobsToBeDone: ["Trouver un restaurant excellent pour un dîner client en 2 minutes", "Planifier une sortie familiale qualitative le weekend"],
      decisionProcess: "Analytique. Compare 2-3 options, choisit la meilleure, ne revient pas dessus.",
      devotionPotential: "ENGAGE" as const,
      rank: 2,
    },
    {
      name: "Dominic Koffi",
      age: 21,
      csp: "Étudiant / Jeune actif",
      location: "Yopougon, Abidjan",
      income: "150K FCFA/mois",
      familySituation: "Célibataire, vit en colocation",
      tensionProfile: { segmentId: "AGE-05", category: "AGE", position: "Immédiateté totale — veut le résultat maintenant, pas dans 5 minutes" },
      lf8Dominant: ["NOURRITURE_PLAISIR" as const, "APPROBATION_SOCIALE" as const],
      schwartzValues: ["STIMULATION" as const, "HEDONISME" as const],
      lifestyle: "TikTok MAX. Sort 4-5 fois/semaine. Budget serré mais volume élevé. Crée du contenu UGC naturellement. Teste les tendances avant tout le monde. Vit pour les expériences, pas pour la qualité.",
      mediaConsumption: "TikTok 4h/jour, Instagram Reels, WhatsApp groupes multiples. Consomme et crée du contenu food en permanence. Algorithme social natif — il EST l'algorithme.",
      brandRelationships: "Zéro fidélité brand. Change d'app comme de playlist. Mais crée du contenu organique gratuitement quand il est engagé. Valeur = UGC et viralité, pas revenus.",
      motivations: "Vivre des expériences culinaires partageables sur TikTok. Chaque sortie doit être filmable. Le contenu EST l'expérience — manger est secondaire par rapport à partager.",
      fears: "Rater une tendance food avant ses potes. Être vu dans un spot 'has been'. La FOMO culinaire est son moteur principal — et son point de douleur.",
      hiddenDesire: "Devenir un micro-influenceur food reconnu. Les badges SPAWT seraient sa preuve de légitimité auprès des restaurants qui refusent les 'petits comptes'.",
      whatTheyActuallyBuy: "Rien — Premium NON (budget). Mais il produit du contenu UGC qui vaut 10x son CAC. Canal d'acquisition à coût quasi-nul. À activer sans sur-investir en acquisition directe.",
      jobsToBeDone: ["Trouver le spot TikTok-worthy du moment", "Impressionner sa squad avec une découverte", "Créer du contenu food viral"],
      decisionProcess: "FOMO-driven. Si c'est tendance maintenant, il y va. Décision en 10 secondes.",
      devotionPotential: "INTERESSE" as const,
      rank: 3,
    },
    {
      name: "Vanessa Kouakou",
      age: 28,
      csp: "Influenceuse food / Créatrice de contenu",
      location: "Marcory, Abidjan",
      income: "300K FCFA/mois",
      familySituation: "Célibataire, vie sociale intense",
      tensionProfile: { segmentId: "IDE-05", category: "IDENTITY", position: "Aspirationnel dominant — elle projette une image culinaire supérieure à sa réalité" },
      lf8Dominant: ["APPROBATION_SOCIALE" as const, "SUPERIORITE_STATUT" as const],
      schwartzValues: ["ACCOMPLISSEMENT" as const, "STIMULATION" as const],
      lifestyle: "Instagram + TikTok MAX. Contenu food pro. Relations avec les restaurants pour invitations. Monétise son audience mais cherche toujours plus de crédibilité et de reach.",
      mediaConsumption: "Instagram 5h/jour (création + consommation), TikTok 2h/jour, WhatsApp business avec les restaurants. Compare ses métriques aux autres food bloggers quotidiennement.",
      brandRelationships: "Transactionnelle. Les marques la paient ou lui donnent accès gratuit. Loyauté conditionnelle au bénéfice reçu. Peut être une alliée puissante ou un amplificateur de bruit.",
      motivations: "Construire une audience food crédible et monétisable. SPAWT l'intéresse comme outil de légitimation (badge Ambassadrice) et comme source de spots exclusifs à partager avant les autres.",
      fears: "Perdre sa crédibilité food si elle recommande un spot médiocre à ses followers. Insight terrain : 'Vanessa nous donne de la visibilité mais pas des clients' — elle le sait et ça la frustre.",
      hiddenDesire: "Être perçue comme une experte culinaire, pas juste une influenceuse. Le système SPAWT (archétype, Palais, titres mérités) lui donnerait la légitimité que les followers seuls ne donnent pas.",
      whatTheyActuallyBuy: "Pas de conversion premium directe. Levier MARKETING : accès premium gratuit en échange de contenu. x10 Vanessa = 5000 vues organiques/semaine minimum.",
      jobsToBeDone: ["Trouver des spots exclusifs avant les autres créateurs", "Prouver sa légitimité culinaire au-delà des métriques Instagram"],
      decisionProcess: "Stratégique. Chaque sortie est calculée pour son potentiel contenu et réseau.",
      devotionPotential: "AMBASSADEUR" as const,
      rank: 4,
    },
  ],

  // Paysage concurrentiel — CompetitorSchema: { name, partDeMarcheEstimee?, avantagesCompetitifs[] (50+ each), faiblesses?, strategiePos?, distinctiveAssets? }
  paysageConcurrentiel: [
    {
      name: "Google Maps",
      partDeMarcheEstimee: 70,
      avantagesCompetitifs: [
        "Base mondiale de restaurants la plus complète avec SEO dominante — chaque recherche 'restaurant Abidjan' passe par Google Maps en premier",
        "Distribution illimitée via Android et iOS pré-installé — zéro coût d'acquisition pour la visibilité de base",
      ],
      faiblesses: ["Zéro connaissance de l'identité culinaire de l'utilisateur", "Notes en étoiles sans contexte ni personnalisation", "Google Maps Zombie = Faux-Pas #5 du Code Spawter"],
      strategiePos: "Omniscient mais impersonnel — traite l'utilisateur comme un consommateur anonyme",
    },
    {
      name: "TripAdvisor / Yelp",
      partDeMarcheEstimee: 5,
      avantagesCompetitifs: [
        "Notoriété mondiale et historique dans l'avis restaurant — la marque de référence pour les touristes et voyageurs internationaux",
      ],
      faiblesses: ["Conçu pour les touristes, pas les locaux", "Absent des maquis et restaurants informels", "Format occidental inadapté au marché africain"],
      strategiePos: "Guides touristiques numériques — hors cible locale Abidjan",
    },
    {
      name: "Instagram / TikTok Food",
      partDeMarcheEstimee: 15,
      avantagesCompetitifs: [
        "Algorithme de recommandation food basé sur le comportement social — les tendances culinaires naissent et meurent sur ces plateformes avant tout autre canal",
      ],
      faiblesses: ["Tendance > Vérité (Hype != Réservations — insight Assinie Beach Club)", "Vanessa Kouakou = ce segment", "Pas de matching personnalisé"],
      strategiePos: "Canal d'acquisition pour SPAWT, pas concurrent direct sur l'identité",
    },
    {
      name: "Bouche-à-oreille WhatsApp",
      partDeMarcheEstimee: 10,
      avantagesCompetitifs: [
        "La confiance interpersonnelle la plus forte — la recommandation d'une amie proche bat tout algorithme en crédibilité perçue, et le groupe WhatsApp est gratuit",
      ],
      faiblesses: ["Non scalable", "Dépend de la mémoire et disponibilité de l'amie", "SPAWT est né d'un groupe WhatsApp — l'app doit être plus pratique"],
      strategiePos: "Le concurrent indirect le plus fort — le score de matching 92% doit battre le conseil de la meilleure amie",
    },
  ],

  // Promesses
  promesseMaitre: "Plus jamais le goumin d'un mauvais restau.",
  sousPromesses: [
    "Freemium : Découvre les 60% de spots validés dans un rayon de 3km — gratuit, pour toujours. L'entrée dans la colonie ne coûte rien.",
    "Premium : Accès 100% du contenu + géolocalisation illimitée + 1-tap réservation + badge doré Insider + SPAWT Wrapped annuel. Ton identité culinaire complète.",
    "Pour les restaurants : Visibilité contextuelle auprès des foodies qui correspondent à votre ADN de lieu — pas du mass marketing, du matching de précision archétype.",
  ],

  positionnement: "Le seul système qui transforme tes goûts en identité. Pas un guide — un révélateur.",

  // Ton de voix — { personnalite[] (5-7), onDit[] (3+, 30+ chars), onNeditPas[] (2+, 30+ chars) }
  tonDeVoix: {
    personnalite: [
      "Foodie Pro Max — parle comme un insider, pas comme un guide Michelin",
      "Ni bullshit ni diplomatie — dit ce que c'est, sans filtre corporate",
      "Ivoirien dans l'âme — maîtrise le dialecte local (goumin, djidji, meute, trouvaille)",
      "Confiant sans arrogance — ne se compare pas, affirme",
      "Chaleureux mais sélectif — comme un chat qui choisit qui il approche",
    ],
    onDit: [
      "Spawté — le verbe universel de validation SPAWT, remplace tout adjectif positif dans le dialecte",
      "Ton chat a trouvé — personnification de l'algorithme comme un compagnon instinctif, pas une machine",
      "La meute a validé — preuve sociale communautaire, plus forte qu'un nombre d'étoiles anonyme",
      "3 taps 1 spot — la promesse UX condensée en 4 mots, répétée dans chaque communication SPAWT",
    ],
    onNeditPas: [
      "Gastronomique / gastronomie — trop élitiste, exclut les maquis et la cuisine de rue qui font l'âme d'Abidjan",
      "Disruptif / révolutionnaire / innovant — jargon startup vide, le contraire de l'authenticité SPAWT",
      "Solution / plateforme / écosystème — termes corporate déshumanisants, SPAWT est une meute pas un SaaS",
      "Utilisateurs / consommateurs — ce sont des Spawters, pas des métriques dans un dashboard",
      "Note / évaluation / scoring — SPAWT révèle l'identité, il ne note pas les restaurants",
    ],
  },

  // Assets linguistiques — { slogan?, tagline?, motto?, lexiquePropre?: [{ word, definition }] }
  // ── Chantier -1 : expression archetypale A→D ──────────────────────────
  archetypalExpression: {
    visualTranslation: "L'Explorateur se traduit par un systeme visuel organique : le chat mascotte comme guide instinctif, des couleurs chaudes (terracotta, epice), des formes fluides et imprecises qui suggerent la decouverte plutot que la certitude",
    verbalTranslation: "Ton direct, complice, sans jargon food-critique. Le chat parle a la 2e personne, tutoie, utilise l'argot local (djama, dja, way). Pas de superlatifs — des faits et de l'instinct.",
    emotionalRegister: "Curiosite → Confiance → Fierte identitaire. L'emotion progresse de 'je cherche un spot' a 'SPAWT me connait mieux que moi-meme'.",
  },

  assetsLinguistiques: {
    languePrincipale: "fr-CI", // Francais ivoirien (nouchi, argot Abidjan)
    slogan: "Spawté.",
    tagline: "3 taps. 1 spot. Ton chat a trouvé.",
    motto: "L'instinct contre la conformité. SPAWT ne demande pas — il révèle. Le chat ne suit pas — il renifle.",
    mantras: [
      "Le chat renifle, il ne suit pas.",
      "Spawté > noté.",
      "Ton palais est ton identité.",
    ],
    lexiquePropre: [
      { word: "Spawté", definition: "Validé, trouvé, allé — verbe tout-terrain SPAWT" },
      { word: "Goumin", definition: "Regret post-mauvais restaurant — l'ennemi absolu" },
      { word: "Meute", definition: "La communauté SPAWT (anciennement 'Fidèles')" },
      { word: "Djidji", definition: "Power user Niveau 4 (500-1000 Paws) — le connaisseur respecté" },
      { word: "Trouvaille", definition: "Une pépite découverte via SPAWT" },
      { word: "Palais", definition: "Ton profil gustatif calculé (les 5 axes bipolaires)" },
      { word: "Le Chat", definition: "La mascotte / l'algorithme de recommandation" },
      { word: "Paws", definition: "Unité de progression dans le système de maturité" },
      { word: "Coup de Cœur", definition: "Monnaie sociale rare — le meilleur compliment possible" },
      { word: "Tanière", definition: "Ton restaurant de prédilection (Niveau Djidji+)" },
    ],
  },

  // Direction artistique — 10 slots possibles: semioticAnalysis, visualLandscape, moodboard, chromaticStrategy, typographySystem, logoTypeRecommendation, logoValidation, designTokens, motionIdentity, brandGuidelines
  directionArtistique: {
    chromaticStrategy: {
      primaire: "#0A0A0A (Noir profond — sophistication + mystère du chat)",
      secondaire: "#D4AF37 (Or — statut + sélection premium)",
      accent: "#50C878 (Vert Yeux de Chat — le vivant, l'instinct, le find)",
      neutre: "#F8F6F0 (Blanc cassé — authenticité, pas stérilité corporate)",
    },
    typographySystem: {
      principale: "Playfair Display (titres — élégance food porn éditoriale)",
      secondaire: "DM Sans (corps — lisibilité mobile-first)",
      technique: "JetBrains Mono (données, scores, métriques — précision tech)",
    },
    visualLandscape: {
      style: "Food porn authentique — éclairage naturel, textures réelles, pas de studio froid. Pinterest aesthetic mais ancré local ivoirien. Plats de rue et gastronomie ont la même dignité photographique.",
    },
    semioticAnalysis: {
      mascotte: "Chat stylisé — expressions multiples selon contexte (cherche, trouve, approuve, doute). Paw prints comme signature visuelle.",
      symboles: "Paw prints omniprésents, étoiles dorées 5 branches (maturité), cartes collectibles 4 raretés, cercles concentriques (Colonies), icône radar (Palais)",
    },
    moodboard: {
      cartes: "3 types collectibles : Profil Spawter, Fiche Spawt/Lieu, Plat Collectible. Système de rareté Commun→Rare→Épique→Légendaire.",
      theme: "Exploration culinaire nocturne urbaine — lumieres chaudes sur fond sombre, textures organiques, street food esthetisee, le chat guide lumineux dans une ville vivante",
      keywords: ["street food premium", "nuit urbaine Abidjan", "chat guide", "identite culinaire", "terracotta sur noir", "organique digital", "cartes collectibles", "discovery not delivery"],
    },
    designTokens: {
      darkMode: "Noir #0A0A0A dominant. Animations fluides. Modes contextuels (Rapide/Crew/Explore) changent l'ambiance.",
    },
    brandGuidelines: {
      retail: "Aucun retail physique. Food Tours mensuels (15K FCFA) = seuls moments physiques SPAWT. Expérience hors-app contrôlée et premium.",
    },
    motionIdentity: {
      interactions: "Swipe cards mode Rapide. Vote + partage WhatsApp mode Crew. Magazine scroll mode Explore. Voix du Chat pour révélations matching.",
    },
    logoTypeRecommendation: {
      son: "Notifications sonores discrètes. Voix du Chat pour les révélations premium. Pas de jingle — discrétion et qualité.",
    },
    logoValidation: {
      statut: "En développement — vote communauté prévu lors du beta pour nommer le chat mascotte",
    },
    lsiMatrix: {
      concepts: ["L'Instinct", "L'Identité", "La Communauté", "La Découverte", "Le Chat"],
      layers: {
        visuel: ["Paw prints dorées", "Cartes collectibles avec rareté", "Dark mode sophistiqué", "Food photography authentique", "Yeux de chat verts (#50C878)"],
        verbal: ["Spawté", "Goumin", "Djidji", "Meute", "Tanière"],
        comportemental: ["Swipe instinctif", "Vote communautaire", "Partage WhatsApp", "Collection de badges", "Exploration cartographique"],
        emotionnel: ["Fierté de la découverte", "Haine du Goumin", "Appartenance tribale", "Confiance dans le matching", "Excitation de la rareté"],
        rituel: ["La Quête du Midi", "Le Planning Weekend", "Le Retour d'Expérience", "Le Wrapped Annuel", "Le Spawn de Secours"],
      },
      sublimationRules: [
        { literal: "Recommandation restaurant", sublimated: "Révélation d'identité culinaire — le chat te connaît mieux que toi" },
        { literal: "Système de notation", sublimated: "Archétype Palais des Saveurs — ton profil gustatif en 13 dimensions" },
        { literal: "Programme fidélité", sublimated: "Rite de passage — de Touriste à Guide, chaque titre est mérité, pas acheté" },
      ],
    },
  },

  // Extensions D — Sacred Objects, Proof Points, Symboles
  sacredObjects: [
    { name: "La Carte Spawter", form: "Carte de profil digital dans l'app", narrative: "Ta carte d'identité culinaire — archétype, Paws, badges, Tanière. Tu la montres, on sait qui tu es.", stage: "INTERESSE" as const, socialSignal: "Preuve d'appartenance à la Meute — le premier artefact du Spawter" },
    { name: "Le Badge Coup de Cœur", form: "Badge doré rare attribué par la communauté", narrative: "Le plus haut compliment qu'un Spawter peut donner à un lieu. Un restaurant ne le demande pas — il le mérite.", stage: "ENGAGE" as const, socialSignal: "Statut de connaisseur — seuls les Djidji+ peuvent en distribuer" },
    { name: "Le Wrapped Annuel", form: "Bilan visuel annuel (stories/PDF) de ton année culinaire", narrative: "Chaque décembre, SPAWT révèle ton année : spots, archétype, évolution, Meute. C'est ton miroir culinaire.", stage: "PARTICIPANT" as const, socialSignal: "Moment de partage viral — chaque Wrapped est une pub organique" },
  ],

  proofPoints: [
    { type: "Validation terrain", claim: "78% des foodies mangent dehors >2x/semaine", evidence: "Mission 1 — 26 interviews qualifiées, mars 2026", source: "Données primaires SPAWT" },
    { type: "Frustration mesurée", claim: "Frustration moyenne 7.8/10 dans le choix restaurant", evidence: "26 interviews terrain avec échelle 1-10", source: "Mission 1 Abidjan" },
    { type: "Intention d'usage", claim: "72% déclarent qu'ils utiliseraient SPAWT", evidence: "Question directe post-demo lors des 26 interviews", source: "Mission 1 terrain" },
    { type: "Intérêt B2B", claim: "14 restaurants sur 20 intéressés par le partenariat", evidence: "Visites terrain 20 restaurants en 6 catégories", source: "Mission 1 B2B" },
  ],

  symboles: [
    { symbol: "Le Chat", meanings: ["L'instinct algorithmique", "L'indépendance du goût", "La curiosité urbaine"], usageContexts: ["Mascotte app", "Notifications push", "Signature visuelle"] },
    { symbol: "La Paw Print", meanings: ["Progression (Paws)", "Trace de découverte", "Signature SPAWT"], usageContexts: ["Gamification", "Watermark photo", "Animation loading"] },
    { symbol: "Les Yeux Verts", meanings: ["Le moment de la découverte", "Le matching réussi", "L'instinct activé"], usageContexts: ["Révélation d'archétype", "Animation Spawt réussi", "Logo variante"] },
  ],
};

// ── Pilier V — Valeur ──��───────────────────────────────────────────���───────
// Schema: PillarVSchema — ProduitServiceSchema, ProductLadderTierSchema, UnitEconomicsSchema

const PILLAR_V = {
  // ── Chantier -1 : fondamentaux economiques (migres de Strategy.businessContext) ──
  businessModel: "FREEMIUM — app gratuite geo-limitee (Abidjan uniquement) + abonnement SPAWT Pro 2500 FCFA/mois pour debloquer les villes, le matching avance et les features communautaires. B2B2C via le Dashboard Restaurateur (3 tiers tarifaires). Revenue additionnel: Food Tours mensuels (15K FCFA), data culinaire anonymisee pour partenaires F&B.",
  economicModels: ["FREEMIUM", "ABONNEMENT", "MARKETPLACE_B2B", "EVENEMENTIEL"],
  positioningArchetype: "NICHE_PREMIUM",
  salesChannel: "DIRECT" as const,
  freeLayer: {
    whatIsFree: "App gratuite geo-limitee a Abidjan — acces complet au matching basique, check-ins, et avis pour 15K+ restaurants",
    whatIsPaid: "SPAWT Pro 2500 FCFA/mois : multi-villes, matching avance, badges premium, Food Tours prioritaires",
    conversionLever: "Frustration geo-paywall quand l'user veut explorer hors Abidjan + envie de badges et matching avance vu chez les amis Pro",
  },
  pricingJustification: "Le prix de 2500 FCFA/mois est positionne juste en-dessous du seuil psychologique d'un repas standard a Abidjan. On ne paye pas pour des fonctionnalites — on paye pour son identite culinaire revelee. Le paywall geo est une feature communautaire (frustration = motivation d'upgrade), pas une limitation technique. Coherent avec le positionnement 'identite > utilite' du pilier D.",
  mvp: {
    exists: true,
    stage: "MVP" as const,
    description: "App mobile SPAWT avec Onboarding Palais des Saveurs, matching archetype 92%, 3 modes contextuels, check-ins, avis, et systeme de badges collectibles 4 niveaux de rarete.",
    features: ["Onboarding Palais des Saveurs (quiz 3 ecrans)", "Matching archetype 92%", "3 modes contextuels (Rapide/Crew/Explore)", "Check-ins + avis", "18 badges B2C + 8 badges B2B", "Systeme de rarete 4 niveaux"],
    launchDate: "2026-05-01",
    userCount: 0,
    feedbackSummary: "Pre-lancement — Mission 1 terrain validee (72% intention usage, 7.8/10 frustration)",
  },
  proprieteIntellectuelle: {
    brevets: [],
    secretsCommerciaux: ["Algorithme Palais des Saveurs (5 axes bipolaires, 13 archetypes, 5 stades de maturite)", "Base de donnees culinaire Abidjan 200+ restaurants caracterises"],
    technologieProprietary: "Systeme de matching identite culinaire base sur le Palais des Saveurs — 4 ans de R&D terrain",
    barrieresEntree: ["4 ans de terrain Abidjan pour construire le systeme Palais", "Dialecte SPAWT (vocabulaire proprieteraire)", "Communaute early-adopter pre-constituee", "Donnees comportementales culinaires uniques"],
    protectionScore: 6.5,
  },
  personaSegmentMap: [
    { personaName: "Betsy la Foodie Curieuse", productNames: ["App Gratuite", "SPAWT Pro"], devotionLevel: "INTERESSE" },
    { personaName: "Brice l'Organisateur Social", productNames: ["SPAWT Pro", "Food Tours"], devotionLevel: "PARTICIPANT" },
    { personaName: "Dominic le Restaurateur", productNames: ["Dashboard Restaurateur Basic", "Dashboard Premium"], devotionLevel: "ENGAGE" },
    { personaName: "Vanessa l'Influenceuse Food", productNames: ["SPAWT Pro", "Programme Ambassadeur"], devotionLevel: "AMBASSADEUR" },
  ],

  // Produits — matrice de valeur 2×2×2 complète pour chaque produit
  produitsCatalogue: [
    {
      nom: "SPAWT Freemium (B2C)",
      categorie: "PLATEFORME" as const,
      prix: 0,
      cout: 500,
      // Matrice CLIENT
      gainClientConcret: "Accès 3km, 60% du contenu restaurant, onboarding Palais des Saveurs, archétype révélé, mode Rapide fonctionnel. iOS + Android + offline basique. Zéro publicité intrusive.",
      gainClientAbstrait: "Découverte de son identité culinaire via l'archétype calculé. Sentiment d'appartenance à la meute dès le premier jour. 'Comment cette app me connaît mieux que moi ?' Le début d'une identité.",
      coutClientConcret: "Limitation géographique 3km = frustration si le Spawter cherche un spot hors de son quartier. 40% du contenu invisible crée un FOMO calculé. Pas de réservation 1-tap.",
      coutClientAbstrait: "Sentiment d'être un 'citoyen de seconde zone' dans la meute. Le badge gratuit ne brille pas comme le doré Gold. La frustration identitaire est le trigger de conversion, pas un bug.",
      // Matrice MARQUE
      gainMarqueConcret: "Acquisition à coût quasi-nul — chaque download gratuit est un lead qualifié. Base de données d'avis et de comportements enrichit l'algo. Volume de contenu UGC gratuit (Dominic-tier).",
      gainMarqueAbstrait: "Le freemium prouve que SPAWT n'est pas élitiste. La porte ouverte à tous légitime le positionnement 'identité pour tous'. Chaque Spawter gratuit est un ambassadeur potentiel.",
      coutMarqueConcret: 500,
      coutMarqueAbstrait: "Risque de dilution de la communauté si les Spawters gratuits ne contribuent pas (avis, check-ins). Le ratio actifs/inscrits doit rester >30% pour que l'algo soit pertinent.",
      lienPromesse: "Porte d'entrée vers 'plus jamais le goumin' — même en freemium, le matching fonctionne dans un rayon de 3km avec 60% du catalogue validé.",
      segmentCible: "Dominic Koffi (acquisition) + tous les nouveaux Spawters",
      phaseLifecycle: "GROWTH" as const,
      canalDistribution: ["APP" as const],
      leviersPsychologiques: ["Paywall géo = FOMO calculé", "Archétype surprise = curiosité", "Badge gratuit vs doré = envie"],
      maslowMapping: "BELONGING" as const,
      lf8Trigger: ["NOURRITURE_PLAISIR" as const, "APPROBATION_SOCIALE" as const],
      disponibilite: "ALWAYS" as const,
    },
    {
      nom: "SPAWT Gold (B2C)",
      categorie: "ABONNEMENT" as const,
      prix: 2500,
      cout: 300,
      gainClientConcret: "Géolocalisation illimitée (tout Abidjan), 100% contenu, réservation 1-tap, badge doré Insider, analytics personnels, 0 publicités, SPAWT Wrapped annuel. 24 000 FCFA/an (2 mois offerts).",
      gainClientAbstrait: "Identité culinaire complète et visible. Le badge doré est un marqueur social dans la communauté. L'accès total au Palais renforce le sentiment d'expertise, de statut et d'appartenance premium.",
      coutClientConcret: "2 500 FCFA/mois soit le prix de 2 alloco-poisson. Engagement mensuel reconductible. Annulation possible à tout moment mais perte du badge doré et des analytics personnels.",
      coutClientAbstrait: "L'engagement financier crée une pression à utiliser l'app régulièrement. Le badge doré visible par les autres Spawters crée une attente sociale de contribution supérieure.",
      gainMarqueConcret: "2 500 FCFA/mois × rétention moyenne 14 mois = 35 000 FCFA LTV. Marge brute ~88%. Données comportementales enrichies par l'usage illimité. Base premium = ambassadeurs naturels.",
      gainMarqueAbstrait: "Les Gold sont les 'vrais Spawters' — leur engagement valide le modèle et inspire les freemium. Le badge doré visible crée un effet aspirationnel dans la communauté.",
      coutMarqueConcret: 300,
      coutMarqueAbstrait: "Churn à surveiller : si un Gold part, il emporte son contenu, ses avis et son réseau d'influence. Le coût de remplacement d'un Gold est 5x celui de son acquisition.",
      lienPromesse: "La promesse complète : géo illimitée + matching complet = 0% de goumin. Chaque sortie est une réussite garantie par le Palais complet.",
      segmentCible: "Betsy Diomandé (ICP) + Brice Konan (premium)",
      phaseLifecycle: "GROWTH" as const,
      canalDistribution: ["APP" as const],
      leviersPsychologiques: ["Badge doré = statut social", "Wrapped = identité célébrée", "Géo illimitée = liberté"],
      maslowMapping: "ESTEEM" as const,
      lf8Trigger: ["SUPERIORITE_STATUT" as const, "NOURRITURE_PLAISIR" as const, "APPROBATION_SOCIALE" as const],
      disponibilite: "ALWAYS" as const,
    },
    {
      nom: "SPAWT Libre (B2B)",
      categorie: "PLATEFORME" as const,
      prix: 0,
      cout: 200,
      gainClientConcret: "Profil restaurant basique sur l'app SPAWT, visible dans les résultats de matching. Accès au badge 'Sur SPAWT'. Pas de dashboard, pas d'analytics, pas de ciblage.",
      gainClientAbstrait: "Être référencé dans le système SPAWT dès le début. Le restaurant fait partie de l'écosystème sans investissement. Visibilité passive auprès des Spawters du quartier.",
      coutClientConcret: "Pas de contrôle sur le profil — les avis des Spawters définissent la réputation. Pas d'accès aux données ni aux insights archétype. Zéro outil de gestion.",
      coutClientAbstrait: "Dépendance aux avis communautaires sans droit de réponse structuré. Le restaurant subit sa réputation SPAWT au lieu de la piloter. Frustration si les avis sont négatifs.",
      gainMarqueConcret: "Enrichissement du catalogue sans coût commercial. Plus de restaurants = meilleur matching = plus de valeur pour les Spawters B2C. Chaque resto Libre est un lead B2B Pro/Gold.",
      gainMarqueAbstrait: "Prouver que SPAWT est inclusif — du maquis à la franchise. Le catalogue complet légitime la promesse 'le seul système qui transforme tes goûts en identité.'",
      coutMarqueConcret: 200,
      coutMarqueAbstrait: "Si trop de Libre sans engagement, la qualité perçue du catalogue baisse. Les restaurants sans investissement contribuent moins à l'écosystème (pas de photos pro, pas d'events).",
      lienPromesse: "Chaque restaurant sur SPAWT enrichit le matching — même un profil basique gratuit contribue à la diversité du catalogue et à la précision de l'algorithme.",
      segmentCible: "Tous les restaurants Abidjan — acquisition passive catalogue",
      phaseLifecycle: "LAUNCH" as const,
      canalDistribution: ["APP" as const, "WEBSITE" as const],
      maslowMapping: "SAFETY" as const,
      disponibilite: "ALWAYS" as const,
    },
    {
      nom: "SPAWT Pro (B2B)",
      categorie: "ABONNEMENT" as const,
      prix: 15000,
      cout: 2000,
      gainClientConcret: "Profil vérifié restaurant, carnet d'adresses Spawters du quartier, dashboard basique (visites, avis, tendances), accès bridge Allié SPAWT. Badge Pépite Vérifiée.",
      gainClientAbstrait: "Légitimation digitale du restaurant. Être 'vérifié sur SPAWT' devient un marqueur de qualité perçue auprès des foodies Abidjan. Le Pépite Vérifiée est un badge de fierté professionnelle.",
      coutClientConcret: "15 000 FCFA/mois = ~1% du CA pour un maquis à 2M/mois. ROI doit être visible en 30 jours (nouveaux clients via l'app mesurables dans le dashboard). Annulation mensuelle possible.",
      coutClientAbstrait: "Le restaurateur doit accepter les avis honnêtes des Spawters — pas de contrôle éditorial. La transparence SPAWT peut être inconfortable pour les restaurants habitués au bouche-à-oreille.",
      gainMarqueConcret: "15 000 FCFA/mois × 50 Pro cible M12 = 750K FCFA/mois. Marge brute ~87%. Chaque Pro enrichit le catalogue avec des photos pro et des events.",
      gainMarqueAbstrait: "Les Pro sont la preuve du B2B flywheel — chaque restaurant qui paie pour être visible améliore le contenu pour les Spawters B2C, ce qui attire plus de foodies.",
      coutMarqueConcret: 2000,
      coutMarqueAbstrait: "Risque de mécontentement si le ROI n'est pas visible rapidement. Les restaurants informels (Tantie Rose) ont une tolérance quasi-nulle aux abonnements non-prouvés.",
      lienPromesse: "Visibilité contextuelle auprès des foodies qui correspondent à l'ADN du lieu — du matching de précision, pas du mass marketing.",
      segmentCible: "Tantie Rose (maquis, 800K-2M FCFA/mois CA)",
      phaseLifecycle: "LAUNCH" as const,
      canalDistribution: ["APP" as const, "WEBSITE" as const],
      leviersPsychologiques: ["Dashboard = preuve ROI tangible", "Badge vérifié = crédibilité", "Insights Spawters = compréhension client"],
      maslowMapping: "ESTEEM" as const,
      lf8Trigger: ["SUPERIORITE_STATUT" as const],
      disponibilite: "ALWAYS" as const,
    },
    {
      nom: "SPAWT Gold B2B",
      categorie: "ABONNEMENT" as const,
      prix: 65000,
      cout: 5000,
      gainClientConcret: "Visibilité contextuelle (ciblage par archétype Spawter), analytics avancés (quel archétype visite quand et dépense combien), ciblage événements, insights Palais des Spawters, réservations in-app.",
      gainClientAbstrait: "Devenir un spot de référence dans le système SPAWT. Les insights archétype transforment la compréhension de la clientèle. 'SPAWT devient indispensable quand les réservations passent par l'app.'",
      coutClientConcret: "65 000 FCFA/mois = investissement significatif pour un restaurant semi-premium. ROI doit être démontré en M3 (augmentation réservations + panier moyen mesurable dans le dashboard).",
      coutClientAbstrait: "Le restaurant devient dépendant de SPAWT pour son flux de clients qualifiés. Si SPAWT disparaît ou change les conditions, le restaurant perd un canal d'acquisition critique.",
      gainMarqueConcret: "65 000 FCFA/mois × 10 Gold cible M12 = 650K FCFA/mois. Marge brute ~92%. Les Gold B2B sont les vitines du système — leurs events et insights nourrissent le contenu premium.",
      gainMarqueAbstrait: "Chaque restaurant Gold prouve que le ciblage archétype crée de la valeur réelle — la preuve B2B du concept SPAWT. Le Bo Zinc satisfait = 3 referrals Pro minimum.",
      coutMarqueConcret: 5000,
      coutMarqueAbstrait: "Si un Gold B2B churne publiquement, c'est un signal négatif fort pour tout le pipeline B2B. La rétention Gold est critique pour la crédibilité du modèle.",
      lienPromesse: "Les restaurants qui matchent les bons Spawters gardent leurs clients plus longtemps et augmentent leur panier moyen grâce au ciblage archétype.",
      segmentCible: "Le Bo Zinc (semi-premium, 16M FCFA/mois CA)",
      phaseLifecycle: "LAUNCH" as const,
      canalDistribution: ["APP" as const, "WEBSITE" as const],
      leviersPsychologiques: ["Ciblage archétype = précision inédite", "Analytics avancés = avantage concurrentiel", "Réservations in-app = conversion directe"],
      maslowMapping: "ESTEEM" as const,
      lf8Trigger: ["SUPERIORITE_STATUT" as const, "CONDITIONS_CONFORT" as const],
      disponibilite: "ALWAYS" as const,
    },
    {
      nom: "SPAWT Corporate (B2B)",
      categorie: "ABONNEMENT" as const,
      prix: 300000,
      cout: 20000,
      gainClientConcret: "Dashboard multi-sites, analytics croisés entre locations, ciblage masse précis par archétype, insights comparatifs entre franchises. API data SPAWT. Account manager dédié.",
      gainClientAbstrait: "Intelligence culinaire locale pour des marques globales. KFC Abidjan comprendrait enfin pourquoi certaines locations performent mieux que d'autres via le mapping archétype.",
      coutClientConcret: "300 000 FCFA/mois = investissement premium. Justifié uniquement si le CA est >150M/mois. Contrat annuel recommandé avec SLA et reporting trimestriel.",
      coutClientAbstrait: "Dépendance data SPAWT pour les décisions stratégiques de la franchise. Si les insights sont incorrects, les décisions business basées dessus peuvent coûter cher.",
      gainMarqueConcret: "300 000 FCFA/mois × 1-2 Corporate cible M12 = 300-600K FCFA/mois. Le contrat Corporate est le plus rentable par client. Validation du modèle enterprise.",
      gainMarqueAbstrait: "Un KFC sur SPAWT = crédibilité maximale. Les franchises internationales qui utilisent SPAWT légitiment le système auprès de TOUS les restaurants locaux.",
      coutMarqueConcret: 20000,
      coutMarqueAbstrait: "Risque de dépendance à un gros client. Si KFC représente >20% du CA B2B, leur départ serait un choc. Diversification du portefeuille Corporate nécessaire.",
      lienPromesse: "La data locale que les outils globaux ne fournissent pas — chaque franchise a un ADN de quartier différent que SPAWT révèle.",
      segmentCible: "KFC Abidjan (10 locations, 150M+ FCFA/mois CA)",
      phaseLifecycle: "LAUNCH" as const,
      canalDistribution: ["APP" as const, "WEBSITE" as const],
      maslowMapping: "SELF_ACTUALIZATION" as const,
      lf8Trigger: ["SUPERIORITE_STATUT" as const],
      disponibilite: "ALWAYS" as const,
    },
  ],

  // Product Ladder — 5 tiers couvrant B2C + B2B complet
  productLadder: [
    {
      tier: "Gratuit B2C — Découverte",
      prix: 0,
      produitIds: ["SPAWT Freemium (B2C)"],
      cible: "Dominic Koffi + tous nouveaux Spawters",
      description: "Porte d'entrée communauté. Accès limité 3km, 60% contenu. Objectif : activation 60% J+7, conversion 5% vers Gold. Le freemium n'est pas un produit dégradé — c'est un teaser d'identité.",
      position: 1,
    },
    {
      tier: "Gold B2C — Identité Complète",
      prix: 2500,
      produitIds: ["SPAWT Gold (B2C)"],
      cible: "Betsy Diomandé + Brice Konan",
      description: "Offre principale 80% du CA B2C. Badge doré, géo illimitée, Wrapped annuel. Churn cible <5%/mois. LTV/CAC >3.5x. L'identité culinaire complète pour 2500 FCFA/mois.",
      position: 2,
    },
    {
      tier: "Gratuit B2B — Catalogue",
      prix: 0,
      produitIds: ["SPAWT Libre (B2B)"],
      cible: "Tous les restaurants Abidjan",
      description: "Profil basique gratuit dans le catalogue SPAWT. Aucun dashboard, aucun analytics. Le restaurant est visible mais ne pilote rien. Porte d'entrée du pipeline B2B → conversion vers Pro.",
      position: 3,
    },
    {
      tier: "Pro B2B — Visibilité Locale",
      prix: 15000,
      produitIds: ["SPAWT Pro (B2B)"],
      cible: "Tantie Rose + restaurants 800K-16M FCFA CA/mois",
      description: "Profil vérifié, dashboard basique, carnet Spawters. Le premier palier payant B2B. ROI doit être visible en 30 jours. 50 restaurants Pro cible M12. Le pont entre gratuit et Gold.",
      position: 4,
    },
    {
      tier: "Gold/Corporate B2B — Intelligence",
      prix: 65000,
      produitIds: ["SPAWT Gold B2B", "SPAWT Corporate (B2B)"],
      cible: "Le Bo Zinc + Assinie Beach Club + KFC Abidjan",
      description: "Ciblage archétype, analytics avancés, réservations in-app. Le palier qui prouve le flywheel : plus de restos Gold = meilleur contenu = plus de Spawters = plus de valeur B2B. NRR >110%.",
      position: 5,
    },
  ],

  // Unit Economics
  unitEconomics: {
    cac: 2000,
    ltv: 7000,
    ltvCacRatio: 3.5,
    pointMort: "B2C 500 Gold + B2B 50 Pro + 10 Gold = ~3M FCFA/mois ARR (M6-8)",
    budgetCom: 5000000,
    caVise: 30000000,
  },

  promesseDeValeur: "SPAWT transforme le temps perdu à chercher un restaurant en temps investi dans son identité culinaire. Pour les foodies : 3 taps, 1 spot, 0 goumin. Pour les restaurants : les bons clients trouvent les bons spots — matching de précision archétype, pas de mass marketing.",

  // 8 quadrants valeur/coût brand-level (Annexe G §V.1)
  valeurMarqueTangible: [
    "Base de données propriétaire de 47→2000+ restaurants avec scoring qualitatif multi-dimensions",
    "Algorithme de matching 4D breveté (Palais×ADN, historique, colonie, contexte) — score 92%",
    "Système Palais des Saveurs avec 13 archétypes et 5 stades de maturité formalisés",
    "Réseau B2B de 20+ restaurants validés à Abidjan avec données comportementales",
  ],
  valeurMarqueIntangible: [
    "Première marque à positionner l'identité culinaire comme un lifestyle en Afrique de l'Ouest",
    "Capital communautaire : la Meute comme actif viral auto-entretenu (coefficient viral cible 1.4)",
    "Vocabulaire propriétaire installé : Spawté, Goumin, Djidji — une langue de marque",
    "Expertise culturelle food africaine impossible à répliquer par un acteur occidental",
  ],
  valeurClientTangible: [
    "Gain de temps : 3 taps vs 45 minutes de recherche WhatsApp pour trouver un restaurant",
    "Matching à 92% de précision — réduction drastique des mauvaises expériences restaurant",
    "Accès à un catalogue curé de restaurants validés avec infos fiables (horaires, prix, ambiance)",
    "Dashboard B2B : données comportementales clients en temps réel pour les restaurateurs",
  ],
  valeurClientIntangible: [
    "Sentiment d'appartenance tribale — être un Spawter, c'est avoir une identité culinaire reconnue",
    "Fierté de la progression : de Touriste à Guide, chaque titre est un accomplissement social",
    "Confiance éliminée : le stress du choix disparaît, le chat gère",
    "Statut social : partager son archétype Palais est un signal de sophistication culinaire",
  ],
  coutMarqueTangible: [
    "Développement MVP app : estimation 5-8M FCFA (8-12 jours badges)",
    "Budget communication annuel : 5M FCFA",
    "Coûts serveur/infra : estimation 500K FCFA/mois (hébergement, API, CDN)",
    "Salaires équipe core : Stéphanie (CEO/produit) + développeur + community manager",
  ],
  coutMarqueIntangible: [
    "Risque de perception élitiste — le système Palais peut sembler excluant pour les non-initiés",
    "Dépendance à la qualité des avis communautaires — un avis faux détruit la confiance du système",
    "Tension permanente entre croissance rapide et maintien de la qualité de curation",
    "Le vocabulaire propriétaire peut être une barrière à l'onboarding si mal introduit",
  ],
  coutClientTangible: [
    "Abonnement Gold B2C : 2500 FCFA/mois (24000/an) — prix d'un repas moyen",
    "Temps d'onboarding : 5-10 min pour créer son profil Palais des Saveurs",
    "Pour restaurateurs B2B : 15000-65000 FCFA/mois selon le tier",
  ],
  coutClientIntangible: [
    "Partager ses goûts = se dévoiler — vulnérabilité psychologique de l'identité culinaire exposée",
    "FOMO communautaire : pression sociale de participer pour ne pas perdre son niveau/titre",
    "Dépendance à l'app pour le choix restaurant — perte d'autonomie de décision spontanée",
  ],
};

// ── Pilier E — Engagement ──────────────────────────────────────────────────
// Schema: PillarESchema — TouchpointSchema, RitualSchema, KPISchema, etc.

const PILLAR_E = {
  // ── Chantier -1 : fondamentaux engagement ──────────────────────────────
  promesseExperience: "Chaque interaction avec SPAWT doit creer un micro-moment de decouverte identitaire. Pas de scroll passif — chaque ecran revele quelque chose sur toi. Le chat ne donne jamais la reponse directement : il te guide vers ta propre revelation culinaire.",
  superfanPortrait: {
    nom: "Koffi 'Le Guide'", age: "28",
    description: "Foodie Abidjanais obsede par les spots caches. 200+ restaurants testes en 2 ans. Recommander un spot = acte identitaire. Utilise SPAWT comme carte de visite culinaire. 15 conversions via bouche-a-oreille.",
    motivations: ["Statut de connaisseur reconnu", "Decouverte avant tout le monde", "Validation par le systeme Palais", "Appartenance a un groupe d'inities"],
    freins: ["Peur que SPAWT devienne mainstream", "Frustration si le matching stagne", "Sensibilite au prix si valeur baisse"],
  },
  ladderProductAlignment: [
    { devotionLevel: "SPECTATEUR", products: ["App Gratuite"], trigger: "Telecharge, fait le quiz Palais" },
    { devotionLevel: "INTERESSE", products: ["App Gratuite", "Check-ins"], trigger: "3+ check-ins, consulte archetypes" },
    { devotionLevel: "PARTICIPANT", products: ["SPAWT Pro 2500 FCFA/mois"], trigger: "Upgrade pour matching avance" },
    { devotionLevel: "ENGAGE", products: ["SPAWT Pro", "Food Tours 15K FCFA"], trigger: "Food Tour + badges" },
    { devotionLevel: "AMBASSADEUR", products: ["Programme Ambassadeur"], trigger: "5+ parrainages, UGC regulier" },
    { devotionLevel: "EVANGELISTE", products: ["Programme Legende"], trigger: "50+ check-ins, 10+ parrainages, viral" },
  ],
  primaryChannel: "APP" as const,
  productExperienceMap: [
    { productRef: "App Gratuite (Abidjan only)", experienceDescription: "Decouvre ton archetype culinaire en 3 taps — le chat te guide", emotionalOutcome: "Surprise et fierte identitaire" },
    { productRef: "SPAWT Pro (2500 FCFA/mois)", experienceDescription: "Matching avance multi-villes + badges collectibles + Food Tours prioritaires", emotionalOutcome: "Sentiment d'appartenance elite" },
    { productRef: "Food Tours (15K FCFA)", experienceDescription: "6 spots caches guides par un Spawter — rencontre la communaute en vrai", emotionalOutcome: "Connection humaine + decouverte" },
    { productRef: "Dashboard Restaurateur", experienceDescription: "Comprends qui sont tes clients via leurs archetypes Palais — optimise ton offre", emotionalOutcome: "Confiance dans les donnees client" },
  ],
  channelTouchpointMap: [
    { salesChannel: "DIRECT" as const, touchpointRefs: ["App Mobile SPAWT", "Food Tours", "Black Spawtday", "Pop-up Palais"] },
    { salesChannel: "HYBRID" as const, touchpointRefs: ["Instagram @spawt_ci", "TikTok SPAWT", "WhatsApp bouche-a-oreille", "Newsletter"] },
  ],
  barriersEngagement: [
    { barrier: "Friction onboarding si le quiz Palais est trop long", level: "SPECTATEUR" as const, mitigation: "Quiz en 3 ecrans max — resultat immediat, profondeur optionnelle" },
    { barrier: "Geo-paywall frustrant si pas assez de valeur gratuite", level: "INTERESSE" as const, mitigation: "Abidjan gratuit = 15K+ restaurants — suffisant pour prouver la valeur avant l'upgrade" },
    { barrier: "Pas de mode offline — connexion requise", level: "PARTICIPANT" as const, mitigation: "Cache local des favoris + mode avion pour les spots sauvegardes" },
  ],
  conversionTriggers: [
    { fromLevel: "SPECTATEUR" as const, toLevel: "INTERESSE" as const, trigger: "Quiz Palais revele un archetype inattendu — moment 'aha' identitaire", channel: "App" },
    { fromLevel: "INTERESSE" as const, toLevel: "PARTICIPANT" as const, trigger: "Frustration geo-paywall + recommandation ami Spawter Pro", channel: "App + WhatsApp" },
    { fromLevel: "PARTICIPANT" as const, toLevel: "ENGAGE" as const, trigger: "Premier Food Tour physique — rencontre avec d'autres Spawters", channel: "Evenementiel" },
    { fromLevel: "ENGAGE" as const, toLevel: "AMBASSADEUR" as const, trigger: "Un ami remercie pour une recommandation parfaite via SPAWT", channel: "App + Social" },
    { fromLevel: "AMBASSADEUR" as const, toLevel: "EVANGELISTE" as const, trigger: "#MonSpawt viral (1000+ vues) + invitation au Conseil des Legendes", channel: "TikTok + App" },
  ],

  // Touchpoints — { canal, type: TOUCHPOINT_TYPES, channelRef: CHANNELS, role (30+), aarrStage: AARRR_STAGES, devotionLevel: DEVOTION_LEVELS[], priority?, frequency? }
  touchpoints: [
    { canal: "App Mobile SPAWT", type: "DIGITAL" as const, channelRef: "APP" as const, role: "Hub principal — 3 modes contextuels (Rapide midi / Crew vendredi-samedi / Explore défaut magazine). Onboarding Palais, check-ins, avis, matching.", aarrStage: "RETENTION" as const, devotionLevel: ["SPECTATEUR" as const, "INTERESSE" as const, "PARTICIPANT" as const, "ENGAGE" as const, "AMBASSADEUR" as const], priority: 1, frequency: "DAILY" as const },
    { canal: "Instagram @spawt_ci", type: "DIGITAL" as const, channelRef: "INSTAGRAM" as const, role: "1 post + 5-8 stories/jour. Feed food porn authentique + dialecte SPAWT. Cible 50K abonnés M12. Canal de notoriété principal.", aarrStage: "ACQUISITION" as const, devotionLevel: ["SPECTATEUR" as const, "INTERESSE" as const], priority: 2, frequency: "DAILY" as const },
    { canal: "TikTok @spawt_abidjan", type: "DIGITAL" as const, channelRef: "TIKTOK" as const, role: "1-3 vidéos/jour. Dominic + Vanessa = canal acquisition principal coût quasi-nul. Cible 30K M12. Contenu UGC + dialecte.", aarrStage: "ACQUISITION" as const, devotionLevel: ["SPECTATEUR" as const, "INTERESSE" as const], priority: 3, frequency: "DAILY" as const },
    { canal: "WhatsApp groupes Explorateur+", type: "DIGITAL" as const, channelRef: "SMS" as const, role: "200 membres max, channel officiel SPAWT. Early access rituels hebdo. Le touchpoint de rétention communautaire le plus fort.", aarrStage: "RETENTION" as const, devotionLevel: ["PARTICIPANT" as const, "ENGAGE" as const, "AMBASSADEUR" as const], priority: 4, frequency: "WEEKLY" as const },
    { canal: "Food Tours mensuels", type: "PHYSIQUE" as const, channelRef: "EVENT" as const, role: "Événements physiques 15K FCFA. Seul touchpoint IRL. Collecte avis qualitatifs + contenu UGC premium. Acquisition premium qualifiée.", aarrStage: "ACTIVATION" as const, devotionLevel: ["ENGAGE" as const, "AMBASSADEUR" as const], priority: 5, frequency: "MONTHLY" as const },
    { canal: "Email SPAWT Weekly", type: "DIGITAL" as const, channelRef: "EMAIL" as const, role: "Dimanche 18h — récap trouvailles de la semaine + SPAWT Stories. Rétention long terme. Lien direct vers les nouveaux spots.", aarrStage: "RETENTION" as const, devotionLevel: ["INTERESSE" as const, "PARTICIPANT" as const, "ENGAGE" as const], priority: 6, frequency: "WEEKLY" as const },
    { canal: "Dashboard B2B", type: "DIGITAL" as const, channelRef: "WEBSITE" as const, role: "Analytics restaurateurs : insights archétypes Spawters, réservations, ROI mesurable. Le touchpoint qui convertit Pro vers Gold.", aarrStage: "REVENUE" as const, devotionLevel: ["ENGAGE" as const, "AMBASSADEUR" as const], priority: 7, frequency: "DAILY" as const },
  ],

  // Rituels — { nom, type: RITUAL_TYPES, frequency?, description (60+), devotionLevels: DEVOTION_LEVELS[], touchpoints?, aarrPrimary: AARRR_STAGES, kpiMeasure }
  rituels: [
    {
      nom: "La Quête du Midi",
      type: "ALWAYS_ON" as const,
      frequency: "DAILY" as const,
      description: "11h30-12h30 lun-ven — +5 Paws pour recommandation lunchtime validée. Le rituel quotidien le plus fort. Ancre l'habitude SPAWT dans la pause déjeuner de chaque Spawter actif.",
      devotionLevels: ["INTERESSE" as const, "PARTICIPANT" as const, "ENGAGE" as const],
      touchpoints: ["App Mobile SPAWT"],
      aarrPrimary: "RETENTION" as const,
      kpiMeasure: "Check-ins midi / MAU (cible >30%)",
    },
    {
      nom: "Le Planning Weekend",
      type: "ALWAYS_ON" as const,
      frequency: "WEEKLY" as const,
      description: "Vendredi 17-20h — +10 Paws pour le Spawter qui crée la liste de sortie du groupe. Mode Crew activé. Viral par WhatsApp. Le rituel social qui transforme SPAWT en outil de groupe.",
      devotionLevels: ["PARTICIPANT" as const, "ENGAGE" as const, "AMBASSADEUR" as const],
      touchpoints: ["App Mobile SPAWT", "WhatsApp groupes Explorateur+"],
      aarrPrimary: "REFERRAL" as const,
      kpiMeasure: "Listes Crew créées / vendredi (cible >100 M6)",
    },
    {
      nom: "Le Retour d'Expérience",
      type: "ALWAYS_ON" as const,
      frequency: "DAILY" as const,
      description: "Post-visite immédiat — +15 Paws pour l'avis qualitatif dans les 2h. Le rituel qui nourrit l'algorithme. Sans retours d'expérience, le matching perd sa précision. Le Spawter nourrit le Chat.",
      devotionLevels: ["INTERESSE" as const, "PARTICIPANT" as const, "ENGAGE" as const, "AMBASSADEUR" as const],
      touchpoints: ["App Mobile SPAWT"],
      aarrPrimary: "RETENTION" as const,
      kpiMeasure: "Avis qualitatifs / Spawter / mois (cible 4+)",
    },
    {
      nom: "La Découverte Nocturne",
      type: "CYCLIQUE" as const,
      frequency: "WEEKLY" as const,
      description: "Samedi 19-23h — mode Explore activé, spots nuit/bars/rooftops mis en avant. Paws x1.5 pour premier check-in dans un nouveau quartier nocturne. Le rituel qui pousse l'exploration au-delà du confort.",
      devotionLevels: ["PARTICIPANT" as const, "ENGAGE" as const],
      touchpoints: ["App Mobile SPAWT"],
      aarrPrimary: "ACTIVATION" as const,
      kpiMeasure: "Check-ins nocturnes samedi / MAU (cible >15%)",
    },
  ],

  // Principes communautaires — { principle (50+), enforcement }
  principesCommunautaires: [
    { principle: "Le Code Spawter — 10 règles fondatrices : explorer sans limites, partager honnêtement, respecter les avis des autres, soutenir les restos locaux, contribuer à la colonie, cultiver la curiosité, respecter les lieux, être authentique dans ses reviews.", enforcement: "Auto-régulation communautaire + modération humaine cas flagrants" },
    { principle: "Les Faux-Pas — 5 comportements d'exclusion : Fake Review (critique, exclusion immédiate), Gatekeeping (sérieux), Zone de Confort Absolue (modéré), Google Maps Zombie (symbolique), Hater Toxique (sérieux). La meute s'auto-régule par signalement.", enforcement: "Signalement pair-à-pair + sanctions graduées + exclusion permanente Faux-Pas #1" },
    { principle: "Le Contrat SPAWT — engagement mutuel : SPAWT s'engage à révéler ton identité culinaire avec précision et honnêteté. Tu t'engages à contribuer honnêtement à la colonie. Un contrat social, pas des CGU qu'on scroll.", enforcement: "Acceptation explicite à l'onboarding + rappels périodiques + violations traitées sérieusement" },
    { principle: "La Méritocratie des Titres — Chaque stade (Touriste→Guide) est gagné par l'action et la qualité, jamais par l'argent. L'abonnement Gold débloque des fonctionnalités, pas des niveaux. Le Djidji gratuit vaut autant que le Djidji Gold.", enforcement: "Paws calculés uniquement sur l'engagement qualitatif — pas de raccourci payant" },
    { principle: "Le Respect du Spot — Un Spawter ne dénigre pas un restaurant publiquement pour faire le buzz. La critique est constructive, détaillée et respectueuse. Le pouvoir de la communauté s'exerce avec responsabilité envers les restaurateurs.", enforcement: "Modération des avis diffamatoires + droit de réponse restaurateur + sanctions Faux-Pas #5" },
  ],

  // Taboos communautaires (Annexe G — tabous ≥2)
  taboos: [
    { taboo: "Le Fake Review — poster un avis bidon (positif ou négatif) pour manipuler le système", consequence: "Exclusion immédiate et définitive de la Meute. Faux-Pas #1, tolérance zéro. Le matching repose sur la confiance." },
    { taboo: "Le Gatekeeping — cacher volontairement ses trouvailles pour garder un spot 'secret'", consequence: "Sanction sérieuse. Le système SPAWT repose sur le partage — un Spawter qui ne contribue pas trahit le contrat social." },
    { taboo: "Le Spam Influenceur — utiliser SPAWT comme plateforme de promotion payée non déclarée", consequence: "Suspension compte + retrait des Paws gagnés via contenu sponsorisé non déclaré. La transparence est non-négociable." },
  ],

  // Gamification — { niveaux: [{ niveau, condition, reward, duration? }] }
  gamification: {
    niveaux: [
      { niveau: "Touriste", condition: "0-50 Paws — entrée dans la colonie", reward: "1 Coup de Coeur/mois gratuit, 2/mois Gold. Découverte du Palais.", duration: "1-4 semaines typique" },
      { niveau: "Explorateur", condition: "50-200 Paws — Spawter actif", reward: "Accès WhatsApp groupe. Rituels hebdo débloqués. Badge Explorateur visible.", duration: "1-3 mois typique" },
      { niveau: "Détective", condition: "200-500 Paws — chercheur de pépites", reward: "Badges Expertise débloqués. Avis pondérés x1.5. Reconnaissance communauté.", duration: "3-6 mois typique" },
      { niveau: "Djidji", condition: "500-1000 Paws — connaisseur respecté", reward: "2 Coups de Coeur/mois gratuit, 3/mois Gold. Tanière assignée. Voix dans direction catégories.", duration: "6-12 mois typique" },
      { niveau: "Guide", condition: "1000+ Paws — autorité de la meute", reward: "Modérateur communauté, beta features, Food Tours VIP, influence directe sur catalogue.", duration: "12+ mois typique" },
    ],
    recompenses: [
      "Badges collectibles à 4 niveaux de rareté : Commun, Rare, Épique, Légendaire",
      "Coups de Coeur — monnaie sociale rare (1-3/mois selon niveau)",
      "Tanière assignée — restaurant attitré au niveau Djidji+",
      "Accès Food Tours VIP mensuels pour les Djidji+",
      "Beta features exclusives pour les Guides",
      "Wrapped Annuel personnalisé avec insights avancés",
    ],
  },

  // AARRR — { acquisition, activation, retention, revenue, referral } (each 80+ chars)
  aarrr: {
    acquisition: "CAC cible <2000 FCFA (10K downloads M6, 25K M12). Mix : TikTok organique (Dominic/Vanessa coût quasi-nul), micro-influenceurs food Abidjan (meilleur ROI vs macro), Food Tours mensuels (acquisition premium qualifiée), bouche-à-oreille meute (viral coef cible 1.4). Paywall géo maintenu comme hook.",
    activation: "Objectif 60% activation J+7. Onboarding 3-5 minutes : Palais des Saveurs configuré (5 axes bipolaires), archétype révélé, première recommandation validée. Mode Rapide comme premier usage. La surprise de l'archétype calculé (pas choisi) est le moment 'aha'.",
    retention: "M1:50% / M3:35% / M6:25% / M12:20%. Rituels quotidiens (Quête du Midi) et hebdo (Planning Weekend) ancrent les habitudes. SPAWT Wrapped annuel crée l'événement de rétention majeur. La progression de maturité (Paws + archétype) rend l'abandon coûteux identitairement.",
    revenue: "Conversion 5% (M6) vers 8% (M12) Freemium vers Gold. Paywall géo = trigger #1. Churn <5%/mois. LTV/CAC >3.5x. B2B NRR >110% (upsell Pro vers Gold). ARR M12 30M FCFA = B2C 1.25M/mois + B2B 1.75M/mois.",
    referral: "Viral coef B2C cible 1.4. Mécaniques : Coups de Coeur partagés sur IG/WhatsApp, SPAWT Wrapped annuel (le plus partageable), Mode Crew (vote groupe = contenu WhatsApp natif), Badges collectibles rares. B2B NRR >110%.",
  },

  // KPIs — { name, metricType, target: number, frequency }
  kpis: [
    { name: "Downloads cumulés", metricType: "BEHAVIORAL" as const, target: 25000, frequency: "MONTHLY" as const },
    { name: "DAU/MAU ratio", metricType: "ENGAGEMENT" as const, target: 25, frequency: "DAILY" as const },
    { name: "Activation J+7", metricType: "BEHAVIORAL" as const, target: 60, frequency: "WEEKLY" as const },
    { name: "Rétention M1", metricType: "BEHAVIORAL" as const, target: 50, frequency: "MONTHLY" as const },
    { name: "Conversion premium B2C", metricType: "FINANCIAL" as const, target: 8, frequency: "MONTHLY" as const },
    { name: "ARR mensuel (FCFA)", metricType: "FINANCIAL" as const, target: 30000000, frequency: "MONTHLY" as const },
    { name: "Churn mensuel B2C", metricType: "FINANCIAL" as const, target: 5, frequency: "MONTHLY" as const },
    { name: "NPS B2C", metricType: "SATISFACTION" as const, target: 45, frequency: "MONTHLY" as const },
    { name: "Restaurants B2B actifs", metricType: "FINANCIAL" as const, target: 60, frequency: "MONTHLY" as const },
    { name: "Viral coefficient B2C", metricType: "BEHAVIORAL" as const, target: 1.4, frequency: "MONTHLY" as const },
    { name: "Score matching médian", metricType: "SATISFACTION" as const, target: 85, frequency: "WEEKLY" as const },
    { name: "Avis qualitatifs par Spawter", metricType: "ENGAGEMENT" as const, target: 4, frequency: "MONTHLY" as const },
  ],

  // Sacred Calendar — { date, name, significance }
  sacredCalendar: [
    { date: "Novembre", name: "Black Spawtday", significance: "-50% Gold pendant 48h. L'événement commercial annuel le plus attendu. Conversion massive freemium vers Gold." },
    { date: "Décembre", name: "SPAWT Wrapped", significance: "Récap annuel identité culinaire. L'événement de rétention et viralité maximal. Comme Spotify Wrapped mais pour ta vie food." },
    { date: "Février", name: "Saint-Valentin SPAWT", significance: "Mode Date Night activé. Matching couple. Coup de Coeur x2 weekend. Partenariats restaurants premium." },
    { date: "Ramadan", name: "Mode Ramadan", significance: "Horaires décalés, cuisine spécialisée Iftar mise en avant. Rituels adaptés aux horaires de jeûne." },
    { date: "Janvier", name: "New Year Foodie Reset", significance: "Nouveau calcul du Palais, évolution d'archétype possible. Le renouveau identitaire annuel." },
  ],

  // Commandments — { commandment, justification }
  commandments: [
    { commandment: "Tu exploreras sans te limiter à ta zone de confort", justification: "Paws x2 pour premier visit dans nouveau quartier — l'exploration est un muscle" },
    { commandment: "Tu partageras honnêtement — pas pour plaire, pour informer", justification: "Fake Review = Faux-Pas #1, exclusion immédiate — l'honnêteté est la monnaie SPAWT" },
    { commandment: "Tu respecteras les lieux que tu critiques", justification: "Tu as la voix d'un insider, pas d'un juge — critique constructive uniquement" },
    { commandment: "Tu spawteras en squad — un repas partagé vaut 3x", justification: "Mode Crew existe pour ça — la communauté est le produit, pas l'app" },
    { commandment: "Tu réclameras tes trouvailles — chaque pépite découverte compte", justification: "Chaque pépite renforce ta réputation de Détective et enrichit le catalogue" },
    { commandment: "Tu ne noteras jamais en étoiles — le Palais remplace les ratings", justification: "Le matching archétype bat la moyenne arithmétique. Les étoiles sont l'ennemi." },
    { commandment: "Tu mériteras ton titre — pas d'argent qui achète un stade", justification: "Gold débloque des features, pas des niveaux. Le Djidji se gagne, il ne s'achète pas." },
    { commandment: "Tu ne gatekeeperas point — une trouvaille partagée vaut plus qu'un secret gardé", justification: "Le Gatekeeping est un Faux-Pas sérieux. La générosité culinaire nourrit la Meute." },
    { commandment: "Tu feras confiance au Chat — l'algorithme te connaît mieux que tes certitudes", justification: "Le matching 4D est conçu pour surprendre positivement — lâche prise et laisse le Chat renifler." },
    { commandment: "Tu protègeras la Meute — signaler les Faux-Pas est un devoir, pas une délation", justification: "L'auto-régulation maintient la qualité du système. Chaque signalement légitime protège la communauté." },
  ],

  // Rites de passage — { fromStage: DEVOTION_LEVELS, toStage: DEVOTION_LEVELS, rituelEntree, symboles? }
  ritesDePassage: [
    { fromStage: "SPECTATEUR" as const, toStage: "INTERESSE" as const, rituelEntree: "Révélation du Palais — premier calcul de l'archétype après onboarding", symboles: ["Archétype calculé", "Palais des Saveurs configuré", "Premier badge Touriste"] },
    { fromStage: "INTERESSE" as const, toStage: "PARTICIPANT" as const, rituelEntree: "Premier Coup de Coeur donné — première utilisation de la monnaie sociale rare", symboles: ["Badge Coup de Coeur", "Entrée dans un groupe WhatsApp"] },
    { fromStage: "PARTICIPANT" as const, toStage: "ENGAGE" as const, rituelEntree: "Passage Djidji — atteindre 500 Paws et se voir assigner sa Tanière", symboles: ["Titre Djidji", "Tanière assignée", "Badge connaisseur"] },
    { fromStage: "ENGAGE" as const, toStage: "AMBASSADEUR" as const, rituelEntree: "Passage Guide — 1000+ Paws, validation par la communauté, accès modération", symboles: ["Titre Guide", "Badge Modérateur", "Accès beta features", "Food Tour VIP offert"] },
    { fromStage: "AMBASSADEUR" as const, toStage: "EVANGELISTE" as const, rituelEntree: "Reconnaissance comme pilier fondateur — contribution exceptionnelle au système SPAWT", symboles: ["Titre Légende", "Carte Spawter Légendaire", "Influence directe sur la roadmap produit"] },
  ],

  // Sacraments — { nomSacre, trigger, action, reward, kpi, aarrStage }
  sacraments: [
    { nomSacre: "Le Spawt", trigger: "Arrivée dans un restaurant SPAWT", action: "Check-in validé via l'app", reward: "+5 Paws base, x2 si nouveau quartier", kpi: "Check-ins / jour / MAU", aarrStage: "RETENTION" as const },
    { nomSacre: "L'Avis Qualitatif", trigger: "Post-visite dans les 2h", action: "Rédaction d'un avis honnête avec photo", reward: "+15 Paws, contribution au matching", kpi: "Avis qualitatifs / Spawter / mois", aarrStage: "RETENTION" as const },
    { nomSacre: "Le Coup de Coeur", trigger: "Expérience exceptionnelle dans un spot", action: "Attribution de la monnaie sociale rare", reward: "Reconnaissance communauté + impact algorithme", kpi: "Coups de Coeur donnés / mois / niveau", aarrStage: "REFERRAL" as const },
    { nomSacre: "La Trouvaille", trigger: "Découverte d'un spot non répertorié", action: "Ajout du spot au catalogue avec description", reward: "+30 Paws + badge Découvreur", kpi: "Nouveaux spots ajoutés / mois", aarrStage: "ACTIVATION" as const },
    { nomSacre: "Le Wrapped Annuel", trigger: "31 décembre de chaque année", action: "Révélation du récap annuel identité culinaire", reward: "Insights personnels + partage social viral", kpi: "Taux de partage Wrapped / MAU", aarrStage: "REFERRAL" as const },
  ],
};

// ── Pilier R — Risques ─────────────────────────────────────────────────────
// Schema: PillarRSchema — SWOTQuadrantSchema, RiskEntrySchema

const PILLAR_R = {
  globalSwot: {
    strengths: [
      "Système d'identité unique : 13 archétypes + Palais des Saveurs impossible à copier",
      "Fondatrice Insider : Stéphanie Bidje vit à Abidjan, est la cible, connaît le terrain",
      "Modèle B2B/B2C bifrontal avec network effects auto-renforçants",
      "First mover marché identité culinaire Côte d'Ivoire — zéro concurrent direct",
      "Mission 1 VALIDÉE : tous les seuils dépassés, Go confirmé data-driven",
    ],
    weaknesses: [
      "Dépendance UGC qualité : le matching repose sur des avis honnêtes et suffisants",
      "Équipe founding très petite : Pioneer + 2 Co-Pilots, scaling opérationnel fragile",
      "Marché premium limité : Betsy/Brice = fraction du total, Dominic/Vanessa non-payants",
      "Sensibilité au financement : ARR M12 30M FCFA insuffisant sans levée pour scaler",
    ],
    opportunities: [
      "Expansion multi-villes design portable (Dakar, Douala, Lagos = même problème goumin)",
      "Nouveau BU hébergement/loisirs identifié en workshop du 26/2/26",
      "Data B2B premium : insights Palais à haute valeur pour restaurateurs et groupes",
      "Partenariats paiement mobile : Orange Money + Wave pour conversion sans friction",
    ],
    threats: [
      "Google Maps intègre des fonctionnalités sociales communautaires en Afrique",
      "Clone local mieux financé copie le concept sans la profondeur du système",
      "Churn restaurant B2B si ROI non démontré en M3 (tolérance faible aux abonnements)",
      "Fake reviews compromettent la confiance et l'intégrité de l'algorithme",
    ],
  },

  // Matrice probabilité-impact — { risk, probability: RISK_LEVELS, impact: RISK_LEVELS, mitigation (40+) }
  probabilityImpactMatrix: [
    { risk: "Masse critique insuffisante M6 : <5K downloads, conversion <3%", probability: "MEDIUM" as const, impact: "HIGH" as const, mitigation: "TikTok organique (Dominic/Vanessa) + ambassadeurs Allié Content + Food Tours mensuels = acquisition quasi-gratuite avant paid. Mission 1 validée réduit ce risque." },
    { risk: "Google Maps lance feature identité/communauté Afrique de l'Ouest", probability: "LOW" as const, impact: "HIGH" as const, mitigation: "Le système Palais des Saveurs (13 archétypes, 5 stades) construit sur 4 ans est incopiable par un géant. Le dialecte SPAWT crée un lock-in culturel, pas technique." },
    { risk: "Fake reviews systématiques compromettent l'intégrité algo", probability: "LOW" as const, impact: "HIGH" as const, mitigation: "Faux-Pas #1 = exclusion immédiate. Code Spawter comme garde-fou culturel. Modération communautaire auto-régulée + signalement pair-à-pair." },
    { risk: "Clone local mieux financé (Lagos-based) en 12 mois", probability: "MEDIUM" as const, impact: "MEDIUM" as const, mitigation: "First mover + profondeur système Palais + dialecte construit sur 4 ans + communauté locale = barrières non-réplicables par l'argent seul." },
    { risk: "Churn B2B >20%/mois faute de ROI démontré Mission 1", probability: "MEDIUM" as const, impact: "HIGH" as const, mitigation: "Mission 1 a validé 14/20 restaurants intéressés. Le Bo Zinc prêt à signer Gold. Dashboard B2B avec ROI mesurable dès l'onboarding." },
  ],

  // Mitigations — { action (40+), owner?, timeline?, investment? }
  mitigationPriorities: [
    { action: "Mission 1 terrain complétée avec succès — 26 interviews + 20 restaurants = preuve du problème et validation de la valeur avant tout investissement marketing", owner: "Pioneer (Stéphanie)", timeline: "FAIT — Mars 2026", investment: "Coût terrain uniquement" },
    { action: "Système de modération communautaire auto-régulé via Faux-Pas et Code Spawter comme garde-fou culturel contre les fake reviews et comportements toxiques", owner: "Co-Pilot Ops (Alexandre)", timeline: "Beta — Avril 2026", investment: "Dev + modération humaine ponctuelle" },
    { action: "Paywall géo maintenu comme barrière cognitive — les clones copient les features mais pas la profondeur du système Palais ni le dialecte construit sur 4 ans", owner: "Pioneer", timeline: "Design permanent", investment: "Zéro — décision stratégique" },
    { action: "Priorité conversion premium tôt M3-4 pour démontrer ARR réel avant de scaler acquisition — ne pas gaspiller le budget marketing avant rétention validée", owner: "Pioneer + Co-Pilot Tech (Kidam)", timeline: "M3-4 2026", investment: "Dev paiement Wave/OM" },
    { action: "Ambassadeurs Allié Content (accès premium gratuit) comme bootstrap de croissance organique — x10 Vanessa = 5000 vues/semaine sans burn marketing", owner: "Co-Pilot Ops (Alexandre)", timeline: "Pré-lancement Mai 2026", investment: "10-15 accès premium gratuits" },
  ],

  // ── Chantier -1 : champs enrichis pour maturite COMPLETE ───────────────
  microSWOTs: {
    a: { strengths: ["Systeme Palais unique 13 archetypes", "Fondatrice insider 4 ans Abidjan", "Hero's Journey authentique et documentee"], weaknesses: ["Mythologie pas encore activee", "Canon communautaire vide pre-lancement", "Pas de contenu #MonSpawt existant"], opportunities: ["Extension canon communautaire", "Podcast Le Palais", "Partenariats chefs locaux"], threats: ["Copie du concept archetype", "Fatigue narrative si trop de storytelling", "Dependance a la fondatrice pour la credibilite"] },
    d: { strengths: ["Positionnement identite > utilite clair", "Dialecte SPAWT distinctif", "4 personas valides terrain"], weaknesses: ["Direction artistique incomplete", "Pas de brand guidelines formalisees", "Logo non finalise"], opportunities: ["Systeme visuel cartes collectibles", "Expansion dialecte multi-villes", "Merchandising physique"], threats: ["Dilution positionnement si features utilitaires", "Imitation dialecte par concurrent", "Incoherence ton si equipe grandit"] },
    v: { strengths: ["Modele freemium geo-paywall innovant", "LTV/CAC 3.5x valide", "3 revenue streams (B2C/B2B/events)"], weaknesses: ["ARR M12 30M insuffisant sans levee", "Zero MRR actuel", "Pricing B2B non teste a grande echelle"], opportunities: ["Data B2B premium haute valeur", "Food Tours scalables multi-villes", "API data culinaire"], threats: ["Guerre des prix si concurrent gratuit", "Churn B2B si ROI non demontre", "Pression sur les marges si CAC augmente"] },
    e: { strengths: ["Rituels communautaires uniques", "Parcours devotion 6 niveaux", "Gamification badges innovante"], weaknesses: ["Zero users actifs pre-lancement", "Food Tours non testes a echelle", "Mode Crew non valide"], opportunities: ["Viral via Mode Crew + badges", "UGC communautaire", "Events physiques recurrents"], threats: ["Desengagement si matching decevant", "Communaute toxique sans moderation", "Fatigue gamification"] },
  },
  coherenceRisks: [
    { pillar1: "A", pillar2: "D", field1: "archetype (Explorateur)", field2: "tonDeVoix (pas de bullshit)", contradiction: "L'archetype Explorateur pousse a l'aventure mais le ton direct peut sembler froid ou distant", severity: "LOW" as const },
    { pillar1: "V", pillar2: "E", field1: "freeLayer (geo-paywall)", field2: "touchpoints (engagement recurrent)", contradiction: "Le paywall geo peut creer de la frustration plutot que de la motivation communautaire", severity: "MEDIUM" as const },
  ],
  devotionVulnerabilities: [
    { level: "SPECTATEUR" as const, churnCause: "Pas de 'aha moment' si le quiz Palais ne surprend pas", mitigation: "Optimiser le quiz pour maximiser l'effet de surprise sur l'archetype revele" },
    { level: "PARTICIPANT" as const, churnCause: "Matching stagnant si pas assez de check-ins dans la base", mitigation: "Gamification badges pour incentiviser les check-ins + seed 200 avis initiaux" },
    { level: "AMBASSADEUR" as const, churnCause: "Programme Allie Content pas assez valorisant vs effort contenu", mitigation: "Acces premium gratuit + visibilite prioritaire dans l'app + invitation Food Tours VIP" },
  ],
  riskScore: 32, // 32/100 — risque modere, Mission 1 validee reduit l'incertitude
  pillarGaps: {
    a: { score: 92, gaps: ["livingMythology.captureSystem non active — activer #MonSpawt en beta"] },
    d: { score: 90, gaps: ["directionArtistique partielle — executer BRANDBOOK-D pour systeme visuel complet"] },
    v: { score: 88, gaps: ["mvp.userCount a mettre a jour post-lancement beta"] },
    e: { score: 90, gaps: ["metriques traction a collecter Mission 1 dans pilier T"] },
  },
  overtonBlockers: [
    { risk: "Notoriete insuffisante hors cercle early-adopter", blockingPerception: "App foodie de niche inconnue du grand public Abidjan", mitigation: "Campagne TikTok organique + Food Tours mensuels + ambassadeurs Vanessa-tier", devotionLevelBlocked: "SPECTATEUR" as const },
    { risk: "Confusion 'encore une app de restos'", blockingPerception: "Alternative a Google Maps pour trouver un restaurant", mitigation: "Contenu educatif sur le systeme Palais des Saveurs — identite, pas restaurant", devotionLevelBlocked: "INTERESSE" as const },
  ],
};

// ── Pilier T — Triangulation ───────────────────────────────────────────────
// Schema: PillarTSchema

const PILLAR_T = {
  triangulation: {
    customerInterviews: "Mission 1 terrain COMPLÉTÉE (mars 2026) : 26 interviews foodies qualifiés réalisées. KPIs validés : 78% confirment fréquence >2x/semaine (seuil 70% atteint), frustration moyenne 7.8/10 (seuil 7 atteint), 72% intention usage post-maquette (seuil 60% dépassé). 6 catégories restaurants testées. Insight clé B2B : 'SPAWT devient indispensable quand une partie du fonctionnement est délocalisée sur l'app.'",
    competitiveAnalysis: "Google Maps : omniscient, impersonnel, zéro identité. TripAdvisor : touristes, hors marché local. Instagram Food : hype sans vérité (Assinie Beach Club insight : hype != réservations). WhatsApp bouche-à-oreille : concurrent indirect le plus fort que SPAWT digitalise. Conclusion : SPAWT n'a PAS de concurrent direct sur l'identité culinaire en Côte d'Ivoire. Le vrai concurrent est l'inertie.",
    trendAnalysis: "Tendance 1 — Identité numérique Gen Z/Millennial Afrique : 18-39 ans ABJ veulent des outils qui révèlent qui ils sont. Spotify Wrapped = benchmark. Tendance 2 — Mobile-first Afrique de l'Ouest : 95%+ smartphone, paiement mobile, offline mandatory. Tendance 3 — Communauté > Contenu : membership identitaire = rétention 2-3x supérieure. Tendance 4 — Food Economy Abidjan : 15 000+ restaurants, classe moyenne en croissance.",
    financialBenchmarks: "ARR M12 cible 30M FCFA (~45K EUR). Marge brute 70-80%. CAC B2C <2000 FCFA (benchmark apps africaines : 3-5K paid, 500-1K organique). LTV B2C Gold : 2500/mois x 14 mois rétention = 35K FCFA. LTV/CAC = 3.5x (au seuil). B2B : 50 Pro x 15K + 10 Gold x 65K = 1.4M/mois. Break-even ~3M ARR = M8.",
  },

  // Hypotheses — { hypothesis, validationMethod, status: "HYPOTHESIS"|"TESTING"|"VALIDATED"|"INVALIDATED", evidence? }
  hypothesisValidation: [
    { hypothesis: "Le problème 'chercher un restaurant' est ressenti >2x/semaine à Abidjan", validationMethod: "Interviews terrain 20-30 foodies qualifiés", status: "VALIDATED" as const, evidence: "26 interviews — 78% confirment >2x/semaine (seuil 70% atteint). Frustration 7.8/10." },
    { hypothesis: "Le matching archétype 92% est perçu plus pertinent qu'un conseil WhatsApp", validationMethod: "Test maquette — intention usage post-démo", status: "VALIDATED" as const, evidence: "72% répondent OUI à 'tu l'utiliserais' (seuil 60% dépassé). Surprise forte sur archétype." },
    { hypothesis: "5% des users freemium convertissent Premium avant M6", validationMethod: "Paywall géo trigger mesuré J+7 et J+30", status: "HYPOTHESIS" as const, evidence: "Non testé — beta requis. Paywall géo prêt à mesurer post-launch." },
    { hypothesis: "Les restaurants B2B paient pour les insights archétype si ROI démontré M3", validationMethod: "Pitch implicite lors Mission 1 + feedback B2B", status: "TESTING" as const, evidence: "14/20 restaurants intéressés (70%). Le Bo Zinc prêt à signer Gold. Réticents : 'indispensable si réservations via app'." },
    { hypothesis: "Viral coef 1.4 atteignable via Mode Crew + SPAWT Wrapped", validationMethod: "Mesure k-factor post-lancement beta", status: "HYPOTHESIS" as const, evidence: "Non testé — beta requis." },
  ],

  // TAM/SAM/SOM — { tam: { value, description }, sam: { ... }, som: { ... } }
  tamSamSom: {
    tam: { value: 50000000000, description: "Marché restaurant digital Afrique subsaharienne francophone (~50Md FCFA)" },
    sam: { value: 3000000000, description: "Abidjan + Dakar + Douala foodies premium (3Md FCFA)" },
    som: { value: 500000000, description: "Abidjan 2026 ARR annualisé à 3 ans = 500M FCFA" },
  },

  brandMarketFitScore: 82,
  competitorOvertonPositions: [
    { competitorName: "Google Maps", overtonPosition: "Reference universelle geolocalisation — omniscient mais impersonnel, zero identite culinaire", relativeToUs: "PARALLEL" as const },
    { competitorName: "TripAdvisor", overtonPosition: "Guide touriste — hors marche local Abidjan, cible differente", relativeToUs: "DIVERGENT" as const },
    { competitorName: "WhatsApp bouche-a-oreille", overtonPosition: "Le vrai concurrent — recommandations spontanees entre amis, zero structure", relativeToUs: "AHEAD" as const },
  ],
  marketDataSources: [
    { sourceType: "INTERVIEWS", title: "Mission 1 terrain mars 2026 — 26 interviews foodies + 20 restaurants", collectedAt: "2026-03-15", reliability: 0.9 },
    { sourceType: "INDUSTRY_REPORT", title: "TechCrunch Africa — Google social features pilot Nigeria", collectedAt: "2026-02-01", reliability: 0.7 },
    { sourceType: "MARKET_DATA", title: "Rapport Jumia Q4 2025 — food delivery Afrique de l'Ouest", collectedAt: "2026-01-15", reliability: 0.8 },
  ],
  lastMarketDataRefresh: "2026-03-15",
  sectorKnowledgeReused: false,

  // ── Chantier -1 : champs enrichis pour maturite COMPLETE ───────────────
  riskValidation: [
    { riskRef: "Masse critique <5K M6", marketEvidence: "Mission 1 terrain — 78% frequence >2x/sem, 72% intention usage post-maquette, 7.8/10 frustration", status: "CONFIRMED" as const },
    { riskRef: "Google Maps social features Afrique", marketEvidence: "Veille TechCrunch — pilot Nigeria anglophone seulement, pas de plan francophone annonce", status: "UNKNOWN" as const },
    { riskRef: "Clone local mieux finance", marketEvidence: "4 ans de systeme Palais + dialecte SPAWT + 13 archetypes = barriere non-replicable par l'argent seul", status: "DENIED" as const },
    { riskRef: "Churn B2B >20%/mois", marketEvidence: "14/20 restaurants interesses Mission 1, Le Bo Zinc pret Gold. Dashboard ROI requis M3.", status: "UNKNOWN" as const },
  ],
  overtonPosition: {
    currentPerception: "App foodie de niche pour early-adopters Abidjan — 'encore une app de restos' pour le grand public",
    marketSegments: [
      { segment: "Early-adopters foodies (Betsy/Brice)", perception: "Comprennent le concept Palais instantanement — 72% intention usage" },
      { segment: "Mainstream Abidjan", perception: "Voient une app de restos parmi d'autres — ne saisissent pas le systeme identitaire" },
      { segment: "Restaurateurs B2B", perception: "Interesses par le trafic client mais sceptiques sur le ROI mesurable" },
    ],
    confidence: 0.75,
  },
  perceptionGap: {
    currentPerception: "App foodie de niche — 'encore une app de restos' pour le grand public",
    targetPerception: "Systeme d'identite culinaire — le Myers-Briggs de la gastronomie africaine",
    gapDescription: "Le gap principal est la comprehension du concept Palais des Saveurs. Les early-adopters saisissent instantanement (72% intention Mission 1), le marche mainstream a besoin de 3 triggers : voir un ami partager son archetype, vivre le moment 'aha' du quiz, entendre parler d'un Food Tour.",
    closingStrategy: "Social proof communautaire, pas publicite. Education par l'experience, pas par le message.",
  },
  traction: {
    preuvesTraction: [
      "Mission 1 : 26/30 interviews realisees (87%), tous seuils depasses",
      "14/20 restaurants interesses B2B (70%), Le Bo Zinc pret Gold",
      "72% intention usage post-maquette (seuil 60% depasse)",
      "78% frequence >2x/semaine confirmee (seuil 70% atteint)",
      "Frustration moyenne 7.8/10 (seuil 7 atteint)",
    ],
    mrrActuel: 0,
    usersActifs: 0,
    northStarMetric: "Nombre de check-ins/semaine par Spawter actif (cible: 3+)",
  },
  marketReality: {
    macroTrends: [
      "Identite numerique Gen Z/Millennial Afrique — 18-39 ans veulent des outils qui revelent qui ils sont",
      "Mobile-first Afrique de l'Ouest — 95%+ smartphone, paiement mobile, offline mandatory",
      "Communaute > Contenu — membership identitaire = retention 2-3x superieure",
      "Food Economy Abidjan — 15 000+ restaurants, classe moyenne en croissance",
    ],
    weakSignals: [
      "Google teste des features sociales en Afrique anglophone (TechCrunch Africa)",
      "Glovo et Jumia Food gagnent du terrain sur la livraison mais pas la decouverte",
    ],
  },
  weakSignalAnalysis: [
    {
      thesis: "Google Maps pourrait devenir un concurrent indirect en integrant des features sociales communautaires",
      rawEvent: "Google Maps teste un pilot de features sociales (reviews enrichies, profils locaux) en Nigeria anglophone",
      causalChain: [
        { from: "Pilot Nigeria", to: "Succes mesure par engagement", mechanism: "A/B test features sociales sur 500K users Lagos", confidence: 0.4 },
        { from: "Succes Nigeria", to: "Rollout Afrique francophone", mechanism: "Extension regionale si metriques positives (12-18 mois)", confidence: 0.3 },
        { from: "Rollout francophone", to: "Pression sur SPAWT", mechanism: "Google integre recommandations sociales → erosion du differenciateur SPAWT", confidence: 0.5 },
      ],
      impactCategory: "COMPETITIVE" as const,
      brandImpact: "Erosion du positionnement 'seul systeme de recommandation identitaire' si Google copie les features de base",
      confidence: 0.35,
      urgency: "LOW" as const,
    },
    {
      thesis: "La croissance du food delivery pourrait creer une confusion marche entre livraison et decouverte",
      rawEvent: "Glovo et Jumia Food enregistrent une croissance de 40% en 2025 a Abidjan",
      causalChain: [
        { from: "Croissance delivery", to: "Habitude de commande digitale", mechanism: "Les users s'habituent a choisir des restaurants sur ecran", confidence: 0.7 },
        { from: "Habitude digitale", to: "Confusion SPAWT = delivery", mechanism: "Le grand public ne distingue pas 'decouverte identitaire' de 'commande en ligne'", confidence: 0.4 },
      ],
      impactCategory: "COMPETITIVE" as const,
      brandImpact: "Risque de mauvais positionnement percu — SPAWT doit etre clairement decouverte identitaire, jamais livraison",
      confidence: 0.45,
      urgency: "MEDIUM" as const,
    },
  ],
};

// ── Pilier I — Implémentation ──────────────────────────────────────────────
// Schema: PillarISchema — MarketingActionSchema

const PILLAR_I = {
  // Sprint 90 Days — { action (100+), owner?, kpi, priority, isRiskMitigation? }
  sprint90Days: [
    { action: "Mission 1 terrain COMPLÉTÉE : 26 interviews foodies + 20 restaurants validés en 6 catégories. Go/No-Go = GO confirmé. Tous les seuils de validation dépassés (78% fréquence, 7.8/10 frustration, 72% intention usage, 14/20 restaurants intéressés B2B).", owner: "Pioneer + Co-Pilots", kpi: "Interviews réalisées / seuils atteints", priority: 1, isRiskMitigation: true },
    { action: "MVP Badges en développement : 18 badges B2C (catégories Exploration, Expertise, Influence) + 8 badges B2B validés. Design inspiré des cartes collectibles premium avec système de rareté 4 niveaux (Commun, Rare, Épique, Légendaire).", owner: "Co-Pilot Tech (Kidam)", kpi: "Badges livrés en 8-12 jours dev", priority: 2 },
    { action: "Validation des 5 décisions bloquantes : document stratégique approuvé, MVP confirmé, pricing B2B validé (Pro 15K / Gold 65K / Corporate 300K), naming chat en vote communauté beta, périmètre géographique = Abidjan uniquement pour le lancement.", owner: "Pioneer", kpi: "5/5 décisions prises", priority: 3, isRiskMitigation: true },
    { action: "Onboarding 20 restaurants pilotes validés Mission 1 : 5 Date Night + 5 Dabali Roots + 3 Boys Barbecue + 3 Nouveaux + 2 Hype Instagram + 2 Réticents Sceptiques. 14 intéressés B2B dont Le Bo Zinc prêt Gold.", owner: "Co-Pilot Ops (Alexandre)", kpi: "20 restaurants profils créés", priority: 4 },
    { action: "Production contenus pré-lancement : 30 posts food porn Abidjan Instagram + 10 vidéos TikTok pre-launch dialecte SPAWT + 5 Reels SPAWT Stories. Contenu authentique, pas de studio. Bridge Factory en production.", owner: "Bridge Factory (Allié)", kpi: "45 contenus produits avant beta", priority: 5 },
    { action: "Programme Ambassadeurs Allié Content : recrutement 10-15 créatrices food Vanessa-tier. Accès premium gratuit en échange de contenu UGC minimum 2 posts/semaine. Coût quasi-nul, reach organique x10.", owner: "Co-Pilot Ops (Alexandre)", kpi: "10+ ambassadrices recrutées", priority: 6 },
    { action: "Intégration infrastructure paiement mobile : Wave + Orange Money connectés au checkout pour conversion premium sans friction. Prérequis critique : la friction paiement est mortelle en Afrique de l'Ouest.", owner: "Co-Pilot Tech (Kidam)", kpi: "Paiement mobile opérationnel avant beta", priority: 7, isRiskMitigation: true },
    { action: "Lancement beta privé 100 Spawters : test complet des 3 modes (Rapide/Crew/Explore) + système Palais des Saveurs + premiers archétypes calculés. La surprise de l'archétype = moment 'aha' critique.", owner: "Pioneer + Co-Pilots", kpi: "100 Spawters actifs J+7, activation 60%", priority: 8 },
  ],

  // Annual Calendar — { name, quarter: 1|2|3|4, objective, budget?, drivers?: CHANNELS[] }
  annualCalendar: [
    { name: "Mission 1 COMPLÉTÉE", quarter: 1 as const, objective: "Go/No-Go terrain — 26 interviews + 20 restaurants = GO confirmé", drivers: ["EVENT" as const] },
    { name: "Beta privé 100 Spawters", quarter: 2 as const, objective: "Test app complet + Palais + premiers archétypes révélés", budget: 2000000, drivers: ["APP" as const] },
    { name: "Mission 2 Activation", quarter: 2 as const, objective: "Campagnes locales, ambassadeurs, communauté, Alliés B2B", budget: 5000000, drivers: ["INSTAGRAM" as const, "TIKTOK" as const, "EVENT" as const] },
    { name: "Launch public Abidjan", quarter: 2 as const, objective: "Téléchargements J0, première Quête du Midi", budget: 3000000, drivers: ["APP" as const, "INSTAGRAM" as const, "TIKTOK" as const] },
    { name: "Mission 3 Consolidation", quarter: 3 as const, objective: "Analyse cohortes, power user interviews, brand audit", budget: 2000000, drivers: ["APP" as const, "EMAIL" as const] },
    { name: "Black Spawtday", quarter: 4 as const, objective: "Premier événement commercial majeur — conversion massive", budget: 1500000, drivers: ["APP" as const, "INSTAGRAM" as const, "EMAIL" as const] },
    { name: "SPAWT Wrapped V1", quarter: 4 as const, objective: "Premier récap annuel — rétention + viralité maximale", budget: 1500000, drivers: ["APP" as const, "INSTAGRAM" as const, "TIKTOK" as const] },
  ],

  globalBudget: 15000000,

  // Team — { name, title, responsibility }
  teamStructure: [
    { name: "Stéphanie Bidje", title: "Pioneer / CEO", responsibility: "Vision produit, stratégie, BD, finance — PRINCE2 certifiée, ex-Jumia/Auchan" },
    { name: "Kidam", title: "Co-Pilot Tech", responsibility: "Développement app iOS/Android, infrastructure, MVP badges, intégration paiement mobile" },
    { name: "Alexandre", title: "Co-Pilot Ops/Marketing", responsibility: "Terrain B2B, community management, onboarding restaurants, ambassadeurs" },
    { name: "Bridge Factory", title: "Allié Contenu", responsibility: "Production vidéo TikTok/Reels, food porn photography, dialecte SPAWT en contenu" },
  ],

  // Brand Platform — { name?, benefit?, target?, competitiveAdvantage?, emotionalBenefit?, functionalBenefit?, supportedBy? }
  brandPlatform: {
    name: "SPAWT — App d'identité culinaire",
    benefit: "Plus jamais le goumin d'un mauvais restau",
    target: "Foodies 18-39 ans Abidjan (B2C) + Restaurants toutes catégories (B2B)",
    competitiveAdvantage: "Système Palais des Saveurs (13 archétypes, 5 stades) — impossible à copier, construit sur 4 ans",
    emotionalBenefit: "Tu es quelqu'un ici. Ton identité culinaire est reconnue, calculée, célébrée.",
    functionalBenefit: "3 taps, 1 spot. Matching 92%. Zéro goumin.",
    supportedBy: "26 interviews validées Mission 1 + 14/20 restaurants intéressés B2B + Le Bo Zinc prêt Gold",
  },

  syntheseExecutive: "SPAWT a complété sa Mission 1 terrain avec succès (mars 2026) : 26 interviews foodies, 20 restaurants validés en 6 catégories, Go/No-Go = GO. Les seuils sont tous dépassés (78% fréquence >2x/sem, frustration 7.8/10, 72% intention usage). 14/20 restaurants intéressés B2B dont Le Bo Zinc prêt Gold. Les 60 prochains jours : MVP badges (8-12j dev), programme Ambassadeurs Allié Content (10-15 Vanessa-tier), intégration Wave/OM, beta privé 100 Spawters. Mission 2 Activation ciblée mois 5-6, Mission 3 Consolidation mois 9-10. ARR M12 cible 30M FCFA réaliste avec KPIs validation terrain confirmés.",

  // ── Chantier -1 : champs de potentiel/catalogue (I = tout ce qui est POSSIBLE) ──
  catalogueParCanal: {
    DIGITAL: [
      { action: "App mobile SPAWT (3 modes : Rapide/Crew/Explore)", format: "Application native iOS/Android", objectif: "Hub central d'engagement et de matching", pilierImpact: "E" as const },
      { action: "Site web vitrine + blog food culture Abidjan", format: "Web responsive", objectif: "SEO + credibilite + entree de funnel", pilierImpact: "A" as const },
      { action: "Newsletter SPAWT Weekly (top spots + archetypes)", format: "Email automation", objectif: "Retention + re-engagement base inactive", pilierImpact: "E" as const },
      { action: "Chatbot WhatsApp SPAWT recommandation instantanee", format: "Bot conversationnel", objectif: "Canal d'acquisition viral (partage 1-click)", pilierImpact: "V" as const },
      { action: "Mini-jeu web 'Quel Spawter es-tu ?' viral", format: "Webflow/React one-page", objectif: "Acquisition organique via partage social du resultat", pilierImpact: "D" as const },
    ],
    SOCIAL: [
      { action: "Instagram @spawt_ci — 1 post + 5-8 stories/jour", format: "Posts/Stories/Reels", objectif: "Notoriete + food porn authentique + dialecte SPAWT", pilierImpact: "D" as const },
      { action: "TikTok SPAWT — 3+ videos/semaine", format: "Short-form video", objectif: "Viralite organique + education systeme Palais", pilierImpact: "A" as const },
      { action: "Programme UGC #MonSpawt", format: "User-generated content", objectif: "Contenu communautaire auto-genere", pilierImpact: "E" as const },
    ],
    EVENEMENTIEL: [
      { action: "Food Tours mensuels (15K FCFA)", format: "Experience physique guidee", objectif: "Conversion Interesse → Engage + revenue direct", pilierImpact: "E" as const },
      { action: "Black Spawtday (evenement annuel)", format: "Evenement communautaire", objectif: "Conversion massive + celebration communaute", pilierImpact: "E" as const },
      { action: "Pop-up 'Palais des Saveurs' (centres commerciaux)", format: "Activation terrain", objectif: "Decouverte du systeme + onboarding en personne", pilierImpact: "A" as const },
    ],
    PR_INFLUENCE: [
      { action: "Programme Ambassadeurs Allie Content (10-15 Vanessa-tier)", format: "Micro-influence food", objectif: "Acquisition organique x10 sans budget media", pilierImpact: "D" as const },
      { action: "Relations presse food/tech Afrique", format: "Articles + interviews", objectif: "Credibilite + SEO + awareness", pilierImpact: "A" as const },
    ],
    B2B: [
      { action: "Dashboard Restaurateur (3 tiers : Basic/Pro/Gold)", format: "SaaS B2B", objectif: "Revenue recurrent B2B + data monetisation", pilierImpact: "V" as const },
      { action: "Rapport Data Culinaire Abidjan (trimestriel)", format: "PDF premium", objectif: "Revenue B2B high-value + credibilite sectorielle", pilierImpact: "V" as const },
    ],
  },
  assetsProduisibles: [
    { asset: "Video TikTok food porn dialecte SPAWT", type: "VIDEO" as const, usage: "Acquisition organique social" },
    { asset: "Reels Instagram SPAWT Stories", type: "VIDEO" as const, usage: "Brand awareness + food culture" },
    { asset: "Cartes collectibles Spawter (Profil/Lieu/Plat)", type: "DIGITAL" as const, usage: "Gamification in-app + partage social" },
    { asset: "Infographie Palais des Saveurs (13 archetypes)", type: "DIGITAL" as const, usage: "Education + viralite" },
    { asset: "Podcast 'Le Palais' (interviews chefs Abidjan)", type: "AUDIO" as const, usage: "Content marketing + B2B credibilite" },
    { asset: "Kit media press (logo, screenshots, brand story)", type: "DIGITAL" as const, usage: "PR + journalistes" },
    { asset: "Food Tour photo/video recap", type: "PHOTO" as const, usage: "UGC premium + social proof" },
    { asset: "Stickers WhatsApp SPAWT mascotte chat", type: "DIGITAL" as const, usage: "Viralite WhatsApp (1er canal Abidjan)" },
  ],
  activationsPossibles: [
    { activation: "Food Tour mensuel Abidjan (6 spots, guide Spawter)", canal: "Evenementiel", cible: "Interesse → Engage", budgetEstime: "MEDIUM" as const },
    { activation: "Pop-up 'Devine ton Palais' (centre commercial Playce)", canal: "Retail", cible: "Spectateur → Interesse", budgetEstime: "HIGH" as const },
    { activation: "Challenge TikTok #SpawteOuPas", canal: "Social", cible: "Viralite acquisition", budgetEstime: "LOW" as const },
    { activation: "Partenariat Orange Money (cashback premium)", canal: "Fintech", cible: "Conversion premium", budgetEstime: "MEDIUM" as const },
    { activation: "SPAWT x Festival MASA (musique + food)", canal: "Culture", cible: "Brand awareness large", budgetEstime: "HIGH" as const },
    { activation: "Carte SPAWT physique (NFC) pour restaurants partenaires", canal: "Retail/Tech", cible: "B2B premium + experience physique", budgetEstime: "MEDIUM" as const },
  ],
  formatsDisponibles: ["Reels Instagram", "TikTok short-form", "Stories", "Posts carousels", "Food Tours physiques", "Pop-up experiences", "Podcast episodes", "Newsletter email", "WhatsApp broadcast", "Chatbot conversationnel", "Dashboard B2B SaaS", "Rapport data PDF", "Cartes collectibles digitales", "Stickers messaging", "Mini-jeux web"],
  actionsByDevotionLevel: {
    SPECTATEUR: [
      { action: "TikTok organiques food porn SPAWT", format: "Short-form video", objectif: "Decouverte de la marque", pilierImpact: "D" as const },
      { action: "Instagram food porn authentique Abidjan", format: "Posts/Stories", objectif: "Notoriete visuelle", pilierImpact: "D" as const },
      { action: "Mini-jeu viral 'Quel Spawter es-tu ?'", format: "Web one-page", objectif: "Acquisition organique", pilierImpact: "A" as const },
    ],
    INTERESSE: [
      { action: "Newsletter SPAWT Weekly (top spots)", format: "Email automation", objectif: "Re-engagement base", pilierImpact: "E" as const },
      { action: "Quiz Palais des Saveurs in-app", format: "App native", objectif: "Revelation archetype", pilierImpact: "A" as const },
    ],
    PARTICIPANT: [
      { action: "Food Tours mensuels guides", format: "Experience physique", objectif: "Conversion Interesse → Engage", pilierImpact: "E" as const },
      { action: "Check-ins et avis in-app", format: "App native", objectif: "Engagement recurrent", pilierImpact: "E" as const },
    ],
    ENGAGE: [
      { action: "Badges exclusifs par categorie", format: "Gamification in-app", objectif: "Fidelisation via collection", pilierImpact: "E" as const },
      { action: "Black Spawtday (evenement annuel)", format: "Evenement communautaire", objectif: "Celebration + conversion massive", pilierImpact: "E" as const },
    ],
    AMBASSADEUR: [
      { action: "Programme Allie Content", format: "Micro-influence", objectif: "UGC + bouche-a-oreille", pilierImpact: "D" as const },
      { action: "Acces premium gratuit ambassadeurs", format: "Reward programme", objectif: "Incentive parrainage", pilierImpact: "V" as const },
    ],
    EVANGELISTE: [
      { action: "Conseil des Legendes", format: "Comite consultatif", objectif: "Co-creation roadmap produit", pilierImpact: "A" as const },
      { action: "Influence directe sur fonctionnalites", format: "Beta testing prioritaire", objectif: "Retention elite", pilierImpact: "E" as const },
    ],
  },
  riskMitigationActions: [
    { risk: "Masse critique <5K M6", action: "Ambassadeurs Allie Content x10-15 + Food Tours mensuels = acquisition organique", priority: 1 },
    { risk: "Fake reviews", action: "Code Spawter + Faux-Pas + moderation communautaire", priority: 2 },
    { risk: "Churn B2B >20%/mois", action: "Dashboard ROI mesurable des l'onboarding + rapport mensuel automatique", priority: 3 },
  ],
  innovationsProduit: [
    { name: "SPAWT AI Sommelier", type: "EXTENSION_GAMME" as const, description: "Recommandation vocale via le chat mascotte — le chat parle et guide en temps reel", feasibility: "MEDIUM" as const, horizon: "LONG" as const },
    { name: "Palais Evolutif Dynamique", type: "EXTENSION_GAMME" as const, description: "L'archetype evolue avec les habitudes alimentaires — identite culinaire vivante", feasibility: "HIGH" as const, horizon: "MOYEN" as const },
    { name: "Mode Couple Harmonique", type: "EXTENSION_GAMME" as const, description: "Matching couple par compatibilite Palais — decouvrir des spots a deux", feasibility: "HIGH" as const, horizon: "MOYEN" as const },
  ],
  totalActions: 16, // Count of all actions in catalogueParCanal
  actionsByOvertonPhase: [
    { phase: "Curiosite", actions: [{ action: "TikTok organiques food porn + #SpawteOuPas", format: "Short video", objectif: "Premiere decouverte de la marque" }] },
    { phase: "Decouverte", actions: [{ action: "Quiz Palais des Saveurs in-app + Food Tours", format: "App + Evenementiel", objectif: "Moment 'aha' identitaire" }] },
    { phase: "Adoption", actions: [{ action: "Mode Crew pour sorties groupe + badges", format: "App gamification", objectif: "Integration habitudes sociales" }] },
    { phase: "Identite", actions: [{ action: "SPAWT Wrapped + progression Paws", format: "App + Social share", objectif: "SPAWT = partie de l'identite personnelle" }] },
  ],
  hypothesisTestActions: [
    { hypothesisRef: "T.hypothesisValidation[2]", testAction: "Mesurer paywall geo trigger J+7 et J+30 post-lancement beta", expectedOutcome: "5% freemium convertissent Premium avant M6", cost: "LOW" as const },
    { hypothesisRef: "T.hypothesisValidation[4]", testAction: "Mesurer k-factor post-lancement via Mode Crew + SPAWT Wrapped", expectedOutcome: "Viral coef 1.4 atteignable", cost: "LOW" as const },
  ],
  copyStrategy: {
    promise: "SPAWT revele qui tu es a travers ce que tu manges",
    rtb: "Systeme Palais des Saveurs — 13 archetypes, 5 stades, matching 92% valide terrain",
    tonOfVoice: "Direct, complice, zero bullshit. Le chat tutoie, utilise l'argot local, ne s'excuse jamais.",
    keyMessages: ["Spawte, pas note", "3 taps, 1 spot", "Ton palais est ton identite", "Le chat ne suit pas, il renifle"],
    doNot: ["Jamais dire 'meilleur restaurant'", "Jamais comparer a Google Maps", "Jamais utiliser du jargon foodtech", "Jamais etre condescendant sur les gouts"],
  },
  bigIdea: {
    concept: "Tu es ce que tu manges — litteralement. SPAWT calcule ton identite culinaire.",
    mechanism: "Le Systeme Palais des Saveurs transforme tes check-ins en portrait identitaire. Chaque repas enrichit ton profil. Le chat apprend et anticipe.",
    insight: "A Abidjan, recommander un restaurant a un ami est un acte de confiance identitaire. SPAWT digitalise ce geste avec la precision d'un algorithme et la chaleur d'un ami insider.",
    adaptations: ["App mobile (coeur)", "Social media (acquisition)", "Food Tours (experience)", "B2B dashboard (monetisation)"],
  },
  potentielBudget: {
    production: 3000000,
    media: 2000000,
    talent: 500000,
    logistics: 1000000,
    technology: 2000000,
    total: 15000000,
  },
  generationMeta: {
    gloryToolsUsed: [],
    qualityScore: 0,
    generatedAt: new Date().toISOString(),
  },
  mediaPlan: {
    totalBudget: 5000000,
    channels: [
      { channel: "Instagram", budget: 1500000, percentage: 30, objective: "Notoriete + food porn", kpi: "50K abonnes M12" },
      { channel: "TikTok", budget: 1000000, percentage: 20, objective: "Viralite organique", kpi: "100K vues/mois" },
      { channel: "Food Tours", budget: 1000000, percentage: 20, objective: "Conversion physique", kpi: "12 tours/an, 20 pax/tour" },
      { channel: "Ambassadeurs", budget: 500000, percentage: 10, objective: "UGC + bouche-a-oreille", kpi: "10+ ambassadeurs actifs" },
      { channel: "PR/Presse", budget: 500000, percentage: 10, objective: "Credibilite + SEO", kpi: "5+ articles/an" },
      { channel: "Contingence", budget: 500000, percentage: 10, objective: "Opportunites et ajustements", kpi: "Reserve strategique" },
    ],
  },
};

// ── Pilier S — Synthèse ────────────────────────────────────────────────────
// Schema: PillarSSchema

const PILLAR_S = {
  syntheseExecutive: "SPAWT est la première app d'identité culinaire d'Afrique francophone. Fondée par Stéphanie Bidje (33 ans, Camerounaise, Abidjan) sur la frustration réelle du 'goumin', SPAWT transforme l'acte de chercher un restaurant en acte d'identité. Le Système Palais des Saveurs (5 axes bipolaires, 13 archétypes, 5 stades de maturité) est la pièce maîtresse : un révélateur d'identité qui crée un lock-in psychologique durable. Le modèle bifrontal (B2C 2500 FCFA/mois + B2B 15-65K FCFA/mois) vise 30M FCFA ARR à M12. Mission 1 terrain COMPLÉTÉE (mars 2026) : 26 interviews, 20 restaurants, Go/No-Go = GO. Tous les seuils de validation dépassés. 14/20 restaurants intéressés B2B. Le Bo Zinc prêt à signer Gold. Prochaine étape : MVP badges + beta 100 Spawters.",
  visionStrategique: "D'ici 2030, SPAWT sera le système de référence de l'identité culinaire africaine. 'Je suis un Djidji' sera une phrase normale dans la bouche d'un foodie de Lagos, Dakar ou Douala. Le Palais des Saveurs sera le Myers-Briggs de la gastronomie africaine. SPAWT ne sera plus une app — ce sera une langue, une culture, une appartenance. Le BU hébergement étendra le système d'identité à la vie sociale.",

  // Cohérence piliers — { pilier, contribution, articulation }
  coherencePiliers: [
    { pilier: "A — Authenticité", contribution: "L'archétype Explorateur/Créateur et l'histoire du fichier Excel", articulation: "Se traduit dans la promesse '3 taps 1 spot' et le ton 'pas de bullshit' en D — cohérence totale identité-positionnement" },
    { pilier: "A vers E", contribution: "L'histoire du fichier Excel et la doctrine créent le Contrat SPAWT", articulation: "L'authenticité de l'origine légitime chaque règle communautaire et chaque Faux-Pas" },
    { pilier: "D vers V", contribution: "Le positionnement 'identité > utilité' justifie le pricing premium", articulation: "On ne paye pas 2500 FCFA/mois pour des fonctionnalités, on paye pour son identité culinaire" },
    { pilier: "V vers E", contribution: "Le modèle freemium géo-paywall déclenche le rituel d'upgrade", articulation: "La frustration du paywall est une feature communautaire, pas un bug technique" },
    { pilier: "D vers T", contribution: "Les 4 personas validés terrain sont la base de triangulation", articulation: "Betsy/Brice/Dominic/Vanessa = hypothèses testables et validées Mission 1" },
    { pilier: "A vers R", contribution: "La crédibilité fondatrice insider est le rempart anti-clones", articulation: "Personne ne peut copier 4 ans de vie à Abidjan + dialecte + système Palais" },
    { pilier: "V vers I", contribution: "Le CAC <2000 FCFA détermine le plan de croissance organique", articulation: "Les ambassadeurs Allié Content sont la réponse stratégique au budget limité" },
    { pilier: "E vers S", contribution: "Les rituels communautaires sont le moteur d'exécution long terme", articulation: "Sans Quête du Midi et Wrapped, SPAWT est une app comme les autres — les rituels sont le produit" },
  ],

  facteursClesSucces: [
    "Validation Mission 1 terrain avec KPIs atteints — FAIT (78% fréquence, 7.8/10 frustration, 72% intention)",
    "Activation 60%+ J+7 sur beta privé 100 Spawters — preuve que l'onboarding et l'archétype surprennent",
    "Rétention M3 >35% — preuve que les rituels créent des habitudes durables",
    "Premier restaurant B2B Gold converti (Le Bo Zinc 65K/mois) — preuve de la valeur archétype",
    "Maintien intégrité du système contre les fake reviews — confiance algo = actif le plus précieux",
  ],

  // Recommandations — { recommendation, source?, priority }
  recommandationsPrioritaires: [
    { recommendation: "Mission 1 terrain COMPLÉTÉE — décision validée, passer à l'exécution immédiate", source: "T" as const, priority: 1 },
    { recommendation: "Nommer le chat via vote communauté lors du beta — actif de marque majeur", source: "D" as const, priority: 2 },
    { recommendation: "Prioriser TikTok/Reels Dominic acquisition zéro-coût avant tout paid marketing", source: "E" as const, priority: 3 },
    { recommendation: "Construire le pipeline B2B en parallèle : 20 restos Mission 1 = 20 leads B2B", source: "V" as const, priority: 4 },
    { recommendation: "Intégrer Wave + Orange Money avant lancement — friction paiement = mort conversion", source: "I" as const, priority: 5 },
    { recommendation: "Créer programme Ambassadeurs Allié Content 10 Vanessa-tier avant lancement", source: "E" as const, priority: 6 },
    { recommendation: "Documenter le dialecte SPAWT dans un guide de marque officiel avant toute com", source: "D" as const, priority: 7 },
    { recommendation: "Définir le calendrier liturgique annuel dès M3 — les rituels se planifient", source: "E" as const, priority: 8 },
  ],

  // Axes stratégiques — { axe, pillarsLinked: PillarKey[], kpis[] }
  axesStrategiques: [
    { axe: "Identité d'abord : chaque feature renforce l'identité du Spawter, pas juste l'accès info", pillarsLinked: ["A" as const, "D" as const, "E" as const], kpis: ["Archétypes révélés / mois", "Progression Paws moyenne / Spawter"] },
    { axe: "Communauté comme distribution : la Meute se propage via rituels, pas via paid", pillarsLinked: ["E" as const, "V" as const, "I" as const], kpis: ["Viral coefficient B2C", "Coût acquisition organique vs paid"] },
    { axe: "B2B comme flywheel : restos paient pour foodies, meilleurs restos, meilleure XP, plus de foodies", pillarsLinked: ["V" as const, "D" as const, "T" as const], kpis: ["NRR B2B", "Restaurants Gold actifs M12"] },
  ],

  sprint90Recap: [
    "Mission 1 terrain COMPLÉTÉE : 26 interviews + 20 restaurants — Go = GO confirmé",
    "MVP Badges : 18 B2C + 8 B2B en dev (8-12 jours) — livraison avril 2026",
    "5 décisions bloquantes validées : doc, MVP, pricing B2B, naming chat, périmètre Abidjan",
    "20 restaurants pilotes validés (6 catégories) — 14 intéressés B2B",
    "30 contenus food porn + 10 TikTok en production Bridge Factory",
    "10-15 ambassadeurs Allié Content en recrutement (accès premium gratuit)",
    "Wave + Orange Money en intégration (prérequis lancement beta)",
    "Beta privé 100 Spawters planning avril 2026 — premiers archétypes Palais",
  ],

  // KPI Dashboard — { name, pillar, target, frequency }
  kpiDashboard: [
    { name: "Downloads cumulés", pillar: "E" as const, target: "25K M12", frequency: "MONTHLY" as const },
    { name: "Activation J+7", pillar: "E" as const, target: "60%", frequency: "WEEKLY" as const },
    { name: "Rétention M3", pillar: "E" as const, target: "35%", frequency: "MONTHLY" as const },
    { name: "Conversion premium B2C", pillar: "V" as const, target: "8% M12", frequency: "MONTHLY" as const },
    { name: "ARR mensuel", pillar: "V" as const, target: "30M FCFA M12", frequency: "MONTHLY" as const },
    { name: "Restaurants B2B actifs", pillar: "V" as const, target: "60 M12", frequency: "MONTHLY" as const },
    { name: "NPS B2C", pillar: "S" as const, target: ">45", frequency: "QUARTERLY" as const },
  ],

  coherenceScore: 100,

  // ── Chantier -1 : champs de strategie temporalisee (S pioche dans I) ──
  fenetreOverton: {
    perceptionActuelle: "SPAWT est percu comme une app foodie de niche pour early-adopters Abidjan — 'encore une app de restos' pour le grand public. La profondeur du systeme Palais des Saveurs est invisible de l'exterieur. Les restaurateurs voient un potentiel mais attendent des preuves de trafic.",
    perceptionCible: "SPAWT comme le Myers-Briggs de la gastronomie africaine — un systeme d'identite culinaire qui definit qui tu es a travers ce que tu manges. 'Tu es quoi toi ? Epice Bold ou Douceur Velvet ?' devient une question sociale normale a Abidjan.",
    ecart: "Le gap principal est la comprehension du concept. Les early-adopters saisissent instantanement (72% intention usage Mission 1). Le marche mainstream a besoin de 3 triggers : voir un ami partager son archetype, vivre le moment 'aha' du quiz Palais, entendre parler d'un Food Tour SPAWT. La strategie de deplacement passe par le social proof communautaire, pas la publicite.",
    strategieDeplacement: [
      { etape: "Curiosite", action: "TikTok organiques + #SpawteOuPas + ambassadeurs Vanessa", canal: "Social", horizon: "M1-M3" },
      { etape: "Decouverte", action: "Quiz Palais des Saveurs viral + Food Tours mensuels", canal: "App + Evenementiel", horizon: "M3-M6" },
      { etape: "Adoption", action: "Mode Crew pour sorties groupe + Black Spawtday", canal: "App + Evenementiel", horizon: "M6-M9" },
      { etape: "Identite", action: "SPAWT Wrapped + progression Paws visible", canal: "App + Social", horizon: "M9-M12" },
      { etape: "Culture", action: "Expansion Dakar + 'C'est quoi ton Palais ?' devenu expression courante", canal: "Multi-ville", horizon: "M12-M18" },
    ],
  },
  sprint90Days: [
    { action: "MVP Badges livres (18 B2C + 8 B2B) — gamification identitaire", owner: "Kidam", kpi: "Badges operationnels en beta", priority: 1 },
    { action: "Programme Ambassadeurs Allie Content lance — 10-15 Vanessa-tier", owner: "Alexandre", kpi: "10+ ambassadrices actives", priority: 2 },
    { action: "Integration Wave + Orange Money operationnelle", owner: "Kidam", kpi: "Paiement mobile fonctionnel", priority: 3 },
    { action: "Beta prive 100 Spawters lance", owner: "Stephanie", kpi: "100 users J+7, activation 60%", priority: 4 },
    { action: "20 restaurants pilotes onboarbes dans l'app", owner: "Alexandre", kpi: "20 profils complets", priority: 5 },
    { action: "45 contenus pre-lancement produits (30 posts + 10 TikTok + 5 Reels)", owner: "Bridge Factory", kpi: "45 contenus publies", priority: 6 },
    { action: "Dashboard B2B prototype fonctionnel pour Le Bo Zinc (Gold)", owner: "Kidam", kpi: "1 restaurant Gold actif", priority: 7 },
    { action: "Premier Food Tour realise — 20 participants", owner: "Stephanie + Alexandre", kpi: "NPS >60 premier tour", priority: 8 },
  ],
  roadmap: [
    { phase: "Phase 1 — Validation", objectif: "Mission 1 terrain completee, Go/No-Go = GO", actions: ["26 interviews", "20 restaurants", "Seuils valides"], budget: 2000000, duree: "M1-M3" },
    { phase: "Phase 2 — Lancement", objectif: "Beta 100 Spawters + premiers archetypes reveles", actions: ["MVP badges", "Wave/OM", "Beta prive"], budget: 5000000, duree: "M3-M5" },
    { phase: "Phase 3 — Activation", objectif: "1000 downloads, 60% activation, premiers rituels", actions: ["Launch public", "Food Tours", "Ambassadeurs"], budget: 5000000, duree: "M5-M8" },
    { phase: "Phase 4 — Consolidation", objectif: "Retention M3 >35%, conversion premium >5%, B2B ROI demontre", actions: ["Cohorte analysis", "Power user interviews", "Brand audit"], budget: 2000000, duree: "M8-M10" },
    { phase: "Phase 5 — Scale", objectif: "Black Spawtday + SPAWT Wrapped V1 + preparation expansion", actions: ["Evenement commercial", "Recap annuel", "Etude Dakar"], budget: 1500000, duree: "M10-M12" },
  ],
  selectedFromI: [
    { sourceRef: "catalogueParCanal.DIGITAL.0", action: "App mobile SPAWT (3 modes : Rapide/Crew/Explore)", phase: "Lancement", priority: 1 },
    { sourceRef: "catalogueParCanal.SOCIAL.0", action: "Instagram @spawt_ci — 1 post + 5-8 stories/jour", phase: "Pre-lancement", priority: 2 },
    { sourceRef: "catalogueParCanal.SOCIAL.1", action: "TikTok SPAWT — 3+ videos/semaine", phase: "Pre-lancement", priority: 3 },
    { sourceRef: "catalogueParCanal.PR_INFLUENCE.0", action: "Programme Ambassadeurs Allie Content 10-15 Vanessa-tier", phase: "Pre-lancement", priority: 4 },
    { sourceRef: "catalogueParCanal.EVENEMENTIEL.0", action: "Food Tours mensuels (15K FCFA)", phase: "Activation", priority: 5 },
    { sourceRef: "catalogueParCanal.B2B.0", action: "Dashboard Restaurateur B2B (3 tiers)", phase: "Consolidation", priority: 6 },
    { sourceRef: "catalogueParCanal.EVENEMENTIEL.1", action: "Black Spawtday (evenement annuel)", phase: "Scale", priority: 7 },
    { sourceRef: "catalogueParCanal.DIGITAL.0", action: "SPAWT Wrapped V1 (recap annuel)", phase: "Scale", priority: 8 },
    { sourceRef: "catalogueParCanal.DIGITAL.3", action: "Integration Wave + Orange Money", phase: "Lancement", priority: 9 },
    { sourceRef: "catalogueParCanal.EVENEMENTIEL.2", action: "Pop-up Palais des Saveurs centres commerciaux", phase: "Activation", priority: 10 },
  ],
  devotionFunnel: [
    { phase: "M0-M3 Pre-lancement", spectateurs: 500, interesses: 100, participants: 0, engages: 0, ambassadeurs: 0, evangelistes: 0 },
    { phase: "M3-M6 Lancement", spectateurs: 5000, interesses: 1500, participants: 200, engages: 50, ambassadeurs: 10, evangelistes: 0 },
    { phase: "M6-M9 Activation", spectateurs: 10000, interesses: 3000, participants: 500, engages: 200, ambassadeurs: 30, evangelistes: 5 },
    { phase: "M9-M12 Consolidation", spectateurs: 15000, interesses: 5000, participants: 1000, engages: 400, ambassadeurs: 50, evangelistes: 10 },
  ],
  overtonMilestones: [
    { phase: "Beta privee", currentPerception: "App inconnue — zero notoriete", targetPerception: "100 early-adopters convaincus que SPAWT revele leur identite culinaire", measurementMethod: "NPS beta >60, activation J+7 >60%" },
    { phase: "Launch public", currentPerception: "App foodie de niche", targetPerception: "1000 Abidjanais qui utilisent le mot 'Spawte' dans leur vocabulaire", measurementMethod: "Downloads J+30, mentions sociales organiques" },
    { phase: "Traction confirmee", currentPerception: "App qui monte dans les cercles foodies", targetPerception: "Reference culinaire Abidjan — 'tu es sur SPAWT ?' est une question normale", measurementMethod: "5K downloads, 8% conversion premium, NPS >45" },
    { phase: "Statut culturel", currentPerception: "App populaire chez les jeunes pros Abidjan", targetPerception: "SPAWT = identite culinaire africaine — le Myers-Briggs de la gastronomie", measurementMethod: "25K downloads, ARR 30M FCFA, presse nationale" },
  ],
  globalBudget: 15000000,
  budgetBreakdown: {
    production: 3000000,
    media: 2000000,
    talent: 500000,
    logistics: 1000000,
    technology: 2000000,
    contingency: 1500000,
    agencyFees: 0,
  },
  teamStructure: [
    { name: "Stephanie Bidje", title: "Pioneer / CEO", responsibility: "Vision produit, strategie, BD, finance" },
    { name: "Kidam", title: "Co-Pilot Tech", responsibility: "Dev app iOS/Android, infra, MVP badges, paiement mobile" },
    { name: "Alexandre", title: "Co-Pilot Ops/Marketing", responsibility: "Terrain B2B, community, onboarding restaurants, ambassadeurs" },
    { name: "Bridge Factory", title: "Allie Contenu", responsibility: "Production video TikTok/Reels, food porn, dialecte SPAWT" },
  ],
  rejectedFromI: [
    { sourceRef: "catalogueParCanal.DIGITAL.4", action: "Chatbot WhatsApp SPAWT", reason: "Trop complexe pour le MVP — reporter post-M6 quand la base user est suffisante" },
    { sourceRef: "activationsPossibles.4", action: "SPAWT x Festival MASA", reason: "Budget trop eleve pour l'impact incertain — reconsiderer si traction confirmee M9" },
  ],
  budgetByDevotion: {
    acquisition: 5000000,
    conversion: 3000000,
    retention: 4000000,
    evangelisation: 3000000,
  },
  northStarKPI: {
    name: "Check-ins/semaine par Spawter actif",
    target: "3+",
    frequency: "WEEKLY" as const,
    currentValue: "0 (pre-lancement)",
  },
};

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("SEED SPAWT — Documentation ADVE-RTIS Complète (Schema-Compliant)");
  console.log("Sources : SPAWT_Presentation_Fevrier_2026_V2-2.docx + FORMULAIRE ADVE SPAWT REVISE-3.xlsx");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("[ 1/4 ] Nettoyage doublons SPAWT...");
  // Supprimer les stratégies SPAWT sans ID fixe (doublons créés par les anciennes exécutions du seed)
  const deleted = await db.strategy.deleteMany({
    where: { name: "SPAWT", NOT: { id: "spawt-strategy" } },
  }).catch(() => ({ count: 0 }));
  // Supprimer aussi les stratégies de test Apple Inc.
  const deletedApple = await db.strategy.deleteMany({ where: { name: "Apple Inc." } }).catch(() => ({ count: 0 }));
  console.log(`        ✓ ${deleted.count} doublon(s) SPAWT supprimé(s), ${deletedApple.count} stratégie(s) Apple Inc. supprimée(s)`);

  console.log("\n[ 2/4 ] Upsert Strategy (ID fixe: spawt-strategy)...");
  const strategy = await db.strategy.upsert({
    where: { id: "spawt-strategy" },
    update: {
      name: "SPAWT",
      description: "Stratégie ADVE-RTIS complète — SPAWT (App identité culinaire, Abidjan). Mission 1 COMPLÉTÉE.",
      businessContext: {
        businessModel: "PLATEFORME",
        economicModels: ["FREEMIUM", "ABONNEMENT"],
        positioningArchetype: "CHALLENGER",
        salesChannel: "DIRECT",
        positionalGoodFlag: false,
        premiumScope: "PARTIAL",
      } as Prisma.InputJsonValue,
    },
    create: {
      id: "spawt-strategy",
      name: "SPAWT",
      description: "Stratégie ADVE-RTIS complète — SPAWT (App identité culinaire, Abidjan). Mission 1 COMPLÉTÉE.",
      userId: ADMIN_USER_ID,
      businessContext: {
        businessModel: "PLATEFORME",
        economicModels: ["FREEMIUM", "ABONNEMENT"],
        positioningArchetype: "CHALLENGER",
        salesChannel: "DIRECT",
        positionalGoodFlag: false,
        premiumScope: "PARTIAL",
      } as Prisma.InputJsonValue,
    },
  });
  console.log(`        ✓ ${strategy.id}`);

  console.log("\n[ 3/4 ] 8 Piliers (reset + création)...");
  // Supprimer les piliers existants pour cet ID fixe (idempotent)
  await db.pillar.deleteMany({ where: { strategyId: strategy.id } }).catch(() => {});
  const pillarsData = [
    { key: "a", content: PILLAR_A, confidence: 0.92 },
    { key: "d", content: PILLAR_D, confidence: 0.90 },
    { key: "v", content: PILLAR_V, confidence: 0.88 },
    { key: "e", content: PILLAR_E, confidence: 0.90 },
    { key: "r", content: PILLAR_R, confidence: 0.85 },
    { key: "t", content: PILLAR_T, confidence: 0.85 },
    { key: "i", content: PILLAR_I, confidence: 0.88 },
    { key: "s", content: PILLAR_S, confidence: 0.92 },
  ];

  for (const p of pillarsData) {
    const pillar = await db.pillar.create({
      data: {
        strategyId: strategy.id,
        key: p.key,
        content: p.content as Prisma.InputJsonValue,
        confidence: p.confidence,
        validationStatus: "VALIDATED",
      },
    });
    // Create initial PillarVersion (v1)
    await db.pillarVersion.create({
      data: {
        pillarId: pillar.id,
        version: 1,
        content: p.content as Prisma.InputJsonValue,
        author: "seed-spawt",
        reason: "Initial seed from SPAWT documentation (Présentation Fev 2026 + Formulaire ADVE)",
      },
    });
    process.stdout.write(`        ${p.key.toUpperCase()} `);
  }
  console.log("\n        ✓ 8 piliers créés + PillarVersion v1");

  await db.variableStoreConfig.create({ data: { strategyId: strategy.id, stalenessThresholdDays: 30, autoRecalculate: true } }).catch(() => {});
  await db.brandOSConfig.create({ data: { strategyId: strategy.id, config: { currency: "XAF", language: "fr" } } }).catch(() => {});

  console.log("\n[ 4/8 ] Score ADVE-RTIS...");
  const scoreAllPillarsSemantic = await loadScorer();
  const pillars = await db.pillar.findMany({ where: { strategyId: strategy.id } });
  const scoreResult = scoreAllPillarsSemantic(pillars.map((p) => ({ key: p.key, content: p.content })));

  await db.strategy.update({
    where: { id: strategy.id },
    data: {
      advertis_vector: {
        ...Object.fromEntries(scoreResult.pillarScores.map((ps) => [ps.pillarKey.toLowerCase(), ps.score])),
        composite: scoreResult.composite,
        confidence: 0.90,
      } as Prisma.InputJsonValue,
    },
  });

  // ── 5. Drivers SPAWT ──────────────────────────────────────────────────
  console.log("\n[ 5/8 ] Drivers SPAWT...");
  const spawtDrivers = [
    {
      id: "spawt-driver-instagram", channel: "INSTAGRAM" as const, channelType: "DIGITAL" as const,
      name: "Instagram SPAWT",
      formatSpecs: { formats: ["post", "reel", "story", "carousel"], maxFileSize: "4GB", videoMaxDuration: 90 },
      constraints: { aesthetic: "noir_or_chat", brandVoice: "complice, direct, jamais condescendant", forbiddenTopics: ["politique", "religion", "notes etoiles"] },
      briefTemplate: { sections: ["Objectif", "Persona cible (archetype Palais)", "Visual direction", "Caption", "Hashtags", "CTA"] },
      qcCriteria: { checkBrandVoice: true, checkVisualGuidelines: true, minEngagementRate: 5, noClicheFood: true },
      pillarPriority: { primary: "D", secondary: "E" },
    },
    {
      id: "spawt-driver-tiktok", channel: "TIKTOK" as const, channelType: "DIGITAL" as const,
      name: "TikTok SPAWT",
      formatSpecs: { formats: ["short-video", "story"], maxDuration: 60, preferredDuration: "15-30s" },
      constraints: { tone: "authentique, spontane, foodie", forbiddenTopics: ["pub deguisee", "fake reviews"] },
      briefTemplate: { sections: ["Hook (3s)", "Concept", "Persona", "Sound/Music", "CTA"] },
      qcCriteria: { checkAuthenticity: true, minViewRate: 10 },
      pillarPriority: { primary: "E", secondary: "A" },
    },
    {
      id: "spawt-driver-event", channel: "EVENT" as const, channelType: "EXPERIENTIAL" as const,
      name: "Events & Activations SPAWT",
      formatSpecs: { types: ["food-tour", "lancement", "defi-communautaire", "crew-night"] },
      constraints: { minAttendees: 15, maxAttendees: 80, locationAbidjan: true },
      briefTemplate: { sections: ["Objectif", "Format", "Lieu", "Programme", "Budget", "KPIs", "Niveau devotion cible"] },
      qcCriteria: { satisfactionMin: 8, spawtCheckinsMin: 10 },
      pillarPriority: { primary: "E", secondary: "V" },
    },
    {
      id: "spawt-driver-website", channel: "WEBSITE" as const, channelType: "DIGITAL" as const,
      name: "App & Web SPAWT",
      formatSpecs: { formats: ["landing-page", "onboarding-flow", "in-app-content", "push-notification"] },
      constraints: { palette: "#0A0A0A #D4AF37 #50C878 #F8F6F0", typography: "Playfair Display / DM Sans / JetBrains Mono" },
      briefTemplate: { sections: ["Objectif", "Ecran/Flow", "Micro-copy", "Illustrations", "Archetype cible"] },
      qcCriteria: { checkDesignTokens: true, checkCopy: true },
      pillarPriority: { primary: "D", secondary: "A" },
    },
    {
      id: "spawt-driver-facebook", channel: "FACEBOOK" as const, channelType: "DIGITAL" as const,
      name: "Facebook & WhatsApp SPAWT",
      formatSpecs: { formats: ["post", "story", "group-content", "whatsapp-broadcast"] },
      constraints: { tone: "communautaire, informel, foodie", maxPostLength: 300 },
      briefTemplate: { sections: ["Objectif", "Message", "Visual", "Communaute cible", "CTA"] },
      qcCriteria: { checkBrandVoice: true, minShareRate: 2 },
      pillarPriority: { primary: "E", secondary: "A" },
    },
  ];

  for (const d of spawtDrivers) {
    await db.driver.upsert({
      where: { id: d.id },
      update: { formatSpecs: d.formatSpecs as Prisma.InputJsonValue, constraints: d.constraints as Prisma.InputJsonValue, briefTemplate: d.briefTemplate as Prisma.InputJsonValue, qcCriteria: d.qcCriteria as Prisma.InputJsonValue, pillarPriority: d.pillarPriority as Prisma.InputJsonValue },
      create: { id: d.id, strategyId: strategy.id, channel: d.channel, channelType: d.channelType, name: d.name, formatSpecs: d.formatSpecs as Prisma.InputJsonValue, constraints: d.constraints as Prisma.InputJsonValue, briefTemplate: d.briefTemplate as Prisma.InputJsonValue, qcCriteria: d.qcCriteria as Prisma.InputJsonValue, pillarPriority: d.pillarPriority as Prisma.InputJsonValue },
    });
  }
  console.log(`        ✓ ${spawtDrivers.length} drivers`);

  // ── 6. Alexandre "xtincell" — TalentProfile (Guilde) ───────────────────
  console.log("\n[ 6/8 ] Talent Alexandre 'xtincell'...");
  const alexandreUser = await db.user.findUnique({ where: { email: "alexandre@upgraders.com" } });
  if (!alexandreUser) throw new Error("Admin user alexandre@upgraders.com introuvable — lancer prisma/seed.ts d'abord");

  await db.talentProfile.upsert({
    where: { userId: alexandreUser.id },
    update: {
      displayName: "Alexandre 'xtincell' Djengue",
      tier: "MAITRE",
      skills: ["strategie", "branding", "direction-artistique", "cult-marketing", "ADVE-RTIS"] as Prisma.InputJsonValue,
      totalMissions: 12,
      firstPassRate: 0.91,
      peerReviews: 8,
      avgScore: 8.7,
      driverSpecialties: ["INSTAGRAM", "EVENT", "WEBSITE", "TIKTOK"] as Prisma.InputJsonValue,
    },
    create: {
      userId: alexandreUser.id,
      displayName: "Alexandre 'xtincell' Djengue",
      tier: "MAITRE",
      skills: ["strategie", "branding", "direction-artistique", "cult-marketing", "ADVE-RTIS"] as Prisma.InputJsonValue,
      totalMissions: 12,
      firstPassRate: 0.91,
      peerReviews: 8,
      avgScore: 8.7,
      driverSpecialties: ["INSTAGRAM", "EVENT", "WEBSITE", "TIKTOK"] as Prisma.InputJsonValue,
    },
  });
  console.log(`        ✓ TalentProfile créé (MAITRE, 91% first-pass)`);

  // ── 7. Campagne + 3 Missions SPAWT ────────────────────────────────────
  console.log("\n[ 7/8 ] Campagne + Missions...");

  const spawtCampaign = await db.campaign.upsert({
    where: { id: "spawt-campaign-lancement" },
    update: { strategyId: strategy.id },
    create: {
      id: "spawt-campaign-lancement",
      name: "SPAWT Lancement Abidjan — 12 Mois",
      code: "CAMP-2026-001",
      strategyId: strategy.id,
      state: "LIVE",
      status: "LIVE",
      budget: 30000000,
      startDate: new Date("2026-01-15"),
      endDate: new Date("2026-12-31"),
      objectives: {
        primary: "PMF Abidjan — 500 spawters actifs, 20 restaurants, 30M ARR",
        secondary: "Validation terrain + traction organique + prep expansion",
        missions: ["M1: Cadrage terrain", "M2: Activation traction", "M3: Consolidation scale"],
      } as Prisma.InputJsonValue,
      advertis_vector: { a: 22, d: 20, v: 18, e: 20 } as Prisma.InputJsonValue,
    },
  });

  // ── Mission 1 — Cadrage & Vérité Terrain (COMPLÉTÉE) ──────────────────
  const mission1 = await db.mission.upsert({
    where: { id: "spawt-mission-1-cadrage" },
    update: { strategyId: strategy.id, campaignId: spawtCampaign.id },
    create: {
      id: "spawt-mission-1-cadrage",
      title: "Mission 1 — Cadrage & Vérité Terrain (Abidjan)",
      description: "Validation terrain Abidjan : 26 interviews foodies, 20 restaurants en 6 catégories, benchmark concurrentiel, audit contenu. Go/No-Go data-driven.",
      priority: 1,
      strategyId: strategy.id,
      campaignId: spawtCampaign.id,
      driverId: "spawt-driver-event",
      mode: "DISPATCH",
      status: "COMPLETED",
      assigneeId: alexandreUser.id,
      slaDeadline: new Date("2026-03-31"),
      budget: 5000000,
      advertis_vector: {
        a: 20, d: 18, v: 15, e: 16,
        deadline: "2026-03-31",
        deliverables: [
          "26 interviews foodies qualifiées",
          "20 restaurants visités (6 catégories)",
          "Rapport terrain complet",
          "Benchmark concurrentiel local",
          "Audit contenu existant",
        ],
        kpis: {
          interviewsTarget: 30, interviewsDone: 26,
          restaurantsTarget: 20, restaurantsDone: 20,
          frustrationScore: 7.8,
          intentionUsage: 0.72,
          interetB2B: "14/20 intéressés",
        },
      } as Prisma.InputJsonValue,
      briefData: {
        objective: "Valider le problème. Identifier les use cases. Ajuster le storytelling local. Onboarder 20 restaurants.",
        targetPersona: "Foodies Abidjan 22-38 ans, sortent >2x/semaine, frustration moyenne 7.8/10 dans le choix restaurant",
        keyMessage: "SPAWT révèle ton identité culinaire — on ne note pas, on découvre qui tu es",
        pillarPriority: ["A", "D", "V", "E"],
        budget: 5000000,
        currency: "XAF",
        deadline: "2026-03-31",
        deliverablesExpected: "Rapport terrain, interviews qualifiées, benchmark, audit contenu, restaurants onboardés",
        status: "VALIDATED",
        validatedAt: "2026-01-20",
        validatedBy: "Alexandre 'xtincell' Djengue",
      } as Prisma.InputJsonValue,
    },
  });

  // Deliverables pour Mission 1 (complétée)
  const m1Deliverables = [
    { id: "spawt-m1-del-rapport", title: "Rapport Mission 1 Abidjan", description: "26 interviews qualifiées, 20 restaurants visités en 6 catégories (Date night, Dabali/Racines, Boys/BBQ, Nouveaux, Hype, Sceptiques). Frustration 7.8/10. 72% intention d'usage. 14/20 restaurants intéressés B2B.", fileUrl: "/documents/SPAWT_Mission1_Abidjan_Rapport.docx", status: "ACCEPTED" },
    { id: "spawt-m1-del-benchmark", title: "Benchmark Concurrentiel Local", description: "Analyse Google Maps (847 résultats/5km Cocody), TripAdvisor (touristes), groupes WhatsApp/Facebook. Aucun acteur digital local structuré. Gap identifié : matching contextuel vs agrégation anonyme.", status: "ACCEPTED" },
    { id: "spawt-m1-del-restaurants", title: "Fiche Restaurants Onboardés (20)", description: "20 restaurants validés : 5 Premium/Date night, 5 Street food (Dabali/Racines), 3 Boys/BBQ, 3 Nouveaux, 2 Hype/Instagram, 2 Sceptiques digitaux. ADN du Lieu profilé sur 5 axes.", status: "ACCEPTED" },
    { id: "spawt-m1-del-audit", title: "Audit Contenu & UX", description: "Tests parcours app avec utilisateurs réels. Identification des frictions onboarding. Recommandation : simplifier la révélation Palais (< 3 taps). Chat mascotte validé comme fil conducteur.", status: "ACCEPTED" },
  ];

  for (const del of m1Deliverables) {
    await db.missionDeliverable.upsert({
      where: { id: del.id },
      update: {},
      create: { id: del.id, missionId: mission1.id, title: del.title, description: del.description, fileUrl: del.fileUrl ?? null, status: del.status },
    });
  }

  // Commission pour Alexandre sur Mission 1
  await db.commission.upsert({
    where: { id: "spawt-m1-commission-xtincell" },
    update: {},
    create: {
      id: "spawt-m1-commission-xtincell",
      missionId: mission1.id,
      talentId: alexandreUser.id,
      grossAmount: 3500000,
      commissionRate: 0.30,
      commissionAmount: 1050000,
      netAmount: 2450000,
      currency: "XAF",
      status: "PAID",
      paidAt: new Date("2026-04-05"),
      tierAtTime: "MAITRE",
    },
  });

  console.log(`        ✓ Mission 1 COMPLETED + 4 deliverables + commission`);

  // ── Mission 2 — Activation & Traction (PLANIFIÉE) ─────────────────────
  await db.mission.upsert({
    where: { id: "spawt-mission-2-activation" },
    update: { strategyId: strategy.id, campaignId: spawtCampaign.id },
    create: {
      id: "spawt-mission-2-activation",
      title: "Mission 2 — Activation & Traction (Abidjan Q2)",
      description: "Activation communautaire : programme ambassadeur (5-10 profils Vanessa), campagnes acquisition Instagram/TikTok, 3+ events communautaires, tests conversion premium.",
      priority: 2,
      strategyId: strategy.id,
      campaignId: spawtCampaign.id,
      driverId: "spawt-driver-instagram",
      mode: "COLLABORATIF",
      status: "DRAFT",
      assigneeId: alexandreUser.id,
      slaDeadline: new Date("2026-06-30"),
      budget: 8000000,
      advertis_vector: {
        a: 15, d: 18, v: 12, e: 22,
        deadline: "2026-06-30",
        deliverables: [
          "Programme Ambassadeur activé (modèle Vanessa — 5-10 profils)",
          "Campagnes acquisition ciblées Instagram/TikTok",
          "3+ événements communautaires (food tours, défis collectifs)",
          "Coaching équipe terrain (Alliés Contenu)",
          "Premiers tests conversion premium (2500 FCFA/mois)",
          "Rapport traction M5-M6",
        ],
      } as Prisma.InputJsonValue,
      briefData: {
        objective: "Croître la base active. Tester la traction organique. Structurer l'activation locale. Objectif : 100+ spawters actifs, 5% conversion premium.",
        targetPersona: "Early adopters identifiés en Mission 1 + profils Vanessa (25-31 ans, content creators, 2000+ followers, 300K/mois revenu)",
        keyMessage: "Rejoins la Meute. Tu ne notes pas — tu révèles qui tu es.",
        pillarPriority: ["E", "D", "A", "V"],
        budget: 8000000,
        currency: "XAF",
        deadline: "2026-06-30",
        deliverablesExpected: "Programme ambassadeur live, 3 events, campagnes acquisition, tests premium, rapport traction",
        status: "DRAFT",
        missionContext: {
          prerequis: "Mission 1 complétée — 26 interviews, 20 restaurants, frustration 7.8/10 validée",
          ambassadeurBudget: "300K-500K FCFA/mois (3-5 ambassadeurs Palier 2)",
          metriques: {
            spawtersActifsTarget: 100,
            conversionPremiumTarget: "5-8%",
            coeffViral: 1.4,
            eventsTarget: 3,
            ambassadeursTarget: "5-10 profils Vanessa",
          },
          risques: [
            "Adoption lente en saison des pluies (mai-juin)",
            "Difficulté recrutement ambassadeurs authentiques",
            "Résistance B2B restaurants sceptiques",
          ],
        },
      } as Prisma.InputJsonValue,
    },
  });
  console.log(`        ✓ Mission 2 DRAFT (Activation Q2) + brief`);

  // ── Mission 3 — Consolidation & Scale Prep (PLANIFIÉE) ────────────────
  await db.mission.upsert({
    where: { id: "spawt-mission-3-consolidation" },
    update: { strategyId: strategy.id, campaignId: spawtCampaign.id },
    create: {
      id: "spawt-mission-3-consolidation",
      title: "Mission 3 — Consolidation & Scale Prep (Q4)",
      description: "Consolidation PMF : analyse cohortes, interviews power users, audit perception marque, validation pricing B2C/B2B, rapport expansion multi-villes.",
      priority: 3,
      strategyId: strategy.id,
      campaignId: spawtCampaign.id,
      driverId: "spawt-driver-website",
      mode: "COLLABORATIF",
      status: "DRAFT",
      assigneeId: alexandreUser.id,
      slaDeadline: new Date("2026-10-31"),
      budget: 6000000,
      advertis_vector: {
        a: 18, d: 20, v: 20, e: 18,
        deadline: "2026-10-31",
        deliverables: [
          "Analyse cohortes (rétention M1/M3/M6)",
          "Interviews power users (Djidji/Guide)",
          "Audit perception marque (intention vs réalité)",
          "Validation pricing B2C (2500 FCFA) et B2B (15K Pro / 65K Gold)",
          "Rapport expansion géographique (Douala, Dakar, Lagos — design portable)",
          "Rapport PMF final + recommandations scale",
        ],
      } as Prisma.InputJsonValue,
      briefData: {
        objective: "Confirmer les signaux PMF. Réduire le churn. Valider pricing. Préparer l'expansion multi-villes.",
        targetPersona: "Power users Djidji/Guide (50+ spots), restaurants Pro/Gold actifs, cohortes M1/M3/M6",
        keyMessage: "De l'app culinaire locale au OS de la vie sociale culinaire africaine premium",
        pillarPriority: ["V", "D", "A", "E"],
        budget: 6000000,
        currency: "XAF",
        deadline: "2026-10-31",
        deliverablesExpected: "Analyse cohortes, interviews power users, audit marque, validation pricing, rapport expansion, rapport PMF",
        status: "DRAFT",
        missionContext: {
          prerequis: "Mission 2 complétée — base active 100+, programme ambassadeur live, premiers premium",
          expansionCibles: ["Douala (Cameroun)", "Dakar (Sénégal)", "Lagos (Nigeria)", "Accra (Ghana)"],
          metriques: {
            retentionM6Target: "25% actifs",
            premiumConversionTarget: "8%",
            npsTarget: 50,
            restaurantsProTarget: 50,
            restaurantsGoldTarget: 10,
            arrTarget: "30M FCFA",
          },
          decisionsRequises: [
            "Validation pricing B2B définitif (15K Pro / 65K Gold)",
            "Go/No-Go expansion Douala mois 12",
            "Budget phase 2 badges (30+ badges, streaks, leaderboards)",
            "Naming mascotte chat",
          ],
        },
      } as Prisma.InputJsonValue,
    },
  });
  console.log(`        ✓ Mission 3 DRAFT (Consolidation Q4) + brief`);

  // ── CampaignBriefs SPAWT ───────────────────────────────────────────────
  console.log("\n[ 7b ] CampaignBriefs SPAWT...");

  const spawtBriefs = [
    // ── Brief Stratégique Global ─────────────────────────────────────────
    {
      id: "spawt-brief-stratégique",
      title: "Brief Stratégique Global — Lancement SPAWT Abidjan 2026",
      briefType: "CREATIVE",
      status: "VALIDATED",
      version: 2,
      generatedBy: null as string | null,
      targetDriver: null as string | null,
      content: {
        contexte: "SPAWT est une app d'identité culinaire pour la scène foodie d'Abidjan. Pas un agrégateur d'avis — un révélateur d'archétype. Mission 1 validée : 26 interviews, 78% fréquence >2x/semaine, frustration 7.8/10, 72% intention d'usage.",
        objective: "Construire SPAWT comme le premier OS de la vie sociale culinaire africaine premium. Acquérir 500+ spawters actifs en 6 mois, 5-8% conversion premium, 20+ restaurants partenaires.",
        positioning: "SPAWT ne note pas — SPAWT révèle. L'app qui transforme tes sorties resto en une identité culinaire narrative et sociale.",
        targetPersona: {
          primary: "Betsy (femme, 25-32 ans, CSP+, foodie urbaine, 300K+/mois, sort 3x/semaine, lasse des listes génériques)",
          secondary: "Brice (homme, 28-35 ans, CSP+, expert local, veut être reconnu comme référence culinaire)",
          ambassador: "Vanessa (créatrice de contenu, 2000+ followers, influence organique, revenue 300K/mois)",
          b2b: "Restaurants pilotes validés Mission 1 (5 Premium/Date night, 5 Street food Dabali, 3 Boys/BBQ, 3 Nouveaux, 2 Hype)",
        },
        pillarPriority: ["A", "D", "E", "V"],
        tone: "Premium mais accessible. Identitaire sans être élitiste. Ancré Abidjan. Langage de la Meute.",
        keyMessages: [
          "SPAWT révèle ton identité culinaire — on ne note pas, on découvre qui tu es",
          "Rejoins la Meute. Ton palais est une signature.",
          "L'app qui connaît ton âme foodie mieux que TripAdvisor",
          "Du spot au badge — chaque sortie raconte qui tu es",
        ],
        constraints: [
          "Pas de communication sur les notes ou classements — discours identitaire uniquement",
          "Respecter les 4 archétypes Palais dans tout le contenu (Betsy/Brice/Dominic/Vanessa)",
          "Toujours ancrer dans le territoire culinaire ivoirien/africain",
          "Budget phase 1 : 5M XAF terrain + 8M XAF activation = 13M XAF total",
        ],
        kpis: {
          m3: { spawtersActifs: 100, conversionPremium: "3-5%", restaurantsPartenaires: 20, ambassadeurs: "3-5" },
          m6: { spawtersActifs: 500, conversionPremium: "5-8%", restaurantsPartenaires: 50, arrCible: "7M XAF" },
        },
        validatedAt: "2026-01-20",
        validatedBy: "Alexandre 'xtincell' Djengue — Pioneer SPAWT",
      },
      advertis_vector: { a: 20, d: 20, v: 18, e: 20, r: 15, t: 18, i: 16, s: 19 },
    },

    // ── Brief Mission 1 — Terrain ─────────────────────────────────────────
    {
      id: "spawt-brief-mission1-terrain",
      title: "Brief Opérationnel — Mission 1 Cadrage & Vérité Terrain",
      briefType: "PRODUCTION",
      status: "VALIDATED",
      version: 1,
      generatedBy: null as string | null,
      targetDriver: "spawt-driver-event",
      content: {
        objective: "Valider le problème. Identifier les use cases. Ajuster le storytelling local. Onboarder 20 restaurants pilotes.",
        scope: "Abidjan — zones Cocody, Plateau, Marcory, Riviera, Zone 4",
        methodology: {
          interviews: {
            target: 30,
            done: 26,
            profile: "Foodies 22-38 ans, sortent >2x/semaine, niveau vie moyen-supérieur",
            questions: [
              "Comment choisis-tu un restaurant ?",
              "Frustration 1-10 dans le choix",
              "Est-ce que tu gardes une trace de tes restos ?",
              "Demo maquette → intention usage",
              "Combien tu paierais pour un tel outil ?",
            ],
          },
          restaurantVisits: {
            target: 20,
            done: 20,
            categories: {
              "Date Night": 5,
              "Dabali/Racines": 5,
              "Boys/BBQ": 3,
              "Nouveaux": 3,
              "Hype/Instagram": 2,
              "Sceptiques": 2,
            },
            pitch: "Partenariat B2B — dashboard insights archétype, badging, réservations futures",
          },
        },
        results: {
          frustrationMoyenne: 7.8,
          frequenceSortie: "78% >2x/semaine",
          intentionUsage: "72% post-demo",
          interetB2B: "14/20 restaurants intéressés",
          insightCle: "SPAWT devient indispensable quand une partie du fonctionnement est délocalisée sur l'app",
          bestProspect: "Le Bo Zinc — prêt à signer Gold",
          decision: "GO — tous les seuils atteints",
        },
        deliverables: [
          "Rapport Mission 1 Abidjan (26 interviews + 20 restaurants)",
          "Benchmark concurrentiel local (Google Maps, TripAdvisor, WhatsApp)",
          "Fiches 20 restaurants onboardés (ADN du Lieu sur 5 axes)",
          "Audit UX/Contenu app + recommandations onboarding",
        ],
        budget: 5000000,
        currency: "XAF",
        timeline: "Janvier–Mars 2026",
        status: "VALIDATED",
        completedAt: "2026-03-31",
      },
      advertis_vector: { a: 20, d: 18, v: 15, e: 16 },
    },

    // ── Brief Mission 2 — Activation ──────────────────────────────────────
    {
      id: "spawt-brief-mission2-activation",
      title: "Brief Activation — Mission 2 Traction & Communauté (Q2 2026)",
      briefType: "MEDIA",
      status: "DRAFT",
      version: 1,
      generatedBy: null as string | null,
      targetDriver: "spawt-driver-instagram",
      content: {
        objective: "Croître la base active à 100+ spawters. Tester la traction organique. Structurer l'activation locale. Amorcer la conversion premium.",
        phases: {
          phase1_ambassadeurs: {
            label: "Programme Ambassadeur — modèle Vanessa",
            target: "5-10 profils Vanessa (25-31 ans, content creators, 2000+ followers, 300K/mois)",
            activation: "Kit de contenu personnalisé, accès premium offert, budget 300K-500K FCFA/mois",
            kpi: "5 ambassadeurs actifs, 3 posts/semaine chacun, reach moyen 5000/post",
          },
          phase2_contenu: {
            label: "Campagnes acquisition Instagram/TikTok",
            formats: {
              instagram: [
                "Reels révélation Palais (type 'Dis-moi ce que tu manges, je te dirai qui tu es')",
                "Stories challenges identitaires (#MonPalaisAbidjan)",
                "Carrousels restaurant spotlight (ADN du Lieu visuellement)",
                "UGC ambassadeurs",
              ],
              tiktok: [
                "Duos reviews foodies — avant SPAWT / après SPAWT",
                "Day-in-the-life d'un Djidji (power user)",
                "Behind the scenes restaurant partenaire",
                "Hook identitaire : 'Tu es un Betsy ou un Brice ?'",
              ],
            },
            budget: "2M XAF paid / 3M XAF prod contenu",
          },
          phase3_events: {
            label: "3+ Food Tours communautaires",
            format: "Sortie groupée 15-20 spawters dans un quartier, restaurant partenaire hôte, live badge scoring",
            frequence: "1 event/2 mois",
            kpi: "50+ participants total, 3 médias couverts",
          },
        },
        conversionStrategy: {
          trigger: "Badge premium exclusif après 5 restos validés",
          pricing: "2500 FCFA/mois ou 25000 FCFA/an",
          arguments: ["Archétype Palais complet", "Accès restaurants partenaires exclusifs", "Statut visible dans la communauté"],
          target: "5-8% des spawters actifs convertis",
        },
        kpis: {
          spawtersActifsM6: 100,
          conversionPremium: "5%",
          coefficientViral: 1.4,
          eventsRealises: 3,
          ambassadeursActifs: "5-10",
          restaurantsActifsB2B: 20,
        },
        missionContext: {
          prerequis: "Mission 1 complétée — Go/No-Go = GO, 26 interviews, 20 restaurants validés",
          risques: [
            "Adoption lente saison des pluies (mai-juin Abidjan)",
            "Difficulté recrutement ambassadeurs authentiques",
            "Résistance restaurants sceptiques",
          ],
          mitigations: [
            "Événements indoor pendant saison pluies",
            "Critères ambassadeurs stricts : authenticité > notoriété",
            "ROI B2B dashboard visible dès j+30",
          ],
        },
        budget: 8000000,
        currency: "XAF",
        timeline: "Avril–Juin 2026",
      },
      advertis_vector: { a: 15, d: 18, v: 12, e: 22 },
    },

    // ── Brief Mission 3 — Consolidation ───────────────────────────────────
    {
      id: "spawt-brief-mission3-consolidation",
      title: "Brief Consolidation — Mission 3 PMF & Scale Prep (Q4 2026)",
      briefType: "CREATIVE",
      status: "DRAFT",
      version: 1,
      generatedBy: null as string | null,
      targetDriver: "spawt-driver-website",
      content: {
        objective: "Confirmer les signaux PMF. Réduire le churn. Valider pricing. Préparer l'expansion multi-villes (Douala, Dakar, Lagos).",
        diagnostics: {
          cohortes: {
            method: "Analyse rétention M1/M3/M6 par archétype Palais",
            targets: { retentionM6: "25% actifs", nps: 50, churning: "<10%/mois" },
            outil: "Dashboard LaFusée + analytics app",
          },
          powerUserInterviews: {
            target: "10-15 Djidji/Guide (50+ spots visités)",
            questions: [
              "Qu'est-ce que SPAWT a changé dans ta vie culinaire ?",
              "À quel moment tu n'arrives plus à t'en passer ?",
              "Qu'est-ce qui manque encore ?",
              "Tu paierais combien pour ne plus y avoir accès ?",
            ],
          },
          brandAudit: {
            method: "Comparaison intention positionnement vs perception utilisateurs",
            outils: ["Sondage NPS in-app", "Focus group 2 archétypes", "Social listening"],
          },
        },
        pricingValidation: {
          b2c: { monthly: 2500, annual: 25000, currency: "XAF", hypothesis: "Willingness-to-pay validé à 2500 FCFA/mois Mission 1" },
          b2b: {
            pro: { price: 15000, features: ["Analytics archétypes", "Profil vérifié", "Réponse avis"] },
            gold: { price: 65000, features: ["Dashboard ROI temps réel", "Réservations via app", "Spotlight mensuel", "Badging exclusif"] },
          },
        },
        expansionReadiness: {
          cities: [
            { city: "Douala", country: "Cameroun", priority: 1, reason: "2ème marché francophone Afrique centrale, scène foodie émergente, Alexandre natif" },
            { city: "Dakar", country: "Sénégal", priority: 2, reason: "Capitale tech Afrique de l'Ouest, early adopters digitaux, forte scène restauration" },
            { city: "Lagos", country: "Nigeria", priority: 3, reason: "Plus grand marché, partenariat requis, complexité opérationnelle élevée" },
          ],
          criteria: ["PMF Abidjan confirmé (NPS >50, rétention >25%)", "Playbook terrain documenté", "Budget expansion 15M XAF minimum", "Partenaire local identifié"],
          decision: "Go/No-Go Douala au mois 12",
        },
        deliverables: [
          "Rapport analyse cohortes M1/M3/M6 avec courbes de rétention par archétype",
          "Synthèse 15 interviews power users Djidji/Guide",
          "Audit perception marque (intention vs réalité terrain)",
          "Validation pricing B2C et B2B avec élasticité",
          "Rapport PMF final + scorecard",
          "Roadmap expansion multi-villes (Go/No-Go Douala)",
        ],
        kpis: {
          retentionM6: "25% actifs",
          nps: 50,
          premiumConversion: "8%",
          restaurantsProGold: 60,
          arrCible: "30M XAF",
          decisionsRequises: ["Pricing B2B définitif", "Go/No-Go Douala", "Budget phase 2 badges", "Naming mascotte chat"],
        },
        budget: 6000000,
        currency: "XAF",
        timeline: "Juillet–Octobre 2026",
      },
      advertis_vector: { a: 18, d: 20, v: 20, e: 18 },
    },

    // ── Brief Ambassadeur (VENDOR) ─────────────────────────────────────────
    {
      id: "spawt-brief-ambassadeur-vanessa",
      title: "Brief Ambassadeur — Programme Vanessa (Alliés Contenu SPAWT)",
      briefType: "VENDOR",
      status: "DRAFT",
      version: 1,
      generatedBy: null as string | null,
      targetDriver: "spawt-driver-tiktok",
      content: {
        programName: "Programme Alliés Contenu SPAWT — Archétype Vanessa",
        objective: "Recruter 5-10 ambassadeurs profil Vanessa pour propager l'identité SPAWT de manière authentique sur Instagram/TikTok.",
        ambassadeurProfile: {
          archetype: "Vanessa",
          age: "25-31 ans",
          gender: "Féminin prioritaire (70%), masculin (30%)",
          revenus: "250K-500K FCFA/mois",
          socialMedia: "Instagram + TikTok, 1500-10000 followers",
          style: "Contenu foodie organique, pas influenceur professionnel",
          engagement: ">5% taux engagement",
          frequenceSortie: ">2x/semaine en restaurant",
          criteresCles: [
            "Authenticité > notoriété",
            "Vraie passion culinaire identifiable dans le feed",
            "Audience locale Abidjan >60%",
            "Pas de collaboration marque alimentaire industrielle dans les 3 derniers mois",
          ],
        },
        compensation: {
          palier1: { label: "Allié Bronze", abonnement: "Premium offert (2500 FCFA/mois)", posts: "2 posts/semaine min", bonus: "Badge 'Allié SPAWT' visible profil" },
          palier2: { label: "Allié Argent", mensualite: "50000 FCFA/mois", abonnement: "Premium offert", posts: "3 posts/semaine + 1 story/jour", bonus: "Accès early features + invitation Food Tours" },
          palier3: { label: "Allié Or", mensualite: "150000 FCFA/mois", posts: "4+ posts/semaine + reporting mensuel", bonus: "Co-création contenu SPAWT, invitation pré-lancement Douala" },
        },
        contentGuidelines: {
          tonePrinciples: [
            "Parler en son nom — jamais de message corporate",
            "Anchorer chaque post dans une expérience personnelle réelle",
            "Mentionner l'archétype Palais révélé naturellement",
            "Utiliser le hashtag #SPAWT et #MonIdentiteCulinaire",
          ],
          contentFormats: {
            instagram: ["Reels sortie resto (hook identitaire)", "Stories en direct repas", "Carrousel 'Mon archétype Palais expliqué'"],
            tiktok: ["Vidéo revelation (avant/après SPAWT)", "Duo avec ami non-SPAWT", "GRWM pour une sortie SPAWT"],
          },
          prohibitions: [
            "Pas de comparaison directe avec TripAdvisor/Google",
            "Pas de mention prix ou promotions restaurants",
            "Pas de contenu généré hors expérience personnelle",
          ],
        },
        selectionProcess: {
          etape1: "Candidature libre ou invitation directe Pioneer",
          etape2: "Audit feed Instagram/TikTok (authenticité + adéquation archétype)",
          etape3: "Entretien Pioneer (30 min) — validation culture Meute",
          etape4: "Mission test : 1 post non rémunéré, 1 semaine d'essai",
          etape5: "Onboarding Palier 1 ou 2 selon performance",
        },
        kpis: {
          ambassadeursActifsM6: "5-10",
          postsParMois: 80,
          reachCumule: "500K impressions/mois",
          nouveauxSpawtersGeneres: 50,
          conversionAmbassadeurs: "30% des followers touchés s'inscrivent",
        },
        budget: 2000000,
        currency: "XAF",
        timeline: "Avril 2026 — ongoing",
      },
      advertis_vector: { e: 22, a: 18, d: 16, v: 12 },
    },
  ];

  for (const brief of spawtBriefs) {
    await db.campaignBrief.upsert({
      where: { id: brief.id },
      update: {
        title: brief.title,
        content: brief.content as Prisma.InputJsonValue,
        status: brief.status,
        version: brief.version,
      },
      create: {
        id: brief.id,
        campaignId: spawtCampaign.id,
        title: brief.title,
        briefType: brief.briefType,
        status: brief.status,
        version: brief.version,
        generatedBy: brief.generatedBy,
        targetDriver: brief.targetDriver,
        content: brief.content as Prisma.InputJsonValue,
        advertis_vector: brief.advertis_vector as Prisma.InputJsonValue,
      },
    });
    console.log(`        ✓ Brief: ${brief.title.slice(0, 55)}...`);
  }

  // ── 7c. Rapport SPAWT Mission 1 ─────────────────────────────────────────
  console.log("\n[ 7c ] Rapport Mission 1 Terrain...");
  const reportData = {
    summary: "Mission 1 COMPLÉTÉE — 26 interviews foodies, 20 restaurants en 6 catégories. Frustration 7.8/10. 72% intention d'usage. 14/20 restaurants intéressés B2B.",
    methodology: "Interviews qualitatives (26 foodies, 6 profils), visites terrain (20 restaurants), benchmark digital (Google Maps 847 résultats/5km Cocody), audit UX app.",
    keyFindings: [
      "Frustration principale : manque d'ancrage culturel dans les apps existantes (note 7.8/10)",
      "72% des foodies ont exprimé une intention d'usage immédiate",
      "14/20 restaurants intéressés par l'intégration B2B (modèle 5% commission)",
      "Aucun acteur digital local structuré identifié — gap clair",
      "Mascotte Palais validée comme fil conducteur (engagement +40% vs description pure)",
    ],
    restaurantCategories: { dateNight: 5, dabalRacines: 5, boysBBQ: 3, nouveaux: 3, hypeInstagram: 2, sceptiques: 2 },
    recommendations: [
      "Lancer Mission 2 : programme ambassadeur Vanessa (5-10 profils)",
      "Simplifier révélation Palais (< 3 taps) — frictions onboarding identifiées",
      "Prioriser segment Date Night (premium, fidèle, fort engagement)",
      "Activer les 14 restaurants B2B favorables dès Q2",
    ],
    deliverables: [
      { title: "Rapport Mission 1 Abidjan", fileUrl: "/documents/SPAWT_Mission1_Abidjan_Rapport.docx", status: "ACCEPTED" },
      { title: "Benchmark Concurrentiel Local", status: "ACCEPTED" },
      { title: "Fiche Restaurants Onboardés (20)", status: "ACCEPTED" },
      { title: "Audit Contenu & UX", status: "ACCEPTED" },
    ],
    score: { composite: 182.34, classification: "ICONE", confidence: 0.90 },
    missionId: mission1.id,
  };
  await db.campaignReport.upsert({
    where: { id: "spawt-report-mission1-terrain" },
    update: {
      title: "Rapport Terrain M1 — Cadrage & Vérité Abidjan (Mars 2026)",
      data: reportData as Prisma.InputJsonValue,
      summary: "Mission 1 COMPLÉTÉE. Frustration 7.8/10. 72% intention d'usage. 14/20 restaurants B2B.",
      generatedAt: new Date("2026-04-01"),
    },
    create: {
      id: "spawt-report-mission1-terrain",
      campaignId: spawtCampaign.id,
      title: "Rapport Terrain M1 — Cadrage & Vérité Abidjan (Mars 2026)",
      reportType: "MONTHLY",
      data: reportData as Prisma.InputJsonValue,
      summary: "Mission 1 COMPLÉTÉE. Frustration 7.8/10. 72% intention d'usage. 14/20 restaurants B2B.",
      generatedAt: new Date("2026-04-01"),
    },
  });
  console.log(`        ✓ Rapport Mission 1 Terrain (PUBLISHED)`);

  // ── 8. Deal SPAWT ──────────────────────────────────────────────────────
  console.log("\n[ 8/8 ] Deal SPAWT...");
  await db.deal.upsert({
    where: { id: "spawt-deal" },
    update: { strategyId: strategy.id },
    create: {
      id: "spawt-deal",
      strategyId: strategy.id,
      userId: alexandreUser.id,
      contactName: "Stéphanie Bidje",
      contactEmail: "stephanie@spawt.app",
      companyName: "SPAWT",
      stage: "WON",
      value: 30000000,
      currency: "XAF",
      source: "REFERRAL",
      wonAt: new Date("2026-01-10"),
    },
  });
  console.log(`        ✓ Deal SPAWT (30M XAF)`);

  // ── Résultats ──────────────────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("RÉSULTATS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`\n  Stratégie  : ${strategy.name}`);
  console.log(`  ID         : ${strategy.id}`);
  console.log(`  Score      : ${scoreResult.composite.toFixed(2)}/200  →  ${scoreResult.classification}`);

  console.log(`\n  Piliers :`);
  for (const ps of scoreResult.pillarScores) {
    const pillar = pillars.find((p) => p.key === ps.pillarKey.toLowerCase());
    const conf = Math.round((pillar?.confidence ?? 0) * 100);
    const bar = "█".repeat(Math.round(ps.score / 25 * 13)).padEnd(13, "░");
    console.log(`    ${ps.pillarKey}  [${bar}]  ${String(ps.score.toFixed(1)).padStart(6)}/25   conf:${conf}%`);
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  ✓  SPAWT DOCUMENTÉ — ${scoreResult.classification} (${scoreResult.composite.toFixed(1)}/200)`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  await db.$disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error("\n[ERREUR]", e.message);
  console.error(e.stack?.split("\n").slice(0, 8).join("\n"));
  process.exit(1);
});
