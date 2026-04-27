/**
 * SHURI ACADEMY — Pillar Content Data (All 8 pillars: A, D, V, E, R, T, I, S)
 * Score: 16/25 per pillar — ADEPTE progression (complete but less detailed than BLISS)
 * EdTech — Plateforme de formation en ligne pour les competences tech africaines
 */

// ── Pilier A — Authenticite (Identite) ──────────────────────────────────────

export const shuriPillarA = {
  archetype: "SAGE" as const,
  archetypeSecondary: "CREATEUR" as const,
  citationFondatrice:
    "\"Le code est le nouveau lingala — une langue universelle que chaque Africain devrait parler.\" — Shuri Udaku, fondatrice Shuri Academy, 2021.",
  noyauIdentitaire:
    "Shuri Academy est ne d'un paradoxe : l'Afrique a la population la plus jeune du monde mais forme moins de 2% des developpeurs mondiaux. Shuri Udaku, prodige technologique et soeur cadette d'un haut fonctionnaire wakandais, a lance une plateforme de formation en ligne pour democratiser les competences tech sur le continent. Pas de charisme creux — des cours rigoureux, des certifications reconnues, et un reseau d'alumni qui s'entraide.",

  herosJourney: [
    {
      actNumber: 1 as const,
      title: "Le Decalage — Le Genie Sans Ecole",
      narrative:
        "Shuri, 16 ans, hacke le systeme informatique de son lycee pour corriger une erreur administrative qui bloquait les bourses de 200 eleves. Le proviseur la felicite puis la punit. Elle realise que son talent n'a nulle part ou grandir au Wakanda — pas de formation tech serieuse accessible, pas de parcours structure pour les jeunes esprits numeriques. Les plus doues partent a l'etranger. Les autres stagnent.",
      emotionalArc: "Frustration → Conscience du vide → Determination precoce",
    },
    {
      actNumber: 2 as const,
      title: "L'Immersion — MIT puis Google",
      narrative:
        "Shuri obtient une bourse au MIT a 18 ans, puis rejoint Google pendant 2 ans comme ingenieure IA. Elle excelle techniquement mais observe que les equipes tech n'ont quasiment aucun Africain. A chaque conference, on lui demande 'mais comment tu as appris tout ca au Wakanda?'. La question l'irrite. La reponse l'obsede : il n'y a pas de pipeline de talents tech en Afrique parce qu'il n'y a pas de plateforme de formation adaptee.",
      emotionalArc: "Excellence solitaire → Colere froide → Mission definie",
      causalLink: "L'absence de pipeline tech africain revele l'opportunite massive que Shuri Academy va saisir",
    },
    {
      actNumber: 3 as const,
      title: "La Plateforme — Le Premier Cours",
      narrative:
        "Shuri quitte Google a 22 ans et revient au Wakanda. En 6 mois, elle developpe le MVP de Shuri Academy : une plateforme LMS avec 5 cours (Python, Web Dev, Data Science, UX Design, Cybersecurite). Le premier cours gratuit attire 2 000 inscrits en 48 heures. Le taux de completion est de 34% — mediocre. Shuri comprend que le probleme n'est pas le contenu mais l'accompagnement : les apprenants africains ont besoin de mentorat, pas juste de videos.",
      emotionalArc: "Lancement euphorique → Deception des chiffres → Pivot vers le mentorat",
      causalLink: "Le pivot mentorat differencie Shuri Academy de Coursera et Udemy — l'humain fait la difference",
    },
    {
      actNumber: 4 as const,
      title: "Le Reseau — Les Alumni Qui Recrutent",
      narrative:
        "Shuri lance le programme 'Code & Mentor' : chaque cours est accompagne d'un mentor alumni (1 mentor pour 10 apprenants). Le taux de completion bondit a 62%. Les premiers alumni decrochent des postes chez des entreprises locales et internationales. Shuri signe des partenariats avec 15 entreprises tech qui recrutent directement sur la plateforme. L'ecosysteme se forme : apprendre → se faire mentorer → etre recrute → devenir mentor.",
      emotionalArc: "Validation → Acceleration → Effet reseau vertueux",
      causalLink: "Le cercle apprenant-mentor-recruteur cree un ecosysteme auto-entretenu que les concurrents ne peuvent pas repliquer rapidement",
    },
    {
      actNumber: 5 as const,
      title: "Le Mouvement — La Tech Africaine Formee Ici",
      narrative:
        "Shuri Academy depasse les 45 000 apprenants dans 12 pays africains. Les certifications Shuri sont reconnues par 35 entreprises partenaires. Le programme Corporate permet aux entreprises de former leurs equipes. Le Fonds Shuri finance 500 bourses par an pour les apprenants talentueux sans moyens. L'objectif 2028 : 200 000 apprenants, 50 pays, et la premiere certification tech panafricaine reconnue mondialement.",
      emotionalArc: "Vision continentale → Impact mesurable → Heritage educatif",
      causalLink: "Chaque alumni qui reussit devient la preuve vivante que la formation tech africaine n'a pas besoin de Silicon Valley",
    },
  ],

  ikigai: {
    love: "Shuri Academy aime voir un apprenant passer de 'je ne sais pas coder' a 'je viens de decrocher mon premier emploi tech' en 6 mois. C'est cette transformation qui anime chaque decision.",
    competence:
      "Plateforme LMS proprietaire optimisee pour les connexions africaines (faible bande passante, mode offline). Programme de mentorat structure (1:10). Partenariats recrutement avec 35 entreprises. Contenu cree par des experts africains, pas des imports.",
    worldNeed:
      "L'Afrique aura besoin de 3.5 millions de developpeurs supplementaires d'ici 2030 (source : African Development Bank). Les plateformes occidentales (Coursera, Udemy) ont un taux de completion de 8% en Afrique — inadapte au contexte.",
    remuneration:
      "Freemium (cours d'intro gratuits) + Student 3 000 XAF/mois + Pro 8 000 XAF/mois + Enterprise custom. MRR actuel : 28M XAF. Objectif Y3 : 180M XAF.",
  },

  valeurs: [
    {
      value: "UNIVERSALISME" as const,
      customName: "Tech Pour Tous",
      rank: 1,
      justification:
        "Shuri Academy croit que le talent est distribue egalement mais pas l'opportunite. La technologie est la rampe d'acces la plus puissante vers l'emploi et l'entrepreneuriat en Afrique.",
      costOfHolding:
        "Maintenir des prix accessibles reduit les marges. Le Fonds Shuri (500 bourses/an) est un investissement sans retour financier direct.",
      tensionWith: ["POUVOIR" as const],
    },
    {
      value: "ACCOMPLISSEMENT" as const,
      customName: "Excellence Exigee",
      rank: 2,
      justification:
        "Shuri Academy refuse la complaisance. Chaque certification requiert un projet reel valide par un mentor. Pas de diplome au rabais — la credibilite de la plateforme repose sur l'exigence.",
      costOfHolding:
        "Le taux de certification est de 52% seulement — beaucoup abandonnent, ce qui peut nuire a l'image de 'plateforme pour tous'.",
      tensionWith: ["BIENVEILLANCE" as const],
    },
    {
      value: "BIENVEILLANCE" as const,
      customName: "Mentorat Fraternel",
      rank: 3,
      justification:
        "Le programme Code & Mentor incarne la bienveillance structuree : chaque apprenant a un guide humain, pas juste un chatbot. Les alumni qui deviennent mentors transmettent ce qu'ils ont recu.",
      costOfHolding:
        "Recruter et former 450 mentors benevoles demande une logistique lourde et un turnover de 25%/an.",
    },
  ],

  hierarchieCommunautaire: [
    {
      level: "SPECTATEUR" as const,
      description: "Curieux — a cree un compte et consulte les cours gratuits. Hesite a s'engager dans une formation complete.",
      privileges: "Acces aux 5 cours d'introduction gratuits. Forum communautaire en lecture seule.",
      entryCriteria: "Creation de compte + 1 cours gratuit commence",
    },
    {
      level: "INTERESSE" as const,
      description: "Apprenant — s'est inscrit a un parcours payant (Student ou Pro). Suit les modules activement.",
      privileges: "Acces au mentorat 1:10. Forum actif. Acces Discord communaute apprenants.",
      entryCriteria: "Abonnement actif + 1 module complete",
    },
    {
      level: "PARTICIPANT" as const,
      description: "Certifie — a obtenu au moins 1 certification Shuri. Commence a postuler ou freelancer dans le tech.",
      privileges: "Acces au job board partenaire. Badge LinkedIn certifie. Invitation aux hackathons Shuri.",
      entryCriteria: "1 certification obtenue",
    },
    {
      level: "ENGAGE" as const,
      description: "Mentor — alumni qui donne du temps pour mentorat (1:10). Participe activement a la communaute.",
      privileges: "Badge Mentor. Acces aux masterclass avancees gratuites. Priorite recrutement partenaires.",
      entryCriteria: "2+ certifications + 6 mois de mentorat actif",
    },
    {
      level: "AMBASSADEUR" as const,
      description: "Champion — cree du contenu, organise des meetups locaux, recrute des apprenants dans sa ville.",
      privileges: "Compensation mentorat (15 000 XAF/mois). Speaker aux evenements Shuri. Co-creation de cours.",
      entryCriteria: "20+ apprenants mentores + 1 meetup organise",
    },
  ],

  timelineNarrative: {
    origine:
      "2021, Birnin Zana. Shuri Udaku, 22 ans, quitte Google et lance le MVP de Shuri Academy avec 5 cours et 0 budget marketing. 2 000 inscrits en 48h.",
    transformation:
      "2022-2024 : Pivot vers le mentorat (taux completion de 34% a 62%). 15 partenariats entreprises. 12 000 apprenants. Premiers alumni recrutes chez Andela, Flutterwave, et localement.",
    present:
      "2026 : 45 000 apprenants dans 12 pays. 35 entreprises partenaires. 450 mentors actifs. 28M XAF MRR. Programme Corporate lance.",
    futur:
      "2028 : 200 000 apprenants. 50 pays. Certification Shuri reconnue comme standard panafricain. Premier campus physique a Birnin Zana.",
  },

  enemy: {
    name: "Le Plafond de Verre Numerique",
    manifesto:
      "L'ennemi de Shuri Academy est le systeme qui dit aux jeunes Africains 'tu n'as pas le bon diplome, le bon reseau, le bon pays pour travailler dans la tech'. Le Plafond de Verre Numerique est invisible mais reel : les offres d'emploi tech exigent des diplomes de Stanford, les bootcamps coutent 5 000 USD, et les plateformes en ligne ont un taux de completion de 8% en Afrique.",
    narrative:
      "Chaque annee, 10 millions de jeunes Africains entrent sur le marche du travail. Moins de 1% ont acces a une formation tech de qualite. Shuri Academy existe pour briser ce plafond.",
    enemySchwartzValues: ["CONFORMITE" as const, "POUVOIR" as const],
  },

  doctrine: {
    dogmas: [
      "Le talent est partout, l'opportunite est ici. Shuri Academy ne selectionne pas par le CV mais par la motivation.",
      "Apprendre seul est un privilege — le mentorat est un droit. Chaque apprenant merite un guide humain.",
      "La certification sans projet reel est un diplome vide. Chaque badge Shuri est adosse a une creation concrete.",
    ],
    principles: [
      "Chaque cours doit fonctionner en bande passante 256kbps — l'accessibilite technique est non-negociable",
      "Les mentors sont des alumni, pas des consultants externes — la transmission est endogene",
      "Le contenu est cree par des experts africains qui comprennent le contexte local",
    ],
    practices: [
      "Hackathon trimestriel 'Build Africa' — 48h pour resoudre un probleme reel africain",
      "Revue de programme semestrielle avec les entreprises partenaires pour aligner les competences",
    ],
  },

  nomMarque: "Shuri Academy",
  accroche: "Le code est le nouveau pouvoir.",
  description:
    "Plateforme EdTech panafricaine de formation aux competences technologiques. Cours en ligne, mentorat structure, certifications reconnues par l'industrie.",
  brandNature:
    "EdTech de conviction — pas un agregateur de MOOC mais un ecosysteme complet apprenant-mentor-recruteur construit pour le contexte africain.",
  secteur: "EdTech / Formation Professionnelle",
  pays: "WK",
  langue: "fr",
  publicCible:
    "Jeunes Africains 18-35 ans sans formation tech formelle, professionnels en reconversion, entreprises formant leurs equipes, ONG finançant la formation",
  promesseFondamentale:
    "Shuri Academy transforme la motivation en competence certifiee en 6 mois — avec un mentor humain, pas un chatbot.",
  equipeDirigeante: [
    {
      nom: "Shuri Udaku",
      role: "Fondatrice / CEO",
      bio: "Prodige tech wakandaise. BSc MIT, 2 ans chez Google AI. A construit la plateforme LMS Shuri en 6 mois. Vision : former 200 000 developpeurs africains d'ici 2028.",
      experiencePasse: ["Google AI — 2 ans", "MIT — BSc Computer Science"],
      competencesCles: ["IA / Machine Learning", "EdTech", "Architecture plateforme", "Leadership tech"],
      credentials: ["BSc MIT Computer Science", "Ex-Google AI Engineer", "45 000 apprenants formes"],
    },
  ],
};

// ── Pilier D — Distinction (Positionnement) ──────────────────────────────────

export const shuriPillarD = {
  personas: [
    {
      name: "Ibrahim Keita",
      age: 23,
      csp: "Etudiant en gestion / Autodicacte tech",
      location: "Birnin Zana, Wakanda",
      income: "35 000 XAF/mois (bourse)",
      familySituation: "Celibataire, vit chez ses parents",
      lf8Dominant: ["ACCOMPLISSEMENT" as const, "APPROBATION_SOCIALE" as const],
      schwartzValues: ["ACCOMPLISSEMENT" as const, "STIMULATION" as const],
      lifestyle:
        "Etudie la gestion mais reve de tech. Passe ses soirees a suivre des tutoriels YouTube. A commence 4 formations en ligne sans en terminer une seule. Probleme : pas de structure, pas de mentor, pas de motivation durable.",
      motivations: "Decrocher un premier emploi tech ou un stage remunere en developpement web.",
      fears: "Perdre encore 6 mois sur une formation qui ne mene nulle part. Que ses parents pensent qu'il perd son temps.",
      hiddenDesire: "Devenir le premier developpeur de sa famille et prouver que l'universite n'est pas le seul chemin.",
      whatTheyActuallyBuy:
        "De la structure et de la credibilite. Abonnement Student 3 000 XAF/mois. Objectif : certification Web Dev en 6 mois.",
      jobsToBeDone: [
        "Suivre un parcours structure qui mene a un emploi en 6 mois",
        "Avoir un mentor qui le motive quand il veut abandonner",
        "Obtenir une certification reconnue par les employeurs locaux",
      ],
      devotionPotential: "ENGAGE" as const,
      rank: 1,
    },
    {
      name: "Amara Diop",
      age: 32,
      csp: "Comptable en reconversion",
      location: "Dakar, Senegal",
      income: "280 000 XAF/mois",
      familySituation: "Mariee, 1 enfant",
      lf8Dominant: ["SURVIE_SANTE" as const, "CONDITIONS_CONFORT" as const],
      schwartzValues: ["SECURITE" as const, "ACCOMPLISSEMENT" as const],
      lifestyle:
        "Comptable depuis 8 ans. Voit l'automatisation menacer son metier. Veut se reconvertir en data analyst. A besoin d'une formation flexible compatible avec son emploi et sa vie de famille.",
      motivations: "Securiser son avenir professionnel en ajoutant des competences data a son profil comptable.",
      fears: "Que la formation soit trop technique pour elle. Que son employeur ne reconnaisse pas la certification.",
      hiddenDesire: "Devenir Head of Data dans son entreprise actuelle d'ici 3 ans.",
      whatTheyActuallyBuy:
        "De la securite professionnelle. Abonnement Pro 8 000 XAF/mois pour le parcours Data Science + mentorat individuel.",
      jobsToBeDone: [
        "Apprendre la data analysis sans quitter son emploi",
        "Obtenir une certification que son employeur reconnait",
        "Avoir un parcours flexible (soirs et weekends)",
      ],
      devotionPotential: "AMBASSADEUR" as const,
      rank: 2,
    },
    {
      name: "TechCorp Wakanda (persona corporate)",
      age: 0,
      csp: "Entreprise tech / 150 employes",
      location: "Birnin Zana, Wakanda",
      income: "Budget formation : 8M XAF/an",
      familySituation: "PME tech en croissance rapide",
      lf8Dominant: ["ACCOMPLISSEMENT" as const, "SUPERIORITE_STATUT" as const],
      schwartzValues: ["ACCOMPLISSEMENT" as const, "POUVOIR" as const],
      lifestyle:
        "Startup tech wakandaise en serie B. Recrute 30 developpeurs/an mais galere a trouver des profils qualifies. A teste Udemy et LinkedIn Learning — taux de completion <10% chez les employes.",
      motivations: "Former rapidement les nouvelles recrues aux technologies internes et combler les lacunes techniques de l'equipe existante.",
      fears: "Investir dans la formation et voir les employes partir chez la concurrence.",
      hiddenDesire: "Avoir un vivier de talents formes sur mesure via un partenariat Shuri Academy exclusif.",
      whatTheyActuallyBuy:
        "Du pipeline talent. Abonnement Enterprise custom (500 000 XAF/mois pour 50 places). ROI mesure en reduction du temps d'onboarding.",
      jobsToBeDone: [
        "Former 30 nouvelles recrues par an en 3 mois au lieu de 6",
        "Reduire le turnover en offrant des parcours de montee en competence",
        "Acceder au job board Shuri pour recruter directement les meilleurs alumni",
      ],
      devotionPotential: "EVANGELISTE" as const,
      rank: 3,
    },
    {
      name: "Fondation Digital Africa (persona ONG)",
      age: 0,
      csp: "ONG / Bailleur de fonds",
      location: "Nairobi, Kenya (panafricaine)",
      income: "Budget programmes : 200M XAF/an",
      familySituation: "ONG finançant l'inclusion numerique",
      lf8Dominant: ["PROTECTION_PROCHES" as const, "UNIVERSALISME" as const],
      schwartzValues: ["UNIVERSALISME" as const, "BIENVEILLANCE" as const],
      lifestyle:
        "Finance des programmes de formation tech pour les jeunes Africains. Cherche des partenaires avec des resultats mesurables (taux d'emploi post-formation).",
      motivations: "Maximiser l'impact par franc investi. Shuri Academy affiche un taux d'emploi de 68% a 12 mois post-certification.",
      fears: "Que les fonds soient gaspilles sur une plateforme qui ne tient pas ses promesses de resultat.",
      hiddenDesire: "Devenir le partenaire principal de Shuri Academy et co-financer l'expansion a 50 pays.",
      whatTheyActuallyBuy:
        "De l'impact mesurable. Programme de 500 bourses/an finance par la Fondation. KPI : taux d'emploi >60% a 12 mois.",
      jobsToBeDone: [
        "Financer 500 bourses par an avec mesure d'impact rigoureuse",
        "Communiquer sur les success stories pour justifier les budgets aupres des donateurs",
        "S'assurer que la formation atteint les publics les plus defavorises",
      ],
      devotionPotential: "EVANGELISTE" as const,
      rank: 4,
    },
  ],

  paysageConcurrentiel: [
    {
      name: "Andela",
      partDeMarcheEstimee: 25,
      avantagesCompetitifs: [
        "Placement direct chez des entreprises tech internationales (Google, Facebook, Microsoft) — pipeline emploi prouve",
      ],
      faiblesses: [
        "Tres selectif (2% d'acceptation) — inaccessible pour la majorite",
        "Formation longue (12-18 mois) et lourde — pas adapte aux professionnels en reconversion",
      ],
      strategiePos: "L'elite selectif qui forme les meilleurs 2% mais ignore les 98% restants",
    },
    {
      name: "Coursera / Udemy (plateformes occidentales)",
      partDeMarcheEstimee: 35,
      avantagesCompetitifs: [
        "Catalogue massif (100 000+ cours). Partenariats avec MIT, Stanford. Marque reconnue mondialement.",
      ],
      faiblesses: [
        "Taux de completion de 8% en Afrique — pas de mentorat, pas d'adaptation au contexte local",
        "Prix en dollars — prohibitifs pour les etudiants africains",
        "Contenu deconnecte des realites du marche tech africain",
      ],
      strategiePos: "Le supermarche du MOOC — beaucoup de choix, peu de resultats en contexte africain",
    },
  ],

  positionnement:
    "Shuri Academy est la seule plateforme EdTech qui combine contenu africain, mentorat humain et pipeline emploi — pas juste des videos, mais un ecosysteme qui transforme en 6 mois.",

  tonDeVoix: {
    personnalite: [
      "Exigeante mais bienveillante — pousse a l'excellence sans ecraser",
      "Pragmatique — chaque cours mene a un resultat concret (projet, certification, emploi)",
      "Communautaire — l'apprentissage est un sport d'equipe, pas un marathon solitaire",
    ],
    onDit: [
      "Apprenant / Alumni — pas etudiant ni utilisateur",
      "Certification Shuri — la preuve de competence reconnue par l'industrie",
      "Code & Mentor — l'humain fait la difference",
    ],
    onNeditPas: [
      "MOOC / cours en ligne — Shuri Academy est un ecosysteme, pas un catalogue de videos",
      "Diplome — les certifications Shuri sont basees sur des projets reels, pas des QCM",
      "Formation gratuite — le gratuit est l'entree, la valeur est dans le parcours complet",
    ],
  },
};

// ── Pilier V — Valeur (Offre & Pricing) ─────────────────────────────────────

export const shuriPillarV = {
  businessModel: "ABONNEMENT",
  economicModels: ["FREEMIUM", "ABONNEMENT_B2C", "ABONNEMENT_B2B", "SUBVENTIONS_ONG"],
  positioningArchetype: "ACCESSIBLE",
  salesChannel: "DIRECT",
  freeLayer: {
    whatIsFree: "5 cours d'introduction (Python 101, HTML/CSS, Intro Data, UX Basics, Cybersec 101) + forum communautaire en lecture",
    whatIsPaid: "Parcours complets avec mentorat, certifications, job board, Discord communaute active",
    conversionLever: "Le cours gratuit donne un apercu de la methode Shuri — le mentorat et le projet final sont les declencheurs d'upgrade",
  },

  produitsCatalogue: [
    {
      id: "SA-FREE-001",
      nom: "Shuri Free",
      categorie: "SERVICE_DIGITAL",
      prix: 0,
      cout: 80,
      margeUnitaire: -80,
      gainClientConcret: "5 cours d'introduction tech. Acces forum. Certificat d'initiation.",
      gainClientAbstrait: "Decouvrir la tech sans risque financier. Valider son interet avant de s'engager.",
      gainMarqueConcret: "Funnel d'acquisition : 25% des Free convertissent en Student sous 60 jours.",
      gainMarqueAbstrait: "Chaque apprenant gratuit est un futur ambassadeur de l'ecosysteme Shuri.",
      coutClientConcret: "0 XAF.",
      coutClientAbstrait: "Frustration de ne pas avoir le mentorat ni le projet certifiant.",
      coutMarqueConcret: 80,
      coutMarqueAbstrait: "Risque de perception 'cours gratuit = qualite basse'.",
      lienPromesse: "Shuri Free est le premier pas — decouvrir que le code est accessible a tous.",
      segmentCible: "Ibrahim Keita",
      phaseLifecycle: "GROWTH",
      leviersPsychologiques: ["Gratuite (zero risque)", "Curiosite tech", "Preuve sociale alumni"],
      lf8Trigger: ["ACCOMPLISSEMENT" as const],
      maslowMapping: "ESTEEM",
      scoreEmotionnelADVE: 60,
      canalDistribution: ["APP"],
      disponibilite: "ALWAYS",
      skuRef: "SA-FREE",
    },
    {
      id: "SA-STU-002",
      nom: "Shuri Student",
      categorie: "ABONNEMENT",
      prix: 3000,
      cout: 650,
      margeUnitaire: 2350,
      gainClientConcret: "Parcours complet avec mentorat 1:10. Certification a la cle. Acces Discord et forum actif.",
      gainClientAbstrait: "Se sentir accompagne et soutenu dans son apprentissage. Ne plus etre seul.",
      gainMarqueConcret: "Coeur du MRR. 18 000 abonnes actifs. Conversion vers Pro : 22%.",
      gainMarqueAbstrait: "Chaque Student qui certifie est une preuve vivante de l'efficacite de la methode.",
      coutClientConcret: "3 000 XAF/mois.",
      coutClientAbstrait: "Engagement de 6 mois pour aller jusqu'a la certification.",
      coutMarqueConcret: 650,
      coutMarqueAbstrait: "Taux de churn M3 a surveiller (moment critique de l'abandon).",
      lienPromesse: "Shuri Student est le parcours qui transforme un curieux en professionnel certifie en 6 mois.",
      segmentCible: "Ibrahim Keita",
      phaseLifecycle: "GROWTH",
      leviersPsychologiques: ["Mentorat humain (differenciant)", "Certification reconnue", "Prix accessible"],
      lf8Trigger: ["ACCOMPLISSEMENT" as const, "APPROBATION_SOCIALE" as const],
      maslowMapping: "ESTEEM",
      scoreEmotionnelADVE: 75,
      canalDistribution: ["APP"],
      disponibilite: "ALWAYS",
      skuRef: "SA-STUDENT",
    },
    {
      id: "SA-PRO-003",
      nom: "Shuri Pro",
      categorie: "ABONNEMENT",
      prix: 8000,
      cout: 1800,
      margeUnitaire: 6200,
      gainClientConcret: "Tous les parcours illimites. Mentorat 1:5. Job board prioritaire. Projets freelance recommandes.",
      gainClientAbstrait: "Se sentir professionnel tech reconnu. Avoir un avantage competitif sur le marche de l'emploi.",
      gainMarqueConcret: "ARPU eleve. 4 500 abonnes Pro. Taux de retention M12 : 72%.",
      gainMarqueAbstrait: "Les Pro sont les futurs mentors — le cercle vertueux de l'ecosysteme.",
      coutClientConcret: "8 000 XAF/mois.",
      coutClientAbstrait: "Engagement financier plus lourd — doit montrer des resultats rapides.",
      coutMarqueConcret: 1800,
      coutMarqueAbstrait: "Attentes elevees — si le job board ne delivre pas, le churn est brutal.",
      lienPromesse: "Shuri Pro est le niveau ou l'apprentissage devient carriere — certifie, mentore, recrute.",
      segmentCible: "Amara Diop",
      phaseLifecycle: "GROWTH",
      leviersPsychologiques: ["Acces job board (aspirationnel)", "Mentorat intensif", "Parcours illimites"],
      lf8Trigger: ["ACCOMPLISSEMENT" as const, "SURVIE_SANTE" as const],
      maslowMapping: "SELF_ACTUALIZATION",
      scoreEmotionnelADVE: 82,
      canalDistribution: ["APP"],
      disponibilite: "ALWAYS",
      skuRef: "SA-PRO",
    },
    {
      id: "SA-ENT-004",
      nom: "Shuri Enterprise",
      categorie: "ABONNEMENT",
      prix: 500000,
      cout: 120000,
      margeUnitaire: 380000,
      gainClientConcret: "50 places. Dashboard RH. Parcours personnalises. Rapport progression. Recrutement Shuri prioritaire.",
      gainClientAbstrait: "Avoir un partenaire formation tech qui comprend les besoins du marche local.",
      gainMarqueConcret: "Contracts B2B a forte valeur. 12 entreprises clientes. ARPU : 500K/mois.",
      gainMarqueAbstrait: "Credibilite institutionnelle et stabilite revenus.",
      coutClientConcret: "500 000 XAF/mois pour 50 places (10 000 XAF/place).",
      coutClientAbstrait: "Logistique interne pour assurer la participation des employes.",
      coutMarqueConcret: 120000,
      coutMarqueAbstrait: "Dependance aux grands comptes — risque si un client Enterprise churne.",
      lienPromesse: "Shuri Enterprise est l'usine a talents tech integree — former, certifier, deployer.",
      segmentCible: "TechCorp Wakanda",
      phaseLifecycle: "LAUNCH",
      leviersPsychologiques: ["ROI mesurable (reduction onboarding)", "Pipeline talent garanti", "Dashboard RH"],
      lf8Trigger: ["ACCOMPLISSEMENT" as const, "SUPERIORITE_STATUT" as const],
      maslowMapping: "SELF_ACTUALIZATION",
      scoreEmotionnelADVE: 70,
      canalDistribution: ["APP", "PARTNERSHIP"],
      disponibilite: "ALWAYS",
      skuRef: "SA-ENTERPRISE",
    },
  ],

  productLadder: [
    { tier: "Free", prix: 0, produitIds: ["SA-FREE-001"], cible: "Ibrahim Keita", description: "Decouverte sans risque. 5 cours intro.", position: 1 },
    { tier: "Student", prix: 3000, produitIds: ["SA-STU-002"], cible: "Ibrahim Keita", description: "Parcours certifiant avec mentorat.", position: 2 },
    { tier: "Pro", prix: 8000, produitIds: ["SA-PRO-003"], cible: "Amara Diop", description: "Acces illimite + job board + mentorat intensif.", position: 3 },
    { tier: "Enterprise", prix: 500000, produitIds: ["SA-ENT-004"], cible: "TechCorp Wakanda", description: "Formation d'equipe sur mesure.", position: 4 },
  ],

  unitEconomics: {
    cac: 2200,
    ltv: 68000,
    ltvCacRatio: 31,
    pointMort: "Atteint au 4eme mois pour un Student (abonnement cumule + faible cout variable)",
    margeNette: 45,
    roiEstime: 75,
    paybackPeriod: 3,
    budgetCom: 5000000,
    caVise: 340000000,
  },
};

// ── Pilier E — Engagement ───────────────────────────────────────────────────

export const shuriPillarE = {
  promesseExperience:
    "Chaque interaction avec Shuri Academy doit donner le sentiment de progresser. " +
    "L'apprenant ne doit jamais se sentir seul, juge ou abandonne — le mentorat est le coeur du contrat.",
  primaryChannel: "APP",

  superfanPortrait: {
    personaRef: "Ibrahim Keita",
    motivations: [
      "A obtenu son premier emploi tech grace a Shuri — gratitude profonde",
      "Veut que d'autres jeunes comme lui aient la meme chance",
      "Devenir mentor lui donne un statut et une purpose",
    ],
    barriers: [
      "Fatigue du mentorat si trop d'apprenants assignes",
      "Sentiment que la plateforme profite de son travail gratuit",
    ],
    profile:
      "23 ans, certifie Web Dev, premier emploi chez une startup locale. " +
      "Mentore 10 apprenants depuis 4 mois. Poste ses progres sur LinkedIn (1 200 followers gagnes).",
  },

  touchpoints: [
    { canal: "Plateforme LMS — Cours et modules", type: "DIGITAL", channelRef: "APP", role: "Apprentissage quotidien : videos, exercices, projets", aarrStage: "RETENTION", devotionLevel: ["INTERESSE", "PARTICIPANT"], priority: 1, frequency: "DAILY" },
    { canal: "Discord Communaute — Entraide", type: "DIGITAL", channelRef: "APP", role: "Questions, entraide, partage de projets entre apprenants", aarrStage: "RETENTION", devotionLevel: ["INTERESSE", "PARTICIPANT", "ENGAGE"], priority: 2, frequency: "DAILY" },
    { canal: "Mentorat 1:10 — Sessions video", type: "HUMAIN", channelRef: "APP", role: "Accompagnement personnalise hebdomadaire avec un alumni mentor", aarrStage: "RETENTION", devotionLevel: ["INTERESSE", "PARTICIPANT"], priority: 3, frequency: "WEEKLY" },
    { canal: "Instagram — Temoignages alumni", type: "DIGITAL", channelRef: "INSTAGRAM", role: "Success stories et behind the scenes pour attirer de nouveaux apprenants", aarrStage: "ACQUISITION", devotionLevel: ["SPECTATEUR"], priority: 4, frequency: "WEEKLY" },
    { canal: "LinkedIn — Certifications et recrutement", type: "DIGITAL", channelRef: "PARTNERSHIP", role: "Badge certification LinkedIn + offres job board partenaire", aarrStage: "REFERRAL", devotionLevel: ["PARTICIPANT", "ENGAGE"], priority: 5, frequency: "AD_HOC" },
    { canal: "Hackathon Build Africa — Trimestriel", type: "PHYSIQUE", channelRef: "EVENT", role: "48h de creation collaborative pour resoudre un probleme africain reel", aarrStage: "ACTIVATION", devotionLevel: ["PARTICIPANT", "ENGAGE", "AMBASSADEUR"], priority: 6, frequency: "SEASONAL" },
    { canal: "Newsletter Shuri Weekly — Tendances tech", type: "DIGITAL", channelRef: "EMAIL", role: "Contenu tech, offres d'emploi, actualites de la communaute", aarrStage: "RETENTION", devotionLevel: ["INTERESSE", "PARTICIPANT"], priority: 7, frequency: "WEEKLY" },
  ],

  aarrr: {
    acquisition: "Instagram temoignages alumni (35%), SEO contenu tech (25%), bouche-a-oreille communaute (22%), partenariats ONG (18%). CPA cible : 2 200 XAF.",
    activation: "Completion du premier module gratuit en <48h (taux : 58%). Inscription payante apres cours gratuit : 25% en 60 jours.",
    retention: "Mentorat hebdomadaire (retention M6 : 65%). Discord actif (300+ messages/jour). Notifications progression. Retention M12 Pro : 72%.",
    revenue: "Student : 3 000 XAF/mois (18 000 abonnes). Pro : 8 000 XAF/mois (4 500 abonnes). Enterprise : 500 000 XAF/mois (12 clients). MRR total : 28M XAF.",
    referral: "Alumni job post LinkedIn (taux referral : 18%). Programme parrainage 1 mois gratuit. Hackathon media coverage.",
  },
};

// ── Pilier R — Risk (Diagnostic) ────────────────────────────────────────────

export const shuriPillarR = {
  globalSwot: {
    strengths: [
      "Programme mentorat unique (taux completion 62% vs 8% industrie)",
      "35 partenariats entreprises pour le recrutement direct",
      "Plateforme optimisee basse bande passante (256kbps minimum)",
      "Fondatrice Shuri Udaku — credibilite MIT + Google",
    ],
    weaknesses: [
      "Dependance aux mentors benevoles (turnover 25%/an)",
      "Contenu encore limite a 5 parcours (vs 100 000 chez Coursera)",
      "Concentration 65% des apprenants au Wakanda — pas encore panafricain en pratique",
    ],
    opportunities: [
      "3.5M developpeurs necessaires en Afrique d'ici 2030",
      "Subventions ONG massives pour la formation numerique africaine",
      "Partenariats gouvernementaux pour les programmes de reconversion",
      "Certification Shuri comme standard panafricain reconnu par les recruteurs",
    ],
    threats: [
      "Google lance 'Google Career Certificates Africa' — gratuit et massif",
      "Andela baisse ses criteres de selection et cible le meme marche",
      "Recession economique reduisant les budgets formation des entreprises",
    ],
  },

  probabilityImpactMatrix: [
    {
      risk: "Google Career Certificates Africa lance une offre gratuite massive — cannibalise l'acquisition",
      probability: "MEDIUM",
      impact: "HIGH",
      mitigation: "Differenciation par le mentorat humain et le job board local — ce que Google ne peut pas repliquer a l'echelle africaine",
    },
    {
      risk: "Penurie de mentors benevoles limitant la croissance (ratio 1:10 non tenable a 100 000 apprenants)",
      probability: "HIGH",
      impact: "MEDIUM",
      mitigation: "Programme de compensation mentors (15 000 XAF/mois) + IA de support pour les questions techniques courantes",
    },
    {
      risk: "Taux d'emploi post-certification qui baisse si le marche tech local sature",
      probability: "LOW",
      impact: "HIGH",
      mitigation: "Diversification vers le freelance international et les competences non-tech (product management, data, UX)",
    },
  ],

  riskScore: 30,
};

// ── Pilier T — Track (Realite Marche) ───────────────────────────────────────

export const shuriPillarT = {
  tamSamSom: {
    tam: {
      value: 180000000000,
      description: "Marche total de la formation tech en Afrique — 180 milliards XAF en 2025 (inclut universites, bootcamps, MOOC, formation corporate)",
      source: "ai_estimate",
      sourceRef: "HolonIQ EdTech Africa 2025 + extrapolation",
    },
    sam: {
      value: 12000000000,
      description: "Segment formation tech en ligne pour les 18-35 ans francophones Afrique — 12 milliards XAF",
      source: "ai_estimate",
      sourceRef: "Estimation basee sur penetration internet + pouvoir d'achat cible",
    },
    som: {
      value: 850000000,
      description: "Part atteignable a 18 mois : 7% du SAM soit 850M XAF de revenus annualises",
      source: "calculated",
      sourceRef: "Projection basee sur MRR actuel de 28M + croissance 15%/mois",
    },
  },

  brandMarketFitScore: 78,

  traction: {
    utilisateursInscrits: 68000,
    utilisateursActifs: 45000,
    croissanceHebdo: 3.8,
    revenusRecurrents: 28000000,
    metriqueCle: {
      nom: "Apprenants actifs mensuels",
      valeur: 45000,
      tendance: "UP",
    },
    preuvesTraction: [
      "45 000 apprenants actifs dans 12 pays",
      "Taux de completion 62% (vs 8% industrie)",
      "Taux d'emploi post-certification : 68% a 12 mois",
      "35 entreprises partenaires recrutement",
      "28M XAF MRR en croissance de 15%/mois",
    ],
    tractionScore: 8,
  },

  triangulation: {
    customerInterviews: "80 interviews (30 apprenants actifs, 20 alumni, 15 mentors, 15 non-inscrits). Insight cle : le mentorat est le facteur n.1 de retention. Le prix n'est pas une barriere pour les motives — c'est le temps disponible.",
    competitiveAnalysis: "Benchmark 8 plateformes EdTech presentes en Afrique francophone. Shuri Academy se differencie par : (1) mentorat humain structure, (2) parcours adapte au contexte africain, (3) job board integre avec entreprises locales.",
    trendAnalysis: "Croissance EdTech Afrique : +28%/an. Penetration internet Afrique francophone : 42% (en hausse). Budget formation corporate en hausse de 15%/an. Tendance defavorable : inflation qui comprime les budgets individuels.",
    financialBenchmarks: "Shuri Academy surperforme en retention (62% completion vs 8% moyenne) et en impact (68% taux emploi post-certification). Sous-performe en reach absolu (45K vs millions chez Coursera).",
  },
};

// ── Pilier I — Innovation (Potentiel) ───────────────────────────────────────

export const shuriPillarI = {
  catalogueParCanal: {
    APP: [
      { action: "IA Tutor — assistant IA pour repondre aux questions techniques 24/7 (complement du mentorat humain)", format: "Feature in-app", objectif: "Reduire la charge mentors et ameliorer le temps de reponse" },
      { action: "Parcours 'No Code / Low Code' pour les non-developpeurs (product managers, marketeurs)", format: "Nouveau parcours", objectif: "Elargir l'audience au-dela des developpeurs purs" },
      { action: "Mode offline complet — telecharger les cours et travailler sans connexion", format: "Feature in-app", objectif: "Atteindre les apprenants en zones a faible connectivite" },
    ],
    INSTAGRAM: [
      { action: "Serie 'De 0 a Recrute' — 1 alumni par semaine raconte son parcours en Reel de 60s", format: "Reel 60s", objectif: "Preuve sociale et conversion par identification" },
    ],
    EVENT: [
      { action: "Hackathon 'Build Africa' trimestriel — 48h, equipes mixtes, problemes reels africains", format: "Evenement physique + virtuel", objectif: "Visibilite media + experience de collaboration reelle" },
      { action: "Shuri Demo Day — les certifies presentent leurs projets aux entreprises partenaires", format: "Evenement semi-annuel", objectif: "Pipeline recrutement direct + motivation apprenants" },
    ],
    PARTNERSHIP: [
      { action: "Partenariat BLISS by Wakanda — module 'Tech for Beauty Brands' integre au programme", format: "Co-branding educatif", objectif: "Cross-promotion + contenu concret pour les apprenants" },
    ],
  },

  innovationsProduit: [
    {
      name: "IA Tutor Shuri",
      type: "EXTENSION_GAMME",
      description: "Assistant IA entraine sur le contenu Shuri pour repondre aux questions techniques en temps reel. Complement du mentorat humain, pas remplacement.",
      feasibility: "HIGH",
      horizon: "COURT",
      devotionImpact: "PARTICIPANT",
    },
    {
      name: "Campus physique Birnin Zana",
      type: "EXTENSION_MARQUE",
      description: "Premier espace physique Shuri : coworking, salles de cours, salle hackathon. 50 places. Ouverture 2027.",
      feasibility: "MEDIUM",
      horizon: "MOYEN",
      devotionImpact: "ENGAGE",
    },
  ],

  generationMeta: {
    gloryToolsUsed: ["mestor-rtis-cascade", "notoria-action-generator"],
    qualityScore: 72,
    generatedAt: "2026-03-15T10:00:00Z",
  },
};

// ── Pilier S — Strategie (Roadmap) ──────────────────────────────────────────

export const shuriPillarS = {
  fenetreOverton: {
    perceptionActuelle: "Plateforme EdTech locale prometteuse — connue au Wakanda, emergente en Afrique francophone. Les alumni sont ses meilleurs ambassadeurs.",
    perceptionCible: "Standard de reference pour la certification tech en Afrique — la premiere reponse quand un employeur demande 'ou trouver des talents tech africains'.",
    ecart: "L'ecart est le passage de 12 a 50 pays et de 45 000 a 200 000 apprenants — scaling la methode mentorat sans la diluer.",
    strategieDeplacement: [
      {
        etape: "Phase 1 : Solidifier le mentorat (T1-T2 2026)",
        action: "Lancer la compensation mentors + deployer l'IA Tutor pour reduire la charge. Objectif : 600 mentors actifs.",
        canal: "APP",
        horizon: "0-6 mois",
        devotionTarget: "ENGAGE",
      },
      {
        etape: "Phase 2 : Expansion francophone (T3-T4 2026)",
        action: "Campagne acquisition Senegal, Cote d'Ivoire, Cameroun. Partenariats universites locales. Hackathon multi-pays.",
        canal: "PARTNERSHIP",
        horizon: "6-12 mois",
        devotionTarget: "SPECTATEUR",
      },
    ],
  },

  visionStrategique:
    "En 12 mois, Shuri Academy passera de plateforme wakandaise a ecosysteme panafricain francophone. " +
    "Le scaling repose sur 2 leviers : l'IA Tutor pour absorber la croissance et les partenariats locaux pour ancrer la presence.",

  roadmap: [
    {
      phase: "T1-T2 2026 — Consolidation",
      objectif: "Stabiliser le mentorat, deployer l'IA Tutor, atteindre 60 000 apprenants actifs",
      objectifDevotion: "INTERESSE -> PARTICIPANT (taux certification >55%)",
      actions: ["Compensation mentors", "IA Tutor beta", "3 nouveaux parcours (No Code, Product, Data Viz)"],
      budget: 12000000,
      duree: "6 mois",
    },
    {
      phase: "T3-T4 2026 — Expansion",
      objectif: "Presence dans 25 pays francophones. 100 000 apprenants actifs. 50M XAF MRR.",
      objectifDevotion: "SPECTATEUR -> INTERESSE (conversion cours gratuit >30%)",
      actions: ["Campagne acquisition 5 pays", "Partenariats 10 universites", "Hackathon Build Africa continental", "Shuri Demo Day #2"],
      budget: 18000000,
      duree: "6 mois",
    },
  ],

  globalBudget: 30000000,
  budgetBreakdown: {
    production: 8000000,
    media: 6000000,
    talent: 8000000,
    logistics: 3000000,
    technology: 5000000,
  },

  sprint90Days: [
    { action: "Deployer IA Tutor beta pour les 3 parcours les plus suivis", owner: "CTO", kpi: "Temps de reponse questions <2h (vs 24h actuel)", priority: 1, isRiskMitigation: true, devotionImpact: "PARTICIPANT" },
    { action: "Lancer la compensation mentors (15 000 XAF/mois pour les top 100 mentors)", owner: "Head of Community", kpi: "Turnover mentors <15% (vs 25% actuel)", priority: 2, isRiskMitigation: true, devotionImpact: "ENGAGE" },
    { action: "Creer le parcours No Code / Low Code (10 modules)", owner: "Head of Content", kpi: "500 inscrits en 30 jours", priority: 3, isRiskMitigation: false, devotionImpact: "SPECTATEUR" },
    { action: "Signer 5 nouvelles entreprises partenaires pour le job board", owner: "Head of Partnerships", kpi: "50 offres d'emploi actives sur le job board", priority: 4, isRiskMitigation: false, devotionImpact: "PARTICIPANT" },
  ],

  northStarKPI: {
    name: "Taux d'emploi post-certification a 12 mois",
    target: ">70% des certifies trouvent un emploi ou freelance remunere dans les 12 mois",
    frequency: "QUARTERLY",
    currentValue: "68%",
  },

  recommandationsPrioritaires: [
    { recommendation: "Investir dans l'IA Tutor AVANT de scaler l'acquisition — le mentorat humain ne tiendra pas a 100 000 apprenants sans support IA", source: "R", priority: 1 },
    { recommendation: "Remunerer les top mentors pour reduire le turnover — ils sont l'actif le plus precieux de la plateforme", source: "E", priority: 2 },
    { recommendation: "Diversifier les parcours au-dela du dev pur — No Code, Product, Data — pour elargir l'audience", source: "V", priority: 3 },
  ],
};
