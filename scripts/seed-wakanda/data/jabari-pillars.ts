/**
 * JABARI HERITAGE — Pillar Content Data (A, D, V, E, R, T — pillars I and S LOCKED)
 * Score: 17/25 per completed pillar — ADEPTE progression
 * Tourisme culturel — Experiences patrimoniales wakandaises
 */

// ── Pilier A — Authenticite (Identite) ──────────────────────────────────────

export const jabariPillarA = {
  archetype: "SAGE" as const,
  archetypeSecondary: "PROTECTEUR" as const,
  citationFondatrice:
    "\"Le Wakanda ne se visite pas — il se vit. Jabari Heritage ouvre les portes de notre memoire vivante.\" — M'Baku Jabari, fondateur, 2020.",
  noyauIdentitaire:
    "Jabari Heritage est ne de la conviction que le patrimoine wakandais meurt un peu chaque jour si personne ne le transmet. M'Baku Jabari, ancien guide traditionnel et fils du chef de la tribu Jabari, a transforme les rituels, sites sacres et savoir-faire ancestraux en experiences immersives pour les visiteurs. Pas du tourisme de masse — de la transmission controlee et respectueuse. Chaque experience est concue avec les anciens de la communaute Jabari et chaque franc genere finance la preservation du patrimoine.",

  herosJourney: [
    {
      actNumber: 1 as const,
      title: "Le Deuil — La Forge Qui Ferme",
      narrative:
        "M'Baku a 22 ans quand le dernier forgeron traditionnel de la tribu Jabari, son oncle Zuri, meurt sans avoir transmis la totalite de son savoir. La forge est demantelee, les outils vendus a un ferrailleur. M'Baku comprend qu'il ne reste que 3 personnes vivantes au Wakanda qui maitrisent encore la forge ancestrale du vibranium brut. Ce soir-la, il commence a enregistrer les voix des anciens sur un dictaphone. La course contre l'oubli a commence.",
      emotionalArc: "Deuil → Panique → Premiere action de preservation",
    },
    {
      actNumber: 2 as const,
      title: "L'Inventaire — Ce Qui Reste",
      narrative:
        "M'Baku passe 2 ans a parcourir les villages Jabari avec une camera et un carnet. Il documente 84 savoir-faire ancestraux en voie de disparition : tissage de raphia vibranium, danse des guerriers de montagne, cuisine cermonielle, architecture en pierre volcanique, chants de forge. Il realise que 40% de ces savoirs n'ont plus qu'un seul detenteur vivant. L'urgence est absolue. Mais documenter ne suffit pas — il faut transmettre, et transmettre genere de l'argent qui preserve.",
      emotionalArc: "Methode → Decouverte de l'ampleur de la perte → Urgence existentielle",
      causalLink: "L'inventaire des 84 savoir-faire cree le catalogue d'experiences que Jabari Heritage va commercialiser",
    },
    {
      actNumber: 3 as const,
      title: "L'Experience — Le Premier Visiteur",
      narrative:
        "M'Baku organise la premiere 'Journee Jabari' pour 12 touristes sud-africains en visite au Wakanda. Programme : randonnee sur les sentiers ancestraux, demonstration de forge (par un des 3 derniers maitres), repas ceremoniel prepare par les femmes Jabari, initiation aux chants de montagne. Les 12 visiteurs pleurent a la ceremonie de cloture. Ils paient chacun 15 000 XAF. Le chiffre d'affaires d'une journee equivaut a 3 mois de salaire local. M'Baku comprend que le patrimoine peut se financer lui-meme.",
      emotionalArc: "Experimentation → Emotion partagee → Revelation economique",
      causalLink: "La premiere experience prouve que le patrimoine vivant genere plus de revenus que le patrimoine museal",
    },
    {
      actNumber: 4 as const,
      title: "La Structuration — De l'Improvisation au Programme",
      narrative:
        "M'Baku formalise 3 niveaux d'experience : Decouverte (demi-journee, 15 000 XAF), Immersion (3 jours, 45 000 XAF), et Initiation (7 jours, 120 000 XAF, avec ceremonies reservees). Il recrute 8 guides-transmetteurs issus de la communaute Jabari, forme une association avec les anciens pour valider chaque contenu touristique, et signe des partenariats avec 5 hotels de Birnin Zana. Les avis TripAdvisor sont unanimes : 4.9/5 sur 380 avis. Jabari Heritage est cite par Lonely Planet comme 'experience culturelle incontournable du Wakanda'.",
      emotionalArc: "Structuration → Professionnalisation → Reconnaissance internationale",
      causalLink: "La validation par les anciens garantit l'authenticite qui attire les touristes premium",
    },
    {
      actNumber: 5 as const,
      title: "La Mission — Preserver en Transmettant",
      narrative:
        "Jabari Heritage depasse le tourisme. Le Fonds Jabari Heritage (20% des revenus) finance la restauration de 4 sites ancestraux, la formation de 15 jeunes apprentis forgerons et tisserands, et la creation d'un centre d'archives vivantes. L'objectif 2028 : documenter les 84 savoir-faire en video et former au moins 2 apprentis par savoir-faire. Le tourisme n'est pas le but — c'est le moyen. La transmission est la fin.",
      emotionalArc: "Vision systematique → Impact mesurable → Heritage assure",
      causalLink: "Le modele economique tourisme-finance-preservation cree un cercle vertueux auto-entretenu",
    },
  ],

  ikigai: {
    love: "Jabari Heritage aime le moment ou un visiteur comprend que ce qu'il vit n'est pas un spectacle — c'est une transmission. Le frisson de la forge, l'emotion du chant, la saveur du repas ceremoniel.",
    competence:
      "Acces exclusif aux sites et savoir-faire de la tribu Jabari. 8 guides-transmetteurs formes. Inventaire de 84 savoir-faire documentes. Partenariat formel avec le Conseil des Anciens Jabari.",
    worldNeed:
      "Le tourisme culturel en Afrique croit de 12%/an mais l'offre est dominee par le 'safari photo' et le 'village touristique' deshumanise. Les voyageurs premium cherchent l'authenticite et la profondeur.",
    remuneration:
      "3 niveaux d'experience (Decouverte 15 000 XAF, Immersion 45 000 XAF, Initiation 120 000 XAF). CA annuel 2025 : 85M XAF. Marge nette 35% dont 20% reverses au Fonds Heritage.",
  },

  valeurs: [
    {
      value: "TRADITION" as const,
      customName: "Memoire Vivante",
      rank: 1,
      justification:
        "Jabari Heritage existe pour que les 84 savoir-faire ancestraux ne meurent pas avec leurs derniers detenteurs. Chaque experience est une transmission reelle, pas une reconstitution.",
      costOfHolding:
        "Le respect des anciens limite le nombre de visiteurs par jour (max 20) et interdit certains sites aux touristes sans accompagnement initiatique.",
      tensionWith: ["STIMULATION" as const],
    },
    {
      value: "BIENVEILLANCE" as const,
      customName: "Hospitalite Sacree",
      rank: 2,
      justification:
        "L'hospitalite Jabari n'est pas un service — c'est un devoir sacre. Le visiteur est traite comme un invite de la tribu, pas comme un client. La chaleur humaine est non-negociable.",
      costOfHolding:
        "L'hospitalite authentique ne se scale pas facilement. Chaque guide ne peut accompagner que 6 visiteurs a la fois.",
    },
    {
      value: "SECURITE" as const,
      customName: "Protection du Sacre",
      rank: 3,
      justification:
        "Certains sites et rituels ne peuvent pas etre ouverts au tourisme. Jabari Heritage protege le sacre en definissant des limites claires entre ce qui se partage et ce qui reste reserve.",
      costOfHolding:
        "Refuser d'ouvrir les sites les plus 'instagrammables' limite le potentiel de viralite et de revenus.",
    },
  ],

  hierarchieCommunautaire: [
    {
      level: "SPECTATEUR" as const,
      description: "Curieux — a entendu parler de Jabari Heritage via TripAdvisor, Lonely Planet ou le bouche-a-oreille. Consulte le site web.",
      privileges: "Acces au blog heritage et aux videos de presentation des experiences.",
      entryCriteria: "Visite du site web ou demande d'information",
    },
    {
      level: "INTERESSE" as const,
      description: "Visiteur Decouverte — a effectue l'experience demi-journee. A goute l'immersion Jabari.",
      privileges: "Certificat de participation. Acces a la galerie photos privee. Code parrainage -10%.",
      entryCriteria: "Experience Decouverte completee",
    },
    {
      level: "PARTICIPANT" as const,
      description: "Immerse — a effectue l'experience 3 jours. A vecu avec la communaute, participe aux rituels ouverts.",
      privileges: "Invitation aux evenements saisonniers. Acces au groupe WhatsApp alumni. Reduction sur l'Initiation.",
      entryCriteria: "Experience Immersion completee",
    },
    {
      level: "ENGAGE" as const,
      description: "Initie — a effectue l'experience 7 jours avec ceremonies reservees. Considere comme ami de la tribu.",
      privileges: "Droit de retour gratuit une fois par an. Titre 'Ami des Jabari'. Participation au conseil consultatif tourisme.",
      entryCriteria: "Experience Initiation completee + validation par le guide-transmetteur",
    },
  ],

  timelineNarrative: {
    origine:
      "2020, Montagnes Jabari, Wakanda. M'Baku Jabari, 28 ans, commence a enregistrer les anciens sur un dictaphone apres la mort du dernier forgeron. L'inventaire des 84 savoir-faire commence.",
    transformation:
      "2021-2023 : Premiere Journee Jabari pour 12 touristes. Structuration des 3 niveaux d'experience. Recrutement de 8 guides-transmetteurs. Partenariat avec 5 hotels.",
    present:
      "2026 : 2 400 visiteurs/an. 8 guides actifs. CA 85M XAF. 4.9/5 TripAdvisor. Cite par Lonely Planet. Fonds Heritage actif (restauration de 4 sites).",
    futur:
      "2028 : 5 000 visiteurs/an. Centre d'archives vivantes ouvert. 84 savoir-faire documentes en video. 30 apprentis formes. Expansion vers les sites Wakandais hors territoire Jabari.",
  },

  enemy: {
    name: "Le Village Decor",
    manifesto:
      "L'ennemi de Jabari Heritage est le tourisme culturel sans culture — le village reconstitue avec des danseurs en costume qui executent un 'spectacle traditionnel' 3 fois par jour pour des bus de touristes. Le Village Decor transforme les cultures vivantes en attractions mortes. Il prend des photos et laisse du vide.",
    narrative:
      "A travers l'Afrique, le tourisme culturel est devenu une performance sans ame. Les 'villages traditionnels' sont des decors. Les 'artisans' sont des vendeurs de souvenirs. Les 'ceremonies' sont des spectacles minutees. Jabari Heritage est l'antidote : du reel, du lent, du vivant.",
    enemySchwartzValues: ["CONFORMITE" as const, "POUVOIR" as const],
  },

  doctrine: {
    dogmas: [
      "Le patrimoine se transmet, il ne se performe pas. Chaque experience Jabari est une vraie transmission, pas un spectacle.",
      "Les anciens decident ce qui se partage. Le Conseil des Anciens a un droit de veto sur chaque experience proposee aux visiteurs.",
      "L'argent du tourisme finance le patrimoine, pas l'inverse. 20% des revenus vont au Fonds Heritage.",
    ],
    principles: [
      "Maximum 20 visiteurs par jour — la qualite de transmission prime sur le volume",
      "Chaque guide-transmetteur est un membre de la tribu Jabari, forme par les anciens",
      "Aucune photo des ceremonies reservees — le sacre reste sacre",
    ],
    practices: [
      "Revision annuelle du catalogue d'experiences avec le Conseil des Anciens",
      "Formation continue des guides-transmetteurs (1 semaine/trimestre avec les maitres vivants)",
    ],
  },

  nomMarque: "Jabari Heritage",
  accroche: "Le Wakanda ne se visite pas. Il se vit.",
  description:
    "Tourisme culturel immersif dans les montagnes Jabari du Wakanda. Experiences patrimoniales authentiques validees par les anciens de la tribu.",
  brandNature:
    "Tourisme de transmission — pas du spectacle touristique mais de l'immersion patrimoniale controlee et respectueuse, ou chaque franc finance la preservation.",
  secteur: "Tourisme Culturel / Patrimoine",
  pays: "WK",
  langue: "fr",
  publicCible:
    "Touristes culturels premium (35-60 ans), diaspora wakandaise et africaine de retour, groupes scolaires et universitaires, voyageurs aventuriers conscients",
  promesseFondamentale:
    "Jabari Heritage offre l'acces le plus intime et authentique au patrimoine vivant du Wakanda — pas un musee, mais une immersion dans la memoire d'un peuple.",
  equipeDirigeante: [
    {
      nom: "M'Baku Jabari",
      role: "Fondateur / Directeur des Experiences",
      bio: "Fils du chef de la tribu Jabari. Ex-guide traditionnel. A documente 84 savoir-faire ancestraux en voie de disparition. Pont entre le monde traditionnel et le tourisme premium.",
      experiencePasse: ["Guide traditionnel Jabari — 6 ans", "Inventaire patrimoine immateriel — 2 ans"],
      competencesCles: ["Patrimoine immateriel", "Mediation culturelle", "Gestion communautaire"],
      credentials: ["Licence Gestion Touristique Universite Birnin Zana", "Reconnaissance Lonely Planet 2025"],
    },
  ],
};

// ── Pilier D — Distinction (Positionnement) ──────────────────────────────────

export const jabariPillarD = {
  personas: [
    {
      name: "Catherine Moreau",
      age: 48,
      csp: "Journaliste voyage / Freelance",
      location: "Paris, France",
      income: "4 500 EUR/mois",
      familySituation: "Divorcee, 2 enfants adultes, voyageuse solo",
      lf8Dominant: ["STIMULATION" as const, "CONDITIONS_CONFORT" as const],
      schwartzValues: ["STIMULATION" as const, "UNIVERSALISME" as const],
      lifestyle:
        "Voyageuse experimentee (45 pays). Evite les circuits touristiques classiques. Cherche l'immersion authentique et les rencontres humaines. Ecrit pour GEO, National Geographic Traveler et son blog.",
      motivations:
        "Vivre une experience culturelle africaine profonde et authentique qu'elle peut raconter dans ses articles. Decouvrir un patrimoine non-touristifie.",
      fears:
        "Tomber sur une experience touristique formatee deguisee en 'authentique'. Manquer de respect aux traditions locales par ignorance.",
      hiddenDesire:
        "Ecrire un long format pour National Geographic sur les derniers maitres forgerons Jabari. Etre la premiere journaliste occidentale a documenter l'Initiation.",
      whatTheyActuallyBuy:
        "De l'exclusivite et de la profondeur. Experience Immersion 3 jours (45 000 XAF) + extension personnalisee.",
      jobsToBeDone: [
        "Vivre une immersion culturelle authentique et non-formatee",
        "Collecter du materiel (photos, interviews) pour un article premium",
        "Rencontrer des detenteurs de savoir ancestral en conditions reelles",
      ],
      devotionPotential: "AMBASSADEUR" as const,
      rank: 1,
    },
    {
      name: "Kwaku Asante-Bediako",
      age: 55,
      csp: "Medecin / Diaspora returnee",
      location: "Accra, Ghana (ne au Wakanda)",
      income: "2 800 000 GHS/an",
      familySituation: "Marie, 3 enfants adolescents, nostalgie des racines",
      lf8Dominant: ["PROTECTION_PROCHES" as const, "CONDITIONS_CONFORT" as const],
      schwartzValues: ["TRADITION" as const, "BIENVEILLANCE" as const],
      lifestyle:
        "Medecin installe a Accra depuis 25 ans. Ne au Wakanda, parti a 18 ans pour ses etudes. Revient au pays chaque annee mais constate la disparition progressive des traditions. Ses enfants ne parlent pas la langue Jabari.",
      motivations:
        "Reconnecter ses enfants avec leurs racines Jabari. Comprendre ce qui reste du patrimoine de son enfance. Contribuer a la preservation.",
      fears:
        "Que ses enfants trouvent l'experience ennuyeuse ou 'trop traditionnelle'. Que le patrimoine soit deja trop altere par le tourisme.",
      hiddenDesire:
        "Devenir mecene du Fonds Jabari Heritage. Financer la formation d'apprentis forgerons en memoire de son pere.",
      whatTheyActuallyBuy:
        "Du lien generationnel. Experience Initiation 7 jours (120 000 XAF x 4 personnes = 480 000 XAF) pour toute la famille.",
      jobsToBeDone: [
        "Offrir a ses enfants une experience de reconnexion avec leurs racines",
        "Redecouvrir les traditions de son enfance dans leur forme authentique",
        "Contribuer financierement a la preservation du patrimoine Jabari",
      ],
      devotionPotential: "EVANGELISTE" as const,
      rank: 2,
    },
    {
      name: "Groupe Scolaire Lycee de Birnin Zana",
      age: 0,
      csp: "Etablissement scolaire / 30 eleves",
      location: "Birnin Zana, Wakanda",
      income: "Budget sorties : 600 000 XAF/an",
      familySituation: "Classe de Terminale, programme patrimoine culturel",
      lf8Dominant: ["ACCOMPLISSEMENT" as const, "UNIVERSALISME" as const],
      schwartzValues: ["UNIVERSALISME" as const, "TRADITION" as const],
      lifestyle:
        "30 eleves de Terminale avec un programme scolaire qui inclut 'Patrimoine et Identite Wakandaise'. Besoin d'une sortie pedagogique immersive.",
      motivations: "Completer le programme scolaire par une experience terrain. Eveiller la conscience patrimoniale des jeunes.",
      fears: "Que les eleves ne prennent pas l'experience au serieux. Budget serre (20 000 XAF/eleve max).",
      hiddenDesire: "Que certains eleves deviennent apprentis guides-transmetteurs apres l'experience.",
      whatTheyActuallyBuy:
        "De la pedagogie vivante. Experience Decouverte adaptee groupes scolaires : 15 000 XAF/eleve x 30 = 450 000 XAF.",
      jobsToBeDone: [
        "Offrir une sortie pedagogique immersive et memorisable",
        "Illustrer le programme 'Patrimoine et Identite' par une experience terrain",
        "Rester dans le budget de 20 000 XAF par eleve tout compris",
      ],
      devotionPotential: "PARTICIPANT" as const,
      rank: 3,
    },
  ],

  paysageConcurrentiel: [
    {
      name: "Wakanda Tourism Board (office de tourisme national)",
      partDeMarcheEstimee: 40,
      avantagesCompetitifs: [
        "Budget marketing national et visibilite institutionnelle — presente dans tous les guides et salons internationaux",
      ],
      faiblesses: [
        "Offre culturelle generique et superficielle — 'package Wakanda' standard sans profondeur",
        "Pas de lien direct avec les communautes detentrices du patrimoine",
        "Experience formatee pour le tourisme de masse — bus, photo, souvenir, depart",
      ],
      strategiePos:
        "L'institution qui attire les touristes au Wakanda mais ne leur offre qu'un survol du patrimoine",
    },
    {
      name: "Guides independants et tour-operators locaux",
      partDeMarcheEstimee: 25,
      avantagesCompetitifs: [
        "Flexibilite et personnalisation — chaque guide cree sa propre experience selon le client",
      ],
      faiblesses: [
        "Qualite inegale — aucun standard de formation ni de validation par les anciens",
        "Pas de reinvestissement dans la preservation du patrimoine",
        "Pas de visibilite en ligne (pas de TripAdvisor, pas de site web)",
      ],
      strategiePos:
        "L'artisan tourisme qui connait le terrain mais n'a pas la structure pour garantir qualite et impact",
    },
  ],

  positionnement:
    "Jabari Heritage est la seule experience culturelle wakandaise validee par le Conseil des Anciens Jabari — chaque visite est une transmission reelle, chaque franc finance la preservation.",

  tonDeVoix: {
    personnalite: [
      "Solennel mais chaleureux — le respect du sacre n'empeche pas la joie de l'hospitalite",
      "Narratif — chaque experience est racontee comme une histoire, pas decrite comme un produit",
      "Humble — Jabari Heritage ne pretend pas tout montrer. Le mystere fait partie de l'experience.",
    ],
    onDit: [
      "Transmission / transmettre — pas 'montrer' ou 'presenter'",
      "Experience / immersion — pas 'visite' ou 'tour'",
      "Anciens / maitres — pas 'guides touristiques'",
    ],
    onNeditPas: [
      "Tour / visite guidee — Jabari Heritage n'est pas un tour-operator",
      "Spectacle / show — les traditions ne sont pas des performances",
      "Touriste — les visiteurs sont des invites, pas des clients",
    ],
  },
};

// ── Pilier V — Valeur (Offre & Pricing) ─────────────────────────────────────

export const jabariPillarV = {
  businessModel: "VENTE_DIRECTE",
  economicModels: ["VENTE_DIRECTE", "B2B_AGENCES", "MECENAT_FONDS_HERITAGE"],
  positioningArchetype: "PREMIUM",
  salesChannel: "HYBRID",

  produitsCatalogue: [
    {
      id: "JH-DEC-001",
      nom: "Experience Decouverte",
      categorie: "SERVICE_PHYSIQUE",
      prix: 15000,
      cout: 5500,
      margeUnitaire: 9500,
      gainClientConcret: "Demi-journee immersive : randonnee sentier ancestral, demonstration forge ou tissage, repas traditionnel. 4-5 heures.",
      gainClientAbstrait: "Premier contact emotionnel avec le patrimoine Jabari. Sentiment de toucher quelque chose d'authentique.",
      gainMarqueConcret: "Point d'entree (55% du volume). Taux de conversion vers Immersion : 28%.",
      gainMarqueAbstrait: "Chaque visiteur Decouverte est un ambassadeur potentiel — les avis TripAdvisor sont 95% positifs.",
      coutClientConcret: "15 000 XAF par personne. Transport non inclus.",
      coutClientAbstrait: "Frustration de ne pas avoir le temps d'aller plus en profondeur.",
      coutMarqueConcret: 5500,
      coutMarqueAbstrait: "Risque de banalisation si le volume augmente trop — max 20 visiteurs/jour.",
      lienPromesse: "Decouverte est la premiere porte — un avant-gout de la profondeur Jabari.",
      segmentCible: "Groupe Scolaire Lycee de Birnin Zana",
      phaseLifecycle: "MATURITY",
      leviersPsychologiques: ["Prix d'entree accessible", "Curiosite culturelle", "Recommandations TripAdvisor"],
      lf8Trigger: ["STIMULATION" as const, "CONDITIONS_CONFORT" as const],
      maslowMapping: "BELONGING",
      scoreEmotionnelADVE: 72,
      canalDistribution: ["APP", "PARTNERSHIP"],
      disponibilite: "SEASONAL",
      skuRef: "JH-DEC-HALF",
    },
    {
      id: "JH-IMM-002",
      nom: "Experience Immersion",
      categorie: "SERVICE_PHYSIQUE",
      prix: 45000,
      cout: 16000,
      margeUnitaire: 29000,
      gainClientConcret: "3 jours en immersion : hebergement chez les Jabari, participation aux rituels ouverts, apprentissage d'un savoir-faire (forge, tissage, cuisine), ceremonies du matin et du soir.",
      gainClientAbstrait: "Vivre comme un Jabari pendant 3 jours. Sentir le temps ralentir. Comprendre un mode de vie.",
      gainMarqueConcret: "Produit coeur (35% du volume, 45% de la marge). Les Immersions generent 80% des avis 5 etoiles.",
      gainMarqueAbstrait: "L'Immersion est l'experience qui transforme les visiteurs en ambassadeurs — ils reviennent et ils parlent.",
      coutClientConcret: "45 000 XAF par personne (tout inclus sauf transport).",
      coutClientAbstrait: "3 jours d'engagement — necessite de planifier a l'avance.",
      coutMarqueConcret: 16000,
      coutMarqueAbstrait: "Qualite d'hebergement chez l'habitant variable — certains visiteurs trouvent les conditions rustiques.",
      lienPromesse: "L'Immersion est le coeur de Jabari Heritage — la ou la transmission devient reelle.",
      segmentCible: "Catherine Moreau",
      phaseLifecycle: "GROWTH",
      leviersPsychologiques: ["Authenticite garantie (validee par les anciens)", "Exclusivite (max 6 visiteurs)", "Profondeur emotionnelle"],
      lf8Trigger: ["STIMULATION" as const, "APPROBATION_SOCIALE" as const],
      maslowMapping: "SELF_ACTUALIZATION",
      scoreEmotionnelADVE: 90,
      canalDistribution: ["APP", "PARTNERSHIP"],
      disponibilite: "SEASONAL",
      skuRef: "JH-IMM-3D",
    },
    {
      id: "JH-INI-003",
      nom: "Experience Initiation",
      categorie: "SERVICE_PHYSIQUE",
      prix: 120000,
      cout: 42000,
      margeUnitaire: 78000,
      gainClientConcret: "7 jours complets : tout ce que l'Immersion inclut + ceremonies reservees, enseignement approfondi d'un savoir-faire, rencontre avec le Conseil des Anciens, ceremonie de reconnaissance 'Ami des Jabari'.",
      gainClientAbstrait: "Etre reconnu par la communaute. Recevoir un nom Jabari. Sentir qu'on appartient a quelque chose d'ancien et de sacre.",
      gainMarqueConcret: "Produit premium (10% du volume, 25% de la marge). 100% des Inities deviennent des ambassadeurs actifs.",
      gainMarqueAbstrait: "L'Initiation cree des liens a vie — les Inities reviennent, financent, parrainent.",
      coutClientConcret: "120 000 XAF par personne (tout inclus).",
      coutClientAbstrait: "7 jours d'engagement total. Eloignement de la ville. Conditions de vie rustiques.",
      coutMarqueConcret: 42000,
      coutMarqueAbstrait: "Risque de deception si le visiteur n'est pas pret emotionnellement a l'intensite de l'experience.",
      lienPromesse: "L'Initiation est le sommet — la ou le visiteur cesse d'etre un invite et devient un ami de la tribu.",
      segmentCible: "Kwaku Asante-Bediako",
      phaseLifecycle: "GROWTH",
      leviersPsychologiques: ["Exclusivite absolue (max 4 personnes par session)", "Reconnaissance tribale (nom Jabari)", "Impact philanthropique (20% au Fonds Heritage)"],
      lf8Trigger: ["APPROBATION_SOCIALE" as const, "PROTECTION_PROCHES" as const],
      maslowMapping: "SELF_ACTUALIZATION",
      scoreEmotionnelADVE: 96,
      canalDistribution: ["APP"],
      disponibilite: "SEASONAL",
      skuRef: "JH-INI-7D",
    },
  ],

  productLadder: [
    { tier: "Decouverte", prix: 15000, produitIds: ["JH-DEC-001"], cible: "Groupe Scolaire", description: "Demi-journee d'introduction au patrimoine Jabari.", position: 1 },
    { tier: "Immersion", prix: 45000, produitIds: ["JH-IMM-002"], cible: "Catherine Moreau", description: "3 jours de vie avec les Jabari.", position: 2 },
    { tier: "Initiation", prix: 120000, produitIds: ["JH-INI-003"], cible: "Kwaku Asante-Bediako", description: "7 jours de transmission profonde + reconnaissance tribale.", position: 3 },
  ],

  unitEconomics: {
    cac: 8500,
    ltv: 145000,
    ltvCacRatio: 17,
    pointMort: "Atteint a 120 visiteurs/mois (seuil actuel : 200 visiteurs/mois)",
    margeNette: 35,
    roiEstime: 55,
    paybackPeriod: 1,
    budgetCom: 4000000,
    caVise: 120000000,
  },
};

// ── Pilier E — Engagement ───────────────────────────────────────────────────

export const jabariPillarE = {
  promesseExperience:
    "Chaque contact avec Jabari Heritage doit evoquer le souffle de la montagne Jabari — calme, profond, authentique. " +
    "Le visiteur ne doit jamais se sentir comme un touriste — il doit se sentir comme un invite.",
  primaryChannel: "EVENT",

  superfanPortrait: {
    personaRef: "Kwaku Asante-Bediako",
    motivations: [
      "Reconnecter sa famille avec ses racines — emotion profonde",
      "Contribuer a la preservation en tant que mecene",
      "Etre reconnu comme 'Ami des Jabari' donne un sentiment d'appartenance unique",
    ],
    barriers: [
      "Distance geographique (vit a Accra) — ne peut venir que 1-2 fois par an",
      "Si l'experience se 'touristifie' il perdra confiance",
    ],
    profile:
      "Medecin, 55 ans, ne au Wakanda, vit a Accra depuis 25 ans. Experience Initiation familiale (480 000 XAF). " +
      "Devenu donateur du Fonds Heritage (500 000 XAF/an). Parraine 2 apprentis forgerons.",
  },

  touchpoints: [
    { canal: "Site web Jabari Heritage — Reservation", type: "DIGITAL", channelRef: "APP", role: "Decouverte des experiences et reservation en ligne", aarrStage: "ACQUISITION", devotionLevel: ["SPECTATEUR"], priority: 1, frequency: "AD_HOC" },
    { canal: "Experience sur site — Immersion physique", type: "PHYSIQUE", channelRef: "EVENT", role: "Coeur de l'engagement : la transmission en personne avec les guides-transmetteurs", aarrStage: "ACTIVATION", devotionLevel: ["INTERESSE", "PARTICIPANT", "ENGAGE"], priority: 2, frequency: "AD_HOC" },
    { canal: "TripAdvisor / Google Reviews — Avis", type: "DIGITAL", channelRef: "PLV", role: "Preuve sociale et acquisition organique via les avis des visiteurs", aarrStage: "REFERRAL", devotionLevel: ["INTERESSE", "PARTICIPANT"], priority: 3, frequency: "AD_HOC" },
    { canal: "Newsletter Heritage — Saisons et evenements", type: "DIGITAL", channelRef: "EMAIL", role: "Informer des evenements saisonniers, nouveaux savoir-faire ouverts, actualites du Fonds", aarrStage: "RETENTION", devotionLevel: ["PARTICIPANT", "ENGAGE"], priority: 4, frequency: "SEASONAL" },
    { canal: "Fete des Ancetres — Evenement annuel", type: "PHYSIQUE", channelRef: "EVENT", role: "Grand evenement annuel : ceremonies speciales, retrouvailles des alumni, collecte pour le Fonds Heritage", aarrStage: "REFERRAL", devotionLevel: ["ENGAGE"], priority: 5, frequency: "YEARLY" },
  ],

  aarrr: {
    acquisition: "TripAdvisor/Google Reviews (40%), bouche-a-oreille (25%), partenariats hotels (20%), presse voyage (15%). CPA : 8 500 XAF.",
    activation: "Experience Decouverte comme premier contact (55% des visiteurs). Taux de satisfaction post-experience : 95%.",
    retention: "Conversion Decouverte -> Immersion : 28%. Conversion Immersion -> Initiation : 15%. Newsletter saisonniere.",
    revenue: "Panier moyen : 42 000 XAF. 200 visiteurs/mois en haute saison, 80/mois en basse saison. CA annuel : 85M XAF.",
    referral: "Chaque visiteur Immersion/Initiation genere en moyenne 2.5 recommendations directes. Avis TripAdvisor 4.9/5 (380 avis).",
  },
};

// ── Pilier R — Risk (Diagnostic) ────────────────────────────────────────────

export const jabariPillarR = {
  globalSwot: {
    strengths: [
      "Validation par le Conseil des Anciens — authenticitite impossible a repliquer",
      "4.9/5 TripAdvisor sur 380 avis — reputation exceptionnelle",
      "8 guides-transmetteurs formes et dedies",
      "Modele economique auto-finance (20% au Fonds Heritage)",
    ],
    weaknesses: [
      "Capacite limitee a 20 visiteurs/jour — scalabilite physique impossible",
      "Forte saisonnalite (60% du CA en saison seche, novembre-mars)",
      "Dependance a M'Baku comme fondateur et visage de la marque",
      "Infrastructure d'hebergement rustique — incompatible avec certains touristes premium",
    ],
    opportunities: [
      "Tourisme culturel africain en croissance de 12%/an",
      "Diaspora africaine en quete de reconnexion — marche en expansion",
      "Partenariats avec des agences de voyage haut de gamme (Abercrombie & Kent, &Beyond)",
      "Digitalisation : experiences virtuelles en complement (visite VR, webinaires avec les anciens)",
    ],
    threats: [
      "Instabilite politique regionale — risque securitaire pour les touristes internationaux",
      "Changement climatique impactant les sentiers ancestraux (erosion, glissements de terrain)",
      "Imitation par des operateurs touristiques qui proposent des 'experiences Jabari' non-autorisees",
      "Vieillissement des derniers detenteurs de savoir — course contre le temps",
    ],
  },

  probabilityImpactMatrix: [
    {
      risk: "Deces d'un des 3 derniers maitres forgerons sans avoir forme d'apprenti suffisant",
      probability: "HIGH",
      impact: "HIGH",
      mitigation: "Programme accelere de formation de 5 apprentis. Documentation video exhaustive de chaque technique. Partenariat avec l'UNESCO pour la preservation.",
    },
    {
      risk: "Saison des pluies exceptionnelle rendant les sites inaccessibles pendant 4 mois au lieu de 2",
      probability: "MEDIUM",
      impact: "MEDIUM",
      mitigation: "Diversification avec des experiences en interieur (forge, cuisine, artisanat). Lancement experiences virtuelles.",
    },
    {
      risk: "Operateur touristique non-autorise copiant les experiences Jabari Heritage sans validation des anciens",
      probability: "MEDIUM",
      impact: "MEDIUM",
      mitigation: "Protection juridique de la marque. Communication active sur l'exclusivite de la validation par le Conseil des Anciens.",
    },
    {
      risk: "Incident securitaire impliquant un touriste sur les sentiers ancestraux",
      probability: "LOW",
      impact: "HIGH",
      mitigation: "Assurance responsabilite civile. Formation premiers secours pour tous les guides. Protocole d'evacuation medicale.",
    },
  ],

  riskScore: 32,
};

// ── Pilier T — Track (Realite Marche) — partial triangulation, niche market ──

export const jabariPillarT = {
  tamSamSom: {
    tam: {
      value: 85000000000,
      description: "Marche total du tourisme au Wakanda — 85 milliards XAF en 2025 (tous segments confondus)",
      source: "ai_estimate",
      sourceRef: "Office National du Tourisme Wakanda + World Tourism Organization data",
    },
    sam: {
      value: 4200000000,
      description: "Segment tourisme culturel premium au Wakanda (visiteurs >30 000 XAF/experience) — 4.2 milliards XAF",
      source: "ai_estimate",
      sourceRef: "Estimation basee sur les arrivees touristes premium + panier moyen",
    },
    som: {
      value: 180000000,
      description: "Part atteignable a 18 mois : 4.3% du SAM soit 180M XAF — doublement du CA actuel",
      source: "calculated",
      sourceRef: "Projection basee sur capacite max 20 visiteurs/jour x 280 jours ouverture + mix produit",
    },
  },

  brandMarketFitScore: 82,

  traction: {
    utilisateursInscrits: 5200,
    utilisateursActifs: 2400,
    croissanceHebdo: 1.8,
    revenusRecurrents: 0,
    metriqueCle: {
      nom: "Visiteurs mensuels",
      valeur: 200,
      tendance: "STABLE",
    },
    preuvesTraction: [
      "2 400 visiteurs cumules en 3 ans d'activite",
      "4.9/5 TripAdvisor sur 380 avis — meilleure note du secteur culturel au Wakanda",
      "Citation Lonely Planet 'experience culturelle incontournable'",
      "28% de conversion Decouverte -> Immersion",
    ],
    tractionScore: 6,
  },

  triangulation: {
    customerInterviews: "45 interviews post-experience (15 Decouverte, 20 Immersion, 10 Initiation). Insight cle : les visiteurs viennent pour la culture mais restent pour l'emotion humaine. Le guide-transmetteur est le facteur n.1 de satisfaction, pas le site.",
    competitiveAnalysis: "Benchmark 6 operateurs de tourisme culturel au Wakanda. Jabari Heritage est le seul avec validation formelle du Conseil des Anciens. Les autres proposent des experiences plus courtes, moins profondes, mais plus accessibles.",
    trendAnalysis: "Tourisme culturel africain +12%/an. Tourisme de diaspora en forte hausse (+25%/an post-Covid). Les voyageurs premium recherchent l'authenticite mesuree par les avis reels, pas par les etoiles d'hotel.",
    financialBenchmarks: "Jabari Heritage : marge nette 35% (vs 20% moyenne tourisme culturel africain). Panier moyen 42 000 XAF (vs 18 000 XAF moyenne). Mais volume limité par la capacite physique (20/jour max).",
  },
};

// Pillars I (Innovation) and S (Strategie) are LOCKED — no content generated
