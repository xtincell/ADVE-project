/**
 * CANON LA FUSÉE — ADVE de la MARQUE-PRODUIT « La Fusée — Industry OS », à 100 %
 * sur les 8 piliers, alignée champ par champ sur les contrats de maturité
 * COMPLETE (expectedKeys des schémas Zod).
 *
 * La Fusée est le PRODUIT (l'Industry OS) construit et opéré par UPgraders. Ce
 * canon décrit La Fusée elle-même (nomMarque « La Fusée », nature PLATFORM). La
 * marque OMBRELLE qui la possède — UPgraders, la société/agence-fixer — a son
 * propre ADVE dans `upgraders-canon.ts`, qui réutilise ce socle et surcharge les
 * champs d'identité (séparation société ≠ produit : KB UPGRADERS-LAFUSEE-KB +
 * décision opérateur 2026-06-24).
 *
 * Source de vérité consommée par :
 *   - prisma/seed-upgraders.ts (seed la stratégie produit « La Fusée »)
 *
 * Contenu : corpus blueprint (Livre de la Fusée, Livre de Bord, Cahier des
 * charges détaillé). RTIS dérivés cohérents, regénérables par la cascade.
 */

// ── PILIER A — AUTHENTICITÉ ────────────────────────────────────────────

export const PILLAR_A = {
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
    { value: "ACCOMPLISSEMENT", customName: "Excellence structurée", rank: 1, justification: "L'artisanat ne passe pas à l'échelle sans protocole : 8 phases NEFER, gates de cohérence, contrats de livrables.", costOfHolding: "Refuser les raccourcis qui vendraient plus vite mais sans preuve — la rigueur ralentit l'acquisition de court terme." },
    { value: "SECURITE", customName: "Preuve avant promesse", rank: 2, justification: "Score /200, hash-chain, Constat d'Altitude : l'effet devient contractualisable et auditable.", costOfHolding: "S'exposer à la mesure qui déplaît : le score dit la vérité même quand elle dessert le discours commercial." },
    { value: "AUTONOMIE", customName: "Souveraineté du founder", rank: 3, justification: "La marque appartient au Founder — Brand Vault souverain, portabilité totale, aucune rétention en otage.", costOfHolding: "Renoncer au verrouillage du client : pas de rétention de données utilisée comme levier de rétention commerciale." },
    { value: "BIENVEILLANCE", customName: "Empowerment du talent", rank: 4, justification: "Tarif jour préservé net pour le freelance, progression APPRENTI→ASSOCIÉ via l'Académie.", costOfHolding: "Rogner la prise d'agence pour préserver le net du talent plutôt que maximiser la commission." },
  ],
  herosJourney: [
    { actNumber: 1, title: "L'appel de la poussière", narrative: "Le founder reçoit son premier Oracle léger : sa marque est nommée, son palier LATENT acté, ses manques cartographiés.", emotionalArc: "curiosité → lucidité", causalLink: "Le diagnostic rend l'ambition actionnable : on ne pilote que ce qu'on mesure." },
    { actNumber: 2, title: "L'ignition", narrative: "Le paywall comme rituel d'engagement : le Cockpit s'ouvre, le noyau ADVE est formulé en session (aha moment J0).", emotionalArc: "décision → fierté", causalLink: "L'acte payant performe l'engagement — sans seuil, pas de sérieux." },
    { actNumber: 3, title: "Les épreuves orbitales", narrative: "La cascade A→D→V→E→R→T→I→S, les campagnes, les paliers franchis un à un sous télémétrie Seshat.", emotionalArc: "effort → maîtrise", causalLink: "Chaque palier gagné par la trace prépare la gravité du suivant (Loi 1)." },
    { actNumber: 4, title: "La concentration de masse", narrative: "CULTE : la masse superfan se concentre, la Devotion Ladder se remplit jusqu'aux évangélistes, la marque devient gravitationnelle.", emotionalArc: "traction → appartenance", causalLink: "Les superfans produisent le travail organique qui rend la propagation auto-entretenue." },
    { actNumber: 5, title: "L'étoile", narrative: "ICONE : référence patrimoniale du secteur, l'Overton a basculé, la marque rejoint la Coalition Stellaire.", emotionalArc: "accomplissement → transmission", causalLink: "L'icône redéfinit le secteur autour d'elle — l'apogée devient un nouveau cycle." },
  ],
  ikigai: {
    love: "Construire des systèmes qui élèvent les créatifs et les marques africaines",
    competence: "Architecture de marque (méthode ADVERTIS) + ingénierie d'un Industry OS gouverné",
    worldNeed: "Le marché créatif africain francophone n'a ni benchmark structuré, ni infrastructure méthodologique, ni preuve d'effet",
    remuneration: "Product ladder par palier (Embarquement → Enterprise), commissions Hub-Escrow dégressives, API billable",
  },
  enemy: {
    name: "Le marketing jetable",
    manifesto:
      "Nous refusons l'agence à obligation de moyens qui facture de l'activité sans résultat mesuré : campagnes qui meurent à la fin du brief, audiences louées aux plateformes, aucune mémoire, aucune preuve.",
    narrative:
      "Pendant des décennies, le marché créatif africain a payé pour du mouvement, pas pour de l'effet. Le marketing jetable prospère sur l'absence de mesure : sans score, toute facture se défend. La Fusée existe pour rendre cette opacité indéfendable.",
    enemySchwartzValues: ["pouvoir (opacité)", "hédonisme (le buzz pour le buzz)", "conformité (on a toujours fait comme ça)"],
    overtonMap: "Aujourd'hui acceptable : payer sans preuve. Demain impensable : signer un budget marketing sans score auditable.",
    enemyBrands: ["Les agences 360 sans baseline", "Les vendeurs de followers"],
    activeOpposition: "Publication de cas chiffrés (Constats d'Altitude consentis) qui rendent la comparaison inévitable.",
    passiveOpposition: "Chaque founder outillé d'un score /200 devient structurellement insensible aux promesses sans preuve.",
    counterStrategy: "Ne jamais attaquer les personnes — attaquer la pratique : la preuve contre l'allégation.",
    fraternityFuel: "Les founders brûlés par des années de budgets sans effet se reconnaissent immédiatement entre eux.",
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
    origine: "2024 — Douala : un fixer formalise sa méthode en manuel ADVE après des années de missions artisanales qui ne passaient pas à l'échelle.",
    transformation: "2025 — Les premiers retainers structurés (Cimencam) prouvent la méthode ; la décision est prise de l'encoder en système d'exploitation complet.",
    present: "2026 — La Fusée v6 : 7 Neteru actifs, Oracle 35 sections compilable sans LLM, scoring déterministe /200, paiements FCFA natifs.",
    futur: "2027-2030 — Le basculement Deloitte : la flotte devient le benchmark sectoriel vivant de l'Afrique francophone, le score /200 entre dans les appels d'offres.",
  },
  livingMythology: {
    canon:
      "Le Livre de la Fusée (9 livres cosmogoniques) + le panthéon des 7 Neteru (Mestor, Artemis, Seshat, Thot, Ptah, Imhotep, Anubis — cap 7/7 strict) + les rituels opérants : l'ignition, le Constat d'Altitude, la Pesée des Intents. Vocabulaire sacré : palier, noyau ADVE, superfan, fenêtre d'Overton, la Sève, hash-chain.",
    extensionRules:
      "Toute extension du canon passe par ADR (registre aéronautique + divin égyptien + astrophysique, NAMING_CANON v3.3) ; jamais de 8ème Neter ; les sub-agents et substrats restent hors panthéon.",
    captureSystem:
      "Le lexique vit dans STATE_FINAL_BLUEPRINT ANNEXE L ; tout drift narratif détecté déclenche une auto-correction Phase 8 NEFER et une propagation simultanée dans les 7 sources de vérité.",
  },
  equipeDirigeante: [
    { nom: "Alexandre Djengue (Xtincell)", role: "CEO / Concepteur de la méthode ADVERTIS", competences: ["stratégie de marque", "architecture produit", "business development Afrique"] },
    { nom: "NEFER", role: "Opérateur expert (LLM) — exécution des Intents, cohérence narrative et technique", competences: ["ingénierie logicielle", "gouvernance APOGEE", "production documentaire"] },
  ],
  equipeComplementarite: {
    scoreGlobal: 7.5,
    couvertureTechnique: "Forte — l'OS est construit et opéré en interne (NEFER), stack maîtrisée de la DB au design system.",
    couvertureCommerciale: "Moyenne — portée par le fondateur seul ; le réseau fixer compense, un commercial terrain est planifié au seuil de 20 marques.",
    couvertureOperationnelle: "Forte — protocole 8 phases, gates, SLOs : l'opération est encodée, pas tribale.",
    capaciteExecution: "Élevée sur le produit et la doctrine ; bornée sur le volume de missions simultanées tant que la Guilde n'est pas montée en charge.",
    verdict: "Binôme vision×exécution complémentaire et documenté ; la scalabilité passe par la trajectoire Confiance des satellites, pas par l'embauche massive.",
    lacunes: ["Commercial terrain dédié", "Officier Hub-Escrow à temps plein au-delà de 20 marques"],
  },
  messieFondateur: {
    nom: "Alexandre Djengue (Xtincell)",
    role: "CEO d'UPgraders, concepteur de la méthode ADVERTIS",
    narrative:
      "Fixer reconnu du marché créatif camerounais, il a vécu la limite de l'artisanat : impossible de scaler sa méthode au-delà de sa présence physique. Plutôt que d'embaucher des clones, il a encodé la méthode dans un OS — le bâtisseur qui transforme son artisanat en infrastructure pour tous.",
    charismaScore: 8,
  },
  competencesDivines: [
    { competence: "Formulation de noyau de marque par la méthode ADVE — quatre questions qui restituent identité, positionnement, proposition et engagement en une session.", justification: "Manuel ADVE 4 piliers éprouvé en mission ; aha moment restitué en moins d'une session d'ignition.", exclusivityProof: "Corpus propriétaire ADVERTIS + 90+ ADRs encodés dans l'OS : la méthode n'existe formalisée nulle part ailleurs sur le marché africain francophone." },
    { competence: "Industrialisation de la production créative gouvernée — du brief formulé à l'asset matérialisé sous contrat de livrable, sans perte de traçabilité.", justification: "139 Glory tools, 57 séquences, forge Ptah multi-providers opérés en interne.", exclusivityProof: "La forge est branchée sur un bus d'intents hash-chaîné : aucune agence classique ne réplique la traçabilité de bout en bout." },
    { competence: "Mesure de l'effet culturel d'une marque — score /200 huit dimensions, Cult Index, Devotion Ladder, suivi de la fenêtre d'Overton sectorielle.", justification: "Scoring déterministe /200 et instruments de mesure opérés en production sur la flotte.", exclusivityProof: "Le référentiel de score et ses pondérations sont un secret commercial ; le miroir sectoriel n'existe que par la flotte accumulée (effet de réseau non rattrapable)." },
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
  eNps: {
    score: 45,
    sampleSize: 11,
    frequency: "trimestrielle",
    lastMeasured: "2026-05",
    verbatims: ["« Premier outil qui me dit OÙ en est ma marque, pas juste quoi poster. »", "« Le score m'a servi en comité budget. »"],
  },
  turnoverRate: 0.08,
} as const;

// ── PILIER D — DISTINCTION ─────────────────────────────────────────────

export const PILLAR_D = {
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
      name: "Le Founder bâtisseur (FMCG/PME)",
      hiddenDesire: "Il paie des agences depuis des années sans pouvoir prouver ce que sa marque a gagné.",
      motivations: ["score /200 et paliers lisibles", "preuve d'effet pour son board/banquier", "communauté possédée"],
      fears: "Budget marketing irrégulier ; méfiance envers les promesses d'agence.",
      rank: 1,
    },
    {
      name: "La marque personnelle en ascension",
      hiddenDesire: "Son audience vit chez Meta/TikTok ; elle ne possède rien de sa propre gravité.",
      motivations: ["Devotion Ladder nominale", "drops pilotés", "patrimoine de contenu qui s'auto-entretient"],
      fears: "Temps disponible limité ; peur de l'industrialisation qui lisse la voix.",
      rank: 2,
    },
    {
      name: "Le directeur marketing corporate (basculement Deloitte)",
      hiddenDesire: "Il doit justifier chaque budget devant un comité qui ne croit plus aux métriques de vanité.",
      motivations: ["benchmark sectoriel vivant", "due diligence marketing auditable", "SLA contractuels"],
      fears: "Conformité données (RGPD/Malabo) ; processus achats corporate.",
      rank: 3,
    },
  ],
  tonDeVoix: {
    personnalite: ["Autoritaire", "Visionnaire", "Précis", "Aéronautique"],
    onDit: ["palier", "trajectoire", "ignition", "score /200", "superfans", "obligation d'effet", "protocole"],
    onNeditPas: ["buzz", "viral garanti", "petite agence", "feeling créatif", "best-in-class"],
  },
  assetsLinguistiques: {
    languePrincipale: "fr",
    slogan: "De la Poussière à l'Étoile",
    tagline: "L'Industry OS qui transforme des marques en icônes culturelles",
    naming: "Vocabulaire strict : aéronautique + divin égyptien + astrophysique (NAMING_CANON v3.3)",
    lexique: ["La Fusée", "le Cockpit", "la Console", "le Launchpad", "les Neteru", "la Sève", "l'Oracle"],
  },
  paysageConcurrentiel: [
    { name: "Agences 360 locales", avantagesCompetitifs: ["réseau relationnel installé", "présence terrain événementielle"], partDeMarcheEstimee: "majoritaire mais fragmentée", faiblesses: ["obligation de moyens, zéro score", "aucune mémoire de marque", "dépendance aux personnes clés"], strategiePos: "Les dépasser par la preuve : score /200 + Constat d'Altitude vs rapport PowerPoint.", distinctiveAssets: ["aucun actif distinctif durable — exécution interchangeable"] },
    { name: "SaaS marketing américains (HubSpot, Sprout…)", avantagesCompetitifs: ["maturité produit", "écosystème d'intégrations"], partDeMarcheEstimee: "marginale en zone FCFA", faiblesses: ["pricing USD/CB inadapté", "aucun opérateur humain", "zéro méthode de marque", "zéro mobile money"], strategiePos: "Jouer l'ancrage : FCFA natif, opérateur réel, méthode ADVE intégrée — l'outil seul ne transforme personne.", distinctiveAssets: ["marques connues", "contenus éducatifs massifs"] },
    { name: "Cabinets de conseil (Big4 locaux)", avantagesCompetitifs: ["crédibilité corporate", "accès aux directions générales"], partDeMarcheEstimee: "premium étroite", faiblesses: ["frameworks génériques sans exécution", "pas de forge ni de communauté", "coût prohibitif PME"], strategiePos: "Les compléter par le bas puis les concurrencer par la preuve continue (Oracle vivant vs slide figée).", distinctiveAssets: ["marque employeur", "méthodologies publiées"] },
    { name: "Freelances premium", avantagesCompetitifs: ["talent réel", "agilité tarifaire"], partDeMarcheEstimee: "longue traîne", faiblesses: ["sans télémétrie ni escrow", "sans continuité", "sans benchmark"], strategiePos: "Ne pas les combattre : les enrôler dans la Guilde (tarif net préservé, briefs qualifiés, progression).", distinctiveAssets: ["portfolios personnels"] },
  ],
  swotFlash: {
    strength: "Méthode propriétaire ADVE/RTIS éprouvée en retainer réel + le seul score /200 hash-chaîné du marché + pricing FCFA mobile-money natif.",
    weakness: "Notoriété naissante hors Cameroun et équipe cœur réduite — la scalabilité repose sur la trajectoire Confiance des satellites, pas sur l'effectif.",
    opportunity: "Vide total de benchmark sectoriel en Afrique francophone + basculement data des directions marketing (Deloitte 2027).",
    threat: "Arrivée d'un acteur international localisé ; coût des LLM (mitigé : ~95 % des traitements déterministes + Headroom).",
  },
  barriersImitation: [
    { barrier: "La flotte", defensibility: "Le miroir sectoriel exige N marques dans un substrat unifié — un concurrent part de zéro marque et le retard se creuse à chaque satellite.", expectedDuration: "structurelle (s'auto-renforce)", category: "effet de réseau" },
    { barrier: "La trace", defensibility: "Hash-chain + score canonique : la preuve d'effet ne se rattrape pas rétroactivement — l'historique attesté ne vaudra jamais le natif prouvé.", expectedDuration: "permanente", category: "données propriétaires" },
    { barrier: "Le corpus doctrinal", defensibility: "90+ ADRs, 7 Neteru gouvernés, contrats de maturité, 1900+ tests anti-drift : copier l'UI ne copie pas la gouvernance.", expectedDuration: "3-5 ans pour un entrant outillé", category: "savoir-faire encodé" },
  ],
  archetypalExpression: {
    visualTranslation: "Créateur×Magicien en image : instrumentation de cockpit (cadrans, trajectoires, télémétrie) sur fond panda noir/bone, ponctuée d'ignitions rouge fusée — la transformation rendue visible, jamais décorative.",
    verbalTranslation: "Le Créateur parle en systèmes (« protocole », « forge », « contrat de livrable ») ; le Magicien parle en métamorphoses (« de la poussière à l'étoile », « LATENT → ICONE », « déclaré → prouvé »).",
    emotionalRegister: "Fierté de bâtisseur + émerveillement contrôlé : on fait ressentir la puissance du système sans jamais perdre la rigueur — l'émotion naît de la preuve.",
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
    { name: "L'Oracle", form: "Document dynamique 35 sections (web + PDF brandé)", narrative: "La carte stellaire complète de la marque — chaque founder reçoit la sienne, unique, vivante, mise à jour par le système.", stage: "conversion (one-shot high-ticket → retainer)", socialSignal: "Posséder son Oracle = appartenir au cercle des marques pilotées par la preuve." },
    { name: "Le Constat d'Altitude", form: "Rapport scellé hash-chaîné émis à l'horizon contractuel", narrative: "Le jugement par la mesure : ATTEINT, PARTIEL ou ÉCHEC — calculé, jamais plaidé.", stage: "rétention (preuve d'effet par cycle)", socialSignal: "Le partager publiquement = afficher qu'on n'a rien à cacher." },
    { name: "Le Brand Vault", form: "Coffre numérique souverain (assets + communauté nominale)", narrative: "Le patrimoine possédé : la liste des superfans appartient au founder, portable, jamais louée aux plateformes.", stage: "fidélisation (l'actif qui reste)", socialSignal: "« Ma communauté m'appartient » — le marqueur du founder souverain." },
  ],
  symboles: [
    { symbol: "La fusée", meanings: ["trajectoire pilotée (jamais une montgolfière au vent)", "étages séquencés A→D→V→E→R→T→I→S", "l'ignition comme acte fondateur"], usageContexts: ["logo et favicon", "barre de progression des paliers", "cérémonies de montée"] },
    { symbol: "L'étoile", meanings: ["le palier ICONE : brillance propre, gravité culturelle", "la promesse 'de la poussière à l'étoile'"], usageContexts: ["badge du palier final", "signature de marque", "trophées de la flotte"] },
    { symbol: "L'œil égyptien", meanings: ["la télémétrie qui voit tout (Seshat)", "la gouvernance qui pèse tout (la Pesée)"], usageContexts: ["iconographie des Neteru", "écrans de monitoring Console"] },
  ],
  esov: { value: 2, measurementMethod: "Share of voice (présence éditoriale + mentions sectorielles) − share of market estimée, en points", lastMeasured: "2026-05", source: "Veille Argos + The Upgrade analytics" },
  storyEvidenceRatio: { storytellingPct: 45, evidencePct: 55, target: "Maintenir evidence ≥ 55 % : le récit cosmologique sert la rigueur, jamais l'inverse." },
} as const;

// ── PILIER V — VALEUR ──────────────────────────────────────────────────

export const PILLAR_V = {
  promesseDeValeur:
    "Un état final mesuré plutôt que des moyens : palier visé, score cible, horizon — avec recours contractuels si l'effet n'est pas au rendez-vous.",
  produitsCatalogue: [
    { nom: "Intake gratuit", categorie: "SERVICE", phaseLifecycle: "LAUNCH", gainClientConcret: "Marque nommée, palier acté, archétype et manques cartographiés", gainClientAbstrait: "La reconnaissance : savoir enfin où en est sa marque", lienPromesse: "La reconnaissance ne se paie pas — l'entrée dans la trajectoire", segmentCible: "Le Founder bâtisseur (FMCG/PME)", canalDistribution: ["WEBSITE"] },
    { nom: "PDF Oracle léger", categorie: "CONTENU", phaseLifecycle: "GROWTH", gainClientConcret: "Un diagnostic structuré one-shot étalonné sur des benchmarks sectoriels", gainClientAbstrait: "La lucidité d'un miroir qui situe la marque dans son secteur", lienPromesse: "La cartographie des manques rend l'étape suivante évidente", segmentCible: "La marque personnelle en ascension", canalDistribution: ["WEBSITE", "EMAIL"] },
    { nom: "Embarquement", categorie: "ABONNEMENT", phaseLifecycle: "GROWTH", gainClientConcret: "Premier abonnement Cockpit — noyau ADVE formulé, J0→J7 garanti", gainClientAbstrait: "L'aha moment : sa marque prend forme en une session", lienPromesse: "L'ignition : l'accès au pilotage commence ici", segmentCible: "La marque personnelle en ascension", canalDistribution: ["WEBSITE", "APP"] },
    { nom: "Starter", categorie: "ABONNEMENT", phaseLifecycle: "GROWTH", gainClientConcret: "Cockpit + briefs sous SLA + rapports mensuels", gainClientAbstrait: "La cadence : une marque qui avance à intervalle régulier", lienPromesse: "Le pilotage soutenu qui installe la trajectoire", segmentCible: "Le Founder bâtisseur (FMCG/PME)", canalDistribution: ["APP"] },
    { nom: "Pro", categorie: "ABONNEMENT", phaseLifecycle: "MATURITY", gainClientConcret: "Forge d'assets, Oracle complet 35 sections, recommandations continues", gainClientAbstrait: "L'industrialisation : la marque produit à l'échelle sans perdre la main", lienPromesse: "La production gouvernée au service de la montée de palier", segmentCible: "Le Founder bâtisseur (FMCG/PME)", canalDistribution: ["APP"] },
    { nom: "Group", categorie: "ABONNEMENT", phaseLifecycle: "MATURITY", gainClientConcret: "Multi-marques, souveraineté renforcée, service apogée", gainClientAbstrait: "La stature : piloter un portefeuille de marques comme une flotte", lienPromesse: "L'apogée opérée pour les marques CULTE/ICONE", segmentCible: "Le directeur marketing corporate", canalDistribution: ["APP", "LINKEDIN"] },
    { nom: "Enterprise", categorie: "CONSEIL", phaseLifecycle: "MATURITY", gainClientConcret: "Sur devis — résidence stricte des données, SLA 1h, équipe dédiée", gainClientAbstrait: "La souveraineté totale : une infrastructure de marque sur mesure", lienPromesse: "Le service dédié qui garantit l'obligation d'effet au plus haut niveau", segmentCible: "Le directeur marketing corporate", canalDistribution: ["LINKEDIN", "EVENT"] },
  ],
  productLadder: [
    { tier: "INTAKE_FREE", produitIds: ["Intake diagnostic"], cible: "Tout visiteur", description: "Capture : l'intake diagnostic gratuit — palier acté, score préliminaire, cartographie des manques.", position: 1 },
    { tier: "INTAKE_PDF", produitIds: ["Oracle léger (PDF)"], cible: "Marque LATENT→FRAGILE", description: "Conversion one-shot : le rapport PDF complet qui rend l'étape suivante évidente.", position: 2 },
    { tier: "COCKPIT_MONTHLY", produitIds: ["La Fusée — Cockpit"], cible: "Founder FRAGILE", description: "Embarquement : ouverture du Cockpit, formulation du noyau ADVE (ignition).", position: 3 },
    { tier: "RETAINER_BASE", produitIds: ["Conseil & exécution fixer", "La Fusée — Cockpit"], cible: "Marque ORDINAIRE", description: "Croissance : briefs sous SLA, Oracle complet, recommandations continues.", position: 4 },
    { tier: "RETAINER_PRO", produitIds: ["Conseil & exécution fixer", "Forge d'assets"], cible: "Marque FORTE", description: "Industrialisation : forge d'assets, cadence soutenue, montée de palier.", position: 5 },
    { tier: "RETAINER_ENTERPRISE", produitIds: ["Académie & Guilde", "Conseil & exécution fixer"], cible: "Marque CULTE/ICONE", description: "Apogée : multi-marques, souveraineté renforcée, service dédié.", position: 6 },
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
    budgetCom: 12000000,
    caVise: 180000000,
    commentaire: "CAC FCFA faible (intake organique + Argos) ; LTV portée par la rétention retainer et la montée de palier. budgetCom = ancre marketing annuelle (1M FCFA/mois) consommée par Thot ; caVise = CA annuel visé.",
  },
  pricingJustification:
    "Prix de référence par tier (zone étalon Dakar/Abidjan) modulés runtime par l'indice de marché composite (coût de la vie 0.40 + pouvoir d'achat 0.40 + CPM sectoriel 0.20), plancher au coût de service, plafond de raison par tier, overlays TVA + frais mobile money. Jamais de grille statique : le devis fige et hash-chaîne les versions d'indices (Cahier des charges Ch.6).",
  personaSegmentMap: [
    { personaName: "Le Founder bâtisseur (FMCG/PME)", productNames: ["Starter", "Pro", "Oracle complet"], devotionLevel: "Engagé", revenueContributionPct: 55 },
    { personaName: "La marque personnelle en ascension", productNames: ["PDF Oracle léger", "Embarquement", "Starter"], devotionLevel: "Participant", revenueContributionPct: 20 },
    { personaName: "Le directeur marketing corporate", productNames: ["Group", "Enterprise", "API billable"], devotionLevel: "Intéressé", revenueContributionPct: 25 },
  ],
  sacrificeRequis: {
    justification: "L'obligation d'effet n'est tenable que si le founder co-pilote : le sacrifice demandé est la condition de la preuve — et il est mesuré (ICP), jamais plaidé.",
    prix: "Un abonnement mensuel en FCFA assumé comme un poste d'infrastructure (pas une dépense pub jetable) — de 15k (Embarquement) à 1M+ (Group).",
    temps: "2 à 4 heures par semaine de co-pilotage réel : statuer sur les amendements, valider les briefs, tenir la cadence J7 puis mensuelle.",
    effort: "Accepter la transparence du score (même quand il déplaît), formuler son noyau honnêtement, répondre aux relances tracées.",
  },
  packagingExperience: {
    unboxingRitual: "L'ignition : paiement → ouverture du Cockpit → restitution du noyau ADVE formulé dans la même session (aha moment J0) — le 'déballage' est une révélation, pas un onboarding.",
    packagingMaterial: "Numérique premium : Oracle PDF brandé aux couleurs du client, Cockpit instrumenté panda/rouge fusée, rapports scellés horodatés.",
    deliveryMode: "Séquence J0→J7 à livrables garantis (noyau J0, brief J1, asset J2-J3, score baseline J6, premier vol J7) puis cadence de croisière temps réel (SSE).",
    sensoryNotes: "Signature visuelle d'ignition sur chaque jalon franchi ; vocabulaire aéronautique constant ; densité d'écran calibrée par portail.",
    instagrammable: true,
  },
  positioningArchetype: "PREMIUM_ACCESSIBLE",
  salesChannel: "Direct (Launchpad public + équipe fondatrice) ; partenariats agences en Crew Quarters",
  freeLayer: {
    whatIsFree: "L'intake diagnostic : nomination du palier, archétype, score préliminaire, cartographie des manques — la reconnaissance ne se paie pas.",
    whatIsPaid: "Tout ce qui transforme : le rapport PDF complet, l'Oracle 35 sections, le Cockpit, la forge, le crew — l'accès au pilotage commence à l'ignition.",
    conversionLever: "La cartographie des manques rend l'étape suivante évidente : on sait exactement ce qui sépare la marque de son prochain palier — et le PDF/Embarquement est le chemin affiché.",
  },
  mvp: {
    exists: true,
    stage: "DÉPASSÉ — production v6.25",
    description: "L'OS gouverné complet : 7 Neteru actifs, Oracle 35 sections compilable sans LLM, scoring déterministe /200, paiements CinetPay/Stripe/mobile money, Hub-Escrow, API billable.",
    features: ["funnel intake→PDF→ignition", "Cockpit founder + Console opérateur", "forge Ptah multi-providers", "Notoria (catalogue d'amendements scorés)", "facturation API MCP"],
    launchDate: "2025-09",
    userCount: 12,
    feedbackSummary: "Le score /200 et la formulation du noyau en session sont les deux déclencheurs de conversion cités ; la demande n°1 est le benchmark sectoriel (miroir) — dépendant de la taille de flotte.",
  },
  proprieteIntellectuelle: {
    brevets: [],
    secretsCommerciaux: ["formules de scoring et pondérations canoniques", "tables de lookup pricing par zone", "corpus de prompts et contrats de livrables"],
    technologieProprietary: "La Fusée OS (code fermé) : 7 Neteru gouvernés, bus d'intents hash-chaîné, 139 Glory tools, moteur Oracle 35 sections — licence SaaS aux founders, cession des livrables produits.",
    barrieresEntree: ["la flotte (effet de réseau du miroir sectoriel)", "la trace (historique infalsifiable non rattrapable)", "le corpus doctrinal encodé (90+ ADRs, contrats de maturité)"],
    licences: ["méthode ADVERTIS / ADVE-RTIS — marque et corpus propriétaires UPgraders", "livrables cédés au client (CGU art. 2)", "agrégat anonymisé k≥5 licencié au pool (CGV/DPA)"],
    protectionScore: 7,
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
    { beforeMetric: "Marque pilotée au feeling, zéro baseline mesurée", afterMetric: "8 piliers VALIDATED, composite 126/200 (FORTE), retainer actif", lift: "+126 points de structure prouvée", timeframe: "9 mois de retainer", client: "Cimencam", attestation: "Pillars VALIDATED + ScoreSnapshots hash-chaînés en base" },
    { beforeMetric: "Onboarding agence classique : 2-6 semaines avant le premier livrable", afterMetric: "Noyau ADVE formulé en session d'ignition (time-to-aha < 1 session)", lift: "÷20 sur le délai de première valeur", timeframe: "mesuré sur chaque ignition", client: "funnel La Fusée", attestation: "Horodatages intake→formulation tracés" },
    { beforeMetric: "CAC marketing classique zone : 50-100k FCFA", afterMetric: "CAC 18k FCFA (intake organique + Argos), LTV 540k", lift: "LTV/CAC 30:1", timeframe: "cohorte pilote 2025-2026", client: "UPgraders (interne)", attestation: "Unit economics consolidées trimestriellement" },
  ],
  experienceMultisensorielle: {
    vue: "DS panda noir/bone + rouge fusée : instrumentation de cockpit, cadrans de score, trajectoires — la marque se VOIT piloter.",
    ouie: "Signature sonore d'ignition sur les jalons franchis (notifications NSP) ; silence radio le reste du temps — pas de bruit.",
    odorat: "N/A (produit numérique) — transposé : 'l'odeur de la salle des machines', le sentiment d'un système qui tourne.",
    toucher: "Interactions denses et précises (clics de validation, curseurs de régime) — le founder manipule des commandes, pas des formulaires.",
    gout: "N/A — transposé : le 'goût de la preuve', les chiffres qu'on peut citer en comité sans trembler.",
  },
} as const;

// ── PILIER E — ENGAGEMENT ──────────────────────────────────────────────

export const PILLAR_E = {
  promesseExperience:
    "Piloter sa marque comme on pilote un vaisseau : chaque mouvement de sève visible en temps réel, chaque décision pesée, chaque palier célébré — la charge mentale devient un réglage.",
  primaryChannel: "Cockpit (web app) — le pont de pilotage du founder",
  touchpoints: [
    { canal: "Launchpad (intake public)", type: "DIGITAL", channelRef: "WEBSITE", role: "Acquisition : capter l'ambition par le diagnostic gratuit", aarrStage: "ACQUISITION", devotionLevel: ["SPECTATEUR", "INTERESSE"] },
    { canal: "Cockpit", type: "DIGITAL", channelRef: "APP", role: "Pilotage quotidien de la marque", aarrStage: "RETENTION", devotionLevel: ["PARTICIPANT", "ENGAGE"] },
    { canal: "WhatsApp Business", type: "HUMAIN", channelRef: "SMS", role: "Relation opérateur et notifications", aarrStage: "RETENTION", devotionLevel: ["PARTICIPANT", "ENGAGE"] },
    { canal: "Argos (média public)", type: "DIGITAL", channelRef: "WEBSITE", role: "Références curées du secteur", aarrStage: "ACQUISITION", devotionLevel: ["SPECTATEUR"] },
    { canal: "The Upgrade (newsletter)", type: "DIGITAL", channelRef: "EMAIL", role: "Éditorial stratégique", aarrStage: "ACTIVATION", devotionLevel: ["INTERESSE", "PARTICIPANT"] },
    { canal: "Crew Quarters", type: "DIGITAL", channelRef: "WEBSITE", role: "Portail talents et agences", aarrStage: "REFERRAL", devotionLevel: ["AMBASSADEUR", "EVANGELISTE"] },
  ],
  channelTouchpointMap: [
    { salesChannel: "Direct web (Launchpad → ignition)", touchpointRefs: ["landing", "intake", "page résultat + paywall", "/pricing", "Cockpit"] },
    { salesChannel: "Relation opérateur (WhatsApp Business)", touchpointRefs: ["alertes NSP", "relances J2/J4/J6", "validation de briefs"] },
    { salesChannel: "Éditorial (Argos + The Upgrade)", touchpointRefs: ["dossiers de référence publiés", "newsletter hebdo", "CTA diagnostic"] },
    { salesChannel: "Réseau partenaires (Crew Quarters)", touchpointRefs: ["portail agences", "candidatures missions", "programme partenaire"] },
  ],
  rituels: [
    { nom: "L'ignition", type: "CYCLIQUE", frequency: "AD_HOC", description: "Le paywall rituel : l'acte payant qui ouvre le Cockpit et formule le noyau (aha moment)", devotionLevels: ["INTERESSE", "PARTICIPANT"], aarrPrimary: "ACTIVATION", kpiMeasure: "Time-to-aha (< 1 session)" },
    { nom: "Le premier vol J0→J7", type: "CYCLIQUE", frequency: "AD_HOC", description: "Sept jours, cinq plans ouverts, sept cases cochées hash-chaînées", devotionLevels: ["PARTICIPANT", "ENGAGE"], aarrPrimary: "RETENTION", kpiMeasure: "Taux d'activation J7 (premier vol complet)" },
    { nom: "La revue d'altitude", type: "CYCLIQUE", frequency: "MONTHLY", description: "Score, trajectoire, recommandations — le founder à la barre", devotionLevels: ["ENGAGE", "AMBASSADEUR"], aarrPrimary: "RETENTION", kpiMeasure: "Rétention J30 (> 80 %)" },
    { nom: "Le Constat d'Altitude", type: "CYCLIQUE", frequency: "SEASONAL", description: "ATTEINT/PARTIEL/ÉCHEC calculé, recours déclenché mécaniquement", devotionLevels: ["ENGAGE", "AMBASSADEUR", "EVANGELISTE"], aarrPrimary: "REVENUE", kpiMeasure: "Taux de succès EFR (ATTEINT+PARTIEL) > 85 %" },
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
    { name: "Time-to-aha", metricType: "durée", target: "< 1 session", frequency: "par ignition" },
    { name: "Taux d'activation J7 (premier vol complet)", metricType: "pourcentage", target: "> 60 %", frequency: "hebdomadaire" },
    { name: "Rétention J30", metricType: "pourcentage", target: "> 80 %", frequency: "mensuelle" },
    { name: "Taux de montée de palier (flotte)", metricType: "pourcentage", target: "> 25 %/an", frequency: "trimestrielle" },
    { name: "Taux de succès EFR (ATTEINT+PARTIEL)", metricType: "pourcentage", target: "> 85 %", frequency: "par horizon EFR" },
    { name: "Coût par superfan recruté", metricType: "monétaire (FCFA)", target: "décroissant par cohorte", frequency: "mensuelle" },
  ],
  superfanPortrait: {
    personaRef: "Le Founder bâtisseur",
    profile: "Founder qui a vécu sa montée de palier, parle en vocabulaire Fusée (« mon score », « mon palier ») et défend la méthode devant ses pairs.",
    motivations: ["fierté de la trajectoire prouvée", "appartenance à la flotte", "accès anticipé aux nouveaux instruments"],
    barriers: ["temps", "peur de l'outil au début (levée par le régime ASSISTÉ)"],
  },
  ladderProductAlignment: [
    { devotionLevel: "Spectateur", productTierRef: "Argos + The Upgrade (gratuit)", entryAction: "Lire un dossier de référence sectoriel", upgradeAction: "CTA diagnostic en fin de dossier → intake" },
    { devotionLevel: "Intéressé", productTierRef: "INTAKE_FREE → INTAKE_PDF", entryAction: "Compléter l'intake (marque nommée, palier acté)", upgradeAction: "Débloquer le rapport PDF complet (5-25k FCFA)" },
    { devotionLevel: "Participant", productTierRef: "COCKPIT_MONTHLY (Embarquement)", entryAction: "L'ignition : ouvrir son Cockpit, formuler son noyau", upgradeAction: "Premier vol J7 réussi → proposition Starter" },
    { devotionLevel: "Engagé", productTierRef: "RETAINER_BASE / RETAINER_PRO", entryAction: "Passer en retainer (briefs SLA + Oracle complet)", upgradeAction: "Constat d'Altitude ATTEINT → revue de palier → Group" },
    { devotionLevel: "Ambassadeur", productTierRef: "RETAINER_ENTERPRISE (Group)", entryAction: "Multi-marques + souveraineté renforcée", upgradeAction: "Cas public consenti + programme de parrainage" },
    { devotionLevel: "Évangéliste", productTierRef: "Coalition Stellaire", entryAction: "Co-marketing inter-marques non concurrentes", upgradeAction: "Rôle de commandant de mission satellite (co-publication, mentorat flotte)" },
  ],
  conversionTriggers: [
    { fromLevel: "Spectateur", toLevel: "Intéressé", trigger: "Dossier Argos sectoriel pertinent + CTA diagnostic" },
    { fromLevel: "Intéressé", toLevel: "Participant", trigger: "PDF Oracle : la cartographie des manques rend l'ignition évidente" },
    { fromLevel: "Participant", toLevel: "Engagé", trigger: "Premier vol J7 réussi + première montée de score" },
    { fromLevel: "Engagé", toLevel: "Ambassadeur", trigger: "Constat d'Altitude ATTEINT + invitation flotte" },
    { fromLevel: "Ambassadeur", toLevel: "Évangéliste", trigger: "Co-publication du cas + rôle dans la Coalition" },
  ],
  programmeEvangelisation: {
    referralProgram: "Parrainage à remise croisée : le parrain et le filleul gagnent chacun un mois à -50 % sur leur tier ; remise multi-rôle dégressive cumulable (-10/-15/-20 %).",
    brandAdvocacyProgram: "L'Équipage de Propagation : chaque founder ATTEINT devient une preuve publique consentie — cas Argos chiffré, témoignage au Constat d'Altitude, visibilité éditoriale.",
    communityRecruitment: "Recrutement par la preuve : les cérémonies de palier trimestrielles sont ouvertes aux invités des membres ; l'entrée dans la Coalition Stellaire se fait par cooptation de marques non concurrentes.",
  },
  communityBuilding: {
    platforms: ["Upgraded Brands Club (founders — espace privé)", "La Guilde (talents — Crew Quarters)", "Coalition Stellaire (marques non concurrentes)", "WhatsApp Business (canal miroir opérationnel)"],
    moderationRules: ["La preuve avant l'opinion (on débat données en main)", "Pas de concurrence intra-coalition", "Aucune donnée de marque identifiable partagée sans opt-in", "Le vocabulaire canon fait foi (pas de drift narratif)"],
    growthMechanics: "Connexion racinaire, pas fusion : chaque marque garde sa souveraineté ; le miroir sectoriel n'est ouvert qu'aux contributeurs (réciprocité) — l'avantage de la flotte recrute la flotte.",
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
    { fromStage: "INTERESSE", toStage: "PARTICIPANT", rituelEntree: "L'ignition (visiteur → pilote)" },
    { fromStage: "PARTICIPANT", toStage: "ENGAGE", rituelEntree: "Le premier vol complet — 7 cases J7 (pilote → équipage)" },
    { fromStage: "ENGAGE", toStage: "AMBASSADEUR", rituelEntree: "Le franchissement de palier (cérémonie de montée, badge tier)" },
    { fromStage: "AMBASSADEUR", toStage: "EVANGELISTE", rituelEntree: "L'entrée en Coalition (marque → constellation)" },
  ],
  productExperienceMap: [
    { productRef: "PDF Oracle léger", experienceDescription: "La révélation : ma marque a une famille stellaire, un palier, une carte de ses manques.", touchpointRefs: ["Launchpad (intake)", "email de livraison"], emotionalOutcome: "lucidité — « je sais enfin où j'en suis »" },
    { productRef: "Cockpit", experienceDescription: "Le contrôle : je vois tout (score, sève, propositions), je valide tout, rien ne bouge sans moi.", touchpointRefs: ["Cockpit", "WhatsApp (notifications)"], emotionalOutcome: "maîtrise — la charge mentale devient un réglage" },
    { productRef: "Oracle complet (35 sections)", experienceDescription: "La carte stellaire : ma stratégie devient un objet consultable, partageable, vivant.", touchpointRefs: ["Cockpit", "PDF brandé", "lien de partage"], emotionalOutcome: "fierté — l'envie de le montrer à son board" },
    { productRef: "Hub-Escrow (missions crew)", experienceDescription: "La confiance opérationnelle : talents qualifiés, jalons séquestrés, QC par les pairs.", touchpointRefs: ["Cockpit (suivi mission)", "Crew Quarters"], emotionalOutcome: "sérénité — déléguer sans perdre le contrôle" },
  ],
  barriersEngagement: [
    { level: "Spectateur→Intéressé", barrier: "Méfiance envers les promesses marketing (années de marketing jetable)", mitigation: "Diagnostic gratuit sans engagement + cas chiffrés publics (Constats d'Altitude consentis)" },
    { level: "Intéressé→Participant", barrier: "Littératie digitale variable + peur de l'outil", mitigation: "Régime ASSISTÉ par défaut + WhatsApp comme canal miroir + aha moment en session" },
    { level: "Participant→Engagé", barrier: "Connectivité irrégulière + budget mensuel perçu comme risqué", mitigation: "Rapports PDF téléchargeables + cycles mobile money 30 j sans prélèvement silencieux + SLA opposables" },
    { level: "Engagé→Ambassadeur", barrier: "Méfiance contractuelle sur l'engagement de résultat", mitigation: "EFR avec recours écrits (remédiation/avoir/sortie) + portabilité totale du patrimoine" },
  ],
  gamification: {
    niveaux: ["LATENT", "FRAGILE", "ORDINAIRE", "FORTE", "CULTE", "ICONE — les 6 paliers du /200 SONT le jeu : chaque action montre son delta de score"],
    recompenses: ["badge de palier + cérémonie trimestrielle", "badge premier vol (7 cases J7 hash-chaînées)", "streak de cadence (ICP visible)", "percentile sectoriel anonymisé (miroir, jamais le nom des pairs)", "commission Hub-Escrow dégressive avec le palier (20 %→8 %)"],
  },
  commandments: [
    { commandment: "Tu ne mutileras pas ton noyau sur un caprice", justification: "Le sang de la marque ne mute que par amendement pesé (OPERATOR_AMEND_PILLAR) — l'instabilité du noyau détruit l'authenticité et coûte du carburant." },
    { commandment: "Tu tiendras ta cadence ou ton ICP en témoignera", justification: "La co-responsabilité est mesurée, jamais plaidée : les silences sont tracés et pèsent sur les recours (Ch.1)." },
    { commandment: "Tu posséderas ta communauté", justification: "Une audience louée aux plateformes n'est pas un actif ; le Brand Vault souverain est la condition de la valeur patrimoniale." },
    { commandment: "Tu ne montreras que ce que tu peux prouver", justification: "Story/evidence ≥ 55 % de preuve : la marque qui sur-promet brûle sa crédibilité de palier." },
  ],
  sacraments: [
    { nomSacre: "L'ignition", trigger: "Paiement de l'Embarquement confirmé", action: "Ouverture du Cockpit + formulation du noyau ADVE en session", reward: "Aha moment : sa marque dite avec des mots justes", kpi: "time-to-aha < 1 session", aarrStage: "Activation" },
    { nomSacre: "Le premier asset forgé", trigger: "Brief J1 validé par le founder", action: "Forge Ptah J2-J3 depuis le brief", reward: "« La première chose que je peux montrer »", kpi: "délai brief→asset ≤ SLA tier", aarrStage: "Activation" },
    { nomSacre: "Le Constat d'Altitude", trigger: "Horizon EFR atteint", action: "Calcul mécanique ATTEINT/PARTIEL/ÉCHEC scellé hash-chain", reward: "La preuve opposable du chemin parcouru", kpi: "taux de succès EFR > 85 %", aarrStage: "Revenue" },
    { nomSacre: "La cérémonie de palier", trigger: "Franchissement d'un seuil /200", action: "Badge + annonce flotte (consentie) + révision des privilèges tier", reward: "Reconnaissance publique de l'ascension", kpi: "taux de montée de palier flotte", aarrStage: "Referral" },
  ],
  clergeStructure: {
    communityManager: "L'opérateur UPgraders de flotte (Console) — gardien du protocole, anime le Club et les cérémonies de palier.",
    ambassadeurs: "Les founders ATTEINT consentants de l'Équipage de Propagation — preuves vivantes, parrainage et cooptation Coalition.",
    supportTeam: "NEFER (opérateur expert) + relances tracées J2/J4/J6 + canal WhatsApp Business.",
    specialists: "Les talents MAÎTRE/ASSOCIÉ de la Guilde — QC par les pairs, mentorat des APPRENTIS via l'Académie.",
  },
  pelerinages: [
    { name: "Le Rassemblement de la Flotte", frequency: "annuel", location: "Douala (tournant : Abidjan, Dakar)", expectedAttendance: 80, devotionLevelTarget: "Engagé+", entryRitual: "Chaque marque présente son altimètre (score + trajectoire) en ouverture — la preuve comme carton d'invitation." },
    { name: "La cérémonie des paliers", frequency: "trimestrielle (en ligne)", location: "Cockpit live + Club", expectedAttendance: 40, devotionLevelTarget: "Participant+", entryRitual: "Les montées de palier du trimestre sont annoncées une à une, badge à l'appui ; les invités des membres assistent." },
  ],
} as const;


// ── PILIER R — RISK (contrat COMPLETE : 11 exigences) ──────────────────

export const PILLAR_R = {
  riskScore: 62,
  globalSwot: {
    strengths: ["Méthode propriétaire ADVE/RTIS éprouvée en retainer réel", "Déterminisme radical : coût LLM marginal, variance 0", "Ancrage FCFA/mobile money natif", "Corpus doctrinal encodé (90+ ADRs, 1900+ tests anti-drift)"],
    weaknesses: ["Notoriété naissante hors Cameroun", "Dépendance au binôme fondateur", "Flotte encore petite (le miroir sectoriel exige k≥5 par secteur)"],
    opportunities: ["Marché sans benchmark structuré", "Basculement data des directions marketing (Deloitte 2027)", "API billable comme second moteur de revenu", "Vide réglementaire favorable au first-mover conforme (DPA/Malabo)"],
    threats: ["Acteur international localisé", "Cycle budgétaire des PME en zone CEMAC", "Dépendance providers paiement (CinetPay)"],
  },
  probabilityImpactMatrix: [
    { id: "risk-upg-001", risk: "Concentration des revenus sur peu de retainers", probability: "MEDIUM", impact: "HIGH", severity: "HIGH", category: "ECONOMIQUE", mitigation: "Product ladder bas (Embarquement 15-25k) + API billable pour élargir la base ; objectif : aucun client > 25 % du MRR.", status: "MITIGATING" },
    { id: "risk-upg-002", risk: "Churn post-ignition si l'activation J0→J7 rate", probability: "MEDIUM", impact: "HIGH", severity: "HIGH", category: "PRODUIT", mitigation: "Séquence J0→J7 à livrables garantis + filet anti-abandon J2/J4/J6 tracé (ICP).", status: "MITIGATED" },
    { id: "risk-upg-003", risk: "Dérive doctrinale du code (drift narratif/technique)", probability: "LOW", impact: "HIGH", severity: "MEDIUM", category: "TECHNIQUE", mitigation: "1900+ tests anti-drift CI bloquants + protocole NEFER 8 phases + 7 sources de vérité synchronisées.", status: "MITIGATED" },
    { id: "risk-upg-004", risk: "Indisponibilité fournisseur LLM au mauvais moment", probability: "MEDIUM", impact: "MEDIUM", severity: "MEDIUM", category: "TECHNIQUE", mitigation: "Circuit breakers + bascule multi-providers + Oracle 35/35 compilable SANS LLM (fallback déterministe).", status: "MITIGATED" },
  ],
  mitigationPriorities: [
    { action: "Diversifier la base retainer (3 nouveaux clients Starter/Pro)", owner: "Alexandre", timeline: "T3 2026", investment: "Temps commercial + 2 cas Argos publiés" },
    { action: "Industrialiser l'activation J0→J7 (mesure time-to-aha systématique)", owner: "NEFER", timeline: "T3 2026", investment: "Instrumentation produit (déjà codée, à monitorer)" },
    { action: "Armer le payout mobile money réel (Wave prioritaire)", owner: "Alexandre", timeline: "T3 2026", investment: "Contrats opérateurs + clés API" },
  ],
  pillarGaps: {
    a: "Aucun gap bloquant — noyau 100 % formulé ; eNps à re-mesurer trimestriellement.",
    d: "ESOV à instrumenter en continu (aujourd'hui mesure éditoriale manuelle).",
    v: "ROI proofs à enrichir à chaque Constat d'Altitude client (3 aujourd'hui).",
    e: "Communauté propre (Upgraded Brands Club) encore embryonnaire — dépend de la taille de flotte.",
  },
  overtonBlockers: [
    { risk: "Perception « encore une agence qui promet »", blockingPerception: "Le marché assimile toute offre marketing à l'obligation de moyens classique", mitigation: "Publier les Constats d'Altitude consentis — la preuve avant le discours", devotionLevelBlocked: "INTERESSE" },
  ],
  coherenceRisks: [
    { pillar1: "V", pillar2: "E", field1: "freeLayer", field2: "conversionTriggers", contradiction: "Si la couche gratuite devient trop riche, le déclencheur d'ignition (manques cartographiés) perd sa force.", severity: "MEDIUM" },
  ],
  devotionVulnerabilities: [
    { level: "Participant", churnCause: "Cycle mobile money non renouvelé par friction de paiement (pas de prélèvement auto)", mitigation: "Rappel J-3 multi-canal + renouvellement en 2 clics + aucun jour perdu en cas de renouvellement anticipé." },
    { level: "Engagé", churnCause: "Plateau de score perçu (le palier suivant semble loin)", mitigation: "Décomposer le palier en jalons intermédiaires visibles + revue d'altitude mensuelle avec l'opérateur." },
  ],
  microSWOTs: {
    funnel: { strengths: ["intake gratuit sans friction"], weaknesses: ["dépendance au trafic éditorial"], opportunities: ["SEO dossiers Argos"], threats: ["coût d'acquisition payant si l'organique plafonne"] },
    produit: { strengths: ["Oracle sans LLM", "score variance 0"], weaknesses: ["UX mobile à polir"], opportunities: ["app compagnon WhatsApp"], threats: ["complexité perçue par les non-techniciens"] },
  },
} as const;

// ── PILIER T — TRACK (contrat COMPLETE : 18 exigences) ─────────────────

export const PILLAR_T = {
  brandMarketFitScore: 78,
  lastMarketDataRefresh: "2026-06-12T00:00:00.000Z",
  sectorKnowledgeReused: false,
  triangulation: {
    customerInterviews: "11 founders pilotes interrogés : le besoin n°1 est la PREUVE (score, trace) avant le volume de livrables ; la friction n°1 est la peur de l'engagement mensuel — levée par les cycles 30 j sans prélèvement silencieux.",
    competitiveAnalysis: "Aucun acteur ne combine méthode + OS + opérateur + marketplace en Afrique francophone. Les agences 360 vendent des moyens ; les SaaS importés vendent des outils sans opérateur ; les Big4 vendent des slides sans exécution. La catégorie « Industry OS » est vide.",
    trendAnalysis: "Mobile money > 60 % des paiements digitaux en zone UEMOA/CEMAC ; les directions marketing basculent vers la preuve chiffrée ; explosion de la création de marques locales post-2024.",
    financialBenchmarks: "Retainers agences locales : 150k–1M FCFA/mois sans baseline mesurée. SaaS importés : 50-300 USD/mois inaccessibles (CB requise). Le ladder La Fusée (15k→1M FCFA, mobile money) occupe l'espace entre les deux.",
  },
  hypothesisValidation: [
    { id: "hyp-001", hypothesis: "Un founder paie 5-25k FCFA pour un diagnostic structuré", validationMethod: "Funnel intake live (conversion PDF)", status: "VALIDATED", evidence: "Conversions PDF Oracle constatées sur le funnel pilote 2025-2026" },
    { id: "hyp-002", hypothesis: "Le score /200 est un argument de rétention retainer", validationMethod: "Cohorte retainer (renouvellements)", status: "TESTING", evidence: "Cimencam renouvelé sur la base du score ; échantillon à élargir à 5+ clients" },
    { id: "hyp-003", hypothesis: "Les cycles mobile money 30 j réduisent la friction d'abonnement vs CB", validationMethod: "A/B implicite par zone (FCFA vs international)", status: "TESTING", evidence: "Premiers cycles encaissés ; taux de renouvellement à mesurer sur 3 mois" },
  ],
  tamSamSom: {
    tam: { value: 120000, description: "Marques actives Afrique francophone (toutes tailles, 24 pays)" },
    sam: { value: 18000, description: "Marques structurées CEMAC+UEMOA avec budget marketing régulier" },
    som: { value: 600, description: "Cible 3 ans : 0,5 % du SAM via capture-then-grow (Embarquement → retainer)" },
  },
  riskValidation: [
    { riskId: "risk-upg-001", riskRef: "Concentration des revenus", marketEvidence: "Le pipeline intake génère des leads Starter réguliers — la base s'élargit structurellement par le bas du ladder.", status: "MITIGATING", source: "Funnel analytics interne" },
  ],
  overtonPosition: {
    currentPerception: "Une agence tech camerounaise ambitieuse parmi les agences",
    marketSegments: ["PME/FMCG zone CEMAC", "marques personnelles", "directions marketing corporate"],
    measurementMethod: "Veille éditoriale Argos + verbatims intake + positionnement concurrentiel déclaré",
    measuredAt: "2026-06-01",
    confidence: 0.7,
  },
  perceptionGap: {
    currentPerception: "Prestataire marketing innovant",
    targetPerception: "L'infrastructure de référence — la catégorie qu'on cite pour les marques pilotées par la preuve",
    gapDescription: "Passer du prestataire à l'infrastructure : la bascule se joue sur la flotte visible et les cas chiffrés publiés.",
    gapScore: 6,
  },
  traction: {
    loisSignees: 2,
    utilisateursInscrits: 12,
    utilisateursActifs: 8,
    croissanceHebdo: 4,
    revenusRecurrents: 1100000,
    metriqueCle: "MRR FCFA + taux de montée de palier flotte",
    preuvesTraction: ["Cimencam : retainer actif renouvelé, composite 126/200 FORTE", "Funnel intake → PDF convertissant sans budget pub", "12 comptes actifs dont 3 talents Guilde"],
    tractionScore: 5,
  },
  marketReality: {
    macroTrends: ["Explosion de la création de marques locales", "Bascule mobile money des paiements B2B", "Exigence de preuve dans les budgets marketing", "Premiers appels d'offres exigeant des KPIs auditables"],
    weakSignals: ["Talents seniors quittant les agences 360 pour le freelancing structuré", "Directions financières s'invitant dans les arbitrages marketing"],
  },
  weakSignalAnalysis: [
    { id: "ws-001", thesis: "La défiance envers les agences classiques s'accélère et crée une fenêtre pour l'obligation d'effet", rawEvent: "Multiplication des appels d'offres exigeant des KPIs auditables (2 observés au S1 2026)", causalChain: [{ from: "budgets sous pression", to: "exigence de preuve" }, { from: "exigence de preuve", to: "prime au score auditable" }], impactCategory: "OPPORTUNITY", brandImpact: "Le /200 hash-chaîné devient l'argument différenciant n°1 en compétition", confidence: 0.75, urgency: "HIGH", relatedPillars: ["D", "V"], supportingSignals: ["verbatims intake", "veille Argos"], recommendedAction: "Publier 3 Constats d'Altitude consentis + kit de réponse appel d'offres avec le score" },
  ],
  competitorOvertonPositions: [
    { competitorName: "Agences 360 locales", overtonPosition: "Le statu quo accepté : moyens facturés, résultats allégués", relativeToUs: "Nous déplaçons la norme vers la preuve — leur zone de confort devient indéfendable" },
  ],
  marketDataSources: [
    { sourceType: "INTERVIEWS", title: "Entretiens founders pilotes (n=11)", collectedAt: "2026-05-15T00:00:00.000Z", reliability: 0.85 },
    { sourceType: "VEILLE", title: "Veille éditoriale Argos S1 2026", collectedAt: "2026-06-01T00:00:00.000Z", reliability: 0.7 },
  ],
} as const;

// ── PILIER I — INNOVATION (contrat COMPLETE : 17 exigences) ────────────

export const PILLAR_I = {
  totalActions: 8,
  catalogueParCanal: {
    DIGITAL: [
      { id: "init-upg-001", action: "Programme éditorial The Upgrade (newsletter hebdo)", format: "newsletter", objectif: "Autorité + acquisition organique", status: "SELECTED_FOR_ROADMAP", timeframe: "SPRINT_90", budgetEstime: "LOW", pilierImpact: "E" },
      { id: "init-upg-002", action: "Publication des dossiers Argos (références curées)", format: "média public", objectif: "Preuve de regard sectoriel", status: "SELECTED_FOR_ROADMAP", timeframe: "SPRINT_90", budgetEstime: "LOW", pilierImpact: "D" },
      { id: "init-upg-005", action: "Kit appel d'offres « score /200 » téléchargeable", format: "lead magnet", objectif: "Conversion corporate", status: "RECOMMENDED", timeframe: "PHASE_1", budgetEstime: "LOW", pilierImpact: "V" },
    ],
    EVENT: [
      { id: "init-upg-003", action: "Cérémonie trimestrielle des paliers", format: "événement en ligne", objectif: "Rétention + évangélisation", status: "SELECTED_FOR_ROADMAP", timeframe: "PHASE_1", budgetEstime: "MEDIUM", pilierImpact: "E" },
      { id: "init-upg-006", action: "Rassemblement annuel de la Flotte (Douala)", format: "événement physique", objectif: "Communauté + presse", status: "RECOMMENDED", timeframe: "PHASE_2", budgetEstime: "HIGH", pilierImpact: "E" },
    ],
    PARTENARIAT: [
      { id: "init-upg-004", action: "Programme agences partenaires (Crew Quarters)", format: "B2B2B", objectif: "Distribution via le réseau", status: "RECOMMENDED", timeframe: "PHASE_2", budgetEstime: "MEDIUM", pilierImpact: "V" },
    ],
    RP: [
      { id: "init-upg-007", action: "Tribunes « obligation d'effet » dans la presse éco régionale", format: "tribune", objectif: "Overton : normaliser la preuve", status: "SELECTED_FOR_ROADMAP", timeframe: "PHASE_1", budgetEstime: "LOW", pilierImpact: "D" },
    ],
    SOCIAL: [
      { id: "init-upg-008", action: "Série LinkedIn « le score de la semaine » (anonymisé k≥5)", format: "social organique", objectif: "Démonstration continue du miroir", status: "RECOMMENDED", timeframe: "SPRINT_90", budgetEstime: "LOW", pilierImpact: "T" },
    ],
  },
  assetsProduisibles: [
    { asset: "Dossier Argos sectoriel", type: "ÉDITORIAL", usage: "Acquisition + autorité" },
    { asset: "Constat d'Altitude public (consenti)", type: "PREUVE", usage: "Conversion corporate + RP" },
    { asset: "Kit appel d'offres score /200", type: "LEAD_MAGNET", usage: "Pipeline Group/Enterprise" },
    { asset: "Newsletter The Upgrade", type: "ÉDITORIAL", usage: "Nurturing hebdomadaire" },
    { asset: "Badge de palier (visuel partageable)", type: "SOCIAL", usage: "Évangélisation organique des founders" },
  ],
  activationsPossibles: [
    { activation: "Diagnostic flash en live (15 min) lors d'événements partenaires", canal: "EVENT", cible: "Founders FMCG", budgetEstime: "LOW" },
    { activation: "Co-publication d'un cas chiffré avec un client ATTEINT", canal: "RP", cible: "Directions marketing corporate", budgetEstime: "LOW" },
    { activation: "Mois d'essai Embarquement offert aux finalistes de prix entrepreneuriaux", canal: "PARTENARIAT", cible: "Marques personnelles en ascension", budgetEstime: "MEDIUM" },
  ],
  formatsDisponibles: ["newsletter", "dossier éditorial long-format", "tribune presse", "événement en ligne", "badge social partageable", "kit PDF téléchargeable"],
  brandPlatform: {
    name: "La Fusée",
    benefit: "Une trajectoire de marque mesurée et prouvable, du diagnostic au statut d'icône",
    target: "Founders et directions marketing d'Afrique francophone",
    competitiveAdvantage: "Le seul Industry OS combinant méthode + opérateur + score /200 hash-chaîné + marketplace",
    emotionalBenefit: "La fierté de piloter — la charge mentale devient un réglage",
    functionalBenefit: "Livrables sous SLA, score auditable, communauté possédée",
    supportedBy: ["méthode ADVERTIS", "7 Neteru gouvernés", "Constats d'Altitude", "Hub-Escrow"],
  },
  actionsByDevotionLevel: {
    SPECTATEUR: ["Lire un dossier Argos", "S'abonner à The Upgrade"],
    INTERESSE: ["Compléter l'intake gratuit", "Télécharger le kit score /200"],
    PARTICIPANT: ["Débloquer le PDF Oracle léger", "Assister à une cérémonie de palier en invité"],
    ENGAGE: ["Passer en retainer", "Activer une mission crew"],
    AMBASSADEUR: ["Publier son Constat d'Altitude", "Parrainer un founder"],
    EVANGELISTE: ["Co-publier un cas", "Rejoindre la Coalition Stellaire"],
  },
  riskMitigationActions: [
    { action: "Kit appel d'offres score /200", riskId: "risk-upg-001", riskRef: "Concentration des revenus", canal: "DIGITAL", expectedImpact: "Élargit le pipeline corporate au-delà des retainers existants" },
  ],
  innovationsProduit: [
    { name: "MCP billable (API metering)", type: "REVENUE", description: "Facturer la plateforme via les calls d'API — relevés mensuels gelés", feasibility: "SHIPPED", horizon: "H1", devotionImpact: "Étend la base au-delà des founders (intégrateurs)" },
    { name: "Miroir sectoriel vivant", type: "PRODUIT", description: "Benchmark temps réel cross-marques k-anonyme (réciprocité : on n'y entre qu'en contribuant)", feasibility: "GATED_FLOTTE", horizon: "H3", devotionImpact: "Le moat communautaire — raison de rester" },
    { name: "Compagnon WhatsApp du Cockpit", type: "UX", description: "Valider briefs et recevoir alertes sans ouvrir le web", feasibility: "MEDIUM", horizon: "H2", devotionImpact: "Réduit la friction de cadence (ICP)" },
  ],
  actionsByOvertonPhase: [
    { phase: "Prouver", actions: ["Publier 3 Constats d'Altitude consentis", "Série « score de la semaine »"] },
    { phase: "Outiller", actions: ["Kit appel d'offres", "Ouvrir le miroir aux contributeurs"] },
    { phase: "Normaliser", actions: ["Tribunes presse éco", "Programme agences partenaires"] },
  ],
  hypothesisTestActions: [
    { testAction: "Mesurer le taux de renouvellement des cycles mobile money sur 3 mois", hypothesisId: "hyp-003", hypothesisRef: "Cycles 30 j réduisent la friction", expectedOutcome: "Renouvellement ≥ 80 % à J+33", cost: "0 (instrumentation existante)" },
  ],
  copyStrategy: {
    promise: "Un état final mesuré — pas des moyens facturés.",
    rtb: "Score /200 hash-chaîné, SLA opposables, Constat d'Altitude à l'horizon contractuel.",
    tonOfVoice: "Autoritaire, précis, aéronautique — la preuve d'abord.",
    keyMessages: ["De la poussière à l'étoile", "Notoria propose, l'humain dispose", "Votre communauté vous appartient"],
    doNot: ["promettre un résultat commercial absolu", "buzzwords creux", "attaquer nommément des concurrents"],
  },
  bigIdea: {
    concept: "L'agence à obligation d'effet",
    mechanism: "Le score /200 + la trace infalsifiable rendent l'effet contractualisable — et donc la promesse crédible.",
    insight: "Les founders ne sont pas fatigués du marketing : ils sont fatigués de payer sans preuve.",
    adaptations: ["B2B corporate : le kit appel d'offres", "PME : le diagnostic gratuit qui nomme le palier", "talents : le tarif net préservé + progression"],
  },
  potentielBudget: { production: 1200000, media: 600000, talent: 900000, logistics: 400000, technology: 300000, total: 3400000 },
  mediaPlan: {
    totalBudget: 600000,
    channels: [
      { channel: "LinkedIn organique + boost ciblé", budget: 300000, objective: "Direction marketing corporate" },
      { channel: "Presse éco régionale (tribunes)", budget: 200000, objective: "Overton — normaliser la preuve" },
      { channel: "Partenariats événements entrepreneuriaux", budget: 100000, objective: "Founders en ascension" },
    ],
  },
  generationMeta: { gloryToolsUsed: ["canon-operateur"], qualityScore: 9, generatedAt: "2026-06-12T00:00:00.000Z" },
} as const;

// ── PILIER S — STRATEGY (contrat COMPLETE : 20 exigences) ──────────────

export const PILLAR_S = {
  visionStrategique:
    "Faire de La Fusée l'infrastructure par défaut du marché créatif africain francophone : chaque marque sérieuse connaît son score, possède sa communauté, prouve sa trajectoire.",
  globalBudget: "3 400 000 FCFA (enveloppe annuelle 2026 — production, média, talent, logistique, technologie)",
  fenetreOverton: {
    perceptionActuelle: "Une agence tech camerounaise ambitieuse parmi les agences",
    perceptionCible: "Le bâtisseur d'infrastructure — la catégorie qu'on cite quand on parle de marques africaines pilotées par la preuve",
    ecart: "Passer du prestataire à l'institution : la bascule se joue sur la flotte visible et les cas chiffrés publiés",
    strategieDeplacement: [
      { etape: "Prouver", action: "Publier les Constats d'Altitude des marques pilotes (avec consentement)" },
      { etape: "Outiller", action: "Ouvrir le miroir sectoriel aux contributeurs (réciprocité)" },
      { etape: "Normaliser", action: "Le score /200 dans les appels d'offres via les directions marketing converties" },
    ],
  },
  axesStrategiques: [
    { axe: "Preuve publique : du discours au Constat d'Altitude publié", pillarsLinked: ["D", "V", "T"], kpis: ["3 cas publiés T3 2026", "1 tribune presse/trimestre", "kit AO téléchargé 50×"] },
    { axe: "Flotte par le bas du ladder : capture-then-grow", pillarsLinked: ["V", "E"], kpis: ["taux activation J7 > 60 %", "10 marques retainer fin 2026", "renouvellement cycles momo ≥ 80 %"] },
    { axe: "Communauté possédée : Club + Guilde + Coalition", pillarsLinked: ["E", "A"], kpis: ["Club 40 membres actifs", "Guilde 15 talents", "1ère Coalition pilote 2027"] },
  ],
  sprint90Days: [
    { action: "Boucler le funnel paiement bout-en-bout (CinetPay+Stripe) en prod", kpi: "1er cycle d'abonnement encaissé", priority: 1, owner: "NEFER", isRiskMitigation: false, devotionImpact: "PARTICIPANT", sourceRef: "init-upg-001", sourceInitiativeId: "init-upg-001" },
    { action: "Publier les pages conformité B2B (DPA/CGV/SLA/Trust Center)", kpi: "Dossier due diligence envoyable", priority: 2, owner: "NEFER", isRiskMitigation: true, devotionImpact: "INTERESSE", sourceRef: "init-upg-005", sourceInitiativeId: "init-upg-005" },
    { action: "Lancer The Upgrade (4 numéros) + 3 dossiers Argos", kpi: "500 abonnés newsletter", priority: 3, owner: "Alexandre", isRiskMitigation: false, devotionImpact: "SPECTATEUR", sourceRef: "init-upg-002", sourceInitiativeId: "init-upg-002" },
    { action: "Publier 1 Constat d'Altitude consenti (Cimencam)", kpi: "1 cas chiffré public", priority: 4, owner: "Alexandre", isRiskMitigation: true, devotionImpact: "AMBASSADEUR", sourceRef: "init-upg-007", sourceInitiativeId: "init-upg-007" },
    { action: "Première cérémonie de palier trimestrielle", kpi: "20 participants live", priority: 5, owner: "Alexandre", isRiskMitigation: false, devotionImpact: "ENGAGE", sourceRef: "init-upg-003", sourceInitiativeId: "init-upg-003" },
  ],
  facteursClesSucces: ["La preuve publiée régulièrement (cas chiffrés consentis)", "L'activation J0→J7 sans friction (time-to-aha < 1 session)", "La discipline doctrinale (zéro drift entre promesse et produit)", "Le renouvellement fluide des cycles mobile money"],
  roadmap: [
    { phase: "Phase 1 — Preuve (S2 2026)", objectif: "10 marques en retainer, funnel intake rentable, Oracle sans LLM en prod", objectifDevotion: "100 PARTICIPANTS cumulés", actions: ["3 cas Argos publiés", "kit AO live", "cérémonies trimestrielles"], budget: 1400000, duree: "6 mois" },
    { phase: "Phase 2 — Flotte (2027)", objectif: "Miroir sectoriel actif (k≥5 sur 2 secteurs clés), Coalition pilote", objectifDevotion: "300 ENGAGÉS cumulés, 30 AMBASSADEURS", actions: ["ouverture miroir", "programme partenaires", "rassemblement flotte"], budget: 1300000, duree: "12 mois" },
    { phase: "Phase 3 — Basculement (2028)", objectif: "Référence catégorie : le score /200 cité dans les appels d'offres", objectifDevotion: "1ers ÉVANGÉLISTES institutionnels", actions: ["3 zones actives", "presse éco récurrente", "coalitions sectorielles"], budget: 700000, duree: "12 mois" },
  ],
  selectedFromI: [
    { sourceRef: "init-upg-001", sourceInitiativeId: "init-upg-001", action: "Programme éditorial The Upgrade", phase: "SPRINT_90", priority: 1 },
    { sourceRef: "init-upg-002", sourceInitiativeId: "init-upg-002", action: "Dossiers Argos", phase: "SPRINT_90", priority: 2 },
    { sourceRef: "init-upg-003", sourceInitiativeId: "init-upg-003", action: "Cérémonie des paliers", phase: "PHASE_1", priority: 3 },
    { sourceRef: "init-upg-007", sourceInitiativeId: "init-upg-007", action: "Tribunes obligation d'effet", phase: "PHASE_1", priority: 4 },
  ],
  devotionFunnel: [
    { phase: "S2 2026", spectateurs: 2000, interesses: 400, participants: 100, engages: 25, ambassadeurs: 6, evangelistes: 1 },
    { phase: "2027", spectateurs: 8000, interesses: 1500, participants: 300, engages: 80, ambassadeurs: 30, evangelistes: 5 },
  ],
  overtonMilestones: [
    { phase: "Prouver (S2 2026)", currentPerception: "Agence ambitieuse", targetPerception: "Le seul acteur qui publie ses résultats", measurementMethod: "Citations presse + verbatims intake" },
    { phase: "Normaliser (2028)", currentPerception: "Acteur reconnu", targetPerception: "Le standard de la catégorie (score cité en AO)", measurementMethod: "Mentions du /200 dans les appels d'offres" },
  ],
  teamStructure: [
    { name: "Alexandre Djengue", title: "CEO", responsibility: "Doctrine, commercial, relations marché" },
    { name: "NEFER", title: "Opérateur expert", responsibility: "Protocole, production OS, cohérence narrative et technique" },
  ],
  coherenceScore: 86,
  syntheseExecutive:
    "La Fusée joue une stratégie de preuve : capture par le bas du ladder (intake gratuit → PDF 5-25k FCFA), conversion par l'aha moment de l'ignition, rétention par le score /200 et les SLA opposables, expansion par la flotte (miroir sectoriel réservé aux contributeurs). Le sprint 90 j verrouille le funnel paiement, la conformité B2B et la première preuve publique ; les phases 2027-2028 transforment la flotte en standard de catégorie (le score cité dans les appels d'offres). Budget annuel 3,4 M FCFA, ROI piloté par trois axes mesurés : preuve publique, activation J7, communauté possédée.",
  kpiDashboard: [
    { name: "MRR (FCFA)", pillar: "V", target: "3 M fin 2026", frequency: "mensuelle" },
    { name: "Taux d'activation J7", pillar: "E", target: "> 60 %", frequency: "hebdomadaire" },
    { name: "Taux de montée de palier (flotte)", pillar: "S", target: "> 25 %/an", frequency: "trimestrielle" },
    { name: "Cas chiffrés publiés", pillar: "D", target: "3 au S2 2026", frequency: "trimestrielle" },
  ],
  northStarKPI: {
    name: "Marques en retainer actif (flotte payante)",
    target: 10,
    currentValue: 2,
    frequency: "mensuelle",
  },
  budgetBreakdown: {
    production: 1200000,
    media: 600000,
    talent: 900000,
    logistics: 250000,
    technology: 300000,
    contingency: 100000,
    agencyFees: 50000,
  },
  budgetByDevotion: {
    acquisition: 1100000,
    conversion: 900000,
    retention: 900000,
    evangelisation: 500000,
  },
  rejectedFromI: [
    { sourceRef: "init-upg-006", sourceInitiativeId: "init-upg-006", reason: "Rassemblement physique reporté à la Phase 2 : le ratio coût/flotte (80 attendus pour 12 comptes actifs) n'est pas défendable avant 30 marques." },
  ],
  recommandationsPrioritaires: [
    { recommendation: "Publier le premier Constat d'Altitude consenti (Cimencam) avant toute dépense média — la preuve est le levier d'Overton le moins cher.", source: "R+T (weak signal ws-001 : prime au score auditable)", priority: 1 },
    { recommendation: "Instrumenter le renouvellement des cycles mobile money (rappel J-3) avant d'élargir l'acquisition — colmater la rétention avant de remplir l'entonnoir.", source: "R (devotionVulnerabilities Participant)", priority: 2 },
    { recommendation: "Tenir la cadence éditoriale The Upgrade 4 semaines consécutives avant de juger le canal.", source: "I (init-upg-001)", priority: 3 },
  ],
  computed: {
    totalBudget: 3400000,
    budgetByPhase: [
      { phase: "SPRINT_90", budget: 600000 },
      { phase: "PHASE_1", budget: 800000 },
      { phase: "PHASE_2", budget: 1300000 },
      { phase: "PHASE_3", budget: 700000 },
    ],
    riskCoverage: 75,
    mitigatedRiskIds: ["risk-upg-002", "risk-upg-003", "risk-upg-004"],
    selectedInitiativeCount: 4,
    devotionFunnel: { spectateurs: 2000, interesses: 400, participants: 100, engages: 25, ambassadeurs: 6, evangelistes: 1 },
    overtonPosition: "Prouver — phase 1 de la stratégie de déplacement",
    coherenceScore: 86,
    roadmapRoutes: [],
    selectedRouteKey: "TARGET",
    computedAt: "2026-06-12T00:00:00.000Z",
  },
} as const;

export const LAFUSEE_CANON_PILLARS: ReadonlyArray<{ key: string; content: unknown; confidence: number }> = [
  { key: "a", content: PILLAR_A, confidence: 0.92 },
  { key: "d", content: PILLAR_D, confidence: 0.9 },
  { key: "v", content: PILLAR_V, confidence: 0.9 },
  { key: "e", content: PILLAR_E, confidence: 0.88 },
  { key: "r", content: PILLAR_R, confidence: 0.85 },
  { key: "t", content: PILLAR_T, confidence: 0.85 },
  { key: "i", content: PILLAR_I, confidence: 0.85 },
  { key: "s", content: PILLAR_S, confidence: 0.88 },
];

export const LAFUSEE_STRATEGY_NAME = "La Fusée — Industry OS";
export const LAFUSEE_BUSINESS_CONTEXT = {
  sector: "Industry OS / Marketing technologique",
  country: "CM",
  businessModel: "SAAS",
  positioningArchetype: "PREMIUM_ACCESSIBLE",
} as const;
