import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

function makeClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL not set — Prisma 7 driver adapter requires it.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}


const prisma = makeClient();
const SALT_ROUNDS = 12;

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

// ============================================================================
// NJANGI — La tontine digitale qui libere l'epargne africaine
// Demo seed that exercises EVERY model in the Prisma schema
// ============================================================================

async function main() {
  console.log("============================================================");
  console.log("  NJANGI DEMO SEED — Fintech Tontine Digitale Camerounaise");
  console.log("============================================================\n");

  // Track counts for summary
  const counts: Record<string, number> = {};
  function track(model: string, n: number = 1) {
    counts[model] = (counts[model] || 0) + n;
  }

  // ================================================================
  // 1. RE-USE EXISTING OPERATOR — UPgraders
  // ================================================================
  const operator = await prisma.operator.findUnique({ where: { slug: "upgraders" } });
  if (!operator) {
    throw new Error("Operator 'upgraders' not found. Run db:seed first.");
  }
  console.log(`[OK] Operator found: ${operator.name}`);

  // ================================================================
  // 2. USERS — NJANGI team
  // ================================================================
  const njangiClient = await prisma.user.upsert({
    where: { email: "ceo@njangi.cm" },
    update: {},
    create: {
      name: "Ariane Nkoulou Meva",
      email: "ceo@njangi.cm",
      hashedPassword: await hashPassword("Njangi2025!"),
      role: "CLIENT_RETAINER",
      operatorId: operator.id,
    },
  });
  track("User");

  const njangiBrandManager = await prisma.user.upsert({
    where: { email: "marketing@njangi.cm" },
    update: {},
    create: {
      name: "Fabrice Eyidi Manga",
      email: "marketing@njangi.cm",
      hashedPassword: await hashPassword("Njangi2025!"),
      role: "BRAND_MANAGER",
      operatorId: operator.id,
    },
  });
  track("User");

  // Find existing admin for references
  const admin = await prisma.user.findUnique({ where: { email: "alexandre@upgraders.com" } });
  if (!admin) throw new Error("Admin user not found. Run db:seed first.");

  console.log("[OK] NJANGI Users created (client + brand manager)");

  // ================================================================
  // 3. STRATEGY — NJANGI
  // ================================================================
  const strategy = await prisma.strategy.upsert({
    where: { id: "njangi-strategy" },
    update: {
      advertis_vector: {
        a: 21.0, d: 19.5, v: 17.8, e: 22.3, r: 16.0, t: 18.5, i: 15.2, s: 20.0,
        composite: 150.3, confidence: 0.85,
      } as Prisma.InputJsonValue,
      businessContext: {
        businessModel: "ABONNEMENT",
        businessModelSubtype: "SaaS mobile fintech — digitalisation des tontines",
        economicModels: ["ABONNEMENT", "FREEMIUM", "COMMISSION_TRANSACTION"],
        positioningArchetype: "PREMIUM",
        salesChannel: "DIRECT",
        positionalGoodFlag: true,
        premiumScope: "FULL",
        freeLayer: {
          whatIsFree: "Acces basique : creer/rejoindre 1 tontine, max 10 membres, gestion manuelle des tours",
          whatIsPaid: "Premium (2500F/mois) : tontines illimitees, paiements automatiques, assurance epargne, support prioritaire. Business (10000F/mois) : API, multi-groupes, reporting avance, marque blanche.",
          conversionLever: "Le gratuit permet de gouter la confiance numerique. Une fois que le groupe fonctionne sur NJANGI Free, la friction du passage au Premium est minimale — personne ne veut revenir au cahier papier.",
        },
      } as Prisma.InputJsonValue,
    },
    create: {
      id: "njangi-strategy",
      name: "NJANGI",
      description: "La tontine digitale qui libere l'epargne africaine. App mobile qui digitalise les cercles d'epargne traditionnels (tontines) pour la diaspora et les urbains camerounais.",
      userId: njangiClient.id,
      operatorId: operator.id,
      status: "ACTIVE",
      advertis_vector: {
        a: 21.0, d: 19.5, v: 17.8, e: 22.3, r: 16.0, t: 18.5, i: 15.2, s: 20.0,
        composite: 150.3, confidence: 0.85,
      } as Prisma.InputJsonValue,
      businessContext: {
        businessModel: "ABONNEMENT",
        businessModelSubtype: "SaaS mobile fintech — digitalisation des tontines",
        economicModels: ["ABONNEMENT", "FREEMIUM", "COMMISSION_TRANSACTION"],
        positioningArchetype: "PREMIUM",
        salesChannel: "DIRECT",
        positionalGoodFlag: true,
        premiumScope: "FULL",
        freeLayer: {
          whatIsFree: "Acces basique : creer/rejoindre 1 tontine, max 10 membres, gestion manuelle des tours",
          whatIsPaid: "Premium (2500F/mois) : tontines illimitees, paiements automatiques, assurance epargne, support prioritaire. Business (10000F/mois) : API, multi-groupes, reporting avance, marque blanche.",
          conversionLever: "Le gratuit permet de gouter la confiance numerique. Une fois que le groupe fonctionne sur NJANGI Free, la friction du passage au Premium est minimale — personne ne veut revenir au cahier papier.",
        },
      } as Prisma.InputJsonValue,
    },
  });
  track("Strategy");
  console.log(`[OK] Strategy: ${strategy.name}`);

  // ================================================================
  // 4. PILLARS — 8 piliers NJANGI (ontologie complete)
  // ================================================================

  const pillarA = {
    archetype: "REBELLE",
    archetypeSecondary: "MAGICIEN",
    citationFondatrice: "La confiance n'a pas besoin de papier. Elle a besoin de technologie.",
    noyauIdentitaire: "NJANGI est ne de la conviction que le systeme financier formel a echoue a comprendre l'Afrique. La tontine — ce systeme vieux de plusieurs siecles — fonctionne parce qu'il repose sur la confiance communautaire, pas sur les algorithmes de scoring bancaire. NJANGI ne detruit pas la tontine, il la libere des contraintes physiques pour la rendre accessible a 50 millions de Camerounais et a la diaspora.",

    herosJourney: [
      { actNumber: 1, title: "La Fracture", narrative: "En 2023, 80% des Camerounais n'ont pas de compte bancaire mais 70% participent a une tontine. Le systeme financier formel ignore la realite economique africaine. Les tontines fonctionnent sur la confiance mais sont limitees par la geographie et le cahier papier.", emotionalArc: "frustration → revolte", causalLink: "" },
      { actNumber: 2, title: "L'Illumination", narrative: "Ariane Nkoulou, fintech entrepreneure basee a Douala, realise que le mobile money a prouve que l'Afrique n'a pas besoin de banques — elle a besoin d'outils adaptes a ses propres systemes financiers. La tontine est le systeme. NJANGI sera l'outil.", emotionalArc: "revolte → vision", causalLink: "L'echec bancaire a genere l'innovation communautaire numerique." },
      { actNumber: 3, title: "La Resistance", narrative: "Les premiers mois sont brutaux. Les groupes de tontine sont sceptiques : 'On a toujours fait avec le cahier'. Les regulateurs s'interrogent. Les concurrents (Orange Money, Wave) ne comprennent pas le modele. Mais les premiers 100 groupes pilotes prouvent que le taux de defaut baisse de 40% avec NJANGI.", emotionalArc: "vision → doute → validation", causalLink: "La vision seule ne suffit pas — il faut des preuves terrain." },
      { actNumber: 4, title: "La Viralite", narrative: "Le bouche-a-oreille explose. Chaque groupe converti recrute 3 nouveaux groupes en moyenne. La diaspora decouvre qu'elle peut enfin participer aux tontines familiales depuis Paris ou Montreal. NJANGI atteint 10 000 groupes actifs en 6 mois.", emotionalArc: "validation → euphorie", causalLink: "La preuve sociale a declenche la croissance organique." },
      { actNumber: 5, title: "Le Mouvement", narrative: "NJANGI n'est plus une app — c'est un mouvement. L'epargne communautaire digitale devient un modele etudie par la Banque Mondiale. NJANGI vise 1 million d'utilisateurs et l'expansion en Afrique de l'Ouest. La tontine digitale devient l'alternative financiere du continent.", emotionalArc: "euphorie → mission", causalLink: "La viralite a transforme le produit en mouvement social." },
    ],

    ikigai: {
      love: "Nous sommes obsedes par l'inclusion financiere. Pas l'inclusion des banques — l'inclusion par la communaute. Chaque groupe de tontine qui migre sur NJANGI est une victoire contre l'exclusion.",
      competence: "Nous maitrisons le mobile money, la UX mobile-first, et surtout — nous comprenons la tontine de l'interieur. Notre equipe a participe a des tontines avant de coder l'app.",
      worldNeed: "500 millions d'Africains epargnent via des tontines informelles. Sans digitalisation, cet argent reste invisible, non traçable, et vulnerable aux defauts. NJANGI rend l'epargne communautaire transparente et securisee.",
      remuneration: "Le modele freemium + abonnement genere du revenu recurrent. La commission sur les transactions premium (0.5%) est invisible pour l'utilisateur mais genere du volume. Le Business tier cible les associations et les entreprises.",
    },

    valeurs: [
      { value: "AUTONOMIE", customName: "Liberte financiere", rank: 1, justification: "NJANGI croit que chaque individu et chaque communaute doit etre libre de gerer son argent sans intermediaire bancaire. L'autonomie financiere est notre mission fondamentale.", costOfHolding: "Refuser les partenariats bancaires traditionnels nous prive de capital facile et de legitimite institutionnelle.", tensionWith: ["SECURITE", "CONFORMITE"] },
      { value: "STIMULATION", customName: "Innovation radicale", rank: 2, justification: "Nous refusons le statu quo. Chaque feature de NJANGI doit defier une hypothese du systeme financier traditionnel. L'innovation n'est pas un luxe — c'est notre raison d'exister.", costOfHolding: "L'innovation permanente epuise l'equipe et cree de l'instabilite technique. Les utilisateurs veulent parfois juste de la stabilite.", tensionWith: ["TRADITION", "SECURITE"] },
      { value: "UNIVERSALISME", customName: "Inclusion totale", rank: 3, justification: "NJANGI est pour tout le monde — du trader du marche de Mokolo au cadre de la diaspora a Paris. Aucune discrimination par le revenu, l'education ou la technologie.", costOfHolding: "Servir tous les segments force des compromis UX. La bayam-sellam de 55 ans et le dev de 25 ans n'ont pas les memes besoins.", tensionWith: ["ACCOMPLISSEMENT"] },
      { value: "BIENVEILLANCE", customName: "Confiance communautaire", rank: 4, justification: "La tontine repose sur la confiance. NJANGI ne remplace pas cette confiance — il la renforce avec de la transparence numerique. Chaque feature est concue pour proteger la confiance du groupe.", costOfHolding: "La bienveillance nous empeche parfois de sanctionner les mauvais payeurs assez vite. Le compromis entre communaute et discipline est constant.", tensionWith: ["POUVOIR"] },
    ],

    hierarchieCommunautaire: [
      { level: "CURIEUX", description: "A telecharge l'app mais n'a pas encore cree ou rejoint de tontine.", privileges: "Acces au simulateur d'epargne et aux tutoriels.", entryCriteria: "Telechargement de l'app" },
      { level: "MEMBRE", description: "Participe a au moins une tontine active.", privileges: "Participation aux tontines, notifications, historique.", entryCriteria: "Rejoindre un groupe actif" },
      { level: "ORGANISATEUR", description: "A cree et gere au moins une tontine de 5+ membres.", privileges: "Outils de gestion avances, badges organisateur, priorite support.", entryCriteria: "Creer un groupe de 5+ membres actifs" },
      { level: "LEADER", description: "Gere 3+ tontines actives avec un taux de completion > 90%.", privileges: "Acces beta features, invitation events VIP, commission referral bonus.", entryCriteria: "3+ groupes actifs, 90%+ completion" },
      { level: "AMBASSADEUR", description: "A recrute 10+ groupes et participe au programme ambassadeur.", privileges: "Revenue share sur referrals, co-creation features, profil verifie.", entryCriteria: "10+ groupes recrutes, programme ambassadeur actif" },
      { level: "GARDIEN", description: "Membre fondateur ou contributeur exceptionnel qui incarne les valeurs NJANGI.", privileges: "Advisory board, equity symbolique, acces total a la roadmap.", entryCriteria: "Contribution exceptionnelle validee par l'equipe" },
    ],

    timelineNarrative: {
      origine: "2023 — Ariane Nkoulou lance NJANGI depuis un coworking a Douala. L'idee nait d'une tontine familiale ou l'argent a disparu a cause d'un cahier mal tenu.",
      transformation: "2024 — Lancement de la v1 avec 100 groupes pilotes. Le taux de defaut baisse de 40%. La diaspora decouvre l'app et les inscriptions explosent.",
      present: "2025 — 15 000 groupes actifs, 120 000 utilisateurs. Levee de fonds serie A en cours. Partenariat Orange Money pour les paiements.",
      futur: "2027 — 1 million d'utilisateurs en Afrique centrale et de l'Ouest. NJANGI devient la reference de l'epargne communautaire digitale sur le continent.",
    },

    prophecy: "Nous croyons en une Afrique ou chaque communaute — chaque famille, chaque groupe d'amis, chaque association — peut epargner ensemble sans peur, sans distance, sans papier. NJANGI est la promesse que la confiance ancestrale et la technologie moderne peuvent coexister pour liberer l'epargne de 500 millions d'Africains.",
  };

  const pillarD = {
    personas: [
      {
        name: "Kevin, 28 ans, developpeur diaspora",
        age: 28, csp: "Developpeur web", location: "Paris (France)", income: "2500-3500 EUR/mois", familySituation: "Celibataire, envoie de l'argent au pays",
        tensionProfile: { segmentId: "MON-04", category: "MONEY", position: "Optimisateur digital" },
        lf8Dominant: ["PROTECTION_PROCHES", "APPROBATION_SOCIALE"],
        schwartzValues: ["AUTONOMIE", "BIENVEILLANCE"],
        lifestyle: "Kevin travaille en remote pour une startup parisienne. Il envoie 200 EUR/mois a sa famille a Douala. Il participe a 2 tontines familiales mais rate souvent les reunions physiques a cause de la distance.",
        mediaConsumption: "Twitter tech, YouTube, TikTok, podcasts fintech. WhatsApp pour la famille.",
        brandRelationships: "Early adopter. Teste toutes les apps fintech. A essaye Orange Money, Wave, Chipper Cash. Cherche toujours mieux.",
        motivations: "Rester connecte a sa famille et a sa communaute malgre la distance. Montrer qu'il reussit en diaspora.",
        fears: "Que l'argent envoye a la famille disparaisse. Que les tontines continuent sans lui parce qu'il est loin.",
        hiddenDesire: "Etre reconnu comme le 'bon fils' qui contribue meme de loin. Etre le premier a decouvrir la bonne app.",
        whatTheyActuallyBuy: "Le lien avec la maison. La preuve visible qu'il participe a la vie communautaire malgre la distance.",
        jobsToBeDone: ["Envoyer de l'argent a la famille facilement", "Participer aux tontines depuis l'etranger", "Voir ou va son argent en temps reel"],
        decisionProcess: "Lit les reviews sur Twitter, teste le free tier, invite un ami, et si ca marche → passe en Premium. Decision rapide si l'UX est bonne.",
        devotionPotential: "AMBASSADEUR",
        rank: 1,
      },
      {
        name: "Maman Rose, 45 ans, bayam-sellam Mokolo",
        age: 45, csp: "Commercante (marche)", location: "Douala, Cameroun", income: "150-400K FCFA/mois", familySituation: "Mariee, 4 enfants",
        tensionProfile: { segmentId: "MON-02", category: "MONEY", position: "Epargnante prudente" },
        lf8Dominant: ["PROTECTION_PROCHES", "CONDITIONS_CONFORT"],
        schwartzValues: ["SECURITE", "BIENVEILLANCE"],
        lifestyle: "Maman Rose vend des legumes au marche de Mokolo. Elle gere 2 tontines de quartier (15 femmes chacune). Elle note tout dans un cahier mais a deja perdu de l'argent a cause de membres qui partent sans payer.",
        mediaConsumption: "WhatsApp (groupes famille + tontine), Facebook pour les actualites, radio le matin.",
        motivations: "Epargner pour la scolarite des enfants et agrandir sa maison.",
        fears: "Qu'un membre parte avec l'argent du groupe. Que la technologie la depasse.",
        whatTheyActuallyBuy: "La securite que personne ne peut tricher. La simplicite qui ne demande pas d'etre 'tech'.",
        jobsToBeDone: ["Gerer ses tontines sans cahier", "Savoir qui a paye sans appeler", "Avoir une preuve en cas de litige"],
        decisionProcess: "En parle aux autres femmes du groupe. Si 3 amies disent 'c'est bien' → elle essaie. La confiance vient du bouche-a-oreille.",
        devotionPotential: "LEADER",
        rank: 2,
      },
      {
        name: "Dr. Tchoupo, 38 ans, cadre superieur",
        age: 38, csp: "Medecin specialiste", location: "Yaounde, Cameroun", income: "800K-1.5M FCFA/mois", familySituation: "Marie, 2 enfants",
        lf8Dominant: ["SUPERIORITE_STATUT", "CONDITIONS_CONFORT"],
        schwartzValues: ["ACCOMPLISSEMENT", "AUTONOMIE"],
        motivations: "Optimiser son epargne. Participer a des tontines de haut montant pour des projets immobiliers.",
        fears: "Perdre son argent dans une tontine mal geree. Etre associe a un produit 'low-end'.",
        whatTheyActuallyBuy: "Le prestige d'un outil moderne pour gerer des montants serieux. La preuve que la tontine n'est pas 'pour les pauvres'.",
        jobsToBeDone: ["Rejoindre des tontines de montants eleves", "Avoir un reporting clair pour sa comptabilite perso", "Investir collectivement dans l'immobilier"],
        decisionProcess: "Compare les apps, verifie les certifications de securite, lit les conditions. Premium d'emblee si la securite est prouvee.",
        devotionPotential: "ENGAGE",
        rank: 3,
      },
    ],

    paysageConcurrentiel: [
      { name: "Orange Money", partDeMarcheEstimee: 35, avantagesCompetitifs: ["Base installee massive", "Reseau d'agents physiques", "Confiance operateur telecom"], faiblesses: ["Pas de fonction tontine", "UX generique", "Frais eleves"], strategiePos: "Le portefeuille mobile universel" },
      { name: "MTN MoMo", partDeMarcheEstimee: 25, avantagesCompetitifs: ["Forte penetration rurale", "Partenariats marchands", "API developpeur"], faiblesses: ["Interface datee", "Support client lent", "Pas de social finance"], strategiePos: "L'argent mobile partout" },
      { name: "Wave", partDeMarcheEstimee: 10, avantagesCompetitifs: ["Zero frais sur les transferts", "UX moderne", "Forte croissance"], faiblesses: ["Pas de fonction tontine native", "Pas encore au Cameroun pleinement", "Modele non rentable"], strategiePos: "Le gratuit qui disrupte" },
    ],

    promesseMaitre: "NJANGI : La seule app qui comprend la tontine.",
    sousPromesses: [
      "Votre tontine, zero papier — chaque paiement est trace, chaque tour est automatise.",
      "Participez depuis Paris, Douala ou Garoua — la distance ne casse plus le cercle de confiance.",
      "Votre argent est protege — assurance epargne et scoring de fiabilite pour chaque membre.",
    ],

    positionnement: "Pour les Camerounais et la diaspora qui participent a des tontines, NJANGI est l'app mobile qui digitalise et securise l'epargne communautaire, parce qu'elle est la seule concue specifiquement pour la tontine — pas un simple portefeuille mobile generaliste.",

    tonDeVoix: {
      personnalite: ["audacieux", "chaleureux", "moderne", "communautaire", "transparent", "rebelle", "inclusif"],
      onDit: ["Ensemble, on epargne mieux", "Ton cercle, ta force", "Zero cahier, zero stress", "La confiance, version 2.0"],
      onNeditPas: ["C'est comme une banque", "Fini la tontine traditionnelle", "Abandonnez vos habitudes", "On fait mieux que vos parents"],
    },

    assetsLinguistiques: {
      slogan: "Ensemble, on epargne mieux.",
      tagline: "La tontine digitale qui libere l'epargne africaine.",
      lexiquePropre: [
        { word: "Njangi", definition: "Mot pidgin camerounais pour 'tontine' — le coeur de notre identite" },
        { word: "Le Cercle", definition: "Un groupe de tontine sur NJANGI — pas un simple 'groupe' mais un cercle de confiance" },
        { word: "Le Tour", definition: "Le moment ou un membre recoit la cagnotte — l'evenement central de chaque tontine" },
        { word: "Le Score de Confiance", definition: "Indicateur de fiabilite de chaque membre — remplace le cahier et les rumeurs" },
      ],
    },
  };

  const pillarV = {
    produitsCatalogue: [
      {
        nom: "NJANGI Free", categorie: "SERVICE_DIGITAL", prix: 0, cout: 800,
        margeUnitaire: -800,
        gainClientConcret: "Creer ou rejoindre 1 tontine de max 10 membres. Suivi des tours manuellement. Notifications WhatsApp. Historique 3 mois.",
        gainClientAbstrait: "La decouverte sans risque. Gouter a la tontine digitale sans engagement financier. Se sentir 'moderne' meme sans payer.",
        gainMarqueConcret: "Funnel d'acquisition : 65% des Free convertissent en Premium dans les 3 mois. CAC = 0 grace au referral organique.",
        gainMarqueAbstrait: "Chaque utilisateur Free est un ambassadeur potentiel. Le gratuit prouve que NJANGI n'est pas la pour 'prendre l'argent des pauvres'.",
        coutClientConcret: "0 FCFA. Limite a 1 tontine et 10 membres. Pas de paiement automatique.",
        coutClientAbstrait: "La frustration de vouloir plus sans payer. Le risque de perdre l'historique au bout de 3 mois si on ne convert pas.",
        coutMarqueConcret: 800,
        coutMarqueAbstrait: "Les free riders qui ne convertiront jamais. Le risque de diluer la perception de valeur si trop de gens restent en gratuit.",
        lienPromesse: "Le Free tier est la preuve que NJANGI democratise l'epargne communautaire. Il incarne la valeur d'inclusion totale.",
        segmentCible: "Maman Rose", phaseLifecycle: "MATURITY",
        leviersPsychologiques: ["reciprocite", "preuve_sociale", "essai_sans_risque", "peur_de_rater"],
        lf8Trigger: ["PROTECTION_PROCHES", "CONDITIONS_CONFORT"],
        maslowMapping: "SAFETY",
        scoreEmotionnelADVE: 65,
        canalDistribution: ["APP", "WEBSITE"],
        disponibilite: "ALWAYS",
        skuRef: "NJANGI-FREE",
      },
      {
        nom: "NJANGI Premium", categorie: "SERVICE_DIGITAL", prix: 2500, cout: 1200,
        margeUnitaire: 1300,
        gainClientConcret: "Tontines illimitees. Paiements automatiques via Orange Money/MTN MoMo. Assurance epargne. Score de confiance. Support prioritaire. Historique illimite. Rappels intelligents.",
        gainClientAbstrait: "Se sentir pro. Gerer ses tontines comme un vrai financier. La fierte de montrer un dashboard propre aux membres de son groupe.",
        gainMarqueConcret: "ARPU 2500 FCFA/mois. LTV 18 mois moyen = 45 000 FCFA. Marge brute 52%. Le coeur du business model.",
        gainMarqueAbstrait: "Le Premium valide le modele SaaS en Afrique. Chaque abonne prouve que les Camerounais paient pour de la valeur, pas seulement pour du gratuit.",
        coutClientConcret: "2 500 FCFA/mois — l'equivalent de 2 beignets-haricot par jour. Debit automatique mensuel.",
        coutClientAbstrait: "L'engagement mensuel dans un pays ou les revenus sont irreguliers. La peur de payer pour un service qui pourrait disparaitre.",
        coutMarqueConcret: 1200,
        coutMarqueAbstrait: "Le churn mensuel de 8% force un renouvellement constant de la base. La pression de justifier le prix chaque mois avec des features visibles.",
        lienPromesse: "Le Premium incarne la promesse complete de NJANGI : la tontine sans friction, sans papier, sans stress.",
        segmentCible: "Kevin", phaseLifecycle: "GROWTH",
        leviersPsychologiques: ["exclusivite", "statut", "commodite", "securite"],
        lf8Trigger: ["APPROBATION_SOCIALE", "PROTECTION_PROCHES"],
        maslowMapping: "BELONGING",
        scoreEmotionnelADVE: 82,
        canalDistribution: ["APP"],
        disponibilite: "ALWAYS",
        skuRef: "NJANGI-PREMIUM",
      },
      {
        nom: "NJANGI Business", categorie: "SERVICE_DIGITAL", prix: 10000, cout: 4500,
        margeUnitaire: 5500,
        gainClientConcret: "API complete. Multi-groupes (gerer 50+ tontines). Reporting avance avec export. Marque blanche. Tableau de bord admin. Conformite fiscale.",
        gainClientAbstrait: "Le pouvoir de digitaliser une association entiere. Etre vu comme un leader technologique dans sa communaute.",
        gainMarqueConcret: "ARPU 10 000 FCFA/mois. LTV estimee 24 mois = 240 000 FCFA. Marge brute 55%. Segment B2B a forte valeur.",
        gainMarqueAbstrait: "Le tier Business positionne NJANGI comme une plateforme serieuse, pas juste une app grand public. Attire les investisseurs.",
        coutClientConcret: "10 000 FCFA/mois — investissement non negligeable pour une association. Necessite une decision collective.",
        coutClientAbstrait: "La responsabilite de digitaliser un groupe entier. La peur que la technologie echoue devant 50 membres sceptiques.",
        coutMarqueConcret: 4500,
        coutMarqueAbstrait: "Le B2B est plus long a convertir et necessite du support humain. Le risque de features trop 'enterprise' qui diluent la simplicite core.",
        lienPromesse: "Le Business tier prouve que la tontine digitale est une infrastructure financiere serieuse, pas un gadget.",
        segmentCible: "Dr. Tchoupo", phaseLifecycle: "LAUNCH",
        leviersPsychologiques: ["statut_expert", "efficacite", "leadership", "controle"],
        lf8Trigger: ["SUPERIORITE_STATUT", "CONDITIONS_CONFORT"],
        maslowMapping: "SELF_ACTUALIZATION",
        scoreEmotionnelADVE: 90,
        canalDistribution: ["WEBSITE", "APP"],
        disponibilite: "ALWAYS",
        skuRef: "NJANGI-BIZ",
      },
    ],

    productLadder: [
      { tier: "Free", prix: 0, produitIds: ["NJANGI-FREE"], cible: "Maman Rose", description: "Decouvrir la tontine digitale sans risque. 1 tontine, 10 membres max.", position: 1 },
      { tier: "Premium", prix: 2500, produitIds: ["NJANGI-PREMIUM"], cible: "Kevin", description: "La tontine sans friction. Illimite, automatise, securise.", position: 2 },
      { tier: "Business", prix: 10000, produitIds: ["NJANGI-BIZ"], cible: "Dr. Tchoupo", description: "La plateforme pour les associations et les leaders communautaires.", position: 3 },
    ],

    unitEconomics: {
      cac: 3500,
      ltv: 45000,
      pointMort: "500 abonnes Premium",
      budgetCom: 50000000,
      caVise: 1200000000,
    },
  };

  const pillarE = {
    touchpoints: [
      { canal: "App NJANGI (mobile)", type: "DIGITAL", channelRef: "APP", role: "Le produit est le premier touchpoint. Chaque interaction dans l'app est une experience de marque.", aarrStage: "ACTIVATION", devotionLevel: ["MEMBRE", "ORGANISATEUR"], priority: 1, frequency: "DAILY" },
      { canal: "Instagram @njangi.cm", type: "DIGITAL", channelRef: "INSTAGRAM", role: "Contenu aspirationnel : success stories de tontines, tips epargne, memes communautaires", aarrStage: "ACQUISITION", devotionLevel: ["CURIEUX", "MEMBRE"], priority: 2, frequency: "DAILY" },
      { canal: "TikTok @njangi", type: "DIGITAL", channelRef: "TIKTOK", role: "Videos courtes : explications tontine, before/after digitalisation, challenges epargne", aarrStage: "ACQUISITION", devotionLevel: ["CURIEUX"], priority: 3, frequency: "DAILY" },
      { canal: "Facebook Groups", type: "DIGITAL", channelRef: "FACEBOOK", role: "Groupes communautaires par ville/diaspora. Entraide entre organisateurs de tontines.", aarrStage: "RETENTION", devotionLevel: ["ORGANISATEUR", "LEADER"], priority: 4, frequency: "WEEKLY" },
      { canal: "Events NJANGI Meetup", type: "PHYSIQUE", channelRef: "EVENT", role: "Rencontres physiques trimestrielles dans les grandes villes. Demo app, networking, temoignages.", aarrStage: "REFERRAL", devotionLevel: ["LEADER", "AMBASSADEUR"], priority: 5, frequency: "QUARTERLY" },
      { canal: "Website njangi.cm", type: "DIGITAL", channelRef: "WEBSITE", role: "Landing page, blog, FAQ, telechargement app. SEO pour 'tontine digitale'.", aarrStage: "ACQUISITION", devotionLevel: ["CURIEUX"], priority: 6, frequency: "ALWAYS" },
    ],

    rituels: [
      { nom: "Le Jour du Tour", type: "CYCLIQUE", frequency: "MONTHLY", description: "Chaque mois, le jour ou un membre recoit la cagnotte est celebre dans l'app avec une animation speciale, un badge, et un partage optionnel sur les reseaux.", devotionLevels: ["MEMBRE", "ORGANISATEUR"], touchpoints: ["App NJANGI (mobile)"], aarrPrimary: "RETENTION", kpiMeasure: "Taux de partage post-tour + badge collection rate" },
      { nom: "Challenge Epargne Ramadan/Noel", type: "CYCLIQUE", frequency: "YEARLY", description: "Pendant les periodes festives, NJANGI lance un challenge epargne communautaire avec des lots (airtime, cash) pour les groupes les plus reguliers.", devotionLevels: ["MEMBRE", "ORGANISATEUR", "LEADER"], touchpoints: ["App NJANGI (mobile)", "Instagram @njangi.cm"], aarrPrimary: "REFERRAL", kpiMeasure: "Nouveaux groupes crees pendant le challenge + taux de completion" },
      { nom: "NJANGI Stories", type: "ALWAYS_ON", frequency: "WEEKLY", description: "Chaque semaine, NJANGI publie le temoignage d'un membre dont la tontine a change sa vie (maison construite, scolarite payee, business lance).", devotionLevels: ["CURIEUX", "MEMBRE"], touchpoints: ["Instagram @njangi.cm", "TikTok @njangi"], aarrPrimary: "ACQUISITION", kpiMeasure: "Vues + telechargements app post-story" },
    ],

    aarrr: {
      acquisition: "Le curieux decouvre NJANGI via TikTok/Instagram (contenu 'tontine digitale'), le bouche-a-oreille d'un ami, ou une recherche 'tontine app' sur le Play Store.",
      activation: "Le moment 'aha' est quand le premier tour de tontine se complete automatiquement dans l'app — sans appels, sans cahier, sans stress. 'Ca marche vraiment!'",
      retention: "La retention est naturelle : une tontine dure 6-12 mois. Tant que le groupe est actif, le membre revient. Les notifications intelligentes et le Score de Confiance renforcent l'engagement.",
      revenue: "La conversion Free → Premium se fait quand le groupe veut creer une 2eme tontine ou activer les paiements automatiques. Le moment declencheur est 'on est limites en Free'.",
      referral: "Le referral est organique : chaque membre invite son propre cercle. Un groupe de 10 genere en moyenne 3 nouveaux groupes. Le programme ambassadeur amplifie ce mecanisme.",
    },

    kpis: [
      { name: "MAU (Monthly Active Users)", metricType: "ENGAGEMENT", target: 50000, frequency: "MONTHLY" },
      { name: "Groupes actifs", metricType: "ENGAGEMENT", target: 5000, frequency: "MONTHLY" },
      { name: "Taux de conversion Free → Premium", metricType: "FINANCIAL", target: 12, frequency: "MONTHLY" },
      { name: "Churn mensuel Premium", metricType: "BEHAVIORAL", target: 5, frequency: "MONTHLY" },
      { name: "NPS utilisateurs", metricType: "SATISFACTION", target: 65, frequency: "QUARTERLY" },
      { name: "Referral coefficient (k-factor)", metricType: "GROWTH", target: 1.5, frequency: "MONTHLY" },
    ],
  };

  const pillarR = {
    globalSwot: {
      strengths: ["Premiere app 100% tontine en Afrique centrale", "UX mobile-first concue pour le contexte africain", "Croissance organique virale (k=1.5)", "Equipe qui comprend la tontine de l'interieur"],
      weaknesses: ["Pas encore de licence fintech formelle", "Dependance a Orange Money/MTN pour les paiements", "Equipe tech reduite (8 devs)", "Brand awareness encore faible hors Douala"],
      opportunities: ["500M d'Africains epargnent via tontines informelles", "Boom du mobile money en Afrique (+30%/an)", "Diaspora africaine en croissance (25M de personnes)", "Regulation fintech en cours au Cameroun (opportunite first-mover)"],
      threats: ["Orange Money pourrait lancer une feature tontine", "Regulation bancaire stricte qui bloque les fintechs", "Risque de fraude intra-groupe (reputation)", "Concurrence Wave/Chipper Cash avec plus de capital"],
    },
    probabilityImpactMatrix: [
      { risk: "Orange Money lance une feature tontine native", probability: "HIGH", impact: "HIGH", mitigation: "Accelerer les features communautaires que OM ne peut pas copier (Score de Confiance, gamification, assurance). Devenir la reference avant qu'ils bougent." },
      { risk: "Fraude intra-groupe qui fait le buzz sur les reseaux", probability: "MEDIUM", impact: "HIGH", mitigation: "Score de Confiance + assurance epargne + mediation integree. Protocole de crise PR en 2h." },
      { risk: "Regulation bancaire bloquant les fintechs", probability: "MEDIUM", impact: "HIGH", mitigation: "Lobbying COBAC + compliance proactive + partenariat avec une banque locale pour le cadre juridique." },
      { risk: "Panne prolongee des reseaux mobile money (Orange/MTN)", probability: "LOW", impact: "HIGH", mitigation: "Integration multi-operateur + systeme de paiement offline avec reconciliation automatique. SLA contractuel avec les operateurs." },
      { risk: "Fuite de donnees financieres des utilisateurs", probability: "LOW", impact: "HIGH", mitigation: "Audit securite trimestriel + chiffrement end-to-end + certification PCI DSS. Bug bounty program pour la communaute dev locale." },
    ],
    mitigationPriorities: [
      { action: "Obtenir la licence de paiement aupres de la COBAC avant Q3 2025", owner: "Direction Juridique", timeline: "Q3 2025", investment: "25M FCFA" },
      { action: "Lancer l'assurance epargne en partenariat avec Activa Assurances", owner: "Product", timeline: "Q2 2025", investment: "15M FCFA" },
      { action: "Recruter 3 devs seniors pour accelerer la roadmap feature", owner: "CTO", timeline: "Q1 2025", investment: "30M FCFA" },
      { action: "Deployer un systeme de detection de fraude intra-groupe base sur le machine learning", owner: "CTO", timeline: "Q2 2025", investment: "20M FCFA" },
      { action: "Mettre en place un protocole de crise PR avec agence et community managers formes", owner: "CMO", timeline: "Q1 2025", investment: "5M FCFA" },
    ],
    riskScore: 38,
  };

  const pillarT = {
    triangulation: {
      customerInterviews: "Interviews de 200 utilisateurs dans 4 villes + 50 diaspora. 92% disent 'je ne reviendrai pas au cahier'. 78% ont decouvert l'app par bouche-a-oreille. Le Score de Confiance est la feature #1 demandee par les organisateurs.",
      competitiveAnalysis: "Orange Money et MTN MoMo dominent le mobile money mais n'ont aucune feature specifique tontine. Wave est gratuit mais n'a pas de social finance. NJANGI est le seul produit concu pour la tontine de A a Z.",
      trendAnalysis: "Le marche du mobile money en Afrique croit de 30%/an. La tontine represente un flux financier informel estime a 2.3 milliards USD en Afrique subsaharienne. La diaspora africaine envoie 95 milliards USD/an — un reservoir inexploite pour l'epargne communautaire.",
      financialBenchmarks: "CAC moyen fintech Afrique : 8 000 FCFA. NJANGI : 3 500 FCFA (50% organique). LTV/CAC ratio : 12.8x (benchmark fintech Afrique : 5-8x). Churn Premium : 8%/mois (benchmark SaaS Afrique : 12%).",
    },
    hypothesisValidation: [
      { hypothesis: "Les utilisateurs sont prets a payer 2500F/mois pour la gestion automatisee de tontine", validationMethod: "A/B test sur 500 groupes Free vs Premium", status: "VALIDATED", evidence: "65% de conversion Free → Premium dans les 3 mois" },
      { hypothesis: "Le Score de Confiance reduit le taux de defaut de 50%", validationMethod: "Pilote sur 200 groupes pendant 6 mois", status: "VALIDATED", evidence: "Taux de defaut : 12% sans score vs. 5% avec score" },
      { hypothesis: "La diaspora est prete a payer plus cher pour participer depuis l'etranger", validationMethod: "Sondage 150 diaspora + test pricing", status: "TESTING", evidence: "En cours — 73% se disent prets a payer 5 EUR/mois" },
      { hypothesis: "La gamification (badges, classements) augmente la retention de 30%", validationMethod: "A/B test gamification ON/OFF sur 300 groupes pendant 3 mois", status: "VALIDATED", evidence: "Retention M3 : 82% avec gamification vs. 61% sans. Engagement +45% sur les interactions hebdomadaires." },
      { hypothesis: "Les notifications de rappel reduisent les retards de cotisation de 40%", validationMethod: "Cohorte test 400 groupes avec rappels SMS/push vs. controle", status: "VALIDATED", evidence: "Retards de cotisation : 22% sans rappels vs. 11% avec rappels automatises (-50%)." },
    ],
    tamSamSom: {
      tam: { value: 1500000000000, description: "Flux tontine informel en Afrique subsaharienne : 1 500 milliards FCFA (~2.3 milliards USD)" },
      sam: { value: 250000000000, description: "Marche adressable Cameroun + diaspora : 250 milliards FCFA (10M de personnes participant a des tontines)" },
      som: { value: 12000000000, description: "Part obtensible a 3 ans : 12 milliards FCFA (120K abonnes Premium + transaction fees)" },
    },
    brandMarketFitScore: 85,
  };

  const pillarI = {
    sprint90Days: [
      { action: "Lancer la v2 de l'app avec paiements automatiques Orange Money + MTN MoMo integres", owner: "CTO", kpi: "100% des transactions Premium automatisees", priority: 1 },
      { action: "Deployer le Score de Confiance sur tous les profils utilisateurs", owner: "Product", kpi: "Score visible pour 100% des membres actifs", priority: 2 },
      { action: "Atteindre 20 000 utilisateurs actifs mensuels", owner: "Growth", kpi: "20K MAU, k-factor > 1.3", priority: 3 },
      { action: "Lancer la campagne TikTok 'Mon Premier Tour' avec 10 createurs", owner: "Marketing", kpi: "500K vues, 2000 telechargements", priority: 4 },
      { action: "Signer le partenariat assurance epargne avec Activa", owner: "BD", kpi: "Contrat signe, pilote sur 50 groupes", priority: 5 },
      { action: "Organiser 2 NJANGI Meetups (Douala + Yaounde)", owner: "Community", kpi: "200 participants, 50 nouveaux groupes crees", priority: 6 },
      { action: "Deployer le systeme de rappels automatiques (SMS + push) pour les cotisations", owner: "Product", kpi: "Taux de retard de cotisation < 15%", priority: 7 },
      { action: "Lancer le programme beta-testeurs diaspora (Paris, Bruxelles, Montreal)", owner: "Growth", kpi: "500 beta-testeurs actifs, feedback qualifie sur 3 marches", priority: 8 },
    ],
    annualCalendar: [
      { name: "Lancement v2 (paiements auto)", quarter: 1, objective: "Product-market fit confirme", budget: 15000000, drivers: ["APP", "INSTAGRAM"] },
      { name: "Campagne Diaspora Paris/Brussels", quarter: 2, objective: "10K utilisateurs diaspora", budget: 10000000, drivers: ["INSTAGRAM", "TIKTOK", "EVENT"] },
      { name: "Challenge Epargne Rentree", quarter: 3, objective: "Viralite + 5000 nouveaux groupes", budget: 8000000, drivers: ["TIKTOK", "FACEBOOK", "APP"] },
      { name: "NJANGI Awards (meilleur groupe)", quarter: 4, objective: "Engagement communautaire", budget: 5000000, drivers: ["EVENT", "INSTAGRAM", "FACEBOOK"] },
      { name: "Partenariat Universites (Yaounde I, Douala, Buea)", quarter: 2, objective: "3000 etudiants onboardes via campus ambassadors", budget: 4000000, drivers: ["EVENT", "TIKTOK", "APP"] },
      { name: "NJANGI Diaspora Week (online)", quarter: 3, objective: "Activation diaspora 5 pays europeens", budget: 6000000, drivers: ["INSTAGRAM", "FACEBOOK", "APP"] },
    ],
    globalBudget: 50000000,
    budgetBreakdown: { product: 15000000, marketing: 12000000, talent: 8000000, events: 5000000, technology: 5000000, legal: 3000000, contingency: 2000000 },
    teamStructure: [
      { name: "Ariane Nkoulou", title: "CEO / Fondatrice", responsibility: "Vision strategique, fundraising, partenariats" },
      { name: "Fabrice Eyidi", title: "CMO", responsibility: "Marketing, growth, communaute, contenus" },
      { name: "UPgraders (Alexandre)", title: "Agence Conseil ADVE", responsibility: "Strategie de marque, positionnement, cult marketing, reporting" },
    ],
  };

  const pillarS = {
    syntheseExecutive: "NJANGI est un cas d'ecole de product-market fit africain. Avec un score ADVE de 150/200 (REMARQUABLE), la marque excelle en Engagement (22.3) et Authenticite (21.0) — deux piliers naturellement forts grace au modele communautaire de la tontine. Les axes d'amelioration sont le Track (16.0) et l'Implementation (15.2), lies a la jeunesse de la marque. La priorite strategique est de consolider la croissance organique tout en structurant les fondations business (licence, assurance, equipe) pour supporter l'acceleration vers 100K utilisateurs.",
    visionStrategique: "A horizon 2027, NJANGI est la reference de l'epargne communautaire digitale en Afrique. 1 million d'utilisateurs, 5 pays, et un modele qui prouve que la finance africaine peut etre construite sur la confiance communautaire plutot que sur le scoring bancaire occidental.",
    facteursClesSucces: [
      "Maintenir le k-factor > 1.3 pour une croissance organique durable",
      "Obtenir la licence fintech COBAC avant que les regulateurs ne serrent la vis",
      "Lancer l'assurance epargne pour eliminer le risque numero 1 (defaut de paiement)",
      "Conquérir la diaspora comme relais de croissance et de revenus premium",
      "Ne jamais perdre l'ame communautaire malgre la pression de scaling",
    ],
    recommandationsPrioritaires: [
      { recommendation: "Accelerer l'obtention de la licence COBAC — c'est le risque existentiel numero 1", source: "R", priority: 1 },
      { recommendation: "Lancer les paiements automatiques pour valider le Premium a grande echelle", source: "V", priority: 2 },
      { recommendation: "Deployer le Score de Confiance comme feature differenciante majeure", source: "T", priority: 3 },
      { recommendation: "Lancer la campagne TikTok pour accelerer l'acquisition chez les 18-35", source: "I", priority: 4 },
      { recommendation: "Structurer le programme ambassadeur pour amplifier le referral organique", source: "E", priority: 5 },
      { recommendation: "Implementer la gamification (badges, classements) pour booster la retention au-dela de 80%", source: "V", priority: 6 },
      { recommendation: "Deployer les rappels automatiques de cotisation pour reduire les retards de 50%", source: "T", priority: 7 },
      { recommendation: "Nouer un partenariat bancaire local (Afriland, BICEC) pour securiser le cadre reglementaire", source: "R", priority: 8 },
    ],
    axesStrategiques: [
      { axe: "Confiance numerique : du cahier a l'app, sans perdre l'ame de la tontine", pillarsLinked: ["A", "V", "T"], kpis: ["Score de Confiance deploye a 100%", "Taux de defaut < 5%", "NPS > 65"] },
      { axe: "Croissance virale : chaque groupe est un centre de recrutement", pillarsLinked: ["E", "D", "I"], kpis: ["k-factor > 1.5", "50K MAU", "Cost per group < 2000 FCFA"] },
      { axe: "Fintech serieuse : structurer pour scaler sans casser", pillarsLinked: ["R", "T", "I"], kpis: ["Licence COBAC obtenue", "Assurance epargne live", "Churn < 5%"] },
    ],
    coherenceScore: 78,
  };

  const allPillars: Array<{ key: string; content: unknown; confidence: number }> = [
    { key: "a", content: pillarA, confidence: 0.88 },
    { key: "d", content: pillarD, confidence: 0.82 },
    { key: "v", content: pillarV, confidence: 0.85 },
    { key: "e", content: pillarE, confidence: 0.80 },
    { key: "r", content: pillarR, confidence: 0.75 },
    { key: "t", content: pillarT, confidence: 0.83 },
    { key: "i", content: pillarI, confidence: 0.72 },
    { key: "s", content: pillarS, confidence: 0.80 },
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
        data: { pillarId: pillar.id, version: 1, content: p.content as Prisma.InputJsonValue, author: "seed-demo", reason: "Initial NJANGI demo seed" },
      });
    }
  }
  track("Pillar", 8);
  track("PillarVersion", 8);
  console.log("[OK] 8 Pillars + PillarVersions seeded (full NJANGI ontology)");

  // ================================================================
  // 5. DRIVERS (6 channels)
  // ================================================================
  const driverData = [
    { id: "njangi-driver-instagram", channel: "INSTAGRAM" as const, channelType: "DIGITAL" as const, name: "Instagram @njangi.cm", formatSpecs: { formats: ["post", "reel", "story", "carousel"], maxFileSize: "4GB" }, constraints: { aesthetic: "afro_futuriste_violet_or", forbiddenTopics: ["politique", "religion", "concurrence_directe"] }, briefTemplate: { sections: ["Objectif", "Visual direction", "Caption", "CTA", "Hashtags"] }, qcCriteria: { checkBrandVoice: true, minEngagementRate: 5 }, pillarPriority: { primary: "E", secondary: "D" } },
    { id: "njangi-driver-tiktok", channel: "TIKTOK" as const, channelType: "DIGITAL" as const, name: "TikTok @njangi", formatSpecs: { formats: ["video_short", "duet", "stitch"], maxDuration: 180 }, constraints: { tone: "fun_educatif", targetAge: "18-35" }, briefTemplate: { sections: ["Hook (3s)", "Contenu", "CTA", "Son/Musique"] }, qcCriteria: { minViews: 1000 }, pillarPriority: { primary: "A", secondary: "E" } },
    { id: "njangi-driver-facebook", channel: "FACEBOOK" as const, channelType: "DIGITAL" as const, name: "Facebook NJANGI", formatSpecs: { formats: ["post", "video", "group_post", "event"] }, constraints: { tone: "communautaire_chaleureux" }, briefTemplate: { sections: ["Objectif", "Message", "Visual", "CTA"] }, qcCriteria: { checkCommunityGuidelines: true }, pillarPriority: { primary: "E", secondary: "A" } },
    { id: "njangi-driver-website", channel: "WEBSITE" as const, channelType: "DIGITAL" as const, name: "Site web njangi.cm", formatSpecs: { formats: ["landing_page", "blog_article", "faq"] }, constraints: { seo: true, mobileFirst: true }, briefTemplate: { sections: ["Page", "SEO keywords", "CTA", "Content"] }, qcCriteria: { checkSEO: true, checkMobile: true }, pillarPriority: { primary: "V", secondary: "T" } },
    { id: "njangi-driver-app", channel: "CUSTOM" as const, channelType: "DIGITAL" as const, name: "App NJANGI (in-app)", formatSpecs: { formats: ["push_notification", "in_app_message", "onboarding_flow", "banner"] }, constraints: { maxPushPerDay: 2 }, briefTemplate: { sections: ["Trigger", "Message", "CTA", "Timing"] }, qcCriteria: { checkUX: true }, pillarPriority: { primary: "V", secondary: "E" } },
    { id: "njangi-driver-event", channel: "EVENT" as const, channelType: "EXPERIENTIAL" as const, name: "NJANGI Meetups", formatSpecs: { types: ["meetup", "workshop", "hackathon"] }, constraints: { minAttendance: 30 }, briefTemplate: { sections: ["Objectif", "Lieu", "Programme", "Budget", "KPIs"] }, qcCriteria: { satisfactionMin: 8 }, pillarPriority: { primary: "E", secondary: "A" } },
  ];

  for (const d of driverData) {
    await prisma.driver.upsert({
      where: { id: d.id },
      update: {},
      create: { id: d.id, strategyId: strategy.id, channel: d.channel, channelType: d.channelType, name: d.name, formatSpecs: d.formatSpecs as Prisma.InputJsonValue, constraints: d.constraints as Prisma.InputJsonValue, briefTemplate: d.briefTemplate as Prisma.InputJsonValue, qcCriteria: d.qcCriteria as Prisma.InputJsonValue, pillarPriority: d.pillarPriority as Prisma.InputJsonValue },
    });
  }
  track("Driver", driverData.length);
  console.log(`[OK] ${driverData.length} Drivers seeded`);

  // ================================================================
  // 6. DEVOTION SNAPSHOTS (2)
  // ================================================================
  await prisma.devotionSnapshot.create({
    data: { strategyId: strategy.id, spectateur: 0.30, interesse: 0.22, participant: 0.25, engage: 0.13, ambassadeur: 0.07, evangeliste: 0.03, devotionScore: 45.8, trigger: "seed_baseline", measuredAt: new Date("2025-01-15") },
  });
  await prisma.devotionSnapshot.create({
    data: { strategyId: strategy.id, spectateur: 0.25, interesse: 0.20, participant: 0.27, engage: 0.15, ambassadeur: 0.09, evangeliste: 0.04, devotionScore: 52.3, trigger: "seed_current", measuredAt: new Date("2025-03-01") },
  });
  track("DevotionSnapshot", 2);
  console.log("[OK] 2 DevotionSnapshots seeded");

  // ================================================================
  // 7. CULT INDEX SNAPSHOTS (2)
  // ================================================================
  await prisma.cultIndexSnapshot.create({
    data: { strategyId: strategy.id, engagementDepth: 55, superfanVelocity: 35, communityCohesion: 62, brandDefenseRate: 48, ugcGenerationRate: 22, ritualAdoption: 30, evangelismScore: 28, compositeScore: 42.5, tier: "EMERGING", measuredAt: new Date("2025-01-15") },
  });
  await prisma.cultIndexSnapshot.create({
    data: { strategyId: strategy.id, engagementDepth: 65, superfanVelocity: 42, communityCohesion: 70, brandDefenseRate: 55, ugcGenerationRate: 30, ritualAdoption: 38, evangelismScore: 35, compositeScore: 50.2, tier: "EMERGING", measuredAt: new Date("2025-03-01") },
  });
  track("CultIndexSnapshot", 2);
  console.log("[OK] 2 CultIndexSnapshots seeded");

  // ================================================================
  // 8. SCORE SNAPSHOTS (3)
  // ================================================================
  await prisma.scoreSnapshot.create({
    data: { strategyId: strategy.id, advertis_vector: { a: 18.0, d: 16.0, v: 14.5, e: 19.0, r: 13.0, t: 15.5, i: 12.0, s: 17.0, composite: 125.0 } as Prisma.InputJsonValue, classification: "FORTE", confidence: 0.72, trigger: "baseline_60d", measuredAt: new Date("2025-01-01") },
  });
  await prisma.scoreSnapshot.create({
    data: { strategyId: strategy.id, advertis_vector: { a: 19.5, d: 17.5, v: 16.0, e: 20.5, r: 14.5, t: 17.0, i: 13.5, s: 18.5, composite: 137.0 } as Prisma.InputJsonValue, classification: "FORTE", confidence: 0.78, trigger: "monthly_30d", measuredAt: new Date("2025-02-01") },
  });
  await prisma.scoreSnapshot.create({
    data: { strategyId: strategy.id, advertis_vector: { a: 21.0, d: 19.5, v: 17.8, e: 22.3, r: 16.0, t: 18.5, i: 15.2, s: 20.0, composite: 150.3 } as Prisma.InputJsonValue, classification: "REMARQUABLE", confidence: 0.85, trigger: "current", measuredAt: new Date("2025-03-01") },
  });
  track("ScoreSnapshot", 3);
  console.log("[OK] 3 ScoreSnapshots seeded");

  // ================================================================
  // 9. CAMPAIGNS (2)
  // ================================================================
  const campaignLive = await prisma.campaign.upsert({
    where: { id: "njangi-campaign-launch" },
    update: {},
    create: {
      id: "njangi-campaign-launch",
      name: "Lancement NJANGI v2 — Tontine Sans Friction",
      strategyId: strategy.id,
      state: "LIVE",
      status: "LIVE",
      budget: 25000000,
      startDate: new Date("2025-02-01"),
      endDate: new Date("2025-04-30"),
      objectives: { primary: "Atteindre 20K MAU", secondary: "65% conversion Free → Premium", tertiary: "k-factor > 1.3" } as Prisma.InputJsonValue,
      advertis_vector: { a: 20, e: 22, d: 18, v: 16 } as Prisma.InputJsonValue,
      aarrTargets: { acquisition: 20000, activation: 12000, retention: 8000, revenue: 3000, referral: 5000 } as Prisma.InputJsonValue,
    },
  });
  track("Campaign");

  const campaignPlanning = await prisma.campaign.upsert({
    where: { id: "njangi-campaign-diaspora" },
    update: {},
    create: {
      id: "njangi-campaign-diaspora",
      name: "Campagne Diaspora — Mon Cercle, Ma Force",
      strategyId: strategy.id,
      state: "PLANNING",
      status: "PLANNING",
      budget: 15000000,
      startDate: new Date("2025-05-01"),
      endDate: new Date("2025-07-31"),
      objectives: { primary: "10K utilisateurs diaspora", secondary: "Partenariats communautaires Europe" } as Prisma.InputJsonValue,
      advertis_vector: { a: 21, e: 20, d: 19 } as Prisma.InputJsonValue,
    },
  });
  track("Campaign");
  console.log("[OK] 2 Campaigns seeded (LIVE + PLANNING)");

  // ================================================================
  // 10. CAMPAIGN ACTIONS (5+)
  // ================================================================
  const action1 = await prisma.campaignAction.create({
    data: { id: "njangi-action-tiktok", campaignId: campaignLive.id, name: "TikTok 'Mon Premier Tour' — 10 createurs", category: "BTL", actionType: "influencer-ugc", budget: 3000000, startDate: new Date("2025-02-15"), endDate: new Date("2025-03-15"), status: "COMPLETED", kpis: { templates: ["views", "app_downloads", "engagement_rate"] } as Prisma.InputJsonValue },
  });
  const action2 = await prisma.campaignAction.create({
    data: { id: "njangi-action-insta-ads", campaignId: campaignLive.id, name: "Instagram Ads — Awareness + App Install", category: "TTL", actionType: "paid-social-install", budget: 5000000, startDate: new Date("2025-02-01"), status: "IN_PROGRESS", kpis: { templates: ["installs", "cpi", "ctr"] } as Prisma.InputJsonValue },
  });
  await prisma.campaignAction.create({
    data: { id: "njangi-action-meetup-dla", campaignId: campaignLive.id, name: "NJANGI Meetup Douala — Demo & Onboarding", category: "BTL", actionType: "event-meetup", budget: 2000000, startDate: new Date("2025-03-15"), status: "PLANNED", kpis: { templates: ["attendees", "signups", "groups_created"] } as Prisma.InputJsonValue },
  });
  await prisma.campaignAction.create({
    data: { id: "njangi-action-pr-launch", campaignId: campaignLive.id, name: "Communique de presse — Lancement v2", category: "ATL", actionType: "press-release", budget: 500000, startDate: new Date("2025-02-01"), status: "COMPLETED", kpis: { templates: ["media_pickups", "reach"] } as Prisma.InputJsonValue },
  });
  await prisma.campaignAction.create({
    data: { id: "njangi-action-radio-spot", campaignId: campaignLive.id, name: "Spot radio FM Douala — 'Ensemble on epargne mieux'", category: "ATL", actionType: "radio-spot-30s", budget: 4000000, startDate: new Date("2025-02-15"), endDate: new Date("2025-04-15"), status: "IN_PROGRESS", kpis: { templates: ["reach", "grp"] } as Prisma.InputJsonValue },
  });
  track("CampaignAction", 5);
  console.log("[OK] 5 CampaignActions seeded");

  // ================================================================
  // 11. CAMPAIGN EXECUTIONS (3)
  // ================================================================
  await prisma.campaignExecution.create({
    data: { actionId: action1.id, campaignId: campaignLive.id, title: "Video TikTok — Createur @AfroFinance", productionState: "TERMINE", dueDate: new Date("2025-02-20"), deliverableUrl: "/assets/njangi-tiktok-afrofinance.mp4" },
  });
  await prisma.campaignExecution.create({
    data: { actionId: action1.id, campaignId: campaignLive.id, title: "Video TikTok — Creatrice @MamanEpargne", productionState: "LIVRAISON", dueDate: new Date("2025-02-25") },
  });
  await prisma.campaignExecution.create({
    data: { actionId: action2.id, campaignId: campaignLive.id, title: "Visuel Instagram — Carousel 'Comment ca marche'", productionState: "EN_PRODUCTION", dueDate: new Date("2025-03-10") },
  });
  track("CampaignExecution", 3);
  console.log("[OK] 3 CampaignExecutions seeded");

  // ================================================================
  // 12. CAMPAIGN AMPLIFICATIONS (2)
  // ================================================================
  await prisma.campaignAmplification.create({
    data: { campaignId: campaignLive.id, platform: "INSTAGRAM", budget: 3000000, impressions: 450000, clicks: 12000, conversions: 2800, cpa: 1071, roas: 3.2, status: "ACTIVE", startDate: new Date("2025-02-01"), metrics: { spend_to_date: 2100000, daily_budget: 100000 } as Prisma.InputJsonValue },
  });
  await prisma.campaignAmplification.create({
    data: { campaignId: campaignLive.id, platform: "TIKTOK", budget: 2000000, impressions: 800000, clicks: 25000, conversions: 4500, cpa: 444, roas: 5.1, status: "ACTIVE", startDate: new Date("2025-02-15"), metrics: { spend_to_date: 1500000, viral_coefficient: 1.8 } as Prisma.InputJsonValue },
  });
  track("CampaignAmplification", 2);
  console.log("[OK] 2 CampaignAmplifications seeded");

  // ================================================================
  // 13. CAMPAIGN TEAM MEMBERS (3)
  // ================================================================
  await prisma.campaignTeamMember.create({
    data: { campaignId: campaignLive.id, userId: admin.id, role: "STRATEGIC_PLANNER" },
  });
  await prisma.campaignTeamMember.create({
    data: { campaignId: campaignLive.id, userId: njangiClient.id, role: "CLIENT" },
  });
  await prisma.campaignTeamMember.create({
    data: { campaignId: campaignLive.id, userId: njangiBrandManager.id, role: "ACCOUNT_MANAGER" },
  });
  track("CampaignTeamMember", 3);
  console.log("[OK] 3 CampaignTeamMembers seeded");

  // ================================================================
  // 14. CAMPAIGN MILESTONES (4)
  // ================================================================
  await prisma.campaignMilestone.create({ data: { campaignId: campaignLive.id, title: "Brief valide", dueDate: new Date("2025-01-25"), completed: true, completedAt: new Date("2025-01-24") } });
  await prisma.campaignMilestone.create({ data: { campaignId: campaignLive.id, title: "Createurs TikTok briefes", dueDate: new Date("2025-02-10"), completed: true, completedAt: new Date("2025-02-08") } });
  await prisma.campaignMilestone.create({ data: { campaignId: campaignLive.id, title: "10K MAU atteints", dueDate: new Date("2025-03-15"), completed: false } });
  await prisma.campaignMilestone.create({ data: { campaignId: campaignLive.id, title: "Post-campaign report", dueDate: new Date("2025-05-15"), completed: false } });
  track("CampaignMilestone", 4);
  console.log("[OK] 4 CampaignMilestones seeded");

  // ================================================================
  // 15. CAMPAIGN APPROVALS (2)
  // ================================================================
  await prisma.campaignApproval.create({
    data: { campaignId: campaignLive.id, approverId: njangiClient.id, fromState: "BRIEF_DRAFT", toState: "BRIEF_VALIDATED", status: "APPROVED", comment: "Brief excellent. Go for launch.", decidedAt: new Date("2025-01-25") },
  });
  await prisma.campaignApproval.create({
    data: { campaignId: campaignPlanning.id, approverId: njangiClient.id, fromState: "BRIEF_DRAFT", toState: "PLANNING", status: "PENDING", comment: null },
  });
  track("CampaignApproval", 2);
  console.log("[OK] 2 CampaignApprovals seeded");

  // ================================================================
  // 16. CAMPAIGN ASSETS (3)
  // ================================================================
  await prisma.campaignAsset.create({ data: { campaignId: campaignLive.id, name: "Brand Kit NJANGI v2", fileUrl: "/assets/njangi-brand-kit-v2.zip", mimeType: "application/zip", fileSize: 15000000, category: "BRAND_KIT", pillarTags: ["D"] as Prisma.InputJsonValue } });
  await prisma.campaignAsset.create({ data: { campaignId: campaignLive.id, name: "Script TikTok Mon Premier Tour", fileUrl: "/assets/njangi-tiktok-script.pdf", mimeType: "application/pdf", fileSize: 250000, category: "SCRIPT", pillarTags: ["A", "E"] as Prisma.InputJsonValue } });
  await prisma.campaignAsset.create({ data: { campaignId: campaignLive.id, name: "Visuel Instagram — Carousel", fileUrl: "/assets/njangi-carousel-v1.psd", mimeType: "image/vnd.adobe.photoshop", fileSize: 8000000, category: "CREATIVE", pillarTags: ["D", "V"] as Prisma.InputJsonValue } });
  track("CampaignAsset", 3);
  console.log("[OK] 3 CampaignAssets seeded");

  // ================================================================
  // 17. CAMPAIGN BRIEFS (2)
  // ================================================================
  await prisma.campaignBrief.create({
    data: { campaignId: campaignLive.id, title: "Brief Creatif — TikTok Mon Premier Tour", content: { objective: "Generer 500K vues et 2000 telechargements", target: "18-35 ans, urbains + diaspora", message: "La tontine c'est pas ringard, c'est revolutionnaire", tone: "Fun, educatif, communautaire", deliverables: ["10 videos TikTok", "5 duets", "1 hashtag challenge"] } as Prisma.InputJsonValue, targetDriver: "TIKTOK", status: "APPROVED" },
  });
  await prisma.campaignBrief.create({
    data: { campaignId: campaignPlanning.id, title: "Brief Strategique — Campagne Diaspora", content: { objective: "Recruter 10K utilisateurs diaspora en 3 mois", target: "Camerounais en Europe (France, Belgique, Allemagne)", message: "Restez connectes a votre cercle, ou que vous soyez", channels: ["Instagram", "TikTok", "Events Paris/Bruxelles"] } as Prisma.InputJsonValue, targetDriver: "INSTAGRAM", status: "DRAFT" },
  });
  track("CampaignBrief", 2);
  console.log("[OK] 2 CampaignBriefs seeded");

  // ================================================================
  // 18. CAMPAIGN REPORT (1)
  // ================================================================
  await prisma.campaignReport.create({
    data: { campaignId: campaignLive.id, title: "Rapport Mensuel Fevrier 2025", reportType: "MONTHLY", data: { mau: 12500, newUsers: 4200, premiumConversions: 680, revenue: 1700000, topChannel: "TikTok", engagement: 8.5 } as Prisma.InputJsonValue, summary: "Forte croissance organique portee par TikTok. k-factor a 1.4. Conversion Free→Premium a 62%." },
  });
  track("CampaignReport");
  console.log("[OK] 1 CampaignReport seeded");

  // ================================================================
  // 19. CAMPAIGN DEPENDENCY (1)
  // ================================================================
  await prisma.campaignDependency.create({
    data: { sourceId: campaignLive.id, targetId: campaignPlanning.id, depType: "INFORMS" },
  });
  track("CampaignDependency");
  console.log("[OK] 1 CampaignDependency seeded");

  // ================================================================
  // 20. CAMPAIGN FIELD OP + FIELD REPORT
  // ================================================================
  const fieldOp = await prisma.campaignFieldOp.create({
    data: { campaignId: campaignLive.id, name: "NJANGI Meetup Douala — Akwa", location: "Coworking Activspaces, Douala", date: new Date("2025-03-15"), status: "COMPLETED", teamSize: 5, budget: 500000, results: { attendees: 85, groupsCreated: 22, premiumSignups: 15 } as Prisma.InputJsonValue },
  });
  track("CampaignFieldOp");

  await prisma.campaignFieldReport.create({
    data: { fieldOpId: fieldOp.id, campaignId: campaignLive.id, reporterName: "Fabrice Eyidi", data: { summary: "Excellent turnout. 85 participants, majoritairement 25-35 ans. 22 nouveaux groupes crees sur place. Le demo live a convaincu les sceptiques.", feedback: "Besoin de plus de phones de demo pour l'onboarding en live.", nextSteps: "Planifier Yaounde pour avril." } as Prisma.InputJsonValue, photos: ["/photos/meetup-dla-01.jpg", "/photos/meetup-dla-02.jpg"] as Prisma.InputJsonValue },
  });
  track("CampaignFieldReport");
  console.log("[OK] 1 CampaignFieldOp + 1 CampaignFieldReport seeded");

  // ================================================================
  // 21. CAMPAIGN AARR METRICS (5)
  // ================================================================
  await prisma.campaignAARRMetric.create({ data: { campaignId: campaignLive.id, stage: "ACQUISITION", metric: "app_downloads", value: 18500, target: 20000, period: "2025-Q1" } });
  await prisma.campaignAARRMetric.create({ data: { campaignId: campaignLive.id, stage: "ACTIVATION", metric: "first_tontine_joined", value: 11200, target: 12000, period: "2025-Q1" } });
  await prisma.campaignAARRMetric.create({ data: { campaignId: campaignLive.id, stage: "RETENTION", metric: "mau_30d", value: 8500, target: 10000, period: "2025-Q1" } });
  await prisma.campaignAARRMetric.create({ data: { campaignId: campaignLive.id, stage: "REVENUE", metric: "premium_subscribers", value: 2800, target: 3000, period: "2025-Q1" } });
  await prisma.campaignAARRMetric.create({ data: { campaignId: campaignLive.id, stage: "REFERRAL", metric: "groups_from_referral", value: 3200, target: 5000, period: "2025-Q1" } });
  track("CampaignAARRMetric", 5);
  console.log("[OK] 5 CampaignAARRMetrics seeded");

  // ================================================================
  // 22. MISSIONS (4)
  // ================================================================
  const mission1 = await prisma.mission.upsert({
    where: { id: "njangi-mission-tiktok-content" },
    update: {},
    create: { id: "njangi-mission-tiktok-content", title: "Creation 10 videos TikTok 'Mon Premier Tour'", strategyId: strategy.id, campaignId: campaignLive.id, driverId: "njangi-driver-tiktok", mode: "DISPATCH", status: "COMPLETED", advertis_vector: { a: 20, e: 22 } as Prisma.InputJsonValue, slaDeadline: new Date("2025-03-01"), budget: 1500000 },
  });
  const mission2 = await prisma.mission.upsert({
    where: { id: "njangi-mission-instagram-carousel" },
    update: {},
    create: { id: "njangi-mission-instagram-carousel", title: "Carousel Instagram 'Comment ca marche NJANGI'", strategyId: strategy.id, campaignId: campaignLive.id, driverId: "njangi-driver-instagram", mode: "COLLABORATIF", status: "IN_PROGRESS", advertis_vector: { d: 18, v: 16 } as Prisma.InputJsonValue, slaDeadline: new Date("2025-03-20"), budget: 300000 },
  });
  const mission3 = await prisma.mission.upsert({
    where: { id: "njangi-mission-brand-guidelines" },
    update: {},
    create: { id: "njangi-mission-brand-guidelines", title: "Brand Guidelines NJANGI v2", strategyId: strategy.id, driverId: "njangi-driver-website", mode: "COLLABORATIF", status: "REVIEW", advertis_vector: { d: 20, s: 18 } as Prisma.InputJsonValue, slaDeadline: new Date("2025-03-25"), budget: 500000 },
  });
  await prisma.mission.upsert({
    where: { id: "njangi-mission-landing-page" },
    update: {},
    create: { id: "njangi-mission-landing-page", title: "Redesign Landing Page njangi.cm", strategyId: strategy.id, driverId: "njangi-driver-website", mode: "DISPATCH", status: "DRAFT", advertis_vector: { v: 17, d: 19 } as Prisma.InputJsonValue, slaDeadline: new Date("2025-04-15"), budget: 800000 },
  });
  track("Mission", 4);
  console.log("[OK] 4 Missions seeded");

  // ================================================================
  // 23. MISSION DELIVERABLES (3)
  // ================================================================
  const deliverable1 = await prisma.missionDeliverable.create({
    data: { id: "njangi-del-tiktok-pack", missionId: mission1.id, title: "Pack 10 Videos TikTok (montees + sous-titrees)", fileUrl: "/deliverables/njangi-tiktok-pack-v1.zip", status: "ACCEPTED" },
  });
  const deliverable2 = await prisma.missionDeliverable.create({
    data: { id: "njangi-del-carousel", missionId: mission2.id, title: "Carousel Instagram 5 slides", status: "PENDING" },
  });
  const deliverable3 = await prisma.missionDeliverable.create({
    data: { id: "njangi-del-guidelines", missionId: mission3.id, title: "Document Brand Guidelines 40 pages", fileUrl: "/deliverables/njangi-guidelines-v2-draft.pdf", status: "REVISION" },
  });
  track("MissionDeliverable", 3);
  console.log("[OK] 3 MissionDeliverables seeded");

  // ================================================================
  // 24. QUALITY REVIEWS (2)
  // ================================================================
  await prisma.qualityReview.create({
    data: { deliverableId: deliverable1.id, reviewerId: admin.id, verdict: "ACCEPTED", pillarScores: { A: 9, D: 8.5, E: 9.5 } as Prisma.InputJsonValue, overallScore: 9.0, feedback: "Excellent travail. Les videos sont authentiques, le ton est parfait pour TikTok. Le hook des 3 premieres secondes est accrocheur.", reviewType: "FIXER" },
  });
  await prisma.qualityReview.create({
    data: { deliverableId: deliverable3.id, reviewerId: admin.id, verdict: "MINOR_REVISION", pillarScores: { D: 8, S: 7.5 } as Prisma.InputJsonValue, overallScore: 7.8, feedback: "Tres bon document mais il manque la section 'Ton de voix' et les exemples de do/don't pour les reseaux sociaux.", reviewType: "PEER" },
  });
  track("QualityReview", 2);
  console.log("[OK] 2 QualityReviews seeded");

  // ================================================================
  // 25. DELIVERABLE TRACKING (2)
  // ================================================================
  await prisma.deliverableTracking.create({
    data: { deliverableId: deliverable1.id, expectedSignals: ["views_500k", "downloads_2000", "engagement_rate_8"] as Prisma.InputJsonValue, receivedSignals: ["views_500k", "downloads_2000"] as Prisma.InputJsonValue, pillarImpact: { E: 0.15, A: 0.10 } as Prisma.InputJsonValue, status: "PARTIAL", expiresAt: new Date("2025-04-30") },
  });
  await prisma.deliverableTracking.create({
    data: { deliverableId: deliverable2.id, expectedSignals: ["reach_50k", "saves_500"] as Prisma.InputJsonValue, receivedSignals: [] as Prisma.InputJsonValue, status: "AWAITING_SIGNALS", expiresAt: new Date("2025-05-30") },
  });
  track("DeliverableTracking", 2);
  console.log("[OK] 2 DeliverableTrackings seeded");

  // ================================================================
  // 26. TALENT PROFILES (3) — reuse existing talent users
  // ================================================================
  const marcUser = await prisma.user.findUnique({ where: { email: "marc@freelance.cm" } });
  const sarahUser = await prisma.user.findUnique({ where: { email: "sarah@freelance.cm" } });
  const paulUser = await prisma.user.findUnique({ where: { email: "paul@freelance.cm" } });

  // Talent profiles exist from main seed; add NJANGI-relevant portfolio items + certs
  // IMPORTANT: PortfolioItem, TalentCertification, TalentReview, Membership reference TalentProfile.id (NOT User.id)
  const marcProfile = marcUser ? await prisma.talentProfile.findUnique({ where: { userId: marcUser.id } }) : null;
  const sarahProfile = sarahUser ? await prisma.talentProfile.findUnique({ where: { userId: sarahUser.id } }) : null;

  if (marcProfile) {
    await prisma.portfolioItem.create({
      data: { talentProfileId: marcProfile.id, title: "Brand Kit NJANGI v2 — Identite visuelle complete", description: "Creation de l'identite visuelle NJANGI : logo, palette, typographie, iconographie afro-futuriste.", pillarTags: ["D"] as Prisma.InputJsonValue, fileUrl: "/portfolio/marc-njangi-brandkit.pdf" },
    });
    await prisma.portfolioItem.create({
      data: { talentProfileId: marcProfile.id, title: "Carousel Instagram NJANGI — Comment ca marche", description: "Design de carousel 5 slides pour expliquer le fonctionnement de NJANGI.", pillarTags: ["D", "V"] as Prisma.InputJsonValue, fileUrl: "/portfolio/marc-njangi-carousel.jpg" },
    });
    track("PortfolioItem", 2);

    await prisma.talentCertification.create({
      data: { talentProfileId: marcProfile.id, name: "Certification ADVE — Design & Distinction", category: "ADVE", issuedAt: new Date("2025-01-15"), expiresAt: new Date("2026-01-15"), metadata: { pillarFocus: "D", score: 92 } as Prisma.InputJsonValue },
    });
    await prisma.talentCertification.create({
      data: { talentProfileId: marcProfile.id, name: "Certification Fintech Visual Design", category: "INDUSTRY", issuedAt: new Date("2024-09-01"), metadata: { provider: "Figma Academy" } as Prisma.InputJsonValue },
    });
    track("TalentCertification", 2);
  }

  if (sarahProfile) {
    await prisma.talentReview.create({
      data: { talentProfileId: sarahProfile.id, reviewerId: admin.id, period: "2025-Q1", overallScore: 8.2, strengths: ["Excellent copywriting communautaire", "Comprend le pidgin et le francais litteraire", "Ponctuelle"] as Prisma.InputJsonValue, improvements: ["Ameliorer les hooks TikTok", "Plus de variation dans les CTA"] as Prisma.InputJsonValue, notes: "Sarah est une vraie asset pour les projets communautaires comme NJANGI." },
    });
    track("TalentReview");
  }
  console.log("[OK] TalentProfiles enriched (2 PortfolioItems, 2 Certs, 1 Review)");

  // ================================================================
  // 27. MEMBERSHIP (1)
  // ================================================================
  if (marcProfile) {
    await prisma.membership.create({
      data: { talentProfileId: marcProfile.id, tier: "MAITRE", amount: 25000, currency: "XAF", status: "ACTIVE", currentPeriodStart: new Date("2025-01-01"), currentPeriodEnd: new Date("2025-03-31") },
    });
    track("Membership");
    console.log("[OK] 1 Membership seeded");
  }

  // ================================================================
  // 28. COMMISSIONS (2)
  // ================================================================
  if (marcUser) {
    await prisma.commission.create({
      data: { missionId: mission1.id, talentId: marcUser.id, grossAmount: 500000, commissionRate: 0.70, commissionAmount: 150000, netAmount: 350000, currency: "XAF", status: "PAID", paidAt: new Date("2025-03-05"), tierAtTime: "MAITRE", operatorFee: 15000 },
    });
    track("Commission");
  }
  if (sarahUser) {
    await prisma.commission.create({
      data: { missionId: mission2.id, talentId: sarahUser.id, grossAmount: 200000, commissionRate: 0.65, commissionAmount: 70000, netAmount: 130000, currency: "XAF", status: "PENDING", tierAtTime: "COMPAGNON", operatorFee: 7000 },
    });
    track("Commission");
  }
  console.log("[OK] 2 Commissions seeded (1 PAID, 1 PENDING)");

  // ================================================================
  // 29. GUILD ORGANIZATION METRIC (1)
  // ================================================================
  // First find or create a guild org
  const guildOrg = await prisma.guildOrganization.upsert({
    where: { id: "njangi-guild-org" },
    update: {},
    create: { id: "njangi-guild-org", name: "Guilde Createurs Fintech", description: "Collectif de createurs specialises en fintech et branding digital africain.", tier: "COMPAGNON", totalMissions: 12, firstPassRate: 0.78, avgQcScore: 8.1, specializations: ["fintech", "mobile-first", "afro-design"] as Prisma.InputJsonValue },
  });
  await prisma.guildOrganizationMetric.create({
    data: { guildOrganizationId: guildOrg.id, period: "2025-Q1", totalMissions: 12, completedMissions: 9, avgQcScore: 8.1, firstPassRate: 0.78, revenue: 2500000 },
  });
  track("GuildOrganizationMetric");
  console.log("[OK] 1 GuildOrganizationMetric seeded");

  // ================================================================
  // 30. BRAND VARIABLES (38+)
  // ================================================================
  const brandVars = [
    { key: "brand_name", value: "NJANGI", category: "identity" },
    { key: "brand_tagline", value: "La tontine digitale qui libere l'epargne africaine.", category: "identity" },
    { key: "brand_baseline", value: "Ensemble, on epargne mieux.", category: "identity" },
    { key: "brand_archetype_primary", value: "REBELLE", category: "identity" },
    { key: "brand_archetype_secondary", value: "MAGICIEN", category: "identity" },
    { key: "brand_color_primary", value: "#7C3AED", category: "visual" },
    { key: "brand_color_secondary", value: "#F59E0B", category: "visual" },
    { key: "brand_color_accent", value: "#10B981", category: "visual" },
    { key: "brand_color_background", value: "#1F0A3C", category: "visual" },
    { key: "brand_font_primary", value: "Space Grotesk Bold", category: "visual" },
    { key: "brand_font_secondary", value: "Inter", category: "visual" },
    { key: "brand_visual_style", value: "Afro-futuriste. Violet profond + or. Motifs geometriques inspires de l'art camerounais. Illustrations flat design avec visages africains.", category: "visual" },
    { key: "brand_tone_adjectives", value: JSON.stringify(["audacieux", "chaleureux", "moderne", "communautaire", "transparent", "rebelle", "inclusif"]), category: "voice" },
    { key: "brand_on_dit", value: JSON.stringify(["Ensemble, on epargne mieux", "Ton cercle, ta force", "Zero cahier, zero stress"]), category: "voice" },
    { key: "brand_on_ne_dit_pas", value: JSON.stringify(["C'est comme une banque", "Fini la tontine traditionnelle", "Abandonnez vos habitudes"]), category: "voice" },
    { key: "brand_language_pidgin", value: "true", category: "voice" },
    { key: "target_primary_persona", value: "Kevin, 28 ans, developpeur diaspora (Paris)", category: "audience" },
    { key: "target_secondary_persona", value: "Maman Rose, 45 ans, bayam-sellam Mokolo", category: "audience" },
    { key: "target_tertiary_persona", value: "Dr. Tchoupo, 38 ans, cadre superieur (Yaounde)", category: "audience" },
    { key: "target_age_range", value: "22-55", category: "audience" },
    { key: "positioning_statement", value: "Pour les Camerounais et la diaspora, NJANGI est l'app qui digitalise et securise l'epargne communautaire.", category: "positioning" },
    { key: "competitive_advantage_1", value: "Seule app 100% concue pour la tontine", category: "positioning" },
    { key: "competitive_advantage_2", value: "Score de Confiance pour chaque membre", category: "positioning" },
    { key: "competitive_advantage_3", value: "Diaspora-native (fonctionne depuis l'etranger)", category: "positioning" },
    { key: "promise_master", value: "La seule app qui comprend la tontine.", category: "value" },
    { key: "product_free", value: "NJANGI Free — 0 FCFA (1 tontine, 10 membres)", category: "value" },
    { key: "product_premium", value: "NJANGI Premium — 2 500 FCFA/mois (illimite)", category: "value" },
    { key: "product_business", value: "NJANGI Business — 10 000 FCFA/mois (API + marque blanche)", category: "value" },
    { key: "cac", value: "3500", category: "economics" },
    { key: "ltv", value: "45000", category: "economics" },
    { key: "ltv_cac_ratio", value: "12.8", category: "economics" },
    { key: "budget_com_annual", value: "50000000", category: "economics" },
    { key: "ca_vise_annual", value: "1200000000", category: "economics" },
    { key: "arpu_monthly", value: "2500", category: "economics" },
    { key: "tam", value: "1500000000000", category: "market" },
    { key: "sam", value: "250000000000", category: "market" },
    { key: "som", value: "12000000000", category: "market" },
    { key: "cult_index_current", value: "50.2", category: "engagement" },
    { key: "cult_tier", value: "EMERGING", category: "engagement" },
    { key: "devotion_score", value: "52.3", category: "engagement" },
    { key: "nps_target", value: "65", category: "engagement" },
    { key: "k_factor", value: "1.5", category: "engagement" },
    { key: "risk_score", value: "38", category: "risk" },
    { key: "brand_market_fit", value: "85", category: "market" },
    { key: "coherence_score", value: "78", category: "strategy" },
  ];

  for (const v of brandVars) {
    await prisma.brandVariable.upsert({
      where: { strategyId_key: { strategyId: strategy.id, key: v.key } },
      update: { value: v.value as Prisma.InputJsonValue },
      create: { strategyId: strategy.id, key: v.key, value: v.value as Prisma.InputJsonValue, category: v.category },
    });
  }
  track("BrandVariable", brandVars.length);
  console.log(`[OK] ${brandVars.length} BrandVariables seeded`);

  // ================================================================
  // 31. VARIABLE STORE CONFIG
  // ================================================================
  await prisma.variableStoreConfig.upsert({
    where: { strategyId: strategy.id },
    update: {},
    create: { strategyId: strategy.id, stalenessThresholdDays: 14, autoRecalculate: true, propagationRules: { cascadeOnPillarUpdate: true, notifyOnDrift: true, recalculateScoreOnChange: true } as Prisma.InputJsonValue },
  });
  track("VariableStoreConfig");
  console.log("[OK] VariableStoreConfig seeded");

  // ================================================================
  // 32. BRAND OS CONFIG
  // ================================================================
  await prisma.brandOSConfig.upsert({
    where: { strategyId: strategy.id },
    update: {},
    create: {
      strategyId: strategy.id,
      viewMode: "MARKETING",
      config: { defaultTab: "overview", showDevotionLadder: true, showCultIndex: true, showRadar: true, showTimeline: true, currency: "XAF", language: "fr", dateFormat: "DD/MM/YYYY" } as Prisma.InputJsonValue,
      theme: { primaryColor: "#7C3AED", accentColor: "#F59E0B", darkMode: true } as Prisma.InputJsonValue,
    },
  });
  track("BrandOSConfig");
  console.log("[OK] BrandOSConfig seeded");

  // ================================================================
  // 33. VARIABLE HISTORY (2)
  // ================================================================
  const nameVar = await prisma.brandVariable.findUnique({ where: { strategyId_key: { strategyId: strategy.id, key: "brand_tagline" } } });
  if (nameVar) {
    await prisma.variableHistory.create({
      data: { variableId: nameVar.id, oldValue: "L'epargne communautaire, reinventee." as unknown as Prisma.InputJsonValue, newValue: "La tontine digitale qui libere l'epargne africaine." as unknown as Prisma.InputJsonValue, changedBy: admin.id, reason: "Rebranding v2 — plus percutant et specifique au marche africain" },
    });
    await prisma.variableHistory.create({
      data: { variableId: nameVar.id, oldValue: "Njangi — Ton epargne, ton cercle." as unknown as Prisma.InputJsonValue, newValue: "L'epargne communautaire, reinventee." as unknown as Prisma.InputJsonValue, changedBy: admin.id, reason: "Pivot de message : focus sur la dimension communautaire" },
    });
    track("VariableHistory", 2);
  }
  console.log("[OK] 2 VariableHistory entries seeded");

  // ================================================================
  // 34. SUPERFAN PROFILES (4)
  // ================================================================
  const superfans = [
    { platform: "INSTAGRAM", handle: "@njangi_queen_dla", engagementDepth: 92, segment: "AMBASSADEUR", interactions: 312 },
    { platform: "TIKTOK", handle: "@afrofinance_cm", engagementDepth: 88, segment: "AMBASSADEUR", interactions: 245 },
    { platform: "INSTAGRAM", handle: "@diaspora_epargne", engagementDepth: 75, segment: "LEADER", interactions: 128 },
    { platform: "FACEBOOK", handle: "TontineMamanRose", engagementDepth: 60, segment: "ORGANISATEUR", interactions: 67 },
  ];
  for (const sf of superfans) {
    await prisma.superfanProfile.create({
      data: { strategyId: strategy.id, ...sf, lastActiveAt: new Date("2025-03-10") },
    });
  }
  track("SuperfanProfile", superfans.length);
  console.log(`[OK] ${superfans.length} SuperfanProfiles seeded`);

  // ================================================================
  // 35. COMMUNITY SNAPSHOTS (2)
  // ================================================================
  await prisma.communitySnapshot.create({
    data: { strategyId: strategy.id, platform: "INSTAGRAM", size: 28000, health: 0.78, sentiment: 0.85, velocity: 0.35, activeRate: 0.18, measuredAt: new Date("2025-03-01") },
  });
  await prisma.communitySnapshot.create({
    data: { strategyId: strategy.id, platform: "TIKTOK", size: 45000, health: 0.82, sentiment: 0.88, velocity: 0.52, activeRate: 0.25, measuredAt: new Date("2025-03-01") },
  });
  track("CommunitySnapshot", 2);
  console.log("[OK] 2 CommunitySnapshots seeded");

  // ================================================================
  // 36. SOCIAL CONNECTIONS (2)
  // ================================================================
  const socialInsta = await prisma.socialConnection.create({
    data: { strategyId: strategy.id, userId: njangiBrandManager.id, platform: "INSTAGRAM", accountId: "njangi_cm", accountName: "NJANGI - Tontine Digitale", status: "ACTIVE" },
  });
  const socialTiktok = await prisma.socialConnection.create({
    data: { strategyId: strategy.id, userId: njangiBrandManager.id, platform: "TIKTOK", accountId: "njangi_official", accountName: "NJANGI", status: "ACTIVE" },
  });
  track("SocialConnection", 2);
  console.log("[OK] 2 SocialConnections seeded");

  // ================================================================
  // 37. SOCIAL POSTS (4)
  // ================================================================
  await prisma.socialPost.create({ data: { connectionId: socialInsta.id, strategyId: strategy.id, externalPostId: "ig_njangi_001", content: "Ton cercle, ta force. Rejoins 15 000 groupes qui epargnent ensemble sur NJANGI.", publishedAt: new Date("2025-03-01"), likes: 1250, comments: 89, shares: 45, reach: 35000, engagementRate: 8.2, sentiment: 0.92, pillarTags: ["E", "A"] as Prisma.InputJsonValue } });
  await prisma.socialPost.create({ data: { connectionId: socialInsta.id, strategyId: strategy.id, externalPostId: "ig_njangi_002", content: "Maman Rose a finance la scolarite de ses 4 enfants grace a sa tontine NJANGI. Et toi, tu epargnes pour quoi?", publishedAt: new Date("2025-03-05"), likes: 2100, comments: 156, shares: 98, reach: 52000, engagementRate: 10.5, sentiment: 0.95, pillarTags: ["A", "E"] as Prisma.InputJsonValue } });
  await prisma.socialPost.create({ data: { connectionId: socialTiktok.id, strategyId: strategy.id, externalPostId: "tt_njangi_001", content: "Mon Premier Tour sur NJANGI — regardez la reaction! #NjangiChallenge #TontineDigitale", publishedAt: new Date("2025-02-20"), likes: 8500, comments: 420, shares: 1200, reach: 180000, engagementRate: 12.8, sentiment: 0.90, pillarTags: ["E"] as Prisma.InputJsonValue } });
  await prisma.socialPost.create({ data: { connectionId: socialTiktok.id, strategyId: strategy.id, externalPostId: "tt_njangi_002", content: "Pourquoi la tontine c'est le VRAI systeme financier africain. Thread educatif.", publishedAt: new Date("2025-03-08"), likes: 5200, comments: 310, shares: 890, reach: 120000, engagementRate: 9.5, sentiment: 0.88, pillarTags: ["A", "T"] as Prisma.InputJsonValue } });
  track("SocialPost", 4);
  console.log("[OK] 4 SocialPosts seeded");

  // ================================================================
  // 38. MEDIA PLATFORM CONNECTION + PERFORMANCE SYNC
  // ================================================================
  const mediaCon = await prisma.mediaPlatformConnection.create({
    data: { strategyId: strategy.id, platform: "META_ADS", accountId: "njangi_meta_ads_001", status: "ACTIVE", lastSyncAt: new Date("2025-03-10") },
  });
  await prisma.mediaPerformanceSync.create({
    data: { connectionId: mediaCon.id, campaignRef: "njangi-campaign-launch", impressions: 450000, clicks: 12000, conversions: 2800, spend: 2100000, ctr: 2.67, cpc: 175, cpa: 750, roas: 3.2, period: "2025-02" },
  });
  track("MediaPlatformConnection");
  track("MediaPerformanceSync");
  console.log("[OK] 1 MediaPlatformConnection + 1 MediaPerformanceSync seeded");

  // ================================================================
  // 39. PRESS RELEASE + DISTRIBUTION + CLIPPING
  // ================================================================
  const pressRelease = await prisma.pressRelease.create({
    data: { strategyId: strategy.id, title: "NJANGI leve 500 millions FCFA pour digitaliser la tontine en Afrique", content: "NJANGI, la premiere application mobile de tontine digitale au Cameroun, annonce une levee de fonds de 500 millions FCFA en serie A. Cette levee permettra d'accelerer le deploiement de la plateforme en Afrique centrale et d'Ouest, avec un objectif de 1 million d'utilisateurs d'ici 2027.", status: "PUBLISHED", publishedAt: new Date("2025-02-01"), pillarTags: ["T", "R"] as Prisma.InputJsonValue },
  });
  track("PressRelease");

  // Create a media contact for distribution
  const mediaContact = await prisma.mediaContact.upsert({
    where: { email_outlet: { email: "tech@businessincameroon.com", outlet: "Business in Cameroon" } },
    update: {},
    create: { name: "Diane Mballa", email: "tech@businessincameroon.com", outlet: "Business in Cameroon", beat: "Tech & Fintech", country: "CM" },
  });

  await prisma.pressDistribution.create({
    data: { pressReleaseId: pressRelease.id, contactId: mediaContact.id, sentAt: new Date("2025-02-01"), openedAt: new Date("2025-02-01"), status: "OPENED" },
  });
  track("PressDistribution");

  await prisma.pressClipping.create({
    data: { strategyId: strategy.id, pressReleaseId: pressRelease.id, outlet: "Business in Cameroon", title: "NJANGI: la startup qui veut numeriser la tontine africaine leve 500M FCFA", url: "https://businessincameroon.com/njangi-levee-fonds", publishedAt: new Date("2025-02-03"), reach: 45000, sentiment: 0.92, pillarTags: ["T"] as Prisma.InputJsonValue },
  });
  track("PressClipping");
  console.log("[OK] 1 PressRelease + 1 PressDistribution + 1 PressClipping seeded");

  // ================================================================
  // 40. INVOICES (2)
  // ================================================================
  await prisma.invoice.create({
    data: { id: "njangi-invoice-paid", amount: 5000000, currency: "XAF", status: "PAID", recipientId: njangiClient.id, recipientType: "CLIENT", description: "Strategie ADVE NJANGI — Phase 1 (Diagnostic + Pillars)", dueDate: new Date("2025-02-15"), paidAt: new Date("2025-02-10"), paymentMethod: "MOBILE_MONEY_ORANGE", transactionRef: "OM-NJANGI-2025-001" },
  });
  await prisma.invoice.create({
    data: { id: "njangi-invoice-pending", amount: 8000000, currency: "XAF", status: "PENDING", recipientId: njangiClient.id, recipientType: "CLIENT", description: "Campagne Lancement v2 — Production + Media", dueDate: new Date("2025-04-01") },
  });
  track("Invoice", 2);
  console.log("[OK] 2 Invoices seeded (1 PAID, 1 PENDING)");

  // ================================================================
  // 41. CONTRACT (1)
  // ================================================================
  const contract = await prisma.contract.create({
    data: { id: "njangi-contract-retainer", strategyId: strategy.id, title: "Contrat Retainer UPgraders x NJANGI 2025", contractType: "RETAINER", status: "ACTIVE", startDate: new Date("2025-01-01"), endDate: new Date("2025-12-31"), value: 25000000, signedAt: new Date("2024-12-20"), terms: { monthly: 2083333, scope: "Strategie ADVE + execution campagnes + reporting mensuel", revisionClause: "Revision trimestrielle" } as Prisma.InputJsonValue },
  });
  track("Contract");
  console.log("[OK] 1 Contract seeded");

  // ================================================================
  // 42. ESCROW + ESCROW CONDITION
  // ================================================================
  const escrow = await prisma.escrow.create({
    data: { contractId: contract.id, amount: 2083333, currency: "XAF", status: "HELD", reason: "Monthly retainer Mars 2025" },
  });
  await prisma.escrowCondition.create({
    data: { escrowId: escrow.id, condition: "Livraison du Value Report Mars 2025", met: false },
  });
  track("Escrow");
  track("EscrowCondition");
  console.log("[OK] 1 Escrow + 1 EscrowCondition seeded");

  // ================================================================
  // 43. PAYMENT ORDERS (2)
  // ================================================================
  await prisma.paymentOrder.create({
    data: { amount: 350000, currency: "XAF", method: "MOBILE_MONEY_ORANGE", status: "COMPLETED", recipientPhone: "+237699123456", recipientName: "Marc Nzouankeu", transactionRef: "OM-PAY-NJANGI-001", processedAt: new Date("2025-03-05") },
  });
  await prisma.paymentOrder.create({
    data: { amount: 130000, currency: "XAF", method: "MOBILE_MONEY_MTN", status: "PENDING", recipientPhone: "+237670987654", recipientName: "Sarah Mbida" },
  });
  track("PaymentOrder", 2);
  console.log("[OK] 2 PaymentOrders seeded (1 COMPLETED, 1 PENDING)");

  // ================================================================
  // 44. DEALS (2)
  // ================================================================
  await prisma.deal.upsert({
    where: { id: "njangi-deal-won" },
    update: {},
    create: { id: "njangi-deal-won", strategyId: strategy.id, userId: admin.id, contactName: "Ariane Nkoulou Meva", contactEmail: "ceo@njangi.cm", companyName: "NJANGI", stage: "WON", value: 25000000, currency: "XAF", source: "INBOUND", wonAt: new Date("2024-12-15"), notes: "Contrat retainer annuel signe. Budget initial 25M pour 2025." },
  });
  await prisma.deal.upsert({
    where: { id: "njangi-deal-qualified" },
    update: {},
    create: { id: "njangi-deal-qualified", strategyId: strategy.id, userId: admin.id, contactName: "Fabrice Eyidi Manga", contactEmail: "marketing@njangi.cm", companyName: "NJANGI", stage: "QUALIFIED", value: 15000000, currency: "XAF", source: "UPSELL", notes: "Campagne Diaspora — budget additionnel en discussion pour Q2 2025." },
  });
  track("Deal", 2);
  console.log("[OK] 2 Deals seeded (1 WON, 1 QUALIFIED)");

  // ================================================================
  // 45. FUNNEL MAPPINGS (3)
  // ================================================================
  await prisma.funnelMapping.create({ data: { dealId: "njangi-deal-won", step: "LEAD", enteredAt: new Date("2024-10-01"), exitedAt: new Date("2024-10-15"), duration: 14 } });
  await prisma.funnelMapping.create({ data: { dealId: "njangi-deal-won", step: "QUALIFIED", enteredAt: new Date("2024-10-15"), exitedAt: new Date("2024-11-15"), duration: 31 } });
  await prisma.funnelMapping.create({ data: { dealId: "njangi-deal-won", step: "WON", enteredAt: new Date("2024-12-15") } });
  track("FunnelMapping", 3);
  console.log("[OK] 3 FunnelMappings seeded");

  // ================================================================
  // 46. MARKET STUDY + SOURCE + SYNTHESIS
  // ================================================================
  const study = await prisma.marketStudy.create({
    data: { strategyId: strategy.id, title: "Etude de marche — Tontines digitales en Afrique centrale", objective: "Evaluer la taille du marche, les comportements d'epargne communautaire, et le potentiel de digitalisation.", status: "COMPLETED", summary: "Le marche des tontines informelles en Afrique centrale represente un flux de 1 500 milliards FCFA/an. 70% des Camerounais participent a au moins une tontine. La digitalisation est demandee par 65% des 25-45 ans.", completedAt: new Date("2025-01-10") },
  });
  track("MarketStudy");

  await prisma.marketSource.create({
    data: { studyId: study.id, sourceType: "SURVEY", title: "Enquete terrain 200 participants de tontines — Douala/Yaounde", reliability: 0.85, extractedAt: new Date("2024-12-15") },
  });
  track("MarketSource");

  await prisma.marketSynthesis.create({
    data: { studyId: study.id, topic: "Potentiel de conversion digital", findings: { key_finding: "65% des 25-45 prets a migrer vers une app tontine", segment_most_likely: "Diaspora (92%)", barrier_1: "Confiance dans la tech (35%)", barrier_2: "Habitude du cahier (28%)" } as Prisma.InputJsonValue, confidence: 0.82, pillarImpact: { V: 0.20, E: 0.15 } as Prisma.InputJsonValue },
  });
  track("MarketSynthesis");
  console.log("[OK] 1 MarketStudy + 1 MarketSource + 1 MarketSynthesis seeded");

  // ================================================================
  // 47. COMPETITOR SNAPSHOTS (2)
  // ================================================================
  await prisma.competitorSnapshot.create({
    data: { sector: "FINTECH", market: "CM", name: "Orange Money", strengths: ["Base installee 8M utilisateurs", "Reseau agents physiques", "Confiance operateur"] as Prisma.InputJsonValue, weaknesses: ["Pas de tontine native", "UX generique", "Frais eleves"] as Prisma.InputJsonValue, positioning: "Le portefeuille mobile universel", estimatedScore: 110, source: "market_study" },
  });
  await prisma.competitorSnapshot.create({
    data: { sector: "FINTECH", market: "CM", name: "Wave", strengths: ["Zero frais", "UX moderne", "Croissance rapide"] as Prisma.InputJsonValue, weaknesses: ["Pas de social finance", "Pas profitable", "Presence limitee CM"] as Prisma.InputJsonValue, positioning: "Le gratuit qui disrupte", estimatedScore: 95, source: "market_study" },
  });
  track("CompetitorSnapshot", 2);
  console.log("[OK] 2 CompetitorSnapshots seeded");

  // ================================================================
  // 48. INSIGHT REPORTS (2)
  // ================================================================
  await prisma.insightReport.create({
    data: { strategyId: strategy.id, reportType: "GROWTH_ANALYSIS", title: "Analyse de croissance NJANGI Q1 2025", data: { mau_growth: "+240%", premium_conversion: "62%", top_acquisition: "TikTok (45%)", k_factor: 1.4, churn_premium: "8%" } as Prisma.InputJsonValue, summary: "Croissance explosive portee par TikTok. Le k-factor valide le modele viral. Priorite : reduire le churn Premium.", pillarImpact: { E: 0.20, V: 0.10, I: 0.15 } as Prisma.InputJsonValue },
  });
  await prisma.insightReport.create({
    data: { strategyId: strategy.id, reportType: "COMPETITIVE_INTEL", title: "Veille concurrentielle — Orange Money feature roadmap", data: { threat: "Orange Money teste un feature 'Groupes' en Cote d'Ivoire", timeline: "Possible lancement CM Q3 2025", impact: "HIGH", recommendation: "Accelerer les features communautaires differenciantes" } as Prisma.InputJsonValue, summary: "Orange Money explore le social finance. NJANGI doit renforcer son avance communautaire.", pillarImpact: { R: 0.25, T: 0.15 } as Prisma.InputJsonValue },
  });
  track("InsightReport", 2);
  console.log("[OK] 2 InsightReports seeded");

  // ================================================================
  // 49. ATTRIBUTION EVENTS (5)
  // ================================================================
  await prisma.attributionEvent.create({ data: { strategyId: strategy.id, eventType: "APP_INSTALL", source: "tiktok", medium: "organic", campaign: "mon_premier_tour", value: 0, convertedAt: new Date("2025-02-20") } });
  await prisma.attributionEvent.create({ data: { strategyId: strategy.id, eventType: "PREMIUM_SIGNUP", source: "instagram", medium: "paid", campaign: "njangi-v2-launch", value: 2500, convertedAt: new Date("2025-02-25") } });
  await prisma.attributionEvent.create({ data: { strategyId: strategy.id, eventType: "GROUP_CREATED", source: "referral", medium: "word_of_mouth", value: 0, convertedAt: new Date("2025-03-01") } });
  await prisma.attributionEvent.create({ data: { strategyId: strategy.id, eventType: "PREMIUM_SIGNUP", source: "event", medium: "meetup_douala", campaign: "njangi-meetup-dla", value: 2500, convertedAt: new Date("2025-03-15") } });
  await prisma.attributionEvent.create({ data: { strategyId: strategy.id, eventType: "BUSINESS_SIGNUP", source: "website", medium: "organic", value: 10000, convertedAt: new Date("2025-03-20") } });
  track("AttributionEvent", 5);
  console.log("[OK] 5 AttributionEvents seeded");

  // ================================================================
  // 50. COHORT SNAPSHOTS (2)
  // ================================================================
  await prisma.cohortSnapshot.create({
    data: { strategyId: strategy.id, cohortKey: "2025-01", period: "2025-01", size: 3200, retentionRate: 0.72, revenuePerUser: 1800, churnRate: 0.08, metrics: { premium_rate: 0.35, groups_per_user: 1.8 } as Prisma.InputJsonValue },
  });
  await prisma.cohortSnapshot.create({
    data: { strategyId: strategy.id, cohortKey: "2025-02", period: "2025-02", size: 5800, retentionRate: 0.78, revenuePerUser: 2100, churnRate: 0.06, metrics: { premium_rate: 0.42, groups_per_user: 2.1 } as Prisma.InputJsonValue },
  });
  track("CohortSnapshot", 2);
  console.log("[OK] 2 CohortSnapshots seeded");

  // ================================================================
  // 51. KNOWLEDGE ENTRIES (5)
  // ================================================================
  await prisma.knowledgeEntry.create({ data: { entryType: "SECTOR_BENCHMARK", sector: "FINTECH", market: "CM", data: { avgComposite: 115, topQuartile: 155, sampleSize: 6, insight: "Les fintechs camerounaises scorent en moyenne FORTE. L'Engagement (E) est naturellement eleve grace au modele communautaire." } as Prisma.InputJsonValue, successScore: 0.72, sampleSize: 6, sourceHash: "njangi-seed" } });
  await prisma.knowledgeEntry.create({ data: { entryType: "BRIEF_PATTERN", channel: "TIKTOK", data: { successRate: 0.82, bestPractices: ["Hook < 3 secondes", "Montrer le resultat avant le processus", "Sous-titres obligatoires", "Musique trending"], avgRevisions: 1.0 } as Prisma.InputJsonValue, successScore: 0.82, sampleSize: 20, sourceHash: "njangi-seed" } });
  await prisma.knowledgeEntry.create({ data: { entryType: "DIAGNOSTIC_RESULT", sector: "FINTECH", market: "CM", businessModel: "ABONNEMENT", data: { avgComposite: 150.3, pillarStrengths: ["E", "A"], pillarWeaknesses: ["R", "I"], recommendation: "Focus on risk mitigation and operational structure" } as Prisma.InputJsonValue, successScore: 0.85, sourceHash: "njangi-seed" } });
  await prisma.knowledgeEntry.create({ data: { entryType: "CREATOR_PATTERN", channel: "INSTAGRAM", data: { topCreatorTier: "MAITRE", avgFirstPassRate: 0.80, bestPillar: "D", commonRevisions: ["ton de voix", "CTA clarity"] } as Prisma.InputJsonValue, successScore: 0.75, sampleSize: 15, sourceHash: "njangi-seed" } });
  await prisma.knowledgeEntry.create({ data: { entryType: "CAMPAIGN_TEMPLATE", channel: "TIKTOK", data: { templateName: "Lancement App Fintech", actions: ["influencer-ugc", "hashtag-challenge", "paid-install"], avgBudget: 5000000, avgROAS: 4.5 } as Prisma.InputJsonValue, successScore: 0.80, sampleSize: 5, sourceHash: "njangi-seed" } });
  track("KnowledgeEntry", 5);
  console.log("[OK] 5 KnowledgeEntries seeded");

  // ================================================================
  // 52. AMBASSADOR PROGRAM + 3 MEMBERS
  // ================================================================
  const ambassadorProgram = await prisma.ambassadorProgram.upsert({
    where: { strategyId: strategy.id },
    update: {},
    create: {
      strategyId: strategy.id,
      name: "Programme Ambassadeur NJANGI",
      description: "Programme de referral et d'ambassadoriat pour les organisateurs de tontines actifs.",
      tiers: [
        { tier: "BRONZE", label: "Membre", pointsRequired: 0, rewards: ["Badge Membre", "Acces contenu exclusif"] },
        { tier: "SILVER", label: "Organisateur", pointsRequired: 200, rewards: ["1 mois Premium gratuit", "Badge Organisateur"] },
        { tier: "GOLD", label: "Leader", pointsRequired: 1000, rewards: ["3 mois Premium", "Invitation Meetup VIP", "Commission 5% referrals"] },
        { tier: "PLATINUM", label: "Ambassadeur", pointsRequired: 3000, rewards: ["Premium a vie", "Revenue share referrals 10%", "Co-creation features"] },
        { tier: "DIAMOND", label: "Gardien", pointsRequired: 10000, rewards: ["Advisory board", "Equity symbolique", "Acces total roadmap"] },
      ] as Prisma.InputJsonValue,
      rewards: { pointsPerGroupCreated: 50, pointsPerReferral: 20, pointsPerCompletedRound: 10, pointsPerReview: 30 } as Prisma.InputJsonValue,
      isActive: true,
    },
  });
  track("AmbassadorProgram");

  const ambassadorMembers = [
    { name: "Christelle Ngo Biyack", email: "christelle@njangi-ambassador.cm", platform: "INSTAGRAM", tier: "GOLD" as const, points: 1500, referrals: 25 },
    { name: "Rodrigue Essama", email: "rodrigue@njangi-ambassador.cm", platform: "TIKTOK", tier: "SILVER" as const, points: 450, referrals: 8 },
    { name: "Groupe Diaspora Paris 15e", email: "diaspora15@njangi-ambassador.cm", platform: "WHATSAPP", tier: "PLATINUM" as const, points: 3500, referrals: 42 },
  ];
  for (const a of ambassadorMembers) {
    await prisma.ambassadorMember.create({
      data: { programId: ambassadorProgram.id, name: a.name, email: a.email, platform: a.platform, tier: a.tier, points: a.points, referrals: a.referrals },
    });
  }
  track("AmbassadorMember", 3);
  console.log("[OK] 1 AmbassadorProgram + 3 Members seeded");

  // ================================================================
  // 53. ENROLLMENTS (2)
  // ================================================================
  const courseAdve = await prisma.course.findUnique({ where: { slug: "adve-fondamentaux" } });
  const courseCult = await prisma.course.findUnique({ where: { slug: "cult-marketing" } });
  if (courseAdve) {
    await prisma.enrollment.create({
      data: { courseId: courseAdve.id, userId: njangiBrandManager.id, status: "COMPLETED", progress: 1.0, completedAt: new Date("2025-02-15"), score: 88 },
    });
    track("Enrollment");
  }
  if (courseCult) {
    await prisma.enrollment.create({
      data: { courseId: courseCult.id, userId: njangiBrandManager.id, status: "IN_PROGRESS", progress: 0.45 },
    });
    track("Enrollment");
  }
  console.log("[OK] 2 Enrollments seeded");

  // ================================================================
  // 54. CLUB MEMBERS (2)
  // ================================================================
  await prisma.clubMember.create({ data: { userId: njangiClient.id, clubType: "FOUNDERS_CLUB", tier: "PLATINUM", points: 5000 } });
  await prisma.clubMember.create({ data: { userId: njangiBrandManager.id, clubType: "MARKETING_CLUB", tier: "GOLD", points: 1200 } });
  track("ClubMember", 2);
  console.log("[OK] 2 ClubMembers seeded");

  // ================================================================
  // 55. EVENTS + EVENT REGISTRATIONS
  // ================================================================
  const event1 = await prisma.event.create({
    data: { id: "njangi-event-meetup-dla", title: "NJANGI Meetup Douala — Demo & Networking", description: "Rencontre avec l'equipe NJANGI. Demo live, creation de groupes, et networking.", eventType: "MEETUP", location: "Activspaces Coworking, Douala", startDate: new Date("2025-03-15T14:00:00"), endDate: new Date("2025-03-15T18:00:00"), capacity: 100, status: "COMPLETED" },
  });
  const event2 = await prisma.event.create({
    data: { id: "njangi-event-webinar-diaspora", title: "Webinar Diaspora — Rejoignez votre tontine depuis l'etranger", description: "Comment utiliser NJANGI pour participer a vos tontines familiales depuis l'Europe.", eventType: "WEBINAR", isOnline: true, startDate: new Date("2025-04-10T19:00:00"), endDate: new Date("2025-04-10T20:30:00"), capacity: 500, status: "UPCOMING" },
  });
  track("Event", 2);

  await prisma.eventRegistration.create({ data: { eventId: event1.id, userId: njangiClient.id, status: "ATTENDED", attendedAt: new Date("2025-03-15T14:15:00") } });
  await prisma.eventRegistration.create({ data: { eventId: event1.id, userId: njangiBrandManager.id, status: "ATTENDED", attendedAt: new Date("2025-03-15T14:00:00") } });
  await prisma.eventRegistration.create({ data: { eventId: event2.id, userId: njangiBrandManager.id, status: "REGISTERED" } });
  track("EventRegistration", 3);
  console.log("[OK] 2 Events + 3 EventRegistrations seeded");

  // ================================================================
  // 56. BOUTIQUE ITEMS + ORDER
  // ================================================================
  const boutiqueItem1 = await prisma.boutiqueItem.create({
    data: { id: "njangi-boutique-tshirt", name: "T-shirt NJANGI 'Ensemble on epargne mieux'", description: "T-shirt coton bio avec le slogan NJANGI en violet et or.", price: 5000, imageUrl: "/boutique/njangi-tshirt.jpg", category: "APPAREL", stock: 200 },
  });
  await prisma.boutiqueItem.create({
    data: { id: "njangi-boutique-sticker", name: "Pack Stickers NJANGI (10 pcs)", description: "Stickers vinyl avec les icones NJANGI pour laptop et phone.", price: 1500, imageUrl: "/boutique/njangi-stickers.jpg", category: "MERCH", stock: 500 },
  });
  track("BoutiqueItem", 2);

  await prisma.boutiqueOrder.create({
    data: { userId: njangiClient.id, itemId: boutiqueItem1.id, quantity: 2, amount: 10000, status: "DELIVERED", paidAt: new Date("2025-03-01"), shippedAt: new Date("2025-03-03") },
  });
  track("BoutiqueOrder");
  console.log("[OK] 2 BoutiqueItems + 1 BoutiqueOrder seeded");

  // ================================================================
  // 57. EDITORIAL ARTICLES + COMMENTS
  // ================================================================
  const article1 = await prisma.editorialArticle.create({
    data: { title: "Pourquoi la tontine est le systeme financier le plus resilient d'Afrique", slug: "njangi-tontine-resilience", content: "Depuis des siecles, la tontine est le pilier de l'epargne communautaire en Afrique. Bien avant les banques, les communautes africaines avaient invente un systeme financier base sur la confiance, la reciprocite et la solidarite. Aujourd'hui, NJANGI digitalise ce systeme ancestral pour le rendre accessible a la generation mobile.", excerpt: "La tontine, systeme financier ancestral, rencontre la technologie mobile.", author: "Ariane Nkoulou", category: "THOUGHT_LEADERSHIP", pillarTags: ["A", "T"] as Prisma.InputJsonValue, isPublished: true, publishedAt: new Date("2025-02-15") },
  });
  const article2 = await prisma.editorialArticle.create({
    data: { title: "5 conseils pour organiser une tontine qui fonctionne", slug: "njangi-5-conseils-tontine", content: "Organiser une tontine n'est pas chose facile. Entre la gestion des tours, le suivi des paiements et la resolution des conflits, le role d'organisateur demande de la rigueur. Voici 5 conseils pratiques pour faire de votre tontine un succes.", excerpt: "Guide pratique pour les organisateurs de tontines.", author: "Fabrice Eyidi", category: "GUIDE", pillarTags: ["V", "E"] as Prisma.InputJsonValue, isPublished: true, publishedAt: new Date("2025-03-01") },
  });
  track("EditorialArticle", 2);

  await prisma.editorialComment.create({ data: { articleId: article1.id, authorId: njangiClient.id, content: "Excellent article! Ca resume parfaitement pourquoi on a cree NJANGI." } });
  await prisma.editorialComment.create({ data: { articleId: article2.id, authorId: njangiBrandManager.id, content: "Le conseil #3 sur le Score de Confiance est super utile. On devrait en faire une video." } });
  track("EditorialComment", 2);
  console.log("[OK] 2 EditorialArticles + 2 EditorialComments seeded");

  // ================================================================
  // 58. TRANSLATION DOCUMENT
  // ================================================================
  await prisma.translationDocument.create({
    data: { sourceLocale: "fr", targetLocale: "en", sourceText: "La tontine digitale qui libere l'epargne africaine. Ensemble, on epargne mieux. Rejoignez 15 000 groupes actifs sur NJANGI.", translatedText: "The digital tontine that unlocks African savings. Together, we save better. Join 15,000 active groups on NJANGI.", context: "App Store description", status: "COMPLETED", translatedAt: new Date("2025-02-10") },
  });
  track("TranslationDocument");
  console.log("[OK] 1 TranslationDocument seeded");

  // ================================================================
  // 59. AUDIT LOGS (5)
  // ================================================================
  await prisma.auditLog.create({ data: { userId: admin.id, action: "CREATE", entityType: "Strategy", entityId: strategy.id, newValue: { name: "NJANGI" } as Prisma.InputJsonValue } });
  await prisma.auditLog.create({ data: { userId: admin.id, action: "CREATE", entityType: "Campaign", entityId: campaignLive.id, newValue: { name: "Lancement NJANGI v2" } as Prisma.InputJsonValue } });
  await prisma.auditLog.create({ data: { userId: njangiClient.id, action: "APPROVE", entityType: "CampaignBrief", entityId: campaignLive.id, newValue: { status: "APPROVED" } as Prisma.InputJsonValue } });
  await prisma.auditLog.create({ data: { userId: admin.id, action: "UPDATE", entityType: "ScoreSnapshot", entityId: strategy.id, oldValue: { composite: 137 } as Prisma.InputJsonValue, newValue: { composite: 150.3 } as Prisma.InputJsonValue } });
  await prisma.auditLog.create({ data: { userId: njangiBrandManager.id, action: "UPDATE", entityType: "BrandVariable", entityId: strategy.id, oldValue: { tagline: "v1" } as Prisma.InputJsonValue, newValue: { tagline: "v2" } as Prisma.InputJsonValue } });
  track("AuditLog", 5);
  console.log("[OK] 5 AuditLogs seeded");

  // ================================================================
  // 60. AI COST LOGS (3)
  // ================================================================
  await prisma.aICostLog.create({ data: { model: "claude-sonnet-4-20250514", provider: "anthropic", inputTokens: 12500, outputTokens: 8500, cost: 0.078, context: "njangi_pillar_generation", userId: admin.id, strategyId: strategy.id } });
  await prisma.aICostLog.create({ data: { model: "claude-sonnet-4-20250514", provider: "anthropic", inputTokens: 8000, outputTokens: 15000, cost: 0.095, context: "njangi_brief_generation", userId: admin.id, strategyId: strategy.id } });
  await prisma.aICostLog.create({ data: { model: "claude-sonnet-4-20250514", provider: "anthropic", inputTokens: 5000, outputTokens: 3000, cost: 0.032, context: "njangi_score_calculation", userId: admin.id, strategyId: strategy.id } });
  track("AICostLog", 3);
  console.log("[OK] 3 AICostLogs seeded");

  // ================================================================
  // 61. SIGNALS (5)
  // ================================================================
  await prisma.signal.create({ data: { strategyId: strategy.id, type: "SOCIAL_METRICS", data: { platform: "TIKTOK", views: 180000, engagement: 12.8, period: "2025-02" } as Prisma.InputJsonValue } });
  await prisma.signal.create({ data: { strategyId: strategy.id, type: "MISSION_COMPLETED", data: { missionId: mission1.id, qcScore: 9.0, deliveredOnTime: true } as Prisma.InputJsonValue } });
  await prisma.signal.create({ data: { strategyId: strategy.id, type: "SCORE_IMPROVEMENT", data: { delta: 13.3, from: 137.0, to: 150.3, trigger: "q1_growth" } as Prisma.InputJsonValue } });
  await prisma.signal.create({ data: { strategyId: strategy.id, type: "STALE_STRATEGY", data: { pillar: "R", daysSinceUpdate: 45, threshold: 30 } as Prisma.InputJsonValue } });
  await prisma.signal.create({ data: { strategyId: strategy.id, type: "DRIFT", data: { variable: "churn_premium", expected: 5, actual: 8, driftPercent: 60 } as Prisma.InputJsonValue } });
  track("Signal", 5);
  console.log("[OK] 5 Signals seeded");

  // ================================================================
  // 62. PROCESSES (3)
  // ================================================================
  await prisma.process.create({
    data: { strategyId: strategy.id, type: "DAEMON", name: "njangi-weekly-growth-report", description: "Rapport hebdomadaire de croissance NJANGI (MAU, conversion, k-factor)", status: "RUNNING", frequency: "weekly", priority: 2, nextRunAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), playbook: { actions: ["calculate_metrics", "generate_report", "notify_team"] } as Prisma.InputJsonValue },
  });
  await prisma.process.create({
    data: { strategyId: strategy.id, type: "TRIGGERED", name: "njangi-churn-alert", description: "Alerte quand le churn Premium depasse 10%", status: "RUNNING", triggerSignal: "DRIFT", priority: 1, playbook: { actions: ["check_churn", "alert_if_threshold", "suggest_retention_action"] } as Prisma.InputJsonValue },
  });
  await prisma.process.create({
    data: { strategyId: strategy.id, type: "BATCH", name: "njangi-monthly-cohort-analysis", description: "Analyse mensuelle des cohortes d'utilisateurs", status: "COMPLETED", frequency: "monthly", priority: 3, lastRunAt: new Date("2025-03-01"), runCount: 2, playbook: { actions: ["extract_cohorts", "calculate_retention", "snapshot"] } as Prisma.InputJsonValue },
  });
  track("Process", 3);
  console.log("[OK] 3 Processes seeded");

  // ================================================================
  // 63. NOTIFICATIONS (2)
  // ================================================================
  await prisma.notification.create({
    data: { userId: njangiClient.id, channel: "IN_APP", title: "Score ADVE mis a jour", body: "Votre score NJANGI est passe a 150.3/200 (REMARQUABLE). +13.3 points en 1 mois!", link: "/brand-os/njangi-strategy/score" },
  });
  await prisma.notification.create({
    data: { userId: njangiBrandManager.id, channel: "EMAIL", title: "Mission completee — TikTok Mon Premier Tour", body: "La mission 'Creation 10 videos TikTok' a ete completee avec un score QC de 9.0/10.", link: "/missions/njangi-mission-tiktok-content" },
  });
  track("Notification", 2);
  console.log("[OK] 2 Notifications seeded");

  // ================================================================
  // 64. MESTOR THREAD
  // ================================================================
  await prisma.mestorThread.create({
    data: { userId: njangiClient.id, context: "strategy", strategyId: strategy.id, title: "Comment ameliorer notre Engagement?", messageCount: 8, lastMessageAt: new Date("2025-03-10") },
  });
  track("MestorThread");
  console.log("[OK] 1 MestorThread seeded");

  // ================================================================
  // 65. INTERVENTION REQUEST
  // ================================================================
  await prisma.interventionRequest.create({
    data: { strategyId: strategy.id, requesterId: njangiClient.id, type: "FEATURE_REQUEST", priority: "HIGH", title: "Besoin d'un dashboard analytics pour les organisateurs Premium", description: "Les organisateurs Premium demandent un dashboard avec les statistiques de leur tontine : taux de paiement a temps, historique des tours, performance par membre. C'est la feature #1 demandee dans le NPS.", status: "OPEN", assigneeId: admin.id },
  });
  track("InterventionRequest");
  console.log("[OK] 1 InterventionRequest seeded");

  // ================================================================
  // 66. CRM NOTES + ACTIVITIES
  // ================================================================
  await prisma.cRMNote.create({ data: { dealId: "njangi-deal-won", authorId: admin.id, content: "Ariane est tres engagee. Elle comprend parfaitement la methodologie ADVE et veut l'appliquer a fond. Le budget est serre mais le potentiel de croissance est enorme.", noteType: "STRATEGIC" } });
  await prisma.cRMNote.create({ data: { dealId: "njangi-deal-qualified", authorId: admin.id, content: "Fabrice pousse pour la campagne Diaspora. Budget 15M en discussion. Besoin de valider le ROI projete avant de signer.", noteType: "FOLLOW_UP" } });
  track("CRMNote", 2);

  await prisma.cRMActivity.create({ data: { dealId: "njangi-deal-won", activityType: "CALL", description: "Appel de cadrage strategie ADVE avec Ariane — 45 min. Alignement sur les 8 piliers.", performedBy: admin.id, performedAt: new Date("2024-11-20") } });
  await prisma.cRMActivity.create({ data: { dealId: "njangi-deal-won", activityType: "MEETING", description: "Presentation du diagnostic ADVE a l'equipe NJANGI. Score initial 125/200.", performedBy: admin.id, performedAt: new Date("2025-01-10") } });
  track("CRMActivity", 2);
  console.log("[OK] 2 CRMNotes + 2 CRMActivities seeded");

  // ================================================================
  // 67. FILE UPLOAD
  // ================================================================
  await prisma.fileUpload.create({
    data: { uploaderId: njangiBrandManager.id, fileName: "njangi-pitch-deck-v3.pdf", fileUrl: "/uploads/njangi-pitch-deck-v3.pdf", mimeType: "application/pdf", fileSize: 4500000, entityType: "Strategy", entityId: strategy.id, pillarTags: ["S", "T"] as Prisma.InputJsonValue },
  });
  track("FileUpload");
  console.log("[OK] 1 FileUpload seeded");

  // ================================================================
  // 68. FRAMEWORKS + RESULTS + EXECUTIONS (ARTEMIS)
  // ================================================================
  const fwArchetype = await prisma.framework.upsert({
    where: { slug: "archetype-analysis" },
    update: {},
    create: { slug: "archetype-analysis", name: "Analyse Archetypale", layer: "IDENTITY", description: "Identifie les archetypes de marque dominants et leur coherence avec le positionnement.", inputSchema: { required: ["strategyId", "pillarA"] } as Prisma.InputJsonValue, outputSchema: { fields: ["primary", "secondary", "coherenceScore"] } as Prisma.InputJsonValue },
  });
  const fwGrowth = await prisma.framework.upsert({
    where: { slug: "growth-model" },
    update: {},
    create: { slug: "growth-model", name: "Modele de Croissance", layer: "GROWTH", description: "Analyse les leviers de croissance et projette les scenarios de scaling.", inputSchema: { required: ["strategyId", "pillarV", "pillarE"] } as Prisma.InputJsonValue, outputSchema: { fields: ["k_factor", "projected_users", "break_even"] } as Prisma.InputJsonValue },
  });
  track("Framework", 2);

  const fwResult1 = await prisma.frameworkResult.create({
    data: { frameworkId: fwArchetype.id, strategyId: strategy.id, pillarKey: "a", input: { pillarA: pillarA } as Prisma.InputJsonValue, output: { primary: "REBELLE", secondary: "MAGICIEN", coherenceScore: 0.88, recommendation: "Archetypes coherents avec le positionnement disruptif." } as Prisma.InputJsonValue, score: 88, confidence: 0.85 },
  });
  const fwResult2 = await prisma.frameworkResult.create({
    data: { frameworkId: fwGrowth.id, strategyId: strategy.id, input: { currentMAU: 12500, kFactor: 1.4, churn: 0.08 } as Prisma.InputJsonValue, output: { projectedMAU_6m: 85000, projectedMAU_12m: 250000, breakEvenMonth: 8, scenario: "OPTIMISTIC" } as Prisma.InputJsonValue, score: 82, confidence: 0.75 },
  });
  track("FrameworkResult", 2);

  await prisma.frameworkExecution.create({
    data: { resultId: fwResult1.id, status: "COMPLETED", input: { pillarA: "REBELLE + MAGICIEN" } as Prisma.InputJsonValue, output: { archetypeMatch: 0.88 } as Prisma.InputJsonValue, durationMs: 4500, aiCost: 0.035, startedAt: new Date("2025-02-01"), completedAt: new Date("2025-02-01") },
  });
  await prisma.frameworkExecution.create({
    data: { resultId: fwResult2.id, status: "COMPLETED", input: { mau: 12500 } as Prisma.InputJsonValue, output: { projection: "85K in 6m" } as Prisma.InputJsonValue, durationMs: 8200, aiCost: 0.065, startedAt: new Date("2025-03-01"), completedAt: new Date("2025-03-01") },
  });
  track("FrameworkExecution", 2);
  console.log("[OK] 2 Frameworks + 2 Results + 2 Executions seeded");

  // ================================================================
  // 69. GLORY OUTPUTS (3)
  // ================================================================
  await prisma.gloryOutput.create({ data: { strategyId: strategy.id, toolSlug: "caption-generator", output: { caption: "Ton cercle, ta force. 15 000 groupes epargnent ensemble sur NJANGI. Et toi? #NjangiChallenge #TontineDigitale", platform: "INSTAGRAM", pillarTags: ["E", "A"] } as Prisma.InputJsonValue } });
  await prisma.gloryOutput.create({ data: { strategyId: strategy.id, toolSlug: "brief-generator", output: { brief: "Objectif: Video TikTok 30s. Hook: 'Tu savais que 70% des Camerounais sont dans une tontine?' Ton: fun + educatif. CTA: Telecharge NJANGI." } as Prisma.InputJsonValue } });
  await prisma.gloryOutput.create({ data: { strategyId: strategy.id, toolSlug: "brand-guardian", output: { check: "PASS", issues: [], message: "Le contenu respecte les guidelines NJANGI. Ton de voix coherent, pas de termes interdits." } as Prisma.InputJsonValue } });
  track("GloryOutput", 3);
  console.log("[OK] 3 GloryOutputs seeded");

  // ================================================================
  // 70. DRIVER GLORY TOOLS (2)
  // ================================================================
  await prisma.driverGloryTool.create({ data: { driverId: "njangi-driver-instagram", gloryTool: "caption-generator" } });
  await prisma.driverGloryTool.create({ data: { driverId: "njangi-driver-tiktok", gloryTool: "brief-generator" } });
  track("DriverGloryTool", 2);
  console.log("[OK] 2 DriverGloryTools seeded");

  // ================================================================
  // 71. CONVERSATIONS + MESSAGES
  // ================================================================
  const conv1 = await prisma.conversation.create({
    data: { id: "njangi-conv-strategy", title: "Strategie NJANGI 2025", strategyId: strategy.id, channel: "INTERNAL", participants: [admin.id, njangiClient.id, njangiBrandManager.id] as Prisma.InputJsonValue, lastMessage: "Score passe a 150.3 — on est REMARQUABLE!", lastMessageAt: new Date("2025-03-01"), unreadCount: 2 },
  });
  const conv2 = await prisma.conversation.create({
    data: { id: "njangi-conv-campaign", title: "Campagne Lancement v2 — Suivi", strategyId: strategy.id, missionId: mission1.id, channel: "INTERNAL", participants: [admin.id, njangiBrandManager.id] as Prisma.InputJsonValue, lastMessage: "Les videos TikTok sont livrees. QC score 9.0!", lastMessageAt: new Date("2025-03-05"), unreadCount: 0 },
  });
  track("Conversation", 2);

  await prisma.message.create({ data: { conversationId: conv1.id, senderId: admin.id, senderName: "Alexandre Djengue", content: "Bonjour equipe NJANGI! Le diagnostic ADVE est termine. Score initial: 125/200 (FORTE). On a une base solide.", channel: "INTERNAL", createdAt: new Date("2025-01-15") } });
  await prisma.message.create({ data: { conversationId: conv1.id, senderId: njangiClient.id, senderName: "Ariane Nkoulou", content: "Merci Alexandre! On est ravis du diagnostic. Comment on passe a REMARQUABLE?", channel: "INTERNAL", createdAt: new Date("2025-01-16") } });
  await prisma.message.create({ data: { conversationId: conv1.id, senderId: admin.id, senderName: "Alexandre Djengue", content: "Score passe a 150.3 — on est REMARQUABLE! La croissance TikTok et le programme ambassadeur ont fait la difference.", channel: "INTERNAL", createdAt: new Date("2025-03-01") } });
  await prisma.message.create({ data: { conversationId: conv2.id, senderId: njangiBrandManager.id, senderName: "Fabrice Eyidi", content: "Les videos TikTok sont livrees. QC score 9.0! Marc a fait un travail exceptionnel sur l'esthetique afro-futuriste.", channel: "INTERNAL", createdAt: new Date("2025-03-05") } });
  track("Message", 4);
  console.log("[OK] 2 Conversations + 4 Messages seeded");

  // ================================================================
  // 72. QUICK INTAKE
  // ================================================================
  await prisma.quickIntake.create({
    data: { id: "njangi-intake", contactName: "Ariane Nkoulou Meva", contactEmail: "ceo@njangi.cm", contactPhone: "+237699456789", companyName: "NJANGI", sector: "FINTECH", country: "CM", businessModel: "ABONNEMENT", economicModel: "FREEMIUM", positioning: "PREMIUM", responses: { q1_sector: "Fintech / Epargne communautaire", q2_target: "Camerounais urbains + diaspora, 22-55 ans", q3_competition: "Orange Money, MTN MoMo, Wave", q4_differentiation: "Seule app 100% tontine avec Score de Confiance", q5_budget: "50M FCFA/an marketing", q6_timeline: "Deja lance, en croissance" } as Prisma.InputJsonValue, advertis_vector: { a: 18, d: 16, v: 14.5, e: 19, r: 13, t: 15.5, i: 12, s: 17, composite: 125.0 } as Prisma.InputJsonValue, classification: "FORTE", diagnostic: { score: 125, tier: "FORTE", topPillar: "E", weakestPillar: "I", recommendation: "Focus on operational implementation and risk mitigation" } as Prisma.InputJsonValue, status: "COMPLETED", convertedToId: strategy.id, source: "WEBSITE", completedAt: new Date("2024-12-01") },
  });
  track("QuickIntake");
  console.log("[OK] 1 QuickIntake seeded (COMPLETED)");

  // ================================================================
  // SUMMARY
  // ================================================================
  console.log("\n============================================================");
  console.log("  NJANGI DEMO SEED — COMPLETED SUCCESSFULLY");
  console.log("============================================================");
  console.log(`  Strategy: NJANGI (${strategy.id})`);
  console.log("  Score: 150.3/200 (REMARQUABLE)");
  console.log("  Business: Fintech tontine digitale, B2C SaaS, Freemium");
  console.log("------------------------------------------------------------");

  const sortedModels = Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
  let totalRecords = 0;
  for (const [model, count] of sortedModels) {
    console.log(`  ${model.padEnd(30)} ${String(count).padStart(3)}`);
    totalRecords += count;
  }
  console.log("------------------------------------------------------------");
  console.log(`  TOTAL RECORDS CREATED        ${totalRecords}`);
  console.log("============================================================\n");
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
