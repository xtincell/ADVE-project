/**
 * VIBRANIUM TECH — Pillar Content Data (A, D, V, E, R, T, I partial, S partial)
 * Score: 18/25 per completed pillar — ADEPTE progression
 * Fintech / Mobile Money — V-Pay digital wallet, vibranium-backed micro-loans
 */

// ── Pilier A — Authenticite (Identite) ──────────────────────────────────────

export const vibraniumPillarA = {
  archetype: "REBELLE" as const,
  archetypeSecondary: "CREATEUR" as const,
  citationFondatrice:
    "\"L'argent dort dans les banques pendant que l'Afrique travaille a mains nues. V-Pay reveille le capital.\" — T'Challa Bassari, fondateur Vibranium Tech, 2022.",
  noyauIdentitaire:
    "Vibranium Tech est ne d'une observation simple : 70% des Wakandais ont un smartphone mais seulement 23% ont un compte bancaire. T'Challa Bassari, ingenieur telecom devenu fintech entrepreneur, a cree V-Pay pour que chaque transaction — du paiement au marche aux micro-prets — transite par un portefeuille numerique adosse au vibranium. Pas une banque. Un outil de liberation economique.",

  herosJourney: [
    {
      actNumber: 1 as const,
      title: "Le Constat — Les Files d'Attente",
      narrative:
        "T'Challa Bassari grandit a Birnin Zana mais voit sa mere, vendeuse au marche central, perdre 2 heures chaque semaine a la banque pour deposer ses recettes. A 16 ans, il code sa premiere app de transfert d'argent entre telephones basiques. Le prototype fonctionne mais personne ne lui fait confiance. Le probleme n'est pas la technologie — c'est la confiance.",
      emotionalArc: "Frustration → Indignation → Premiere etincelle",
    },
    {
      actNumber: 2 as const,
      title: "La Formation — Silicon Savannah",
      narrative:
        "T'Challa etudie l'informatique a Nairobi puis travaille 3 ans chez M-Pesa au Kenya. Il comprend les mecanismes du mobile money et surtout ses limites : frais eleves, pas de credit, pas d'epargne. A Lagos, il observe les tontines informelles et realise que le systeme financier africain existe deja — il est simplement invisible pour les banques.",
      emotionalArc: "Apprentissage → Deconstruction → Vision claire",
      causalLink: "L'experience M-Pesa revele les failles que Vibranium Tech va combler",
    },
    {
      actNumber: 3 as const,
      title: "Le Retour — Le Premier Portefeuille",
      narrative:
        "T'Challa revient au Wakanda avec un business plan et 3 developpeurs. En 6 mois, V-Pay est lance au marche central de Birnin Zana. Les 500 premiers utilisateurs sont des vendeurs de marche — pas des early adopters tech, mais des commercants pragmatiques. Le vibranium-backing (chaque XAF depose est adosse a une micro-reserve vibranium) cree la confiance que les banques n'ont jamais su donner.",
      emotionalArc: "Tension → Lancement → Premiers adopteurs",
      causalLink: "L'ancrage physique du vibranium transforme une app en coffre-fort de confiance",
    },
    {
      actNumber: 4 as const,
      title: "L'Acceleration — Le Micro-Credit V-Pay",
      narrative:
        "Apres 10 000 utilisateurs, T'Challa lance le micro-credit instantane : jusqu'a 50 000 XAF en 30 secondes, adosse a l'historique de transactions V-Pay. Pas de paperasse, pas de garantie, pas d'humiliation au guichet. En 3 mois, le taux de remboursement atteint 94%. Les vendeuses du marche financent leur stock, les etudiants paient leurs frais, les petits commercants investissent. L'argent circule enfin.",
      emotionalArc: "Confiance validee → Impact visible → Emulation",
      causalLink: "Le credit base sur les donnees reelles de transaction cree un cercle vertueux de confiance",
    },
    {
      actNumber: 5 as const,
      title: "Le Mouvement — La Finance Souveraine",
      narrative:
        "Vibranium Tech depasse le simple mobile money. L'epargne V-Pay (rendement 6% adosse au vibranium), les paiements marchands (QR code zero frais pour les petits commercants), et le programme V-Pay Campus (portefeuille etudiant) dessinent un ecosysteme financier complet. L'objectif 2028 : 500 000 portefeuilles actifs et la premiere licence bancaire digitale du Wakanda.",
      emotionalArc: "Ambition structuree → Vision systemique → Liberation financiere",
      causalLink: "Chaque produit ajoute renforce l'ecosysteme et augmente le cout de sortie pour l'utilisateur",
    },
  ],

  ikigai: {
    love: "Vibranium Tech aime voir l'argent circuler entre les mains de ceux qui travaillent. Chaque transaction V-Pay est un micro-acte de justice economique — le commercant garde 100% de sa marge, l'etudiant accede au credit sans supplice.",
    competence:
      "Maitrise unique de l'adossement vibranium pour securiser les depots numeriques — une innovation proprietaire que ni Orange Money ni Wave ne peuvent repliquer. Infrastructure technique construite pour fonctionner en 2G comme en 4G.",
    worldNeed:
      "350 millions d'Africains n'ont pas de compte bancaire mais 85% ont un telephone mobile. Le systeme bancaire traditionnel les ignore. V-Pay comble ce vide.",
    remuneration:
      "Modele freemium : V-Pay gratuit (0.5% sur retraits), V-Pay Pro a 1 500 XAF/mois (zero frais + credit), V-Pay Business a 5 000 XAF/mois (gestion commerciale). Marge nette sur le micro-credit : 8% net apres defaut.",
  },

  valeurs: [
    {
      value: "AUTONOMIE" as const,
      customName: "Liberte Financiere",
      rank: 1,
      justification:
        "V-Pay croit que chaque individu merite le controle total de son argent — sans intermediaire, sans frais caches, sans humiliation. L'autonomie financiere est le premier pas vers toutes les autres libertes.",
      costOfHolding:
        "Refuser les partenariats bancaires classiques limite l'acces aux gros capitaux necessaires pour le scaling.",
      tensionWith: ["SECURITE" as const],
    },
    {
      value: "UNIVERSALISME" as const,
      customName: "Finance Pour Tous",
      rank: 2,
      justification:
        "L'inclusion financiere n'est pas un segment de marche — c'est un droit. V-Pay est concu pour fonctionner sur le telephone le plus basique comme sur le dernier iPhone.",
      costOfHolding:
        "Maintenir la compatibilite 2G et les faibles frais reduit les marges par transaction.",
      tensionWith: ["POUVOIR" as const],
    },
    {
      value: "ACCOMPLISSEMENT" as const,
      customName: "Excellence Technique",
      rank: 3,
      justification:
        "L'infrastructure V-Pay traite 12 000 transactions par seconde avec un uptime de 99.97%. Dans un secteur ou la confiance est fragile, l'excellence technique est non-negociable.",
      costOfHolding:
        "Les couts serveur et securite representent 35% des charges operationnelles.",
    },
  ],

  hierarchieCommunautaire: [
    {
      level: "SPECTATEUR" as const,
      description: "Curieux — a telecharge l'app V-Pay mais n'a pas encore effectue de transaction. Compare avec Orange Money et Wave.",
      privileges: "Acces aux tutoriels video, simulateur de micro-credit, FAQ interactive.",
      entryCriteria: "Telechargement app + creation de compte",
    },
    {
      level: "INTERESSE" as const,
      description: "Utilisateur — a effectue sa premiere transaction (depot ou paiement). Commence a voir la difference en termes de rapidite et frais.",
      privileges: "Premier micro-credit de 10 000 XAF disponible apres 5 transactions. Notifications marche.",
      entryCriteria: "5 transactions confirmees en 30 jours",
    },
    {
      level: "PARTICIPANT" as const,
      description: "Adopteur — utilise V-Pay quotidiennement pour ses paiements. A contracte au moins un micro-credit rembourse.",
      privileges: "Credit augmente a 50 000 XAF. Taux preferentiel. Badge Adopteur visible dans l'app.",
      entryCriteria: "30+ transactions mensuelles + 1 credit rembourse",
    },
    {
      level: "ENGAGE" as const,
      description: "Ambassadeur — recommande V-Pay activement dans son reseau. Genere 5+ parrainages. Utilise V-Pay Business ou Pro.",
      privileges: "Bonus parrainage 500 XAF par filleul actif. Acces beta aux nouvelles features.",
      entryCriteria: "5+ parrainages actifs + abonnement Pro ou Business",
    },
    {
      level: "AMBASSADEUR" as const,
      description: "Champion — marchands influents ou leaders communautaires qui servent de relais V-Pay dans leur quartier ou marche.",
      privileges: "Terminal de paiement gratuit. Support prioritaire. Invitation aux events V-Pay.",
      entryCriteria: "Marchand avec 100+ transactions/mois ou 20+ parrainages actifs",
    },
  ],

  timelineNarrative: {
    origine:
      "2022, Birnin Zana. T'Challa Bassari, 29 ans, observe les files d'attente aux guichets bancaires et le cash qui circule sans trace dans les marches. 3 ans chez M-Pesa lui ont montre ce qui marche. Il sait ce qui manque.",
    transformation:
      "2023-2024 : Developpement du protocole vibranium-backing. 500 premiers utilisateurs au marche central. Micro-credit lance avec 94% de taux de remboursement. V-Pay devient le portefeuille des commercants wakandais.",
    present:
      "2026 : 85 000 portefeuilles actifs. 2.3 milliards XAF de transactions mensuelles. 12 000 micro-credits actifs. Equipe de 22 personnes. Premier fintech wakandais a obtenir l'agrement regulatoire provisoire.",
    futur:
      "2028 : Licence bancaire digitale complete. 500 000 portefeuilles. Expansion Cameroun et Gabon. V-Pay Epargne et V-Pay Assurance comme extensions naturelles de l'ecosysteme.",
  },

  prophecy: {
    worldTransformed:
      "Dans un monde Vibranium Tech, aucun Africain n'a besoin de supplier une banque. L'argent se deplace a la vitesse du smartphone. Le credit est un droit base sur le travail reel, pas sur un dossier papier.",
    pioneers:
      "Les 500 premiers marchands du marche central de Birnin Zana. T'Challa Bassari. Les etudiants du programme V-Pay Campus.",
    urgency:
      "Orange Money et Wave investissent massivement. Si Vibranium Tech ne s'impose pas comme le standard en 18 mois, le marche sera verrouille par des acteurs sans ancrage local.",
    horizon: "18 mois pour la licence bancaire. 3 ans pour la dominance regionale.",
  },

  enemy: {
    name: "Le Guichet Ferme",
    manifesto:
      "L'ennemi de V-Pay n'est pas une banque — c'est le systeme qui dit 'revenez demain avec 3 photocopies et un garant'. Le Guichet Ferme est l'exclusion financiere deguisee en procedure. Chaque formulaire en 4 exemplaires, chaque file d'attente de 2 heures, chaque demande de credit refusee sans explication.",
    narrative:
      "Le Guichet Ferme prospere sur la complexite. Il cree des barrieres invisibles qui excluent 70% de la population du systeme financier formel. V-Pay est ne pour le rendre obsolete.",
    enemySchwartzValues: ["CONFORMITE" as const, "TRADITION" as const],
    overtonMap: {
      ourPosition: "La finance doit etre aussi simple qu'un SMS — pas de guichet, pas de papier, pas d'humiliation",
      enemyPosition: "La banque est un privilege reserve a ceux qui ont les bons documents et le bon profil",
      battleground: "L'acces au credit et aux services financiers pour les travailleurs informels",
      shiftDirection: "De 'bancarise si tu es eligible' vers 'finance si tu travailles'",
    },
  },

  doctrine: {
    dogmas: [
      "L'argent appartient a celui qui le gagne — pas a la banque qui le garde. V-Pay ne bloque jamais un retrait.",
      "Le credit se merite par le travail, pas par la paperasse. L'historique de transactions est le meilleur garant.",
      "La technologie n'est pas un luxe — elle doit fonctionner sur le telephone le plus basique du marche.",
    ],
    principles: [
      "Zero frais sur les petites transactions (<5 000 XAF) — le pain ne paie pas de commission",
      "Le vibranium-backing n'est pas du marketing — chaque depot est reellement adosse",
      "L'app doit fonctionner en 2G, en 3G et hors-ligne (sync quand le reseau revient)",
    ],
    practices: [
      "Chaque nouvelle feature est testee avec 50 marchands avant deploiement",
      "Le taux d'interet micro-credit ne depasse jamais 3% mensuel",
    ],
  },

  nomMarque: "Vibranium Tech",
  accroche: "Ton argent. Ton controle.",
  description:
    "Fintech wakandaise de mobile money et micro-credit, portefeuille V-Pay adosse au vibranium. Finance inclusive pour les non-bancarises.",
  brandNature:
    "Fintech rebelle et pragmatique — pas une banque, pas un operateur telecom, mais un outil de liberation economique construit par et pour les travailleurs africains.",
  secteur: "Fintech / Mobile Money",
  pays: "WK",
  langue: "fr",
  publicCible:
    "Commercants de marche, etudiants, micro-entrepreneurs, travailleurs informels wakandais (18-55 ans) sans acces bancaire",
  promesseFondamentale:
    "V-Pay est le portefeuille numerique qui fait confiance a ton travail, pas a ton dossier bancaire.",
  equipeDirigeante: [
    {
      nom: "T'Challa Bassari",
      role: "Fondateur / CEO",
      bio: "Ingenieur telecom, ex-M-Pesa Kenya. 3 ans d'experience mobile money. A concu le protocole vibranium-backing.",
      experiencePasse: ["M-Pesa Kenya — 3 ans", "Startup telecom Lagos — 2 ans"],
      competencesCles: ["Architecture fintech", "Mobile money", "Regulation financiere"],
      credentials: ["MSc Computer Science Universite de Nairobi", "Agrement regulatoire provisoire Wakanda"],
    },
  ],
};

// ── Pilier D — Distinction (Positionnement) ──────────────────────────────────

export const vibraniumPillarD = {
  personas: [
    {
      name: "Adama Kone",
      age: 42,
      csp: "Vendeuse de tissu / Marche Central",
      location: "Birnin Zana, Wakanda",
      income: "180 000 XAF/mois (variable)",
      familySituation: "Mariee, 4 enfants, tontine active",
      lf8Dominant: ["SURVIE_SANTE" as const, "PROTECTION_PROCHES" as const],
      schwartzValues: ["SECURITE" as const, "TRADITION" as const],
      lifestyle:
        "Reveille a 5h, au marche a 6h. Vend du tissu wax et du pagne. Gere 200 000 XAF de stock en cash. A ete volee 3 fois. Son telephone est un Samsung Galaxy A03 basique. Fait partie de 2 tontines.",
      motivations:
        "Securiser ses recettes quotidiennes sans transporter du cash. Acceder a un credit rapide pour renouveler son stock avant les fetes.",
      fears:
        "Perdre son argent dans une app. Que les frais soient caches. Que le credit la piege dans une spirale de dette.",
      hiddenDesire:
        "Ouvrir un deuxieme stand au marche. Payer les frais scolaires de ses enfants a l'avance. Ne plus avoir peur le soir avec du cash dans son sac.",
      whatTheyActuallyBuy:
        "De la securite. V-Pay Free pour les depots quotidiens + micro-credit stock de 30 000 XAF chaque mois. LTV estimee : 45 000 XAF/an en commissions.",
      jobsToBeDone: [
        "Deposer ses recettes du jour en securite en 30 secondes",
        "Obtenir un credit stock de 30 000-50 000 XAF sans paperasse ni garant",
        "Payer ses fournisseurs par telephone au lieu de se deplacer avec du cash",
      ],
      devotionPotential: "PARTICIPANT" as const,
      rank: 1,
    },
    {
      name: "Moussa Diallo",
      age: 22,
      csp: "Etudiant en informatique",
      location: "Birnin Zana, Wakanda",
      income: "45 000 XAF/mois (bourse + petits boulots)",
      familySituation: "Celibataire, vit en colocation pres du campus",
      lf8Dominant: ["CONDITIONS_CONFORT" as const, "APPROBATION_SOCIALE" as const],
      schwartzValues: ["STIMULATION" as const, "AUTONOMIE" as const],
      lifestyle:
        "Etudiant geek. Developpe des apps en freelance. Son argent transite entre Telegram, WhatsApp et ses poches. N'a jamais mis les pieds dans une banque. Fait confiance a la technologie, pas aux institutions.",
      motivations:
        "Recevoir ses paiements freelance instantanement. Acceder a un petit credit pour acheter du materiel informatique.",
      fears:
        "Frais eleves qui grignotent ses petits revenus. App complexe a utiliser. Dependance a un reseau internet instable.",
      hiddenDesire:
        "Devenir developpeur V-Pay un jour. Construire sa propre startup avec un micro-credit V-Pay comme capital de depart.",
      whatTheyActuallyBuy:
        "De la fluidite. V-Pay Free pour recevoir ses paiements freelance. Epargne automatique de 10% de chaque depot.",
      jobsToBeDone: [
        "Recevoir un paiement freelance en 10 secondes sans frais",
        "Mettre de cote automatiquement pour un nouvel ordi",
        "Payer sa cotisation colocation et ses repas par QR code",
      ],
      devotionPotential: "ENGAGE" as const,
      rank: 2,
    },
    {
      name: "Fatoumata Traore",
      age: 35,
      csp: "Proprietaire de 3 boutiques de cosmetiques",
      location: "Birnin Zana, Wakanda",
      income: "420 000 XAF/mois",
      familySituation: "Mariee, 2 enfants, gere 4 employes",
      lf8Dominant: ["SUPERIORITE_STATUT" as const, "CONDITIONS_CONFORT" as const],
      schwartzValues: ["ACCOMPLISSEMENT" as const, "POUVOIR" as const],
      lifestyle:
        "Entrepreneures multi-sites. Gere 3 boutiques, jongle entre les stocks, les employes et les fournisseurs. A un compte bancaire mais les virements prennent 3 jours. Paie ses fournisseurs chinois en cash via un intermediaire.",
      motivations:
        "Centraliser la gestion financiere de ses 3 boutiques. Payer ses fournisseurs et employes instantanement. Acceder a un credit commercial plus gros (200 000+ XAF).",
      fears:
        "Perdre le controle de sa tresorerie si l'app est en panne. Que ses employes fassent des transactions non autorisees.",
      hiddenDesire:
        "Ouvrir 2 boutiques supplementaires financees par micro-credit V-Pay Business. Devenir un cas d'etude V-Pay pour les petites entreprises.",
      whatTheyActuallyBuy:
        "Du controle et de l'efficacite. V-Pay Business a 5 000 XAF/mois pour la gestion multi-sites + credit commercial. LTV estimee : 180 000 XAF/an.",
      jobsToBeDone: [
        "Voir en temps reel les recettes de ses 3 boutiques depuis son telephone",
        "Payer ses 4 employes en 1 clic chaque fin de mois",
        "Obtenir un credit commercial de 200 000 XAF pour un nouveau stock",
      ],
      devotionPotential: "AMBASSADEUR" as const,
      rank: 3,
    },
  ],

  paysageConcurrentiel: [
    {
      name: "Orange Money Wakanda",
      partDeMarcheEstimee: 45,
      avantagesCompetitifs: [
        "Reseau d'agents physiques dans chaque quartier — presence terrain inegalable avec 2 000+ agents",
        "Confiance de marque Orange — notoriete de 92% chez les utilisateurs de mobile money",
      ],
      faiblesses: [
        "Frais de transaction eleves (1.5-3% par retrait)",
        "Zero credit — que du transfert et paiement",
        "Interface app datee et lente sur les telephones basiques",
      ],
      strategiePos:
        "Le geant installe qui traite le mobile money comme un centre de profit, pas comme un service d'inclusion financiere",
    },
    {
      name: "MTN MoMo",
      partDeMarcheEstimee: 30,
      avantagesCompetitifs: [
        "Integration avec le reseau MTN — tout abonne MTN est un utilisateur potentiel",
      ],
      faiblesses: [
        "Limite aux abonnes MTN — exclut 40% du marche",
        "Frais caches sur les retraits inter-operateurs",
        "Pas de fonctionnalite d'epargne ni de credit",
      ],
      strategiePos:
        "Le mobile money captif qui enferme dans l'ecosysteme operateur",
    },
    {
      name: "Wave",
      partDeMarcheEstimee: 10,
      avantagesCompetitifs: [
        "Frais ultra-bas (1% plafonne) et interface moderne — le disrupteur venu du Senegal",
      ],
      faiblesses: [
        "Faible presence au Wakanda (lance recemment)",
        "Pas de vibranium-backing — pas de garantie physique sur les depots",
        "Modele economique fragile (subventionne par le capital-risque)",
      ],
      strategiePos:
        "Le challenger VC-funded qui casse les prix mais n'a pas de racines locales",
    },
  ],

  promesseMaitre:
    "V-Pay : ton portefeuille ne dort jamais, ton argent travaille pour toi.",
  sousPromesses: [
    "V-Pay Free : zero frais sur les depots, retraits a 0.5%, paiements marchands gratuits — l'argent circule sans saigner.",
    "V-Pay Pro : credit instantane en 30 secondes, base sur ton historique reel. Pas de paperasse, pas de garant.",
    "V-Pay Business : gere tes boutiques, paie tes employes et tes fournisseurs depuis ton telephone.",
  ],

  positionnement:
    "Vibranium Tech est le premier ecosysteme financier digital adosse au vibranium — plus qu'un mobile money, un systeme de confiance numerique pour les non-bancarises.",

  tonDeVoix: {
    personnalite: [
      "Direct — pas de jargon bancaire, pas de small print, pas de promesses floues",
      "Pragmatique — chaque fonctionnalite resout un probleme reel du quotidien",
      "Rebelle — defie ouvertement le systeme bancaire traditionnel",
    ],
    onDit: [
      "Liberer / liberation — V-Pay libere ton argent du systeme qui le retient",
      "Ton travail, ton credit — le credit base sur ce que tu fais, pas sur tes papiers",
      "Vibranium-backed — chaque XAF depose est reel et garanti",
    ],
    onNeditPas: [
      "Client / consommateur — ce sont des utilisateurs libres, pas des captifs",
      "Frais bancaires / commissions — on parle de contribution, jamais de taxe",
      "Risque / defaut — on parle d'accompagnement, pas de menace",
    ],
  },
};

// ── Pilier V — Valeur (Offre & Pricing) ─────────────────────────────────────

export const vibraniumPillarV = {
  businessModel: "ABONNEMENT",
  economicModels: ["FREEMIUM", "ABONNEMENT", "COMMISSION_MICRO_CREDIT"],
  positioningArchetype: "ACCESSIBLE",
  salesChannel: "DIRECT",
  freeLayer: {
    whatIsFree: "Portefeuille V-Pay avec depots gratuits, paiements marchands gratuits, et retraits a 0.5%",
    whatIsPaid: "V-Pay Pro (credit instantane + zero frais), V-Pay Business (gestion multi-sites + credit commercial)",
    conversionLever: "Apres 10 transactions gratuites, l'utilisateur voit l'offre de micro-credit personnalisee basee sur son historique reel",
  },

  pricingJustification:
    "V-Pay Free est gratuit car chaque utilisateur genere des donnees de transaction qui alimentent le moteur de scoring credit — le vrai produit. " +
    "V-Pay Pro a 1 500 XAF/mois se justifie par l'acces au micro-credit instantane (economie de 5 000 XAF/mois en frais de deplacement et interet informel). " +
    "V-Pay Business a 5 000 XAF/mois remplace un logiciel de caisse (15 000 XAF/mois) + un comptable (50 000 XAF/mois).",

  produitsCatalogue: [
    {
      id: "VPAY-FREE-001",
      nom: "V-Pay Free",
      categorie: "SERVICE_DIGITAL",
      prix: 0,
      cout: 120,
      margeUnitaire: -120,
      gainClientConcret: "Portefeuille numerique gratuit. Depots illimites. Paiements marchands QR code gratuits. Retraits 0.5%.",
      gainClientAbstrait: "Securite : ne plus transporter de cash. Liberte de payer partout sans monnaie.",
      gainMarqueConcret: "Acquisition a cout quasi-nul (effet reseau). Donnees de scoring credit generees par chaque transaction.",
      gainMarqueAbstrait: "Chaque utilisateur gratuit est un futur client credit et un ambassadeur organique du reseau.",
      coutClientConcret: "0 XAF/mois. 0.5% sur les retraits.",
      coutClientAbstrait: "Confiance requise pour deposer de l'argent dans une app.",
      coutMarqueConcret: 120,
      coutMarqueAbstrait: "Risque de free-riders qui n'upgraderont jamais vers Pro.",
      lienPromesse: "V-Pay Free est la porte d'entree — prouver que ton argent est en securite sans te couter un franc.",
      segmentCible: "Adama Kone",
      phaseLifecycle: "GROWTH",
      leviersPsychologiques: ["Gratuite totale (zero risque)", "Preuve sociale marchands", "Vibranium-backing = securite"],
      lf8Trigger: ["SURVIE_SANTE" as const, "CONDITIONS_CONFORT" as const],
      maslowMapping: "SAFETY",
      scoreEmotionnelADVE: 72,
      canalDistribution: ["APP"],
      disponibilite: "ALWAYS",
      skuRef: "VPAY-FREE",
    },
    {
      id: "VPAY-PRO-002",
      nom: "V-Pay Pro",
      categorie: "ABONNEMENT",
      prix: 1500,
      cout: 400,
      margeUnitaire: 1100,
      gainClientConcret: "Zero frais sur toutes les transactions. Micro-credit instantane jusqu'a 50 000 XAF. Epargne automatique programmable.",
      gainClientAbstrait: "Acces au credit sans humiliation — ton historique suffit comme garant.",
      gainMarqueConcret: "Revenue recurrente 1 500 XAF/mois. Conversion credit : 68% des Pro contractent un micro-credit.",
      gainMarqueAbstrait: "Fidelisation forte — le credit cree un lien d'engagement durable.",
      coutClientConcret: "1 500 XAF/mois.",
      coutClientAbstrait: "Engagement dans un abonnement mensuel.",
      coutMarqueConcret: 400,
      coutMarqueAbstrait: "Risque de defaut credit qui impacte la marge.",
      lienPromesse: "V-Pay Pro transforme tes transactions quotidiennes en historique de confiance — et cette confiance ouvre les portes du credit.",
      segmentCible: "Moussa Diallo",
      phaseLifecycle: "GROWTH",
      leviersPsychologiques: ["Acces au credit (aspirationnel)", "Zero frais (rationalite)", "Epargne automatique (securite)"],
      lf8Trigger: ["CONDITIONS_CONFORT" as const, "APPROBATION_SOCIALE" as const],
      maslowMapping: "ESTEEM",
      scoreEmotionnelADVE: 80,
      canalDistribution: ["APP"],
      disponibilite: "ALWAYS",
      skuRef: "VPAY-PRO",
    },
    {
      id: "VPAY-BIZ-003",
      nom: "V-Pay Business",
      categorie: "ABONNEMENT",
      prix: 5000,
      cout: 1200,
      margeUnitaire: 3800,
      gainClientConcret: "Dashboard multi-sites. Gestion employes et salaires. Credit commercial jusqu'a 500 000 XAF. Facturation automatique.",
      gainClientAbstrait: "Se sentir professionnel — gerer son business comme une vraie entreprise.",
      gainMarqueConcret: "Revenue recurrente premium. Credit commercial a marge elevee. Donnees B2B precieuses.",
      gainMarqueAbstrait: "Ancrage dans le tissu economique local — chaque business connecte renforce l'ecosysteme.",
      coutClientConcret: "5 000 XAF/mois.",
      coutClientAbstrait: "Dependance technologique pour les operations critiques.",
      coutMarqueConcret: 1200,
      coutMarqueAbstrait: "Support client exigeant pour les entreprises (SLA).",
      lienPromesse: "V-Pay Business transforme ton telephone en siege social — gere tout depuis ton ecran.",
      segmentCible: "Fatoumata Traore",
      phaseLifecycle: "LAUNCH",
      leviersPsychologiques: ["Statut professionnel", "Gain de temps quantifiable", "Credit commercial accessible"],
      lf8Trigger: ["SUPERIORITE_STATUT" as const, "CONDITIONS_CONFORT" as const],
      maslowMapping: "SELF_ACTUALIZATION",
      scoreEmotionnelADVE: 85,
      canalDistribution: ["APP"],
      disponibilite: "ALWAYS",
      skuRef: "VPAY-BIZ",
    },
  ],

  productLadder: [
    {
      tier: "V-Pay Free",
      prix: 0,
      produitIds: ["VPAY-FREE-001"],
      cible: "Adama Kone",
      description: "Portefeuille gratuit. Objectif : securiser le cash quotidien et generer l'historique de transactions qui ouvre le credit.",
      position: 1,
    },
    {
      tier: "V-Pay Pro",
      prix: 1500,
      produitIds: ["VPAY-PRO-002"],
      cible: "Moussa Diallo",
      description: "Zero frais + micro-credit instantane. Pour ceux qui veulent que leur argent travaille autant qu'eux.",
      position: 2,
    },
    {
      tier: "V-Pay Business",
      prix: 5000,
      produitIds: ["VPAY-BIZ-003"],
      cible: "Fatoumata Traore",
      description: "Gestion complete d'activite. Pour les entrepreneurs qui gerent plusieurs points de vente.",
      position: 3,
    },
  ],

  unitEconomics: {
    cac: 1200,
    ltv: 42000,
    ltvCacRatio: 35,
    pointMort: "Atteint au 8eme mois pour un utilisateur Pro (cumul abonnement + interets credit)",
    margeNette: 28,
    roiEstime: 65,
    paybackPeriod: 4,
    budgetCom: 3500000,
    caVise: 120000000,
  },

  promesseDeValeur:
    "V-Pay promet a chaque travailleur wakandais un portefeuille digital plus fiable qu'une banque, un credit plus rapide qu'un ami, et des frais plus bas que le cash.",
};

// ── Pilier E — Engagement ───────────────────────────────────────────────────

export const vibraniumPillarE = {
  promesseExperience:
    "Chaque interaction avec V-Pay doit etre plus rapide, plus simple et plus respectueuse que toute alternative bancaire. " +
    "L'utilisateur ne doit jamais se sentir 'trop petit' pour V-Pay — le marchand du coin est aussi important que le commercant multi-sites.",
  primaryChannel: "APP",

  superfanPortrait: {
    personaRef: "Fatoumata Traore",
    motivations: [
      "Efficacite operationnelle — V-Pay lui fait gagner 4 heures par semaine",
      "Statut — elle est 'la premiere du marche a utiliser V-Pay Business'",
      "Acces au credit commercial qui lui a permis d'ouvrir sa 3eme boutique",
    ],
    barriers: [
      "Panne app pendant les heures de pointe = panique",
      "Si le credit est refuse sans explication claire",
    ],
    profile:
      "Entrepreneures multi-sites, 35 ans, 420K XAF/mois. Utilise V-Pay Business pour gerer 3 boutiques. " +
      "A obtenu 3 micro-credits sans defaut. Recommande V-Pay a chaque collegue commercante.",
  },

  touchpoints: [
    { canal: "App V-Pay — Transaction", type: "DIGITAL", channelRef: "APP", role: "Transaction quotidienne : depot, paiement, credit", aarrStage: "RETENTION", devotionLevel: ["PARTICIPANT", "ENGAGE", "AMBASSADEUR"], priority: 1, frequency: "DAILY" },
    { canal: "Agent terrain — Inscription", type: "HUMAIN", channelRef: "PLV", role: "Inscription assistee sur le marche pour les non-digitaux", aarrStage: "ACQUISITION", devotionLevel: ["SPECTATEUR"], priority: 2, frequency: "DAILY" },
    { canal: "SMS — Notifications", type: "DIGITAL", channelRef: "SMS", role: "Confirmation transaction + rappel credit + alertes securite", aarrStage: "RETENTION", devotionLevel: ["INTERESSE", "PARTICIPANT"], priority: 3, frequency: "DAILY" },
    { canal: "WhatsApp Business — Support", type: "DIGITAL", channelRef: "SMS", role: "Support client et resolution de problemes en temps reel", aarrStage: "RETENTION", devotionLevel: ["PARTICIPANT", "ENGAGE"], priority: 4, frequency: "AD_HOC" },
    { canal: "Evenements marche — Demo V-Pay", type: "PHYSIQUE", channelRef: "EVENT", role: "Demonstration live du paiement QR et du micro-credit aux marchands", aarrStage: "ACTIVATION", devotionLevel: ["SPECTATEUR", "INTERESSE"], priority: 5, frequency: "WEEKLY" },
    { canal: "Radio locale — Spots", type: "PHYSIQUE", channelRef: "OOH", role: "Notoriete et education dans les zones peri-urbaines", aarrStage: "ACQUISITION", devotionLevel: ["SPECTATEUR"], priority: 6, frequency: "DAILY" },
  ],

  aarrr: {
    acquisition: "Agents terrain marches (45%), radio locale (25%), bouche-a-oreille (20%), digital (10%). CPA cible : 1 200 XAF.",
    activation: "Premiere transaction completee en moins de 3 minutes apres inscription (taux activation : 72%). Premier depot moyen : 8 500 XAF.",
    retention: "Notifications SMS de chaque transaction. Rappel credit. Rapport mensuel de depenses. Retention J30 : 65%, J90 : 48%.",
    revenue: "Conversion Free->Pro : 18% a 6 mois. Revenue moyenne Pro : 1 500 + marge credit. ARPU : 1 850 XAF/mois.",
    referral: "Programme parrainage : 500 XAF pour chaque filleul qui fait 5 transactions. Taux parrainage : 15%.",
  },

  kpis: [
    { name: "Portefeuilles actifs mensuels (MAU)", metricType: "BEHAVIORAL", target: 100000, frequency: "MONTHLY" },
    { name: "Volume transactionnel mensuel (XAF)", metricType: "FINANCIAL", target: 3000000000, frequency: "MONTHLY" },
    { name: "Taux de remboursement micro-credit", metricType: "FINANCIAL", target: 94, frequency: "MONTHLY" },
    { name: "NPS", metricType: "SATISFACTION", target: 55, frequency: "QUARTERLY" },
    { name: "Conversion Free->Pro", metricType: "BEHAVIORAL", target: 20, frequency: "MONTHLY" },
    { name: "Temps moyen transaction (secondes)", metricType: "BEHAVIORAL", target: 15, frequency: "WEEKLY" },
  ],
};

// ── Pilier R — Risk (Diagnostic) ────────────────────────────────────────────

export const vibraniumPillarR = {
  globalSwot: {
    strengths: [
      "Protocole vibranium-backing unique — confiance physique superieure aux autres mobile money",
      "Taux de remboursement micro-credit de 94% grace au scoring base sur les donnees de transaction reelles",
      "Fonctionnement en mode 2G et hors-ligne — accessibilite maximale",
      "CAC de 1 200 XAF (3x inferieur a Orange Money)",
    ],
    weaknesses: [
      "Dependance a un seul marche (Birnin Zana) pour 80% des utilisateurs",
      "Equipe tech de 8 personnes pour une infrastructure critique",
      "Agrement regulatoire encore provisoire — risque de non-renouvellement",
      "Marque peu connue hors du marche central",
    ],
    opportunities: [
      "350M d'Africains non-bancarises — marche potentiel colossal",
      "Partenariats avec les tontines traditionnelles pour digitaliser l'epargne collective",
      "Integration avec V-Pay Epargne (rendement 6%) et V-Pay Assurance (micro-assurance)",
      "Programme V-Pay Campus pour les 80 000 etudiants wakandais",
    ],
    threats: [
      "Orange Money et MTN MoMo investissent massivement en micro-credit (lancement prevu T3 2026)",
      "Regulation financiere : nouvelles exigences de capital minimum pour les fintechs (projet de loi en cours)",
      "Cyber-attaque sur l'infrastructure V-Pay — risque reputationnel catastrophique",
      "Volatilite du cours vibranium impactant le backing des depots",
    ],
  },

  probabilityImpactMatrix: [
    {
      risk: "Non-renouvellement de l'agrement regulatoire provisoire — arret force des operations",
      probability: "MEDIUM",
      impact: "HIGH",
      mitigation: "Recrutement d'un directeur juridique dedie + compliance proactive + lobbying aupres du regulateur",
    },
    {
      risk: "Cyber-attaque majeure compromettant les donnees utilisateurs ou les fonds",
      probability: "MEDIUM",
      impact: "HIGH",
      mitigation: "Audit securite trimestriel par cabinet externe + assurance cyber + equipe securite dediee",
    },
    {
      risk: "Lancement micro-credit par Orange Money cannibalisant la proposition de valeur V-Pay Pro",
      probability: "HIGH",
      impact: "MEDIUM",
      mitigation: "Differenciation par le vibranium-backing + taux d'interet plus bas + scoring plus precis",
    },
    {
      risk: "Defaut massif de remboursement micro-credit en cas de choc economique",
      probability: "LOW",
      impact: "HIGH",
      mitigation: "Plafond de credit conservateur + diversification du portefeuille + reserves de provisions",
    },
  ],

  riskScore: 35,
};

// ── Pilier T — Track (Realite Marche) ───────────────────────────────────────

export const vibraniumPillarT = {
  tamSamSom: {
    tam: {
      value: 450000000000,
      description: "Marche total des services financiers numeriques en Afrique Centrale — 450 milliards XAF en 2025",
      source: "ai_estimate",
      sourceRef: "GSMA Mobile Money Report 2025 + extrapolation regionale",
    },
    sam: {
      value: 28000000000,
      description: "Segment mobile money + micro-credit pour les non-bancarises au Wakanda — 28 milliards XAF",
      source: "ai_estimate",
      sourceRef: "Donnees regulateur telecom Wakanda + enquete terrain 500 marchands",
    },
    som: {
      value: 2800000000,
      description: "Part atteignable a 18 mois : 10% du SAM soit 2.8 milliards XAF en volume de transactions",
      source: "calculated",
      sourceRef: "Projection interne basee sur croissance actuelle de 12%/mois",
    },
  },

  brandMarketFitScore: 72,

  traction: {
    utilisateursInscrits: 120000,
    utilisateursActifs: 85000,
    croissanceHebdo: 3.2,
    revenusRecurrents: 18500000,
    metriqueCle: {
      nom: "Portefeuilles actifs mensuels",
      valeur: 85000,
      tendance: "UP",
    },
    preuvesTraction: [
      "85 000 portefeuilles actifs en 18 mois de lancement",
      "2.3 milliards XAF de transactions mensuelles",
      "Taux de remboursement micro-credit : 94%",
      "NPS de 52 — en progression constante",
    ],
    tractionScore: 7,
  },

  triangulation: {
    customerInterviews: "120 interviews terrain (40 marchands, 40 etudiants, 40 entrepreneurs). Insight cle : la confiance vibranium-backing est le facteur n.1 de choix vs Orange Money. Le credit instantane est le facteur n.1 de retention.",
    competitiveAnalysis: "Benchmark 5 fintechs presentes au Wakanda. V-Pay se differencie par : (1) vibranium-backing unique, (2) scoring credit base sur transactions reelles (pas sur un dossier papier), (3) zero frais sur les petites transactions.",
    trendAnalysis: "Penetration smartphone au Wakanda : 78% des 18-45 ans. Croissance mobile money continentale : +25%/an. Tendance regulation : durcissement prevu en 2027 (avantage pour les fintechs deja conformes).",
    financialBenchmarks: "Marge nette V-Pay : 28% (vs. 35% Orange Money). Mais LTV/CAC de 35x (vs. 12x Orange Money) grace au cout d'acquisition ultra-bas.",
  },
};

// ── Pilier I — Innovation (PARTIAL) ────────────────────────────────────────

export const vibraniumPillarI = {
  // PARTIAL — Only catalogueParCanal, no generationMeta
  catalogueParCanal: {
    APP: [
      { action: "Feature 'Tontine Digitale' — epargne collective entre membres d'un groupe", format: "Feature in-app", objectif: "Digitaliser les 45 000 tontines actives au Wakanda et capter leur volume" },
      { action: "Scoring credit gamifie — voir son score augmenter a chaque transaction remboursee", format: "Feature in-app", objectif: "Encourager le bon comportement financier et la transparence" },
    ],
    EVENT: [
      { action: "Tournee 'V-Pay au Marche' — demonstrations live dans 10 marches de Birnin Zana", format: "Stand mobile + agents", objectif: "Acquisition terrain aupres des marchands non-digitaux" },
    ],
    PARTNERSHIP: [
      { action: "Partenariat universites — V-Pay Campus integre aux cartes etudiantes", format: "Integration institutionnelle", objectif: "Capter 80 000 etudiants wakandais comme utilisateurs V-Pay" },
    ],
  },
};

// ── Pilier S — Strategie (PARTIAL) ──────────────────────────────────────────

export const vibraniumPillarS = {
  // PARTIAL — placeholder roadmap only
  roadmap: [
    {
      phase: "T2 2026 — Licence bancaire",
      objectif: "Obtenir la licence bancaire digitale complete et tripler la base utilisateurs a 250 000",
      objectifDevotion: "SPECTATEUR -> INTERESSE (conversion terrain via agents et demos marche)",
      actions: ["Dossier licence bancaire", "Recrutement equipe compliance", "Campagne terrain 10 marches"],
      budget: 8000000,
      duree: "3 mois",
    },
    {
      phase: "T3 2026 — Expansion & Produits",
      objectif: "Lancer V-Pay Epargne et V-Pay Tontine. Pilote hors Birnin Zana (3 villes secondaires).",
      objectifDevotion: "INTERESSE -> PARTICIPANT (activation via premier credit et epargne)",
      actions: ["Lancement V-Pay Epargne", "Feature Tontine Digitale", "Pilote 3 villes secondaires"],
      budget: 12000000,
      duree: "3 mois",
    },
  ],
};
