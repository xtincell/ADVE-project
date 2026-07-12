/**
 * CANON MOTION19 — « Motion19 — La Boutique Des Créatifs » (Douala, Cameroun),
 * 8 piliers alignés champ par champ sur les contrats de maturité (mêmes
 * expectedKeys que spawt-canon.ts / upgraders-canon.ts).
 *
 * MOTION 19 SARL est une boutique d'équipement photo / vidéo / audio / drone
 * à Douala (1203 Bvd de la Liberté, Akwa) + e-commerce motion19.com — candidate
 * marque cliente d'UPgraders (test opérateur, 2026-07).
 *
 * ⚠️ PROVENANCE : contenu rédigé par NEFER à partir de SOURCES PUBLIQUES
 * uniquement (motion19.com + catalogue Shopify JSON 373 produits/157
 * collections, réseaux sociaux publics, DataReportal Digital 2026 Cameroun,
 * D&B, presse). AUCUN corpus client. En conséquence :
 *   - les FAITS observés (catalogue, prix, adresse, réseaux, dates) sont
 *     sourcés dans les champs eux-mêmes ;
 *   - les JUGEMENTS stratégiques (archétype, positionnement, personas,
 *     business model…) sont des drafts marqués INFERRED dans
 *     `MOTION19_FIELD_CERTAINTY` (doctrine needsHuman — l'opérateur valide
 *     puis flippe à DECLARED via l'amendement de pilier) ;
 *   - AUCUNE traction inventée : les compteurs non publiés restent à 0 avec
 *     un commentaire « non communiqué ».
 *
 * Seed : validationStatus "DRAFT" (pré-rempli, non validé par l'opérateur —
 * contrairement à SPAWT/UPgraders qui sont VALIDATED car curés sur corpus).
 * Idempotent : consommé par prisma/seed-motion19.ts (upsert (strategyId, key)).
 */

// ── PILIER A — AUTHENTICITÉ ────────────────────────────────────────────

export const PILLAR_A = {
  nomMarque: "Motion19",
  accroche: "Donnez vie à chaque image",
  description:
    "Motion19 est la boutique spécialisée de l'équipement photo, vidéo, audio et drone au Cameroun — un magasin à Akwa (Douala) doublé d'un e-commerce (motion19.com, 373 produits / 157 collections, juillet 2026). Plus qu'un revendeur : un équipementier qui conseille, garantit l'authenticité des produits (distributeurs officiels) et accompagne chaque projet créatif, du débutant ambitieux au professionnel exigeant.",
  secteur: "Équipement audiovisuel & créateurs",
  pays: "CM",
  langue: "fr",
  brandNature: "RETAIL_SPACE",
  archetype: "Sage", // INFERRED — le conseil expert et la pédagogie budget dominent la communication observée
  archetypeSecondary: "Créateur", // INFERRED — « Inspire ta créativité », #MadeForCreators
  publicCible:
    "Les créatifs du Cameroun : créateurs de contenu (YouTube, TikTok, vlog, mobile), podcasteurs et streamers, vidéastes et photographes professionnels, télépilotes de drone, équipes média d'églises, écoles et entreprises (studios, agences, TV locales) — de Douala vers tout le pays (livraison) avec l'Afrique centrale en ambition affichée.",
  noyauIdentitaire:
    "Nous croyons que le talent créatif camerounais ne manque ni d'idées ni d'ambition — il manque d'un accès fiable à l'outil professionnel. Motion19 existe pour lever cette barrière : du matériel authentique, des prix en FCFA assumés, du conseil qui parle budget avant de parler marque, et un accompagnement qui suit le créateur de son premier micro à sa première caméra cinéma.", // INFERRED — draft à valider par l'opérateur
  citationFondatrice:
    "« Nous ne vendons pas simplement du matériel : nous accompagnons chaque projet créatif, du débutant ambitieux au professionnel exigeant. » — page À propos, motion19.com (2026).",
  promesseFondamentale:
    "T'équiper comme un pro sans te tromper : le bon matériel pour ton usage et ton budget, authentique, garanti, livré au Cameroun — avec un conseil humain avant, pendant et après l'achat.",
  missionStatement:
    "Rendre accessibles au Cameroun et en Afrique centrale les équipements professionnels photo, vidéo, audio et drone des plus grandes marques mondiales, et faire grandir la génération de créateurs qui documentera la culture de la région (mission affichée motion19.com/pages/a-propos).",
  doctrine: {
    texte:
      "Le créatif d'abord, le carton ensuite : Motion19 vend par l'usage (Setup Podcast, Setup YouTube, Setup Créateur Mobile…) et par le palier de budget, pas par la fiche technique brute. Produits authentiques via distributeurs officiels — jamais de gris douteux. Le conseil est gratuit, le paiement se fait à la livraison : la confiance précède la transaction.",
    dogmas: [
      "Produits authentiques uniquement — « nous travaillons directement avec les distributeurs officiels ».",
      "Le conseil parle usage et budget avant de parler marque.",
      "Paiement à la livraison : la confiance d'abord (norme du e-commerce camerounais post-Jumia).",
      "Chaque niveau de créateur mérite une réponse — du micro à 15 000 F à la caméra cinéma à 7,5 M F.",
    ],
  }, // doctrine synthétisée des pratiques observées — INFERRED
  valeurs: [
    { valeur: "Fiabilité", justification: "Produits authentiques, garantie assurée, SAV — l'antidote à l'import douteux.", rang: 1 },
    { valeur: "Accessibilité", justification: "Prix en FCFA du premier accessoire (15 000 F) au plateau broadcast, guides par palier de budget.", rang: 2 },
    { valeur: "Pédagogie", justification: "Motion19 Academy (blog), recommandations par niveau, conseil WhatsApp personnalisé.", rang: 3 },
    { valeur: "Passion créative", justification: "#FeelFreeToCreate / #MadeForCreators — la boutique se vit comme un allié des créateurs, pas un comptoir.", rang: 4 },
  ], // INFERRED — dérivées de la communication observée
  herosJourney: [
    { actNumber: 1, title: "Le créatif bloqué", narrative: "Un créateur camerounais veut produire mieux : entre l'import cross-border risqué, les généralistes qui vendent de tout et les prix en devises, il ne sait pas à qui faire confiance.", emotionalArc: "ambition → méfiance", causalLink: "Le problème n'est pas l'envie, c'est l'accès fiable à l'outil." },
    { actNumber: 2, title: "La découverte de la boutique", narrative: "Il découvre Motion19 — un spécialiste qui parle son langage (setup par usage, budget en FCFA) et répond sur WhatsApp.", emotionalArc: "méfiance → curiosité", causalLink: "Un spécialiste local qui conseille avant de vendre inverse le rapport de confiance." },
    { actNumber: 3, title: "Le premier équipement", narrative: "Premier achat (micro, éclairage, hybride) payé à la livraison, garanti, avec les conseils de mise en route.", emotionalArc: "curiosité → confiance", causalLink: "La promesse tenue au premier achat ouvre la relation d'équipement de long terme." },
    { actNumber: 4, title: "La montée en gamme", narrative: "Ses contenus progressent, il revient : objectif supplémentaire, stabilisateur, drone — Motion19 suit sa trajectoire de créateur.", emotionalArc: "confiance → fidélité", causalLink: "Le conseil par palier transforme le client ponctuel en compte créateur." },
    { actNumber: 5, title: "Le pro qui recommande", narrative: "Devenu référence (studio, église, agence), il équipe ses équipes chez Motion19 et amène son cercle.", emotionalArc: "fidélité → prescription", causalLink: "Dans un marché de bouche-à-oreille, chaque pro équipé est un canal d'acquisition." },
  ], // INFERRED — trajectoire type reconstituée
  ikigai: {
    love: "La création audiovisuelle camerounaise — clips, églises, podcasts, cinéma, événementiel",
    competence: "Sourcing officiel multi-marques (30+ marques dont Canon, Sony, Nikon, DJI, Godox, Rode) + curation par usage + conseil budget",
    worldNeed: "Aucun spécialiste audiovisuel pur identifié en ligne au Cameroun : les créateurs achètent chez des généralistes ou importent à leurs risques",
    remuneration: "Marge retail sur 373 produits (15 000 F → 7,5 M F, médiane ~550 000 F) + comptes B2B (studios, églises, entreprises, TV)",
  }, // INFERRED
  enemy: {
    name: "L'équipement-loterie",
    manifesto:
      "Nous refusons l'import douteux sans garantie, le généraliste qui vend une caméra comme un mixeur, la contrefaçon qui grille au premier tournage, et l'idée qu'un créateur africain devrait payer plus cher pour un matériel incertain.",
    narrative:
      "Sans spécialiste local, s'équiper au Cameroun est une loterie : commander à l'étranger (délais, douane, zéro SAV), acheter générique chez un revendeur qui ne sait pas ce qu'est un XLR, ou risquer le faux. Chaque mauvaise expérience retarde un créateur — et prive le pays d'images qui auraient dû exister.",
    enemySchwartzValues: ["l'opportunisme (vendre de tout sans conseil)", "le court-terme (la vente sans SAV)"],
    overtonMap: "Aujourd'hui acceptable : « le matériel pro, ça s'importe à tes risques ». Demain impensable : s'équiper sans conseil local, sans garantie, sans FCFA.",
    enemyBrands: ["l'import cross-border sans garantie (Ubuy et consorts)", "les généralistes high-tech sans expertise AV", "la contrefaçon"],
    activeOpposition: "Distribution officielle + garantie + SAV + conseil spécialiste en français et en FCFA.",
    passiveOpposition: "Chaque créateur bien équipé et bien conseillé devient insensible à la loterie de l'import.",
    counterStrategy: "Ne pas dénigrer — prouver : authenticité documentée, garantie tenue, témoignages vérifiables de créateurs et d'entreprises.",
    fraternityFuel: "Les créateurs qui ont déjà perdu de l'argent dans du matériel douteux se reconnaissent immédiatement.",
  }, // INFERRED — cadrage stratégique proposé
  prophecy: {
    vision: "Le Cameroun qui filme, photographie et podcast en qualité pro — et Motion19 comme maison d'équipement de cette génération, de Douala vers l'Afrique centrale.",
    worldTransformed:
      "Un écosystème où chaque église, chaque studio, chaque créateur de quartier accède à l'outil professionnel authentique avec un conseil local — et où la production audiovisuelle camerounaise rivalise en qualité avec Lagos ou Abidjan.",
    horizon: "2026-2030",
  }, // INFERRED
  originMyth: {
    elevator:
      "Motion19 naît en 2021 à Douala : une boutique pensée par des passionnés d'image pour répondre à une évidence — les créateurs camerounais méritent un vrai magasin spécialisé, pas une loterie d'imports.",
    storytelling:
      "Mars 2021 : le domaine motion19.com est déposé et les premiers produits publiés. La boutique s'installe au 1203 Boulevard de la Liberté, à Akwa, le cœur commerçant de Douala. Cinq ans plus tard : 373 produits, 157 collections, plus de 30 marques distribuées, des clients B2B affichés (médias, assurances, agences) et une refonte e-commerce complète (mai-juin 2026) avec un blog de formation, la Motion19 Academy. L'histoire détaillée des fondateurs reste à documenter avec l'opérateur.",
    dateFondation: "2021",
    lieu: "Douala (Akwa), Cameroun",
  },
  timelineNarrative: {
    origine: "2021 — Dépôt du domaine (30 mars, RDAP) et premiers produits en boutique (29 mars, Shopify) ; ouverture du magasin d'Akwa.",
    transformation: "2021-2025 — Construction du catalogue multi-marques (Canon, Sony, DJI, Godox, Rode…), de la présence sociale (FB, IG, TikTok, X) et de la clientèle B2B.",
    present: "2026 — Refonte complète du site (collections republiées 26/05/2026), lancement du blog Motion19 Academy (juin 2026), merchandising par usages (8 setups) et verticales (Églises, Éducation, Événementiel).",
    futur: "2026-2030 — Devenir la référence d'équipement créatif du Cameroun puis de l'Afrique centrale (mission affichée), avec les verticales institutionnelles comme relais de croissance.",
  },
  livingMythology: {
    canon:
      "« La Boutique Des Créatifs » (bio X) + « Donnez vie à chaque image » (site) + les hashtags maison #FeelFreeToCreate et #MadeForCreators + le logo au O-objectif (l'œil de la caméra dans le nom) + les Setups par usage comme grammaire de l'offre.",
    extensionRules:
      "Parler créateur, jamais catalogue : on vend un « Setup Podcast », pas une référence SKU. Le français est la langue de marque (100 % des surfaces observées). Les marronniers saisonniers (« Hello, Septembre 🍂 ») rythment la présence sociale.",
    captureSystem:
      "À formaliser avec l'opérateur : charte éditoriale et lexique n'existent pas publiquement — la Motion19 Academy (blog) est l'embryon du système de contenu.",
  }, // INFERRED — synthèse des signaux publics
  equipeDirigeante: [
    { nom: "Direction MOTION 19 SARL", role: "Direction générale (identité des dirigeants non publiée — à confirmer avec l'opérateur)", competences: ["retail spécialisé", "sourcing multi-marques", "e-commerce Shopify"] },
    { nom: "« Motion by Fotso »", role: "Plume de la Motion19 Academy (blog, juin 2026)", competences: ["pédagogie matériel", "recommandations par budget"] },
  ],
  equipeComplementarite: {
    scoreGlobal: 5,
    couvertureTechnique: "Bonne sur le produit (catalogue précis, fiches soignées) ; e-commerce opérationnel (Shopify) avec des finitions en cours (pages paiement/retours/support en 404 au 12/07/2026).",
    couvertureCommerciale: "Boutique physique Akwa + WhatsApp Business + comptes B2B affichés (Balafon Media, Chanas Assurances, Dash Media, Laura Dave Media, Accent Media, DB Digital Agency, Volume 3 — relations à authentifier).",
    couvertureOperationnelle: "Livraison au Cameroun revendiquée (24-48h selon témoignages du site, à vérifier), paiement à la livraison, précommandes.",
    capaciteExecution: "Réelle sur le retail ; le contenu (YouTube absent, LinkedIn absent) et la preuve sociale authentifiée sont les chantiers visibles.",
    verdict: "Équipe de retail spécialisé compétente sur l'offre ; la structuration de la marque (récit fondateur, preuve, contenu vidéo) reste à construire — c'est précisément le terrain d'UPgraders.",
    lacunes: ["Identités et rôles des dirigeants à documenter", "Responsable contenu/vidéo (YouTube inexistant)", "Preuve sociale authentifiée (avis Google introuvables en ligne)"],
  }, // INFERRED — évaluation externe
  messieFondateur: {
    nom: "À documenter (MOTION 19 SARL)",
    role: "Fondateur·rice non identifié·e dans les sources publiques",
    narrative:
      "Aucune source publique ne nomme le ou la fondatrice. Le récit fondateur — qui, pourquoi, l'étincelle de 2021 — est le premier gisement narratif à capter en entretien opérateur : une boutique de créatifs fondée par des passionnés d'image a un mythe d'origine à raconter.",
    charismaScore: 5,
  },
  competencesDivines: [
    { competence: "Curation multi-marques officielle", preuve: "30+ marques distribuées (Canon 53 produits, Sony 39, Nikon 32, DJI 32, Rode 25, Godox 17, Sigma 17…) — comptage catalogue Shopify 12/07/2026" },
    { competence: "Merchandising par usage créateur", preuve: "8 « univers » : Setup Podcast (36 produits), YouTube (17), Créateur Mobile (16), Drone (13), Livestream (12), Vidéaste (8), TikTok (6), Photographe (4)" },
    { competence: "Pédagogie budget en FCFA", preuve: "Motion19 Academy : recommandations par paliers (« Débutant (- 700 000 FCFA)… »), prix affichés en FCFA du 15 000 F au 7,5 M F" },
  ],
  hierarchieCommunautaire: {
    niveaux: ["Curieux (visiteur / follower)", "Premier setup (1er achat)", "Créateur équipé (achats répétés)", "Pro / compte B2B (studio, église, agence)", "Ambassadeur (pro qui prescrit et équipe son cercle)"],
    principe: "La progression suit la trajectoire d'équipement réelle du créateur — chaque palier de matériel est un palier de relation.",
  }, // INFERRED — échelle proposée
  preuvesAuthenticite: [
    "Catalogue réel et daté : 373 produits / 157 collections publiés sur motion19.com (Shopify JSON, 12/07/2026).",
    "Boutique physique vérifiable : 1203 Bvd de la Liberté, Akwa Douala — Lun-Ven 8h-18h, Sam 9h-15h (page contact).",
    "Ancienneté réelle : domaine déposé le 30/03/2021 (RDAP), premiers produits le 29/03/2021, activité sociale continue depuis nov. 2021.",
    "Prix 100 % FCFA et paiement à la livraison — le modèle de confiance du e-commerce camerounais.",
  ],
  indexReputation: { score: 0, source: "Non mesuré — fiche Google Business introuvable en ligne au 12/07/2026 (à créer/vérifier), avis tiers absents", date: "2026-07" },
  eNps: {
    score: 0,
    sampleSize: 0,
    frequency: "à instaurer (post-achat)",
    lastMeasured: "N/A — jamais mesuré publiquement",
    verbatims: ["Les 6 témoignages de la home citent des produits absents du catalogue (Blue Yeti, Elgato, BenQ) — probablement des gabarits : à remplacer par des verbatims clients réels authentifiés."],
  },
  turnoverRate: 0,
} as const;

// ── PILIER D — DISTINCTION ─────────────────────────────────────────────

export const PILLAR_D = {
  positionnement:
    "Le spécialiste de l'équipement audiovisuel au Cameroun — la seule boutique dédiée aux créateurs d'image et de son identifiée sur le marché : là où les généralistes vendent des cartons, Motion19 vend des setups, du conseil et de la garantie.", // INFERRED
  positionnementEmotionnel:
    "La sérénité de l'achat sûr : « je sais que c'est le bon matériel, au bon prix, et que quelqu'un répond si ça se passe mal » — et la fierté d'appartenir au cercle des créatifs équipés sérieusement.", // INFERRED
  promesseMaitre:
    "La Boutique Des Créatifs : équipe-toi comme un pro, sans te tromper — authentique, garanti, en FCFA, livré au Cameroun.", // INFERRED — assemble les baselines observées
  sousPromesses: [
    { promesse: "Du matériel authentique", preuve: "« Produits authentiques — nous travaillons directement avec les distributeurs officiels » (site) ; 30+ marques mondiales au catalogue" },
    { promesse: "Un conseil qui parle ton budget", preuve: "Guides Academy par paliers de FCFA + merchandising par usage (8 setups) + conseil WhatsApp personnalisé" },
    { promesse: "Zéro risque à la commande", preuve: "Paiement à la livraison + garantie assurée + SAV + boutique physique à Akwa" },
    { promesse: "Tout l'équipement, du débutant au broadcast", preuve: "373 produits de 15 000 F (micro cravate, carte SD) à 7 500 000 F (Canon EOS C300 III), TV & Broadcast inclus" },
  ],
  personas: [
    {
      nom: "Le créateur de contenu (YouTube/TikTok, 20-35 ans)",
      insightCle: "Il monétise peu ou pas (TikTok Creator Rewards fermé au Cameroun) : chaque franc investi doit être le bon — il achète par palier et veut être rassuré.",
      motivations: ["passer un cap de qualité visible", "un setup complet cohérent (pas des pièces au hasard)", "payer à la livraison"],
      barriers: ["budget serré autofinancé", "peur de l'arnaque et de la contrefaçon"],
    },
    {
      nom: "Le vidéaste / photographe professionnel",
      insightCle: "Son matériel est son gagne-pain : la panne ou le faux coûtent des contrats — il paie pour l'authentique, la dispo et le SAV.",
      motivations: ["marques pro (Sony, Canon, DJI, Godox)", "disponibilité immédiate ou précommande fiable", "relation fournisseur durable"],
      barriers: ["comparaison avec les prix d'import", "besoin de facture et de garantie réelles"],
    },
    {
      nom: "Le responsable média d'église",
      insightCle: "Les églises s'équipent en multicam/streaming pour leurs cultes — un projet d'équipement collectif avec budget validé en conseil.",
      motivations: ["solution clé en main (caméras PTZ, mélangeur, micros, éclairage)", "accompagnement à l'installation", "fournisseur de confiance recommandé"],
      barriers: ["cycles de décision longs", "besoin de devis et de pédagogie non technique"],
    },
    {
      nom: "L'entreprise / agence média (B2B)",
      insightCle: "Studios, agences, assurances et TV (logos affichés : Balafon Media, Chanas Assurances, Dash Media…) équipent des équipes entières et reviennent pour le parc.",
      motivations: ["compte fournisseur sérieux (facturation, volume)", "matériel broadcast et parc homogène", "délais tenus"],
      barriers: ["appels d'offres et concurrence import", "exigence de SAV professionnel"],
    },
  ], // INFERRED — personas reconstitués des segments observés (setups, verticales, logos B2B)
  tonDeVoix: {
    personnalite: ["Chaleureux-pro", "Pédagogue", "Enthousiaste sans survendre", "Local et fier de l'être"],
    onDit: ["créatif / créateur", "setup", "donne vie à chaque image", "équipe-toi comme un pro", "authentique / garanti", "en FCFA, payé à la livraison"],
    onNeDitPas: ["du jargon technique sans traduction d'usage", "des promesses de prix « imbattables » à l'import", "un vouvoiement corporate froid sur TikTok (le tutoiement y est la norme observée)"],
  },
  assetsLinguistiques: {
    languePrincipale: "fr",
    slogan: "Donnez vie à chaque image",
    tagline: "La Boutique Des Créatifs",
    naming: "Motion19 en un mot, le « 19 » en bleu vif ; « Motion19 Academy » pour la pédagogie ; les « Setups » comme grammaire d'offre.",
    lexique: ["Motion19", "La Boutique Des Créatifs", "#FeelFreeToCreate", "#MadeForCreators", "Motion19 Academy", "Setup Podcast / YouTube / Créateur Mobile / Drone / Livestream / TikTok / Photographe / Vidéaste"],
  },
  paysageConcurrentiel: [
    { name: "Glotelho (glotelho.cm)", avantagesCompetitifs: ["leader e-commerce local (Akwa)", "notoriété et trafic", "retrait agence + paiement à la livraison"], partDeMarcheEstimee: "forte sur le e-commerce généraliste", faiblesses: ["généraliste : la catégorie photo/caméra est un rayon parmi d'autres", "zéro conseil spécialiste AV"], strategiePos: "Le battre sur l'expertise, la profondeur de catalogue AV et le conseil — pas sur le trafic généraliste.", distinctiveAssets: ["la marque e-commerce installée"] },
    { name: "NowTech Center / KAMKA TECH / iziway", avantagesCompetitifs: ["présence en ligne", "rayons appareils photo"], partDeMarcheEstimee: "diffuse", faiblesses: ["high-tech généraliste, catalogue AV superficiel", "pas de verticales créateurs"], strategiePos: "Occuper la catégorie « spécialiste » qu'ils ne peuvent pas revendiquer.", distinctiveAssets: ["référencement high-tech"] },
    { name: "Import direct / cross-border (Ubuy, achats à l'étranger)", avantagesCompetitifs: ["catalogue mondial", "prix parfois inférieurs"], partDeMarcheEstimee: "significative chez les pros aguerris", faiblesses: ["délais et douane", "zéro garantie locale, zéro SAV", "risque de contrefaçon"], strategiePos: "Vendre la tranquillité : authentique + garanti + livré + SAV vaut l'écart de prix.", distinctiveAssets: ["l'illusion du moins cher"] },
    { name: "CoinAfrique & marché de l'occasion", avantagesCompetitifs: ["prix bas", "immédiateté"], partDeMarcheEstimee: "réelle sur l'entrée de gamme", faiblesses: ["aucune garantie", "état incertain"], strategiePos: "Créer un jour une offre « Occasions certifiées Motion19 » (la collection existe, vide — intention visible).", distinctiveAssets: ["le volume d'annonces"] },
  ],
  swotFlash: {
    strength: "Seul spécialiste AV pur identifié en ligne au Cameroun + catalogue profond (373 produits, 30+ marques) + boutique physique Akwa + SEO de marques (« Godox Cameroun », « Neewer Cameroun ») + verticales déjà pensées (Églises, Éducation…).",
    weakness: "Notoriété sociale modeste (FB 4 252 · IG 1 753 · TikTok 1 308), YouTube et LinkedIn inexistants, preuve sociale non authentifiée (témoignages gabarits, pas d'avis Google trouvés), pages légales/livraison du site en 404.",
    opportunity: "Écosystème créateurs en structuration (12,6 M d'internautes CM, SINAC à Douala), e-commerce local orphelin post-Jumia, segments institutionnels (églises, écoles, TV) sous-équipés, location et occasions non servies.",
    threat: "Import cross-border et contrefaçon, généralistes qui étoffent leur rayon, volatilité devises/droits de douane, pouvoir d'achat créateurs (monétisation TikTok fermée au CM).",
  },
  barriersImitation: [
    { barrier: "La profondeur de catalogue spécialiste", defensibility: "373 produits × 157 collections curées par usage : un généraliste ne rattrape pas cette curation sans expertise dédiée.", expectedDuration: "2-3 ans", category: "offre / curation" },
    { barrier: "Les relations distributeurs officiels", defensibility: "« Directement avec les distributeurs officiels » (30+ marques) — accès, prix et garantie que l'import gris n'a pas.", expectedDuration: "structurelle si entretenue", category: "supply / partenariats" },
    { barrier: "Le capital de confiance local", defensibility: "Boutique physique Akwa + 5 ans d'activité + paiement à la livraison : la confiance se construit en années.", expectedDuration: "structurelle", category: "marque / confiance" },
  ],
  archetypalExpression: {
    visualTranslation: "Le Sage-Créateur en image : le O de MOTION en objectif/bouton record (l'œil qui enregistre), wordmark anthracite sobre + « 19 » bleu vif — la rigueur du pro, l'étincelle du créatif.",
    verbalTranslation: "Le Sage conseille (« Quel matériel pour YouTube en 2026 ? », paliers de budget) ; le Créateur encourage (« Inspire ta créativité », #FeelFreeToCreate).",
    emotionalRegister: "Complicité de plateau : on parle d'égal à égal avec le créateur, on célèbre ses sorties (« Hello, Septembre 🍂 On démarre le mois avec du neuf dans les rayons ✨🛒 »).",
  }, // INFERRED
  directionArtistique: {
    univers: "Sobriété pro + énergie créative : wordmark MOTION19 anthracite au O-objectif (disque + anneau + point), « 19 » bleu vif, fond clair e-commerce, photos produits propres (logo : motion19.com/cdn/shop/files/logo_motion19_black.png)",
    principes: ["Le produit au centre, fond neutre — l'e-commerce d'abord", "Le bleu Motion19 comme accent unique sur base anthracite/blanc", "Montrer l'usage (setups en situation) autant que l'objet"],
  },
  proofPoints: [
    "373 produits / 157 collections publiés, 30+ marques mondiales distribuées (catalogue Shopify, 12/07/2026).",
    "5 ans d'activité continue (domaine et premiers produits mars 2021 ; X actif de nov. 2021 à sept. 2025 au moins).",
    "7 logos clients B2B affichés (Balafon Media, Chanas Assurances, Dash Media, Laura Dave Media, Accent Media, DB Digital Agency, Volume 3) — à transformer en études de cas authentifiées.",
    "1 602 publications Instagram cumulées + 136 vidéos TikTok — une présence sociale réelle à convertir en audience.",
  ],
  sacredObjects: [
    { name: "Le O-objectif", form: "Le O de MOTION dessiné en objectif/bouton record", narrative: "L'œil qui enregistre — la marque porte la caméra dans son nom.", stage: "reconnaissance", socialSignal: "Le sac ou le carton Motion19 = du matériel sérieux." },
    { name: "Le Setup", form: "Collections par usage (Podcast, YouTube, Mobile, Drone, Livestream, TikTok, Photo, Vidéaste)", narrative: "On n'achète pas une référence, on monte SON setup — la grammaire Motion19 de l'équipement.", stage: "considération / achat", socialSignal: "« Mon setup vient de chez Motion19 » entre créateurs." },
    { name: "La Motion19 Academy", form: "Blog de formation (6 articles, juin 2026, plume « Motion by Fotso »)", narrative: "La boutique qui t'apprend avant de te vendre — le conseil institutionnalisé.", stage: "confiance", socialSignal: "Partager un guide Academy = aider un créateur de son cercle." },
  ],
  symboles: [
    { symbol: "Le bouton record (●)", meanings: ["l'enregistrement qui commence", "le passage à l'acte créatif"], usageContexts: ["logo (O-objectif)", "déclinaisons sociales"] },
    { symbol: "Le « 19 » bleu", meanings: ["la signature chromatique", "l'étincelle dans la rigueur"], usageContexts: ["wordmark", "accents UI et packaging"] },
    { symbol: "Le plateau/le setup", meanings: ["le créateur en situation", "l'écosystème d'outils cohérent"], usageContexts: ["photos d'ambiance", "collections par usage"] },
  ],
  esov: { value: 0, measurementMethod: "Share of voice « équipement créateur » Cameroun (mentions sociales + recherche marques) − part de marché — jamais instrumenté", lastMeasured: "N/A", source: "À instrumenter (veille sociale + Search Console)" },
  storyEvidenceRatio: { storytellingPct: 30, evidencePct: 70, target: "La marque est aujourd'hui quasi muette en récit (70 % catalogue/preuve produit) : monter le storytelling fondateur et créateur à ~50/50 sans perdre la crédibilité retail." },
} as const;

// ── PILIER V — VALEUR ──────────────────────────────────────────────────

export const PILLAR_V = {
  promesseDeValeur:
    "L'équipement audiovisuel professionnel authentique, en FCFA, payé à la livraison, garanti et suivi — avec le conseil gratuit qui évite l'erreur d'achat, du premier micro au plateau broadcast.",
  produitsCatalogue: [
    { nom: "Appareils photo & hybrides", description: "54 appareils + 47 hybrides/mirrorless (Canon, Sony, Nikon, Fujifilm, Panasonic, Leica) + 98 objectifs (Sigma, Tamron, Viltrox, Zeiss…)", prix: "≈ 150 000 → 7 500 000 FCFA" },
    { nom: "Vidéo & cinéma", description: "33 caméras vidéo, 19 caméscopes, 6 caméras cinéma (Blackmagic, Canon Cinema, Sony pro), stabilisateurs (11 — DJI, Zhiyun), TV & Broadcast (10)", prix: "≈ 300 000 → 7 500 000 FCFA" },
    { nom: "Audio & podcast", description: "43 micros (cravate, sans fil, podcast, XLR — Rode, Shure, Sennheiser, Saramonic, Maono, Boya, Comica), interfaces (Focusrite, Zoom), setup podcast complet (36 produits)", prix: "≈ 15 000 → 1 100 000 FCFA" },
    { nom: "Éclairage", description: "LED (18), COB (8), softbox, flash cobra, RGB — Godox, Aputure/Amaran, Neewer, Tolifo, Phottix", prix: "≈ 25 000 → 1 500 000 FCFA" },
    { nom: "Drones & mobile", description: "14 drones + FPV + accessoires (DJI, Insta360, GoPro), setup créateur mobile (16), stabilisateurs smartphone, OBSBOT", prix: "≈ 60 000 → 3 500 000 FCFA" },
    { nom: "Streaming & accessoires", description: "Live/streaming (18 — switchers, PTZ, capture, AVMATRIX, Hollyland), téléprompteurs, trépieds/monopodes (K&F, SmallRig, Ulanzi), batteries & stockage (SanDisk)", prix: "≈ 15 000 → 2 000 000 FCFA" },
  ], // OBSERVÉ — comptages et fourchettes réels du catalogue Shopify (12/07/2026) ; l'anomalie Amaran 200X à 300 M F est une erreur de saisie boutique à signaler
  productLadder: [
    { tier: "INTAKE_FREE", palier: "Conseil gratuit (WhatsApp, boutique, Academy)", role: "capture — la confiance avant la transaction" },
    { tier: "COCKPIT_MONTHLY", palier: "Premier setup (15 000 → 300 000 F)", role: "conversion — le créateur débutant s'équipe" },
    { tier: "RETAINER_BASE", palier: "Montée en gamme créateur (300 000 → 1,5 M F)", role: "fidélisation — objectifs, éclairage, drone" },
    { tier: "RETAINER_PRO", palier: "Compte pro / B2B (1,5 → 7,5 M F, parcs et plateaux)", role: "monétisation — studios, églises, entreprises, TV" },
  ], // INFERRED — mapping proposé sur l'échelle produit interne
  businessModel:
    "Retail spécialisé bi-canal : boutique physique Akwa + e-commerce motion19.com (Shopify), vente B2C aux créateurs et B2B aux organisations (studios, églises, entreprises, TV), avec commande WhatsApp, paiement à la livraison, précommandes sur les nouveautés (Sony A1, Canon R3…) et conseil gratuit comme moteur de conversion. Revenus = marge produits ; ni location ni formation payante à ce jour (les collections Occasions/Événementiel/Éducation existent mais sont vides — des intentions à activer).", // INFERRED
  economicModels: [
    { modele: "Vente B2C créateurs (boutique + e-commerce + WhatsApp)", part: 0.6 },
    { modele: "Comptes B2B (studios, églises, entreprises, TV)", part: 0.35 },
    { modele: "Précommandes / services annexes", part: 0.05 },
  ], // INFERRED — répartition hypothétique à confirmer avec l'opérateur
  unitEconomics: {
    cac: 0,
    ltv: 0,
    ltvCacRatio: 0,
    margeBrute: 0,
    paybackPeriodMois: 0,
    budgetCom: 0,
    caVise: 0,
    commentaire:
      "NON COMMUNIQUÉ — aucune donnée financière publique (CA, marge, panier moyen, CAC). Repères observables uniquement : 373 produits, prix 15 000 F → 7,5 M F, médiane ≈ 550 000 F, cœur de gamme 150 000-1 100 000 F. À renseigner avec l'opérateur avant tout calcul d'unit economics.",
  },
  pricingJustification:
    "Prix 100 % FCFA alignés sur le pouvoir d'achat par palier de créateur (guides Academy : « Débutant (- 700 000 FCFA)… ») ; le paiement à la livraison lève le risque perçu ; l'écart éventuel avec l'import direct s'achète en garantie, SAV et immédiateté — la tranquillité fait partie du prix.", // INFERRED
  personaSegmentMap: [
    { personaName: "Le créateur de contenu", productNames: ["Setup Podcast", "Setup YouTube", "Setup Créateur Mobile", "Setup TikTok"], devotionLevel: "Intéressé", revenueContributionPct: 30 },
    { personaName: "Le vidéaste / photographe pro", productNames: ["Hybrides & objectifs", "Éclairage Godox/Aputure", "Stabilisateurs & cinéma"], devotionLevel: "Engagé", revenueContributionPct: 35 },
    { personaName: "Le responsable média d'église", productNames: ["Collection Églises (multicam/PTZ/streaming)", "Micros & mélangeurs"], devotionLevel: "Participant", revenueContributionPct: 15 },
    { personaName: "L'entreprise / agence média", productNames: ["TV & Broadcast", "Parcs caméras & audio"], devotionLevel: "Ambassadeur", revenueContributionPct: 20 },
  ], // INFERRED — contributions hypothétiques
  sacrificeRequis: {
    justification: "S'équiper sérieusement est un investissement autofinancé pour la plupart des créateurs camerounais (monétisation TikTok fermée, YouTube seul canal officiel) — Motion19 doit rendre chaque palier d'investissement rationnel et sûr.",
    prix: "Du premier accessoire à 15 000 F au plateau à 7,5 M F — l'écart avec l'import s'échange contre garantie, SAV et conseil.",
    temps: "Se déplacer à Akwa ou attendre la livraison ; suivre les conseils de mise en route.",
    effort: "Accepter la montée en gamme progressive (le bon matériel pour SON niveau) plutôt que le sur-équipement immédiat.",
  }, // INFERRED
  packagingExperience: {
    unboxingRitual: "Le déballage du setup complet — vérifié, authentique, avec les conseils de démarrage (WhatsApp après-vente).",
    packagingMaterial: "Cartons constructeurs officiels scellés — la preuve d'authenticité fait partie de l'expérience.",
    deliveryMode: "Retrait boutique Akwa, livraison au Cameroun (paiement à la livraison), précommandes datées.",
    sensoryNotes: "La boutique comme showroom : toucher le matériel, tester un micro, comparer deux objectifs avant d'acheter.",
    instagrammable: true,
  }, // INFERRED
  positioningArchetype: "PREMIUM_ACCESSIBLE",
  salesChannel: "Boutique physique (1203 Bvd de la Liberté, Akwa Douala) + e-commerce motion19.com + WhatsApp Business (+237 656 99 99 89) + livraison Cameroun",
  freeLayer: {
    whatIsFree: "Le conseil (boutique, WhatsApp, chat), la Motion19 Academy (guides par budget et par usage), les précommandes sans surcoût.",
    whatIsPaid: "Le matériel — du consommable à 15 000 F au plateau broadcast à 7,5 M F.",
    conversionLever: "Le conseil gratuit crée la confiance ; le paiement à la livraison lève le dernier frein ; le setup par usage augmente le panier (cohérence d'ensemble plutôt que pièce isolée).",
  },
  mvp: {
    exists: true,
    stage: "EN ACTIVITÉ — boutique depuis 2021, e-commerce refondu mai-juin 2026",
    description: "Boutique spécialisée + e-commerce Shopify de 373 produits/157 collections, merchandising par usage (8 setups) et verticales (Églises, Éducation, Événementiel, Conférences, Occasions — les 4 dernières vides), blog Academy, commande WhatsApp.",
    features: ["catalogue 30+ marques officielles", "setups par usage", "paiement à la livraison", "précommandes", "conseil WhatsApp", "blog Motion19 Academy"],
    launchDate: "2021-03",
    userCount: 0,
    feedbackSummary: "Compteurs clients non publiés. Signaux publics : 4 252 likes Facebook, 1 753 abonnés Instagram (1 602 posts), 1 308 TikTok, 7 logos B2B affichés. Chantiers visibles : pages paiement/retours/support en 404, témoignages gabarits à remplacer.",
  },
  proprieteIntellectuelle: {
    brevets: [],
    secretsCommerciaux: ["conditions distributeurs officiels (30+ marques)", "historique de ventes par usage/segment (5 ans)"],
    technologieProprietary: "Aucune revendiquée — la valeur est dans la curation, la supply officielle et la relation client.",
    barrieresEntree: ["relations distributeurs", "profondeur de catalogue spécialiste", "confiance locale (boutique + 5 ans)"],
    licences: ["marque Motion19 (MOTION 19 SARL)", "revente officielle des marques distribuées"],
    protectionScore: 4,
  },
  valeurMarqueTangible: [
    "Catalogue e-commerce structuré (373 produits, SEO marques « Godox Cameroun », « Neewer Cameroun »…)",
    "Fonds de commerce Akwa + stock multi-marques",
    "Fichier clients B2C/B2B de 5 ans (non publié — à exploiter en CRM)",
  ],
  valeurMarqueIntangible: [
    "Position de catégorie : « la boutique des créatifs » du Cameroun",
    "Capital confiance (authenticité, paiement à la livraison, boutique physique)",
    "Capital pédagogique naissant (Motion19 Academy)",
  ],
  valeurClientTangible: [
    "Matériel authentique garanti avec SAV local",
    "Setups cohérents par usage et par budget",
    "Livraison au Cameroun + paiement à la livraison (zéro risque prépaiement)",
  ],
  valeurClientIntangible: [
    "La confiance d'acheter local sans loterie d'import",
    "La progression accompagnée (du débutant au pro)",
    "L'appartenance au cercle des créatifs équipés sérieusement (#MadeForCreators)",
  ],
  coutMarqueTangible: ["Stock et immobilisation multi-marques", "Local commercial Akwa", "Logistique livraison + imports/douane", "Plateforme e-commerce"],
  coutMarqueIntangible: ["Exposition au risque de change et aux droits de douane", "Discipline d'authenticité (refuser le gris rentable)"],
  coutClientTangible: ["Prix du matériel (15 000 F → 7,5 M F)"],
  coutClientIntangible: ["Patience de la précommande sur certaines références", "Renoncer au fantasme du prix d'import « moins cher »"],
  roiProofs: [
    { beforeMetric: "Commander à l'étranger : semaines de délai, douane imprévisible, zéro recours", afterMetric: "Acheter à Akwa ou en ligne : dispo locale, garantie, SAV, paiement à la livraison", lift: "Risque d'achat ≈ 0", timeframe: "par achat", client: "créateurs & pros", attestation: "Modèle observé sur motion19.com (à documenter en études de cas réelles)" },
    { beforeMetric: "S'équiper pièce par pièce au hasard des conseils YouTube étrangers", afterMetric: "Un setup cohérent par usage et par palier de budget (8 univers + guides Academy)", lift: "Zéro achat inutile", timeframe: "par projet", client: "créateurs débutants/intermédiaires", attestation: "Merchandising « Explorez par univers » + guides Academy (juin 2026)" },
  ],
  experienceMultisensorielle: {
    vue: "Le showroom d'Akwa et les fiches produits propres sur fond neutre — le matériel comme objet de désir pro.",
    ouie: "Tester un micro en boutique ; le silence d'un stabilisateur bien réglé.",
    odorat: "Le neuf : carton constructeur scellé, mousse de flight case.",
    toucher: "Prendre en main le boîtier, la bague de l'objectif, le grip du gimbal avant d'acheter.",
    gout: "N/A (transposé : le goût du travail bien fait — l'image qui prend vie).",
  }, // INFERRED
} as const;

// ── PILIER E — ENGAGEMENT ──────────────────────────────────────────────

export const PILLAR_E = {
  promesseExperience:
    "Un fournisseur qui te suit : le conseil avant (usage + budget), la transaction sans risque (paiement à la livraison), l'accompagnement après (mise en route, SAV) — et une boutique qui célèbre tes créations, pas seulement tes achats.", // INFERRED
  primaryChannel: "Boutique Akwa + WhatsApp Business (+237 656 99 99 89) — le conseil personnalisé comme colonne vertébrale de la relation",
  touchpoints: [
    { canal: "Boutique physique (1203 Bvd de la Liberté, Akwa)", type: "Showroom + conseil + retrait", stadeAarrr: "Activation" },
    { canal: "motion19.com (e-commerce)", type: "Catalogue + commande + précommandes", stadeAarrr: "Acquisition" },
    { canal: "WhatsApp Business", type: "Conseil personnalisé + commande + SAV", stadeAarrr: "Retention" },
    { canal: "Instagram @motion19store (1 602 posts)", type: "Vitrine produits + nouveautés", stadeAarrr: "Acquisition" },
    { canal: "TikTok @motion19sarl (136 vidéos)", type: "Contenu créateurs + démos", stadeAarrr: "Acquisition" },
    { canal: "Facebook /motion19store (4 252 likes)", type: "Communauté locale + annonces", stadeAarrr: "Acquisition" },
    { canal: "X @motion19store", type: "Marronniers & nouveautés (#FeelFreeToCreate)", stadeAarrr: "Retention" },
    { canal: "Motion19 Academy (blog)", type: "Guides par budget et par usage", stadeAarrr: "Acquisition" },
  ],
  channelTouchpointMap: [
    { salesChannel: "Vente boutique", touchpointRefs: ["showroom Akwa", "conseil vendeur", "test matériel"] },
    { salesChannel: "Vente e-commerce", touchpointRefs: ["motion19.com", "fiches produits", "précommandes"] },
    { salesChannel: "Vente conversationnelle", touchpointRefs: ["WhatsApp Business", "chat site", "devis B2B"] },
    { salesChannel: "Acquisition contenu", touchpointRefs: ["Academy (SEO)", "TikTok démos", "Instagram nouveautés"] },
  ],
  rituels: [
    { nom: "Le marronnier mensuel", frequence: "mensuel", description: "« Hello, Septembre 🍂 On démarre le mois avec du neuf dans les rayons ✨🛒 » — le rendez-vous nouveautés observé sur X" },
    { nom: "Le guide Academy", frequence: "mensuel (blog lancé juin 2026)", description: "Un guide par usage/budget (« Quel matériel pour YouTube en 2026 ? ») signé Motion by Fotso" },
    { nom: "La précommande événement", frequence: "à chaque sortie majeure", description: "Sony A1, Canon R3… — les créateurs réservent la nouveauté avant son arrivée au Cameroun" },
    { nom: "Le conseil WhatsApp", frequence: "quotidien", description: "Réponse personnalisée usage + budget « sous 24-48h ouvrées » (page contact)" },
  ],
  sacredCalendar: {
    quotidien: "Conseil WhatsApp + activité boutique (Lun-Ven 8h-18h, Sam 9h-15h)",
    hebdomadaire: "Publications produits/démos (IG, TikTok, FB)",
    mensuel: "Marronnier nouveautés + guide Academy",
    annuel: "Rentrée des créateurs (septembre), fêtes de fin d'année, SINAC à Douala (salon AV — opportunité de présence à activer)",
  }, // INFERRED — cadence reconstituée
  aarrr: {
    acquisition: "SEO marques (« Godox Cameroun »…) + Academy + réseaux sociaux + bouche-à-oreille créateurs + vitrine Akwa",
    activation: "Premier conseil (WhatsApp/boutique) → premier achat payé à la livraison",
    retention: "SAV + suivi WhatsApp + montée en gamme par paliers + nouveautés/précommandes",
    revenue: "Panier setup (cohérence d'ensemble) + comptes B2B récurrents (parcs)",
    referral: "Prescription entre créateurs et via les pros équipés (studios, églises) — à formaliser en programme",
  },
  kpis: [
    { name: "Commandes / mois (toutes voies)", metricType: "volume", target: "à calibrer (données internes non publiées)", frequency: "mensuelle" },
    { name: "Part des ventes en setup (≥ 2 articles)", metricType: "pourcentage", target: "à calibrer", frequency: "mensuelle" },
    { name: "Clients B2B actifs", metricType: "volume", target: "à calibrer", frequency: "trimestrielle" },
    { name: "Taux de réachat 12 mois", metricType: "pourcentage", target: "à calibrer", frequency: "trimestrielle" },
    { name: "Croissance audience sociale (FB+IG+TikTok)", metricType: "volume", target: "base 12/07/2026 : 7 313 cumulés", frequency: "mensuelle" },
  ], // cibles volontairement NON inventées — la base sociale est le seul chiffre public
  superfanPortrait: {
    personaRef: "Le vidéaste / photographe professionnel",
    profile: "Le pro dont le parc entier vient de chez Motion19 : il teste en boutique, précommande les nouveautés, envoie ses clients et forme ses assistants avec les guides Academy.",
    motivations: ["un fournisseur qui ne l'a jamais trahi", "l'accès aux nouveautés avant tout le monde", "le statut de référence dans son cercle"],
    barriers: ["une seule mauvaise expérience SAV suffirait à briser la prescription"],
  }, // INFERRED
  ladderProductAlignment: [
    { devotionLevel: "Spectateur", productTierRef: "Réseaux + Academy (gratuit)", entryAction: "Suivre, lire un guide, s'inspirer", upgradeAction: "Poser sa question WhatsApp" },
    { devotionLevel: "Intéressé", productTierRef: "Conseil + premier accessoire", entryAction: "Premier achat petit budget (micro, carte, trépied)", upgradeAction: "Compléter son premier setup" },
    { devotionLevel: "Participant", productTierRef: "Setup par usage", entryAction: "S'équiper en cohérence (setup complet)", upgradeAction: "Montée en gamme (hybride, éclairage pro)" },
    { devotionLevel: "Engagé", productTierRef: "Compte créateur fidèle", entryAction: "Réachats réguliers + précommandes", upgradeAction: "Basculer son activité en pro (facturation)" },
    { devotionLevel: "Ambassadeur", productTierRef: "Compte pro / B2B", entryAction: "Équiper son studio/église/équipe", upgradeAction: "Prescrire Motion19 à son écosystème" },
    { devotionLevel: "Évangéliste", productTierRef: "Partenaire vitrine", entryAction: "Études de cas, contenus communs, ateliers", upgradeAction: "Programme ambassadeur formalisé (à créer)" },
  ], // INFERRED
  conversionTriggers: [
    { fromLevel: "Spectateur", toLevel: "Intéressé", trigger: "Un guide Academy ou une démo TikTok répond exactement à sa question de budget" },
    { fromLevel: "Intéressé", toLevel: "Participant", trigger: "Premier achat réussi payé à la livraison — la confiance est établie" },
    { fromLevel: "Participant", toLevel: "Engagé", trigger: "Le conseil de montée en gamme s'avère juste (le setup produit des résultats visibles)" },
    { fromLevel: "Engagé", toLevel: "Ambassadeur", trigger: "Le passage pro : facturation, parc, relation fournisseur suivie" },
    { fromLevel: "Ambassadeur", toLevel: "Évangéliste", trigger: "Reconnaissance publique mutuelle (étude de cas, atelier co-animé)" },
  ], // INFERRED
  programmeEvangelisation: {
    referralProgram: "Inexistant à ce jour — gisement : programme de parrainage créateurs (remise accessoire ou priorité précommande contre recommandation).",
    brandAdvocacyProgram: "Embryonnaire : 7 logos B2B affichés sans témoignage vérifiable — transformer chaque compte B2B en étude de cas authentifiée est le chantier n°1 de preuve.",
    communityRecruitment: "Les segments existent déjà en collections (Églises, Éducation, Événementiel) mais sans animation communautaire dédiée — ateliers en boutique et démo-days par verticale à créer.",
  },
  communityBuilding: {
    platforms: ["Instagram @motion19store", "TikTok @motion19sarl", "Facebook /motion19store", "X @motion19store", "WhatsApp Business (relation 1-1)"],
    moderationRules: ["Parler créateur, pas catalogue", "Jamais de promesse d'authenticité non tenue", "Répondre sous 24-48h ouvrées (engagement affiché)"],
    growthMechanics: "Le flywheel visé : créateur bien équipé → contenus meilleurs → il cite son setup → son cercle vient chercher le même conseil. Aujourd'hui non instrumenté (aucun UGC tracké, YouTube absent).",
  },
  principesCommunautaires: [
    "Le conseil est gratuit et honnête, même quand il fait vendre moins cher",
    "On célèbre les créations des clients, pas seulement les cartons vendus",
    "Chaque palier de créateur est respectable — pas de mépris du débutant",
  ], // INFERRED
  taboos: [
    "Vendre du gris ou du douteux « pour dépanner »",
    "Sur-équiper un débutant pour gonfler un panier",
    "Laisser un SAV sans réponse",
  ], // INFERRED
  ritesDePassage: [
    { rite: "Le premier conseil WhatsApp", passage: "spectateur → prospect en confiance" },
    { rite: "Le premier paiement à la livraison", passage: "prospect → client" },
    { rite: "Le premier setup complet", passage: "client → créateur équipé" },
    { rite: "L'ouverture du compte pro", passage: "créateur → partenaire B2B" },
  ], // INFERRED
  productExperienceMap: [
    { productRef: "Conseil WhatsApp", experienceDescription: "Je décris mon projet et mon budget — on me répond avec un setup précis, pas un lien catalogue.", touchpointRefs: ["WhatsApp Business"], emotionalOutcome: "confiance — « ils ont compris mon besoin »" },
    { productRef: "Setup par usage", experienceDescription: "J'achète un ensemble cohérent pensé pour MON usage (podcast, YouTube, mobile…).", touchpointRefs: ["motion19.com", "boutique"], emotionalOutcome: "sérénité — zéro erreur d'achat" },
    { productRef: "Paiement à la livraison", experienceDescription: "Je ne paie qu'en recevant — le risque a changé de camp.", touchpointRefs: ["livraison", "retrait boutique"], emotionalOutcome: "soulagement — la confiance est structurelle" },
    { productRef: "Motion19 Academy", experienceDescription: "Les guides me font progresser même quand je n'achète pas.", touchpointRefs: ["blog", "réseaux"], emotionalOutcome: "gratitude — la marque investit en moi" },
  ],
  barriersEngagement: [
    { level: "Spectateur→Intéressé", barrier: "Notoriété sociale modeste (7 313 abonnés cumulés) et zéro YouTube là où vivent les créateurs", mitigation: "Lancer la chaîne YouTube Academy + UGC créateurs équipés (#MadeForCreators)" },
    { level: "Intéressé→Participant", barrier: "Preuve sociale fragile (témoignages gabarits, pas d'avis Google trouvés)", mitigation: "Fiche Google Business + avis réels + remplacer les témoignages par des verbatims authentifiés" },
    { level: "Participant→Engagé", barrier: "Pages paiement/retours/support du site en 404 — friction de réassurance", mitigation: "Réparer les pages légales/livraison (chantier e-commerce immédiat)" },
    { level: "Engagé→Ambassadeur", barrier: "Aucun programme de fidélité/parrainage formalisé", mitigation: "Programme créateurs + études de cas B2B co-signées" },
  ],
  gamification: {
    niveaux: ["Curieux", "Premier setup", "Créateur équipé", "Compte pro", "Ambassadeur"],
    recompenses: ["priorité précommandes", "remises accessoires de parrainage (à créer)", "mise en avant des créations clients (à créer)", "ateliers/démo-days réservés (à créer)"],
  }, // INFERRED — programme à construire
  commandments: [
    { commandment: "Tu ne vendras que de l'authentique", justification: "La promesse fondatrice — un seul faux détruirait le capital confiance." },
    { commandment: "Tu conseilleras l'usage avant la marque", justification: "La pédagogie budget est l'ADN observé (Academy, setups)." },
    { commandment: "Tu répondras — avant ET après la vente", justification: "Le SAV et le suivi font la différence avec l'import." },
    { commandment: "Tu respecteras chaque palier de créateur", justification: "Le débutant d'aujourd'hui est le compte pro de demain." },
  ], // INFERRED
  sacraments: [
    { nomSacre: "Le premier conseil", trigger: "Message WhatsApp entrant", action: "Réponse setup + budget personnalisée", reward: "La confiance établie", kpi: "délai de réponse ≤ 48h ouvrées", aarrStage: "Activation" },
    { nomSacre: "La première livraison", trigger: "Commande confirmée", action: "Livraison + paiement à réception + conseils de mise en route", reward: "Le risque levé, la relation ouverte", kpi: "taux de refus à la livraison", aarrStage: "Activation" },
    { nomSacre: "La montée en gamme", trigger: "Réachat / nouveau projet", action: "Conseil de progression cohérent avec l'existant", reward: "Un parc qui grandit sans erreur", kpi: "taux de réachat 12 mois", aarrStage: "Retention" },
    { nomSacre: "Le passage pro", trigger: "Demande de devis / facturation", action: "Ouverture de compte B2B + interlocuteur dédié", reward: "Le statut de partenaire", kpi: "clients B2B actifs", aarrStage: "Revenue" },
  ], // INFERRED
  clergeStructure: {
    communityManager: "Tenue des réseaux (IG/TikTok/FB/X) — à renforcer d'un volet vidéo YouTube.",
    ambassadeurs: "Les pros et organisations équipés (studios, églises, agences) — à formaliser en programme avec études de cas.",
    supportTeam: "Conseil boutique + WhatsApp Business (réponse sous 24-48h ouvrées) + SAV.",
    specialists: "« Motion by Fotso » (plume Academy) + vendeurs spécialistes par rayon.",
  },
  pelerinages: [
    { name: "La visite boutique Akwa", frequency: "permanent", location: "1203 Bvd de la Liberté, Douala", expectedAttendance: 0, devotionLevelTarget: "Intéressé+", entryRitual: "Tester le matériel en main avant d'acheter — le showroom comme lieu de vérité." },
    { name: "SINAC (Salon International de l'Audiovisuel du Cameroun)", frequency: "annuel (Douala)", location: "Douala", expectedAttendance: 0, devotionLevelTarget: "Participant+", entryRitual: "Présence à activer : le salon des pros AV du pays se tient dans la ville de la boutique (3ᵉ édition avril-mai 2025)." },
  ],
} as const;

// ── PILIER R — RISK ────────────────────────────────────────────────────

export const PILLAR_R = {
  riskScore: 52,
  globalSwot: {
    strengths: ["Seul spécialiste AV pur identifié en ligne au Cameroun", "Catalogue profond (373 produits, 30+ marques officielles)", "Boutique physique Akwa + 5 ans d'activité", "SEO de marques établi (« Godox Cameroun », « Neewer Cameroun »)", "Verticales déjà structurées en collections (Églises…)"],
    weaknesses: ["Audience sociale modeste (7 313 cumulés) et YouTube/LinkedIn absents", "Preuve sociale non authentifiée (témoignages gabarits, avis Google introuvables)", "Pages paiement/retours/support en 404 (réassurance e-commerce)", "Récit fondateur et équipe non documentés", "Données financières internes non structurées pour le pilotage marketing"],
    opportunities: ["Écosystème créateurs en structuration (12,6 M internautes CM, SINAC à Douala)", "E-commerce local orphelin post-Jumia (départ nov. 2019)", "Segments institutionnels sous-équipés (églises, écoles, TV, événementiel)", "Location, occasions certifiées et financement — collections vides = demande non servie", "Ambition Afrique centrale affichée (mission)"],
    threats: ["Import cross-border sans garantie + contrefaçon", "Généralistes (Glotelho…) qui étoffent leur rayon photo/vidéo", "Volatilité devises / droits de douane sur l'import", "Pouvoir d'achat créateurs contraint (monétisation TikTok fermée au CM)"],
  },
  probabilityImpactMatrix: [
    { id: "risk-m19-001", risk: "Preuve sociale fragile : un prospect qui vérifie (avis, témoignages) ne trouve rien d'authentifié", probability: "HIGH", impact: "HIGH", severity: "CRITICAL", category: "MARQUE", mitigation: "Fiche Google Business + collecte d'avis réels post-achat + remplacement des témoignages gabarits + 3 études de cas B2B authentifiées.", status: "IDENTIFIED" },
    { id: "risk-m19-002", risk: "Absence de YouTube là où les créateurs cherchent leurs guides d'achat (concurrence des reviewers étrangers)", probability: "HIGH", impact: "MEDIUM", severity: "HIGH", category: "ACQUISITION", mitigation: "Chaîne Motion19 Academy : décliner les guides blog en vidéo, démos boutique, setups clients.", status: "IDENTIFIED" },
    { id: "risk-m19-003", risk: "Friction de réassurance e-commerce (pages 404 paiement/retours/support)", probability: "HIGH", impact: "MEDIUM", severity: "HIGH", category: "PRODUIT", mitigation: "Réparer les pages légales/livraison/retours — chantier immédiat à coût quasi nul.", status: "IDENTIFIED" },
    { id: "risk-m19-004", risk: "Exposition change/douane sur un stock 100 % importé", probability: "MEDIUM", impact: "HIGH", severity: "HIGH", category: "ECONOMIQUE", mitigation: "Précommandes (stock tiré par la demande), diversification distributeurs, révision de grille FCFA périodique.", status: "MITIGATING" },
    { id: "risk-m19-005", risk: "Un généraliste à fort trafic (Glotelho) verticalise l'AV avec du conseil", probability: "MEDIUM", impact: "MEDIUM", severity: "MEDIUM", category: "CONCURRENCE", mitigation: "Creuser le fossé spécialiste : contenu Academy, verticales institutionnelles, programme créateurs — ce qu'un rayon ne peut pas copier.", status: "IDENTIFIED" },
  ],
  mitigationPriorities: [
    { action: "Réparer la réassurance : pages 404 + fiche Google Business + premiers avis réels", owner: "E-commerce Motion19", timeline: "30 jours", investment: "Quasi nul (temps interne)" },
    { action: "Authentifier la preuve : 3 études de cas B2B (Balafon, Chanas, Laura Dave…) + verbatims clients réels", owner: "Direction + UPgraders", timeline: "60 jours", investment: "Faible (entretiens + rédaction)" },
    { action: "Ouvrir le front vidéo : chaîne YouTube Motion19 Academy (guides existants → format vidéo)", owner: "Contenu", timeline: "90 jours", investment: "Modéré (le matériel de tournage est déjà en rayon)" },
  ],
  pillarGaps: {
    a: "Récit fondateur et équipe dirigeante non documentés — le mythe d'origine existe forcément (2021, Akwa) mais n'est raconté nulle part.",
    d: "La position « seul spécialiste » n'est revendiquée nulle part explicitement — la catégorie est à préempter en copy avant qu'un concurrent ne le fasse.",
    v: "Unit economics non communiqués : impossible de calibrer CAC/LTV et budgets marketing sans les données internes.",
    e: "Aucun programme de fidélité/parrainage/UGC — l'engagement repose entièrement sur la qualité de la relation 1-1 WhatsApp.",
  },
  overtonBlockers: [
    { risk: "Perception « le matériel pro, ça s'importe » chez les pros aguerris", blockingPerception: "Acheter local = payer plus cher pour la même chose", mitigation: "Chiffrer publiquement le coût complet de l'import (délais + douane + zéro SAV + risque faux) vs l'achat garanti local", devotionLevelBlocked: "ENGAGE" },
    { risk: "Perception « équipement pro = réservé aux riches » chez les débutants", blockingPerception: "Motion19 serait « trop haut de gamme pour moi »", mitigation: "Marteler les paliers d'entrée (setups dès 15-150 K F) et la pédagogie budget de l'Academy", devotionLevelBlocked: "INTERESSE" },
  ],
  coherenceRisks: [
    { pillar1: "A", pillar2: "E", field1: "preuvesAuthenticite", field2: "programmeEvangelisation", contradiction: "La marque promet l'authenticité mais affiche des témoignages gabarits — l'écart entre promesse et preuve est le risque de cohérence n°1.", severity: "HIGH" },
    { pillar1: "D", pillar2: "V", field1: "positionnement premium accessible", field2: "exposition douane/change", contradiction: "Une hausse douane/change forcerait des prix qui contredisent « accessible » — la grille FCFA doit absorber sans casser la promesse.", severity: "MEDIUM" },
  ],
  devotionVulnerabilities: [
    { level: "Intéressé", churnCause: "Vérification de réassurance qui échoue (404, pas d'avis)", mitigation: "Chantier réassurance 30 jours (risk-m19-003 + 001)." },
    { level: "Engagé", churnCause: "Une rupture de stock ou un SAV raté sur du matériel de gagne-pain", mitigation: "Précommandes datées fiables + SLA SAV explicite pour les comptes pro." },
  ],
  microSWOTs: {
    funnel: { strengths: ["SEO marques + Academy naissante"], weaknesses: ["zéro YouTube, faible social"], opportunities: ["requêtes « quel matériel pour… » non servies localement"], threats: ["reviewers étrangers captent la recherche"] },
    produit: { strengths: ["catalogue profond, setups par usage"], weaknesses: ["collections verticales vides (Occasions, Éducation…)"], opportunities: ["location/occasions/financement à lancer"], threats: ["rayon AV des généralistes"] },
  },
} as const; // Ensemble du pilier : analyse externe NEFER (sources publiques) — à réviser avec les données internes

// ── PILIER T — TRACK ───────────────────────────────────────────────────

export const PILLAR_T = {
  brandMarketFitScore: 62,
  lastMarketDataRefresh: "2026-07-12T00:00:00.000Z",
  sectorKnowledgeReused: false,
  triangulation: {
    customerInterviews: "AUCUN entretien client mené — signaux indirects uniquement : 5 ans d'activité continue, 1 602 posts IG, clients B2B affichés, engagement TikTok (4 720 likes / 136 vidéos). Le programme d'entretiens (créateurs + B2B) est le premier chantier de validation.",
    competitiveAnalysis: "Recherche exhaustive juillet 2026 : aucun spécialiste audiovisuel pur concurrent identifié en ligne au Cameroun — la concurrence est généraliste (Glotelho, NowTech, KAMKA, iziway), informelle (occasion CoinAfrique) ou cross-border (Ubuy). La catégorie « équipementier des créateurs » est libre.",
    trendAnalysis: "DataReportal Digital 2026 Cameroun : 12,6 M d'internautes (41,9 % de pénétration), 5,9 M d'identités réseaux sociaux (19,6 %), 29 M de connexions mobiles (96,4 %), débit fixe médian 11 Mbps. Écosystème AV pro en structuration : SINAC à Douala (3ᵉ édition avril-mai 2025, 15+ pays). Monétisation créateurs contrainte : TikTok Creator Rewards fermé au CM, YouTube seul canal officiel en zone CEMAC → l'équipement est autofinancé (sensibilité prix + besoin de paliers).",
    financialBenchmarks: "Fourchettes observées au catalogue : 15 000 F (entrée) → 7 500 000 F (Canon C300 III), médiane ≈ 550 000 F, cœur de gamme 150 000-1 100 000 F. E-commerce camerounais : modèle dominant = vente sociale WhatsApp + paiement à la livraison (post-départ Jumia, nov. 2019). Données de CA/marge du secteur local : non publiées.",
  },
  hypothesisValidation: [
    { id: "hyp-m19-001", hypothesis: "Les créateurs camerounais préfèrent acheter local (garanti, FCFA, livraison) plutôt qu'importer, à écart de prix raisonnable", validationMethod: "Entretiens clients + analyse des ventes vs paniers abandonnés + test copy « coût complet de l'import »", status: "UNTESTED", evidence: "5 ans d'activité et 373 produits suggèrent une demande réelle ; l'élasticité prix vs import n'est pas mesurée" },
    { id: "hyp-m19-002", hypothesis: "Les verticales institutionnelles (églises, écoles, événementiel) sont le relais de croissance B2B principal", validationMethod: "Pipeline de devis par verticale + 3 pilotes églises documentés", status: "UNTESTED", evidence: "Collections dédiées créées (Églises : 4 produits ; Éducation/Événementiel/Conférences : créées mais vides) + 7 logos B2B affichés" },
    { id: "hyp-m19-003", hypothesis: "Le contenu vidéo local (YouTube Academy) convertit mieux que le paid sur ce marché de considération longue", validationMethod: "Lancer la chaîne + UTM + comparer coût/vente assistée vs campagnes payantes", status: "UNTESTED", evidence: "Les guides blog existent (6 articles juin 2026) ; les requêtes « quel matériel pour… » sont servies par des reviewers étrangers hors-marché FCFA" },
  ],
  tamSamSom: {
    tam: { value: 5900000, description: "Identités réseaux sociaux au Cameroun (DataReportal 2026) — l'univers d'où émergent les créateurs de contenu" },
    sam: { value: 120000, description: "HYPOTHÈSE INTERNE À VALIDER : créateurs actifs, pros de l'image, églises/écoles/entreprises produisant du contenu au CM (≈ 2 % des identités sociales) — aucune source publique ne dénombre ce segment" },
    som: { value: 6000, description: "HYPOTHÈSE INTERNE À VALIDER : clients adressables/an (Douala + livraison nationale) — à calibrer sur l'historique de ventes réel (non communiqué)" },
  },
  riskValidation: [
    { riskId: "risk-m19-001", riskRef: "Preuve sociale fragile", marketEvidence: "Vérifié en ligne le 12/07/2026 : fiche Google Business introuvable via le web, témoignages home citant des produits hors catalogue (Blue Yeti, Elgato, BenQ).", status: "CONFIRMED", source: "Audit web NEFER (motion19.com + recherches Google/Bing + annuaires camerounais)" },
    { riskId: "risk-m19-003", riskRef: "Friction de réassurance e-commerce", marketEvidence: "Pages paiement, retours, support et mentions légales du footer en 404 (site refondu mai-juin 2026, finitions en cours).", status: "CONFIRMED", source: "Tests directs des URLs du footer motion19.com (12/07/2026)" },
  ],
  overtonPosition: {
    currentPerception: "Une boutique de matériel parmi les options (généralistes, import, occasion) — connue de son cercle, pas encore installée comme LA référence",
    marketSegments: ["créateurs de contenu CM", "pros image/son", "églises & institutions", "entreprises/agences/TV"],
    measurementMethod: "Signaux publics uniquement (audience sociale, SEO, avis) — verbatims clients à collecter",
    measuredAt: "2026-07-12",
    confidence: 0.5,
  },
  perceptionGap: {
    currentPerception: "« Une boutique qui vend du matériel photo/vidéo à Douala »",
    targetPerception: "« LA maison d'équipement des créateurs camerounais — celle qui te fait réussir, pas juste acheter »",
    gapDescription: "Le fossé est un fossé de preuve et de récit, pas d'offre : le catalogue est déjà là, la confiance publique authentifiée et le contenu vidéo manquent.",
    gapScore: 5,
  },
  traction: {
    loisSignees: 0,
    utilisateursInscrits: 0,
    utilisateursActifs: 0,
    croissanceHebdo: 0,
    revenusRecurrents: 0,
    metriqueCle: "Ventes/mois et panier moyen NON COMMUNIQUÉS — à brancher depuis les données internes (Shopify + boutique) avant tout pilotage",
    preuvesTraction: ["373 produits / 157 collections publiés (12/07/2026)", "5 ans d'activité continue (mars 2021 → refonte mai-juin 2026)", "Audience sociale : FB 4 252 · IG 1 753 (1 602 posts) · TikTok 1 308 (136 vidéos)", "7 logos clients B2B affichés (à authentifier)", "SEO : positionné sur « Godox Cameroun », « Neewer Cameroun », « Saramonic Cameroun »"],
    tractionScore: 3,
  },
  marketReality: {
    macroTrends: ["12,6 M d'internautes CM, +41,9 % de pénétration (DataReportal 2026)", "Écosystème AV pro en structuration — SINAC à Douala, 15+ pays représentés (2025)", "E-commerce local = vente sociale WhatsApp + paiement à la livraison (post-Jumia 2019)", "Monétisation créateurs contrainte en zone CEMAC (TikTok fermé, YouTube seul canal officiel)"],
    weakSignals: ["Collections Occasions/Éducation/Événementiel créées mais vides — demandes pressenties non servies", "Les requêtes d'achat des créateurs CM sont servies par des reviewers étrangers hors-contexte FCFA", "Les églises s'équipent en streaming multicam (segment déjà structuré en collection chez Motion19)"],
  },
  weakSignalAnalysis: [
    { id: "ws-m19-001", thesis: "L'équipement autofinancé appelle des solutions d'étalement (location, occasions certifiées, paiement échelonné mobile money)", rawEvent: "Monétisation TikTok fermée au CM + collections Occasions/location vides + cœur de gamme à 150K-1,1M F pour des acheteurs sans revenus de plateforme", causalChain: [{ from: "créateurs sans revenus de plateforme", to: "équipement autofinancé par paliers" }, { from: "équipement autofinancé", to: "demande de location/occasion/étalement" }], impactCategory: "OPPORTUNITY", brandImpact: "Premier acteur à offrir location + occasions certifiées + étalement mobile money = fossé concurrentiel durable", confidence: 0.65, urgency: "MEDIUM", relatedPillars: ["V", "E"], supportingSignals: ["collections vides créées par la boutique elle-même", "marché de l'occasion actif sur CoinAfrique"], recommendedAction: "Étudier une offre « Occasions certifiées » + location courte durée sur le parc démo (validation opérateur requise)" },
  ],
  competitorOvertonPositions: [
    { competitorName: "Glotelho (généraliste leader)", overtonPosition: "Le statu quo : l'équipement AV comme rayon d'un e-commerce généraliste", relativeToUs: "Motion19 déplace la norme vers le spécialiste-conseil : on n'achète pas une caméra comme un mixeur" },
  ],
  marketDataSources: [
    { sourceType: "FIELD", title: "Audit web NEFER — motion19.com (catalogue Shopify JSON : 373 produits/157 collections, prix, marques, collections)", collectedAt: "2026-07-12T00:00:00.000Z", reliability: 0.85 },
    { sourceType: "REPORT", title: "DataReportal — Digital 2026: Cameroon (12,6 M internautes / 41,9 %, 5,9 M identités sociales, 29 M connexions mobiles)", url: "https://datareportal.com/reports/digital-2026-cameroon", collectedAt: "2026-07-12T00:00:00.000Z", reliability: 0.9 },
    { sourceType: "FIELD", title: "Relevés sociaux publics (12/07/2026) : FB 4 252 likes · IG 1 753 abonnés/1 602 posts · TikTok 1 308 abonnés/136 vidéos (JSON page)", collectedAt: "2026-07-12T00:00:00.000Z", reliability: 0.7 },
    { sourceType: "REPORT", title: "D&B — fiche MOTION 19 SARL (Douala) — existence légale (contenu détaillé paywallé)", url: "https://www.dnb.com/business-directory/company-profiles.motion_19_sarl.106491ef79fc04832ab78402454d0ba9.html", collectedAt: "2026-07-12T00:00:00.000Z", reliability: 0.6 },
    { sourceType: "REPORT", title: "Xinhua — SINAC Douala (2ᵉ édition mai 2024 ; 3ᵉ édition avril-mai 2025)", url: "https://french.xinhuanet.com/20240526/b044f37d5ab049729dc4a511bde7da5a/c.html", collectedAt: "2026-07-12T00:00:00.000Z", reliability: 0.7 },
    { sourceType: "REPORT", title: "Jeune Afrique — Jumia suspend son activité au Cameroun (nov. 2019) — contexte e-commerce local", url: "https://www.jeuneafrique.com/858747/economie-entreprises/e-commerce-en-difficulte-jumia-suspend-son-activite-au-cameroun/", collectedAt: "2026-07-12T00:00:00.000Z", reliability: 0.8 },
    { sourceType: "REPORT", title: "RDAP registre — motion19.com enregistré le 30/03/2021 (GoDaddy)", url: "https://rdap.org/domain/motion19.com", collectedAt: "2026-07-12T00:00:00.000Z", reliability: 0.95 },
  ],
} as const;

// ── PILIER I — INNOVATION ──────────────────────────────────────────────

export const PILLAR_I = {
  totalActions: 10,
  // Budgets = HYPOTHÈSES prudentes en FCFA (aucun budget client communiqué) —
  // à recalibrer avec l'opérateur avant toute exécution.
  catalogueParCanal: {
    DIGITAL: [
      { id: "M1", action: "Chaîne YouTube « Motion19 Academy » — décliner les guides blog en vidéo (matériel de tournage déjà en rayon)", format: "vidéos guides + démos", objectif: "Occuper les requêtes « quel matériel pour… » en contexte FCFA", status: "SELECTED_FOR_ROADMAP", timeframe: "SPRINT_90", budgetEstime: "LOW", budget: 300000, pilierImpact: "D" },
      { id: "M2", action: "Chantier réassurance : pages 404 (paiement/retours/support/mentions) + fiche Google Business + collecte d'avis post-achat", format: "e-commerce + local SEO", objectif: "Zéro friction de vérification pour un prospect", status: "SELECTED_FOR_ROADMAP", timeframe: "SPRINT_90", budgetEstime: "LOW", budget: 50000, pilierImpact: "E" },
      { id: "M3", action: "SEO éditorial Academy : 2 guides/mois par usage et par palier de budget", format: "articles + fiches setup", objectif: "Trafic organique qualifié récurrent", status: "SELECTED_FOR_ROADMAP", timeframe: "PHASE_1", budgetEstime: "LOW", budget: 200000, pilierImpact: "D" },
    ],
    SOCIAL: [
      { id: "M4", action: "Programme UGC #MadeForCreators : mettre en avant les créations des clients équipés (repost + mini-interviews)", format: "UGC + témoignages vidéo", objectif: "Preuve sociale authentique + reach organique", status: "SELECTED_FOR_ROADMAP", timeframe: "SPRINT_90", budgetEstime: "LOW", budget: 150000, pilierImpact: "A" },
      { id: "M5", action: "Séries TikTok « le setup de… » (podcasteur, église, vidéaste mariage…) tournées en boutique", format: "vidéos courtes verticales", objectif: "Convertir l'audience TikTok existante (1 308) en clients", status: "RECOMMENDED", timeframe: "PHASE_1", budgetEstime: "LOW", budget: 100000, pilierImpact: "E" },
    ],
    EVENT: [
      { id: "M6", action: "Présence SINAC Douala (stand/démos) + ateliers mensuels en boutique par verticale (églises, podcast…)", format: "salon + ateliers showroom", objectif: "Capter les pros et institutions là où ils se réunissent", status: "RECOMMENDED", timeframe: "PHASE_2", budgetEstime: "MEDIUM", budget: 500000, pilierImpact: "E" },
    ],
    PARTENARIAT: [
      { id: "M7", action: "3 études de cas B2B authentifiées (Balafon Media, Chanas, Laura Dave…) co-signées et publiées", format: "études de cas + verbatims", objectif: "Transformer les logos affichés en preuve vérifiable", status: "SELECTED_FOR_ROADMAP", timeframe: "SPRINT_90", budgetEstime: "LOW", budget: 100000, pilierImpact: "A" },
      { id: "M8", action: "Offres verticales packagées : « Église connectée » (multicam+streaming), « Studio podcast clé en main », « Kit école de cinéma »", format: "bundles + devis types", objectif: "Activer les collections verticales vides avec une offre réelle", status: "RECOMMENDED", timeframe: "PHASE_1", budgetEstime: "LOW", budget: 100000, pilierImpact: "V" },
    ],
    RP: [
      { id: "M9", action: "Récit fondateur : documenter et raconter l'histoire MOTION 19 (2021, Akwa) — page À propos enrichie + presse locale", format: "storytelling + RP locale", objectif: "Donner un visage et un mythe d'origine à la marque", status: "RECOMMENDED", timeframe: "PHASE_1", budgetEstime: "LOW", budget: 50000, pilierImpact: "A" },
      { id: "M10", action: "Étude d'opportunité « Occasions certifiées + location courte durée » (signal ws-m19-001)", format: "étude + pilote borné", objectif: "Décider GO/NO-GO sur les offres d'accès (validation opérateur)", status: "RECOMMENDED", timeframe: "PHASE_2", budgetEstime: "LOW", budget: 0, pilierImpact: "V" },
    ],
  },
  assetsProduisibles: [
    { asset: "Vidéos guides Academy (YouTube)", type: "VIDEO", usage: "Acquisition + considération" },
    { asset: "Études de cas B2B authentifiées", type: "PREUVE", usage: "Conversion B2B + réassurance" },
    { asset: "UGC créateurs équipés (#MadeForCreators)", type: "SOCIAL", usage: "Preuve sociale + reach" },
    { asset: "Bundles verticaux (Église connectée, Studio podcast…)", type: "OFFRE", usage: "Activation des segments institutionnels" },
    { asset: "Récit fondateur (page À propos + dossier presse)", type: "ÉDITORIAL", usage: "Authenticité + différenciation" },
  ],
  activationsPossibles: [
    { activation: "Démo-day mensuel en boutique (tester les nouveautés)", canal: "EVENT", cible: "Créateurs et pros de Douala", budgetEstime: "LOW" },
    { activation: "Partenariats écoles de cinéma/audiovisuel (kits + tarifs étudiants)", canal: "PARTENARIAT", cible: "La prochaine génération de pros", budgetEstime: "MEDIUM" },
    { activation: "Co-animations marques distribuées (Godox Day, DJI Day) avec les distributeurs officiels", canal: "PARTENARIAT", cible: "Base clients + prospects pros", budgetEstime: "LOW" },
  ],
  formatsDisponibles: ["vidéo guide YouTube", "vidéo courte TikTok/Reels", "étude de cas PDF/web", "UGC repost", "atelier showroom", "bundle/devis type", "article Academy"],
  brandPlatform: {
    name: "Motion19",
    benefit: "T'équiper comme un pro sans te tromper — authentique, garanti, en FCFA, conseillé",
    target: "Créateurs de contenu, pros de l'image et du son, églises et institutions, entreprises — Cameroun puis Afrique centrale",
    competitiveAdvantage: "Le seul spécialiste AV pur du marché : profondeur de catalogue + distribution officielle + conseil par usage et par budget",
    emotionalBenefit: "La sérénité de l'achat sûr + la fierté d'appartenir aux créatifs équipés sérieusement",
    functionalBenefit: "373 produits officiels, setups par usage, paiement à la livraison, garantie + SAV local",
    supportedBy: ["30+ marques officielles", "boutique physique Akwa depuis 2021", "Motion19 Academy", "les setups par usage"],
  },
  actionsByDevotionLevel: {
    SPECTATEUR: ["Regarder un guide Academy", "Suivre #MadeForCreators"],
    INTERESSE: ["Poser sa question WhatsApp", "Visiter la boutique / tester en main"],
    PARTICIPANT: ["Acheter son premier setup", "Laisser un avis vérifié"],
    ENGAGE: ["Monter en gamme conseillé", "Précommander les nouveautés"],
    AMBASSADEUR: ["Ouvrir un compte pro", "Co-signer une étude de cas"],
    EVANGELISTE: ["Prescrire à son écosystème", "Co-animer un atelier en boutique"],
  },
  riskMitigationActions: [
    { action: "Chantier réassurance (M2)", riskId: "risk-m19-001", riskRef: "Preuve sociale fragile", canal: "DIGITAL", expectedImpact: "Un prospect qui vérifie trouve des avis réels et des pages qui répondent" },
    { action: "Chaîne YouTube Academy (M1)", riskId: "risk-m19-002", riskRef: "Absence sur YouTube", canal: "DIGITAL", expectedImpact: "Les requêtes d'achat locales atterrissent chez Motion19, pas chez des reviewers hors-marché" },
  ],
  innovationsProduit: [
    { name: "Occasions certifiées Motion19", type: "OFFRE", description: "Reprise-revente garantie du matériel — activer la collection vide + contrer CoinAfrique", feasibility: "MEDIUM", horizon: "H2", devotionImpact: "Ouvre l'entrée de gamme sans sacrifier la confiance" },
    { name: "Location courte durée", type: "OFFRE", description: "Louer le plateau du week-end (mariage, clip, événement) sur le parc démo", feasibility: "MEDIUM", horizon: "H2", devotionImpact: "Fait entrer les pros événementiels dans la relation" },
    { name: "Étalement mobile money", type: "REVENUE", description: "Paiement échelonné (Orange Money/MTN MoMo) sur le cœur de gamme 150K-1,1M F", feasibility: "GATED_PARTENAIRE", horizon: "H2", devotionImpact: "Lève la barrière n°1 des créateurs autofinancés" },
    { name: "Motion19 Academy niveau 2", type: "SERVICE", description: "Ateliers payants de prise en main (caméra, son, streaming) en boutique", feasibility: "HIGH", horizon: "H1", devotionImpact: "Monétise la pédagogie + approfondit la relation" },
  ],
  actionsByOvertonPhase: [
    { phase: "Révéler", actions: ["Récit fondateur (M9)", "Revendiquer la catégorie « La Boutique Des Créatifs » en copy"] },
    { phase: "Prouver", actions: ["Études de cas B2B (M7)", "Avis réels + UGC #MadeForCreators (M2/M4)"] },
    { phase: "Normaliser", actions: ["YouTube Academy (M1)", "Ateliers + SINAC (M6) — le réflexe « on passe chez Motion19 »"] },
  ],
  hypothesisTestActions: [
    { testAction: "Publier 3 vidéos guides + mesurer ventes assistées (UTM/code promo)", hypothesisId: "hyp-m19-003", hypothesisRef: "Le contenu vidéo local convertit", expectedOutcome: "Coût/vente assistée < coût/vente paid équivalent", cost: "300K F (M1)" },
    { testAction: "Packager « Église connectée » + le proposer à 10 églises de Douala", hypothesisId: "hyp-m19-002", hypothesisRef: "Les verticales institutionnelles = relais B2B", expectedOutcome: "≥ 3 devis signés sur 10 présentations", cost: "100K F (M8)" },
  ],
  copyStrategy: {
    promise: "Équipe-toi comme un pro, sans te tromper.",
    rtb: "30+ marques officielles · garantie + SAV local · paiement à la livraison · conseil par usage et par budget depuis 2021.",
    tonOfVoice: "Chaleureux-pro, pédagogue, local — on tutoie le créateur sur les réseaux, on vouvoie l'institution en devis.",
    keyMessages: ["Donnez vie à chaque image", "La Boutique Des Créatifs", "Authentique, garanti, en FCFA", "#FeelFreeToCreate #MadeForCreators"],
    doNot: ["promettre le prix de l'import gris", "jargonner sans traduire en usage", "sur-équiper un débutant"],
  },
  bigIdea: {
    concept: "La maison des créateurs",
    mechanism: "Motion19 n'est pas là où l'on achète du matériel — c'est là où les créateurs camerounais s'équipent, apprennent et se montrent : boutique + Academy + preuve sociale des pairs.",
    insight: "Le créateur camerounais autofinance son matériel sans filet : ce qu'il achète d'abord, c'est la certitude de ne pas se tromper.",
    adaptations: ["B2C : setups par palier + Academy", "B2B/institutions : bundles verticaux + études de cas", "communauté : UGC #MadeForCreators + ateliers"],
  }, // INFERRED — proposition de big idea à valider
  potentielBudget: { production: 550000, media: 400000, talent: 300000, logistics: 500000, technology: 50000, total: 1800000 },
  mediaPlan: {
    totalBudget: 400000,
    channels: [
      { channel: "YouTube (boost guides Academy)", budget: 150000, objective: "Vues qualifiées sur requêtes d'achat" },
      { channel: "Meta/TikTok (retargeting catalogue + UGC)", budget: 200000, objective: "Conversion des audiences existantes" },
      { channel: "Local SEO / Google Business", budget: 50000, objective: "Réassurance + trafic boutique" },
    ],
  }, // HYPOTHÈSES budgétaires — à recalibrer avec l'opérateur
  generationMeta: { gloryToolsUsed: ["canon-operateur"], qualityScore: 6, generatedAt: "2026-07-12T00:00:00.000Z" },
} as const;

// ── PILIER S — STRATEGY ────────────────────────────────────────────────

export const PILLAR_S = {
  visionStrategique:
    "Installer Motion19 comme LA maison d'équipement des créateurs camerounais — la catégorie « spécialiste » revendiquée, prouvée et défendue — puis étendre la promesse à l'Afrique centrale (mission affichée), en gardant le conseil et l'authenticité comme fossé.",
  globalBudget: "HYPOTHÈSE 1 800 000 FCFA (programme 90 jours + phase 1) — aucun budget client communiqué, à arbitrer avec l'opérateur",
  fenetreOverton: {
    perceptionActuelle: "« Une boutique de matériel photo/vidéo à Douala » — connue de son cercle, pas installée comme référence nationale",
    perceptionCible: "« La Boutique Des Créatifs — le réflexe équipement des créateurs camerounais, du premier micro au plateau broadcast »",
    ecart: "Un fossé de preuve (avis, études de cas) et de récit (fondateur, visages), pas d'offre : le catalogue et la confiance transactionnelle existent déjà",
    strategieDeplacement: [
      { etape: "Révéler", action: "Raconter le récit fondateur + revendiquer explicitement la catégorie « seul spécialiste AV du Cameroun »" },
      { etape: "Prouver", action: "Avis réels, études de cas B2B co-signées, UGC des créateurs équipés — la preuve avant la promesse" },
      { etape: "Normaliser", action: "YouTube Academy + ateliers + SINAC : Motion19 présent partout où un créateur se pose une question de matériel" },
    ],
  },
  axesStrategiques: [
    { axe: "Préempter la catégorie « équipementier des créateurs »", pillarsLinked: ["A", "D"], kpis: ["récit fondateur publié", "copy catégorie déployée (site + réseaux)", "3 études de cas B2B live"] },
    { axe: "Combler le fossé de preuve et de réassurance", pillarsLinked: ["E", "R"], kpis: ["0 page 404 sur le funnel", "fiche Google Business + ≥ 20 avis réels", "témoignages gabarits remplacés"] },
    { axe: "Ouvrir le front contenu vidéo (Academy)", pillarsLinked: ["D", "T"], kpis: ["chaîne YouTube live", "≥ 6 vidéos guides", "ventes assistées trackées (UTM)"] },
    { axe: "Verticaliser le B2B institutionnel", pillarsLinked: ["V", "E"], kpis: ["3 bundles verticaux packagés", "10 présentations églises/écoles", "≥ 3 devis signés"] },
  ],
  sprint90Days: [
    { action: "Chantier réassurance : réparer les pages 404, créer/vérifier la fiche Google Business, lancer la collecte d'avis post-achat", kpi: "0 page 404 + ≥ 20 avis réels", priority: 1, owner: "E-commerce Motion19", isRiskMitigation: true, devotionImpact: "INTERESSE", sourceRef: "M2", sourceInitiativeId: "M2" },
    { action: "Authentifier la preuve B2B : 3 études de cas co-signées (parmi les 7 logos affichés)", kpi: "3 études de cas publiées", priority: 2, owner: "Direction + UPgraders", isRiskMitigation: true, devotionImpact: "AMBASSADEUR", sourceRef: "M7", sourceInitiativeId: "M7" },
    { action: "Lancer la chaîne YouTube Motion19 Academy (6 premières vidéos = les guides blog existants)", kpi: "6 vidéos live + UTM de tracking", priority: 3, owner: "Contenu", isRiskMitigation: false, devotionImpact: "SPECTATEUR", sourceRef: "M1", sourceInitiativeId: "M1" },
    { action: "Programme UGC #MadeForCreators : 10 créateurs équipés mis en avant", kpi: "10 posts UGC + reach mesuré", priority: 4, owner: "Social", isRiskMitigation: false, devotionImpact: "ENGAGE", sourceRef: "M4", sourceInitiativeId: "M4" },
    { action: "Documenter et publier le récit fondateur (page À propos enrichie)", kpi: "récit live + 1 retombée presse locale", priority: 5, owner: "Direction + UPgraders", isRiskMitigation: false, devotionImpact: "SPECTATEUR", sourceRef: "M9", sourceInitiativeId: "M9" },
  ],
  facteursClesSucces: ["La preuve avant la promesse (avis réels, études de cas, UGC)", "La discipline d'authenticité produit (zéro gris)", "Le conseil par palier comme signature relationnelle", "L'accès aux données internes (ventes, panier, marges) pour piloter — aujourd'hui non communiquées"],
  roadmap: [
    { phase: "Phase 1 — Prouver (J1-J90)", objectif: "Réassurance + preuve authentifiée + front vidéo ouvert", objectifDevotion: "Convertir les INTÉRESSÉS qui vérifient", actions: ["M2 réassurance", "M7 études de cas", "M1 YouTube", "M4 UGC", "M9 récit"], budget: 900000, duree: "3 mois" },
    { phase: "Phase 2 — Verticaliser (M4-M6)", objectif: "Bundles institutionnels + ateliers + SEO éditorial cadencé", objectifDevotion: "Ouvrir des comptes PARTICIPANTS/B2B", actions: ["M8 bundles", "M3 SEO Academy", "M5 séries TikTok", "ateliers boutique"], budget: 500000, duree: "3 mois" },
    { phase: "Phase 3 — Rayonner (M7-M12)", objectif: "SINAC + programmes d'accès (occasions/location/étalement) si GO", objectifDevotion: "AMBASSADEURS institutionnels + prescription", actions: ["M6 SINAC/ateliers", "M10 étude occasions/location", "programme parrainage"], budget: 400000, duree: "6 mois" },
  ],
  selectedFromI: [
    { sourceRef: "M2", sourceInitiativeId: "M2", action: "Chantier réassurance", phase: "SPRINT_90", priority: 1 },
    { sourceRef: "M7", sourceInitiativeId: "M7", action: "3 études de cas B2B", phase: "SPRINT_90", priority: 2 },
    { sourceRef: "M1", sourceInitiativeId: "M1", action: "Chaîne YouTube Academy", phase: "SPRINT_90", priority: 3 },
    { sourceRef: "M4", sourceInitiativeId: "M4", action: "Programme UGC #MadeForCreators", phase: "SPRINT_90", priority: 4 },
    { sourceRef: "M3", sourceInitiativeId: "M3", action: "SEO éditorial Academy", phase: "PHASE_1", priority: 5 },
  ],
  devotionFunnel: [
    { phase: "J90", spectateurs: 0, interesses: 0, participants: 0, engages: 0, ambassadeurs: 0, evangelistes: 0 },
  ], // volontairement NON projeté : aucune base de départ chiffrée (ventes non communiquées) — à construire avec l'opérateur
  overtonMilestones: [
    { phase: "Prouver (J1-J90)", currentPerception: "Une boutique de matériel", targetPerception: "Le spécialiste qui prouve (avis, cas, visages)", measurementMethod: "Avis Google + verbatims collectés + trafic Academy" },
    { phase: "Normaliser (M4-M12)", currentPerception: "Un bon spécialiste local", targetPerception: "LE réflexe équipement des créateurs CM", measurementMethod: "Part de voix « équipement créateur Cameroun » + ventes assistées contenu + comptes B2B" },
  ],
  teamStructure: [
    { name: "Direction MOTION 19 SARL", title: "Direction générale", responsibility: "Offre, supply, boutique, arbitrages" },
    { name: "UPgraders (La Fusée)", title: "Opérateur de marque", responsibility: "Stratégie, récit, preuve, contenu, mesure" },
    { name: "« Motion by Fotso » + équipe boutique", title: "Contenu & conseil", responsibility: "Academy, vidéos, conseil client, SAV" },
  ],
  coherenceScore: 62,
  syntheseExecutive:
    "Motion19 a déjà gagné la bataille de l'offre (373 produits, 30+ marques officielles, seul spécialiste AV pur identifié au Cameroun) mais pas encore celle de la preuve ni du récit : audience sociale modeste, YouTube absent, témoignages non authentifiés, pages de réassurance en 404, fondateurs invisibles. La stratégie des 12 prochains mois est donc une stratégie de PREUVE : réparer la réassurance (30 j), authentifier la preuve B2B (60 j), ouvrir le front vidéo Academy (90 j), puis verticaliser l'institutionnel (églises, écoles, événementiel) et étudier les offres d'accès (occasions, location, étalement mobile money) qui répondent à la réalité des créateurs autofinancés. Les compteurs internes (ventes, panier, marge) ne sont pas communiqués : les brancher est le prérequis du pilotage.",
  kpiDashboard: [
    { name: "Avis Google réels", pillar: "E", target: "≥ 20 à J90", frequency: "mensuelle" },
    { name: "Études de cas B2B publiées", pillar: "A", target: "3 à J90", frequency: "mensuelle" },
    { name: "Vidéos Academy + ventes assistées", pillar: "D", target: "6 vidéos, tracking actif", frequency: "mensuelle" },
    { name: "Devis verticaux signés", pillar: "V", target: "≥ 3 (M6)", frequency: "trimestrielle" },
    { name: "Audience sociale cumulée", pillar: "E", target: "base 7 313 (12/07/2026) — croissance à définir", frequency: "mensuelle" },
  ],
  northStarKPI: {
    name: "Ventes assistées par le conseil et le contenu (WhatsApp + Academy + UGC)",
    target: 0, // cible à calibrer avec les données internes — jamais inventée
    currentValue: 0,
    frequency: "mensuelle",
  },
  budgetBreakdown: {
    production: 550000,
    media: 400000,
    talent: 300000,
    logistics: 400000,
    technology: 50000,
    contingency: 100000,
    agencyFees: 0,
  }, // HYPOTHÈSE — à arbitrer
  budgetByDevotion: {
    acquisition: 700000,
    conversion: 600000,
    retention: 300000,
    evangelisation: 200000,
  }, // HYPOTHÈSE — à arbitrer
  rejectedFromI: [
    { sourceRef: "M10", sourceInitiativeId: "M10", reason: "Occasions/location/étalement : reporté en étude (Phase 3) — engage du capital et des process (reprise, assurance, recouvrement) qui exigent une validation opérateur explicite." },
  ],
  recommandationsPrioritaires: [
    { recommendation: "Réparer la réassurance AVANT d'investir en acquisition : chaque franc de trafic fuit tant que la vérification (avis, 404) échoue.", source: "R (risk-m19-001/003 confirmés) + E (barriersEngagement)", priority: 1 },
    { recommendation: "Brancher les données internes (ventes Shopify + boutique, panier, marge) au pilotage — aucune cible chiffrée sérieuse ne peut être posée sans elles.", source: "T (traction non communiquée) + V (unitEconomics vides)", priority: 2 },
    { recommendation: "Occuper YouTube en premier entrant local : les requêtes d'achat des créateurs CM n'ont aucune réponse en contexte FCFA aujourd'hui.", source: "T (hyp-m19-003) + D (paysage concurrentiel)", priority: 3 },
  ],
  // `computed` : recalculé au seed par computePillarS() (pur, ADR-0088/0089)
  // à partir de I + R + T — jamais figé à la main ici.
  computed: {},
} as const;

// ── Export agrégé ──────────────────────────────────────────────────────

export const MOTION19_CANON_PILLARS: ReadonlyArray<{ key: string; content: unknown; confidence: number }> = [
  { key: "a", content: PILLAR_A, confidence: 0.72 },
  { key: "d", content: PILLAR_D, confidence: 0.66 },
  { key: "v", content: PILLAR_V, confidence: 0.7 }, // catalogue/prix observés, business model inféré
  { key: "e", content: PILLAR_E, confidence: 0.62 },
  { key: "r", content: PILLAR_R, confidence: 0.6 },
  { key: "t", content: PILLAR_T, confidence: 0.68 }, // données marché sourcées (DataReportal/RDAP/catalogue), hypothèses marquées
  { key: "i", content: PILLAR_I, confidence: 0.58 },
  { key: "s", content: PILLAR_S, confidence: 0.6 },
];

export const MOTION19_STRATEGY_NAME = "Motion19 — La Boutique Des Créatifs";

export const MOTION19_BUSINESS_CONTEXT = {
  sector: "équipement audiovisuel",
  country: "CM",
  businessModel: "RETAIL",
  positioningArchetype: "PREMIUM_ACCESSIBLE",
} as const;

/**
 * Certitude par champ (doctrine needsHuman, STATE_FINAL_BLUEPRINT §canon) :
 * tout jugement stratégique pré-rempli par NEFER depuis les sources publiques
 * est marqué INFERRED — l'opérateur valide/réécrit puis le champ devient
 * DECLARED via l'amendement de pilier. Les faits observés (catalogue, prix,
 * adresse, réseaux, dates) ne sont PAS marqués : ils sont sourcés, pas inférés.
 * Format identique à infer-needs-human-fields.ts : `{ "<pillar>.<field>": "INFERRED" }`.
 */
export const MOTION19_FIELD_CERTAINTY: Record<"a" | "d" | "v" | "e", Record<string, "INFERRED">> = {
  a: {
    "a.archetype": "INFERRED",
    "a.archetypeSecondary": "INFERRED",
    "a.noyauIdentitaire": "INFERRED",
    "a.doctrine": "INFERRED",
    "a.valeurs": "INFERRED",
    "a.herosJourney": "INFERRED",
    "a.ikigai": "INFERRED",
    "a.enemy": "INFERRED",
    "a.prophecy": "INFERRED",
    "a.livingMythology": "INFERRED",
    "a.equipeComplementarite": "INFERRED",
    "a.hierarchieCommunautaire": "INFERRED",
  },
  d: {
    "d.positionnement": "INFERRED",
    "d.positionnementEmotionnel": "INFERRED",
    "d.promesseMaitre": "INFERRED",
    "d.personas": "INFERRED",
    "d.archetypalExpression": "INFERRED",
  },
  v: {
    "v.businessModel": "INFERRED",
    "v.economicModels": "INFERRED",
    "v.productLadder": "INFERRED",
    "v.pricingJustification": "INFERRED",
    "v.personaSegmentMap": "INFERRED",
    "v.sacrificeRequis": "INFERRED",
    "v.packagingExperience": "INFERRED",
  },
  e: {
    "e.promesseExperience": "INFERRED",
    "e.superfanPortrait": "INFERRED",
    "e.ladderProductAlignment": "INFERRED",
    "e.conversionTriggers": "INFERRED",
    "e.principesCommunautaires": "INFERRED",
    "e.taboos": "INFERRED",
    "e.ritesDePassage": "INFERRED",
    "e.gamification": "INFERRED",
    "e.commandments": "INFERRED",
    "e.sacraments": "INFERRED",
    "e.sacredCalendar": "INFERRED",
  },
};

/**
 * Relevés d'audience OBSERVÉS publiquement le 12/07/2026 (source MANUAL —
 * relevé opérateur, jamais un compteur inventé). X/Twitter : compteur
 * illisible en ligne (page bloquée) → volontairement ABSENT.
 */
export const MOTION19_SOCIAL_SNAPSHOTS: ReadonlyArray<{
  platform: "FACEBOOK" | "INSTAGRAM" | "TIKTOK";
  handle: string;
  followerCount: number;
  note: string;
}> = [
  { platform: "FACEBOOK", handle: "motion19store", followerCount: 4252, note: "4 252 likes de page (snippet public, juil. 2026) — proxy abonnés" },
  { platform: "INSTAGRAM", handle: "motion19store", followerCount: 1753, note: "1 753 abonnés · 1 602 publications (snippet public, juil. 2026)" },
  { platform: "TIKTOK", handle: "motion19sarl", followerCount: 1308, note: "1 308 abonnés · 4 720 likes · 136 vidéos (JSON page publique, 12/07/2026)" },
];

/** Logo officiel observé sur le site (wordmark anthracite, « 19 » bleu, O-objectif). */
export const MOTION19_LOGO = {
  name: "Logo Motion19 (wordmark officiel)",
  fileUrl: "https://motion19.com/cdn/shop/files/logo_motion19_black.png",
  summary:
    "Wordmark « MOTION19 » : MOTION en anthracite graisse fine, le O de TION stylisé en objectif/bouton record (disque + anneau + point), barre au-dessus du I, « 19 » en bleu vif gras. Source : motion19.com (CDN Shopify), relevé 12/07/2026.",
} as const;
