import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function main() {
  console.log("Seeding database...\n");

  // ================================================================
  // 1. OPERATOR — UPgraders
  // ================================================================
  const operator = await prisma.operator.upsert({
    where: { slug: "upgraders" },
    update: {},
    create: {
      name: "UPgraders SARL",
      slug: "upgraders",
      status: "ACTIVE",
      licenseType: "OWNER",
      licensedAt: new Date(),
      licenseExpiry: new Date("2030-12-31"),
      maxBrands: 50,
      commissionRate: 0.10,
      branding: { primaryColor: "#6C3CE0", logo: "/images/upgraders-logo.svg", tagline: "De la Poussiere a l'Etoile" } as Prisma.InputJsonValue,
    },
  });
  console.log(`[OK] Operator: ${operator.name}`);

  // ================================================================
  // 2. USERS
  // ================================================================
  const admin = await prisma.user.upsert({
    where: { email: "alexandre@upgraders.com" },
    update: {},
    create: {
      name: "Alexandre Djengue Mbangue",
      email: "alexandre@upgraders.com",
      hashedPassword: await hashPassword("Admin123!"),
      role: "ADMIN",
      operatorId: operator.id,
    },
  });

  const clientUser = await prisma.user.upsert({
    where: { email: "client@cimencam.cm" },
    update: {},
    create: {
      name: "Jean-Pierre Fotso",
      email: "client@cimencam.cm",
      hashedPassword: await hashPassword("Client123!"),
      role: "CLIENT_RETAINER",
      operatorId: operator.id,
    },
  });
  console.log(`[OK] Users: admin + client`);

  // ================================================================
  // 3. STRATEGY — CIMENCAM (Brand Instance)
  // ================================================================
  const strategy = await prisma.strategy.upsert({
    where: { id: "demo-strategy-cimencam" },
    update: {
      advertis_vector: {
        a: 18.5, d: 15.2, v: 20.1, e: 12.4, r: 14.8, t: 16.3, i: 11.7, s: 17.0,
        composite: 126.0, confidence: 0.78,
      } as Prisma.InputJsonValue,
      businessContext: {
        businessModel: "PRODUCTION",
        businessModelSubtype: "Industrie lourde — production de ciment",
        economicModels: ["VENTE_DIRECTE", "DISTRIBUTION", "VOLUME"],
        positioningArchetype: "MAINSTREAM",
        salesChannel: "INTERMEDIATED",
        positionalGoodFlag: false,
        premiumScope: "PARTIAL",
        freeLayer: {
          whatIsFree: "Formation technique artisans (dosage, techniques de maconnerie, normes)",
          whatIsPaid: "Le ciment lui-meme + le SAV premium pour les gros chantiers",
          conversionLever: "La formation gratuite cree la dependance au produit. L'artisan forme avec CIMENCAM utilise CIMENCAM. Le gratuit est le meilleur commercial.",
        },
      } as Prisma.InputJsonValue,
    },
    create: {
      id: "demo-strategy-cimencam",
      name: "CIMENCAM",
      description: "Cimenteries du Cameroun — leader du ciment en Afrique centrale. Filiale du groupe LafargeHolcim.",
      userId: clientUser.id,
      operatorId: operator.id,
      status: "ACTIVE",
      advertis_vector: {
        a: 18.5, d: 15.2, v: 20.1, e: 12.4, r: 14.8, t: 16.3, i: 11.7, s: 17.0,
        composite: 126.0, confidence: 0.78,
      } as Prisma.InputJsonValue,
      businessContext: {
        businessModel: "PRODUCTION",
        businessModelSubtype: "Industrie lourde — production de ciment",
        economicModels: ["VENTE_DIRECTE", "DISTRIBUTION", "VOLUME"],
        positioningArchetype: "MAINSTREAM",
        salesChannel: "INTERMEDIATED",
        positionalGoodFlag: false,
        premiumScope: "PARTIAL",
        freeLayer: {
          whatIsFree: "Formation technique artisans (dosage, techniques de maconnerie, normes)",
          whatIsPaid: "Le ciment lui-meme + le SAV premium pour les gros chantiers",
          conversionLever: "La formation gratuite cree la dependance au produit. L'artisan forme avec CIMENCAM utilise CIMENCAM. Le gratuit est le meilleur commercial.",
        },
      } as Prisma.InputJsonValue,
    },
  });
  console.log(`[OK] Strategy: ${strategy.name}`);

  // ================================================================
  // 4. PILLARS — Ontologie complete (Zod-compatible)
  // ================================================================

  const pillarA = {
    archetype: "PROTECTEUR",
    archetypeSecondary: "SOUVERAIN",
    citationFondatrice: "Je crois que chaque famille camerounaise merite un toit solide et durable.",
    noyauIdentitaire: "CIMENCAM incarne la promesse d'un Cameroun qui se construit sur des fondations indestructibles. Notre ADN est celui du batisseur patient qui transforme la poussiere en edifices qui traversent les generations.",

    herosJourney: [
      { actNumber: 1, title: "L'Appel du sol", narrative: "Dans les annees 60, le Cameroun independant avait besoin de materiaux de construction locaux. L'importation coutait cher et retardait le developpement. Le pays appelait une solution souveraine.", emotionalArc: "frustration → espoir", causalLink: "" },
      { actNumber: 2, title: "La Forge industrielle", narrative: "La creation de CIMENCAM en 1963 a Douala marque le debut de l'industrialisation camerounaise du ciment. Les premieres tonnes produites symbolisaient l'autonomie economique du pays.", emotionalArc: "espoir → fierte", causalLink: "Le besoin national a genere la volonte politique de creer une cimenterie locale." },
      { actNumber: 3, title: "L'Epreuve du marche", narrative: "Les annees 80-90 ont vu l'arrivee de concurrents nigerians et la crise economique. CIMENCAM a du se reinventer pour survivre, investissant dans la qualite et la proximite distributeurs.", emotionalArc: "fierte → doute → resilience", causalLink: "La concurrence a force l'excellence operationnelle." },
      { actNumber: 4, title: "L'Alliance strategique", narrative: "Le partenariat avec LafargeHolcim a apporte les standards internationaux tout en preservant l'identite camerounaise. CIMENCAM est devenu le pont entre expertise mondiale et realite africaine.", emotionalArc: "resilience → confiance", causalLink: "La crise a pousse vers des alliances strategiques." },
      { actNumber: 5, title: "Le Batisseur de nations", narrative: "Aujourd'hui CIMENCAM ne vend plus du ciment, il construit l'Afrique centrale. Des routes aux hopitaux, des ecoles aux ponts — chaque sac porte la vision d'un continent debout.", emotionalArc: "confiance → mission", causalLink: "L'alliance a permis de passer du produit a la mission." },
    ],

    ikigai: {
      love: "La construction est notre passion. Voir des structures se dresser la ou il n'y avait que terre nue nous anime depuis 60 ans.",
      competence: "Nous maitrisons la chaine complete de production du ciment — de la carriere au sac — avec des normes ISO et une expertise accumulee sur 6 decennies.",
      worldNeed: "L'Afrique centrale a besoin de 500 millions de tonnes de ciment dans les 20 prochaines annees pour combler son deficit d'infrastructures. Sans ciment local fiable, le continent ne se construit pas.",
      remuneration: "Chaque sac vendu transfere la confiance que le batiment tiendra. Le client paie pour la certitude que son investissement de vie ne s'effondrera pas.",
    },

    valeurs: [
      { value: "SECURITE", customName: "Solidite", rank: 1, justification: "La solidite est notre raison d'etre. Un ciment qui cede, c'est une famille en danger. Cette valeur ne se negocie jamais.", costOfHolding: "Maintenir les normes ISO nous coute 15% de plus en production que si nous relachions les standards.", tensionWith: ["STIMULATION"] },
      { value: "BIENVEILLANCE", customName: "Proximite", rank: 2, justification: "Etre proche de chaque artisan, chaque distributeur, chaque chantier. La relation humaine est ce qui nous differencie des importations.", costOfHolding: "Notre reseau de distribution capillaire coute 3x plus cher a maintenir qu'une distribution centralisee.", tensionWith: ["POUVOIR"] },
      { value: "ACCOMPLISSEMENT", customName: "Excellence", rank: 3, justification: "Nous visons l'excellence industrielle pour que chaque sac soit identique au precedent. La constance est notre forme d'excellence.", costOfHolding: "Le zero-defaut nous impose des controles qualite a chaque etape, ralentissant la production.", tensionWith: ["HEDONISME"] },
      { value: "UNIVERSALISME", customName: "Accessibilite", rank: 4, justification: "Le ciment de qualite ne doit pas etre un luxe. Construire un toit solide est un droit, pas un privilege.", costOfHolding: "Maintenir des prix accessibles comprime nos marges dans un contexte d'inflation des matieres premieres.", tensionWith: ["POUVOIR", "ACCOMPLISSEMENT"] },
    ],

    hierarchieCommunautaire: [
      { level: "SPECTATEUR", description: "Le particulier qui voit CIMENCAM sur les chantiers mais n'a pas encore construit.", privileges: "Acces au contenu educatif sur la construction.", entryCriteria: "Exposition a la marque" },
      { level: "INTERESSE", description: "Le futur constructeur qui compare les ciments et cherche des infos.", privileges: "Guide gratuit 'Bien construire au Cameroun'.", entryCriteria: "Visite d'un point de vente ou engagement digital" },
      { level: "PARTICIPANT", description: "L'artisan ou le particulier qui a achete son premier sac CIMENCAM.", privileges: "Carte fidelite avec bonus volume. Acces au SAV technique.", entryCriteria: "Premier achat" },
      { level: "ENGAGE", description: "Le professionnel du BTP qui utilise exclusivement CIMENCAM sur ses chantiers.", privileges: "Tarifs preferentiels. Formation technique gratuite. Invitation salons BTP.", entryCriteria: "5+ achats, recommandation active" },
      { level: "AMBASSADEUR", description: "Le distributeur ou l'architecte qui recommande CIMENCAM a ses clients.", privileges: "Programme partenaire avec ristournes. Co-branding sur chantiers.", entryCriteria: "Recommendation prouvee, partenariat actif" },
      { level: "EVANGELISTE", description: "Le professionnel qui defend CIMENCAM face a la concurrence et forme d'autres artisans.", privileges: "Acces VIP aux lancements. Participation aux decisions produit. Voyage usine.", entryCriteria: "Defense active de la marque, formation de pairs" },
    ],

    timelineNarrative: {
      origine: "1963 — Naissance de CIMENCAM a Douala. Le Cameroun independant cree sa premiere cimenterie pour batir sa souverainete industrielle.",
      transformation: "1995 — Alliance avec Lafarge. Le savoir-faire mondial rencontre l'ancrage local. CIMENCAM passe de cimenterie nationale a reference regionale.",
      present: "2024 — Leader inconteste en Afrique centrale avec 3 usines et un reseau de 5000+ distributeurs. Le ciment CIMENCAM est synonyme de confiance.",
      futur: "2030 — Devenir le batisseur de l'Afrique centrale. Chaque infrastructure majeure porte la signature CIMENCAM. Objectif : zero edifice qui s'effondre.",
    },

    prophecy: "Nous croyons en une Afrique ou chaque famille dort sous un toit solide. Ou chaque ecole resiste aux intemperies. Ou chaque pont relie les communautes pour des generations. CIMENCAM est le ciment de cette promesse.",
  };

  const pillarD = {
    personas: [
      {
        name: "Brice, 34 ans, entrepreneur BTP",
        age: 34, csp: "Chef d'entreprise", location: "Douala", income: "500K-2M FCFA/mois", familySituation: "Marie, 3 enfants",
        tensionProfile: { segmentId: "MON-06", category: "MONEY", position: "Investisseur long terme" },
        lf8Dominant: ["CONDITIONS_CONFORT", "SUPERIORITE_STATUT"],
        schwartzValues: ["ACCOMPLISSEMENT", "SECURITE"],
        lifestyle: "Brice gere 3-5 chantiers simultanement. Il est sur le terrain des 6h et gere ses equipes au telephone. Son statut social depend de la qualite de ses realisations.",
        mediaConsumption: "Facebook pour le reseau pro, WhatsApp pour la coordination chantiers, radio locale le matin.",
        brandRelationships: "Fidele aux marques qui ne le trahissent pas. A deja perdu un chantier a cause d'un ciment de mauvaise qualite — ne pardonne pas.",
        motivations: "Livrer des chantiers impeccables pour construire sa reputation et decrocher des marches publics.",
        fears: "Un lot de ciment defectueux qui ruine sa reputation et lui fait perdre des clients.",
        hiddenDesire: "Etre reconnu comme le meilleur entrepreneur BTP de sa ville.",
        whatTheyActuallyBuy: "La certitude que son chantier tiendra et que son client sera satisfait.",
        jobsToBeDone: ["Livrer des chantiers solides et dans les delais", "Fideliser ses clients promoteurs", "Optimiser ses couts materiaux"],
        decisionProcess: "Teste un lot, verifie la prise, compare le prix au kilo. Si le rapport qualite/prix est bon et le fournisseur fiable → achat en volume.",
        devotionPotential: "AMBASSADEUR",
        rank: 1,
      },
      {
        name: "Maman Jeanne, 52 ans, autoconstruction",
        age: 52, csp: "Commercante", location: "Yaounde", income: "200-500K FCFA/mois", familySituation: "Veuve, 5 enfants",
        tensionProfile: { segmentId: "MON-02", category: "MONEY", position: "Epargnante prudente" },
        lf8Dominant: ["PROTECTION_PROCHES", "CONDITIONS_CONFORT"],
        schwartzValues: ["SECURITE", "BIENVEILLANCE"],
        lifestyle: "Maman Jeanne construit sa maison sac par sac, mois apres mois. Chaque achat est un sacrifice financier calcule.",
        mediaConsumption: "Radio CRTV, bouche-a-oreille au marche, pasteur le dimanche.",
        motivations: "Offrir un toit solide a ses enfants avant de partir. La maison est son heritage.",
        fears: "Acheter du ciment contrefait et voir ses economies partir en fissures.",
        whatTheyActuallyBuy: "La tranquillite d'esprit que sa maison protegera ses enfants quand elle ne sera plus la.",
        jobsToBeDone: ["Construire progressivement sans s'endetter", "S'assurer de la qualite sans expertise technique"],
        decisionProcess: "Demande conseil au macon du quartier. Si lui dit 'prends CIMENCAM' → elle prend CIMENCAM. Le prix est secondaire si la confiance est la.",
        devotionPotential: "ENGAGE",
        rank: 2,
      },
      {
        name: "Ing. Ngoumou, 41 ans, architecte",
        age: 41, csp: "Architecte agree", location: "Douala", income: "1-3M FCFA/mois", familySituation: "Marie, 2 enfants",
        lf8Dominant: ["SUPERIORITE_STATUT", "APPROBATION_SOCIALE"],
        schwartzValues: ["ACCOMPLISSEMENT", "UNIVERSALISME"],
        motivations: "Concevoir des batiments qui marquent le paysage urbain camerounais. Allier modernite et identite africaine.",
        fears: "Que ses specifications techniques ne soient pas respectees sur le chantier.",
        whatTheyActuallyBuy: "La garantie que ses calculs structurels seront valides avec ce ciment specifique.",
        jobsToBeDone: ["Specifier les materiaux adaptes a chaque projet", "Garantir la conformite aux normes"],
        decisionProcess: "Analyse technique des fiches produit. Compare les certifications. Visite l'usine si le projet est important.",
        devotionPotential: "EVANGELISTE",
        rank: 3,
      },
    ],

    paysageConcurrentiel: [
      { name: "Dangote Cement", partDeMarcheEstimee: 25, avantagesCompetitifs: ["Prix agressif grace a l'echelle nigeriane", "Capacite de production massive", "Marketing tres visible"], faiblesses: ["Perception de qualite inferieure", "Logistique d'importation lente"], strategiePos: "Le ciment pas cher pour tous" },
      { name: "CIMAF (Addoha)", partDeMarcheEstimee: 15, avantagesCompetitifs: ["Usine locale a Kribi", "Liens politiques forts", "Prix competitif"], faiblesses: ["Marque peu connue", "Historique court au Cameroun"], strategiePos: "Le nouveau ciment camerounais" },
      { name: "Imports turcs/chinois", partDeMarcheEstimee: 10, avantagesCompetitifs: ["Prix tres bas", "Disponibilite en gros volumes"], faiblesses: ["Qualite tres variable", "Aucun SAV", "Aucune presence locale"], strategiePos: "Le moins cher du marche" },
    ],

    promesseMaitre: "CIMENCAM : le ciment qui ne vous trahit jamais.",
    sousPromesses: [
      "Chaque sac est identique au precedent — la constance comme signature de qualite.",
      "Un reseau de 5000 distributeurs pour que vous ne soyez jamais a plus de 30 minutes d'un point de vente.",
      "60 ans d'expertise au service de vos fondations.",
    ],

    positionnement: "Pour les batisseurs camerounais, CIMENCAM est le ciment de confiance qui garantit la solidite de chaque construction, parce que 60 ans d'expertise locale et des normes internationales protegent votre investissement.",

    tonDeVoix: {
      personnalite: ["solide", "fiable", "proche", "fier", "accessible", "patient", "genereux"],
      onDit: ["Construisons ensemble", "La qualite, c'est la securite de votre famille", "Depuis 60 ans, a vos cotes", "Chaque sac est une promesse"],
      onNeditPas: ["On est les meilleurs", "Les concurrents sont nuls", "Achetez vite avant rupture"],
    },

    assetsLinguistiques: {
      slogan: "Batissons solide.",
      tagline: "Le ciment de confiance depuis 1963.",
      lexiquePropre: [
        { word: "Batisseur", definition: "Celui qui construit avec CIMENCAM — pas un simple acheteur" },
        { word: "La Prise", definition: "Le moment ou le ciment durcit — metaphore de l'engagement definitif" },
        { word: "Fondation", definition: "Ce qui est invisible mais porte tout — comme nos valeurs" },
      ],
    },
  };

  const pillarV = {
    produitsCatalogue: [
      {
        nom: "CIMENCAM CEM II 32.5R", categorie: "PRODUIT_PHYSIQUE", prix: 4500, cout: 2800,
        margeUnitaire: 1700,
        // Matrice de valeur 2x2x2 COMPLETE
        gainClientConcret: "Un ciment polyvalent adapte a tous les travaux courants — maconnerie, enduits, dalles simples. Prise rapide pour avancer vite sur le chantier. Temps de sechage 30% plus court que les imports.",
        gainClientAbstrait: "La tranquillite de savoir que votre maison tiendra. Le meme ciment que les grands batiments publics du pays. Votre famille est en securite.",
        gainMarqueConcret: "Produit a plus forte rotation : 60% du volume total vendu. Cout de production optimise grace a l'echelle (2800 FCFA/sac). Marge brute 37.8%.",
        gainMarqueAbstrait: "Ancrage de la marque dans le quotidien de chaque camerounais. Chaque sac 32.5 vendu renforce le reflexe CIMENCAM. C'est le produit qui cree l'habitude.",
        coutClientConcret: "4500 FCFA/sac — soit 15-20% plus cher que les imports turcs/chinois. Pour un chantier moyen de 200 sacs = 900 000 FCFA (vs. 780 000 FCFA en import).",
        coutClientAbstrait: "L'effort de chercher un point de vente officiel CIMENCAM plutot que d'acheter le premier sac disponible au marche. Le doute residuel que le premium prix vaut vraiment la difference.",
        coutMarqueConcret: 2800,
        coutMarqueAbstrait: "Risque de cannibalisation si le 42.5 est percu comme 'pas assez different'. Obligation de maintenir la constance qualite sur des millions de sacs/an — un seul lot defectueux peut detruire la confiance.",
        lienPromesse: "Le produit d'entree qui incarne notre promesse de fiabilite accessible a tous les budgets. Si CIMENCAM est 'le ciment qui ne trahit jamais', le 32.5 est la preuve quotidienne de cette promesse.",
        segmentCible: "Maman Jeanne", phaseLifecycle: "MATURITY",
        leviersPsychologiques: ["preuve_sociale", "aversion_perte", "habitude", "confiance_autorite"],
        lf8Trigger: ["CONDITIONS_CONFORT", "PROTECTION_PROCHES"],
        maslowMapping: "SAFETY",
        scoreEmotionnelADVE: 72,
        canalDistribution: ["PACKAGING", "EVENT"],
        disponibilite: "ALWAYS",
        skuRef: "CEM-325R-50KG",
        variantes: ["CEM-325R-25KG"],
      },
      {
        nom: "CIMENCAM CEM I 42.5R", categorie: "PRODUIT_PHYSIQUE", prix: 5200, cout: 3400,
        margeUnitaire: 1800,
        gainClientConcret: "Resistance superieure pour les structures porteuses — poteaux, poutres, fondations profondes. Norme NF certifiee. Tenue a la compression 42.5 MPa garantie.",
        gainClientAbstrait: "La fierte de construire aux standards internationaux. Vos ouvrages sont calibres pour durer 100 ans. Vos clients voient la difference et vous respectent.",
        gainMarqueConcret: "Marge brute 34.6%. Segment en croissance de 12%/an grace aux marches publics. Le produit qui attire les gros volumes professionnels.",
        gainMarqueAbstrait: "Positionne CIMENCAM comme une marque d'experts, pas juste un fournisseur de commodite. Le 42.5 est le produit de credibilite technique.",
        coutClientConcret: "5200 FCFA/sac — 15.6% plus cher que le 32.5. Sur un chantier de 500 sacs = 2 600 000 FCFA. Le surcout doit etre justifie par le cahier des charges.",
        coutClientAbstrait: "La complexite de savoir QUAND le 42.5 est necessaire vs. le 32.5. Risque de sur-specification (payer plus sans raison technique). L'artisan moyen ne comprend pas toujours la difference.",
        coutMarqueConcret: 3400,
        coutMarqueAbstrait: "Necessite une education permanente du marche sur la difference 32.5 vs 42.5. Si le client ne comprend pas la valeur ajoutee, il revient au 32.5 ou pire, va chez Dangote.",
        lienPromesse: "Le produit de reference pour les professionnels qui exigent l'excellence structurelle. La preuve que 'ne jamais trahir' s'applique aussi aux contraintes extremes.",
        segmentCible: "Brice", phaseLifecycle: "GROWTH",
        leviersPsychologiques: ["expertise", "superiorite_technique", "conformite_normes", "reputation_professionnelle"],
        lf8Trigger: ["SUPERIORITE_STATUT", "CONDITIONS_CONFORT"],
        maslowMapping: "ESTEEM",
        scoreEmotionnelADVE: 65,
        canalDistribution: ["PACKAGING", "EVENT"],
        disponibilite: "ALWAYS",
        skuRef: "CEM-425R-50KG",
      },
      {
        nom: "CIMENCAM PLUS (Premium)", categorie: "PRODUIT_PHYSIQUE", prix: 6800, cout: 4200,
        margeUnitaire: 2600,
        gainClientConcret: "Ciment haute performance pour ouvrages d'art, ponts, batiments de grande hauteur. Resistance 52.5 MPa. Temps de prise accelere de 40%. Compatible armatures speciales.",
        gainClientAbstrait: "Construire l'impossible. Le choix des architectes visionnaires qui refusent le compromis. Porter le label CIMENCAM PLUS sur un chantier est un signal de statut professionnel.",
        gainMarqueConcret: "Marge brute 38.2% — la plus elevee de la gamme. Faible volume mais forte valeur percue. Effet halo sur toute la gamme (si le premium existe, le standard est forcement bon).",
        gainMarqueAbstrait: "Le produit qui repositionne CIMENCAM de 'ciment fiable' a 'marque d'ingenierie'. Le PLUS est notre reponse a ceux qui disent que CIMENCAM est 'old school'. C'est notre innovation visible.",
        coutClientConcret: "6800 FCFA/sac — 51% plus cher que le 32.5, 30.8% plus cher que le 42.5. Disponibilite limitee a certains distributeurs agrees. Delai de commande parfois 48h.",
        coutClientAbstrait: "Le risque de sur-investir dans un materiau premium quand le budget du projet est serre. La peur d'etre juge 'excessif' par le maitre d'ouvrage. Le sac PLUS est un engagement — pas de retour.",
        coutMarqueConcret: 4200,
        coutMarqueAbstrait: "Risque de cannibaliser le 42.5 aupres des pros qui veulent 'le meilleur' sans besoin technique reel. Si le PLUS echoue commercialement, c'est un signal de faiblesse de la marque en innovation.",
        lienPromesse: "La promesse poussee a son maximum — zero compromis pour les projets qui defient la gravite. Si CIMENCAM ne trahit jamais, le PLUS est la garantie absolue.",
        segmentCible: "Ing. Ngoumou", phaseLifecycle: "LAUNCH",
        leviersPsychologiques: ["exclusivite", "avant_garde", "statut_expert", "perfection_technique"],
        lf8Trigger: ["SUPERIORITE_STATUT", "APPROBATION_SOCIALE"],
        maslowMapping: "SELF_ACTUALIZATION",
        scoreEmotionnelADVE: 88,
        canalDistribution: ["PACKAGING", "PR"],
        disponibilite: "ALWAYS",
        skuRef: "CEM-PLUS-50KG",
      },
    ],

    productLadder: [
      { tier: "Essentiel", prix: 4500, produitIds: ["CEM-325R-50KG"], cible: "Maman Jeanne", description: "Le ciment de confiance pour tous les travaux courants. Qualite certifiee a prix accessible.", position: 1 },
      { tier: "Professionnel", prix: 5200, produitIds: ["CEM-425R-50KG"], cible: "Brice", description: "Performance structurelle pour les entrepreneurs BTP exigeants. Le standard du metier.", position: 2 },
      { tier: "Premium", prix: 6800, produitIds: ["CEM-PLUS-50KG"], cible: "Ing. Ngoumou", description: "Haute performance pour ouvrages d'exception. Zero compromis.", position: 3 },
    ],

    unitEconomics: {
      cac: 15000,
      ltv: 2500000,
      pointMort: "180 sacs/mois par point de distribution",
      budgetCom: 500000000,
      caVise: 85000000000,
    },
  };

  const pillarE = {
    touchpoints: [
      { canal: "Points de vente distributeurs", type: "PHYSIQUE", channelRef: "PACKAGING", role: "Premier contact physique — le distributeur est l'ambassadeur terrain de CIMENCAM", aarrStage: "ACQUISITION", devotionLevel: ["SPECTATEUR", "INTERESSE"], priority: 1, frequency: "DAILY" },
      { canal: "Facebook CIMENCAM", type: "DIGITAL", channelRef: "FACEBOOK", role: "Contenu educatif sur la construction, temoignages de batisseurs, promotions", aarrStage: "ACTIVATION", devotionLevel: ["INTERESSE", "PARTICIPANT"], priority: 2, frequency: "DAILY" },
      { canal: "SAV technique telephonique", type: "HUMAIN", channelRef: "CUSTOM", role: "Conseil technique gratuit pour les artisans et particuliers — fidelisation par le service", aarrStage: "RETENTION", devotionLevel: ["PARTICIPANT", "ENGAGE"], priority: 3, frequency: "DAILY" },
      { canal: "Salons BTP et foires", type: "PHYSIQUE", channelRef: "EVENT", role: "Rencontre directe avec les professionnels — demos produit, networking, signature partenariats", aarrStage: "REVENUE", devotionLevel: ["ENGAGE", "AMBASSADEUR"], priority: 4, frequency: "QUARTERLY" },
      { canal: "Programme Partenaire Distributeur", type: "HUMAIN", channelRef: "CUSTOM", role: "Programme de fidelite B2B avec ristournes, formations, co-branding", aarrStage: "REFERRAL", devotionLevel: ["AMBASSADEUR", "EVANGELISTE"], priority: 5, frequency: "MONTHLY" },
      { canal: "Radio CRTV / FM locales", type: "DIGITAL", channelRef: "RADIO", role: "Spots radio ciblant les zones rurales et peri-urbaines non couvertes par le digital", aarrStage: "ACQUISITION", devotionLevel: ["SPECTATEUR"], priority: 6, frequency: "WEEKLY" },
      { canal: "Panneaux publicitaires chantiers", type: "PHYSIQUE", channelRef: "OOH", role: "Visibilite sur les chantiers actifs — preuve sociale que les pros utilisent CIMENCAM", aarrStage: "ACQUISITION", devotionLevel: ["SPECTATEUR", "INTERESSE"], priority: 7, frequency: "MONTHLY" },
    ],

    rituels: [
      { nom: "Le Chantier du Mois", type: "CYCLIQUE", frequency: "MONTHLY", description: "Chaque mois, CIMENCAM met en lumiere un chantier exemplaire sur ses reseaux. Le batisseur recoit un kit branded et est interview.", devotionLevels: ["ENGAGE", "AMBASSADEUR"], touchpoints: ["Facebook CIMENCAM"], aarrPrimary: "REFERRAL", kpiMeasure: "Nombre de candidatures chantier + engagement post" },
      { nom: "Formation Artisan Gratuite", type: "ALWAYS_ON", frequency: "WEEKLY", description: "Sessions de formation technique hebdomadaires dans les points de vente partenaires. Techniques de maconnerie, dosage, normes.", devotionLevels: ["PARTICIPANT", "ENGAGE"], touchpoints: ["Points de vente distributeurs"], aarrPrimary: "RETENTION", kpiMeasure: "Nombre de participants + achats post-formation" },
      { nom: "Le Defi Fondation", type: "CYCLIQUE", frequency: "YEARLY", description: "Concours annuel du meilleur projet de construction communautaire. CIMENCAM fournit le ciment gratuitement au gagnant.", devotionLevels: ["AMBASSADEUR", "EVANGELISTE"], touchpoints: ["Facebook CIMENCAM", "Salons BTP et foires"], aarrPrimary: "REFERRAL", kpiMeasure: "Nombre de projets soumis + couverture media" },
    ],

    aarrr: {
      acquisition: "Le batisseur decouvre CIMENCAM quand il voit les sacs rouges sur un chantier voisin. La visibilite terrain est notre premier levier — chaque chantier est une publicite vivante.",
      activation: "Le moment 'aha' est la premiere utilisation : le ciment se melange facilement, prend vite, et le resultat est visuellement solide. L'artisan sent la difference dans ses mains.",
      retention: "Le professionnel revient parce que chaque sac est identique au precedent. La constance cree l'habitude. Le SAV technique gratuit renforce la dependance positive.",
      revenue: "Le passage au volume se fait quand le batisseur obtient un marche important et a besoin d'un fournisseur fiable en gros. Les tarifs pro et la livraison chantier declenchent l'achat massif.",
      referral: "L'artisan qui a toujours livre des chantiers solides avec CIMENCAM le recommande naturellement. Le 'Chantier du Mois' amplifie ce bouche-a-oreille en le digitalisant.",
    },

    kpis: [
      { name: "Part de marche nationale", metricType: "FINANCIAL", target: 45, frequency: "MONTHLY" },
      { name: "Taux de fidelite distributeurs", metricType: "BEHAVIORAL", target: 85, frequency: "MONTHLY" },
      { name: "Engagement Facebook", metricType: "ENGAGEMENT", target: 5, frequency: "WEEKLY" },
      { name: "NPS artisans", metricType: "SATISFACTION", target: 60, frequency: "MONTHLY" },
      { name: "Volume sacs vendus", metricType: "FINANCIAL", target: 2000000, frequency: "MONTHLY" },
      { name: "Taux de participation formations", metricType: "ENGAGEMENT", target: 200, frequency: "MONTHLY" },
    ],
  };

  const pillarR = {
    globalSwot: {
      strengths: ["Leader historique avec 60 ans de presence", "Reseau de 5000+ distributeurs", "Certification ISO et normes NF", "Marque de confiance ancree dans la culture camerounaise"],
      weaknesses: ["Image vieillissante aupres des jeunes", "Communication digitale faible", "Dependance au reseau de distribution physique", "Prix plus eleve que Dangote"],
      opportunities: ["Boom immobilier urbain au Cameroun", "Projets d'infrastructure CAN 2025", "Marche de l'autoconstruction en croissance", "Digitalisation de la chaine de distribution"],
      threats: ["Penetration agressive de Dangote", "Importations low-cost turques/chinoises", "Volatilite des prix du clinker", "Contrefacon de sacs CIMENCAM"],
    },
    probabilityImpactMatrix: [
      { risk: "Perte de 10% de part de marche face a Dangote en 2 ans", probability: "HIGH", impact: "HIGH", mitigation: "Programme de fidelisation distributeurs + differenciation qualite premium" },
      { risk: "Contrefacon generalisee de sacs CIMENCAM", probability: "MEDIUM", impact: "HIGH", mitigation: "Systeme d'authentification QR code sur chaque sac + campagne de sensibilisation" },
      { risk: "Rupture d'approvisionnement clinker", probability: "LOW", impact: "HIGH", mitigation: "Diversification des sources + stock strategique 3 mois" },
      { risk: "Crise de reputation suite a un effondrement de batiment", probability: "LOW", impact: "HIGH", mitigation: "Protocole de crise en 24h + programme de tracabilite chantier" },
      { risk: "Desengagement des artisans vers le ciment low-cost", probability: "HIGH", impact: "MEDIUM", mitigation: "Formations gratuites + programme fidele avec avantages concrets" },
    ],
    mitigationPriorities: [
      { action: "Lancer le programme QR code d'authentification sur chaque sac pour lutter contre la contrefacon — deploiement national en 6 mois", owner: "Direction Qualite", timeline: "Q1 2025", investment: "150M FCFA" },
      { action: "Creer un programme de fidelite distributeurs avec ristournes progressives, formations, et co-branding chantier", owner: "Direction Commerciale", timeline: "Q1 2025", investment: "300M FCFA" },
      { action: "Renforcer la communication digitale avec une equipe dediee social media + contenu educatif hebdomadaire", owner: "Direction Marketing", timeline: "Q2 2025", investment: "100M FCFA" },
      { action: "Developper une gamme 'CIMENCAM ECO' a prix competitif pour contrer les importations low-cost sans cannibaliser la gamme principale", owner: "Direction Produit", timeline: "Q3 2025", investment: "500M FCFA" },
      { action: "Mettre en place un protocole de crise communique a tous les distributeurs et partenaires avec simulations trimestrielles", owner: "Direction Communication", timeline: "Q1 2025", investment: "50M FCFA" },
    ],
    riskScore: 42,
  };

  const pillarT = {
    triangulation: {
      customerInterviews: "Interviews de 50 artisans et 20 distributeurs dans 5 villes. Resultat : la confiance dans la qualite est le premier critere (78%), devant le prix (65%). La disponibilite en zone rurale est le premier point de friction.",
      competitiveAnalysis: "Dangote gagne sur le prix (-15% en moyenne) mais perd sur la perception qualite. CIMAF est percu comme 'pas encore prouve'. Les imports sont vus comme risques. CIMENCAM domine sur la confiance mais est percu comme 'cher'.",
      trendAnalysis: "Le marche camerounais du ciment croit de 8% par an. L'autoconstruction represente 60% du volume. La digitalisation de la chaine de distribution est emergente. Les normes environnementales arrivent (ciment bas carbone).",
      financialBenchmarks: "Marge brute secteur : 35-40%. CIMENCAM a 38%. CAC distributeur : 150K FCFA. LTV distributeur : 25M FCFA/an. Le ratio LTV/CAC est excellent (167x).",
    },
    hypothesisValidation: [
      { hypothesis: "Les artisans sont prets a payer 10% de plus pour un ciment certifie", validationMethod: "Enquete terrain 200 artisans", status: "VALIDATED", evidence: "78% acceptent le premium si la certification est visible sur le sac" },
      { hypothesis: "Un programme de formation gratuite augmente les ventes de 15%", validationMethod: "Pilote sur 20 points de vente pendant 3 mois", status: "VALIDATED", evidence: "+22% de ventes dans les PDV pilotes vs. controle" },
      { hypothesis: "Le digital peut remplacer le reseau de distribution physique", validationMethod: "Test e-commerce B2B sur 6 mois", status: "INVALIDATED", evidence: "Seulement 3% des commandes passees en ligne. Le contact humain reste indispensable." },
      { hypothesis: "Un QR code d'authentification reduit la contrefacon de 50%", validationMethod: "Pilote dans la region du Littoral", status: "TESTING", evidence: "En cours — resultats attendus Q2 2025" },
      { hypothesis: "Les jeunes constructeurs (25-35) sont plus sensibles au branding digital", validationMethod: "A/B test campagne Facebook vs. radio", status: "VALIDATED", evidence: "CPL Facebook 3x inferieur a la radio pour les 25-35 ans" },
    ],
    tamSamSom: {
      tam: { value: 850000000000, description: "Marche total du ciment en Afrique centrale (Cameroun + Gabon + Congo + Tchad + RCA) : 850 milliards FCFA" },
      sam: { value: 350000000000, description: "Marche adressable au Cameroun : 350 milliards FCFA (production locale + importation)" },
      som: { value: 155000000000, description: "Part obtensible CIMENCAM a 3 ans : 155 milliards FCFA (objectif 44% de part de marche)" },
    },
    brandMarketFitScore: 72,
  };

  const pillarI = {
    sprint90Days: [
      { action: "Lancer le programme QR code d'authentification sur 100 premiers points de vente pilotes dans le Littoral et le Centre", owner: "Direction Qualite", kpi: "100 PDV equipes, 10K scans/mois", priority: 1, isRiskMitigation: true },
      { action: "Deployer le programme de fidelite distributeurs 'Partenaire Batisseur' avec 3 niveaux de ristournes", owner: "Direction Commerciale", kpi: "200 distributeurs inscrits, +5% volume Q1", priority: 2, isRiskMitigation: true },
      { action: "Creer et publier 12 contenus educatifs (4 videos + 4 infographies + 4 temoignages) sur Facebook et Instagram", owner: "Agence UPgraders", kpi: "50K reach cumule, 5% engagement", priority: 3 },
      { action: "Organiser 8 formations artisans gratuites dans les 4 principales villes (Douala, Yaounde, Bafoussam, Garoua)", owner: "Direction Technique", kpi: "400 artisans formes, 80% satisfaction", priority: 4 },
      { action: "Mettre en place le protocole de crise avec simulation et formation des porte-parole", owner: "Direction Communication", kpi: "Protocole valide, 1 simulation realisee", priority: 5, isRiskMitigation: true },
      { action: "Briefer et lancer la campagne 'Le Chantier du Mois' sur les reseaux sociaux avec jury mensuel", owner: "Agence UPgraders", kpi: "30 candidatures/mois, 10K vues/post", priority: 6 },
      { action: "Auditer les 50 premiers distributeurs sur la conformite merchandising et la lutte anti-contrefacon", owner: "Direction Commerciale", kpi: "50 audits realises, 90% conformite", priority: 7 },
      { action: "Produire le premier Value Report mensuel avec tableau de bord KPIs unifie", owner: "Agence UPgraders", kpi: "1 rapport livre, 8 KPIs suivis", priority: 8 },
    ],
    annualCalendar: [
      { name: "Lancement Programme Partenaire", quarter: 1, objective: "Fidelisation distributeurs", budget: 100000000, drivers: ["EVENT", "FACEBOOK"] },
      { name: "Campagne Batisseurs du Cameroun", quarter: 1, objective: "Notoriete + engagement", budget: 80000000, drivers: ["FACEBOOK", "RADIO", "OOH"] },
      { name: "Le Defi Fondation (annuel)", quarter: 2, objective: "Engagement communautaire + PR", budget: 50000000, drivers: ["EVENT", "PR", "FACEBOOK"] },
      { name: "Campagne Rentree Scolaire (construction ecoles)", quarter: 3, objective: "RSE + visibilite", budget: 40000000, drivers: ["PR", "RADIO"] },
      { name: "CIMENCAM PLUS Launch", quarter: 3, objective: "Lancement produit premium", budget: 120000000, drivers: ["EVENT", "PR", "FACEBOOK", "OOH"] },
      { name: "Campagne Fin d'Annee Batissons 2025", quarter: 4, objective: "Volume + fidelisation", budget: 60000000, drivers: ["FACEBOOK", "RADIO", "OOH"] },
    ],
    globalBudget: 500000000,
    budgetBreakdown: { production: 80000000, media: 150000000, talent: 60000000, logistics: 40000000, technology: 30000000, legal: 10000000, contingency: 50000000, agencyFees: 80000000 },
    teamStructure: [
      { name: "Jean-Pierre Fotso", title: "DG / Sponsor", responsibility: "Validation strategique et budget" },
      { name: "Marie-Claire Ebong", title: "Directrice Marketing", responsibility: "Pilotage operationnel de toutes les campagnes" },
      { name: "UPgraders (Alexandre)", title: "Agence Conseil Strategique", responsibility: "Strategie de marque, creation, execution digitale, reporting" },
    ],
  };

  const pillarS = {
    syntheseExecutive: "CIMENCAM est un leader historique dont la force repose sur la confiance accumulee en 60 ans. Avec un score ADVE de 126/200 (FORTE), la marque a des fondations solides en Authenticite (18.5) et Valeur (20.1), mais doit urgemment renforcer son Engagement (12.4) et son Implementation (11.7) pour ne pas se faire depasser par Dangote. La priorite strategique est de transformer la confiance passive en communaute active de batisseurs, tout en modernisant la communication pour toucher les 25-40 ans. Le programme Partenaire Distributeurs et la strategie digitale sont les deux leviers immediats.",
    visionStrategique: "A horizon 2030, CIMENCAM n'est plus un fournisseur de ciment mais le partenaire de construction de reference en Afrique centrale. Chaque infrastructure majeure porte notre signature. Chaque artisan se forme avec nous. Chaque famille construit avec confiance.",
    facteursClesSucces: [
      "Maintenir la qualite produit comme avantage competitif non-negociable",
      "Digitaliser la relation distributeur sans perdre la proximite humaine",
      "Transformer les artisans en ambassadeurs actifs via la formation gratuite",
      "Lancer CIMENCAM PLUS pour occuper le segment premium avant la concurrence",
      "Combattre la contrefacon avec le QR code avant que le probleme ne devienne systemique",
    ],
    recommandationsPrioritaires: [
      { recommendation: "Deployer le programme QR anti-contrefacon en priorite — chaque sac contrefait est un risque pour la reputation", source: "R", priority: 1 },
      { recommendation: "Lancer le programme Partenaire Distributeurs dans les 30 jours", source: "R", priority: 2 },
      { recommendation: "Creer une equipe social media dediee pour rattraper le retard digital", source: "T", priority: 3 },
      { recommendation: "Valider le pricing de CIMENCAM PLUS avec un test marche avant lancement national", source: "T", priority: 4 },
      { recommendation: "Structurer le rituel 'Chantier du Mois' comme format phare de contenu", source: "E", priority: 5 },
      { recommendation: "Former 1000 artisans par trimestre via le programme de formation gratuite", source: "E", priority: 6 },
      { recommendation: "Produire un Value Report mensuel pour piloter la strategie par la donnee", source: "I", priority: 7 },
      { recommendation: "Formaliser la roadmap 12 mois avec jalons trimestriels et KPIs par campagne", source: "I", priority: 8 },
    ],
    axesStrategiques: [
      { axe: "Confiance renforcee : de la qualite subie a la qualite prouvee", pillarsLinked: ["A", "V", "R"], kpis: ["NPS artisans > 60", "Zero incident qualite", "100K scans QR/mois"] },
      { axe: "Communaute de batisseurs : du client passif au ambassadeur actif", pillarsLinked: ["E", "D", "A"], kpis: ["Cult Index > 40", "1000 artisans formes/trim", "500 ambassadeurs actifs"] },
      { axe: "Premium accessible : occuper le haut de gamme sans abandonner la base", pillarsLinked: ["V", "D", "T"], kpis: ["15% CA sur CIMENCAM PLUS", "Marge brute +3pts", "Perception premium validee"] },
    ],
    coherenceScore: 68,
  };

  // Upsert all 8 pillars
  const allPillars: Array<{ key: string; content: unknown; confidence: number }> = [
    { key: "a", content: pillarA, confidence: 0.82 },
    { key: "d", content: pillarD, confidence: 0.75 },
    { key: "v", content: pillarV, confidence: 0.85 },
    { key: "e", content: pillarE, confidence: 0.65 },
    { key: "r", content: pillarR, confidence: 0.70 },
    { key: "t", content: pillarT, confidence: 0.78 },
    { key: "i", content: pillarI, confidence: 0.60 },
    { key: "s", content: pillarS, confidence: 0.72 },
  ];

  for (const p of allPillars) {
    const pillar = await prisma.pillar.upsert({
      where: { strategyId_key: { strategyId: strategy.id, key: p.key } },
      update: { content: p.content as Prisma.InputJsonValue, confidence: p.confidence, validationStatus: "VALIDATED" },
      create: { strategyId: strategy.id, key: p.key, content: p.content as Prisma.InputJsonValue, confidence: p.confidence, validationStatus: "VALIDATED" },
    });
    // Create PillarVersion v1 if not exists
    const existingVersion = await prisma.pillarVersion.findFirst({ where: { pillarId: pillar.id, version: 1 } });
    if (!existingVersion) {
      await prisma.pillarVersion.create({
        data: { pillarId: pillar.id, version: 1, content: p.content as Prisma.InputJsonValue, author: "seed", reason: "Initial seed data" },
      });
    }
  }
  console.log("[OK] 8 Pillars + PillarVersions seeded (full ontology)");

  // ================================================================
  // 5. DRIVERS
  // ================================================================
  const driverData = [
    { channel: "FACEBOOK" as const, channelType: "DIGITAL" as const, name: "Facebook CIMENCAM", formatSpecs: { formats: ["post", "video", "carousel", "story"], maxFileSize: "4GB", videoMaxDuration: 240 }, constraints: { brandVoice: "solide, proche, educatif", forbiddenTopics: ["politique", "religion"] }, briefTemplate: { sections: ["Objectif", "Message cle", "Visual direction", "CTA", "Hashtags"] }, qcCriteria: { checkBrandVoice: true, checkVisualGuidelines: true, minEngagementRate: 3 }, pillarPriority: { primary: "E", secondary: "A" } },
    { channel: "INSTAGRAM" as const, channelType: "DIGITAL" as const, name: "Instagram CIMENCAM", formatSpecs: { formats: ["post", "reel", "story", "carousel"] }, constraints: { aesthetic: "chantier_noble", forbiddenTopics: ["politique"] }, briefTemplate: { sections: ["Objectif", "Visual direction", "Caption", "Hashtags"] }, qcCriteria: { checkVisualGuidelines: true, minEngagementRate: 4 }, pillarPriority: { primary: "D", secondary: "E" } },
    { channel: "EVENT" as const, channelType: "EXPERIENTIAL" as const, name: "Salons BTP & Formations", formatSpecs: { types: ["salon", "formation", "activation"] }, constraints: { minAttendance: 50 }, briefTemplate: { sections: ["Objectif", "Lieu", "Programme", "Budget", "KPIs"] }, qcCriteria: { satisfactionMin: 7 }, pillarPriority: { primary: "E", secondary: "V" } },
    { channel: "RADIO" as const, channelType: "MEDIA" as const, name: "Radio (CRTV + FM)", formatSpecs: { durations: [15, 30, 60] }, constraints: { language: ["francais", "pidgin", "ewondo"] }, briefTemplate: { sections: ["Script", "Voix", "Musique", "CTA"] }, qcCriteria: { checkScript: true }, pillarPriority: { primary: "A", secondary: "V" } },
    { channel: "OOH" as const, channelType: "PHYSICAL" as const, name: "Affichage & PLV", formatSpecs: { formats: ["billboard_4x3", "panneau_chantier", "PLV_comptoir"] }, constraints: { minVisibility: "route_nationale" }, briefTemplate: { sections: ["Message", "Visual", "Placement"] }, qcCriteria: { checkBrandGuidelines: true }, pillarPriority: { primary: "D", secondary: "A" } },
    { channel: "PR" as const, channelType: "MEDIA" as const, name: "Relations Presse", formatSpecs: { formats: ["communique", "interview", "reportage"] }, constraints: { toneProfessional: true }, briefTemplate: { sections: ["Angle", "Messages cles", "Porte-parole", "Medias cibles"] }, qcCriteria: { checkFactual: true }, pillarPriority: { primary: "A", secondary: "T" } },
  ];

  for (const d of driverData) {
    await prisma.driver.upsert({
      where: { id: `cimencam-driver-${d.channel.toLowerCase()}` },
      update: { formatSpecs: d.formatSpecs as Prisma.InputJsonValue, constraints: d.constraints as Prisma.InputJsonValue, briefTemplate: d.briefTemplate as Prisma.InputJsonValue, qcCriteria: d.qcCriteria as Prisma.InputJsonValue, pillarPriority: d.pillarPriority as Prisma.InputJsonValue },
      create: { id: `cimencam-driver-${d.channel.toLowerCase()}`, strategyId: strategy.id, channel: d.channel, channelType: d.channelType, name: d.name, formatSpecs: d.formatSpecs as Prisma.InputJsonValue, constraints: d.constraints as Prisma.InputJsonValue, briefTemplate: d.briefTemplate as Prisma.InputJsonValue, qcCriteria: d.qcCriteria as Prisma.InputJsonValue, pillarPriority: d.pillarPriority as Prisma.InputJsonValue },
    });
  }
  console.log(`[OK] ${driverData.length} Drivers seeded`);

  // ================================================================
  // 6. DEVOTION SNAPSHOT + CULT INDEX
  // ================================================================
  await prisma.devotionSnapshot.create({
    data: { strategyId: strategy.id, spectateur: 0.40, interesse: 0.25, participant: 0.18, engage: 0.10, ambassadeur: 0.05, evangeliste: 0.02, devotionScore: 32.6, trigger: "seed" },
  });
  await prisma.cultIndexSnapshot.create({
    data: { strategyId: strategy.id, engagementDepth: 35, superfanVelocity: 15, communityCohesion: 28, brandDefenseRate: 42, ugcGenerationRate: 8, ritualAdoption: 12, evangelismScore: 18, compositeScore: 26.35, tier: "FUNCTIONAL" },
  });
  console.log("[OK] DevotionSnapshot + CultIndexSnapshot seeded");

  // ================================================================
  // 7. SCORE SNAPSHOT (pour l'historique Value Report)
  // ================================================================
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await prisma.scoreSnapshot.create({
    data: { strategyId: strategy.id, advertis_vector: { a: 16.0, d: 13.5, v: 18.0, e: 10.0, r: 13.0, t: 14.5, i: 9.5, s: 15.0, composite: 109.5 } as Prisma.InputJsonValue, classification: "ORDINAIRE", confidence: 0.70, trigger: "monthly_baseline", measuredAt: thirtyDaysAgo },
  });
  console.log("[OK] ScoreSnapshot baseline seeded (30 days ago)");

  // ================================================================
  // 8. TALENT PROFILES
  // ================================================================
  const talents = [
    { email: "marc@freelance.cm", name: "Marc Nzouankeu", tier: "MAITRE" as const, skills: ["design", "branding", "illustration"], totalMissions: 45, firstPassRate: 0.82, peerReviews: 18, driverSpecialties: ["INSTAGRAM", "OOH", "PACKAGING"] },
    { email: "sarah@freelance.cm", name: "Sarah Mbida", tier: "COMPAGNON" as const, skills: ["copywriting", "social-media", "storytelling"], totalMissions: 22, firstPassRate: 0.75, peerReviews: 8, driverSpecialties: ["FACEBOOK", "INSTAGRAM", "RADIO"] },
    { email: "paul@freelance.cm", name: "Paul Essomba", tier: "APPRENTI" as const, skills: ["video", "motion-design"], totalMissions: 5, firstPassRate: 0.60, peerReviews: 1, driverSpecialties: ["VIDEO", "TIKTOK"] },
  ];

  for (const t of talents) {
    const user = await prisma.user.upsert({
      where: { email: t.email },
      update: {},
      create: { name: t.name, email: t.email, hashedPassword: await hashPassword("Creator123!"), role: "FREELANCE", operatorId: operator.id },
    });
    await prisma.talentProfile.upsert({
      where: { userId: user.id },
      update: { driverSpecialties: t.driverSpecialties as Prisma.InputJsonValue },
      create: { userId: user.id, displayName: t.name, tier: t.tier, skills: t.skills as Prisma.InputJsonValue, totalMissions: t.totalMissions, firstPassRate: t.firstPassRate, peerReviews: t.peerReviews, avgScore: 7.5, driverSpecialties: t.driverSpecialties as Prisma.InputJsonValue },
    });
  }
  console.log("[OK] 3 TalentProfiles seeded");

  // ================================================================
  // 9. CAMPAIGN + MISSIONS
  // ================================================================
  const campaign = await prisma.campaign.upsert({
    where: { id: "cimencam-campaign-q1" },
    update: {},
    create: {
      id: "cimencam-campaign-q1",
      name: "Batisseurs du Cameroun Q1 2025",
      code: "CAMP-2025-001",
      strategyId: strategy.id,
      state: "LIVE",
      status: "LIVE",
      budget: 180000000,
      startDate: new Date("2025-01-15"),
      endDate: new Date("2025-03-31"),
      objectives: { primary: "Notoriete + engagement", secondary: "Fidelisation distributeurs" } as Prisma.InputJsonValue,
      advertis_vector: { a: 18, d: 15, e: 14, i: 12 } as Prisma.InputJsonValue,
    },
  });

  await prisma.mission.upsert({
    where: { id: "cimencam-mission-chantier-mois" },
    update: {},
    create: {
      id: "cimencam-mission-chantier-mois",
      title: "Chantier du Mois — Janvier 2025",
      strategyId: strategy.id,
      campaignId: campaign.id,
      driverId: "cimencam-driver-facebook",
      mode: "DISPATCH",
      status: "COMPLETED",
      advertis_vector: { a: 16, e: 18 } as Prisma.InputJsonValue,
      slaDeadline: new Date("2025-01-25"),
    },
  });

  await prisma.mission.upsert({
    where: { id: "cimencam-mission-video-formation" },
    update: {},
    create: {
      id: "cimencam-mission-video-formation",
      title: "Video Formation Artisan — Dosage Beton",
      strategyId: strategy.id,
      campaignId: campaign.id,
      driverId: "cimencam-driver-facebook",
      mode: "COLLABORATIF",
      status: "IN_PROGRESS",
      advertis_vector: { v: 15, e: 12 } as Prisma.InputJsonValue,
      slaDeadline: new Date("2025-04-15"),
    },
  });
  console.log("[OK] Campaign + 2 Missions seeded");

  // ================================================================
  // 10. DEAL (CRM)
  // ================================================================
  await prisma.deal.upsert({
    where: { id: "cimencam-deal" },
    update: {},
    create: { id: "cimencam-deal", strategyId: strategy.id, userId: admin.id, contactName: "Jean-Pierre Fotso", contactEmail: "client@cimencam.cm", companyName: "CIMENCAM", stage: "WON", value: 15000000, currency: "XAF", source: "REFERRAL", wonAt: new Date("2024-11-01") },
  });
  console.log("[OK] Deal seeded");

  // ================================================================
  // 11. KNOWLEDGE SEEDS (F.3 cold start)
  // ================================================================
  const knowledgeSeeds: Array<Prisma.KnowledgeEntryCreateInput> = [
    { entryType: "SECTOR_BENCHMARK", sector: "BTP", market: "CM", data: { avgComposite: 105, topQuartile: 145, sampleSize: 8, insight: "Les marques BTP au Cameroun scorent en moyenne ORDINAIRE. La Distinction (D) est le differenciateur principal." } as Prisma.InputJsonValue, successScore: 0.6, sampleSize: 8, sourceHash: "seed-expertise" },
    { entryType: "SECTOR_BENCHMARK", sector: "FMCG", market: "CM", data: { avgComposite: 95, topQuartile: 135, sampleSize: 12, insight: "FMCG au Cameroun : moyenne ORDINAIRE. L'Engagement (E) est la faiblesse commune." } as Prisma.InputJsonValue, successScore: 0.6, sampleSize: 12, sourceHash: "seed-expertise" },
    { entryType: "SECTOR_BENCHMARK", sector: "BANQUE", market: "CM", data: { avgComposite: 110, topQuartile: 150, sampleSize: 8, insight: "Banques : bon Track (T) mais faible Engagement (E)." } as Prisma.InputJsonValue, successScore: 0.65, sampleSize: 8, sourceHash: "seed-expertise" },
    { entryType: "BRIEF_PATTERN", channel: "FACEBOOK", data: { successRate: 0.78, bestPractices: ["Include brand voice", "Specify pillar priority", "Reference benchmark posts"], avgRevisions: 1.2 } as Prisma.InputJsonValue, successScore: 0.78, sampleSize: 50, sourceHash: "seed-expertise" },
    { entryType: "BRIEF_PATTERN", channel: "VIDEO", data: { successRate: 0.65, bestPractices: ["Storyboard required", "Brand intro < 3s", "CTA in last 5s"], avgRevisions: 2.1 } as Prisma.InputJsonValue, successScore: 0.65, sampleSize: 30, sourceHash: "seed-expertise" },
  ];

  for (const entry of knowledgeSeeds) {
    await prisma.knowledgeEntry.create({ data: entry });
  }
  console.log(`[OK] ${knowledgeSeeds.length} Knowledge entries seeded`);

  // ================================================================
  // 12. BRAND VARIABLES (Variable Store)
  // ================================================================
  const brandVars = [
    { key: "brand_name", value: "CIMENCAM", category: "identity" },
    { key: "brand_tagline", value: "Batissons solide.", category: "identity" },
    { key: "brand_baseline", value: "Le ciment de confiance depuis 1963.", category: "identity" },
    { key: "brand_archetype_primary", value: "PROTECTEUR", category: "identity" },
    { key: "brand_archetype_secondary", value: "SOUVERAIN", category: "identity" },
    { key: "brand_color_primary", value: "#DC2626", category: "visual" },
    { key: "brand_color_secondary", value: "#FFFFFF", category: "visual" },
    { key: "brand_color_accent", value: "#1E3A5F", category: "visual" },
    { key: "brand_font_primary", value: "Montserrat Bold", category: "visual" },
    { key: "brand_font_secondary", value: "Open Sans", category: "visual" },
    { key: "brand_tone_adjectives", value: JSON.stringify(["solide", "fiable", "proche", "fier", "accessible", "patient", "genereux"]), category: "voice" },
    { key: "brand_on_dit", value: JSON.stringify(["Construisons ensemble", "La qualite, c'est la securite de votre famille", "Depuis 60 ans, a vos cotes"]), category: "voice" },
    { key: "brand_on_ne_dit_pas", value: JSON.stringify(["On est les meilleurs", "Les concurrents sont nuls", "Achetez vite avant rupture"]), category: "voice" },
    { key: "target_primary_persona", value: "Brice, 34 ans, entrepreneur BTP", category: "audience" },
    { key: "target_secondary_persona", value: "Maman Jeanne, 52 ans, autoconstruction", category: "audience" },
    { key: "target_tertiary_persona", value: "Ing. Ngoumou, 41 ans, architecte", category: "audience" },
    { key: "positioning_statement", value: "Pour les batisseurs camerounais, CIMENCAM est le ciment de confiance qui garantit la solidite de chaque construction.", category: "positioning" },
    { key: "competitive_advantage_1", value: "60 ans d'expertise locale", category: "positioning" },
    { key: "competitive_advantage_2", value: "Reseau de 5000+ distributeurs", category: "positioning" },
    { key: "competitive_advantage_3", value: "Certification ISO + normes NF", category: "positioning" },
    { key: "promise_master", value: "Le ciment qui ne vous trahit jamais.", category: "value" },
    { key: "product_entry", value: "CEM II 32.5R — 4500 FCFA/sac", category: "value" },
    { key: "product_pro", value: "CEM I 42.5R — 5200 FCFA/sac", category: "value" },
    { key: "product_premium", value: "CIMENCAM PLUS — 6800 FCFA/sac", category: "value" },
    { key: "cac", value: "15000", category: "economics" },
    { key: "ltv", value: "2500000", category: "economics" },
    { key: "ltv_cac_ratio", value: "166.7", category: "economics" },
    { key: "budget_com_annual", value: "500000000", category: "economics" },
    { key: "ca_vise_annual", value: "85000000000", category: "economics" },
    { key: "market_share_current", value: "42", category: "market" },
    { key: "market_share_target", value: "45", category: "market" },
    { key: "tam", value: "850000000000", category: "market" },
    { key: "sam", value: "350000000000", category: "market" },
    { key: "som", value: "155000000000", category: "market" },
    { key: "cult_index_current", value: "26.35", category: "engagement" },
    { key: "cult_tier", value: "FUNCTIONAL", category: "engagement" },
    { key: "devotion_score", value: "32.6", category: "engagement" },
    { key: "nps_target", value: "60", category: "engagement" },
    { key: "risk_score", value: "42", category: "risk" },
    { key: "brand_market_fit", value: "72", category: "market" },
    { key: "coherence_score", value: "68", category: "strategy" },
  ];

  for (const v of brandVars) {
    await prisma.brandVariable.upsert({
      where: { strategyId_key: { strategyId: strategy.id, key: v.key } },
      update: { value: v.value as Prisma.InputJsonValue },
      create: { strategyId: strategy.id, key: v.key, value: v.value as Prisma.InputJsonValue, category: v.category },
    });
  }
  console.log(`[OK] ${brandVars.length} BrandVariables seeded`);

  // ================================================================
  // 13. VARIABLE STORE CONFIG (Staleness)
  // ================================================================
  await prisma.variableStoreConfig.upsert({
    where: { strategyId: strategy.id },
    update: {},
    create: { strategyId: strategy.id, stalenessThresholdDays: 30, autoRecalculate: true, propagationRules: { cascadeOnPillarUpdate: true, notifyOnDrift: true, recalculateScoreOnChange: true } as Prisma.InputJsonValue },
  });
  console.log("[OK] VariableStoreConfig seeded");

  // ================================================================
  // 14. BRAND OS CONFIG
  // ================================================================
  await prisma.brandOSConfig.upsert({
    where: { strategyId: strategy.id },
    update: {},
    create: {
      strategyId: strategy.id,
      viewMode: "EXECUTIVE",
      config: {
        defaultTab: "overview",
        showDevotionLadder: true,
        showCultIndex: true,
        showRadar: true,
        showTimeline: true,
        currency: "XAF",
        language: "fr",
        dateFormat: "DD/MM/YYYY",
      } as Prisma.InputJsonValue,
      theme: { primaryColor: "#DC2626", accentColor: "#1E3A5F", darkMode: true } as Prisma.InputJsonValue,
    },
  });
  console.log("[OK] BrandOSConfig seeded");

  // ================================================================
  // 15. AMBASSADOR PROGRAM
  // ================================================================
  await prisma.ambassadorProgram.upsert({
    where: { strategyId: strategy.id },
    update: {},
    create: {
      strategyId: strategy.id,
      name: "Programme Partenaire Batisseur CIMENCAM",
      description: "Programme de fidelisation et d'ambassadoriat pour les distributeurs et artisans engages.",
      tiers: [
        { tier: "BRONZE", label: "Batisseur", pointsRequired: 0, rewards: ["Badge Batisseur", "Acces contenu exclusif"] },
        { tier: "SILVER", label: "Artisan Confirme", pointsRequired: 500, rewards: ["Remise 5%", "Formation gratuite", "Badge Artisan"] },
        { tier: "GOLD", label: "Maitre d'Oeuvre", pointsRequired: 2000, rewards: ["Remise 10%", "Co-branding chantier", "Invitation salons VIP"] },
        { tier: "PLATINUM", label: "Ambassadeur", pointsRequired: 5000, rewards: ["Remise 15%", "Visite usine", "Participation jury Defi Fondation"] },
        { tier: "DIAMOND", label: "Evangeliste", pointsRequired: 10000, rewards: ["Partenariat officiel", "Co-creation produit", "Voyage LafargeHolcim"] },
      ] as Prisma.InputJsonValue,
      rewards: {
        pointsPerSac: 1,
        pointsPerReferral: 50,
        pointsPerFormation: 100,
        pointsPerChantierDuMois: 500,
      } as Prisma.InputJsonValue,
      isActive: true,
    },
  });

  // Seed some ambassador members
  const ambassadors = [
    { name: "Ets Beton Plus", email: "betonplus@dist.cm", platform: "DISTRIBUTEUR", tier: "GOLD" as const, points: 2500, referrals: 12 },
    { name: "Quincaillerie Mbanga", email: "mbanga@dist.cm", platform: "DISTRIBUTEUR", tier: "SILVER" as const, points: 800, referrals: 5 },
    { name: "Artisan Njoya", email: "njoya@artisan.cm", platform: "ARTISAN", tier: "BRONZE" as const, points: 150, referrals: 2 },
  ];

  const ambassadorProgram = await prisma.ambassadorProgram.findUnique({ where: { strategyId: strategy.id } });
  if (ambassadorProgram) {
    for (const a of ambassadors) {
      await prisma.ambassadorMember.create({
        data: { programId: ambassadorProgram.id, name: a.name, email: a.email, platform: a.platform, tier: a.tier, points: a.points, referrals: a.referrals },
      });
    }
  }
  console.log("[OK] AmbassadorProgram + 3 members seeded");

  // ================================================================
  // 16. COURSES (Academie)
  // ================================================================
  const courses = [
    { title: "Fondamentaux ADVE-RTIS", slug: "adve-fondamentaux", description: "Comprendre les 8 piliers du protocole ADVE-RTIS et comment ils s'appliquent a votre marque.", level: "BEGINNER" as const, category: "ADVE", pillarFocus: "S", duration: 120, content: { modules: [{ title: "Introduction au scoring /200", type: "video" }, { title: "Les 8 piliers expliques", type: "text" }, { title: "Quiz : identifier vos forces", type: "quiz" }] }, order: 1, isPublished: true },
    { title: "Maitriser les Drivers", slug: "maitriser-drivers", description: "Comment choisir et optimiser vos canaux de communication (Instagram, Facebook, Events, PR, etc.).", level: "INTERMEDIATE" as const, category: "DRIVERS", pillarFocus: "I", duration: 90, content: { modules: [{ title: "Cartographie des 20 canaux", type: "text" }, { title: "Adapter le brief au Driver", type: "video" }, { title: "Exercice : creer un brief", type: "exercise" }] }, order: 2, isPublished: true },
    { title: "Le Cult Marketing", slug: "cult-marketing", description: "Transformer vos clients en communaute devouee. Rituels, Devotion Ladder, Cult Index.", level: "ADVANCED" as const, category: "ENGAGEMENT", pillarFocus: "E", duration: 180, content: { modules: [{ title: "De l'audience a la communaute", type: "video" }, { title: "Designer un rituel de marque", type: "exercise" }, { title: "Mesurer le Cult Index", type: "text" }, { title: "Etude de cas : Apple, Nike, Harley", type: "case-study" }] }, order: 3, isPublished: true },
    { title: "Production Creative", slug: "production-creative", description: "Les bases de la production creative pour les freelances de la Guilde.", level: "BEGINNER" as const, category: "PRODUCTION", pillarFocus: "D", duration: 60, content: { modules: [{ title: "Lire un brief ADVE", type: "text" }, { title: "Les standards QC", type: "video" }, { title: "Checklist livrable", type: "checklist" }] }, order: 4, isPublished: true },
  ];

  for (const c of courses) {
    await prisma.course.upsert({
      where: { slug: c.slug },
      update: {},
      create: { ...c, content: c.content as Prisma.InputJsonValue },
    });
  }
  console.log(`[OK] ${courses.length} Courses seeded`);

  // ================================================================
  // 17. CAMPAIGN ACTIONS + AARRR METRICS
  // ================================================================
  await prisma.campaignAction.create({
    data: { campaignId: campaign.id, name: "Post Chantier du Mois Janvier", category: "BTL", actionType: "social-post-organic", budget: 50000, startDate: new Date("2025-01-15"), endDate: new Date("2025-01-31"), status: "COMPLETED", kpis: { templates: ["engagement_rate", "reach", "impressions"] } as Prisma.InputJsonValue },
  });
  await prisma.campaignAction.create({
    data: { campaignId: campaign.id, name: "Spot Radio 30s — CRTV", category: "ATL", actionType: "radio-spot-30s", budget: 15000000, startDate: new Date("2025-02-01"), status: "IN_PROGRESS", kpis: { templates: ["reach", "grp"] } as Prisma.InputJsonValue },
  });
  await prisma.campaignAction.create({
    data: { campaignId: campaign.id, name: "Social Ads Notoriete Facebook", category: "TTL", actionType: "paid-social-awareness", budget: 5000000, startDate: new Date("2025-01-20"), status: "IN_PROGRESS", kpis: { templates: ["reach", "cpm", "impressions"] } as Prisma.InputJsonValue },
  });

  await prisma.campaignAARRMetric.create({ data: { campaignId: campaign.id, stage: "ACQUISITION", metric: "reach", value: 250000, target: 500000, period: "2025-Q1" } });
  await prisma.campaignAARRMetric.create({ data: { campaignId: campaign.id, stage: "ACTIVATION", metric: "first_engagement", value: 12000, target: 25000, period: "2025-Q1" } });
  await prisma.campaignAARRMetric.create({ data: { campaignId: campaign.id, stage: "RETENTION", metric: "repeat_purchase", value: 3500, target: 8000, period: "2025-Q1" } });
  await prisma.campaignAARRMetric.create({ data: { campaignId: campaign.id, stage: "REVENUE", metric: "revenue_attributed", value: 45000000, target: 90000000, period: "2025-Q1" } });
  await prisma.campaignAARRMetric.create({ data: { campaignId: campaign.id, stage: "REFERRAL", metric: "referrals", value: 450, target: 1000, period: "2025-Q1" } });
  console.log("[OK] 3 CampaignActions + 5 AARRR Metrics seeded");

  // ================================================================
  // 18. CAMPAIGN TEMPLATE
  // ================================================================
  await prisma.campaignTemplate.create({
    data: {
      name: "Campagne Lancement Produit BTP",
      description: "Template pour le lancement d'un nouveau produit ciment/materiaux.",
      category: "LAUNCH",
      actionTypes: ["social-post-organic", "radio-spot-30s", "paid-social-awareness", "event-launch", "pr-press-release", "ooh-billboard"] as Prisma.InputJsonValue,
      budget: 120000000,
      timeline: { phases: ["Teasing (J-30)", "Lancement (J-Day)", "Amplification (J+1 a J+30)", "Post-launch (J+30 a J+60)"] } as Prisma.InputJsonValue,
      channels: ["FACEBOOK", "INSTAGRAM", "RADIO", "EVENT", "PR", "OOH"] as Prisma.InputJsonValue,
    },
  });
  console.log("[OK] CampaignTemplate seeded");

  // ================================================================
  // 19. MEDIA CONTACTS (PR)
  // ================================================================
  const mediaContacts = [
    { name: "Alain Bala", email: "abala@cameroon-tribune.cm", outlet: "Cameroon Tribune", beat: "Industrie", country: "CM" },
    { name: "Sandrine Ekotto", email: "sekotto@journalducameroun.com", outlet: "Journal du Cameroun", beat: "Economie", country: "CM" },
    { name: "Paul Mbarga", email: "pmbarga@crtv.cm", outlet: "CRTV", beat: "Economie", country: "CM" },
    { name: "Marie Tsague", email: "mtsague@businessincameroon.com", outlet: "Business in Cameroon", beat: "Business", country: "CM" },
  ];
  for (const mc of mediaContacts) {
    await prisma.mediaContact.upsert({
      where: { email_outlet: { email: mc.email, outlet: mc.outlet } },
      update: {},
      create: mc,
    });
  }
  console.log(`[OK] ${mediaContacts.length} MediaContacts seeded`);

  // ================================================================
  // 20. BADGE DEFINITIONS (Gamification)
  // ================================================================
  const badges = [
    { slug: "first-mission", name: "Premiere Mission", description: "A complete sa premiere mission avec succes.", category: "MILESTONE", criteria: { type: "missions_completed", threshold: 1 }, points: 50 },
    { slug: "ten-missions", name: "Veteran", description: "10 missions completees avec succes.", category: "MILESTONE", criteria: { type: "missions_completed", threshold: 10 }, points: 200 },
    { slug: "first-pass-king", name: "Roi du First Pass", description: "Taux de First Pass Rate superieur a 90%.", category: "QUALITY", criteria: { type: "first_pass_rate", threshold: 0.90 }, points: 300 },
    { slug: "peer-reviewer", name: "Pair Evaluateur", description: "A realise 10+ peer reviews.", category: "COMMUNITY", criteria: { type: "peer_reviews", threshold: 10 }, points: 150 },
    { slug: "multi-driver", name: "Multi-Driver", description: "A travaille sur 5+ canaux differents.", category: "VERSATILITY", criteria: { type: "driver_count", threshold: 5 }, points: 250 },
    { slug: "brand-builder", name: "Batisseur de Marque", description: "A contribue a 3+ brand guidelines.", category: "IMPACT", criteria: { type: "guidelines_contributed", threshold: 3 }, points: 500 },
  ];
  for (const b of badges) {
    await prisma.badgeDefinition.upsert({
      where: { slug: b.slug },
      update: {},
      create: { slug: b.slug, name: b.name, description: b.description, category: b.category, criteria: b.criteria as Prisma.InputJsonValue, points: b.points },
    });
  }
  console.log(`[OK] ${badges.length} BadgeDefinitions seeded`);

  // ================================================================
  // 21. WEBHOOK CONFIGS
  // ================================================================
  await prisma.webhookConfig.create({
    data: { name: "Social Media Webhook", url: "/api/webhooks/social", events: ["post_published", "metrics_update", "comment", "mention"] as Prisma.InputJsonValue, isActive: true },
  });
  await prisma.webhookConfig.create({
    data: { name: "Mobile Money Webhook", url: "/api/webhooks/mobile-money", events: ["payment_completed", "payment_failed"] as Prisma.InputJsonValue, isActive: true },
  });
  console.log("[OK] 2 WebhookConfigs seeded");

  // ================================================================
  // 22. MCP SERVER CONFIGS
  // ================================================================
  const mcpServers = [
    { serverName: "intelligence", description: "Knowledge Graph, Market Intelligence, Benchmarks" },
    { serverName: "operations", description: "Campaign Manager, Missions, SLA, Process Scheduler" },
    { serverName: "creative", description: "GLORY Tools, Brief Generation, Guidelines, Brand Guardian" },
    { serverName: "pulse", description: "Devotion Ladder, Cult Index, Engagement Tracking" },
    { serverName: "guild", description: "Talent Matching, QC, Commissions, Certifications" },
    { serverName: "seshat", description: "External Benchmarks, Creative References, Sector Analysis" },
  ];
  for (const s of mcpServers) {
    await prisma.mcpServerConfig.upsert({
      where: { serverName: s.serverName },
      update: {},
      create: { serverName: s.serverName, description: s.description, isEnabled: true },
    });
  }
  console.log(`[OK] ${mcpServers.length} McpServerConfigs seeded`);

  // ================================================================
  // 23. NOTIFICATION PREFERENCES
  // ================================================================
  await prisma.notificationPreference.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id, channels: { inApp: true, email: true, sms: false } as Prisma.InputJsonValue, digestFrequency: "INSTANT" },
  });
  await prisma.notificationPreference.upsert({
    where: { userId: clientUser.id },
    update: {},
    create: { userId: clientUser.id, channels: { inApp: true, email: true, sms: false } as Prisma.InputJsonValue, digestFrequency: "DAILY" },
  });
  console.log("[OK] NotificationPreferences seeded");

  // ================================================================
  // 24. COMMUNITY SNAPSHOT
  // ================================================================
  await prisma.communitySnapshot.create({
    data: { strategyId: strategy.id, platform: "FACEBOOK", size: 45000, health: 0.62, sentiment: 0.71, velocity: 0.15, activeRate: 0.08 },
  });
  await prisma.communitySnapshot.create({
    data: { strategyId: strategy.id, platform: "INSTAGRAM", size: 12000, health: 0.45, sentiment: 0.68, velocity: 0.22, activeRate: 0.12 },
  });
  console.log("[OK] 2 CommunitySnapshots seeded");

  // ================================================================
  // 25. SUPERFAN PROFILES
  // ================================================================
  const superfans = [
    { platform: "FACEBOOK", handle: "EtsBTPExcellence", engagementDepth: 85, segment: "AMBASSADEUR", interactions: 234 },
    { platform: "FACEBOOK", handle: "ArchitecteDuala", engagementDepth: 92, segment: "EVANGELISTE", interactions: 189 },
    { platform: "INSTAGRAM", handle: "BTP_Cameroun", engagementDepth: 70, segment: "ENGAGE", interactions: 95 },
    { platform: "FACEBOOK", handle: "MamanConstruit", engagementDepth: 55, segment: "PARTICIPANT", interactions: 42 },
  ];
  for (const sf of superfans) {
    await prisma.superfanProfile.upsert({
      where: { strategyId_platform_handle: { strategyId: strategy.id, platform: sf.platform, handle: sf.handle } },
      update: { engagementDepth: sf.engagementDepth, segment: sf.segment, interactions: sf.interactions, lastActiveAt: new Date() },
      create: { strategyId: strategy.id, ...sf, lastActiveAt: new Date() },
    });
  }
  console.log(`[OK] ${superfans.length} SuperfanProfiles seeded`);

  // ================================================================
  // 26. PROCESSES (Scheduler)
  // ================================================================
  await prisma.process.deleteMany({ where: { strategyId: strategy.id } });
  await prisma.process.create({
    data: { strategyId: strategy.id, type: "DAEMON", name: "monthly-value-report", description: "Generation automatique du Value Report mensuel", status: "RUNNING", frequency: "monthly", priority: 3, nextRunAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), playbook: { actions: ["generate_value_report", "notify_client", "capture_knowledge"] } as Prisma.InputJsonValue },
  });
  await prisma.process.create({
    data: { strategyId: strategy.id, type: "DAEMON", name: "weekly-cult-index", description: "Recalcul hebdomadaire du Cult Index", status: "RUNNING", frequency: "weekly", priority: 2, nextRunAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), playbook: { actions: ["calculate_cult_index", "snapshot", "check_drift"] } as Prisma.InputJsonValue },
  });
  await prisma.process.create({
    data: { strategyId: strategy.id, type: "TRIGGERED", name: "first-value-j7-guidelines", description: "J+7: Generation des guidelines de marque", status: "COMPLETED", priority: 1, lastRunAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), runCount: 1, playbook: { step: "J+7", actions: ["generate_guidelines"] } as Prisma.InputJsonValue },
  });
  console.log("[OK] 3 Processes seeded");

  // ================================================================
  // 27. SIGNALS (feedback loop)
  // ================================================================
  await prisma.signal.deleteMany({ where: { strategyId: strategy.id } });
  await prisma.signal.create({ data: { strategyId: strategy.id, type: "SOCIAL_METRICS", data: { platform: "FACEBOOK", reach: 15000, engagement: 4.2, period: "2025-01" } as Prisma.InputJsonValue } });
  await prisma.signal.create({ data: { strategyId: strategy.id, type: "MISSION_COMPLETED", data: { missionId: "cimencam-mission-chantier-mois", qcScore: 8.2 } as Prisma.InputJsonValue } });
  await prisma.signal.create({ data: { strategyId: strategy.id, type: "SCORE_IMPROVEMENT", data: { delta: 16.5, from: 109.5, to: 126.0, trigger: "pillar_update" } as Prisma.InputJsonValue } });
  console.log("[OK] 3 Signals seeded");

  // ================================================================
  // 28. BRAND ASSETS
  // ================================================================
  await prisma.brandAsset.deleteMany({ where: { strategyId: strategy.id } });
  await prisma.brandAsset.create({ data: { strategyId: strategy.id, name: "Logo CIMENCAM principal", fileUrl: "/assets/cimencam-logo-main.svg", pillarTags: ["D"] as Prisma.InputJsonValue } });
  await prisma.brandAsset.create({ data: { strategyId: strategy.id, name: "Charte graphique 2024", fileUrl: "/assets/cimencam-charte-2024.pdf", pillarTags: ["D", "S"] as Prisma.InputJsonValue } });
  await prisma.brandAsset.create({ data: { strategyId: strategy.id, name: "Photo produit CEM 32.5", fileUrl: "/assets/cimencam-cem325.jpg", pillarTags: ["V"] as Prisma.InputJsonValue } });
  await prisma.brandAsset.create({ data: { strategyId: strategy.id, name: "Video Chantier du Mois Janv", fileUrl: "/assets/chantier-mois-jan.mp4", pillarTags: ["E", "A"] as Prisma.InputJsonValue } });
  console.log("[OK] 4 BrandAssets seeded");

  // ================================================================
  // 29. CONTRACTS
  // ================================================================
  await prisma.contract.deleteMany({ where: { strategyId: strategy.id } });
  await prisma.contract.create({
    data: { strategyId: strategy.id, title: "Contrat Retainer UPgraders 2025", contractType: "RETAINER", status: "ACTIVE", startDate: new Date("2025-01-01"), endDate: new Date("2025-12-31"), value: 180000000, signedAt: new Date("2024-12-15") },
  });
  console.log("[OK] 1 Contract seeded");

  // ================================================================
  // 30. COMMISSIONS
  // ================================================================
  const marcUser = await prisma.user.findUnique({ where: { email: "marc@freelance.cm" } });
  if (marcUser) {
    await prisma.commission.deleteMany({ where: { talentId: marcUser.id } });
    await prisma.commission.create({
      data: { missionId: "cimencam-mission-chantier-mois", talentId: marcUser.id, grossAmount: 250000, commissionRate: 0.70, commissionAmount: 75000, netAmount: 175000, currency: "XAF", status: "PAID", paidAt: new Date("2025-02-01"), tierAtTime: "MAITRE", operatorFee: 7500 },
    });
  }
  console.log("[OK] 1 Commission seeded");

  console.log("\n========================================");
  console.log("SEED COMPLETED SUCCESSFULLY");
  console.log("========================================");
  console.log(`Strategy: CIMENCAM (${strategy.id})`);
  console.log("Score: 126/200 (FORTE)");
  console.log("Pillars: 8/8 (full ontology)");
  console.log(`BrandVariables: ${brandVars.length}`);
  console.log("Drivers: 6 | Campaign: 1 LIVE + 3 actions + 5 AARRR");
  console.log("Talents: 3 | Commission: 1 PAID");
  console.log("Ambassador Program: 1 + 3 members");
  console.log("Courses: 4 | Badges: 6");
  console.log("Processes: 3 | Signals: 3 | Assets: 4");
  console.log("Media Contacts: 4 | Superfans: 4");
  console.log("Community Snapshots: 2 | Contract: 1");
  console.log("Webhooks: 2 | MCP Servers: 6");
  console.log("========================================\n");
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
