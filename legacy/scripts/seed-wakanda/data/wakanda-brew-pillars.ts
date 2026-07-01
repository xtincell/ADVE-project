/**
 * WAKANDA BREW — Pillar Content Data (A, D, V partial, E partial)
 * Score: 14/25 per completed pillar — INITIE progression
 * Brasserie artisanale — bieres wakandaises a base de cereales traditionnelles
 */

// ── Pilier A — Authenticite (Identite) ──────────────────────────────────────

export const brewPillarA = {
  archetype: "CREATEUR" as const,
  archetypeSecondary: "EXPLORATEUR" as const,
  citationFondatrice:
    "\"Nos ancetres brassaient avec le sorgho, le millet et la force du soleil wakandais. Wakanda Brew ne reinvente rien — on ressuscite.\" — Ramonda Brewster, fondatrice, 2023.",
  noyauIdentitaire:
    "Wakanda Brew est ne d'un refus : celui de voir la biere africaine reduite a des lagers industrielles sans ame brassees sous licence europeenne. Ramonda Brewster, fille de brasseur traditionnel et diplome en fermentation de l'Universite de Gand, a fusionne les cereales ancestrales wakandaises (sorgho rouge, millet dore, fonio sauvage) avec les techniques de brassage craft modernes. Chaque biere raconte un terroir, un grain, une saison.",

  // Hero's Journey — 3 acts only (4-5 missing = PARTIAL)
  herosJourney: [
    {
      actNumber: 1 as const,
      title: "Les Racines — La Jarre de Grand-Pere",
      narrative:
        "Ramonda grandit dans le village de N'Jadaka, ou son grand-pere Bashenga brasse du dolo de sorgho dans des jarres d'argile centenaires. A 10 ans, elle participe a sa premiere fermentation. Le gout est amer, brut, vivant. A 18 ans, elle part etudier en Belgique et decouvre que le monde entier celebre le craft brewing — sauf l'Afrique. Ses camarades belges brassent avec passion des ales complexes. Pourquoi pas le sorgho wakandais?",
      emotionalArc: "Nostalgie → Decouverte → Indignation creative",
    },
    {
      actNumber: 2 as const,
      title: "L'Apprentissage — Gand, Capitale de la Biere",
      narrative:
        "Ramonda etudie la fermentation et la microbiologie brassicole a Gand pendant 4 ans. Elle travaille dans 3 micro-brasseries belges et apprend chaque etape du brassage artisanal. En parallele, elle experimente secretement avec du sorgho importe du Wakanda dans le labo de l'universite. Sa these porte sur 'la fermentation controlee des cereales africaines pour la biere craft'. Ses professeurs sont sceptiques. Les resultats de degustation les convertissent.",
      emotionalArc: "Etude rigoureuse → Experimentation secrete → Validation scientifique",
      causalLink: "La maitrise technique belge combinee aux cereales wakandaises cree un profil gustatif que personne d'autre ne peut reproduire",
    },
    {
      actNumber: 3 as const,
      title: "La Brasserie — Retour a N'Jadaka",
      narrative:
        "Ramonda revient au Wakanda avec un diplome, des levures selectionnees et une obsession : brasser la premiere biere craft premium wakandaise. Elle installe sa micro-brasserie dans l'ancienne grange de son grand-pere a N'Jadaka. 8 mois de tests. 42 recettes essayees. La Panther Gold — une lager doree au sorgho rouge — est la premiere a satisfaire son palais exigeant. Elle la sert a 30 amis lors d'une soiree improvisee. Les 50 litres disparaissent en 2 heures.",
      emotionalArc: "Determination → Echecs repetes → Euphorie du premier brassin reussi",
      causalLink: "Le terroir wakandais (sorgho rouge, eau minerale de N'Jadaka) cree un gout signature irreproductible en brasserie industrielle",
    },
    // Acts 4-5 MISSING — brand is still in early development
  ],

  ikigai: {
    love: "Wakanda Brew aime l'alchimie entre grain ancestral et technique moderne. Chaque brassin est un acte de creation — transformer du sorgho en or liquide.",
    competence:
      "Maitrise unique de la fermentation controlee des cereales africaines (sorgho, millet, fonio) avec des levures selectionnees en Belgique. Personne au Wakanda ne combine ce double savoir.",
    worldNeed:
      "Le marche de la biere en Afrique est domine par les lagers industrielles sans caractere (Heineken, Castel, SABMiller). Les consommateurs urbains eduques cherchent une alternative locale, craft et premium.",
    remuneration:
      "3 bieres (Panther Gold 1 500 XAF, Vibranium Stout 2 500 XAF, Wakanda Wheat 1 800 XAF) vendues en bars, restaurants et en direct. Marge brute 55-65%. Volume cible Y2 : 50 000 litres/an.",
  },

  valeurs: [
    {
      value: "TRADITION" as const,
      customName: "Heritage Brassicole",
      rank: 1,
      justification:
        "Chaque biere Wakanda Brew utilise au moins une cereale cultivee au Wakanda depuis des generations. Le sorgho rouge de N'Jadaka, le millet dore du plateau Jabari, le fonio sauvage de la vallee du Panther. La tradition est l'ingredient secret.",
      costOfHolding:
        "Les cereales locales sont plus couteuses et plus difficiles a travailler que le malt d'orge industriel. Rendement de brassage 30% inferieur.",
    },
    {
      value: "STIMULATION" as const,
      customName: "Exploration Gustative",
      rank: 2,
      justification:
        "Wakanda Brew refuse la monotonie de la lager standard. Chaque saison apporte une edition speciale. Chaque biere est une invitation a decouvrir un grain, un terroir, un accord inattendu.",
      costOfHolding:
        "L'innovation constante exige des tests couteux et des brassins experimentaux parfois non-commercialisables.",
      tensionWith: ["SECURITE" as const],
    },
  ],

  hierarchieCommunautaire: [
    {
      level: "SPECTATEUR" as const,
      description: "Curieux — a goute une Wakanda Brew en bar ou chez un ami. Ne connait pas encore la gamme complete.",
      privileges: "Acces au programme 'Premiere Mousse' — une biere offerte au bar partenaire avec code de decouverte.",
      entryCriteria: "Premiere degustation documentee (scan QR etiquette)",
    },
    {
      level: "INTERESSE" as const,
      description: "Amateur — achete regulierement au moins une reference. Commence a comprendre les differences entre les 3 bieres.",
      privileges: "Invitation aux degustations mensuelles a la brasserie de N'Jadaka. Newsletter brassicole.",
      entryCriteria: "3+ achats en 2 mois",
    },
    {
      level: "PARTICIPANT" as const,
      description: "Connaisseur — connait la gamme, a visite la brasserie, suit les editions speciales saisonnieres.",
      privileges: "Pre-commande editions speciales. Visite VIP de la brasserie avec degustation en cuve.",
      entryCriteria: "Visite brasserie + 6 mois de fidelite",
    },
  ],

  timelineNarrative: {
    origine:
      "2023, N'Jadaka, Wakanda. Ramonda Brewster, 30 ans, installe sa micro-brasserie dans la grange familiale. 42 recettes testees, 3 retenues.",
    transformation:
      "2024-2025 : Lancement de Panther Gold, Vibranium Stout et Wakanda Wheat. Distribution dans 15 bars et restaurants de Birnin Zana. Premier festival de biere artisanale wakandaise organise par Ramonda.",
    present:
      "2026 : 12 000 litres/mois de production. 35 points de vente partenaires. 1 bar ephemere mensuel. Debut de notoriete chez les 25-40 ans urbains.",
    futur:
      "Extension de la brasserie (objectif 50 000 litres/an). Lancement de 2 editions saisonnieres. Premier export vers le Cameroun et le Gabon.",
  },

  enemy: {
    name: "La Lager Anonyme",
    manifesto:
      "L'ennemi de Wakanda Brew est la biere sans histoire, sans terroir, sans ame. La Lager Anonyme est cette bouteille verte identique servie dans chaque bar d'Afrique — brassee sous licence par un conglomerat europeen, avec du malt importe et un gout calibre pour ne deranger personne. Elle n'a pas de pays, pas de grain local, pas de brasseur. Elle a un budget publicitaire.",
    narrative:
      "En Afrique, 85% de la biere consommee est brassee par 3 multinationales qui ne cultivent pas un seul grain sur le continent. Wakanda Brew est ne pour prouver qu'une biere peut avoir un terroir africain et etre meilleure que l'import.",
    enemySchwartzValues: ["CONFORMITE" as const, "POUVOIR" as const],
  },

  doctrine: {
    dogmas: [
      "Nous croyons que le grain definit la biere — pas l'etiquette. Le sorgho wakandais a autant de noblesse que le malt belge.",
      "Nous croyons que boire local n'est pas un compromis — c'est un privilege.",
    ],
    principles: [
      "Chaque biere contient au moins 60% de cereales cultivees au Wakanda",
      "Pas de conservateurs, pas de pasteurisation forcee — le frais est roi",
    ],
    practices: [
      "Degustation publique obligatoire avant chaque mise en vente d'une nouvelle recette",
      "Collaboration avec 12 cultivateurs de sorgho du village de N'Jadaka — prix equitable garanti",
    ],
  },

  nomMarque: "Wakanda Brew",
  accroche: "Le grain fait la biere.",
  description:
    "Micro-brasserie artisanale wakandaise. Bieres craft a base de cereales traditionnelles (sorgho, millet, fonio). Heritage brassicole remis au gout du jour.",
  brandNature:
    "Brasserie artisanale enracinee dans le terroir wakandais — pas du craft hipster importe, mais du brassage ancestral eleve par la technique belge.",
  secteur: "Brasserie Artisanale / Boissons Premium",
  pays: "WK",
  langue: "fr",
  publicCible:
    "Amateurs de biere urbains wakandais (25-45 ans), restaurateurs premium, expatries et touristes. CSP moyen a superieur.",
  promesseFondamentale:
    "Wakanda Brew est la biere qui a un pays, un grain et un brasseur — pas un numero de lot.",
  equipeDirigeante: [
    {
      nom: "Ramonda Brewster",
      role: "Fondatrice / Maitre Brasseuse",
      bio: "Fille de brasseur traditionnel. MSc Fermentation et Brasserie (Universite de Gand, Belgique). 3 ans en micro-brasseries belges. Maitrise unique de la fermentation des cereales africaines.",
      experiencePasse: ["Micro-brasseries Gand — 3 ans", "These sur fermentation cereales africaines"],
      competencesCles: ["Brassage artisanal", "Fermentation cereales africaines", "Formulation de recettes"],
      credentials: ["MSc Fermentation & Brewing Universiteit Gent", "42 recettes experimentales documentees"],
    },
  ],
};

// ── Pilier D — Distinction (Positionnement) ──────────────────────────────────

export const brewPillarD = {
  personas: [
    {
      name: "Kofi Mensah",
      age: 33,
      csp: "Cadre marketing / Grande entreprise",
      location: "Birnin Zana, Wakanda",
      income: "550 000 XAF/mois",
      familySituation: "En couple, pas d'enfants, vie sociale active",
      lf8Dominant: ["APPROBATION_SOCIALE" as const, "STIMULATION" as const],
      schwartzValues: ["STIMULATION" as const, "AUTONOMIE" as const],
      lifestyle:
        "Sort 3 soirs par semaine dans les bars et restaurants de Birnin Zana. Curieux gastronomique. Suit les tendances food sur Instagram. A decouvert le craft beer lors d'un voyage a Bruxelles. Cherche des alternatives locales aux bieres industrielles.",
      motivations:
        "Decouvrir de nouvelles saveurs et impressionner ses amis avec des recommendations biere uniques. Soutenir les producteurs locaux.",
      fears:
        "Etre vu comme un snob. Que la biere artisanale locale soit de qualite inferieure a l'import.",
      hiddenDesire:
        "Devenir 'le gars qui connait les bieres' dans son cercle. Organiser des degustations privees chez lui.",
      whatTheyActuallyBuy:
        "De l'experience et du storytelling. Panther Gold et Vibranium Stout en bar (4 000 XAF/soiree). LTV : 144 000 XAF/an.",
      jobsToBeDone: [
        "Commander une biere qui genere de la conversation et des questions a table",
        "Offrir un pack decouverte original en cadeau",
        "Poster sur Instagram une biere qui a une histoire",
      ],
      devotionPotential: "AMBASSADEUR" as const,
      rank: 1,
    },
    {
      name: "Marie-Claire Njoh",
      age: 40,
      csp: "Proprietaire restaurant gastronomique",
      location: "Birnin Zana, Wakanda",
      income: "850 000 XAF/mois",
      familySituation: "Mariee, 3 enfants, passionnee de gastronomie wakandaise",
      lf8Dominant: ["SUPERIORITE_STATUT" as const, "CONDITIONS_CONFORT" as const],
      schwartzValues: ["ACCOMPLISSEMENT" as const, "TRADITION" as const],
      lifestyle:
        "Gere un restaurant gastronomique qui revisite la cuisine wakandaise. Cherche constamment des produits locaux premium pour sa carte. Sa carte des boissons est un point de fierte — pas de Heineken, que du caractere.",
      motivations:
        "Proposer une carte des bieres 100% wakandaise a ses clients. Differencier son restaurant avec des accords mets-bieres uniques.",
      fears:
        "Rupture de stock d'une reference en plein service. Qualite inegale d'un lot a l'autre.",
      hiddenDesire:
        "Co-creer une biere exclusive 'Cuvee du Chef' pour son restaurant avec Ramonda.",
      whatTheyActuallyBuy:
        "Du prestige pour sa carte. 200 litres/mois des 3 references. LTV : 720 000 XAF/an.",
      jobsToBeDone: [
        "Avoir une carte des bieres artisanales locales qui impressionne ses clients",
        "Creer des accords mets-bieres uniques avec des produits wakandais",
        "Assurer un approvisionnement regulier et fiable",
      ],
      devotionPotential: "EVANGELISTE" as const,
      rank: 2,
    },
  ],

  paysageConcurrentiel: [
    {
      name: "Brasseries du Cameroun / Castel (33 Export, Beaufort)",
      partDeMarcheEstimee: 55,
      avantagesCompetitifs: [
        "Distribution massive dans chaque bar et boutique du pays — presence ubiquitaire",
        "Prix bas (500-800 XAF) et volume — la biere par defaut",
      ],
      faiblesses: [
        "Zero identite terroir — brassees avec du malt importe, gout standardise",
        "Image de biere 'populaire' incompatible avec le segment premium",
      ],
      strategiePos:
        "Le geant industriel qui domine par le volume et la distribution, pas par le gout ou l'histoire",
    },
    {
      name: "Bieres importees premium (Leffe, Chimay, Grimbergen via import)",
      partDeMarcheEstimee: 8,
      avantagesCompetitifs: [
        "Aura 'biere belge' = prestige automatique chez les CSP+ — heritage brassicole europeen reconnu",
      ],
      faiblesses: [
        "Prix prohibitifs (3 500-5 000 XAF) a cause des frais d'import",
        "Zero connexion avec le terroir local — boire belge au Wakanda est un non-sens gustatif",
        "Conservation incertaine apres transport transcontinental",
      ],
      strategiePos:
        "Le prestige importe qui coute cher sans raconter une histoire locale",
    },
  ],

  promesseMaitre:
    "Wakanda Brew : la biere qui pousse ici, qui est brassee ici, et qui a le gout d'ici.",
  sousPromesses: [
    "Panther Gold : la lager doree au sorgho rouge — fraiche, vive, lumineuse. La biere de l'apero wakandais.",
    "Vibranium Stout : le stout noir au millet torrefie — profond, complexe, revelateur. Pour les moments de caractere.",
    "Wakanda Wheat : la blanche au fonio sauvage — agrumes, epices, legerete. La biere de l'ete wakandais.",
  ],

  positionnement:
    "Wakanda Brew est la premiere brasserie artisanale premium du Wakanda — des bieres de terroir concues avec des cereales ancestrales et une technique de brassage belge.",

  tonDeVoix: {
    personnalite: [
      "Terrien — parle de grains, de cuves, de terroir, pas de marketing",
      "Convivial — la biere est faite pour partager, pas pour impressionner",
      "Passionne — chaque biere est decrite avec amour et precision",
    ],
    onDit: [
      "Brasser / brassin — le vocabulaire du metier, pas de la comm",
      "Grain / cereale / terroir — l'origine compte plus que l'etiquette",
      "Craft wakandais — pas du craft generique, du craft d'ici",
    ],
    onNeditPas: [
      "Premium / luxe — la biere est un plaisir populaire, pas un statut",
      "Industriel / produit — chaque bouteille est un brassin, pas un lot",
      "Alcool — on parle de degustation, de saveurs, d'accords",
    ],
  },
};

// ── Pilier V — Valeur (PARTIAL — pricing draft) ─────────────────────────────

export const brewPillarV = {
  businessModel: "VENTE_DIRECTE",
  economicModels: ["VENTE_DIRECTE", "B2B_RESTAURANTS"],
  positioningArchetype: "PREMIUM",
  salesChannel: "HYBRID",

  // Pricing draft only — not yet full structure
  produitsCatalogue: [
    {
      id: "WB-PG-001",
      nom: "Panther Gold",
      categorie: "PRODUIT_PHYSIQUE",
      prix: 1500,
      cout: 550,
      margeUnitaire: 950,
      gainClientConcret: "Lager doree au sorgho rouge. 33cl, 4.8% alc. Notes de miel, grain torrefie leger, finale seche et rafraichissante.",
      gainClientAbstrait: "La fierte de boire une biere wakandaise qui n'a rien a envier aux imports.",
      gainMarqueConcret: "Best-seller (55% du volume). Point d'entree accessible.",
      gainMarqueAbstrait: "Incarne l'accessibilite du craft wakandais — la preuve que local peut etre premium.",
      coutClientConcret: "1 500 XAF la bouteille 33cl.",
      coutClientAbstrait: "Sortir de sa zone de confort (passer de la 33 Export a une biere inconnue).",
      coutMarqueConcret: 550,
      coutMarqueAbstrait: "Risque de banalisation si percue comme 'encore une lager'.",
      lienPromesse: "Panther Gold est la premiere gorgee de terroir wakandais — le sorgho rouge de N'Jadaka dans chaque bulle.",
      segmentCible: "Kofi Mensah",
      phaseLifecycle: "GROWTH",
      leviersPsychologiques: ["Curiosite (grain de sorgho)", "Prix accessible craft", "Fierte locale"],
      lf8Trigger: ["APPROBATION_SOCIALE" as const, "NOURRITURE_PLAISIR" as const],
      maslowMapping: "BELONGING",
      scoreEmotionnelADVE: 68,
      canalDistribution: ["PLV", "EVENT"],
      disponibilite: "ALWAYS",
      skuRef: "WB-PG-33CL",
    },
    {
      id: "WB-VS-002",
      nom: "Vibranium Stout",
      categorie: "PRODUIT_PHYSIQUE",
      prix: 2500,
      cout: 900,
      margeUnitaire: 1600,
      gainClientConcret: "Stout noir au millet torrefie. 33cl, 6.2% alc. Notes de cacao, cafe, caramel brulee, finale longue et chaleureuse.",
      gainClientAbstrait: "La biere de caractere — pour ceux qui osent sortir du lot.",
      gainMarqueConcret: "Produit premium (25% du volume, 38% de la marge). Differenciant fort.",
      gainMarqueAbstrait: "Incarne l'audace brassicole — la preuve que le craft wakandais peut rivaliser avec les stouts irlandais.",
      coutClientConcret: "2 500 XAF la bouteille 33cl.",
      coutClientAbstrait: "Prix eleve pour une biere locale. Gout intense qui peut surprendre.",
      coutMarqueConcret: 900,
      coutMarqueAbstrait: "Perception elitiste possible ('trop cher pour une biere').",
      lienPromesse: "Vibranium Stout est le wakandais qui n'a pas peur du noir — profond, complexe, inoubliable.",
      segmentCible: "Marie-Claire Njoh",
      phaseLifecycle: "GROWTH",
      leviersPsychologiques: ["Exclusivite gustative", "Statut connaisseur", "Accords mets-biere"],
      lf8Trigger: ["SUPERIORITE_STATUT" as const, "NOURRITURE_PLAISIR" as const],
      maslowMapping: "ESTEEM",
      scoreEmotionnelADVE: 78,
      canalDistribution: ["PLV", "EVENT"],
      disponibilite: "ALWAYS",
      skuRef: "WB-VS-33CL",
    },
    {
      id: "WB-WW-003",
      nom: "Wakanda Wheat",
      categorie: "PRODUIT_PHYSIQUE",
      prix: 1800,
      cout: 650,
      margeUnitaire: 1150,
      gainClientConcret: "Biere blanche au fonio sauvage. 33cl, 4.5% alc. Notes d'agrumes, coriandre, zeste de citron vert. Legere et desalterante.",
      gainClientAbstrait: "L'ete wakandais en bouteille — la biere qui accompagne les bons moments sans alourdir.",
      gainMarqueConcret: "Produit saisonnier fort (20% du volume, pic en saison seche). Attire les femmes et les non-buveurs de biere.",
      gainMarqueAbstrait: "Elargit l'audience au-dela des amateurs de biere classiques.",
      coutClientConcret: "1 800 XAF la bouteille 33cl.",
      coutClientAbstrait: "Moins d'intensite que le Stout — peut decevoir les puristes.",
      coutMarqueConcret: 650,
      coutMarqueAbstrait: "Saisonnalite forte — risque de pertes de stock hors saison.",
      lienPromesse: "Wakanda Wheat est la biere des terrasses — legere comme le fonio, vivante comme l'ete wakandais.",
      segmentCible: "Kofi Mensah",
      phaseLifecycle: "LAUNCH",
      leviersPsychologiques: ["Fraicheur saisonniere", "Accessibilite gustative", "Fonio = curiosite"],
      lf8Trigger: ["NOURRITURE_PLAISIR" as const, "CONDITIONS_CONFORT" as const],
      maslowMapping: "PHYSIOLOGICAL",
      scoreEmotionnelADVE: 65,
      canalDistribution: ["PLV", "EVENT"],
      disponibilite: "SEASONAL",
      skuRef: "WB-WW-33CL",
    },
  ],

  // Product ladder draft
  productLadder: [
    {
      tier: "Decouverte",
      prix: 1500,
      produitIds: ["WB-PG-001"],
      cible: "Kofi Mensah",
      description: "Panther Gold comme point d'entree accessible au craft wakandais.",
      position: 1,
    },
    {
      tier: "Exploration",
      prix: 1800,
      produitIds: ["WB-WW-003"],
      cible: "Kofi Mensah",
      description: "Wakanda Wheat pour explorer un grain different et une experience plus legere.",
      position: 2,
    },
    {
      tier: "Connaisseur",
      prix: 2500,
      produitIds: ["WB-VS-002"],
      cible: "Marie-Claire Njoh",
      description: "Vibranium Stout pour les palais aventureux et les accords gastronomiques.",
      position: 3,
    },
  ],
};

// ── Pilier E — Engagement (PARTIAL — touchpoints sketch, no AARRR) ──────────

export const brewPillarE = {
  promesseExperience:
    "Chaque interaction avec Wakanda Brew doit evoquer la convivialite d'un bar de quartier et la passion d'un brasseur artisan. " +
    "Le client doit sentir qu'il decouvre quelque chose d'authentique, pas qu'on lui vend quelque chose.",
  primaryChannel: "EVENT",

  // 3 touchpoints sketched only — no full AARRR funnel
  touchpoints: [
    { canal: "Bar partenaire — Degustation assistee", type: "PHYSIQUE", channelRef: "PLV", role: "Premiere degustation avec fiche de degustation et histoire du grain", aarrStage: "ACTIVATION", devotionLevel: ["SPECTATEUR", "INTERESSE"], priority: 1, frequency: "WEEKLY" },
    { canal: "Festival biere mensuel — Brasserie N'Jadaka", type: "PHYSIQUE", channelRef: "EVENT", role: "Evenement communautaire : degustation, visite brasserie, rencontre Ramonda", aarrStage: "ACTIVATION", devotionLevel: ["INTERESSE", "PARTICIPANT"], priority: 2, frequency: "MONTHLY" },
    { canal: "Instagram — Behind the Brew", type: "DIGITAL", channelRef: "INSTAGRAM", role: "Contenu brassage en coulisses : du grain a la bouteille, processus artisanal", aarrStage: "ACQUISITION", devotionLevel: ["SPECTATEUR"], priority: 3, frequency: "WEEKLY" },
  ],
};
