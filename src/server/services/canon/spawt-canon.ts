/**
 * CANON SPAWT — la stratégie « SPAWT — La carte du bon goût » à 100 % sur les
 * 8 piliers ADVE/RTIS, alignée champ par champ sur les contrats de maturité
 * COMPLETE (mêmes expectedKeys que le canon UPgraders, cf. upgraders-canon.ts).
 *
 * SPAWT est un compagnon de découverte culinaire communautaire pour Abidjan
 * (Côte d'Ivoire), opéré comme une marque cliente d'UPgraders. Source de
 * vérité : Brandbook v2, Présentation Top Management (Février 2026 V22), GTM
 * v3 Expert 30/60/90, Rapport Mission 1 Abidjan (mars 2026).
 *
 * Contenu rédigé par l'opérateur (NEFER) à partir du corpus client. RTIS
 * (R/T/I/S) seedé en dérivés cohérents — regénérable par la cascade comme
 * tout satellite. Idempotent : consommé par prisma/seed-spawt.ts (upsert par
 * (strategyId, key)).
 */

// ── PILIER A — AUTHENTICITÉ ────────────────────────────────────────────

export const PILLAR_A = {
  nomMarque: "SPAWT",
  accroche: "La carte du bon goût",
  description:
    "SPAWT est un compagnon de découverte culinaire communautaire pour Abidjan — pas un catalogue de restaurants. Un chat discret, curieux et indépendant guide chaque mangeur à travers la ville en croisant son profil gustatif (le Palais), l'ADN des lieux et l'intelligence de la tribu (la Meute).",
  secteur: "FoodTech / Découverte culinaire communautaire",
  pays: "CI",
  langue: "fr",
  brandNature: "PLATFORM",
  archetype: "Explorateur",
  archetypeSecondary: "Sage",
  publicCible:
    "Les foodies d'Abidjan 18-40 ans, smartphone-first, classe moyenne en expansion, qui veulent découvrir des lieux à leur goût sans fouiller, comparer ni demander : du fêtard de quartier (Dominic) à la superfan qui traverse la ville (Betsy), du pro qui ne veut jamais se tromper (Brice) jusqu'aux restaurateurs qui veulent comprendre leur clientèle.",
  noyauIdentitaire:
    "Nous croyons que chaque mangeur porte un Palais — un goût instinctif qui mérite d'être compris, pas formaté. SPAWT ne demande pas de remplir un formulaire de préférences : il observe les comportements réels et construit une identité culinaire vivante. « On ne chasse pas pour des points. On explore par instinct. On partage par passion. »",
  citationFondatrice:
    "« Plus jamais le goumin d'un mauvais restau. » — promesse maître SPAWT, née du fichier Excel de Stéphanie Bidje (Abidjan, 2020).",
  promesseFondamentale:
    "Te proposer le bon lieu, au bon moment, pour toi — vu qui tu es — sans formulaire, sans classement anonyme, sans bruit.",
  missionStatement:
    "Structurer l'offre culinaire d'Abidjan par l'intelligence de la communauté : transformer l'acte banal de « chercher un restau » en construction progressive d'une identité (le spawter), et donner à chaque lieu une réputation organique fidèle à ce que la tribu pense réellement de lui.",
  doctrine: {
    texte:
      "SPAWT est un compagnon, pas un catalogue. La data n'est ni rédigée ni algorithmique au départ : elle est générée par la Meute. La qualité de l'information croît avec la taille et la maturité de la communauté — c'est le design, pas un accident. Le Contrat SPAWT prime sur le calendrier commercial : quand ils se contredisent, le Contrat gagne.",
    dogmas: [
      "Le profil t'appartient — jamais exposé sans consentement.",
      "La recommandation suit ton Palais, jamais qui paie le plus.",
      "Payer ne change pas une note : payer donne de la compréhension (data) et de la voix (réponses aux avis).",
      "Pas de leaderboard, pas de classement, pas de compétition entre spawters.",
      "Le système récompense la qualité et la diversité, jamais la quantité brute.",
    ],
  },
  valeurs: [
    { valeur: "Instinct avant formulaire", justification: "Le Palais se calibre sur les comportements réels — le mangeur se découvre à travers l'app, il ne la remplit pas.", rang: 1 },
    { valeur: "Identité avant utilité", justification: "Trouver un resto vite est le hook ; devenir un spawter (titre, badges, trajectoire) est ce qui retient.", rang: 2 },
    { valeur: "Communauté avant funnel", justification: "La Meute crée la donnée et la calibre ; sans ses spawters, SPAWT ne fonctionne pas.", rang: 3 },
    { valeur: "Réputation organique", justification: "L'influence se gagne par la diversité des explorations et la confirmation des pairs, jamais par le volume brut ni par l'argent.", rang: 4 },
  ],
  herosJourney: [
    { actNumber: 1, title: "Le bruit", narrative: "Le mangeur d'Abidjan est seul face à 15 000 lieux, 847 résultats Google Maps et 47 messages WhatsApp contradictoires pour choisir un dîner.", emotionalArc: "frustration → lassitude", causalLink: "Le problème n'est pas l'offre, c'est le filtre — il n'existe aucun système qui comprend ce que toi tu aimes." },
    { actNumber: 2, title: "La rencontre du Chat", narrative: "Un quiz de 5 questions révèle son archétype (Pisteur, Fantôme…) ; le Chat l'accueille et flaire les bons spots pour lui.", emotionalArc: "curiosité → reconnaissance", causalLink: "Pour la première fois, une recommandation lui parle de lui — pas d'une moyenne anonyme." },
    { actNumber: 3, title: "L'exploration", narrative: "Le spawter spawte, note, enrichit son Palais ; son territoire se dessine, ses axes se stabilisent, ses badges s'accumulent.", emotionalArc: "plaisir → maîtrise", causalLink: "Chaque check-in nourrit le système et précise les recommandations suivantes (le flywheel B2C)." },
    { actNumber: 4, title: "La mue", narrative: "Le mangeur devient Detective puis Djidji : le Chat entre dans son nom, la colonie l'écoute, ses Coups de Cœur font et défont les réputations.", emotionalArc: "fierté → appartenance", causalLink: "L'attachement identitaire transforme l'usager en ambassadeur qui recrute sa Meute." },
    { actNumber: 5, title: "Le Guide", narrative: "Au sommet, le spawter est « le chat qui marche devant » — titre rare limité par ville, réévalué annuellement, voix de référence de sa zone.", emotionalArc: "accomplissement → transmission", causalLink: "Les Guides crédibilisent toute la data : leur confirmation calibre la réputation des lieux pour la tribu entière." },
  ],
  ikigai: {
    love: "La culture culinaire de rue et de table d'Abidjan, du garba au brunch — le vrai goût local",
    competence: "Profilage gustatif instinctif (le Palais 5 axes) + matching contextuel + gamification identitaire",
    worldNeed: "Aucun système ne comprend ce que chaque mangeur aime, ni ne structure les 15 000 lieux d'Abidjan, ni ne donne une voix à Tantie Rose qui n'existe pas en ligne",
    remuneration: "Premium B2C géographique (Spawter Gold 2 500 FCFA/mois) + tiers B2B restaurant (Libre / Pro 15k / Gold 65k)",
  },
  enemy: {
    name: "La recommandation anonyme",
    manifesto:
      "Nous refusons la note moyenne identique pour tous, le classement par popularité qui pousse les 50 mêmes adresses et ignore les 14 950 autres, l'avis du touriste de passage qui pèse autant que celui du connaisseur du quartier.",
    narrative:
      "Yelp, TheFork, Google Maps traitent le mangeur comme un consommateur anonyme et le restaurant comme une fiche dans un catalogue. En Afrique de l'Ouest, ce défaut est amplifié : Tantie Rose fait le meilleur attiéké d'Abidjan mais n'a ni site, ni page, ni fiche — elle n'existe pas dans l'écosystème digital.",
    enemySchwartzValues: ["conformité (suivre la foule)", "sécurité (le même endroit que d'habitude)", "pouvoir (la popularité comme seul juge)"],
    overtonMap: "Aujourd'hui acceptable : choisir où manger via une moyenne anonyme. Demain impensable : faire confiance à un classement qui ne sait rien de ton goût.",
    enemyBrands: ["Google Maps (restauration)", "TripAdvisor / TheFork", "les groupes WhatsApp de recommandations contradictoires"],
    activeOpposition: "Des avis pondérés par la crédibilité du reviewer (un Djidji pèse plus qu'un Touriste) et une recommandation personnalisée par le Palais.",
    passiveOpposition: "Chaque spawter dont le Palais est compris devient structurellement insensible aux classements génériques.",
    counterStrategy: "Ne pas dénigrer les lieux — révéler les pépites que la popularité ignore (Tantie Rose, le maquis caché).",
    fraternityFuel: "Les foodies fatigués de se tromper de restau et d'argumenter 3 heures sur WhatsApp se reconnaissent immédiatement.",
  },
  prophecy: {
    vision: "Abidjan se découvre par instinct et par la Meute, plus par le bruit — puis Douala, Dakar, Lagos, Accra.",
    worldTransformed:
      "Une ville où chaque mangeur connaît son Palais, où le maquis de quartier existe digitalement à côté du restaurant gastronomique, et où la réputation d'un lieu reflète ce que la communauté pense réellement — pas qui a payé.",
    horizon: "2026-2029",
  },
  originMyth: {
    elevator:
      "SPAWT est né d'un fichier Excel : celui de Stéphanie Bidje, camerounaise débarquée à Abidjan en pleine pandémie, sans réseau, qui a noté 47 spots pour s'y retrouver. Ce fichier est devenu le document le plus demandé de son cercle.",
    storytelling:
      "2020, Abidjan, pandémie. Stéphanie débarque sans recommandation. Google Maps lui propose 847 résultats ; elle passe 1h30 à comparer des avis contradictoires pour un déjeuner. Par réflexe de problem solver, elle ouvre un Excel : 47 spots testés, notés, catégorisés. Chaque collègue veut la liste, chaque nouveau venu finit par la recevoir. L'Excel de Stéphanie est le prototype de SPAWT — pas une vision grandiose, une frustration transformée en outil, puis en produit.",
    dateFondation: "2020",
    lieu: "Abidjan, Côte d'Ivoire",
  },
  timelineNarrative: {
    origine: "2020 — Abidjan : Stéphanie Bidje transforme sa frustration de nouvelle arrivante en fichier Excel de 47 spots, prototype de SPAWT.",
    transformation: "2025-2026 — Refonte produit V22 : le système Palais, les 13 archétypes, les 3 modes contextuels et la monétisation B2B/B2C structurée remplacent l'app-catalogue.",
    present: "2026 — Reconnaissance terrain (Mission 1 Abidjan, mars : 13 établissements, 10 fiches, 8 contacts B2B) et GTM 90 jours financé (1M FCFA) avec UPgraders.",
    futur: "2027-2029 — PMF Abidjan prouvé, puis design portable activé sur Douala/Dakar/Lagos/Accra (jamais avant le mois 12).",
  },
  livingMythology: {
    canon:
      "Le Contrat SPAWT (ce que la plateforme promet et ne fera jamais) + le dialecte SPAWT (spawter, spawt, la Meute, Djidji, trouvaille, Palais, le Chat, Paws, Coup de Cœur, Tanière) + la mascotte le Chat dont la voix mûrit avec le spawter + les rituels collectifs (Foodie Games, Black Spawtday) qui restent communautaires, jamais des leaderboards.",
    extensionRules:
      "Le dialecte crée un monde et fait foi : pas de drift vers le vocabulaire générique (« note un restaurant sur une app » devient « note un lieu et enrichit son Palais »). Les termes locaux (Djidji = expert en nouchi) sont adaptés par ville à l'expansion.",
    captureSystem:
      "Le lexique vit dans le Brandbook v2 §13.4 ; toute communication (in-app, marketing, B2B) parle le dialecte. Le ton du Chat est versionné par stade de maturité (enjoué/taquin → grave/complice).",
  },
  equipeDirigeante: [
    { nom: "Stéphanie Bidje", role: "Fondatrice (Pioneer) — vision produit & sensibilité culinaire", competences: ["Business Development", "Tech / E-commerce (Jumia, Auchan)", "curation culinaire"] },
    { nom: "UPgraders SARL (Alexandre Djengue)", role: "Direction créative & opérateur de marque (agence)", competences: ["stratégie de marque ADVERTIS", "GTM / growth", "architecture produit"] },
  ],
  equipeComplementarite: {
    scoreGlobal: 7,
    couvertureTechnique: "Moyenne-forte — fondatrice issue de la tech/e-commerce ; build produit (app Android) sous-traité/partenaire, à internaliser au scale.",
    couvertureCommerciale: "Forte sur le terrain B2B — méthode des Alliés (community managers quartier) qui onboardent et gèrent 5-10 fiches Pro chacun.",
    couvertureOperationnelle: "Forte — GTM 90 jours ventilé action par action, gates de décision (J21, J60), instrumentation North Star dès J1.",
    capaciteExecution: "Élevée sur l'acquisition lean et la supply B2B ; bornée par la taille de l'équipe core et la dépendance au build Android.",
    verdict: "Binôme fondatrice × agence opératrice complémentaire ; la scalabilité passe par le réseau d'Alliés terrain et la viralité du quiz, pas par l'effectif core.",
    lacunes: ["Lead produit / mobile à temps plein", "Officier partenariats B2B au-delà de 50 lieux"],
  },
  messieFondateur: {
    nom: "Stéphanie Bidje",
    role: "Fondatrice de SPAWT, archétype « The Curator / The Simplifier »",
    narrative:
      "Camerounaise de 33 ans, background Business Development et e-commerce (Jumia, Auchan). Débarquée à Abidjan sans réseau, elle a résolu sa propre frustration par un outil — puis a compris que des milliers de mangeurs vivaient la même. La curatrice qui simplifie le chaos culinaire d'une ville.",
    charismaScore: 7,
  },
  competencesDivines: [
    { competence: "Profilage gustatif instinctif (le Palais)", preuve: "5 axes bipolaires + 13 archétypes + 5 stades de maturité, calibrés sans formulaire sur le comportement réel" },
    { competence: "Curation culinaire de terrain", preuve: "Excel fondateur de 47 spots ; Mission 1 Abidjan : 13 établissements scorés sur grille SPAWT 12 points" },
    { competence: "Gamification identitaire", preuve: "Système titres × badges (Activer/Crédibiliser/Convertir/Viraliser/Retenir) sans score visible ni leaderboard" },
  ],
  hierarchieCommunautaire: {
    niveaux: ["Spectateur (lead waitlist)", "Spawter (Touriste 🐱)", "Explorateur 🐈", "Detective 🐈‍⬛ (le Chat entre dans le nom)", "Djidji ✦", "Guide ◉ (rare, limité par ville)"],
    principe: "Chaque stade se gagne par le comportement accumulé (la maturité ne recule jamais), jamais par déclaration ni par paiement.",
  },
  preuvesAuthenticite: [
    "Le produit est né d'un usage réel (l'Excel de la fondatrice), pas d'un business plan théorique.",
    "Reconnaissance terrain documentée (Mission 1 : fiches détaillées, scores 12 points, grilles tarifaires, contacts B2B réels).",
    "Tarifs en FCFA pensés mobile money et pouvoir d'achat local — paywall géographique (3 km) qui EST le ciblage socio-économique.",
  ],
  indexReputation: { score: 0, source: "Pré-lancement — réputation à construire dès la waitlist (Gate 1 J21)", date: "2026-03" },
  eNps: {
    score: 0,
    sampleSize: 0,
    frequency: "trimestrielle (post-lancement)",
    lastMeasured: "N/A — pré-lancement",
    verbatims: ["« Le document le plus demandé de mon cercle. » (à propos de l'Excel fondateur)"],
  },
  turnoverRate: 0,
} as const;

// ── PILIER D — DISTINCTION ─────────────────────────────────────────────

export const PILLAR_D = {
  positionnement:
    "Le compagnon de découverte culinaire communautaire d'Abidjan : ni catalogue, ni TripAdvisor local, ni marketplace de réservation — un chat qui comprend ton Palais et te guide vers le bon lieu, maintenant, pour toi.",
  positionnementEmotionnel:
    "La fin du goumin : la confiance tranquille de quelqu'un qui sait où son palais veut aller, et la fierté d'une identité culinaire qui se construit à chaque trouvaille.",
  promesseMaitre:
    "Plus jamais le goumin d'un mauvais restau — la recommandation suit ton Palais, jamais qui paie le plus.",
  sousPromesses: [
    { promesse: "Une reco qui te parle de toi", preuve: "Matching instinctif : Palais du spawter × ADN du lieu × historique × profils similaires × contexte (heure, météo, dispo)" },
    { promesse: "Des avis crédibles, pas anonymes", preuve: "Avis pondérés par la maturité du reviewer (un Djidji pèse plus qu'un Touriste) + confirmation par les pairs" },
    { promesse: "Une identité qui se collectionne", preuve: "13 archétypes, 5 stades de maturité, titres permanents + badges Exploration/Expertise/Influence" },
    { promesse: "Les pépites que la popularité ignore", preuve: "Tantie Rose et les maquis cachés existent par la Meute, poussés par l'algo organique (badge Chasseur de Pépites)" },
  ],
  personas: [
    {
      nom: "Betsy (la Superfan)",
      insightCle: "Sort 3-4×/mois à travers Abidjan ; le premium se rentabilise en une sortie évitée de travers.",
      motivations: ["déverrouiller tout Abidjan", "Palais complet 5 axes + historique", "ne plus jamais perdre une sortie"],
      barriers: ["prix mensuel récurrent", "habitude des groupes WhatsApp"],
    },
    {
      nom: "Brice (le Pro)",
      insightCle: "Ne veut jamais se tromper — un mauvais choix de resto a un coût social/pro.",
      motivations: ["badge doré sur le profil", "réservation 1 tap", "recommandation fiable instantanée"],
      barriers: ["temps", "scepticisme envers une nouvelle app"],
    },
    {
      nom: "Dominic (le Fêtard)",
      insightCle: "Reste dans sa commune, ne paiera pas — mais ramène 50 amis via TikTok : sa valeur est virale, pas monétaire.",
      motivations: ["découvrir gratis dans sa commune", "partager ses trouvailles", "statut social dans son crew"],
      barriers: ["pouvoir d'achat", "aucune intention de payer (paywall géo assumé)"],
    },
    {
      nom: "Le Restaurateur (ex: Tantie Rose, Texas Grillz, Kaiten)",
      insightCle: "Existe sur SPAWT parce que la Meute l'y met — puis veut contrôler sa voix et comprendre sa clientèle.",
      motivations: ["badge ✓ Vérifié + répondre aux avis (Pro)", "data Palais de sa clientèle + ciblage archétype (Gold)", "trafic qualifié"],
      barriers: ["faible digitalisation (levée par l'Allié SPAWT)", "budget mensuel pour un maquis de quartier"],
    },
  ],
  tonDeVoix: {
    personnalite: ["Complice", "Curieux", "Indépendant", "Jamais condescendant"],
    onDit: ["spawter", "trouvaille", "ton Palais", "la Meute", "Djidji", "Coup de Cœur", "le Chat flaire"],
    onNeDitPas: ["utilisateur", "restaurant noté 4.2 étoiles", "classement", "top 10", "le meilleur resto de Cocody"],
  },
  assetsLinguistiques: {
    languePrincipale: "fr",
    slogan: "La carte du bon goût",
    tagline: "On ne te dit pas quoi manger. On te dit où ton palais veut aller.",
    naming: "Dialecte SPAWT strict (Brandbook §13.4) — chaque terme générique a son équivalent de marque.",
    lexique: ["SPAWT", "spawter", "spawt", "la Meute", "le Chat", "Palais", "Djidji", "trouvaille", "Coup de Cœur", "Tanière", "Paws"],
  },
  paysageConcurrentiel: [
    { name: "Google Maps (restauration)", avantagesCompetitifs: ["couverture massive", "gratuité", "intégration cartographique"], partDeMarcheEstimee: "dominante par défaut", faiblesses: ["impersonnel et universel", "note moyenne identique pour tous", "ignore les lieux non-digitalisés (Tantie Rose)"], strategiePos: "Le battre sur la personnalisation et l'inclusion des pépites — pas sur la couverture brute.", distinctiveAssets: ["la fiche Google ubiquitaire", "les avphotos utilisateurs"] },
    { name: "TripAdvisor / TheFork", avantagesCompetitifs: ["notoriété", "système de réservation"], partDeMarcheEstimee: "marginale localement", faiblesses: ["classements de touristes de passage", "logique catalogue + réservation, pas découverte", "zéro ancrage culturel ivoirien"], strategiePos: "Opposer l'identitaire et le local à l'utilitaire et l'impersonnel.", distinctiveAssets: ["base d'avis internationale", "le bouton réserver"] },
    { name: "Groupes WhatsApp / Facebook & bouche-à-oreille", avantagesCompetitifs: ["confiance interpersonnelle", "gratuité", "ancrage réel"], partDeMarcheEstimee: "premier canal de découverte", faiblesses: ["ne scale pas au-delà du cercle immédiat", "47 messages contradictoires pour un choix", "aucune mémoire structurée"], strategiePos: "Industrialiser le bouche-à-oreille : la Meute scale ce que le groupe WhatsApp ne peut pas.", distinctiveAssets: ["le lien social existant"] },
    { name: "Instagram (food influenceurs)", avantagesCompetitifs: ["reach visuel", "désir / food porn"], partDeMarcheEstimee: "forte sur la découverte aspirationnelle", faiblesses: ["recommandation payée à la performance", "aucun profil gustatif", "pas de filtre personnel"], strategiePos: "Ne pas combattre : enrôler les influenceuses en Ambassadrices (statut séparé, hors Palais) qui amènent du trafic.", distinctiveAssets: ["audiences personnelles", "esthétique"] },
  ],
  swotFlash: {
    strength: "Profil gustatif propriétaire (le Palais) + data communautaire que personne d'autre ne possède + dialecte et identité de marque forts + ancrage local (nouchi, maquis).",
    weakness: "Pré-lancement : zéro inventaire au départ, dépendance au build Android et à l'atteinte de la masse critique de Meute pour que la donnée ait de la valeur.",
    opportunity: "15 000+ lieux non structurés à Abidjan, >50 % de pénétration smartphone, culture de recommandation orale forte, aucun acteur digital local intelligent.",
    threat: "CPM Meta/TikTok volatils, churn J1-J7, coût caché WhatsApp API au scale, entrée d'un acteur international localisé.",
  },
  barriersImitation: [
    { barrier: "La data du Palais", defensibility: "Le profil gustatif multidimensionnel s'enrichit à chaque check-in ; un concurrent part de zéro comportement et le retard se creuse avec la Meute.", expectedDuration: "structurelle (s'auto-renforce)", category: "données propriétaires" },
    { barrier: "L'identité de marque (dialecte + archétypes)", defensibility: "Le monde SPAWT (spawter, Djidji, le Chat, 13 archétypes) crée un attachement identitaire difficilement copiable sans paraître dérivatif.", expectedDuration: "2-3 ans", category: "marque / récit" },
    { barrier: "Le réseau d'Alliés terrain", defensibility: "Les community managers quartier qui digitalisent Tantie Rose sont un actif d'exécution local que les plateformes globales n'ont pas.", expectedDuration: "structurelle en zone dense", category: "opérations / distribution" },
  ],
  archetypalExpression: {
    visualTranslation: "Explorateur × Sage en image : un chat félin discret qui se balade sur une carte nocturne, food porn authentique en lumière naturelle, sophistication discrète (noir/or/vert chat) — jamais mignon, toujours pertinent.",
    verbalTranslation: "L'Explorateur parle en territoires (« trouvaille », « ta commune », « traversée ») ; le Sage parle en discernement (« ton Palais », « calibré », « un Djidji a confirmé »).",
    emotionalRegister: "Complicité curieuse : on murmure, on ne crie pas ; on suggère, on ne vend pas — la voix mûrit avec le spawter (taquine au début, grave et complice ensuite).",
  },
  directionArtistique: {
    univers: "Luxe accessible, nocturne, sophistication discrète — noir #0A0A0A, or #C8A44E, vert chat #2D6B4F, blanc cassé #FAFAF8",
    principes: ["Le Chat guide, ne juge pas (discret, curieux, indépendant)", "Food porn authentique du vrai de la rue, pas du studio", "Instrument Serif (display) + Manrope (body) + JetBrains Mono (data)"],
  },
  proofPoints: [
    "Mission 1 Abidjan : 13 établissements visités, 10 fiches complètes, grille de scoring 12 points appliquée (mars 2026).",
    "Système Palais opérationnel : 5 axes × 13 archétypes × 5 stades = titres collectionnables sans score visible.",
    "GTM 90 jours financé (1M FCFA) ventilé action par action, avec gates de décision objectivés (J21, J60).",
  ],
  sacredObjects: [
    { name: "Le Palais", form: "Profil gustatif 5 axes calculé en continu", narrative: "Qui tu ES, pas ce que tu as fait — le système te comprend mieux que tu ne te comprends.", stage: "activation (aha moment du quiz)", socialSignal: "Connaître son archétype = appartenir à la Meute." },
    { name: "Le titre collectionnable", form: "Nom calculé (2 axes × maturité), permanent, choisi à l'affichage", narrative: "Petit Pisteur → Pisteur de Brousse → La Piste : la trajectoire identitaire comme asset, pas un log.", stage: "rétention (progression)", socialSignal: "Afficher « Chat Fantôme » = afficher un flair reconnu par la colonie." },
    { name: "Le Coup de Cœur", form: "Vote social rare indexé sur la maturité (1 à 3/mois + bonus premium)", narrative: "La monnaie sociale la plus précieuse — rare par design, alignée sur la crédibilité, pas le portefeuille.", stage: "viralité / influence", socialSignal: "Recevoir un Coup de Cœur d'un Djidji = consécration d'un lieu." },
  ],
  symboles: [
    { symbol: "Le Chat", meanings: ["indépendance curieuse (ne suit pas, flaire)", "discrétion (murmure, ne crie pas)", "fusion spawter/mascotte au stade Detective"], usageContexts: ["mascotte de l'app", "voix des notifications", "logo"] },
    { symbol: "La carte / la patte (Paws)", meanings: ["le territoire exploré", "la trouvaille géolocalisée", "la monnaie d'activité backend"], usageContexts: ["interface carte", "badges Exploration", "mécaniques internes"] },
    { symbol: "Le bon goût (l'assiette)", meanings: ["la promesse maître", "le palais qui se cultive", "l'authenticité du vrai de la rue"], usageContexts: ["food porn éditorial", "cartes Plat Emblématique", "signature de marque"] },
  ],
  esov: { value: 0, measurementMethod: "Share of voice food Abidjan (mentions sociales + UGC créateurs) − share of market — à instrumenter au lancement", lastMeasured: "N/A — pré-lancement", source: "Veille sociale + tracking UTM créateurs (A3/A12)" },
  storyEvidenceRatio: { storytellingPct: 60, evidencePct: 40, target: "Phase de lancement portée par le récit (le Chat, le Palais) ; basculer vers ≥ 50 % de preuve dès que la data communautaire s'accumule." },
} as const;

// ── PILIER V — VALEUR ──────────────────────────────────────────────────

export const PILLAR_V = {
  promesseDeValeur:
    "Gratuit pour découvrir ta commune (~3 km) ; le premium déverrouille tout Abidjan et ton Palais complet ; les lieux existent gratuitement par la Meute et paient pour comprendre leur clientèle et amplifier leur voix.",
  produitsCatalogue: [
    { nom: "Spawter (gratuit)", description: "Découverte dans ta commune (~3 km), 60 % du contenu, Palais basique (2 axes), rejoindre des crews", prix: "0 FCFA" },
    { nom: "Spawter Gold (premium B2C)", description: "Tout Abidjan déverrouillé, 100 % du contenu, Palais complet 5 axes + historique, réservation 1 tap, badge doré, crews illimités, SPAWT Wrapped", prix: "2 500 FCFA/mois · 25 000 FCFA/an" },
    { nom: "Spawt Libre (B2B, défaut)", description: "Fiche lieu créée par les spawters, ADN auto-calculé, étoiles et avis visibles, recommandations organiques", prix: "0 FCFA" },
    { nom: "Spawt Pro (B2B)", description: "Badge ✓ Vérifié, réponse aux avis, Le Carnet éditorial, dashboard basique (qui spawte, profils Palais, heures de pointe)", prix: "15 000 FCFA/mois" },
    { nom: "Spawt Gold (B2B)", description: "Visibilité contextuelle « Pour Toi Aujourd'hui » (sponsorisé), analytics avancés, ciblage par archétype, événements exclusifs, benchmark zone anonymisé", prix: "65 000 FCFA/mois" },
  ],
  productLadder: [
    { tier: "INTAKE_FREE", palier: "Spectateur → Spawter gratuit", role: "capture (waitlist + commune gratuite)" },
    { tier: "COCKPIT_MONTHLY", palier: "Spawter Gold (B2C premium)", role: "conversion B2C" },
    { tier: "RETAINER_BASE", palier: "Spawt Pro (lieu revendiqué)", role: "monétisation B2B socle" },
    { tier: "RETAINER_PRO", palier: "Spawt Gold (lieu intelligence)", role: "monétisation B2B premium" },
  ],
  businessModel:
    "Double face : le B2C crée l'audience (gratuit + premium géographique 2 500 FCFA/mois), le B2B la monétise (Libre → Pro 15k → Gold 65k). La data du Palais est le pont : ce que les spawters génèrent en explorant, les restaurants le consomment en insights. Le revenu Y1 (~800K FCFA) est porté par le B2B, indépendant du mode B2C.",
  economicModels: [
    { modele: "Abonnement B2B restaurant (Pro + Gold)", part: 0.7 },
    { modele: "Abonnement premium B2C (Spawter Gold)", part: 0.2 },
    { modele: "Visibilité contextuelle sponsorisée (Gold)", part: 0.1 },
  ],
  unitEconomics: {
    cac: 120,
    ltv: 350000,
    ltvCacRatio: 23,
    margeBrute: 0.85,
    paybackPeriodMois: 1,
    budgetCom: 1000000,
    caVise: 800000,
    commentaire: "CAC blended B2C ~120 FCFA (380K acquisition / 3 200 installs, 60 %+ organique/referral). Le revenu est B2B : ARPU 44K/mois (mix 80 % Pro / 20 % Gold), coût d'acquisition lieu ~10-15K, payback < 1 mois, LTV 12 mois ~350K (churn 8 %/mois), LTV:CAC ≥ 23:1. budgetCom = trésorerie GTM 90 j ; caVise = revenu Y1 B2B cumulé.",
  },
  pricingJustification:
    "Premium B2C à 2 500 FCFA/mois calibré sur le pouvoir d'achat de la cible qui traverse Abidjan (Betsy se rentabilise en une sortie). Paywall géographique (3 km gratuit) = ciblage socio-économique assumé : Dominic reste gratuit dans sa commune et amplifie, Brice paie pour tout Abidjan. B2B : Pro 15K (voix + data basique) / Gold 65K (intelligence Palais), tarifs FCFA mobile money — payer ne change jamais la note (Contrat).",
  personaSegmentMap: [
    { personaName: "Betsy (la Superfan)", productNames: ["Spawter Gold"], devotionLevel: "Engagé", revenueContributionPct: 15 },
    { personaName: "Brice (le Pro)", productNames: ["Spawter Gold"], devotionLevel: "Participant", revenueContributionPct: 10 },
    { personaName: "Le Restaurateur (Pro)", productNames: ["Spawt Pro"], devotionLevel: "Engagé", revenueContributionPct: 45 },
    { personaName: "Le Restaurateur (Gold)", productNames: ["Spawt Gold"], devotionLevel: "Ambassadeur", revenueContributionPct: 30 },
  ],
  sacrificeRequis: {
    justification: "La valeur de SPAWT vient de la Meute : le spawter doit explorer et aviser réellement pour que la donnée existe — c'est la condition du flywheel, pas une corvée.",
    prix: "Gratuit pour découvrir sa commune ; 2 500 FCFA/mois pour déverrouiller tout Abidjan (B2C) ; 15-65K/mois pour un lieu qui veut sa voix et sa data.",
    temps: "Quelques minutes par sortie : spawter (check-in), noter, parfois rédiger un avis détaillé — le calibrage du Palais est passif, l'enrichissement actif est récompensé socialement.",
    effort: "Explorer hors de ses habitudes (la diversité fait progresser), aviser honnêtement, accepter que le titre soit calculé et non choisi.",
  },
  packagingExperience: {
    unboxingRitual: "Le quiz Palais : 5 questions = 5 axes → ton archétype révélé (Pisteur, Fantôme…), partageable immédiatement — le déballage est une révélation de soi, pas un onboarding.",
    packagingMaterial: "App mobile Android premium (noir/or/vert chat) + cartes collectibles (Profil Spawter / Fiche Lieu / Plat Emblématique) générées pour le partage.",
    deliveryMode: "3 modes contextuels qui s'adaptent au moment : Rapide (swipe, choisis, vas-y < 3 min), Crew (sortie de groupe), Explore (flânerie de découverte).",
    sensoryNotes: "Le Chat murmure (notifications taquines, max 1/jour) ; food porn en lumière naturelle ; célébration visuelle dédiée à chaque montée de stade ou mue.",
    instagrammable: true,
  },
  positioningArchetype: "PREMIUM_ACCESSIBLE",
  salesChannel: "Direct B2C (Google Play, waitlist quiz, créateurs) + terrain B2B via les Alliés SPAWT (community managers quartier)",
  freeLayer: {
    whatIsFree: "La découverte dans ta commune (~3 km), 60 % du contenu, le Palais basique (2 axes visibles), rejoindre des crews, et pour les lieux : la fiche entière créée par la Meute (Spawt Libre).",
    whatIsPaid: "Tout Abidjan déverrouillé + Palais complet 5 axes + historique + réservation 1 tap (B2C Gold) ; la voix et la data pour les lieux (B2B Pro/Gold).",
    conversionLever: "Le paywall géographique : dès que le spawter veut sortir de sa commune (Betsy, Brice), le premium devient évident ; côté lieu, voir qu'on existe sur SPAWT donne envie de contrôler sa voix (Pro) puis de comprendre sa clientèle (Gold).",
  },
  mvp: {
    exists: true,
    stage: "PRÉ-LANCEMENT — build Android en cours, GTM 90 jours amorcé",
    description: "App de découverte culinaire : quiz Palais, profil archétype, fiches lieux communautaires, matching contextuel 3 modes, badges/titres, tiers premium B2C et B2B.",
    features: ["quiz Palais 5 questions → archétype", "fiches lieux + ADN auto-calculé", "matching instinctif 3 modes", "système titres × badges", "premium géographique + tiers B2B"],
    launchDate: "2026 (post-Gate 1 J21)",
    userCount: 0,
    feedbackSummary: "Pré-lancement : l'Excel fondateur valide la demande (document le plus demandé du cercle) ; Mission 1 valide l'appétit B2B (8 contacts, 2 lieux très intéressés : Texas Grillz, Kaiten).",
  },
  proprieteIntellectuelle: {
    brevets: [],
    secretsCommerciaux: ["formule du Palais (5 axes → 13 archétypes)", "logique de matching instinctif (Palais × ADN × contexte)", "pondération des avis par maturité du reviewer"],
    technologieProprietary: "Le système Palais + le moteur de matching contextuel + l'ADN de lieu auto-calculé — data communautaire propriétaire non réplicable sans la Meute.",
    barrieresEntree: ["la data communautaire (effet de réseau)", "l'identité de marque / dialecte", "le réseau d'Alliés terrain"],
    licences: ["marque SPAWT et dialecte propriétaires", "données utilisateurs jamais exposées sans consentement (Contrat)", "agrégats anonymisés vendus en insights B2B Gold"],
    protectionScore: 6,
  },
  valeurMarqueTangible: [
    "MRR B2B (Pro 15K + Gold 65K) + premium B2C (2 500/mois)",
    "Base de données structurée des lieux d'Abidjan (la première du genre)",
    "Data Palais agrégée et anonymisée (insights revendables)",
  ],
  valeurMarqueIntangible: [
    "Position de catégorie : « le compagnon de découverte culinaire d'Abidjan »",
    "L'attachement identitaire de la Meute (spawters qui se définissent par leur archétype)",
    "Le capital de confiance du Contrat SPAWT (payer ≠ ranker)",
  ],
  valeurClientTangible: [
    "Recommandations personnalisées qui évitent les mauvais choix (le goumin)",
    "Réservation 1 tap (Gold B2C)",
    "Pour les lieux : dashboard clientèle, ciblage archétype, trafic qualifié",
  ],
  valeurClientIntangible: [
    "Fin de la charge mentale du choix (3 modes contextuels)",
    "Une identité culinaire qui se collectionne et se montre",
    "Pour les lieux : une voix fidèle à ce que la tribu pense réellement d'eux",
  ],
  coutMarqueTangible: ["Build et maintenance app Android", "Acquisition payante (Meta/TikTok)", "Forfaits data & transport des Alliés terrain", "WhatsApp API (transactionnel)"],
  coutMarqueIntangible: ["Discipline du Contrat (refuser le revenu qui le viole)", "Dépendance à la masse critique de Meute"],
  coutClientTangible: ["Abonnement premium 2 500 FCFA/mois (B2C)", "Abonnement Pro/Gold (B2B)"],
  coutClientIntangible: ["Effort d'exploration et d'avis honnête (B2C)", "Acceptation de la transparence des avis communautaires (B2B)"],
  roiProofs: [
    { beforeMetric: "1h30 à comparer 847 résultats Google Maps pour un déjeuner", afterMetric: "Une trouvaille en mode Rapide en < 3 min", lift: "÷30 sur le temps de décision", timeframe: "par sortie", client: "Excel fondateur → produit", attestation: "Récit fondateur documenté (Brandbook §0.3)" },
    { beforeMetric: "Lieu invisible digitalement (Tantie Rose : ni site, ni page, ni fiche)", afterMetric: "Fiche communautaire + ADN auto-calculé + recommandations organiques", lift: "0 → présence digitale structurée", timeframe: "dès le 1er spawt", client: "lieux Spawt Libre", attestation: "Mécanique Spawt Libre (Brandbook §10.2)" },
    { beforeMetric: "Restaurant sans visibilité sur sa clientèle", afterMetric: "Insights Gold (« 60 % Tanière+maquis, ta zone a 40 % de Nomade que tu ne captes pas »)", lift: "Décisions d'offre fondées sur la data", timeframe: "mensuel", client: "lieux Spawt Gold", attestation: "Exemples d'insights Gold (Brandbook §11.3)" },
  ],
  experienceMultisensorielle: {
    vue: "Carte nocturne noir/or, food porn authentique en lumière naturelle, le Chat qui se balade et flaire — sophistication discrète.",
    ouie: "Le Chat murmure : notifications taquines puis complices, max 1/jour ; signature sonore de célébration à chaque montée de stade.",
    odorat: "N/A (numérique) — transposé : l'évocation du garba, du maquis, de l'attiéké, l'odeur du vrai de la rue.",
    toucher: "Le swipe du mode Rapide (choisis, vas-y), le tap de réservation, la collection de cartes qu'on feuillette.",
    gout: "Le cœur du produit : le bon goût retrouvé, le Palais comme palais — l'app qui sait où ton palais veut aller.",
  },
} as const;

// ── PILIER E — ENGAGEMENT ──────────────────────────────────────────────

export const PILLAR_E = {
  promesseExperience:
    "Te découvrir à travers tes trouvailles : chaque spawt enrichit ton Palais, fait progresser ton titre, accumule tes badges — l'app devient le miroir de ton identité culinaire, pas un catalogue à fouiller.",
  primaryChannel: "App mobile SPAWT (Android-first) — le compagnon quotidien du spawter",
  touchpoints: [
    { canal: "Landing + Quiz Palais (waitlist)", type: "Acquisition", stadeAarrr: "Acquisition" },
    { canal: "App SPAWT (3 modes)", type: "Découverte quotidienne", stadeAarrr: "Retention" },
    { canal: "WhatsApp Community « La Meute Abidjan »", type: "Weekly Digest + relation", stadeAarrr: "Retention" },
    { canal: "Le Chat (notifications)", type: "Conciergerie & relances contextuelles", stadeAarrr: "Activation" },
    { canal: "Créateurs / TikTok / Instagram", type: "Trouvailles & viralité", stadeAarrr: "Acquisition" },
    { canal: "Kit « Spawté ici » (QR en lieu)", type: "Pont physique → digital", stadeAarrr: "Referral" },
  ],
  channelTouchpointMap: [
    { salesChannel: "Acquisition organique (quiz viral + créateurs)", touchpointRefs: ["landing", "quiz Palais", "carte archétype partageable", "codes créateurs UTM"] },
    { salesChannel: "Acquisition payante (Meta/TikTok)", touchpointRefs: ["manifeste vidéo (voix du Chat)", "créas UGC", "deep link Play Store"] },
    { salesChannel: "Rétention (WhatsApp Communities)", touchpointRefs: ["Weekly Digest jeudi 17h", "3 trouvailles trackées", "le Chat en conciergerie"] },
    { salesChannel: "Supply B2B (terrain Alliés)", touchpointRefs: ["onboarding lieu 30 min", "kit QR table + chevalet", "badge Ambassadeur"] },
  ],
  rituels: [
    { nom: "Le quiz Palais", frequence: "une fois (onboarding)", description: "5 questions = 5 axes → archétype révélé et partageable (aha moment)" },
    { nom: "La première trouvaille", frequence: "une fois", description: "Premier spawt en mode Rapide < 3 min — le hook d'activation" },
    { nom: "Le Weekly Digest", frequence: "hebdomadaire (jeudi 17h)", description: "3 trouvailles de la Meute via WhatsApp Community, 100 % UGC" },
    { nom: "La montée de stade / la mue", frequence: "selon comportement", description: "Nouveau titre ajouté à la collection + écran de célébration (montée) ou constat neutre du Chat (mue)" },
  ],
  sacredCalendar: {
    quotidien: "Le Chat suggère une trouvaille contextuelle (heure, météo, dispo)",
    hebdomadaire: "Weekly Digest jeudi 17h sur WhatsApp Community",
    mensuel: "Renouvellement des Coups de Cœur (indexé maturité) + bilan d'exploration",
    annuel: "SPAWT Wrapped (bilan personnalisé) + Foodie Games (défi collectif de mai) + Black Spawtday",
  },
  aarrr: {
    acquisition: "Quiz Palais viral + manifeste vidéo + micro-créateurs food (UTM) + waitlist",
    activation: "Quiz → archétype révélé ; première trouvaille en mode Rapide < 72h",
    retention: "Weekly Digest WhatsApp + le Chat conciergerie (< 15 min S1-S2) + push contextuelles + progression titres/badges",
    revenue: "Conversion Spawter Gold (paywall géo) + upgrade lieux Libre → Pro → Gold",
    referral: "Referral Spawter Gold (3 amis = badge Gold 30j), partage carte archétype, badge Ambassadeur des lieux",
  },
  kpis: [
    { name: "Complétion du quiz Palais", metricType: "pourcentage", target: "≥ 60 %", frequency: "hebdomadaire" },
    { name: "Activation (1ʳᵉ décision < 72h)", metricType: "pourcentage", target: "≥ 50 %", frequency: "hebdomadaire" },
    { name: "Rétention J7", metricType: "pourcentage", target: "≥ 25 %", frequency: "hebdomadaire" },
    { name: "Décisions / semaine (North Star)", metricType: "volume", target: "500 à J90", frequency: "hebdomadaire" },
    { name: "k-factor (viralité)", metricType: "ratio", target: "≥ 0,15", frequency: "hebdomadaire" },
    { name: "Clics sur trouvailles (Digest)", metricType: "pourcentage", target: "≥ 12 % des membres", frequency: "hebdomadaire" },
  ],
  superfanPortrait: {
    personaRef: "Betsy (la Superfan)",
    profile: "Spawter qui sort 3-4×/mois à travers Abidjan, affiche fièrement son titre (ex: Bouche d'Or), collectionne les badges et défend ses trouvailles dans son crew.",
    motivations: ["fierté de son archétype et de sa trajectoire", "appartenance à la Meute", "être la référence food de son cercle"],
    barriers: ["temps", "budget mensuel (levé par la valeur d'une sortie réussie)"],
  },
  ladderProductAlignment: [
    { devotionLevel: "Spectateur", productTierRef: "Landing + Quiz (gratuit)", entryAction: "Faire le quiz Palais, découvrir son archétype", upgradeAction: "Opt-in waitlist (email + WhatsApp Community)" },
    { devotionLevel: "Intéressé", productTierRef: "Spawter gratuit (commune)", entryAction: "Installer l'app, première trouvaille en mode Rapide", upgradeAction: "Vouloir sortir de sa commune → Spawter Gold" },
    { devotionLevel: "Participant", productTierRef: "Spawter Gold (B2C)", entryAction: "Déverrouiller tout Abidjan + Palais complet", upgradeAction: "Créer et gérer un crew, monter en stade (Detective)" },
    { devotionLevel: "Engagé", productTierRef: "Djidji / Meneur de Crew", entryAction: "Avis confirmés, Coups de Cœur reçus, crew actif", upgradeAction: "Devenir Ambassadeur / recruter sa Meute" },
    { devotionLevel: "Ambassadeur", productTierRef: "Guide (rare, limité par ville)", entryAction: "Voix de référence de sa zone, invité au Conseil des Experts", upgradeAction: "Co-création de contenu, mentorat des Touristes" },
    { devotionLevel: "Évangéliste", productTierRef: "Programme Ambassadeur / Allié", entryAction: "Recruter et faire grandir la Meute de son quartier", upgradeAction: "Rôle d'Allié SPAWT (gestion de fiches Pro de quartier)" },
  ],
  conversionTriggers: [
    { fromLevel: "Spectateur", toLevel: "Intéressé", trigger: "Quiz Palais : « C'est exactement moi » → installation" },
    { fromLevel: "Intéressé", toLevel: "Participant", trigger: "Volonté de sortir de sa commune (Betsy/Brice) → paywall géo → Gold" },
    { fromLevel: "Participant", toLevel: "Engagé", trigger: "Première montée de stade + premier Coup de Cœur reçu" },
    { fromLevel: "Engagé", toLevel: "Ambassadeur", trigger: "Titre Djidji/Guide + crew actif → reconnaissance de la colonie" },
    { fromLevel: "Ambassadeur", toLevel: "Évangéliste", trigger: "Recrutement actif de la Meute → statut d'Allié" },
  ],
  programmeEvangelisation: {
    referralProgram: "Referral Spawter Gold : 3 amis installent via ton lien WhatsApp = badge Gold 30 jours. Récompense statutaire (pas monétaire) — conforme au Contrat (« on ne chasse pas pour des points »). Anti-fraude : install + 1ʳᵉ décision requis.",
    brandAdvocacyProgram: "Le Programme Ambassadeur : SPAWT crée des ambassadeurs (spawters dont le profil inspire), pas des influenceurs payés à la performance. Distinction architecturale assumée ; les influenceuses (Vanessa) ont un statut séparé hors Palais (canal d'acquisition).",
    communityRecruitment: "La Meute Abidjan (WhatsApp Community gratuite, admin : le Chat) + le badge Ambassadeur des 20 premiers lieux + les Foodie Games collectifs qui recrutent par le jeu, jamais par le classement.",
  },
  communityBuilding: {
    platforms: ["La Meute Abidjan (WhatsApp Community)", "Crews / Gbonhi (groupes d'amis in-app)", "TikTok / Instagram (trouvailles)", "Conseil des Experts (Djidji/Guide)"],
    moderationRules: ["Pas de leaderboard ni de classement individuel", "Le profil n'est jamais exposé sans consentement", "100 % UGC dans le Digest (zéro promo payée)", "Le dialecte SPAWT fait foi (pas de drift)"],
    growthMechanics: "Flywheel B2C : explorer → enrichir l'ADN des lieux → meilleur matching → satisfaction → progression du titre → attachement → explorer plus. La diversité des explorations (pas le volume) fait grandir l'influence.",
  },
  principesCommunautaires: [
    "On ne chasse pas pour des points — on explore par instinct, on partage par passion",
    "La reconnaissance vient de la tribu, pas d'un compteur",
    "La qualité et la diversité priment sur la quantité brute",
  ],
  taboos: [
    "Afficher un leaderboard ou un classement entre spawters",
    "Exposer le profil d'un spawter sans son consentement",
    "Laisser le paiement changer une note ou un matching (Contrat)",
  ],
  ritesDePassage: [
    { rite: "Le quiz Palais", passage: "visiteur → spawter (archétype provisoire)" },
    { rite: "L'archétype confirmé (15+ spots stables)", passage: "Touriste → Explorateur (premier titre collectionnable)" },
    { rite: "Le Chat entre dans le nom", passage: "Explorateur → Detective (fusion spawter/mascotte)" },
    { rite: "Le titre Guide (limité par ville)", passage: "Djidji → Guide (le chat qui marche devant)" },
  ],
  productExperienceMap: [
    { productRef: "Quiz Palais", experienceDescription: "La révélation : « c'est exactement moi » — je découvre mon archétype et je veux le partager.", touchpointRefs: ["landing", "carte archétype partageable"], emotionalOutcome: "reconnaissance — « enfin une app qui me comprend »" },
    { productRef: "Mode Rapide", experienceDescription: "Le hook : swipe, choisis, vas-y — une trouvaille en moins de 3 minutes, sans fouiller.", touchpointRefs: ["app SPAWT", "le Chat (suggestion)"], emotionalOutcome: "soulagement — fin du goumin et de la charge mentale" },
    { productRef: "La collection de titres", experienceDescription: "La trajectoire : mes titres s'accumulent, je choisis lequel afficher, je vois qui je deviens.", touchpointRefs: ["profil spawter", "écran de célébration"], emotionalOutcome: "fierté — une identité culinaire qui se montre" },
    { productRef: "Le Weekly Digest", experienceDescription: "Le rituel : chaque jeudi, 3 trouvailles de la Meute qui me donnent envie de sortir.", touchpointRefs: ["WhatsApp Community", "liens trackés"], emotionalOutcome: "appartenance — je fais partie d'une tribu qui explore" },
  ],
  barriersEngagement: [
    { level: "Spectateur→Intéressé", barrier: "Scepticisme « encore une app de restos »", mitigation: "Quiz Palais gratuit et engageant + carte archétype virale + manifeste à la voix du Chat" },
    { level: "Intéressé→Participant", barrier: "App vide au lancement (pas d'inventaire)", mitigation: "B2B dès J1 : 20 lieux actifs et instrumentés avant le premier FCFA de paid" },
    { level: "Participant→Engagé", barrier: "Churn J1-J7", mitigation: "Le Chat en conciergerie WhatsApp < 15 min (S1-S2) + onboarding 3 écrans + push contextuelles max 1/jour + interviews churn" },
    { level: "Engagé→Ambassadeur", barrier: "Pourquoi rester sans points ni classement ?", mitigation: "Progression identitaire (titres permanents, mue, badges) + reconnaissance de la colonie + Coups de Cœur" },
  ],
  gamification: {
    niveaux: ["Touriste 🐱 (0-10 spots)", "Explorateur 🐈 (11-20)", "Detective 🐈‍⬛ (21-30, le Chat entre dans le nom)", "Djidji ✦ (31-50)", "Guide ◉ (50+, rare et limité par ville)"],
    recompenses: ["titre collectionnable à chaque montée de stade (permanent)", "badges Exploration / Expertise / Influence (jusqu'à 3 affichés)", "Coups de Cœur indexés sur la maturité (1→3/mois + bonus premium)", "badge Ambassadeur / Pionnier de [Commune]", "SPAWT Wrapped annuel"],
  },
  commandments: [
    { commandment: "Tu n'afficheras pas de classement", justification: "Le Contrat interdit le leaderboard : la compétition entre spawters trahit l'esprit « on explore par instinct, on partage par passion »." },
    { commandment: "Tu n'exposeras aucun profil sans consentement", justification: "Le profil appartient au spawter ; la confiance est la condition de la donnée." },
    { commandment: "Tu ne laisseras pas l'argent changer une note", justification: "Payer donne de la voix et de la data, jamais un meilleur rang — sinon la réputation organique s'effondre." },
    { commandment: "Tu récompenseras la diversité, pas le volume", justification: "L'influence se gagne en explorant large et en avisant juste, pas en accumulant des check-ins." },
  ],
  sacraments: [
    { nomSacre: "Le quiz Palais", trigger: "Onboarding lancé", action: "5 questions → calibrage des 5 axes → archétype révélé", reward: "« C'est exactement moi » + carte partageable", kpi: "complétion quiz ≥ 60 %", aarrStage: "Activation" },
    { nomSacre: "La première trouvaille", trigger: "App installée", action: "Premier spawt en mode Rapide", reward: "Le hook : une bonne adresse en < 3 min", kpi: "activation < 72h ≥ 50 %", aarrStage: "Activation" },
    { nomSacre: "Le Coup de Cœur reçu", trigger: "Un avis influent confirmé par la Meute", action: "Réception d'un Coup de Cœur (vote social rare)", reward: "Reconnaissance par la colonie", kpi: "badge Aimant (5 Coups de Cœur)", aarrStage: "Referral" },
    { nomSacre: "La montée de stade", trigger: "Seuil de spots franchi", action: "Nouveau titre + écran de célébration + partage", reward: "« Tu passes Detective. Chat Fantôme. »", kpi: "rétention par cohorte de stade", aarrStage: "Retention" },
  ],
  clergeStructure: {
    communityManager: "Les Allies SPAWT (community managers terrain) — animent les quartiers, onboardent les lieux, gèrent les fiches Pro et la Meute locale.",
    ambassadeurs: "Les spawters Djidji/Guide consentants — preuves vivantes, voix de référence de leur zone, membres du Conseil des Experts.",
    supportTeam: "Le Chat en conciergerie (réponse humaine < 15 min S1-S2, fondateurs) + relances contextuelles J1/J3/J7.",
    specialists: "Les Djidji confirmés dont les avis pondèrent la réputation (badge Œil de Braise, Calibré).",
  },
  pelerinages: [
    { name: "Les Foodie Games", frequency: "annuel (mai)", location: "Abidjan (toute la ville)", expectedAttendance: 1000, devotionLevelTarget: "Participant+", entryRitual: "Défi COLLECTIF (« la tribu a spawté 500 lieux ») — jamais un leaderboard individuel (Contrat)." },
    { name: "Black Spawtday", frequency: "annuel", location: "App + lieux partenaires", expectedAttendance: 2000, devotionLevelTarget: "Intéressé+", entryRitual: "Événement communautaire de découverte (pas un Cyber Monday) : trouvailles et bons plans de la Meute." },
  ],
} as const;

// ── PILIER R — RISK (contrat COMPLETE : 11 exigences) ──────────────────

export const PILLAR_R = {
  riskScore: 55,
  globalSwot: {
    strengths: ["Data communautaire propriétaire (le Palais)", "Identité de marque et dialecte forts", "Ancrage local (nouchi, maquis, food de rue)", "GTM 90 jours discipliné avec gates de décision"],
    weaknesses: ["Pré-lancement : zéro inventaire et zéro Meute au départ (cold start)", "Dépendance au build Android", "Équipe core réduite", "Valeur conditionnée à la masse critique"],
    opportunities: ["15 000+ lieux non structurés à Abidjan", ">50 % de pénétration smartphone sur la cible", "Culture de recommandation orale qui ne scale pas (à industrialiser)", "Aucun acteur digital local intelligent"],
    threats: ["CPM Meta/TikTok volatils (±40 %)", "Churn J1-J7", "Coût caché WhatsApp API au scale", "Entrée d'un acteur international localisé"],
  },
  probabilityImpactMatrix: [
    { id: "risk-spawt-001", risk: "App lancée sans inventaire (cold start B2C)", probability: "HIGH", impact: "HIGH", severity: "CRITICAL", category: "PRODUIT", mitigation: "B2B dès J1 (A4) : 20 lieux actifs et instrumentés avant le premier FCFA de paid (A7).", status: "MITIGATED" },
    { id: "risk-spawt-002", risk: "Churn massif J1-J7", probability: "HIGH", impact: "HIGH", severity: "CRITICAL", category: "PRODUIT", mitigation: "Le Chat en conciergerie < 15 min (S1-S2), gel du paid, onboarding 3 écrans, 20 interviews churn/mois.", status: "MITIGATING" },
    { id: "risk-spawt-003", risk: "CPM Meta/TikTok volatils (±40 %)", probability: "MEDIUM", impact: "MEDIUM", severity: "HIGH", category: "ECONOMIQUE", mitigation: "60 %+ de l'acquisition organique/referral ; kill rule hebdo sur toute créa > 200 F de CPA.", status: "MITIGATED" },
    { id: "risk-spawt-004", risk: "Coût caché WhatsApp API au scale (~270K/mois)", probability: "MEDIUM", impact: "MEDIUM", severity: "MEDIUM", category: "ECONOMIQUE", mitigation: "Digest sur WhatsApp Communities (0 F) ; API plafonnée au transactionnel (30K budgétés).", status: "MITIGATED" },
    { id: "risk-spawt-005", risk: "Conversion pilote B2B → payant < 40 %", probability: "MEDIUM", impact: "HIGH", severity: "HIGH", category: "ECONOMIQUE", mitigation: "Rapport ROI gratuit dès M4 : la valeur (scans, vues, clics itinéraire) est prouvée avant d'être facturée.", status: "MITIGATING" },
  ],
  mitigationPriorities: [
    { action: "Constituer 20 lieux actifs instrumentés avant tout paid (terrain Alliés vague 1)", owner: "Alliés SPAWT", timeline: "J1-J30", investment: "110K FCFA (transport + kit QR ×20)" },
    { action: "Industrialiser l'activation J1-J7 (Chat conciergerie + onboarding + interviews churn)", owner: "Fondateurs", timeline: "J31-J60", investment: "Temps fondateur (conciergerie S1-S2)" },
    { action: "Tenir la discipline d'achat paid (Gate 1 validé + kill rule hebdo CPA ≤ 200 F)", owner: "Growth", timeline: "J31-J60", investment: "190K FCFA (paid + buffer)" },
  ],
  pillarGaps: {
    a: "Réputation à construire ex nihilo (pré-lancement) — l'authenticité fondatrice doit se traduire en preuve communautaire dès la waitlist.",
    d: "ESOV à instrumenter dès le lancement (aujourd'hui zéro présence mesurée).",
    v: "ROI proofs B2B à produire en réel (rapport ROI gratuit M4) avant de facturer Pro/Gold.",
    e: "La Meute n'existe pas encore — tout l'engagement dépend de l'atteinte de la masse critique (Gate Scale J60).",
  },
  overtonBlockers: [
    { risk: "Perception « encore une app de restos / un TripAdvisor local »", blockingPerception: "Le marché assimile SPAWT à un catalogue d'avis anonymes", mitigation: "Marteler l'identitaire et le personnalisé (le Palais) + le local (dialecte, pépites) dès la landing", devotionLevelBlocked: "INTERESSE" },
  ],
  coherenceRisks: [
    { pillar1: "V", pillar2: "E", field1: "freeLayer", field2: "communityBuilding", contradiction: "Si la couche gratuite (commune 3 km) est trop riche, le déclencheur de conversion premium (sortir de sa commune) perd sa force pour les sédentaires.", severity: "MEDIUM" },
    { pillar1: "A", pillar2: "V", field1: "doctrine (payer ≠ ranker)", field2: "Spawt Gold (visibilité contextuelle)", contradiction: "La visibilité sponsorisée « Pour Toi Aujourd'hui » doit rester un marqueur discret sans altérer le matching, sous peine de violer le Contrat.", severity: "MEDIUM" },
  ],
  devotionVulnerabilities: [
    { level: "Intéressé", churnCause: "Première trouvaille décevante ou app vide dans sa commune", mitigation: "20 lieux instrumentés par zone avant le paid + le Chat conciergerie qui rattrape la déception." },
    { level: "Participant", churnCause: "Pas de raison de payer (sédentaire) ou abonnement perçu comme accessoire", mitigation: "SPAWT Wrapped, Palais complet, crews illimités + bonus Coup de Cœur — la valeur identitaire au-delà de la géo." },
  ],
  microSWOTs: {
    funnel: { strengths: ["quiz Palais viral à coût marginal nul", "double opt-in email + WhatsApp"], weaknesses: ["dépendance au CPL paid si l'organique plafonne"], opportunities: ["lookalike sur les leads quiz"], threats: ["CPL > 200 F qui casse l'unit economics"] },
    produit: { strengths: ["3 modes contextuels", "matching instinctif différenciant"], weaknesses: ["iOS reporté (Android-first)", "cold start data"], opportunities: ["cartes collectibles virales"], threats: ["complexité perçue du système Palais par les non-foodies"] },
  },
} as const;

// ── PILIER T — TRACK (contrat COMPLETE : 18 exigences) ─────────────────

export const PILLAR_T = {
  brandMarketFitScore: 70,
  lastMarketDataRefresh: "2026-03-13T00:00:00.000Z",
  sectorKnowledgeReused: false,
  triangulation: {
    customerInterviews: "L'Excel fondateur de 47 spots est devenu le document le plus demandé du cercle de Stéphanie — preuve d'un besoin réel et répété. Mission 1 : 13 établissements visités, retours qualitatifs sur l'accueil et l'appétit B2B.",
    competitiveAnalysis: "Aucun acteur digital local ne structure intelligemment l'offre culinaire d'Abidjan : Google Maps/TripAdvisor sont impersonnels et universels, le bouche-à-oreille ne scale pas. La catégorie « compagnon de découverte communautaire personnalisé » est vide.",
    trendAnalysis: ">50 % de pénétration smartphone (~80 % sur la cible 18-40), classe moyenne en expansion, scène culinaire en explosion (maquis → gastronomie → brunchs Instagram), mobile money dominant pour les paiements.",
    financialBenchmarks: "Apps lifestyle : rétention D7 usuelle 15-25 %. CPI Android Afrique de l'Ouest : 150-350 F. CPL paid ≤ 200 F réaliste (vs 25 F fantaisiste de la v1). Aucune offre B2B restaurant data-driven comparable localement.",
  },
  hypothesisValidation: [
    { id: "hyp-spawt-001", hypothesis: "Les foodies d'Abidjan veulent une reco personnalisée, pas un classement", validationMethod: "Quiz Palais + waitlist (Gate 1 J21)", status: "TESTING", evidence: "Demande répétée pour l'Excel fondateur ; waitlist à valider (cible 1 500 leads J30, ≥ 800 à J21)" },
    { id: "hyp-spawt-002", hypothesis: "Les lieux paient pour la voix (Pro) puis la data (Gold)", validationMethod: "Terrain B2B + pilotes Spawt Libre → Pro (M7)", status: "TESTING", evidence: "Mission 1 : 8 contacts B2B initiés, 2 lieux très intéressés (Texas Grillz multi-établissements, Kaiten)" },
    { id: "hyp-spawt-003", hypothesis: "Le premium géographique convertit les mangeurs qui traversent Abidjan", validationMethod: "Cohorte Spawter Gold post-lancement", status: "UNTESTED", evidence: "Personas Betsy/Brice identifiés ; conversion à mesurer post-launch" },
  ],
  tamSamSom: {
    tam: { value: 3000000, description: "Mangeurs urbains connectés du Grand Abidjan (6M hab., >50 % smartphone)" },
    sam: { value: 600000, description: "Foodies 18-40 ans smartphone-first, classe moyenne, sortant régulièrement" },
    som: { value: 9172, description: "Cible MAU M12 en mode Scale (4 000 en Lean) — capture lean puis croissance" },
  },
  riskValidation: [
    { riskId: "risk-spawt-001", riskRef: "Cold start sans inventaire", marketEvidence: "Mission 1 prouve qu'on peut onboarder des lieux manuellement (10 fiches complètes en 6 jours) — le B2B-first est exécutable.", status: "MITIGATING", source: "Rapport Mission 1 Abidjan" },
    { riskId: "risk-spawt-005", riskRef: "Conversion B2B < 40 %", marketEvidence: "Réceptivité B2B mesurée : « Très intéressé » (Texas Grillz), « Curieux » (Sam's, The Rooph, Kaiten, Madame Antika).", status: "MITIGATING", source: "Rapport Mission 1 (notes B2B par établissement)" },
  ],
  overtonPosition: {
    currentPerception: "Une app de restos parmi d'autres / un TripAdvisor local",
    marketSegments: ["foodies 18-40 Abidjan", "restaurateurs peu digitalisés", "restaurateurs établis cherchant du trafic qualifié"],
    measurementMethod: "Verbatims terrain (Mission 1) + futurs verbatims waitlist + veille sociale food Abidjan",
    measuredAt: "2026-03-13",
    confidence: 0.6,
  },
  perceptionGap: {
    currentPerception: "Un catalogue/annuaire de restaurants",
    targetPerception: "Le compagnon qui comprend mon goût — le réflexe pour savoir où mon palais veut aller",
    gapDescription: "Passer de l'annuaire utilitaire à l'identité personnelle : la bascule se joue sur l'aha moment du quiz Palais et la qualité du matching.",
    gapScore: 6,
  },
  traction: {
    loisSignees: 0,
    utilisateursInscrits: 0,
    utilisateursActifs: 0,
    croissanceHebdo: 0,
    revenusRecurrents: 0,
    metriqueCle: "Décisions / semaine (North Star) — pré-lancement, cible 500/sem à J90",
    preuvesTraction: ["Excel fondateur : document le plus demandé du cercle", "Mission 1 : 13 établissements, 10 fiches, 8 contacts B2B, 2 pépites", "GTM 90 jours financé (1M FCFA)"],
    tractionScore: 2,
  },
  marketReality: {
    macroTrends: ["Pénétration smartphone >50 % en hausse", "Classe moyenne abidjanaise en expansion", "Scène culinaire en explosion", "Mobile money dominant"],
    weakSignals: ["Saturation des groupes WhatsApp de recommandation (47 messages pour un choix)", "Maquis non-digitalisés cherchant de la visibilité", "Lassitude des classements anonymes"],
  },
  weakSignalAnalysis: [
    { id: "ws-spawt-001", thesis: "Le bouche-à-oreille sature et crée une fenêtre pour son industrialisation", rawEvent: "47 messages WhatsApp et 3h de débat pour choisir un lieu d'anniversaire (récit fondateur récurrent)", causalChain: [{ from: "offre massive non filtrée", to: "fatigue du choix" }, { from: "fatigue du choix", to: "demande d'un filtre personnel" }], impactCategory: "OPPORTUNITY", brandImpact: "Le Palais devient le filtre que WhatsApp ne peut pas offrir", confidence: 0.7, urgency: "HIGH", relatedPillars: ["A", "D"], supportingSignals: ["Excel fondateur viral", "groupes WhatsApp débordés"], recommendedAction: "Positionner le quiz Palais comme l'anti-WhatsApp : ton filtre personnel en 5 questions" },
  ],
  competitorOvertonPositions: [
    { competitorName: "Google Maps (restauration)", overtonPosition: "Le statu quo : la note moyenne anonyme comme seul juge", relativeToUs: "Nous déplaçons la norme vers la reco personnalisée et l'avis pondéré par la crédibilité" },
  ],
  marketDataSources: [
    { sourceType: "FIELD", title: "Rapport Mission 1 — Reconnaissance terrain Abidjan", collectedAt: "2026-03-13T00:00:00.000Z", reliability: 0.8 },
    { sourceType: "FOUNDER", title: "Excel fondateur (47 spots testés, 2020-2021)", collectedAt: "2021-01-01T00:00:00.000Z", reliability: 0.7 },
  ],
} as const;

// ── PILIER I — INNOVATION (contrat COMPLETE : 17 exigences) ────────────

export const PILLAR_I = {
  totalActions: 13,
  // Budgets RÉELS FCFA (GTM v3, slides 3 & 5-16). Ventilé par action = 705 000 F
  // (A1 90k · A2 40k · A3 150k · A4 110k · A5 15k · A7 190k · A10 110k ;
  // A6/A8/A9/A11/A12/A13 = 0 F coût direct, canaux possédés). Socle transverse
  // 295 000 F (data/appels, juridique, WhatsApp API, imprévus) → hors actions,
  // porté par V.budgetCom. Total trésorerie 90 j = 1 000 000 F.
  catalogueParCanal: {
    DIGITAL: [
      { id: "A1", action: "Landing + Quiz Palais + CRM Brevo 90 j", format: "landing + quiz viral", objectif: "1 500 leads waitlist", status: "SELECTED_FOR_ROADMAP", timeframe: "SPRINT_90", budgetEstime: "LOW", budget: 90000, pilierImpact: "E" },
      { id: "A2", action: "Manifeste vidéo (voix du Chat) + test paid Meta", format: "vidéo + lead-gen", objectif: "Message-market fit (CPL ≤ 200 F)", status: "SELECTED_FOR_ROADMAP", timeframe: "SPRINT_90", budgetEstime: "LOW", budget: 40000, pilierImpact: "D" },
      { id: "A5", action: "ASO & Google Play (Android-first)", format: "store optimization", objectif: "App live ≤ J30, 10 mots-clés indexés", status: "SELECTED_FOR_ROADMAP", timeframe: "SPRINT_90", budgetEstime: "LOW", budget: 15000, pilierImpact: "V" },
      { id: "A7", action: "Paid UGC TikTok/Meta + buffer perf (discipline d'achat)", format: "créas UGC natives", objectif: "≥ 1 100 installs paid, CPA ≤ 200 F", status: "SELECTED_FOR_ROADMAP", timeframe: "PHASE_1", budgetEstime: "MEDIUM", budget: 190000, pilierImpact: "E" },
      { id: "A12", action: "Instrumentation & North Star (décisions/sem)", format: "tracking", objectif: "100 % UTM, tracking live J1", status: "SELECTED_FOR_ROADMAP", timeframe: "SPRINT_90", budgetEstime: "LOW", budget: 0, pilierImpact: "T" },
    ],
    SOCIAL: [
      { id: "A3", action: "Micro-créateurs food ×15 (frais de repas)", format: "UGC troc cadré", objectif: "45 contenus, ≥ 600 leads UTM", status: "SELECTED_FOR_ROADMAP", timeframe: "SPRINT_90", budgetEstime: "LOW", budget: 150000, pilierImpact: "A" },
      { id: "A8", action: "Referral Spawter Gold (k-factor mesuré)", format: "parrainage statutaire", objectif: "k ≥ 0,15, 15 % installs referral", status: "SELECTED_FOR_ROADMAP", timeframe: "PHASE_1", budgetEstime: "LOW", budget: 0, pilierImpact: "E" },
    ],
    EVENT: [
      { id: "A-FG", action: "Foodie Games (défi collectif de mai)", format: "événement communautaire", objectif: "Engagement + viralité (jamais leaderboard)", status: "RECOMMENDED", timeframe: "PHASE_2", budgetEstime: "MEDIUM", budget: 0, pilierImpact: "E" },
      { id: "A-BS", action: "Black Spawtday (événement de découverte)", format: "événement communautaire", objectif: "Activation saisonnière", status: "RECOMMENDED", timeframe: "PHASE_2", budgetEstime: "MEDIUM", budget: 0, pilierImpact: "E" },
    ],
    PARTENARIAT: [
      { id: "A4", action: "Terrain B2B vague 1 — transport + kit QR ×20 (20 lieux avant le paid)", format: "onboarding terrain", objectif: "20 lieux actifs instrumentés J30", status: "SELECTED_FOR_ROADMAP", timeframe: "SPRINT_90", budgetEstime: "LOW", budget: 110000, pilierImpact: "V" },
      { id: "A10", action: "Terrain B2B vague 2 — transport + kit QR ×20 (suivre la demande)", format: "onboarding terrain", objectif: "40 lieux actifs J60, 15 pilotes", status: "SELECTED_FOR_ROADMAP", timeframe: "PHASE_1", budgetEstime: "LOW", budget: 110000, pilierImpact: "V" },
      { id: "A13", action: "Monétisation B2B (Libre → Pro → Gold)", format: "ramp commerciale", objectif: "7 lieux payants M12, ~800K Y1", status: "RECOMMENDED", timeframe: "PHASE_2", budgetEstime: "LOW", budget: 0, pilierImpact: "V" },
    ],
    RP: [
      { id: "A11", action: "Weekly Digest WhatsApp Communities (0 F — canal possédé)", format: "newsletter native", objectif: "≥ 12 % clics, +10 % WAU jeudi", status: "SELECTED_FOR_ROADMAP", timeframe: "PHASE_1", budgetEstime: "LOW", budget: 0, pilierImpact: "E" },
    ],
  },
  assetsProduisibles: [
    { asset: "Carte archétype partageable (résultat quiz)", type: "SOCIAL", usage: "Acquisition virale" },
    { asset: "Manifeste vidéo (voix du Chat)", type: "VIDEO", usage: "Message-market fit + paid" },
    { asset: "Cartes collectibles (Profil/Lieu/Plat)", type: "SOCIAL", usage: "Viralité et engagement visuel" },
    { asset: "Weekly Digest (3 trouvailles)", type: "ÉDITORIAL", usage: "Rétention hebdomadaire" },
    { asset: "Rapport ROI gratuit (lieux)", type: "PREUVE", usage: "Conversion B2B Libre → Pro" },
  ],
  activationsPossibles: [
    { activation: "Kit « Spawté ici » (QR table + chevalet) dans les lieux", canal: "PARTENARIAT", cible: "Clients des lieux partenaires", budgetEstime: "MEDIUM" },
    { activation: "Diagnostic Palais en live lors d'événements food", canal: "EVENT", cible: "Foodies prospects", budgetEstime: "LOW" },
    { activation: "Deal visibilité avec influenceuses (Ambassadrices, statut séparé)", canal: "SOCIAL", cible: "Audiences food Instagram/TikTok", budgetEstime: "LOW" },
  ],
  formatsDisponibles: ["quiz interactif", "carte archétype", "manifeste vidéo court", "UGC créateurs", "Weekly Digest WhatsApp", "cartes collectibles", "kit QR physique"],
  brandPlatform: {
    name: "SPAWT",
    benefit: "Le bon lieu, au bon moment, pour toi — sans fouiller, sans te tromper",
    target: "Foodies d'Abidjan 18-40 et restaurateurs",
    competitiveAdvantage: "Le seul compagnon qui comprend ton Palais et s'appuie sur l'intelligence de la Meute",
    emotionalBenefit: "Plus jamais le goumin + la fierté d'une identité culinaire qui se construit",
    functionalBenefit: "Reco personnalisée en < 3 min (mode Rapide), avis crédibles, pépites cachées",
    supportedBy: ["le système Palais", "la Meute", "le Chat", "l'ADN de lieu auto-calculé"],
  },
  actionsByDevotionLevel: {
    SPECTATEUR: ["Faire le quiz Palais", "Découvrir son archétype partageable"],
    INTERESSE: ["Installer l'app", "Faire sa première trouvaille (mode Rapide)"],
    PARTICIPANT: ["Passer Spawter Gold", "Créer un crew", "Aviser des lieux"],
    ENGAGE: ["Monter en stade (Detective)", "Recevoir des Coups de Cœur", "Animer un crew"],
    AMBASSADEUR: ["Devenir voix de référence de sa zone", "Recruter sa Meute"],
    EVANGELISTE: ["Devenir Allié SPAWT", "Gérer les fiches Pro de son quartier"],
  },
  riskMitigationActions: [
    { action: "Terrain B2B vague 1 (20 lieux avant le paid)", riskId: "risk-spawt-001", riskRef: "Cold start sans inventaire", canal: "PARTENARIAT", expectedImpact: "Garantit un inventaire minimum avant toute acquisition payante" },
    { action: "Le Chat en conciergerie + interviews churn", riskId: "risk-spawt-002", riskRef: "Churn J1-J7", canal: "DIGITAL", expectedImpact: "Rattrape les déceptions précoces et nourrit les insights produit" },
  ],
  innovationsProduit: [
    { name: "Le Palais (profil gustatif instinctif)", type: "PRODUIT", description: "5 axes calibrés sans formulaire sur le comportement réel → 13 archétypes", feasibility: "CORE", horizon: "H1", devotionImpact: "Le cœur de l'identité spawter — raison de rester" },
    { name: "Matching instinctif 3 modes", type: "UX", description: "Rapide / Crew / Explore — l'app s'adapte au contexte au lieu d'un catalogue statique", feasibility: "HIGH", horizon: "H1", devotionImpact: "Réduit la charge mentale du choix (activation)" },
    { name: "Cartes collectibles", type: "GROWTH", description: "Profil Spawter / Fiche Lieu / Plat Emblématique — viralité visuelle partageable", feasibility: "MEDIUM", horizon: "H2", devotionImpact: "Moteur d'évangélisation organique" },
    { name: "Insights Gold (data Palais agrégée)", type: "REVENUE", description: "Vendre aux lieux la compréhension de leur clientèle vs leur zone", feasibility: "GATED_MEUTE", horizon: "H2", devotionImpact: "Le moteur de revenu B2B — dépend de la masse de data" },
  ],
  actionsByOvertonPhase: [
    { phase: "Révéler", actions: ["Quiz Palais viral", "Manifeste à la voix du Chat"] },
    { phase: "Prouver", actions: ["Trouvailles créateurs (UGC)", "Weekly Digest 100 % Meute"] },
    { phase: "Normaliser", actions: ["Cartes collectibles", "Foodie Games collectifs"] },
  ],
  hypothesisTestActions: [
    { testAction: "A/B sur le manifeste (3 variantes) puis scaling de la gagnante", hypothesisId: "hyp-spawt-001", hypothesisRef: "Reco personnalisée > classement", expectedOutcome: "CPL paid ≤ 200 F sur la variante gagnante", cost: "40K FCFA (A2)" },
    { testAction: "Pilotes Spawt Libre → Pro avec rapport ROI gratuit (M7)", hypothesisId: "hyp-spawt-002", hypothesisRef: "Les lieux paient pour voix puis data", expectedOutcome: "Conversion pilote → payant ≥ 40 %", cost: "Temps Alliés (déjà budgété)" },
  ],
  copyStrategy: {
    promise: "Plus jamais le goumin d'un mauvais restau.",
    rtb: "Le Palais comprend ton goût ; la Meute calibre la réputation des lieux ; le Chat te guide.",
    tonOfVoice: "Complice, curieux, jamais condescendant — le Chat murmure, il ne crie pas.",
    keyMessages: ["On ne te dit pas quoi manger. On te dit où ton palais veut aller.", "On ne chasse pas pour des points. On explore par instinct.", "La carte du bon goût"],
    doNot: ["promettre LE meilleur resto absolu", "afficher des classements", "parler comme un annuaire (« restaurant noté 4.2 »)"],
  },
  bigIdea: {
    concept: "Le compagnon qui comprend ton Palais",
    mechanism: "Le profil gustatif instinctif + le matching contextuel transforment « chercher un restau » en « se découvrir » — l'identité comme moteur de rétention.",
    insight: "Le mangeur d'Abidjan n'a pas un problème d'offre (15 000 lieux), il a un problème de filtre — et aucun filtre ne le comprend, lui.",
    adaptations: ["B2C foodies : le quiz Palais", "lieux : la réputation organique + la data", "fêtards : le partage social gratuit dans sa commune"],
  },
  potentielBudget: { production: 250000, media: 400000, talent: 240000, logistics: 220000, technology: 90000, total: 1200000 },
  mediaPlan: {
    totalBudget: 400000,
    channels: [
      { channel: "Paid UGC TikTok/Meta", budget: 190000, objective: "Installs (CPA ≤ 200 F)" },
      { channel: "Test paid Meta (lead-gen quiz)", budget: 40000, objective: "Message-market fit (CPL ≤ 200 F)" },
      { channel: "Micro-créateurs food ×15 (troc repas)", budget: 150000, objective: "45 contenus + leads UTM" },
      { channel: "ASO Google Play", budget: 20000, objective: "Distribution organique" },
    ],
  },
  generationMeta: { gloryToolsUsed: ["canon-operateur"], qualityScore: 8, generatedAt: "2026-06-13T00:00:00.000Z" },
} as const;

// ── PILIER S — STRATEGY (contrat COMPLETE : 20 exigences) ──────────────

export const PILLAR_S = {
  visionStrategique:
    "Faire de SPAWT le réflexe de découverte culinaire d'Abidjan — le compagnon qui comprend le Palais de chaque mangeur — puis exporter le design à Douala, Dakar, Lagos, Accra une fois le PMF prouvé (jamais avant le mois 12).",
  globalBudget: "1 000 000 FCFA (trésorerie GTM 90 jours, ventilée à 100 % action par action — zéro double compte)",
  fenetreOverton: {
    perceptionActuelle: "Une app de restos / un TripAdvisor local de plus",
    perceptionCible: "Le compagnon qui comprend mon goût — le réflexe pour savoir où mon palais veut aller",
    ecart: "Passer de l'annuaire utilitaire à l'identité personnelle ; la bascule se joue sur l'aha moment du quiz et la qualité du matching",
    strategieDeplacement: [
      { etape: "Révéler", action: "Le quiz Palais comme porte d'entrée : « c'est exactement moi »" },
      { etape: "Prouver", action: "Des trouvailles réelles (mode Rapide) et un Digest 100 % Meute qui livrent la promesse" },
      { etape: "Normaliser", action: "Le dialecte SPAWT (« je vais spawter ») et les cartes collectibles dans la culture food d'Abidjan" },
    ],
  },
  axesStrategiques: [
    { axe: "Construire la Meute et l'inventaire avant le paid", pillarsLinked: ["A", "E"], kpis: ["1 500 leads J30 (≥ 800 à J21)", "20 lieux actifs J30", "45 contenus créateurs"] },
    { axe: "Lancer & prouver l'unit economics", pillarsLinked: ["V", "T"], kpis: ["CPA ≤ 200 F", "rétention J7 ≥ 25 %", "k-factor ≥ 0,15", "40 lieux J60"] },
    { axe: "Retenir & décider sur données (Gate Scale)", pillarsLinked: ["E", "T"], kpis: ["MAU ≥ 1 100 J90", "500 décisions/sem", "GO/NO-GO Scale objectivé"] },
  ],
  sprint90Days: [
    { action: "Landing + Quiz Palais live en 48h, CRM Brevo connecté", kpi: "1 500 leads waitlist J30", priority: 1, owner: "Fondateurs", isRiskMitigation: false, devotionImpact: "SPECTATEUR", sourceRef: "A1", sourceInitiativeId: "A1" },
    { action: "Terrain B2B vague 1 : 20 lieux actifs instrumentés avant tout paid", kpi: "20 lieux actifs J30", priority: 2, owner: "Alliés SPAWT", isRiskMitigation: true, devotionImpact: "ENGAGE", sourceRef: "A4", sourceInitiativeId: "A4" },
    { action: "App Android live sur le Play Store", kpi: "App live ≤ J30", priority: 3, owner: "Produit", isRiskMitigation: false, devotionImpact: "INTERESSE", sourceRef: "A5", sourceInitiativeId: "A5" },
    { action: "Casting 15 micro-créateurs food (45 contenus)", kpi: "≥ 600 leads UTM", priority: 4, owner: "Growth", isRiskMitigation: false, devotionImpact: "INTERESSE", sourceRef: "A3", sourceInitiativeId: "A3" },
    { action: "Instrumentation North Star (décisions/sem) dès J1", kpi: "Tracking live J1, 100 % UTM", priority: 5, owner: "Produit", isRiskMitigation: true, devotionImpact: "PARTICIPANT", sourceRef: "A12", sourceInitiativeId: "A12" },
  ],
  facteursClesSucces: ["L'inventaire B2B prêt avant le paid (jamais de paid sur une app vide)", "L'activation J1-J7 sans friction (le Chat conciergerie)", "La discipline d'achat (Gate 1 + kill rule CPA ≤ 200 F)", "La viralité du quiz et des créateurs (CPL blended ≤ 60 F)"],
  roadmap: [
    { phase: "Phase 1 — Construire (J1-J30)", objectif: "1 500 leads, 20 lieux, app live", objectifDevotion: "1 500 SPECTATEURS (leads)", actions: ["A1 landing+quiz", "A4 terrain B2B v1", "A5 ASO", "A3 créateurs"], budget: 405000, duree: "1 mois" },
    { phase: "Phase 2 — Lancer & prouver (J31-J60)", objectif: "2 400 installs, CPA ≤ 200, J7 ≥ 25 %, 40 lieux", objectifDevotion: "2 400 INTÉRESSÉS, Gate Scale", actions: ["A6 conversion waitlist", "A7 paid UGC", "A8 referral", "A9 onboarding", "A10 terrain B2B v2"], budget: 300000, duree: "1 mois" },
    { phase: "Phase 3 — Retenir & décider (J61-J90)", objectif: "3 200 installs, MAU ≥ 1 100, 500 décisions/sem", objectifDevotion: "1 100 PARTICIPANTS actifs", actions: ["A11 Weekly Digest", "A12 dashboard", "décision Scale"], budget: 0, duree: "1 mois (socle)" },
    { phase: "Phase 4 — Croître & monétiser (M4-M12)", objectif: "MAU 4 000 (Lean) / 9 172 (Scale), 7 lieux payants, ~800K Y1", objectifDevotion: "ENGAGÉS + AMBASSADEURS", actions: ["A13 monétisation B2B", "Foodie Games", "Black Spawtday"], budget: 1500000, duree: "9 mois (Scale conditionnel)" },
  ],
  selectedFromI: [
    { sourceRef: "A1", sourceInitiativeId: "A1", action: "Landing + Quiz Palais", phase: "SPRINT_90", priority: 1 },
    { sourceRef: "A4", sourceInitiativeId: "A4", action: "Terrain B2B vague 1", phase: "SPRINT_90", priority: 2 },
    { sourceRef: "A5", sourceInitiativeId: "A5", action: "ASO & Google Play", phase: "SPRINT_90", priority: 3 },
    { sourceRef: "A3", sourceInitiativeId: "A3", action: "Micro-créateurs food", phase: "SPRINT_90", priority: 4 },
    { sourceRef: "A12", sourceInitiativeId: "A12", action: "Instrumentation North Star", phase: "SPRINT_90", priority: 5 },
  ],
  devotionFunnel: [
    { phase: "J30", spectateurs: 1500, interesses: 0, participants: 0, engages: 0, ambassadeurs: 0, evangelistes: 0 },
    { phase: "J90", spectateurs: 3200, interesses: 3200, participants: 1100, engages: 200, ambassadeurs: 20, evangelistes: 2 },
    { phase: "M12 (Scale)", spectateurs: 20000, interesses: 9172, participants: 4100, engages: 800, ambassadeurs: 60, evangelistes: 10 },
  ],
  overtonMilestones: [
    { phase: "Lancement (J1-J90)", currentPerception: "Une app de restos", targetPerception: "Le compagnon qui comprend mon goût", measurementMethod: "Verbatims waitlist + complétion quiz + rétention J7" },
    { phase: "Croissance (M4-M12)", currentPerception: "App food prometteuse", targetPerception: "Le réflexe food d'Abidjan (« spawter » entré dans le langage)", measurementMethod: "Décisions/sem + part organique + mentions du dialecte" },
  ],
  teamStructure: [
    { name: "Stéphanie Bidje", title: "Fondatrice (Pioneer)", responsibility: "Vision produit, sensibilité culinaire, direction" },
    { name: "UPgraders SARL (Alexandre Djengue)", title: "Direction créative & opérateur de marque", responsibility: "Stratégie de marque, GTM, growth, architecture" },
    { name: "Allies SPAWT", title: "Community managers terrain", responsibility: "Onboarding lieux, gestion fiches Pro, animation Meute quartier" },
  ],
  coherenceScore: 80,
  syntheseExecutive:
    "SPAWT joue une stratégie de découverte communautaire : capture par le quiz Palais viral et la couche gratuite (commune 3 km), activation par l'aha moment (« c'est exactement moi ») et la première trouvaille < 3 min, rétention par la progression identitaire (titres, badges, le Chat) et le Weekly Digest, monétisation par le premium géographique B2C (2 500 FCFA/mois) et les tiers B2B (Libre → Pro 15K → Gold 65K). Le GTM 90 jours (1M FCFA) construit la Meute et l'inventaire avant le paid (B2B-first, jamais de paid sur app vide), prouve l'unit economics (CPA ≤ 200 F, J7 ≥ 25 %, k ≥ 0,15) et décide le Scale sur données au Gate J60. Le revenu Y1 (~800K) est porté par le B2B, indépendant du mode B2C. Le Contrat SPAWT prime : payer ≠ ranker.",
  kpiDashboard: [
    { name: "Leads waitlist", pillar: "E", target: "1 500 à J30", frequency: "hebdomadaire" },
    { name: "CPA paid", pillar: "V", target: "≤ 200 F", frequency: "hebdomadaire" },
    { name: "Rétention J7", pillar: "E", target: "≥ 25 %", frequency: "hebdomadaire" },
    { name: "Décisions / semaine (North Star)", pillar: "S", target: "500 à J90", frequency: "hebdomadaire" },
    { name: "Lieux payants", pillar: "V", target: "7 à M12", frequency: "mensuelle" },
  ],
  northStarKPI: {
    name: "Décisions / semaine (résa, itinéraire lancé ou partage)",
    target: 500,
    currentValue: 0,
    frequency: "hebdomadaire",
  },
  budgetBreakdown: {
    production: 90000,
    media: 230000,
    talent: 150000,
    logistics: 220000,
    technology: 15000,
    contingency: 75000,
    agencyFees: 130000,
  },
  budgetByDevotion: {
    acquisition: 320000,
    conversion: 220000,
    retention: 165000,
    evangelisation: 0,
  },
  rejectedFromI: [
    { sourceRef: "iOS", sourceInitiativeId: "iOS-app", reason: "App iOS reportée à M4+ : iOS minoritaire dans le parc CI, économie de ~65K aujourd'hui — Android-first assumé, révisable sur les analytics réelles." },
  ],
  recommandationsPrioritaires: [
    { recommendation: "Constituer 20 lieux actifs instrumentés AVANT le premier FCFA de paid — jamais de paid sur une app vide.", source: "R (risk-spawt-001 cold start) + T (Mission 1 exécutable)", priority: 1 },
    { recommendation: "Instrumenter le tracking North Star (décisions/sem) dès J1, avant d'écrire le code de l'app — sinon le Gate est invalide par construction.", source: "S (A12) + T (validation des hypothèses)", priority: 2 },
    { recommendation: "Tenir la discipline du Gate Scale J60 : un seul critère manqué = NO-GO, on reste Lean — jamais de Scale forcé par le calendrier.", source: "S (Gate Scale) + R (discipline d'achat)", priority: 3 },
  ],
  // `computed` is PURE-DERIVED from I + R + T by computePillarS() (ADR-0088/0089).
  // Seeded with the deterministic output (totalBudget/budgetByPhase reflect the
  // qualitative budgetEstime → FCFA mapping, not the 1M GTM cash) ; recomputed
  // live by seed-spawt.ts at seed time and on every initiative select/link.
  computed: {
    totalBudget: 705000,
    budgetByPhase: { SPRINT_90: 405000, PHASE_1: 300000 },
    riskCoverage: 0,
    mitigatedRiskIds: [],
    selectedInitiativeCount: 10,
    devotionFunnel: [
      { phase: "Phase 1 — Construire (J1-J30)", spectateurs: 0, interesses: 0, participants: 0, engages: 0, ambassadeurs: 0, evangelistes: 0 },
      { phase: "Phase 2 — Lancer & prouver (J31-J60)", spectateurs: 0, interesses: 0, participants: 0, engages: 0, ambassadeurs: 0, evangelistes: 0 },
      { phase: "Phase 3 — Retenir & décider (J61-J90)", spectateurs: 0, interesses: 0, participants: 0, engages: 0, ambassadeurs: 0, evangelistes: 0 },
      { phase: "Phase 4 — Croître & monétiser (M4-M12)", spectateurs: 0, interesses: 0, participants: 0, engages: 0, ambassadeurs: 0, evangelistes: 0 },
    ],
    overtonPosition: {
      current: "Une app de restos parmi d'autres / un TripAdvisor local",
      target: "Le compagnon qui comprend mon goût — le réflexe pour savoir où mon palais veut aller",
      gapScore: 6,
    },
    coherenceScore: 70,
    roadmapRoutes: [
      { key: "CONSERVATIVE", label: "Conservateur", recommended: false, projectedGrowthPct: 15, targetCultIndex: 66, description: "Statu quo + optimisations marginales.", projectedRevenue: 920000, selected: false, initiativeIds: ["A1", "A2", "A5", "A7", "A12", "A3", "A8", "A4", "A10", "A11"], initiativeCount: 10, totalBudget: 705000, budgetByPhase: { SPRINT_90: 405000, PHASE_1: 300000 }, riskCoverage: 0 },
      { key: "TARGET", label: "Cible", recommended: true, projectedGrowthPct: 42, targetCultIndex: 71, description: "Activation Engagement + cascade R+T.", projectedRevenue: 1136000, selected: true, initiativeIds: ["A1", "A2", "A5", "A7", "A12", "A3", "A8", "A4", "A10", "A11"], initiativeCount: 10, totalBudget: 705000, budgetByPhase: { SPRINT_90: 405000, PHASE_1: 300000 }, riskCoverage: 0 },
      { key: "AMBITIOUS", label: "Ambitieux", recommended: false, projectedGrowthPct: 89, targetCultIndex: 78, description: "Programme superfans + expansion régionale.", projectedRevenue: 1512000, selected: false, initiativeIds: ["A1", "A2", "A5", "A7", "A12", "A3", "A8", "A4", "A10", "A11", "A-FG", "A-BS", "A13"], initiativeCount: 13, totalBudget: 705000, budgetByPhase: { SPRINT_90: 405000, PHASE_1: 300000, PHASE_2: 0 }, riskCoverage: 0 },
    ],
    selectedRouteKey: "TARGET",
    computedAt: "2026-06-13T00:00:00.000Z",
  },
} as const;

export const SPAWT_CANON_PILLARS: ReadonlyArray<{ key: string; content: unknown; confidence: number }> = [
  { key: "a", content: PILLAR_A, confidence: 0.9 },
  { key: "d", content: PILLAR_D, confidence: 0.88 },
  { key: "v", content: PILLAR_V, confidence: 0.88 },
  { key: "e", content: PILLAR_E, confidence: 0.86 },
  { key: "r", content: PILLAR_R, confidence: 0.82 },
  { key: "t", content: PILLAR_T, confidence: 0.78 },
  { key: "i", content: PILLAR_I, confidence: 0.82 },
  { key: "s", content: PILLAR_S, confidence: 0.84 },
];

export const SPAWT_STRATEGY_NAME = "SPAWT — La carte du bon goût";
export const SPAWT_BUSINESS_CONTEXT = {
  sector: "FoodTech / Découverte culinaire communautaire",
  country: "CI",
  businessModel: "MARKETPLACE",
  positioningArchetype: "PREMIUM_ACCESSIBLE",
} as const;
